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
const hudNoteLabel = document.getElementById("hud-note-label");
const hudVowelLabel = document.getElementById("hud-vowel-label");

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
  const labelSize = Math.round(Math.min(22, Math.max(12, r * 0.1)));

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
    ctx.font = `600 ${labelSize}px Fraunces, serif`;
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

// ---------- Tanpura drone (Sa Re Ga mode) ----------
// The three standard tanpura tunings plus a Sa-only shruti-box option.
// Each pattern is the classic 4-string pluck cycle as semitone offsets from
// middle Sa: [first string, jodi, jodi, kharaj (low Sa)].
const DRONE_VARIANTS = ["Sa–Pa", "Sa–Ma", "Sa–Ni", "Sa"];
const DRONE_PATTERNS = {
  "Sa–Pa": [-5,  0, 0, -12],   // Pa below Sa — the default tuning
  "Sa–Ma": [-7,  0, 0, -12],   // for ragas that omit Pa (Malkauns…)
  "Sa–Ni": [-1,  0, 0, -12],   // for ragas that omit Pa and Ma (Marwa…)
  "Sa":    [-12, 0, 0, -12],   // kharaj only
};

let selectedSaIndex = 0;      // default Sa = C
let selectedDroneIndex = 0;   // default Sa–Pa

let tanpuraPluck = null;      // synthesized fallback voice
let tanpuraSampler = null;    // real tanpura sample, if tanpura.mp3 exists
let tanpuraSamplerReady = false;
let tanpuraLoop = null;
let tanpuraString = 0;

function buildTanpura() {
  if (tanpuraLoop) return;

  const reverb = new Tone.Reverb({ decay: 6, wet: 0.5 }).toDestination();
  const filter = new Tone.Filter(2400, "lowpass").connect(reverb);

  tanpuraPluck = new Tone.PluckSynth({
    attackNoise: 0.6,
    dampening: 3200,
    resonance: 0.97,
    release: 2,
  }).connect(filter);
  tanpuraPluck.volume.value = 4;

  // If a real single-pluck sample (recorded at C3) is present in the repo,
  // prefer it over the synthesized pluck.
  fetch("tanpura.mp3", { method: "HEAD" })
    .then((res) => {
      if (!res.ok) return;
      tanpuraSampler = new Tone.Sampler({
        urls: { C3: "tanpura.mp3" },
        onload: () => { tanpuraSamplerReady = true; },
      }).connect(filter);
      tanpuraSampler.volume.value = -4;
    })
    .catch(() => {}); // no sample — the synthesized pluck carries the drone

  tanpuraLoop = new Tone.Loop((time) => {
    const pattern = DRONE_PATTERNS[DRONE_VARIANTS[selectedDroneIndex]];
    const saFreq = NOTE_FREQS[NOTES[selectedSaIndex]] / 2; // middle Sa, low register
    const freq = saFreq * semitoneRatio(pattern[tanpuraString % 4]);
    const voice = tanpuraSamplerReady ? tanpuraSampler : tanpuraPluck;
    voice.triggerAttackRelease(freq, 2.5, time);
    tanpuraString++;
  }, 0.8);
}

function startTanpura() {
  buildTanpura();
  tanpuraString = 0;
  tanpuraLoop.start(0);
  Tone.Transport.start();
}

function stopTanpura() {
  if (tanpuraLoop) tanpuraLoop.stop();
  Tone.Transport.stop();
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
        const rightCount = showHindi ? DRONE_VARIANTS.length : CHORD_QUALITIES.length;
        rightIndex = getSegmentIndex(x, y, rightDisc, rightCount);
      }

      // draw a small marker at the fingertip
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = userHand === "Left" ? "#c9a24b" : "#6b1f2a";
      ctx.fill();
    });
  }

  if (showHindi) {
    // Sargam mode: selections are sticky — point to change them, then take
    // your hand away and the drone keeps humming at the chosen tuning.
    if (leftIndex !== -1 && leftIndex !== selectedSaIndex) {
      selectedSaIndex = leftIndex;
      hudNote.textContent = NOTES[selectedSaIndex];
    }
    if (rightIndex !== -1 && rightIndex !== selectedDroneIndex) {
      selectedDroneIndex = rightIndex;
      hudVowel.textContent = DRONE_VARIANTS[selectedDroneIndex];
    }
    drawDisc(leftDisc, NOTES, selectedSaIndex, DISC_THEMES.wine);
    drawDisc(rightDisc, DRONE_VARIANTS, selectedDroneIndex, DISC_THEMES.jade);
  } else {
    drawDisc(leftDisc, NOTES, leftIndex, DISC_THEMES.wine);
    drawDisc(rightDisc, CHORD_QUALITIES, rightIndex, DISC_THEMES.jade);
    updateNote(leftIndex);
    updateChordQuality(rightIndex);
  }

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

// ---------- Sa Re Ga toggle: Western chords <-> tanpura drone ----------
document.getElementById("hindi-toggle").addEventListener("click", async () => {
  showHindi = !showHindi;
  const btn = document.getElementById("hindi-toggle");
  btn.textContent = showHindi ? "A B C" : "Sa Re Ga";
  btn.classList.toggle("active", showHindi);

  if (showHindi) {
    await initAudio();
    stopAllVoices();
    currentNote = null;
    hudNoteLabel.textContent = "Sa";
    hudVowelLabel.textContent = "Drone";
    hudNote.textContent = NOTES[selectedSaIndex];
    hudVowel.textContent = DRONE_VARIANTS[selectedDroneIndex];
    startTanpura();
  } else {
    stopTanpura();
    hudNoteLabel.textContent = "Note";
    hudVowelLabel.textContent = "Quality";
    hudNote.textContent = "—";
    hudVowel.textContent = currentQuality;
  }
});