# Harmoneyes 👁️‍🗨️

> A browser-based harmony instrument you play with your hands — no keyboard, no mouse, no installs.

**[Live Demo →](https://manyajainrkm.github.io/Harmoneyes/)**

---

## What it does

Harmoneyes turns your webcam into a musical interface. Two discs float over your camera feed; you play them by pointing at their segments with your index fingers — left hand on the left disc, right hand on the right disc. Hand tracking runs entirely in the browser.

It is really **two instruments in one**, switched live with a single button:

1. **A B C mode (Western)** — left hand picks a note, right hand picks a chord quality, and you hear the full chord rendered in real time.
2. **सा रे ग mode (Hindustani)** — a tanpura drone begins to hum. The left disc becomes the twelve swaras in Devanagari; touching one sings it over the drone, and it fades away slowly when your hand leaves. The right disc chooses the tanpura's tuning.

---

## The journey

1. **Hi** — the site opens on a single 3D button. Click it.
2. **The eyes page** — stop-motion animated eyes (one wine, one jade — matching the two discs) blink and glance around while lo-fi elevator music plays and you read the instructions.
3. **Start** — the music stops, your webcam turns on, and the discs appear.

---

## A B C mode (Western)

- **Left disc (wine):** the 12 chromatic notes — C C# D D# E F F# G G# A A# B.
- **Right disc (jade):** chord qualities. No right hand detected → plain major chord.
- The active segment glows gold.

| Label | Chord Type | Intervals |
|---|---|---|
| *(default)* | Major | Root + M3 + P5 |
| min | Minor | Root + m3 + P5 |
| 7 | Dominant 7th | Root + M3 + P5 + m7 |
| min7 | Minor 7th | Root + m3 + P5 + m7 |
| maj7 | Major 7th | Root + M3 + P5 + M7 |
| aug | Augmented | Root + M3 + A5 |
| dim | Diminished | Root + m3 + d5 |
| sus4 | Suspended 4th | Root + P4 + P5 |

---

## सा रे ग mode (Hindustani)

Indian classical music is melodic, not harmonic — a raga unfolds over a drone, never over chords. So this mode replaces chords entirely with a **tanpura**: a continuous 4-string pluck cycle (first string → सा → सा → low सा *kharaj*) that keeps humming the whole time, hands or no hands.

**Left disc — the swaras**, written in Devanagari with standard notation: कोमल (flat) swaras carry a line underneath, तीव्र म a vertical line above.

| Western | Swara | Type |
|---|---|---|
| C  | सा | Achal (fixed) |
| C# | रे̲ | Komal Re |
| D  | रे | Shuddha Re |
| D# | ग̲ | Komal Ga |
| E  | ग | Shuddha Ga |
| F  | म | Shuddha Ma |
| F# | म॑ | Teevra Ma |
| G  | प | Achal (fixed) |
| G# | ध̲ | Komal Dha |
| A  | ध | Shuddha Dha |
| A# | नि̲ | Komal Ni |
| B  | नि | Shuddha Ni |

Touching a swara plays it as a warm sustained tone over the drone; when your hand leaves, it fades out over several seconds — like a singer trailing off. Sa is anchored at C.

**Right disc — the tanpura tuning**, shown as the spoken pluck cycles. The choice is sticky: point once, take your hand away, the drone keeps going.

| Cycle | Tuning | Used for |
|---|---|---|
| प सा सा सा | Sa–Pa | the standard tuning |
| म सा सा सा | Sa–Ma | ragas that omit Pa (e.g. Malkauns) |
| नि सा सा सा | Sa–Ni | ragas that omit Pa and Ma (e.g. Marwa) |
| नि̲ सा सा सा | Sa–komal Ni | komal Ni variant |
| सा सा सा सा | Sa only | kharaj drone, shruti-box style |

The tanpura is synthesized (Karplus–Strong pluck through a lowpass filter and long reverb). If a real single-pluck recording named `tanpura.mp3` (pitched at C3) is placed in the repo root, it is detected and used automatically instead.

---

## How to use

1. Open the site in Chrome (camera access required)
2. Click **Hi**, read the instructions, click **Start** — your webcam turns on
3. **Left hand** → hover your index finger over a note on the left disc
4. **Right hand** → hover your index finger over a chord quality on the right disc
5. No right hand detected → defaults to a plain major chord
6. Click **सा रे ग** at the bottom to enter tanpura mode; click **A B C** to come back

**On a phone:** hold it in landscape — portrait shows a rotate prompt. The start page reflows into two columns and the discs scale down automatically.

---

## Tech stack

| Layer | Tool |
|---|---|
| Hand tracking | [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) (Google, runs in-browser) |
| Audio synthesis | [Tone.js](https://tonejs.github.io/) — oscillator chords, Karplus–Strong tanpura, filter + reverb chain |
| Disc rendering | HTML5 Canvas API |
| Animation | Canvas 2D at 10fps — intentional stop-motion, including a gaze/blink state machine for the eyes |
| Hosting | GitHub Pages |
| Dependencies | Zero npm packages — all via CDN |

---

## Project structure

```
harmoneyes/
├── index.html       — Hi page, eyes/instructions page, webcam stage
├── instrument.js    — MediaPipe, disc hit-testing, chords, tanpura + swara audio
├── eyes.js          — stop-motion eyes: gaze, blinks, floating notes
├── style.css        — visual design system, responsive layouts
└── elevator.mp3     — lounge music for the instructions page
```

---

## Roadmap

- [ ] Movable Sa — let singers place Sa at their own pitch
- [ ] Real tanpura sample (CC0 single pluck) for the authentic jawari shimmer
- [ ] Voice recording mode — sing a note, generate harmonies in your own voice
- [ ] Raga mode — constrain the left disc to the notes of a specific raga
- [ ] Sustain / release controls via hand height

---

## Made by

[Manya Jain](https://github.com/ManyaJainrkm) | MS Computer Science, Arizona State University.
Built as a creative coding project at the intersection of music theory, computer vision, and web audio.
