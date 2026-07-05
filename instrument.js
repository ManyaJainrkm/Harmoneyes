/* ============================================================
   HARMONIES — instrument.js
   Core logic: webcam → MediaPipe hands → disc detection → audio
   ============================================================ */

// ---------- Config ----------

const NOTES = ["C", "C#","D","D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]; // left disc, 12 segments
const NOTES_HINDI = ["Sa","re","Re","ga","Ga","Ma","Ma'","Pa","dha","Dha","ni","Ni"];
let showHindi = false;
const CHORD_QUALITIES = ["min", "7", "min7", "maj7", "aug", "dim", "sus4"];

const QUALITY_INTERVALS = {
  "maj":  [4, 7],
  "min":  [3, 7],
  "7":    [4, 7, 10],
  "min7": [3, 7, 10],
  "maj7": [4, 7, 11],
  "aug":  [4, 8],
  "dim":  [3, 6],
  "sus4": [5, 7],
};

// disc placement (relative to viewport), updated on resize
let leftDisc = { cx: 0, cy: 0, r: 0 };
let rightDisc = { cx: 0, cy: 0, r: 0 };

let currentNote = null;
let currentQuality = "maj"; // default when no right hand

// ---------- DOM refs ----------

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");
const hudNote = document.getElementById("hud-note");
const hudVowel = document.getElementById("hud-vowel");
const hudHands = document.getElementById("hud-hands");

// ---------- Resize handling ----------

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const discRadius = Math.min(window.innerWidth, window.innerHeight) * 0.3;
  const margin = discRadius * 1.3;

  leftDisc = { cx: margin, cy: window.innerHeight - margin, r: discRadius };
  rightDisc = { cx: window.innerWidth - margin, cy: window.innerHeight - margin, r: discRadius };
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ---------- Drawing the discs ----------

// Translucent glass tints: wine for notes (left), jade for qualities (right).
// Alternating segment shades give a subtle pinwheel depth; gold marks the active segment.
const DISC_THEMES = {
  wine: {
    segments: ["rgba(107, 31, 42, 0.45)", "rgba(80, 22, 31, 0.45)"],
    hubFill:  "rgba(58, 15, 22, 0.75)",
    hubRing:  "rgba(201, 162, 75, 0.55)",
  },
  jade: {
    segments: ["rgba(78, 133, 119, 0.45)", "rgba(56, 102, 90, 0.45)"],
    hubFill:  "rgba(34, 62, 55, 0.75)",
    hubRing:  "rgba(201, 162, 75, 0.55)",
  },
};

function drawDisc(disc, labels, activeIndex, theme) {
  const { cx, cy, r } = disc;
  const segAngle = (Math.PI * 2) / labels.length;

  labels.forEach((label, i) => {
    const startAngle = i * segAngle - Math.PI / 2 - segAngle / 2;
    const endAngle = startAngle + segAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = i === activeIndex
      ? "rgba(201, 162, 75, 0.75)"   // gold highlight when active
      : theme.segments[i % 2];
    ctx.fill();
    ctx.strokeStyle = "rgba(244, 237, 225, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const midAngle = startAngle + segAngle / 2;
    const labelX = cx + Math.cos(midAngle) * r * 0.65;
    const labelY = cy + Math.sin(midAngle) * r * 0.65;

    ctx.fillStyle = i === activeIndex ? "#1a1410" : "#f4ede1";
    ctx.font = "600 22px Fraunces, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY);
  });

  // center hub
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = theme.hubFill;
  ctx.fill();
  ctx.strokeStyle = theme.hubRing;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---------- Hit testing: which segment is a point in? ----------

function getSegmentIndex(x, y, disc, segmentCount) {
  const dx = x - disc.cx;
  const dy = y - disc.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > disc.r || dist < disc.r * 0.32) return -1; // outside ring or in center hub

  let angle = Math.atan2(dy, dx) + Math.PI / 2 + (Math.PI * 2) / segmentCount / 2;
  if (angle < 0) angle += Math.PI * 2;
  const segAngle = (Math.PI * 2) / segmentCount;
  return Math.floor(angle / segAngle) % segmentCount;
}

// ---------- Audio engine (Tone.js) ----------
// NOTE: this stage uses a synth as a placeholder voice.
// In Stage 2 we swap synth.triggerAttack for your recorded + pitch-shifted sample.

let audioReady = false;
let voices = []; // active oscillator voices

const NOTE_FREQS = {
  "C":  261.63,
  "C#": 277.18,
  "D":  293.66,
  "D#": 311.13,
  "E":  329.63,
  "F":  349.23,
  "F#": 369.99,
  "G":  392.00,
  "G#": 415.30,
  "A":  440.00,
  "A#": 466.16,
  "B":  493.88
};

async function initAudio() {
  await Tone.start();
  audioReady = true;
}

function semitoneRatio(semitones) {
  return Math.pow(2, semitones / 12);
}

function stopAllVoices() {
  voices.forEach(v => {
    v.synth.triggerRelease();
  });
  voices = [];
}

function playHarmony(note, quality = "maj") {
  if (!audioReady) return;
  stopAllVoices();

  const rootFreq = NOTE_FREQS[note];
  if (!rootFreq) return;

  const intervalsToPlay = [0, ...(QUALITY_INTERVALS[quality] || QUALITY_INTERVALS["maj"])];

  intervalsToPlay.forEach((semis, i) => {
    const freq = rootFreq * semitoneRatio(semis);
    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.15, decay: 0.1, sustain: 0.8, release: 0.6 },
    }).toDestination();
    synth.volume.value = i === 0 ? -10 : -14; // root slightly louder than harmony voices
    synth.triggerAttack(freq);
    voices.push({ synth, freq });
  });
}

// ---------- Main state update loop ----------

function updateNote(index) {
  const note = index === -1 ? null : NOTES[index];
  if (note !== currentNote) {
    currentNote = note;
    hudNote.textContent = note || "—";
    if (note) {
      playHarmony(note, currentQuality);
    } else {
      stopAllVoices();
    }
  }
}

function updateChordQuality(index) {
  const quality = index === -1 ? "maj" : CHORD_QUALITIES[index];
  if (quality !== currentQuality) {
    currentQuality = quality;
    hudVowel.textContent = quality;
    if (currentNote) playHarmony(currentNote, currentQuality);
  }
}

// ---------- MediaPipe Hands setup ----------

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6,
});

hands.onResults(onResults);

function onResults(results) {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const numHands = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
  hudHands.textContent = numHands;

  let leftIndex = -1;
  let rightIndex = -1;

  if (results.multiHandLandmarks && results.multiHandedness) {
    results.multiHandLandmarks.forEach((landmarks, i) => {
      // MediaPipe's "Left"/"Right" label is from the camera's POV;
      // since our video is mirrored (scaleX(-1)), swap to match what the user sees.
      const label = results.multiHandedness[i].label; // "Left" or "Right"
      const userHand = label === "Left" ? "Right" : "Left";

      // index fingertip = landmark 8
      const tip = landmarks[8];

      // mirror the x coordinate to match the mirrored video display
      const x = (1 - tip.x) * canvas.width;
      const y = tip.y * canvas.height;

      if (userHand === "Left") {
        leftIndex = getSegmentIndex(x, y, leftDisc, NOTES.length);
      } else {
        rightIndex = getSegmentIndex(x, y, rightDisc, CHORD_QUALITIES.length);
      }

      // draw a small marker at the fingertip
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = userHand === "Left" ? "#c9a24b" : "#6b1f2a";
      ctx.fill();
    });
  }

  drawDisc(leftDisc, showHindi ? NOTES_HINDI : NOTES, leftIndex, DISC_THEMES.wine);
  drawDisc(rightDisc, CHORD_QUALITIES, rightIndex, DISC_THEMES.jade);

  updateNote(leftIndex);
   updateChordQuality(rightIndex);

  ctx.restore();
}

// ---------- Camera setup ----------

let camera = null;

function startCamera() {
  camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 1280,
    height: 720,
  });
  camera.start();
}

// ---------- Hi screen + elevator music ----------

const hiScreen = document.getElementById("hi-screen");
const hiBtn = document.getElementById("hi-btn");
const elevatorMusic = document.getElementById("elevator-music");

hiBtn.addEventListener("click", () => {
  hiScreen.style.display = "none";
  elevatorMusic.play().catch((err) => console.warn("Music playback failed:", err));
});

// ---------- Start button ----------

startBtn.addEventListener("click", async () => {
  try {
    await initAudio();
    startCamera();
    elevatorMusic.pause();
    elevatorMusic.currentTime = 0;
    startScreen.style.display = "none";
  } catch (err) {
    alert("Camera access is required to use Harmonies. Please allow access and try again.");
    console.error(err);
  }
});

// ---------- Hindi toggle ----------
document.getElementById("hindi-toggle").addEventListener("click", () => {
  showHindi = !showHindi;
  const btn = document.getElementById("hindi-toggle");
  btn.textContent = showHindi ? "A B C" : "Sa Re Ga";
  btn.classList.toggle("active", showHindi);
});