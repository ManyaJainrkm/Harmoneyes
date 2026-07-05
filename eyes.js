/* ============================================================
   HARMONEYES — eyes.js  (v3: mirrored left eye, darker notes)
   ============================================================ */

const eyeCanvas = document.getElementById("eye-canvas");
const ec = eyeCanvas.getContext("2d");

const W = 500, H = 250;
eyeCanvas.width  = W;
eyeCanvas.height = H;

// Eye definitions — right eye is the "master", left is drawn mirrored
const EYES = [
  { lx: 55,  rx: 210, cy: 135 },   // left eye  (will be flipped)
  { lx: 290, rx: 445, cy: 135 },   // right eye (drawn normally)
];

const C_OUTLINE   = "#1a1410";
const C_WHITE     = "#e8e2d8";
const C_IRIS      = "#9a9490";
const C_IRIS_DARK = "#6e6a65";
const C_PUPIL     = "#2c2927";
const C_LASH      = "#1a1410";
const C_NOTE      = "#1a1410";     // near-black ink for notes
const C_DOT       = "rgba(26,20,16,0.18)";

let wCache = {};
function w(key, amt = 2) {
  if (wCache[key] === undefined) wCache[key] = (Math.random() - 0.5) * amt * 2;
  return wCache[key];
}

function lidY(eye, t, blinkT) {
  const { lx, rx, cy } = eye;
  const eyeW = rx - lx;
  const peak = cy - eyeW * 0.31 * (1 - blinkT);
  return cy - (cy - peak) * Math.sin(Math.max(0, t) * Math.PI);
}

function almondPath(ctx, eye, blinkT) {
  const { lx, rx, cy } = eye;
  const eyeW  = rx - lx;
  const midX  = lx + eyeW / 2;
  const topY  = cy - eyeW * 0.31 * (1 - blinkT);
  const botY  = cy + eyeW * 0.13;

  ctx.beginPath();
  ctx.moveTo(lx + w('lxo', 1.5), cy + w('lyo', 1.5));
  ctx.bezierCurveTo(
    lx + eyeW * 0.28 + w('uc1', 2), topY + w('uc2', 2),
    midX + eyeW * 0.08 + w('uc3', 2), topY - eyeW * 0.03 + w('uc4', 2),
    rx + w('rxo', 1.5), cy + w('ryo', 1.5)
  );
  ctx.bezierCurveTo(
    midX + eyeW * 0.12 + w('lc1', 2), botY + w('lc2', 2),
    lx + eyeW * 0.28 + w('lc3', 2), botY * 0.55 + cy * 0.45 + w('lc4', 2),
    lx + w('lxc', 1.5), cy + w('lyc', 1.5)
  );
  ctx.closePath();
}

function drawIrisPupil(ctx, eye, blinkT, px, py) {
  if (blinkT > 0.85) return;
  const { lx, rx, cy } = eye;
  const eyeW  = rx - lx;
  const midX  = lx + eyeW / 2;
  const irisR = eyeW * 0.21;
  const cx    = midX + px * 0.45 + w('ix', 1.5);
  const cyi   = cy   + py * 0.3  + w('iy', 1.5);

  ctx.save();
  almondPath(ctx, eye, blinkT);
  ctx.clip();

  ctx.beginPath();
  ctx.arc(cx, cyi, irisR, 0, Math.PI * 2);
  ctx.fillStyle = C_IRIS;
  ctx.fill();

  ctx.strokeStyle = "rgba(26,20,16,0.28)";
  ctx.lineWidth = 0.9;
  for (let s = 0; s < 14; s++) {
    const a = (s / 14) * Math.PI * 2 + w('sa' + s, 0.15);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * irisR * 0.38, cyi + Math.sin(a) * irisR * 0.38);
    ctx.lineTo(cx + Math.cos(a) * irisR * 0.93, cyi + Math.sin(a) * irisR * 0.93);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cyi, irisR * 0.62, 0, Math.PI * 2);
  ctx.strokeStyle = C_IRIS_DARK;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const pupR = irisR * 0.58;
  ctx.beginPath();
  ctx.arc(cx + w('px', 1), cyi + w('py', 1), pupR, 0, Math.PI * 2);
  ctx.fillStyle = C_PUPIL;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + pupR * 0.38, cyi - pupR * 0.48, pupR * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - pupR * 0.3, cyi + pupR * 0.35, pupR * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fill();

  ctx.restore();
}

function drawUpperLashes(ctx, eye, blinkT) {
  if (blinkT > 0.82) return;
  const { lx, rx, cy } = eye;
  const eyeW = rx - lx;
  const count = 14;

  ctx.strokeStyle = C_LASH;
  ctx.lineCap = "round";

  for (let i = 0; i < count; i++) {
    const t  = i / (count - 1);
    const bx = lx + t * eyeW + w('lbx' + i, 1.5);
    const by = lidY(eye, t, blinkT) + w('lby' + i, 1.5);

    let len;
    if      (t < 0.15) len = eyeW * 0.07;
    else if (t < 0.5)  len = eyeW * 0.12 + t * eyeW * 0.04;
    else               len = eyeW * 0.16 + (t - 0.5) * eyeW * 0.28;

    len *= (1 - blinkT * 0.65);

    const splay = (t - 0.3) * 1.1;
    const angle = -Math.PI / 2 + splay;
    const curl  = 0.25 + t * 0.5;

    const cpx = bx + Math.cos(angle + 0.35) * len * curl;
    const cpy = by + Math.sin(angle + 0.35) * len * curl;
    const ex  = bx + Math.cos(angle) * len;
    const ey  = by + Math.sin(angle) * len;

    ctx.lineWidth = t > 0.65
      ? 1.8 + w('lw' + i, 0.35)
      : 1.1 + w('lw' + i, 0.2);

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.stroke();
  }
}

function drawLowerLashes(ctx, eye) {
  const { lx, rx, cy } = eye;
  const eyeW = rx - lx;
  const count = 6;

  ctx.strokeStyle = C_LASH;
  ctx.lineWidth   = 1;
  ctx.lineCap     = "round";

  for (let i = 0; i < count; i++) {
    const t      = 0.25 + (i / (count - 1)) * 0.55;
    const bx     = lx + t * eyeW + w('llx' + i, 1.5);
    const startY = cy + eyeW * 0.12 * Math.sin(t * Math.PI) + w('lls' + i, 1);
    const len    = eyeW * 0.05 + w('lll' + i, 1.5);

    ctx.beginPath();
    ctx.moveTo(bx, startY);
    ctx.lineTo(bx + w('lle' + i, 2), startY + len);
    ctx.stroke();
  }
}

function drawDots(ctx, eye, blinkT) {
  if (blinkT > 0.4) return;
  const { lx, rx, cy } = eye;
  const eyeW = rx - lx;

  ctx.save();
  almondPath(ctx, eye, blinkT);
  ctx.clip();
  ctx.fillStyle = C_DOT;
  [[lx + eyeW * 0.18, cy - eyeW * 0.04],
   [lx + eyeW * 0.28, cy - eyeW * 0.09],
   [rx - eyeW * 0.22, cy - eyeW * 0.05]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx + w('dot' + dx, 2), dy + w('dot' + dy, 2), 1.8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawEye(ctx, eye, blinkT, px, py) {
  almondPath(ctx, eye, blinkT);
  ctx.fillStyle = C_WHITE;
  ctx.fill();

  drawIrisPupil(ctx, eye, blinkT, px, py);

  almondPath(ctx, eye, blinkT);
  ctx.strokeStyle = C_OUTLINE;
  ctx.lineWidth   = 1.8 + w('ow', 0.25);
  ctx.stroke();

  drawUpperLashes(ctx, eye, blinkT);
  drawLowerLashes(ctx, eye);
  drawDots(ctx, eye, blinkT);
}

// ---------- Floating notes — dark ink, stop-motion jumps ----------
const NOTE_SYMBOLS = ["♪", "♫", "♩", "♬"];
let notes = [];

function spawnNote() {
  notes.push({
    x:       W * 0.36 + Math.random() * W * 0.28,
    y:       H * 0.62,
    symbol:  NOTE_SYMBOLS[Math.floor(Math.random() * NOTE_SYMBOLS.length)],
    opacity: 0.92,
    size:    17 + Math.random() * 6,   // larger
    step:    0,                         // which discrete y-step we're on
  });
}

function stepNotes() {
  notes.forEach(n => {
    ec.save();
    ec.globalAlpha = n.opacity;
    ec.fillStyle   = C_NOTE;
    // bold + stroke for thick ink feel
    ec.font        = `bold ${Math.round(n.size)}px serif`;
    ec.textAlign   = "center";
    ec.fillText(n.symbol, n.x, n.y);
    ec.strokeStyle = C_NOTE;
    ec.lineWidth   = 0.6;
    ec.strokeText(n.symbol, n.x, n.y);
    ec.restore();

    // discrete jump every frame (10fps = already stop-motion)
    n.y       -= 11;      // bigger hop per frame = more visible stop-motion
    n.opacity -= 0.058;
  });
  notes = notes.filter(n => n.opacity > 0);
}

// ---------- Main loop ----------
let frameCount = 0;
let blinkTimer = 0;
let pupilPos   = { x: 0, y: 0 };

function drawFrame() {
  wCache = {};
  ec.clearRect(0, 0, W, H);
  frameCount++;

  if (frameCount % 6 === 0) {
    pupilPos = {
      x: Math.round((Math.random() - 0.5) * 16),
      y: Math.round((Math.random() - 0.5) * 8),
    };
  }

  blinkTimer++;
  let blinkT = 0;
  if      (blinkTimer >= 32 && blinkTimer < 34) blinkT = 1;
  else if (blinkTimer >= 34 && blinkTimer < 36) blinkT = 0.45;
  if (blinkTimer >= 50) blinkTimer = 0;

  // Right eye — drawn normally
  drawEye(ec, EYES[1], blinkT, pupilPos.x, pupilPos.y);

  // Left eye — mirrored horizontally around its own center
  const leftEye    = EYES[0];
  const leftCenterX = (leftEye.lx + leftEye.rx) / 2;
  ec.save();
  ec.translate(leftCenterX * 2, 0);
  ec.scale(-1, 1);
  drawEye(ec, leftEye, blinkT, -pupilPos.x, pupilPos.y);
  ec.restore();

  if (frameCount % 22 === 0) spawnNote();
  stepNotes();
}

setInterval(drawFrame, 100);