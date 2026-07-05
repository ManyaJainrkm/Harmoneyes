# Harmoneyes 👁️‍🗨️

> A browser-based vocal harmony instrument you play with your hands — no keyboard, no mouse, no installs.

**[Live Demo →](https://manyajainrkm.github.io/Harmoneyes/)**

---

## What it does

Harmoneyes turns your webcam into a musical interface. Hold your left hand over a note on the disc, your right hand over a chord quality, and hear a layered harmony chord built from that note root, major/minor 3rd, perfect 5th rendered in real time.

It supports both **Western notation** (C C# D D# E F F# G G# A A# B) and **Hindustani Sargam** (Sa re Re ga Ga Ma Ma' Pa dha Dha ni Ni), switch between them with one button, mid-session, no reload.

---

## Hindustani Classical Note Mapping

The left disc maps 1-to-1 to the 12 pitch variations of an octave (Saptak) in Hindustani music:

| Western | Sargam | Type |
|---|---|---|
| C  | **Sa** | Achal (fixed) |
| C# | re    | Komal Re |
| D  | **Re** | Shuddha Re |
| D# | ga    | Komal Ga |
| E  | **Ga** | Shuddha Ga |
| F  | **Ma** | Shuddha Ma |
| F# | Ma'   | Teevra Ma (sharp) |
| G  | **Pa** | Achal (fixed) |
| G# | dha   | Komal Dha |
| A  | **Dha** | Shuddha Dha |
| A# | ni    | Komal Ni |
| B  | **Ni** | Shuddha Ni |

Sa and Pa are **Achal Swaras** — the two fixed tonal anchors that never vary in any raga. Komal (flat) notes are shown in lowercase. Teevra Ma is the only raised (sharp) variation in the system.

The audio is identical in both modes — only the disc labels change. This means a person trained in Sargam and a person trained in Western notation can use the same instrument simultaneously and understand each other.

---

## How to use

1. Open the site in Chrome (camera access required)
2. Click **Start** — your webcam turns on
3. **Left hand** → hover index finger over a note on the left disc
4. **Right hand** → hover index finger over a chord quality on the right disc
5. No right hand detected → defaults to a plain major chord
6. Click **Sa Re Ga** at the bottom to switch the left disc to Hindustani notation

---

## Chord Qualities (right disc)

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

## Tech stack

| Layer | Tool |
|---|---|
| Hand tracking | [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) (Google, runs in-browser) |
| Audio synthesis | [Tone.js](https://tonejs.github.io/) — pitch shifting via phase vocoder |
| Disc rendering | HTML5 Canvas API |
| Animation | Canvas 2D, 10fps intentional stop-motion |
| Hosting | GitHub Pages |
| Dependencies | Zero npm packages — all via CDN |

---

## Project structure

```
harmoneyes/
├── index.html       — main page (webcam + discs + hand tracking)
├── instrument.js    — all logic: MediaPipe, disc hit-testing, Tone.js audio
├── eyes.js          — stop-motion eye animation on the landing screen
└── style.css        — visual design system
```

---

## Roadmap

- [ ] Voice recording mode — sing a note, generate harmonies in your own voice
- [ ] Raga mode — constrain the left disc to notes of a specific raga
- [ ] Sustain / release controls via hand height
- [ ] Mobile support

---

## Made by

[Manya Jain](https://github.com/ManyaJainrkm) | MS Computer Science, Arizona State University.  
Built as a creative coding project at the intersection of music theory, computer vision, and web audio.
