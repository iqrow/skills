// Builds fiction-writing.json (throwaway generator; the JSON is the source of truth).
import fs from 'node:fs'
import { svg, T, wrap, SERIF, r4, turn, turnPoint, rod, aimY, cardPt, card, pawn } from './lib.mjs'
import { genres, pageEdge, player } from './covers.mjs'
import * as C from './cards.mjs'

const OUT = process.argv[2] ?? new URL('../fiction-writing.json', import.meta.url)
const dataURL = (name) => new URL(`./${name}`, import.meta.url)
const DB = '#0f1a24'

// A flat card (backing box + svg plane), w wide, with a helper that maps svg points to look coordinates
function flat(svgStr, W, H, w, { back = '#d8d0bf', thick = 0.014, slot } = {}) {
  const h = r4((w * H) / W)
  return {
    parts: card(svgStr, w, h, { back, thick, slot }),
    at: (vx, vy, dz = 0.012) => {
      const p = cardPt(vx, vy, W, H, w, h)
      p[2] = r4(p[2] + dz)
      return p
    },
  }
}
const lookOf = (f) => ({ parts: f.parts })

// ---------------------------------------------------------------- root: the book
const BOOK = [0, -22, 0]
const ink = '#14161f'
const paperback = [
  { slot: 'boards', shape: 'box', size: [1.0, 1.52, 0.012], pos: [0, 0, -0.094], color: ink, material: 'gloss' },
  { slot: 'boards', shape: 'box', size: [0.016, 1.52, 0.2], pos: [-0.492, 0, 0], color: ink, material: 'gloss' },
  { slot: 'pages', shape: 'box', size: [0.97, 1.49, 0.176], pos: [0.005, 0, 0], color: '#efe6d2', material: 'matte' },
  { slot: 'pages', shape: 'plane', size: [0.176, 1.49], pos: [0.4915, 0, 0], rot: [0, 90, 0], svg: pageEdge(0.176, 1.49) },
  { slot: 'boards', shape: 'box', size: [1.0, 1.52, 0.012], pos: [0, 0, 0.094], color: ink, material: 'gloss' },
  { slot: 'cover', shape: 'plane', size: [0.984, 1.505], pos: [0, 0, 0.1015], svg: genres.thriller },
  { slot: 'marker', shape: 'box', size: [0.11, 0.34, 0.006], pos: [-0.26, 0.84, 0.03], color: '#c8463d', material: 'matte' },
]
const hardback = [
  { slot: 'boards', shape: 'box', size: [1.06, 1.6, 0.03], pos: [0.02, 0, -0.128], color: ink, material: 'gloss' },
  { slot: 'boards', shape: 'box', size: [0.034, 1.6, 0.286], pos: [-0.493, 0, 0], color: ink, material: 'gloss' },
  { slot: 'pages', shape: 'box', size: [0.99, 1.52, 0.226], pos: [0.005, 0, 0], color: '#efe6d2', material: 'matte' },
  { slot: 'pages', shape: 'plane', size: [0.226, 1.52], pos: [0.5015, 0, 0], rot: [0, 90, 0], svg: pageEdge(0.226, 1.52) },
  { slot: 'boards', shape: 'box', size: [1.06, 1.6, 0.03], pos: [0.02, 0, 0.128], color: ink, material: 'gloss' },
  { slot: 'cover', shape: 'plane', size: [1.046, 1.6], pos: [0.02, 0, 0.1445], svg: genres.thriller },
  { slot: 'marker', shape: 'box', size: [0.05, 0.26, 0.004], pos: [0.15, -0.86, 0.06], color: '#c8463d', material: 'matte' },
]
const ereader = [
  { slot: 'device', shape: 'box', size: [1.12, 1.6, 0.06], radius: 0.07, pos: [0, 0, 0], color: '#2b2b30', material: 'gloss' },
  { slot: 'boards', shape: 'box', size: [1.18, 1.66, 0.02], radius: 0.08, pos: [0, 0, -0.04], color: ink, material: 'matte' },
  { slot: 'pages', shape: 'plane', size: [0.94, 1.38], pos: [0, 0.07, 0.0305], color: '#e4e2da', material: 'screen' },
  { slot: 'cover', shape: 'plane', size: [0.88, 1.346], pos: [0, 0.07, 0.032], svg: genres.thriller },
  { slot: 'marker', shape: 'plane', size: [0.2, 0.03], pos: [0, -0.71, 0.031], color: '#6b6b70' },
]
const bud = (x, y, z) => [
  { slot: 'marker', shape: 'sphere', radius: 0.055, pos: [x, y, z], color: '#f2f2f2', material: 'gloss' },
  { slot: 'marker', shape: 'cylinder', radiusTop: 0.018, radiusBottom: 0.018, height: 0.13, pos: [x, r4(y - 0.1), z], color: '#f2f2f2', material: 'gloss' },
]
const audiobook = [
  { slot: 'device', shape: 'box', size: [0.8, 1.64, 0.07], radius: 0.11, pos: [0, 0, 0], color: '#1a1b20', material: 'gloss' },
  { slot: 'boards', shape: 'box', size: [0.84, 1.68, 0.02], radius: 0.12, pos: [0, 0, -0.045], color: ink, material: 'matte' },
  { slot: 'pages', shape: 'plane', size: [0.74, 1.56], pos: [0, 0, 0.0355], svg: player },
  { slot: 'cover', shape: 'plane', size: [0.5, 0.765], pos: [0, 0.3, 0.037], svg: genres.thriller },
  ...bud(0.6, -0.36, 0.12),
  ...bud(0.76, -0.52, 0.06),
]
const rootAt = (p) => turnPoint(p, BOOK)

// ---------------------------------------------------------------- premise
const premiseF = flat(C.premise, 400, 240, 1.3)
const loglineF = flat(C.logline, 400, 240, 1.3)
const stakesF = flat(C.stakes(0), 360, 300, 1.2, { slot: 'dial', back: '#101216' })

// ---------------------------------------------------------------- characters board
const TILT = [28, 0, 0]
const bxz = ([x, y]) => [r4((x / 400 - 0.5) * 1.4), r4((y / 400 - 0.5) * 1.4)]
const board = (svgStr) => [
  { shape: 'cylinder', radiusTop: 0.7, radiusBottom: 0.72, height: 0.06, pos: [0, 0, 0], color: '#5e432b', material: 'matte' },
  { shape: 'plane', size: [1.4, 1.4], pos: [0, 0.0305, 0], rot: [-90, 0, 0], svg: svgStr },
]
const S = Object.fromEntries(Object.entries(C.SPOTS).map(([k, v]) => [k, bxz(v)]))
const charParts = [
  ...turn([
    ...board(C.charactersBoard),
    pawn('#e2a13b', [S.hero[0], 0.03, S.hero[1]], 0.9),
    pawn('#8e2430', [S.antag[0], 0.03, S.antag[1]], 1.0),
    pawn('#3f73b5', [S.ally[0], 0.03, S.ally[1]], 0.8),
    pawn('#8ea37f', [S.mentor[0], 0.03, S.mentor[1]], 0.85),
  ], TILT),
  { shape: 'plane', size: [0.5, 0.275], pos: [0.07, 0.62, 0.35], svg: C.bubble },
]
// The web gets its own steeper tilt and shorter pawns so no pawn hides another's label.
const webParts = turn([
  ...board(C.webBoard),
  ...C.WEB.map(([, col], k) => { const [x, z] = bxz(C.webSpots[k]); return pawn(col, [x, 0.03, z], k === 0 ? 0.72 : 0.64) }),
], [40, 0, 0])

const protF = flat(C.protagonist, 400, 520, 1.0)
const antF = flat(C.antagonist, 400, 520, 1.0, { back: '#0d0b0e' })
const charzF = flat(C.characterization(0), 400, 512, 0.95, { slot: 'page' })

// sliders desk
const FW = 1.2, FH = r4((1.2 * 284) / 400)
const faderParts = turn([
  { shape: 'box', size: [1.26, 0.91, 0.06], radius: 0.04, pos: [0, 0, -0.031], color: '#121418', material: 'matte' },
  { shape: 'plane', size: [FW, FH], pos: [0, 0, 0.0015], svg: C.faders },
  ...C.SLIDERS.flatMap(([, v], i) => {
    const p = cardPt(C.FADER_X[i], 230 - 18 * v, 400, 284, FW, FH)
    return [
      { shape: 'box', size: [0.13, 0.056, 0.06], pos: [p[0], p[1], 0.03], color: '#d9d6cf', material: 'gloss' },
      { shape: 'box', size: [0.132, 0.01, 0.062], pos: [p[0], p[1], 0.03], color: '#e2a13b', material: 'matte' },
    ]
  }),
], [-32, 0, 0])

// ---------------------------------------------------------------- plot and structure
const plotF = flat(C.plotStructure, 480, 320, 1.5)
const modelsF = flat(C.MODELS['model-three-act'], 440, 300, 1.32, { slot: 'diagram', back: DB })
const roadF = flat(C.turningPoints, 440, 300, 1.32, { back: '#6f8a58' })
const climaxF = flat(C.climax, 440, 300, 1.32, { back: '#0b0e14' })
const braidF = flat(C.braid, 400, 400, 1.1, { back: DB })
const miceF = flat(C.mice(0), 440, 300, 1.32, { slot: 'threads', back: DB })
const valueF = flat(C.valueShift, 440, 280, 1.32, { back: DB })

const clipParts = turn([
  { shape: 'box', size: [0.8, 1.06, 0.03], pos: [0, -0.03, -0.017], color: '#a0703f', material: 'matte' },
  { shape: 'plane', size: [0.68, 0.88], pos: [0, -0.02, 0], svg: C.nightList },
  { shape: 'box', size: [0.34, 0.09, 0.05], pos: [0, 0.44, 0.012], color: '#b9bcc2', material: 'metal' },
  { shape: 'cylinder', radiusTop: 0.025, radiusBottom: 0.025, height: 0.3, pos: [0, 0.48, 0.03], rot: [0, 0, 90], color: '#9da1a8', material: 'metal' },
], [-8, 18, 0])

// dominoes: chain along local x, faces on -x, then turned so the faces look at the camera
const dominoFace = (word, event, hl) => svg(300, 560, `<rect width="300" height="560" rx="18" fill="#1d1d22"/><line x1="24" y1="280" x2="276" y2="280" stroke="#f4efe6" stroke-width="5"/>` +
  T(150, 166, word, { size: word.length > 6 ? 40 : 52, weight: 700, fill: hl, anchor: 'middle' }) +
  wrap(event, 13).map((l, i) => T(150, 372 + i * 46, l, { size: 36, font: SERIF, fill: '#f4efe6', anchor: 'middle' })).join(''))
const DOMINOES = [['FIRST', 'Maya finds the list', '#f4efe6', 48], ['THEREFORE', 'she runs to security', '#e8c26b', 20], ['BUT', 'security is in on it', '#f0a59c', 0], ['THEREFORE', 'she hides and plans', '#e8c26b', 0]]
const dominoParts = turn([
  { shape: 'box', size: [1.9, 0.02, 0.5], pos: [0, -0.01, 0], color: '#cfc6b4', material: 'matte' },
  ...DOMINOES.flatMap(([w, e, c, tilt], i) => turn([
    { shape: 'box', size: [0.07, 0.56, 0.3], pos: [0, 0.28, 0], color: '#1d1d22', material: 'gloss' },
    { shape: 'plane', size: [0.3, 0.56], pos: [-0.0365, 0.28, 0], rot: [0, -90, 0], svg: dominoFace(w, e, c) },
  ], [0, 0, -tilt], [r4(-0.66 + i * 0.44), 0, 0])),
], [0, 50, 0]).map((p) => p)
const dominoLook = turn(dominoParts, [10, 0, 0])

// fanned scene cards
const SCN = [-10, 15, 0]
const sceneParts = turn([
  { shape: 'plane', size: [1.2, 0.72], pos: [-0.1, 0.1, -0.03], rot: [0, 0, 9], svg: C.blankScene(13, 3) },
  { shape: 'plane', size: [1.2, 0.72], pos: [0.09, 0.05, -0.015], rot: [0, 0, -5], svg: C.blankScene(15, 7) },
  { shape: 'plane', size: [1.2, 0.72], pos: [0, 0, 0], svg: C.sceneCard },
], SCN)
const scenePt = (vx, vy) => turnPoint(cardPt(vx, vy, 400, 240, 1.2, 0.72, [0, 0, 0.01]), SCN)
const STEPS = [
  ['scene-goal', 1, 'SCENE', 'Goal', 'goal', 'Get the list to security.'],
  ['scene-conflict', 2, 'SCENE', 'Conflict', 'conflict', 'Voss’s guard blocks the stairs.'],
  ['scene-disaster', 3, 'SCENE', 'Disaster', 'disaster', 'Security is in on it.'],
  ['sequel-reaction', 4, 'SEQUEL', 'Reaction', 'reaction', 'Panic. She hides and shakes.'],
  ['sequel-dilemma', 5, 'SEQUEL', 'Dilemma', 'dilemma', 'Run home, or stay and warn bed four?'],
  ['sequel-decision', 6, 'SEQUEL', 'Decision', 'decision', 'She stays.'],
]
const stepLook = (n, kind, label, icon, text) => lookOf(flat(C.step(n, kind, label, icon, text), 320, 400, 0.8, { back: DB }))

// ---------------------------------------------------------------- setting
const mapF = flat(C.settingMap, 440, 340, 1.4, { back: '#b49a6e' })
const postF = flat(C.placeTime, 440, 280, 1.32)
const binderParts = turn([
  { shape: 'box', size: [0.84, 1.06, 0.12], pos: [0, 0, -0.061], color: '#2e4a62', material: 'matte' },
  { shape: 'box', size: [0.08, 1.06, 0.124], pos: [-0.42, 0, -0.061], color: '#22374a', material: 'matte' },
  { shape: 'plane', size: [0.72, 0.92], pos: [0.02, 0, 0.0015], svg: C.worldBible },
], [0, 20, 0])
const dropProfile = [[0, 0], [0.028, 0.006], [0.04, 0.024], [0.038, 0.044], [0.024, 0.066], [0.008, 0.086], [0, 0.094]]
const expoParts = [
  { shape: 'plane', size: [1.2, 0.8], pos: [0, -0.35, 0], rot: [-62, 0, 0], svg: C.expoPage },
  { shape: 'lathe', profile: [[0, 0], [0.012, 0], [0.02, 0.05], [0.04, 0.14], [0.042, 0.56], [0, 0.56]], pos: [0, -0.12, 0.078], color: '#ffffff', material: 'glass', opacity: 0.35 },
  { shape: 'lathe', profile: [[0, 0.02], [0.014, 0.04], [0.033, 0.14], [0.033, 0.36], [0, 0.36]], pos: [0, -0.12, 0.078], color: '#3b7dd8', material: 'liquid' },
  { shape: 'lathe', profile: [[0, 0.54], [0.045, 0.55], [0.07, 0.62], [0.072, 0.72], [0.05, 0.8], [0, 0.83]], smooth: true, pos: [0, -0.12, 0.078], color: '#b53a2e', material: 'matte' },
  { shape: 'lathe', profile: dropProfile, smooth: true, pos: [0, -0.27, 0.078], color: '#3b7dd8', material: 'liquid' },
]

// ---------------------------------------------------------------- narration: movie camera
const CAM1 = [0, -35, 0], CAM2 = [8, 0, 0]
const xr = [0, 0, 90]
const camRaw = [
  { shape: 'box', size: [0.9, 0.5, 0.36], pos: [0, 0, 0], color: '#2b2d33', material: 'matte' },
  { shape: 'cylinder', radiusTop: 0.21, radiusBottom: 0.21, height: 0.06, pos: [-0.27, 0.47, 0], rot: [90, 0, 0], color: '#3a3d45', material: 'metal' },
  { shape: 'cylinder', radiusTop: 0.21, radiusBottom: 0.21, height: 0.06, pos: [0.17, 0.47, 0], rot: [90, 0, 0], color: '#3a3d45', material: 'metal' },
  { shape: 'cylinder', radiusTop: 0.05, radiusBottom: 0.05, height: 0.09, pos: [-0.27, 0.47, 0], rot: [90, 0, 0], color: '#9aa0aa', material: 'metal' },
  { shape: 'cylinder', radiusTop: 0.05, radiusBottom: 0.05, height: 0.09, pos: [0.17, 0.47, 0], rot: [90, 0, 0], color: '#9aa0aa', material: 'metal' },
  { shape: 'cylinder', radiusTop: 0.11, radiusBottom: 0.13, height: 0.34, pos: [0.62, 0, 0], rot: xr, color: '#1c1c20', material: 'metal' },
  { shape: 'cylinder', radiusTop: 0.142, radiusBottom: 0.142, height: 0.07, pos: [0.55, 0, 0], rot: xr, color: '#c9a227', material: 'metal' },
  { shape: 'cylinder', radiusTop: 0.09, radiusBottom: 0.09, height: 0.012, pos: [0.795, 0, 0], rot: xr, color: '#6fa8dc', material: 'glass', opacity: 0.8 },
  { shape: 'cylinder', radiusTop: 0.05, radiusBottom: 0.05, height: 0.2, pos: [-0.54, 0.12, 0.1], rot: xr, color: '#1c1c20', material: 'matte' },
  { shape: 'cylinder', radiusTop: 0.07, radiusBottom: 0.06, height: 0.06, pos: [-0.66, 0.12, 0.1], rot: xr, color: '#111114', material: 'matte' },
  { shape: 'box', size: [0.05, 0.1, 0.05], pos: [0.3, 0.27, 0.2], color: '#2b2d33', material: 'matte' },
  { shape: 'cylinder', radiusTop: 0.04, radiusBottom: 0.04, height: 0.46, pos: [0.4, 0.33, 0.2], rot: xr, color: '#5b616b', material: 'matte' },
]
const camParts = turn(turn(camRaw, CAM1), CAM2)
const camAt = (p) => turnPoint(turnPoint(p, CAM1), CAM2)

// dial, switch and slider instruments share a base and a slight turn
const INST = [-10, 12, 0]
const base = (w, h) => ({ shape: 'box', size: [r4(w + 0.06), r4(h + 0.06), 0.05], radius: 0.05, pos: [0, 0, -0.026], color: '#15171c', material: 'matte' })

const PERSON_SAMPLES = ['I read the list twice. My name was still there.', 'You read the list twice. Your name is still there.', 'Maya read the list twice. Her name was still there.', 'Maya read the list. Upstairs, Voss already knew.']
const KC = cardPt(C.DIAL.cx, C.DIAL.cy, 400, 400, 1.2, 1.2)
const knob = (a) => {
  const t = (a * Math.PI) / 180
  return turn([
    { slot: 'knob', shape: 'cylinder', radiusTop: 0.16, radiusBottom: 0.175, height: 0.1, pos: [KC[0], KC[1], 0.05], rot: [90, 0, 0], color: '#2c2f36', material: 'metal' },
    { slot: 'knob', shape: 'box', size: [0.03, 0.13, 0.02], pos: [r4(KC[0] + 0.085 * Math.cos(t)), r4(KC[1] + 0.085 * Math.sin(t)), 0.106], rot: [0, 0, a - 90], color: '#e8c26b', material: 'gloss' },
  ], INST)
}
const personParts = [...turn([base(1.2, 1.2), { slot: 'face', shape: 'plane', size: [1.2, 1.2], pos: [0, 0, 0.0015], svg: C.personFace(0, PERSON_SAMPLES[0]) }], INST), ...knob(150)]

const TENSE_SAMPLES = ['Maya ran. The door was locked.', 'Maya runs. The door is locked.']
const SWC = cardPt(200, 96, 400, 280, 1.2, 0.84)
const lever = (dir) => {
  const a = [SWC[0], SWC[1], 0.04], b = [r4(SWC[0] + 0.1 * dir), r4(SWC[1] + 0.05), 0.22]
  return turn([
    rod(a, b, 0.022, '#c9ccd2', { material: 'metal', slot: 'lever' }),
    { slot: 'lever', shape: 'sphere', radius: 0.045, pos: b, color: '#e8c26b', material: 'gloss' },
  ], INST)
}
const tenseParts = [...turn([
  base(1.2, 0.84),
  { slot: 'face', shape: 'plane', size: [1.2, 0.84], pos: [0, 0, 0.0015], svg: C.tenseFace(0, TENSE_SAMPLES[0]) },
  { shape: 'cylinder', radiusTop: 0.07, radiusBottom: 0.08, height: 0.05, pos: [SWC[0], SWC[1], 0.025], rot: [90, 0, 0], color: '#3a3f4a', material: 'metal' },
], INST), ...lever(-1)]

const GARDNER = ['It was winter of the year 1853. A large man stepped out of a doorway.', 'Henry J. Warburton had never much cared for snowstorms.', 'Henry hated snowstorms.', 'God how he hated these damn snowstorms.', 'Snow. Under your collar, down inside your shoes, freezing and plugging up your miserable soul…']
const PDW = 1.32, PDH = r4((1.32 * 288) / 440)
const pdCap = (lvl) => {
  const p = cardPt(C.PD_X(lvl), 136, 440, 288, PDW, PDH)
  return turn([
    { slot: 'cap', shape: 'box', size: [0.07, 0.13, 0.06], pos: [p[0], p[1], 0.03], color: '#d9d6cf', material: 'gloss' },
    { slot: 'cap', shape: 'box', size: [0.072, 0.012, 0.062], pos: [p[0], p[1], 0.03], color: '#e8c26b', material: 'matte' },
  ], INST)
}
const distanceParts = [...turn([base(PDW, PDH), { slot: 'face', shape: 'plane', size: [PDW, PDH], pos: [0, 0, 0.0015], svg: C.distanceFace(1, GARDNER[0]) }], INST), ...pdCap(1)]

const STW = 1.272, STH = 0.852
const stCap = (k) => {
  const p = cardPt(C.ST_X[k], 74, 424, 284, STW, STH)
  return turn([
    { slot: 'cap', shape: 'box', size: [0.08, 0.13, 0.06], pos: [p[0], p[1], 0.03], color: '#d9d6cf', material: 'gloss' },
    { slot: 'cap', shape: 'box', size: [0.082, 0.012, 0.062], pos: [p[0], p[1], 0.03], color: '#e8c26b', material: 'matte' },
  ], INST)
}
const showTellParts = [...turn([base(STW, STH), { slot: 'face', shape: 'plane', size: [STW, STH], pos: [0, 0, 0.0015], svg: C.showTellFace(0) }], INST), ...stCap(0)]
const povCharF = flat(C.povCharacter, 440, 300, 1.32, { back: DB })

// ---------------------------------------------------------------- prose
const proseF = flat(C.prosePage, 400, 558, 0.9, { back: '#d9d0bd' })
const MAG = [-0.21, 0.04, 0.16]
const detailParts = [
  { shape: 'box', size: [1.22, 0.86, 0.01], pos: [0, 0, -0.007], color: '#d9d0bd', material: 'matte' },
  { shape: 'plane', size: [1.2, 0.84], pos: [0, 0, 0], svg: C.detailPage },
  { shape: 'plane', size: [0.46, 0.46], pos: [MAG[0], MAG[1], 0.15], svg: C.lens },
  { shape: 'cylinder', radiusTop: 0.24, radiusBottom: 0.24, height: 0.008, pos: MAG, rot: [90, 0, 0], color: '#dfefff', material: 'glass', opacity: 0.18 },
  { shape: 'torus', radius: 0.24, tube: 0.026, pos: MAG, color: '#3a3a40', material: 'metal' },
  rod([MAG[0] + 0.18, MAG[1] - 0.18, MAG[2]], [MAG[0] + 0.5, MAG[1] - 0.5, MAG[2]], 0.04, '#5b3a29', { material: 'gloss' }),
]
const rhythmF = flat(C.rhythm, 440, 300, 1.32, { back: DB })
const dialogueF = flat(C.dialoguePage, 400, 420, 0.95)
const tagsF = flat(C.tags(0), 440, 300, 1.32, { slot: 'tags', back: DB })
const motifF = flat(C.motif, 440, 280, 1.32, { back: DB })

// ---------------------------------------------------------------- reader experience: open book with a page turning
const PW = 0.68, PH = 0.954
const readerParts = [
  { shape: 'box', size: [1.48, 1.0, 0.014], pos: [0, 0, -0.07], color: ink, material: 'gloss' },
  ...turn([{ shape: 'box', size: [PW, PH, 0.05], pos: [-PW / 2, 0, -0.027], color: '#efe6d2', material: 'matte' }, { shape: 'plane', size: [PW, PH], pos: [-PW / 2, 0, 0], svg: C.leftPage }], [0, 10, 0]),
  ...turn([{ shape: 'box', size: [PW, PH, 0.05], pos: [PW / 2, 0, -0.027], color: '#efe6d2', material: 'matte' }, { shape: 'plane', size: [PW, 0.928], pos: [PW / 2, 0, 0], svg: C.turningPage }], [0, -10, 0]),
  ...turn([{ shape: 'plane', size: [PW, PH], pos: [PW / 2, 0, 0.004], svg: C.rightPage }], [0, -40, 0]),
  { shape: 'box', size: [0.035, 0.36, 0.004], pos: [0, -0.6, 0.03], color: '#c8463d', material: 'matte' },
]
const pagePt = (sx, sy, side, ang) => turnPoint([side * PW / 2 + (sx / 340 - 0.5) * PW, (0.5 - sy / 477) * PH, 0.008], [0, ang, 0])
const hooksF = flat(C.hooksPage, 400, 520, 0.95)

const GAP_TURN = [12, -20, 0]
const leg = (x, z) => ({ slot: 'table', shape: 'cylinder', radiusTop: 0.025, radiusBottom: 0.022, height: 0.6, pos: [x, -0.325, z], color: '#6b4429', material: 'gloss' })
const cup = (x, z, c) => ({ slot: 'table', shape: 'lathe', profile: [[0, 0], [0.05, 0], [0.055, 0.1], [0.05, 0.1]], pos: [x, 0.025, z], color: c, material: 'gloss' })
const gapParts = turn([
  { slot: 'table', shape: 'box', size: [1.3, 0.05, 0.62], pos: [0, 0, 0], color: '#8a5a36', material: 'gloss' },
  leg(-0.6, -0.26), leg(0.6, -0.26), leg(-0.6, 0.26), leg(0.6, 0.26),
  cup(-0.35, 0.1, '#e8e1d5'), cup(0.3, -0.05, '#c9d7e8'),
  { slot: 'hidden', shape: 'sphere', radius: 0.13, pos: [0.05, -0.48, 0.05], color: '#1c1c1f', material: 'gloss' },
  { slot: 'hidden', shape: 'cylinder', radiusTop: 0.012, radiusBottom: 0.012, height: 0.1, pos: [0.11, -0.33, 0.05], rot: [0, 0, -30], color: '#c9a46a', material: 'matte' },
  { slot: 'hidden', shape: 'sphere', radius: 0.022, pos: [0.14, -0.285, 0.05], color: '#ffb02e', material: 'glow' },
  { slot: 'clock', shape: 'cylinder', radiusTop: 0.19, radiusBottom: 0.19, height: 0.05, pos: [0.45, 0.62, -0.25], rot: [90, 0, 0], color: '#2a2530', material: 'gloss' },
  { slot: 'clock', shape: 'plane', size: [0.36, 0.36], pos: [0.45, 0.62, -0.2235], svg: C.clockFace },
], GAP_TURN)
const parcel = turn([
  { slot: 'hidden', shape: 'box', size: [0.34, 0.24, 0.3], pos: [0.05, -0.505, 0.05], color: '#b88a5a', material: 'matte' },
  { slot: 'hidden', shape: 'box', size: [0.345, 0.03, 0.305], pos: [0.05, -0.505, 0.05], color: '#e8dcc0', material: 'matte' },
  { slot: 'hidden', shape: 'plane', size: [0.13, 0.13], pos: [0.05, -0.49, 0.2015], svg: C.parcelTag },
], GAP_TURN)
const cloth = turn([
  { slot: 'cloth', shape: 'box', size: [1.4, 0.645, 0.72], pos: [0, -0.2925, 0], color: '#f7f2ea', material: 'matte' },
  { slot: 'cloth', shape: 'plane', size: [1.4, 0.72], pos: [0, 0.0305, 0], rot: [-90, 0, 0], svg: C.gingham(560, 288) },
  { slot: 'cloth', shape: 'plane', size: [1.4, 0.645], pos: [0, -0.2925, 0.3605], svg: C.gingham(560, 258, 5) },
  { slot: 'cloth', shape: 'plane', size: [0.72, 0.645], pos: [0.7005, -0.2925, 0], rot: [0, 90, 0], svg: C.gingham(288, 258, 2) },
], GAP_TURN)

// ---------------------------------------------------------------- writing process: the desk
const DESK = [18, 0, 0]
const LID = 15, lt = (LID * Math.PI) / 180
const lidC = [0.25, r4(0.03 + 0.23 * Math.cos(lt)), r4(-0.22 - 0.23 * Math.sin(lt))]
const lidN = [0, Math.sin(lt), Math.cos(lt)]
const off = (p, n, k) => p.map((v, i) => r4(v + n[i] * k))
const deskRaw = [
  { shape: 'box', size: [2.1, 0.06, 1.05], pos: [0, -0.03, 0], color: '#8a5a36', material: 'gloss' },
  { shape: 'box', size: [2.1, 1.1, 0.02], pos: [0, 0.55, -0.54], color: '#d9cdb8', material: 'matte' },
  { shape: 'box', size: [0.95, 0.68, 0.04], pos: [-0.55, 0.62, -0.51], color: '#6b4429', material: 'matte' },
  { shape: 'plane', size: [0.87, 0.6], pos: [-0.55, 0.62, -0.488], svg: C.corkCards },
  { shape: 'box', size: [0.72, 0.03, 0.48], pos: [0.25, 0.015, 0.02], color: '#b8bcc4', material: 'metal' },
  { shape: 'plane', size: [0.6, 0.25], pos: [0.25, 0.031, -0.03], rot: [-90, 0, 0], svg: C.keyboard },
  { shape: 'box', size: [0.72, 0.46, 0.02], pos: lidC, rot: [-LID, 0, 0], color: '#b8bcc4', material: 'metal' },
  { shape: 'plane', size: [0.68, 0.4185], pos: off(lidC, lidN, 0.011), rot: [-LID, 0, 0], svg: C.screenDoc({ words: '86,612' }) },
  { shape: 'box', size: [0.42, 0.14, 0.56], pos: [-0.62, 0.07, 0.12], color: '#f4f1ea', material: 'matte' },
  { shape: 'plane', size: [0.4, 0.543], pos: [-0.62, 0.1415, 0.12], rot: [-90, 0, 0], svg: C.markedTopPage },
  rod([-0.28, 0.016, 0.38], [0.04, 0.016, 0.3], 0.015, '#c0392b', { material: 'gloss' }),
  { shape: 'lathe', profile: [[0, 0], [0.075, 0], [0.08, 0.17], [0.075, 0.17]], pos: [0.75, 0, 0.36], color: '#e8e1d5', material: 'gloss' },
  { shape: 'torus', radius: 0.045, tube: 0.013, pos: [0.83, 0.09, 0.36], color: '#e8e1d5', material: 'gloss' },
  { shape: 'box', size: [0.26, 0.4, 0.06], pos: [0.88, 0.2, -0.3], color: ink, material: 'gloss' },
  { shape: 'plane', size: [0.26, 0.398], pos: [0.88, 0.2, -0.2685], svg: genres.thriller },
]
const deskParts = turn(deskRaw, DESK)
const deskAt = (p) => turnPoint(p, DESK)

const notebookParts = turn([
  { shape: 'box', size: [1.26, 0.86, 0.02], radius: 0.03, pos: [0, 0, -0.012], color: '#24384c', material: 'matte' },
  { shape: 'plane', size: [0.58, 0.8], pos: [-0.305, 0, 0], svg: C.notesPage },
  { slot: 'plan', shape: 'plane', size: [0.58, 0.8], pos: [0.305, 0, 0], svg: C.PLANS.architect },
  ...Array.from({ length: 8 }, (_, i) => ({ shape: 'torus', radius: 0.028, tube: 0.006, pos: [0, r4(-0.33 + i * 0.094), 0.004], rot: [90, 0, 0], color: '#b9bcc2', material: 'metal' })),
], [-20, 0, 0])
const corkParts = [
  { shape: 'box', size: [1.46, 1.02, 0.05], pos: [0, 0, -0.03], color: '#6b4429', material: 'matte' },
  { shape: 'plane', size: [1.344, 0.912], pos: [0, 0, 0], svg: C.outlineBoard },
]

const LAP = [16, 0, 0], LA = (12 * Math.PI) / 180
const lapC = [0, r4(0.02 + 0.41 * Math.cos(LA)), r4(-0.43 - 0.41 * Math.sin(LA))]
const lapN = [0, Math.sin(LA), Math.cos(LA)], lapU = [0, Math.cos(LA), -Math.sin(LA)]
const laptopParts = turn([
  { shape: 'box', size: [1.3, 0.04, 0.86], pos: [0, 0, 0], color: '#b8bcc4', material: 'metal' },
  { shape: 'plane', size: [1.1, 0.458], pos: [0, 0.0205, -0.12], rot: [-90, 0, 0], svg: C.keyboard },
  { shape: 'plane', size: [0.42, 0.26], pos: [0, 0.0205, 0.26], rot: [-90, 0, 0], color: '#a9adb5' },
  { shape: 'box', size: [1.3, 0.82, 0.03], pos: lapC, rot: [-12, 0, 0], color: '#b8bcc4', material: 'metal' },
  { shape: 'plane', size: [1.26, 0.78], pos: off(lapC, lapN, 0.0155), rot: [-12, 0, 0], color: '#111114' },
  { shape: 'plane', size: [1.2, 0.7385], pos: off(lapC, lapN, 0.017), rot: [-12, 0, 0], svg: C.screenDoc({ words: '52,310', badge: true }) },
], LAP)
const lapPt = (sx, sy) => {
  const lx = (sx / 520 - 0.5) * 1.2, ly = (0.5 - sy / 320) * 0.7385
  return turnPoint([r4(lapC[0] + lx), r4(lapC[1] + lapN[1] * 0.03 + lapU[1] * ly), r4(lapC[2] + lapN[2] * 0.03 + lapU[2] * ly)], LAP)
}
const STACK = [-18, 24, 0]
const stack = (depth, svgStr, extra = []) => turn([
  { shape: 'box', size: [0.68, 0.882, depth], pos: [0, 0, r4(-depth / 2 - 0.002)], color: '#f7f5ef', material: 'matte' },
  { shape: 'plane', size: [0.68, 0.882], pos: [0, 0, 0], svg: svgStr },
  ...extra,
], STACK)
const firstDraftParts = stack(0.22, C.titlePage({ draft: 'FIRST DRAFT', words: '96,200', coffee: true }), [
  { shape: 'box', size: [0.68, 0.882, 0.004], pos: [0.03, -0.02, -0.05], rot: [0, 0, 4], color: '#fbfaf6', material: 'matte' },
  { shape: 'box', size: [0.68, 0.882, 0.004], pos: [-0.025, 0.015, -0.14], rot: [0, 0, -5], color: '#fbfaf6', material: 'matte' },
])
const revisedParts = stack(0.12, C.titlePage({ draft: 'SECOND DRAFT', words: '86,600' }), [
  { shape: 'plane', size: [0.24, 0.24], pos: [0.22, 0.33, 0.003], rot: [0, 0, 8], svg: C.sticky },
])
const calF = flat(C.calendar(500), 440, 340, 1.32, { slot: 'cal' })
const NORMS = [['norm-adult', 'Adult: literary, mystery, thriller', [80000, 89999], 'adult fiction', 3], ['norm-sff', 'Science fiction and fantasy', [100000, 115000], 'SF and fantasy', 4], ['norm-ya', 'Young adult', [55000, 79999], 'young adult', 2], ['norm-middle-grade', 'Middle grade', [40000, 55000], 'middle grade', 1]]
const barF = flat(C.wordBar(NORMS[0][2], NORMS[0][3]), 480, 170, 1.44, { slot: 'bar' })
const reverseF = flat(C.reverseOutline, 440, 320, 1.32)
const betaF = flat(C.betaPage, 400, 520, 0.95)
const revF = flat(C.revisionPage, 400, 512, 0.95)
const penTip = [0.12, -0.3, 0.07], penTail = [0.5, 0.25, 0.07]
const penU = (() => { const d = penTail.map((v, i) => v - penTip[i]); const L = Math.hypot(...d); return d.map((v) => v / L) })()
const revisionParts = [
  ...revF.parts,
  rod(off(penTip, penU, 0.08), off(penTail, penU, -0.15), 0.03, '#c0392b', { material: 'gloss' }),
  rod(off(penTail, penU, -0.16), penTail, 0.034, '#7b1e17', { material: 'gloss' }),
  { shape: 'cone', radius: 0.03, height: 0.08, pos: off(penTip, penU, 0.04), rot: aimY(penU.map((v) => -v)), color: '#e8d9b8', material: 'matte' },
]
const editF = flat(C.EDITS.developmental, 400, 512, 0.95, { slot: 'page' })
const finalParts = turn([
  { shape: 'box', size: [0.86, 1.114, 0.1], pos: [0, 0, -0.052], color: '#f7f5ef', material: 'matte' },
  { shape: 'plane', size: [0.86, 1.114], pos: [0, 0, 0], svg: C.shunnPage },
], [-10, 18, 0])
const pubF = flat(C.PUBLISH.traditional, 440, 320, 1.32, { slot: 'flow', back: DB })

// ---------------------------------------------------------------- nodes
const feel = (shape, energy, weight, warmth, grain, motion, why) => ({ shape, energy, weight, warmth, grain, motion, why })
const it = (id, name, plain, extra = {}) => ({ id, name, plain, ...extra })

const nodes = [
  {
    id: 'novel', term: 'Novel', aka: ['book', 'fiction book', 'story'], kind: 'product',
    plain: 'A long invented story told in prose. SFWA’s award rules count 40,000 words or more as a novel.',
    ask: 'What will the reader feel on the last page, and what keeps them turning pages to get there?',
    range: '40,000+ words (SFWA); thrillers 80,000–89,999 (Writer’s Digest)',
    trouble: 'Readers stop halfway, or finish and feel nothing.',
    children: ['premise', 'characters', 'plot-structure', 'setting', 'narration', 'prose', 'theme', 'writing-process', 'reader-experience'],
    links: [{ to: 'word-count', rel: 'measured by' }, { to: 'writing-process', rel: 'made by' }, { to: 'final-manuscript', rel: 'made from' }],
    look: { parts: turn(paperback, BOOK) },
    variants: [
      { label: 'Format', items: [
        it('format-paperback', 'Paperback', 'Soft card cover and a glued (perfect-bound) spine. Common trim sizes include 5 × 8 in and 6 × 9 in.'),
        it('format-hardback', 'Hardback', 'Rigid boards, often under a paper jacket. Printers offer case-laminate, cloth and jacketed covers.', { look: { parts: turn(hardback, BOOK) } }),
        it('format-ereader', 'E-book', 'A digital edition, usually an EPUB file, read on an e-reader, phone or tablet.', { look: { parts: turn(ereader, BOOK) } }),
        it('format-audiobook', 'Audiobook', 'The text read aloud. ACX estimates about 9,300 words per finished hour, so an 86,600-word novel runs about nine hours.', { look: { parts: turn(audiobook, BOOK) } }),
      ] },
      { label: 'Genre', items: [
        it('genre-thriller', 'Thriller', 'Suspense, danger, conflict and high stakes (International Thriller Writers).', { svg: { cover: genres.thriller }, tint: { boards: '#14161f' } }),
        it('genre-romance', 'Romance', 'A central love story and an emotionally satisfying, optimistic ending (Romance Writers of America).', { svg: { cover: genres.romance }, tint: { boards: '#f2b8c0' } }),
        it('genre-fantasy', 'Fantasy', 'Magic or other impossible things are real in the story world and shape the conflict.', { svg: { cover: genres.fantasy }, tint: { boards: '#22324a' } }),
        it('genre-mystery', 'Mystery', 'An unsolved crime, often a murder, and an investigation into who did it, how and why. Clues and red herrings lead to the answer.', { svg: { cover: genres.mystery }, tint: { boards: '#3b2f25' } }),
        it('genre-literary', 'Literary', 'Set apart by the quality of the writing and the reading experience, not by its subject. It can overlap other genres.', { svg: { cover: genres.literary }, tint: { boards: '#e9e2d0' } }),
        it('genre-science-fiction', 'Science fiction', 'Built around ideas from science, technology, society or the future: what could happen, even if it has not yet.', { svg: { cover: genres.scifi }, tint: { boards: '#0d1126' } }),
      ] },
    ],
  },

  // ---- premise
  {
    id: 'premise', term: 'Premise', aka: ['the idea', 'what if', 'story idea'], kind: 'part',
    plain: 'The core situation: a character in a setting with a problem. It often starts as a what-if question.',
    does: 'Gives every later choice a test: does this serve the premise?',
    ask: 'Who is in trouble, where, and why can she not walk away?',
    trouble: 'You cannot say what the book is about without listing events.',
    at: rootAt([-0.123, 0.408, 0.104]),
    children: ['logline', 'promise-payoff', 'dramatic-question', 'stakes'],
    links: [{ to: 'theme', rel: 'see also' }],
    look: lookOf(premiseF),
  },
  {
    id: 'logline', term: 'Logline', aka: ['one-line pitch', 'one-sentence summary', 'elevator pitch'], kind: 'part',
    plain: 'The whole novel in one sentence. The Snowflake method asks for fewer than 15 words and no character names.',
    does: 'Tests the premise: if it will not fit in one line, the story is not clear yet.',
    ask: 'Who has the most to lose, and what do they want to win?',
    range: '1 sentence, preferably under 15 words (Snowflake step 1)',
    trouble: 'You need names, subplots or “and then” to explain the book.',
    at: premiseF.at(120, 68),
    look: lookOf(loglineF),
    deeper: 'Pitches and query letters: where the logline becomes the first lines an agent reads.',
  },
  {
    id: 'promise-payoff', term: 'Promise and payoff', aka: ['setup and payoff', 'Chekhov’s gun', 'foreshadowing'], kind: 'concept', pattern: 'pattern-setup-payoff',
    plain: 'Every promise the story makes, it must keep. Chekhov: do not put a loaded gun on stage unless someone will fire it.',
    does: 'Builds trust: readers learn that details matter, so they read closely.',
    ask: 'What did page one promise, and where do I pay it off?',
    range: 'Promise, progress, payoff (Sanderson)',
    trouble: 'Readers feel cheated: a setup goes nowhere, or the ending comes from nowhere.',
    at: premiseF.at(336, 27),
    links: [{ to: 'world-rules', rel: 'see also' }],
    feel: feel(0.3, 0.4, 0.2, 0.75, 0.2, 'orbit', 'A promise goes out and travels round; the payoff brings it home and closes the circle.'),
  },
  {
    id: 'dramatic-question', term: 'Dramatic question', aka: ['central question', 'story question', 'will she or won’t she'], kind: 'concept',
    plain: 'The question the story raises early and answers late. Here: will Maya prove who wrote the list before 06:00?',
    does: 'Pulls the reader to the end: they keep reading to get the answer.',
    ask: 'What question does chapter one plant, and where exactly is it answered?',
    trouble: 'Readers drift away in the middle: the question was answered too soon, or never asked.',
    at: premiseF.at(352, 194),
    links: [{ to: 'climax', rel: 'see also' }],
    feel: feel(0.65, 0.6, -0.3, 0.4, 0.2, 'pulse', 'An open question itches: sharp enough to nag, light enough to hang in the air until the end.'),
  },
  {
    id: 'stakes', term: 'Stakes', aka: ['what’s at risk', 'what could be lost'], kind: 'knob',
    plain: 'What the character loses if she fails. Bell groups stakes as three kinds of death: physical, professional and psychological.',
    does: 'Sets how much the reader cares about each conflict.',
    ask: 'What happens if she fails, and how could it get worse?',
    range: 'Personal and public stakes (Maass); at least one kind of death (Bell)',
    trouble: 'Big explosions but a bored reader: the loss is not personal.',
    at: premiseF.at(74, 141),
    links: [{ to: 'tension-release', rel: 'raises' }],
    look: lookOf(stakesF),
    variants: [{ label: 'Kind of death', items: [
      it('death-physical', 'Physical death', 'Someone dies if the opposition wins. Maya’s own name is on the list.'),
      it('death-professional', 'Professional death', 'The job or calling is on the line. If Maya speaks up, she may never work as a nurse again.', { svg: { dial: C.stakes(1) } }),
      it('death-psychological', 'Psychological death', 'She dies inside if she fails to change. If Maya stays quiet, she becomes part of the silence.', { svg: { dial: C.stakes(2) } }),
    ] }],
  },

  // ---- characters
  {
    id: 'characters', term: 'Characters', aka: ['cast', 'the people in the story'], kind: 'part',
    plain: 'The people who do things in the story: a protagonist, an opponent and the cast around them.',
    does: 'Make events matter: readers care because things happen to someone.',
    ask: 'Who wants what, and how do they get in each other’s way?',
    trouble: 'Characters act only because the plot needs them to.',
    at: rootAt([0.123, -0.034, 0.104]),
    children: ['protagonist', 'characterization', 'antagonist', 'character-arc', 'character-web'],
    look: { parts: charParts },
  },
  {
    id: 'protagonist', term: 'Protagonist', aka: ['main character', 'hero', 'MC'], kind: 'part',
    plain: 'The character whose goal drives the story. Truby: one specific desire line runs through the whole book.',
    does: 'Gives the reader someone to follow, and a goal to measure progress against.',
    ask: 'What does she want, and how will we know if she gets it?',
    trouble: 'She reacts but never chooses; things just happen to her.',
    at: turnPoint([S.hero[0], 0.45, S.hero[1]], TILT),
    children: ['want-need', 'character-sliders'],
    links: [{ to: 'character-arc', rel: 'see also' }],
    look: lookOf(protF),
  },
  {
    id: 'want-need', term: 'Want and need', aka: ['outer goal and inner goal', 'the lie the character believes', 'the ghost'], kind: 'concept',
    plain: 'The want is the outer goal she chases. The need is the truth that frees her from a lie she believes, often since an old wound.',
    does: 'Gives the arc a direction: the plot pushes her to choose the need over the want.',
    ask: 'What lie does she believe, and what old wound made her believe it?',
    trouble: 'The plot problem is solved, but she is the same person she was on page one.',
    at: protF.at(130, 290),
    feel: feel(0.5, 0.45, 0.3, 0.6, 0.3, 'jitter', 'Two goals pull against each other inside one person, so the body never quite settles.'),
  },
  {
    id: 'character-sliders', term: 'Character sliders', aka: ['likability, proactivity, competence'], kind: 'knob',
    plain: 'Sanderson’s three dials for a character: how likable, how proactive and how competent they are.',
    does: 'Let you tune how readers feel about a character without changing the plot.',
    ask: 'Which slider is low, and is that on purpose?',
    range: 'Each slider low to high; a character can move up or down during the story',
    trouble: 'A character feels flat or annoying and you cannot say why.',
    at: protF.at(300, 427),
    look: { parts: faderParts },
  },
  {
    id: 'characterization', term: 'Characterization', aka: ['showing character', 'bringing characters to life'], kind: 'process',
    plain: 'How the text shows who someone is. Burroway’s direct methods are appearance, speech, action and thought; authorial interpretation is the indirect one.',
    does: 'Lets readers build the person from evidence, so the person feels real.',
    ask: 'What does she do, say or notice that only she would?',
    trouble: 'The narrator says she is brave, but she never does anything brave.',
    at: [0.07, 0.62, 0.36],
    links: [{ to: 'dialogue', rel: 'see also' }],
    look: lookOf(charzF),
    variants: [{ label: 'Method', items: [
      it('method-appearance', 'Appearance (direct)', 'Clothes, objects and body show inner values: scrubs two sizes too big.'),
      it('method-speech', 'Speech (direct)', 'What she says, how she says it, and what she avoids saying.', { svg: { page: C.characterization(1) } }),
      it('method-action', 'Action (direct)', 'What she does while pursuing a goal. Checking a drip three times shows fear and care.', { svg: { page: C.characterization(2) } }),
      it('method-thought', 'Thought (direct)', 'Private thoughts, judgements and feelings that only the reader hears.', { svg: { page: C.characterization(3) } }),
      it('method-interpretation', 'Authorial interpretation (indirect)', 'The narrator tells us what she is like. Quick, but the reader must take it on trust.', { svg: { page: C.characterization(4) } }),
    ] }],
  },
  {
    id: 'antagonist', term: 'Antagonist', aka: ['villain', 'opponent', 'bad guy'], kind: 'part',
    plain: 'The opponent who competes with the hero for the same goal. Truby: he attacks her great weakness.',
    does: 'Creates the conflict and sets how hard the protagonist must push.',
    ask: 'Why does he think he is right?',
    trouble: 'He is evil for no reason, or too weak to be a threat.',
    at: turnPoint([S.antag[0], 0.5, S.antag[1]], TILT),
    links: [{ to: 'protagonist', rel: 'see also' }],
    look: lookOf(antF),
  },
  {
    id: 'character-arc', term: 'Character arc', aka: ['character development', 'growth', 'change'], kind: 'concept',
    plain: 'How a character changes, or refuses to change, between the first page and the last. Weiland names five main arcs.',
    does: 'Gives the plot an inner meaning: events become the cause of change.',
    ask: 'Who is she at the end that she could not be at the start?',
    trouble: 'The climax would play out the same with the character from chapter one.',
    at: turnPoint([0.175, 0.031, 0.525], TILT),
    links: [{ to: 'theme', rel: 'see also' }],
    feel: feel(0.35, 0.4, -0.45, 0.7, 0.15, 'rise', 'A slow climb out of a lie toward the truth: warm, rounded and rising.'),
    variants: [{ label: 'Arc', items: [
      it('arc-positive', 'Positive change', 'Believes a lie, overcomes it, and the new truth sets her free. Maya learns that speaking up is safer than silence.'),
      it('arc-flat', 'Flat', 'Already believes the truth and holds on to it; she uses it to change the world around her.'),
      it('arc-disillusionment', 'Disillusionment', 'Overcomes the lie, but the truth she finds is tragic.'),
      it('arc-fall', 'Fall', 'Clings to the lie, rejects the truth and ends up believing a worse lie.'),
      it('arc-corruption', 'Corruption', 'Sees the truth, rejects it, and embraces the lie to get what she wants.'),
    ] }],
  },
  {
    id: 'character-web', term: 'Character web', aka: ['supporting cast', 'ensemble', 'foils'], kind: 'concept', pattern: 'pattern-ecology',
    plain: 'The cast as a network. Truby compares every character with the hero and with each other, so the differences become clear.',
    does: 'Makes each character sharper, because the others show what they are not.',
    ask: 'How does each character push on the hero?',
    trouble: 'Two characters do the same job; you could merge them.',
    at: turnPoint([r4((S.hero[0] + S.ally[0]) / 2), 0.031, r4((S.hero[1] + S.ally[1]) / 2)], TILT),
    links: [{ to: 'subplots', rel: 'see also' }],
    look: { parts: webParts },
  },

  // ---- plot and structure
  {
    id: 'plot-structure', term: 'Plot and structure', aka: ['plot', 'story structure', 'what happens'], kind: 'part',
    plain: 'The events and the order you show them in. Forster: a story asks “and then?”, a plot asks “why?”.',
    does: 'Controls what the reader learns when, so tension builds toward the climax.',
    ask: 'Does each event cause the next one?',
    trouble: 'A saggy middle: events follow “and then” instead of “therefore” or “but”.',
    at: rootAt([0.495, -0.1, 0]),
    children: ['mice-threads', 'turning-points', 'try-fail-loop', 'story-shape', 'scenes', 'structure-models', 'subplots', 'causality'],
    links: [{ to: 'reverse-outline', rel: 'measured by' }],
    look: lookOf(plotF),
  },
  {
    id: 'mice-threads', term: 'MICE threads', aka: ['MICE quotient', 'story threads', 'nested plots'], kind: 'concept', pattern: 'pattern-nested-units',
    plain: 'Four kinds of story thread: milieu, inquiry, character and event. Each opens and closes, and threads nest like Russian dolls.',
    does: 'Tells you how each thread must end, and that inner threads close before outer ones.',
    ask: 'Which thread did I open first, and does the ending close it?',
    trouble: 'The ending answers the wrong question, so the book feels unfinished.',
    at: plotF.at(80, 27),
    look: lookOf(miceF),
    variants: [{ label: 'Thread', items: [
      it('milieu', 'Milieu', 'Starts when the character enters a place and ends when she leaves it.'),
      it('inquiry', 'Inquiry', 'Starts with a question and ends when it is answered. Who wrote the list?', { svg: { threads: C.mice(1) } }),
      it('character', 'Character', 'Starts with a character unhappy with who she is; ends when she changes or accepts herself.', { svg: { threads: C.mice(2) } }),
      it('event', 'Event', 'Starts when the normal order breaks; ends when an old or new order is set.', { svg: { threads: C.mice(3) } }),
    ] }],
  },
  {
    id: 'turning-points', term: 'Turning points', aka: ['plot points', 'key moments', 'beats'], kind: 'concept',
    plain: 'Moments that turn the story in a new direction. Each one pushes the protagonist past her habits into new ground.',
    does: 'Gives the plot its shape: the reader feels it change gear at each turn.',
    ask: 'What turns here, and what can she no longer do?',
    trouble: 'Things happen, but nothing changes the direction of the story.',
    at: plotF.at(240, 150),
    children: ['inciting-incident', 'climax'],
    look: lookOf(roadF),
  },
  {
    id: 'inciting-incident', term: 'Inciting incident', aka: ['catalyst', 'the call', 'trigger'], kind: 'concept',
    plain: 'The first major event. It upsets the balance of the protagonist’s life and starts the story: Maya finds her name on the list.',
    does: 'Starts the story’s engine and raises the dramatic question.',
    ask: 'What breaks the normal world, and can she ignore it?',
    range: 'About 10% (Brody) to 12% (Weiland) of the way through',
    trouble: 'Chapters of backstory before anything happens.',
    at: roadF.at(118, 122),
    links: [{ to: 'dramatic-question', rel: 'see also' }],
    look: { parts: clipParts },
    deeper: 'The first plot point: the moment she commits and the old life closes behind her.',
  },
  {
    id: 'climax', term: 'Climax', aka: ['final showdown', 'the big moment'], kind: 'concept',
    plain: 'The protagonist’s active answer to the story’s last crisis. It shows who she really is under pressure.',
    does: 'Answers the dramatic question and pays off the main promises.',
    ask: 'Does she win or lose because of a choice she makes?',
    range: 'Starts about 90% of the way through (Weiland)',
    trouble: 'Luck, or another character, solves the problem for her.',
    at: roadF.at(342, 52),
    links: [{ to: 'controlling-idea', rel: 'see also' }],
    look: lookOf(climaxF),
    deeper: 'Resolution: the last scenes, which show the result of her choice.',
  },
  {
    id: 'try-fail-loop', term: 'Try-fail cycle', aka: ['yes-but, no-and', 'complications'], kind: 'loop', pattern: 'pattern-boosting-engine',
    plain: 'The character tries to solve a problem and fails; the failure creates the next problem. Two variants: “yes, but” and “no, and”.',
    does: 'Drives the middle of the book: each failure raises the stakes for the next try.',
    ask: 'How does this failure make things worse?',
    trouble: 'Each problem is solved cleanly, so the middle sags.',
    at: plotF.at(316, 112),
    loop: { type: 'reinforcing', through: ['scene-goal', 'scene-conflict', 'scene-disaster', 'stakes'] },
  },
  {
    id: 'story-shape', term: 'Story shape', aka: ['emotional arc', 'shape of a story'], kind: 'concept',
    plain: 'The rise and fall of fortune across a story. A study of 1,327 Project Gutenberg stories found six basic shapes.',
    does: 'Lets you see the whole book’s emotional curve at once and choose where it turns.',
    ask: 'Where is the lowest point, and where does fortune turn?',
    trouble: 'The line stays flat: nothing gets much better or much worse.',
    at: plotF.at(440, 150),
    plot: { x: 'Story time (%)', y: 'Fortune (schematic, −1 to +1)', series: [
      { name: 'Rags to riches', item: 'rags-to-riches', points: [[0, -0.6], [25, -0.3], [50, 0], [75, 0.35], [100, 0.7]] },
      { name: 'Tragedy', item: 'tragedy', points: [[0, 0.7], [25, 0.4], [50, 0.05], [75, -0.3], [100, -0.7]] },
      { name: 'Man in a hole', item: 'man-in-a-hole', points: [[0, 0.4], [25, -0.2], [50, -0.6], [75, -0.1], [100, 0.5]] },
      { name: 'Icarus', item: 'icarus', points: [[0, -0.4], [25, 0.2], [50, 0.6], [75, 0.1], [100, -0.5]] },
      { name: 'Cinderella', item: 'cinderella', points: [[0, -0.5], [20, 0.3], [45, 0.5], [65, -0.3], [85, 0.3], [100, 0.7]] },
      { name: 'Oedipus', item: 'oedipus', points: [[0, 0.5], [20, -0.3], [45, -0.5], [65, 0.3], [85, -0.3], [100, -0.7]] },
    ] },
    variants: [{ label: 'Shape', items: [
      it('rags-to-riches', 'Rags to riches', 'A steady rise.'),
      it('tragedy', 'Tragedy (riches to rags)', 'A steady fall.'),
      it('man-in-a-hole', 'Man in a hole', 'A fall, then a rise: get into trouble, then get out. The Last Hour has this shape.'),
      it('icarus', 'Icarus', 'A rise, then a fall.'),
      it('cinderella', 'Cinderella', 'Rise, fall, rise.'),
      it('oedipus', 'Oedipus', 'Fall, rise, fall.'),
    ] }],
  },
  {
    id: 'scenes', term: 'Scenes', aka: ['scene', 'building blocks', 'chapter beats'], kind: 'part', pattern: 'pattern-nested-units',
    plain: 'The building blocks of the story. Each scene shows a change that matters; many small changes build the big arc.',
    does: 'Moves the story one step at a time, in front of the reader.',
    ask: 'What changes between the start and the end of this scene?',
    trouble: 'Scenes of people talking in which nothing turns.',
    at: plotF.at(288, 295),
    children: ['scene-sequel-cycle', 'value-shift'],
    look: { parts: sceneParts },
  },
  {
    id: 'scene-sequel-cycle', term: 'Scene and sequel', aka: ['goal, conflict, disaster', 'reaction, dilemma, decision'], kind: 'loop',
    plain: 'Ingermanson’s two-part rhythm. A scene runs goal, conflict, disaster; a sequel runs reaction, dilemma, decision, and the decision sets the next goal.',
    does: 'Alternates action and recovery, so each scene feeds the next.',
    ask: 'What is her goal at the start of this scene, and what does she decide at the end of the sequel?',
    trouble: 'Scenes stop with no consequence, or the character never pauses to react.',
    at: scenePt(60, 106),
    children: STEPS.map((s) => s[0]),
    loop: { type: 'cycle', through: STEPS.map((s) => s[0]) },
  },
  ...STEPS.map(([id, n, kind, label, icon, text]) => ({ id, look: stepLook(n, kind, label, icon, text), ...{
    'scene-goal': { term: 'Goal', aka: ['scene goal'], kind: 'concept', plain: 'What the viewpoint character wants in this scene. It must be specific and clear: get the list to security.', does: 'Gives the scene a direction and a test of success.', ask: 'What exactly does she want in the next ten pages?', trouble: 'A vague wish, such as “she wants to feel safe”.' },
    'scene-conflict': { term: 'Conflict', aka: ['obstacles'], kind: 'concept', plain: 'The obstacles between the character and her goal. Voss’s guard blocks the stairs.', does: 'Makes the reader doubt the outcome.', ask: 'What stands in her way, and does it get harder?', trouble: 'She reaches her goal without a fight.', deeper: 'Motivation-reaction units: the beat-by-beat pattern inside a scene, as Ingermanson teaches it.' },
    'scene-disaster': { term: 'Disaster', aka: ['setback'], kind: 'concept', plain: 'She fails to reach the goal, or wins and makes things worse. Security is in on it.', does: 'Keeps tension high. Ingermanson warns that simply granting the goal ends the tension.', ask: 'How does this scene end worse than it began?', trouble: 'Scenes end with the problem solved and nothing to pull the reader on.' },
    'sequel-reaction': { term: 'Reaction', aka: ['emotional response'], kind: 'concept', plain: 'Her emotional follow-through after the disaster. Panic: she hides and shakes.', does: 'Lets the reader feel the blow and catch their breath.', ask: 'How does the disaster hit her?', trouble: 'Nothing seems to affect her.' },
    'sequel-dilemma': { term: 'Dilemma', aka: ['no good options'], kind: 'concept', plain: 'A situation with no good options. Run home, or stay and warn bed four?', does: 'Shows her values through what she must give up.', ask: 'What will each option cost her?', trouble: 'The right choice is obvious, so there is no suspense.' },
    'sequel-decision': { term: 'Decision', aka: ['new goal'], kind: 'concept', plain: 'She chooses what to do. The decision makes her proactive again and sets the next goal: she stays.', does: 'Restarts the cycle with a new scene goal.', ask: 'What will she do now?', trouble: 'Things happen to her; she never decides.' },
  }[id] })),
  {
    id: 'value-shift', term: 'Value shift', aka: ['scene turn', 'polarity shift'], kind: 'measure',
    plain: 'The change in a value-charged condition, such as safe to hunted, between the start and the end of a scene. McKee calls a scene that does not turn a nonevent.',
    does: 'Checks that each scene earns its place.',
    ask: 'What value is at stake, and is it plus or minus at each end of the scene?',
    range: 'Plus to minus, or minus to plus; the same charge at both ends means no turn',
    trouble: 'A scene starts and ends in the same place.',
    at: scenePt(250, 166),
    look: lookOf(valueF),
  },
  {
    id: 'structure-models', term: 'Structure models', aka: ['story templates', 'beat sheets', 'three-act structure'], kind: 'knob',
    plain: 'Maps of where the big turns usually fall. Each model shows the pattern at a different level.',
    does: 'Give you a checklist to diagnose a draft: what is missing, early or late.',
    ask: 'Which model fits my genre, and where do my turns fall on it?',
    trouble: 'A formula followed beat by beat; the story feels mechanical.',
    at: plotF.at(240, 268),
    links: [{ to: 'planning', rel: 'see also' }],
    look: lookOf(modelsF),
    variants: [{ label: 'Model', items: [
      it('model-three-act', 'Three acts', 'Setup to about 25%, the long middle to 75% with a midpoint near 50%, then the end. Weiland notes the timing is flexible.'),
      it('model-save-the-cat', 'Save the Cat! beats', 'Brody’s 15 beats at set points: Catalyst 10%, Break into Two 20%, Midpoint 50%, All Is Lost 75%, Final Image 99–100%.', { svg: { diagram: C.MODELS['model-save-the-cat'] } }),
      it('model-heros-journey', 'Hero’s journey', 'Vogler’s 12 stages, from the ordinary world to the return with the elixir. A flexible skeleton, not a formula.', { svg: { diagram: C.MODELS['model-heros-journey'] } }),
      it('model-seven-point', 'Seven-point structure', 'Wells: hook, plot turn 1, pinch 1, midpoint, pinch 2, plot turn 2, resolution. Plan backward from the resolution.', { svg: { diagram: C.MODELS['model-seven-point'] } }),
      it('model-freytag', 'Freytag’s pyramid', 'Five parts for drama, from introduction to catastrophe, with three crises on the way.', { svg: { diagram: C.MODELS['model-freytag'] } }),
      it('model-kishotenketsu', 'Kishōtenketsu', 'Four parts: introduction, development, twist and conclusion. The third part, ten, brings an unexpected turn.', { svg: { diagram: C.MODELS['model-kishotenketsu'] } }),
    ] }],
  },
  {
    id: 'subplots', term: 'Subplots', aka: ['B story', 'side plots'], kind: 'part',
    plain: 'Smaller stories woven round the main plot. In Save the Cat the B story starts near 22% and brings in people who help the hero learn the theme.',
    does: 'Adds depth and lets the middle breathe without stopping the main plot.',
    ask: 'How does this subplot bear on the main question or the theme?',
    trouble: 'You could cut a subplot and nothing in the main plot would change.',
    at: plotF.at(110, 228),
    links: [{ to: 'character-web', rel: 'see also' }],
    look: lookOf(braidF),
  },
  {
    id: 'causality', term: 'Cause and effect', aka: ['therefore and but', 'causality'], kind: 'concept',
    plain: 'Each event happens because of the one before. Parker and Stone: join beats with “therefore” or “but”, never “and then”.',
    does: 'Makes events feel surprising and inevitable at the same time.',
    ask: 'Can I join these scenes with “therefore” or “but” instead of “and then”?',
    trouble: 'Scenes could swap places and nothing would change.',
    at: plotF.at(98, 196),
    links: [{ to: 'try-fail-loop', rel: 'see also' }],
    look: { parts: dominoLook },
    deeper: 'Reversals: how a well-placed “but” turns a scene against the character.',
  },

  // ---- setting
  {
    id: 'setting', term: 'Setting', aka: ['world', 'place', 'world-building'], kind: 'part',
    plain: 'Where and when the story happens. It is more than a backdrop: it sets the mood and can work with or against the characters.',
    does: 'Grounds the story in a concrete world and puts pressure on the characters.',
    ask: 'How does this place make her problem worse?',
    trouble: 'Characters talk in a white room; the story could happen anywhere.',
    at: rootAt([0.246, -0.428, 0.104]),
    children: ['place-and-time', 'world-rules', 'exposition'],
    look: lookOf(mapF),
  },
  {
    id: 'place-and-time', term: 'Place and time', aka: ['where and when', 'time period'], kind: 'part',
    plain: 'The physical place and the moment in time. Here: St Jude’s hospital in Boston, 2 a.m. on a snowy January night.',
    does: 'Limits what is possible and gives the senses something to work with.',
    ask: 'Why must this story happen here, and now?',
    trouble: 'The reader cannot tell where the characters are or what time it is.',
    at: mapF.at(170, 78),
    look: lookOf(postF),
  },
  {
    id: 'world-rules', term: 'World rules', aka: ['magic system', 'how the world works', 'world-building rules'], kind: 'concept',
    plain: 'The limits of how the story world works, from magic to hospital security. Sanderson’s second law: “Limitations > Powers”.',
    does: 'Lets the reader predict what is possible, so solutions feel earned.',
    ask: 'Does the reader understand this rule before it solves a problem?',
    range: 'Sanderson’s three laws of magic',
    trouble: 'A new power or rule appears just in time to save the hero.',
    at: mapF.at(357, 66),
    links: [{ to: 'promise-payoff', rel: 'see also' }],
    look: { parts: binderParts },
  },
  {
    id: 'exposition', term: 'Exposition', aka: ['backstory', 'info-dump', 'incluing'], kind: 'process',
    plain: 'How the reader learns background facts. Jo Walton’s “incluing” scatters small pieces through the text instead of one info-dump.',
    does: 'Gives the reader what they need to understand, without stopping the story.',
    ask: 'Does the reader need this now, and can they pick it up from action?',
    trouble: 'Pages of history before the story starts, or characters telling each other what they both know.',
    at: mapF.at(206, 296),
    links: [{ to: 'pacing', rel: 'see also' }],
    look: { parts: expoParts },
  },

  // ---- narration
  {
    id: 'narration', term: 'Narration', aka: ['point of view', 'POV', 'the narrator'], kind: 'part',
    plain: 'Who tells the story and from where. Burroway puts it as three questions: who speaks, who sees, and how much they know.',
    does: 'Controls what the reader can know and how close they feel to the characters.',
    ask: 'Whose eyes, and how close to them?',
    trouble: 'The reader is unsure whose head they are in.',
    at: rootAt([0.074, -0.674, 0.104]),
    children: ['tense', 'narrative-voice', 'pov-person', 'psychic-distance', 'pov-character'],
    look: { parts: camParts },
  },
  {
    id: 'tense', term: 'Tense', aka: ['past tense', 'present tense'], kind: 'knob',
    plain: 'Whether the narration says “she ran” or “she runs”. Le Guin notes that both are made up: fictional past tense is not really past.',
    does: 'Sets how time feels: past tense can range across time, present tense keeps the reader in the moment.',
    ask: 'Do I need to move freely in time, or hold the reader in the moment?',
    trouble: 'The tense slips between paragraphs by accident.',
    at: camAt([-0.27, 0.47, 0.05]),
    look: { parts: tenseParts },
    variants: [{ label: 'Tense', items: [
      it('tense-past', 'Past', '“Maya ran.” Gives range: looking back, summary, and easy moves between earlier and later events.'),
      it('tense-present', 'Present', '“Maya runs.” Immediate, but Pullman argues that for a whole book it narrows what the prose can do.', { look: { parts: lever(1) }, svg: { face: C.tenseFace(1, TENSE_SAMPLES[1]) } }),
    ] }],
  },
  {
    id: 'narrative-voice', term: 'Narrative voice', aka: ['voice', 'style', 'tone'], kind: 'concept',
    plain: 'The personality you hear in the narration: word choice, rhythm, attitude and how much the narrator comments. It is not the same as the author’s own voice.',
    does: 'Colours every line: the same event reads differently in a different voice.',
    ask: 'If I hid the name, would you know this narrator?',
    trouble: 'The prose is correct but could be anyone’s.',
    at: camAt([0.42, 0.33, 0.2]),
    feel: feel(0.4, 0.5, 0, 0.65, 0.55, 'pulse', 'Voice is a texture: a grain you hear in every line, like the timbre of a person’s speech.'),
  },
  {
    id: 'pov-person', term: 'Narrative person', aka: ['first person', 'third person', 'POV type'], kind: 'knob',
    plain: 'The grammar of the narrator: I, you, or she. Third person splits further by how much the narrator can know.',
    does: 'Sets the reader’s access: one mind, or many.',
    ask: 'Who tells this story, and why that person?',
    trouble: 'The narrator knows things they could not know.',
    at: camAt([0.8, 0, 0]),
    look: { parts: personParts },
    variants: [{ label: 'Person', items: [
      it('person-first', 'First person', '“I”. A character tells the story, from the centre of the action or from the side.'),
      it('person-second', 'Second person', '“You”. Rare and intimate, but it tells readers what they do and feel.', { look: { parts: knob(110) }, svg: { face: C.personFace(1, PERSON_SAMPLES[1]) } }),
      it('person-third-limited', 'Third person limited', '“She”. An outside view plus one character’s thoughts. A common choice, and the one The Last Hour uses.', { look: { parts: knob(70) }, svg: { face: C.personFace(2, PERSON_SAMPLES[2]) } }),
      it('person-third-omniscient', 'Third person omniscient', 'The narrator moves freely in time and space, enters many minds, and knows what no character knows.', { look: { parts: knob(30) }, svg: { face: C.personFace(3, PERSON_SAMPLES[3]) } }),
    ] }],
  },
  {
    id: 'psychic-distance', term: 'Psychic distance', aka: ['narrative distance', 'how close the camera is'], kind: 'knob',
    plain: 'How close the reader stands to a character’s mind. Gardner gives five steps, from a wide historical view to raw sensation.',
    does: 'Controls intimacy: close for strong feeling, far for overview and speed.',
    ask: 'How close should we be right now, and why change?',
    range: '5 levels (Gardner), from far to close',
    trouble: 'Sudden jumps in distance jar the reader.',
    at: camAt([0.55, -0.1, 0.1]),
    links: [{ to: 'immersion', rel: 'controls' }],
    look: { parts: distanceParts },
    deeper: 'Free indirect style: third-person narration that slips into the character’s own words.',
    variants: [{ label: 'Level', items: GARDNER.map((g, i) => it(`distance-${i + 1}`, `Level ${i + 1}${i === 0 ? ' (far)' : i === 4 ? ' (close)' : ''}`, `“${g}”`, i ? { look: { parts: pdCap(i + 1) }, svg: { face: C.distanceFace(i + 1, g) } } : {})) }],
  },
  {
    id: 'pov-character', term: 'Viewpoint character', aka: ['POV character', 'whose head we are in'], kind: 'knob',
    plain: 'The character whose senses and thoughts the reader shares in a scene. Switching heads inside a scene is called head-hopping.',
    does: 'Decides what the reader can see, know and feel in each scene.',
    ask: 'Whose head gives this scene the most pressure?',
    trouble: 'Head-hopping: the reader is unsure whose thoughts they are reading.',
    at: camAt([-0.68, 0.12, 0.1]),
    links: [{ to: 'information-gap', rel: 'controls' }],
    look: lookOf(povCharF),
  },

  // ---- prose
  {
    id: 'prose', term: 'Prose', aka: ['writing style', 'the words on the page', 'sentences'], kind: 'part',
    plain: 'The actual words and sentences. Lee Child says good prose “trips forward”: each line pulls the reader into the next.',
    does: 'Turns the plan into an experience, line by line.',
    ask: 'Does each sentence earn its place and pull toward the next?',
    trouble: 'Readers skim; descriptions blur together.',
    at: rootAt([0, -0.745, 0.06]),
    children: ['significant-detail', 'show-and-tell', 'dialogue', 'sentence-rhythm'],
    look: lookOf(proseF),
  },
  {
    id: 'significant-detail', term: 'Significant detail', aka: ['concrete detail', 'telling detail'], kind: 'concept',
    plain: 'A concrete detail appeals to the senses. Burroway: it becomes significant when it also suggests an idea or a judgement.',
    does: 'Lets readers infer the meaning themselves, so it sticks.',
    ask: 'What one detail shows what this room, or this person, is really like?',
    trouble: 'Lists of generic details: “a nice room with a table and chairs”.',
    at: proseF.at(95, 202),
    look: { parts: detailParts },
  },
  {
    id: 'show-and-tell', term: 'Showing and telling', aka: ['show, don’t tell', 'scene and summary'], kind: 'knob',
    plain: 'Scene shows events moment by moment; summary tells them in compressed form. Burroway treats both as ways to manage time.',
    does: 'Sets the speed of the story: scene slows it down, summary moves fast.',
    ask: 'Does this moment deserve a scene, or one line of summary?',
    trouble: 'Big moments are summarised and small ones are dramatised.',
    at: proseF.at(260, 100),
    links: [{ to: 'pacing', rel: 'controls' }],
    look: { parts: showTellParts },
    variants: [{ label: 'Mode', items: [
      it('mode-scene', 'Show (scene)', 'Moment by moment, with action, dialogue and reaction. Immediate and dramatic.'),
      it('mode-summary', 'Tell (summary)', 'Compresses time. Useful for background, routine and repeated events, and for moving fast.', { look: { parts: stCap(1) }, svg: { face: C.showTellFace(1) } }),
    ] }],
  },
  {
    id: 'dialogue', term: 'Dialogue', aka: ['speech', 'conversation'], kind: 'part',
    plain: 'What characters say to each other. Burroway: good dialogue reveals character, gives information, creates conflict and moves the story on.',
    does: 'Becomes action when the conversation can change something.',
    ask: 'What does each speaker want from this exchange?',
    trouble: 'Characters tell each other things they both already know.',
    at: proseF.at(250, 360),
    children: ['dialogue-tags'],
    look: lookOf(dialogueF),
  },
  {
    id: 'dialogue-tags', term: 'Dialogue tags', aka: ['said', 'speech tags', 'attributions'], kind: 'knob',
    plain: 'The words that show who is speaking. Leonard’s rules: never use a verb other than “said”, and never add an adverb to it.',
    does: 'Keep the reader oriented without drawing attention to themselves.',
    ask: 'Would the reader know who spoke without this tag?',
    trouble: 'He hissed menacingly; she exclaimed brightly.',
    at: dialogueF.at(...C.DIALOGUE_SAID),
    look: lookOf(tagsF),
    deeper: 'Subtext: what characters mean but do not say.',
    variants: [{ label: 'Tag', items: [
      it('tag-said', '“said”', 'Neutral and almost invisible. Its only job is to name the speaker.'),
      it('tag-beat', 'Action beat', 'A small action names the speaker and adds meaning: He smiled. “Go home.”', { svg: { tags: C.tags(1) } }),
      it('tag-none', 'No tag', 'When the speaker is already clear, no tag is needed.', { svg: { tags: C.tags(2) } }),
      it('tag-adverb', 'Adverb tag', '“He hissed menacingly.” Leonard’s rule 4 forbids it: let the words carry the feeling.', { svg: { tags: C.tags(3) } }),
    ] }],
  },
  {
    id: 'sentence-rhythm', term: 'Sentence rhythm', aka: ['sentence variety', 'flow', 'cadence'], kind: 'knob',
    plain: 'The pattern of long and short sentences. Provost shows that sentences of the same length become monotonous.',
    does: 'Keeps prose alive to the ear and steers the reader’s speed.',
    ask: 'Read it aloud: where does it drone?',
    range: 'A mix of short, medium and long sentences',
    trouble: 'Every sentence has the same length and shape.',
    at: proseF.at(120, 270),
    links: [{ to: 'pacing', rel: 'see also' }],
    look: lookOf(rhythmF),
  },

  // ---- theme
  {
    id: 'theme', term: 'Theme', aka: ['what it’s about', 'meaning', 'message'], kind: 'concept',
    plain: 'What the story is about beneath the events. Burroway: it grows out of setting, action, thought and repeated details, not out of a stated moral.',
    does: 'Ties the parts together and gives the ending its meaning.',
    ask: 'What does the ending say about how to live?',
    trouble: 'A message preached in dialogue, or an ending that contradicts the rest.',
    at: rootAt([-0.5, -0.3, 0]),
    children: ['controlling-idea', 'motif'],
    feel: feel(0.2, 0.15, 0.6, 0.55, 0.1, 'settle', 'Theme sits deep and still under the plot; you feel its weight more than you see it.'),
  },
  {
    id: 'controlling-idea', term: 'Controlling idea', aka: ['theme statement', 'value plus cause'], kind: 'concept',
    plain: 'McKee’s one-sentence theme: the final value plus its cause. Here: justice wins because one person stops keeping quiet.',
    does: 'Tells you which scenes belong: each one argues for or against it.',
    ask: 'What value wins at the end, and what causes it?',
    trouble: 'The climax proves something different from what the book set out to explore.',
    feel: feel(0.6, 0.3, 0.45, 0.5, 0.05, 'settle', 'One clear claim, cut sharp and heavy enough to hold the book down.'),
  },
  {
    id: 'motif', term: 'Motif', aka: ['recurring image', 'symbol'], kind: 'concept',
    plain: 'A recurring image, object, word or sound that gains meaning by repetition. Here: the ward lights flicker, go dark, then burn steady.',
    does: 'Carries the theme without stating it.',
    ask: 'What image keeps coming back, and does it change?',
    trouble: 'A symbol appears once and is never used again.',
    look: lookOf(motifF),
  },

  // ---- reader experience
  {
    id: 'reader-experience', term: 'Reader experience', aka: ['page-turner', 'engagement', 'suspense'], kind: 'concept',
    plain: 'What happens in the reader’s head: questions, worry, surprise and relief. Maass: put tension on every page, so readers read every word.',
    does: 'Is the real product: the book exists to create this experience.',
    ask: 'Where would a reader put the book down?',
    trouble: 'Readers skim, or put the book down and never come back.',
    at: rootAt([-0.26, 0.98, 0.03]),
    children: ['immersion', 'question-loop', 'hooks', 'tension-release', 'information-gap', 'pacing'],
    links: [{ to: 'beta-readers', rel: 'measured by' }],
    look: { parts: readerParts },
  },
  {
    id: 'immersion', term: 'Immersion', aka: ['the fictional dream', 'getting lost in a book'], kind: 'concept',
    plain: 'The feeling of living inside the story. Gardner calls good fiction a “vivid and continuous dream”.',
    does: 'Lets the story work on the reader without them noticing the words.',
    ask: 'What could wake the reader from the dream here?',
    trouble: 'Head-hopping, confusing exposition or a jarring word pulls the reader out.',
    at: pagePt(90, 60, -1, 10),
    feel: feel(0.1, 0.2, 0.1, 0.6, 0.05, 'drift', 'A vivid, continuous dream: soft, smooth and easy to sink into.'),
  },
  {
    id: 'question-loop', term: 'Question loop', aka: ['open loops', 'curiosity', 'ask and delay'], kind: 'loop', pattern: 'pattern-setup-payoff',
    plain: 'Lee Child’s method: ask a question, then delay the answer. He uses it for the whole book, each chapter, each page and each sentence.',
    does: 'Keeps the reader reading at every scale.',
    ask: 'Which question is open right now?',
    trouble: 'All the questions are answered at once, and the reader stops.',
    at: pagePt(320, 24, 1, -40),
    loop: { type: 'cycle', through: ['hooks', 'information-gap', 'promise-payoff'] },
  },
  {
    id: 'hooks', term: 'Hooks', aka: ['opening line', 'cliffhanger', 'chapter ending'], kind: 'concept',
    plain: 'Lines that pull the reader on. Lee Child: a first line makes a promise, and a good chapter ending satisfies without satiating.',
    does: 'Carries the reader across the gaps between chapters and sittings.',
    ask: 'Why would someone read the next page right now?',
    trouble: 'Chapters end at natural rest points, so readers rest.',
    at: pagePt(170, 372, 1, -40),
    links: [{ to: 'dramatic-question', rel: 'see also' }],
    look: lookOf(hooksF),
  },
  {
    id: 'tension-release', term: 'Tension and release', aka: ['rise and fall', 'breathing room'], kind: 'loop', pattern: 'pattern-braking-engine',
    plain: 'Scenes raise tension; sequels let the character and the reader recover before the next push.',
    does: 'Alternates pressure and recovery, so the next peak can rise again.',
    ask: 'Where does the reader get to breathe?',
    trouble: 'Non-stop action that numbs, or long calm stretches that lose the reader.',
    at: [0, -0.72, 0.035],
    loop: { type: 'balancing', through: ['scene-conflict', 'stakes', 'sequel-reaction', 'pacing'] },
  },
  {
    id: 'information-gap', term: 'Information gap', aka: ['suspense', 'mystery', 'dramatic irony'], kind: 'concept',
    plain: 'The gap between what the reader knows and what the characters know. Hitchcock: show the bomb under the table and you get suspense, not just a short surprise.',
    does: 'Creates the reader’s main feelings: curiosity, worry and surprise.',
    ask: 'Who knows what, right now?',
    trouble: 'The reader always knows exactly what the characters know.',
    at: pagePt(170, 361, -1, 10),
    look: { parts: gapParts },
    variants: [{ label: 'Gap', items: [
      it('gap-suspense', 'Suspense', 'The reader knows about the bomb; the characters do not. Hitchcock: fifteen minutes of suspense.'),
      it('gap-mystery', 'Mystery', 'The reader knows something is hidden, but not what. Who, what or why stays unknown.', { look: { parts: parcel } }),
      it('gap-surprise', 'Surprise', 'Nobody knows until it happens: a short shock, Hitchcock’s fifteen seconds.', { look: { parts: cloth } }),
    ] }],
  },
  {
    id: 'pacing', term: 'Pacing', aka: ['pace', 'speed', 'tempo'], kind: 'knob',
    plain: 'How fast the story seems to move. Lee Child: “Write the slow stuff fast and the fast stuff slow.”',
    does: 'Matches reading time to importance: big moments get space, routine gets a line.',
    ask: 'Am I spending pages on routine and lines on the big moments?',
    trouble: 'The climax is over in a paragraph; the drive to work takes a page.',
    at: pagePt(170, 228, -1, 10),
    look: { parts: [{ shape: 'plane', size: [0.9, 1.1], pos: [0, 0, 0], svg: C.metronome }] },
  },

  // ---- writing process
  {
    id: 'writing-process', term: 'Writing process', aka: ['how to write a book', 'workflow'], kind: 'process',
    plain: 'The work from idea to finished book. MIT’s writing guide names four stages: prewriting, drafting, revising and editing.',
    does: 'Turns an idea into a book through repeated passes, each with a different aim.',
    ask: 'Which stage am I in, and am I doing the right kind of work for it?',
    trouble: 'Polishing chapter one forever; the draft never gets finished.',
    at: rootAt([0.1, 0.2, -0.11]),
    children: ['planning', 'drafting', 'publishing-path', 'word-count', 'editing-levels', 'revision-loop'],
    look: { parts: deskParts },
  },
  {
    id: 'planning', term: 'Planning', aka: ['plotting', 'outlining', 'prewriting'], kind: 'process',
    plain: 'Deciding what happens before you draft. George R. R. Martin splits writers into architects, who plan, and gardeners, who discover the story as they write.',
    does: 'Cuts dead ends from the draft or, for gardeners, gives just enough seed to start.',
    ask: 'How much must I know before I start?',
    trouble: 'Endless world-building and no draft, or a draft that stalls with nowhere to go.',
    at: deskAt([-0.55, 0.62, -0.47]),
    children: ['outline'],
    look: { parts: notebookParts },
    variants: [{ label: 'Style', items: [
      it('plan-architect', 'Architect', 'Plans the structure, the events and the characters’ moves before drafting.'),
      it('plan-gardener', 'Gardener', 'Starts from a seed and lets the story grow while writing. The characters may surprise the writer.', { svg: { plan: C.PLANS.gardener } }),
      it('plan-snowflake', 'Snowflake method', 'Ingermanson: one sentence, then a paragraph with three disasters and an ending, then character summaries, longer synopses and a scene list.', { svg: { plan: C.PLANS.snowflake } }),
    ] }],
  },
  {
    id: 'outline', term: 'Outline', aka: ['plot outline', 'corkboard', 'scene list'], kind: 'part',
    plain: 'The plan of scenes in order, often on index cards. Scrivener’s corkboard shows each scene as a card you can move.',
    does: 'Lets you see and rearrange the whole story before or during drafting.',
    ask: 'Does each card cause the next one?',
    trouble: 'Cards full of events but no change, and gaps where the middle should be.',
    at: turnPoint([0.305, 0, 0.004], [-20, 0, 0]),
    look: { parts: corkParts },
  },
  {
    id: 'drafting', term: 'Drafting', aka: ['writing the first draft', 'getting it down'], kind: 'process',
    plain: 'Writing the story from start to end without stopping to perfect it. King: write with the door closed, rewrite with the door open.',
    does: 'Produces the raw material; you cannot revise a blank page.',
    ask: 'Am I writing forward, or rewriting chapter one again?',
    trouble: 'Stopping to edit each page and never reaching the end.',
    at: deskAt([0.25, 0.3, -0.26]),
    children: ['first-draft', 'daily-word-target'],
    look: { parts: laptopParts },
  },
  {
    id: 'first-draft', term: 'First draft', aka: ['rough draft', 'draft zero'], kind: 'part',
    plain: 'The first complete version of the story. Anne Lamott: all good writers write bad first drafts.',
    does: 'Shows what the story is really about, so you can fix it.',
    ask: 'Is it finished, start to end, even if it is bad?',
    trouble: 'Treating the first draft as the book.',
    at: lapPt(200, 160),
    look: { parts: firstDraftParts },
  },
  {
    id: 'daily-word-target', term: 'Daily word target', aka: ['word count goal', 'writing pace', 'quota'], kind: 'knob',
    plain: 'How many words you write each day. Known paces run from Hemingway’s few hundred words to Trollope’s 250 words every quarter of an hour.',
    does: 'Sets how long the draft takes: 90,000 words at 1,000 a day is three months.',
    ask: 'What pace can I keep every day for months?',
    range: '500–2,500 words a day',
    trouble: 'A big target that you miss, then give up.',
    at: lapPt(432, 66),
    links: [{ to: 'word-count', rel: 'raises' }],
    look: lookOf(calF),
    plot: { x: 'Days of writing', y: 'Words written (thousands)', series: [500, 1000, 1667, 2000, 2500].map((r) => ({ name: `${r.toLocaleString('en-GB')} a day`, item: `pace-${r}`, points: [[0, 0], [r4(90000 / r), 90]] })) },
    variants: [{ label: 'Pace', items: [
      it('pace-500', '500 a day', 'Hemingway’s recorded days include 450, 575 and 512 words.'),
      it('pace-1000', '1,000 a day', 'Jack London, 1899: “a thousand words per day, six days per week”.', { svg: { cal: C.calendar(1000) } }),
      it('pace-1667', '1,667 a day', 'NaNoWriMo: a 50,000-word draft in 30 days.', { svg: { cal: C.calendar(1667) } }),
      it('pace-2000', '2,000 a day', 'Stephen King’s daily target, about ten pages.', { svg: { cal: C.calendar(2000) } }),
      it('pace-2500', '2,500 a day', 'Trollope trained himself to write 250 words every quarter of an hour, so 2,500 words took about two and a half hours.', { svg: { cal: C.calendar(2500) } }),
    ] }],
  },
  {
    id: 'publishing-path', term: 'Publishing path', aka: ['getting published', 'traditional vs self-publishing'], kind: 'process',
    plain: 'How the manuscript becomes a book in readers’ hands. Friedman’s chart splits the paths by who pays and who controls the rights.',
    does: 'Decides the money, control and reach of the finished book.',
    ask: 'Who pays, who keeps the rights, and how does the book reach readers?',
    trouble: 'Paying for a contract with no clear way to readers.',
    at: deskAt([0.88, 0.2, -0.26]),
    look: lookOf(pubF),
    variants: [{ label: 'Path', items: [
      it('path-traditional', 'Traditional', 'Usually through an agent. The publisher pays to produce and distribute the book and pays an advance and royalties; you give up some control.'),
      it('path-self', 'Self-publishing', 'You are the publisher: you pay the costs, hire the help, and keep the rights and control.', { svg: { flow: C.PUBLISH.self } }),
      it('path-hybrid', 'Hybrid', 'The publisher’s name goes on the book, but you pay for publication. Packages and costs vary widely.', { svg: { flow: C.PUBLISH.hybrid } }),
    ] }],
  },
  {
    id: 'word-count', term: 'Word count', aka: ['length', 'how long is a novel'], kind: 'measure',
    plain: 'The length of the manuscript in words, the unit agents and publishers use. The expected length depends on the category.',
    does: 'Checks the book against what its market expects.',
    ask: 'Is this length normal for my category?',
    range: 'Literary, mystery and thriller 80,000–89,999 words; SF and fantasy 100,000–115,000',
    trouble: 'A 150,000-word debut thriller, or a 50,000-word epic fantasy.',
    at: deskAt([0.25, 0.07, -0.21]),
    look: lookOf(barF),
    plot: { x: 'Words (thousands)', y: 'Category (1 middle grade … 4 SF and fantasy)', series: [
      ...NORMS.map(([id, name, g, , row]) => ({ name: `${name} ${g[0] / 1000}–${Math.round(g[1] / 1000)}k`, item: id, points: [[g[0] / 1000, row], [g[1] / 1000, row]] })),
      { name: 'This draft, 86.6k', points: [[86.6, 0], [86.6, 4.5]] },
    ] },
    variants: [
      { label: 'Category norm', items: NORMS.map(([id, name, g, label], i) => it(id, name, `${g[0].toLocaleString('en-GB')}–${g[1].toLocaleString('en-GB')} words in Writer’s Digest’s guide.`, i ? { svg: { bar: C.wordBar(g, label) } } : {})) },
      { label: 'Length class (SFWA)', items: [
        it('length-short-story', 'Short story', 'Under 7,500 words.'),
        it('length-novelette', 'Novelette', '7,500 to 17,499 words.'),
        it('length-novella', 'Novella', '17,500 to 39,999 words.'),
        it('length-novel', 'Novel', '40,000 words or more.'),
      ] },
    ],
  },
  {
    id: 'editing-levels', term: 'Editing levels', aka: ['developmental edit', 'line edit', 'copyedit', 'proofread'], kind: 'process',
    plain: 'Editing in passes from big to small: content and structure, then sentences, then correctness, then typos on the final pages.',
    does: 'Fixes each kind of problem at the right time, so nothing is polished twice.',
    ask: 'Which level does this draft need now?',
    trouble: 'Paying for a proofread while the plot still has holes.',
    at: deskAt([-0.12, 0.02, 0.34]),
    children: ['final-manuscript'],
    look: lookOf(editF),
    variants: [{ label: 'Level', items: [
      it('edit-developmental', 'Developmental edit', 'Content and structure: plot, pacing, character arcs and point of view.'),
      it('edit-line', 'Line edit', 'Sentences and paragraphs: style, clarity, flow, voice and word choice.', { svg: { page: C.EDITS.line } }),
      it('edit-copy', 'Copyedit', 'Correctness and consistency: grammar, spelling, usage and the style sheet.', { svg: { page: C.EDITS.copy } }),
      it('edit-proof', 'Proofread', 'The last check of the typeset pages for typos and layout errors.', { svg: { page: C.EDITS.proof } }),
    ] }],
  },
  {
    id: 'final-manuscript', term: 'Final manuscript', aka: ['submission draft', 'clean copy'], kind: 'part',
    plain: 'The edited text in standard format for agents or publishers. Shunn’s format: 12-point Times New Roman, double-spaced, one-inch margins.',
    does: 'Lets professionals read and estimate the book without distraction.',
    ask: 'Does it follow the format this agent or publisher asks for?',
    trouble: 'Fancy fonts, single spacing, or no contact details.',
    at: editF.at(200, 480),
    look: { parts: finalParts },
  },
  {
    id: 'revision-loop', term: 'Revision loop', aka: ['rewriting', 'second draft', 'revising'], kind: 'loop', pattern: 'pattern-build-test-learn',
    plain: 'Read the draft as a reader, test it on others, rewrite, and repeat. King: the first draft is written with the door closed; revision opens it.',
    does: 'Turns a draft into a book, one round at a time.',
    ask: 'What is the biggest problem in this draft?',
    trouble: 'Fixing commas while the plot is broken.',
    at: deskAt([-0.62, 0.15, 0.12]),
    children: ['reverse-outline', 'beta-readers', 'revision-pass'],
    loop: { type: 'cycle', through: ['reverse-outline', 'beta-readers', 'revision-pass', 'revised-draft'] },
  },
  {
    id: 'reverse-outline', term: 'Reverse outline', aka: ['after-the-fact outline'], kind: 'process',
    plain: 'An outline made after drafting: one line per part for its main point. Gaps, repeats and weak order show up at once.',
    does: 'Makes the draft’s real structure visible.',
    ask: 'What does each chapter change?',
    trouble: 'Chapters where nothing changes, or the same beat twice.',
    look: lookOf(reverseF),
  },
  {
    id: 'beta-readers', term: 'Beta readers', aka: ['test readers', 'critique partners'], kind: 'process',
    plain: 'People who read the draft before publication and report how it felt. Friedman’s questions ask where they lost interest and whether the ending satisfied them.',
    does: 'Measures the reader experience directly, which the writer cannot do alone.',
    ask: 'Where did you stop wanting to read?',
    trouble: 'Only friends, who say “I loved it”.',
    look: lookOf(betaF),
  },
  {
    id: 'revision-pass', term: 'Revision pass', aka: ['rewrite', 'cutting'], kind: 'process',
    plain: 'A full pass through the draft to fix one kind of problem. King’s rule of thumb: 2nd draft = 1st draft − 10%.',
    does: 'Cuts what does not serve the story and strengthens what does.',
    ask: 'What can I cut without losing anything?',
    range: 'About 10% shorter (King)',
    trouble: 'The draft gets longer with every pass.',
    children: ['revised-draft'],
    links: [{ to: 'word-count', rel: 'lowers' }],
    look: { parts: revisionParts },
  },
  {
    id: 'revised-draft', term: 'Revised draft', aka: ['second draft'], kind: 'part',
    plain: 'The draft after a revision pass: leaner, and closer to the story you meant to tell.',
    does: 'Feeds the next round of revision, or goes on to editing.',
    ask: 'Is it ready for an editor, or does it need another round?',
    trouble: 'The problems readers flagged are still there.',
    at: revF.at(352, 440),
    look: { parts: revisedParts },
  },

  // ---- patterns
  { id: 'pattern-setup-payoff', term: 'Setup and payoff', aka: ['promise and payoff', 'Chekhov’s gun'], kind: 'pattern',
    plain: 'Something placed early is used later. The early placement creates an expectation; the later use fulfils it in a way that still surprises.',
    ask: 'What did I set up, and where does it pay off?',
    feel: feel(0.3, 0.4, 0, 0.7, 0.15, 'orbit', 'Something sent out early travels round and comes back to close the loop.') },
  { id: 'pattern-boosting-engine', term: 'Boosting engine', aka: ['reinforcing loop', 'vicious circle', 'snowball'], kind: 'pattern',
    plain: 'A loop in which each change pushes further in the same direction, so it speeds up.',
    ask: 'What feeds itself here, and what will stop it?',
    feel: feel(0.75, 0.85, -0.4, 0.8, 0.3, 'rise', 'Each turn feeds the next, so it climbs faster and faster.') },
  { id: 'pattern-braking-engine', term: 'Braking engine', aka: ['balancing loop', 'thermostat'], kind: 'pattern',
    plain: 'A loop that opposes change and pulls the system back toward a level.',
    ask: 'What pushes back here, and toward what level?',
    feel: feel(0.25, 0.3, 0.4, 0.3, 0.1, 'settle', 'Each push meets a counter-push, so it sinks back to rest.') },
  { id: 'pattern-ecology', term: 'Ecology', aka: ['web of relations', 'ecosystem'], kind: 'pattern',
    plain: 'Parts that depend on each other, directly or indirectly, so a change in one changes the rest.',
    ask: 'If I remove this part, what else changes?',
    feel: feel(0.4, 0.45, 0, 0.55, 0.6, 'orbit', 'Many small bodies circle and lean on each other; move one and the rest shift.') },
  { id: 'pattern-nested-units', term: 'Nested units', aka: ['Russian dolls', 'units inside units'], kind: 'pattern',
    plain: 'Small units sit inside bigger units of the same kind, like beats in scenes and scenes in acts. Each unit follows the same rules.',
    ask: 'Does this unit open and close like the one around it?',
    feel: feel(0.2, 0.2, 0.3, 0.5, 0.2, 'pulse', 'Shells inside shells: each one opens and closes round the next.') },
  { id: 'pattern-build-test-learn', term: 'Build, test, learn', aka: ['PDSA cycle', 'Deming wheel', 'iteration'], kind: 'pattern',
    plain: 'Plan a change, do it, study the result, then act on what you learned. Repeat.',
    ask: 'What did the last round teach me?',
    feel: feel(0.45, 0.55, -0.1, 0.5, 0.2, 'spin', 'A wheel that turns again and again, a little better each time.') },
]

// ---------------------------------------------------------------- sources
const IDS = new Set(nodes.map((n) => n.id))
const SRC = {}
const put = (key, list) => {
  const have = (SRC[key] ??= [])
  for (const s of list) if (!have.some((h) => h.url === s.url && (h.page ?? '') === (s.page ?? ''))) have.push(Object.fromEntries(Object.entries(s).filter(([, v]) => v != null && v !== '')))
}
for (const f of ['src-structure.json', 'src-craft.json', 'src-process.json']) {
  const d = JSON.parse(fs.readFileSync(dataURL(f), 'utf8'))
  for (const n of d.nodes ?? d) {
    const segs = n.id.split('/')
    const key = IDS.has(segs.at(-1)) ? segs.at(-1) : segs.slice(-2).join('/')
    if (n.unverified || !n.sources?.length) continue
    put(key, n.sources)
  }
}
const craft = JSON.parse(fs.readFileSync(dataURL('src-craft.json'), 'utf8')).nodes
put('exposition', craft.find((n) => n.id === 'exposition').sources.filter((s) => s.url.includes('reactormag')))
put('characterization/method-interpretation', SRC['characterization/method-direct'] ?? [])
put('plot-structure', (SRC.causality ?? []).filter((s) => s.url.includes('gutenberg')))
put('planning/plan-snowflake', [{ label: 'Randy Ingermanson, “The Snowflake Method For Designing A Novel”', url: 'https://www.advancedfictionwriting.com/articles/snowflake-method/', kind: 'practitioner', page: 'Steps 1–10' }])
put('word-count/norm-adult', [...(SRC['word-count/norm-literary'] ?? []), ...(SRC['word-count/norm-mystery-thriller'] ?? [])])
put('pattern-build-test-learn', [{ label: 'The W. Edwards Deming Institute, PDSA Cycle', url: 'https://deming.org/explore/pdsa/', kind: 'reference' }])
put('pattern-ecology', [{ label: 'National Geographic Education, Ecosystem', url: 'https://education.nationalgeographic.org/resource/ecosystem/', kind: 'neighbour' }, ...(SRC['character-web'] ?? [])])
put('novel', [{ label: 'Chuck Sambuchino, Word Count for Novels and Children’s Books (Writer’s Digest)', url: 'https://www.writersdigest.com/whats-new/word-count-for-novels-and-childrens-books-the-definitive-post', kind: 'practitioner', page: 'recommended word-count table', flag: 'limited page extraction' }])

const missing = []
for (const n of nodes) {
  if (SRC[n.id]?.length) n.sources = SRC[n.id]
  else { n.unverified = 'No opened source backs this node yet.'; missing.push(n.id) }
  for (const cat of n.variants ?? []) for (const item of cat.items) {
    const k = `${n.id}/${item.id}`
    if (SRC[k]?.length) item.sources = SRC[k]
    else { item.unverified = 'No opened source backs this item yet.'; missing.push(k) }
  }
}

// ---------------------------------------------------------------- field
const field = {
  title: 'Fiction book writing',
  prompt: 'I want to write a novel',
  summary: 'A novel is a long invented story in prose, built to keep a reader turning pages. Writers think in layers: a premise with real stakes, characters who want things, a plot of scenes that turn on cause and effect, and narration and prose that control what the reader knows and feels. Under all of it sits the reader’s experience: questions opened, answers delayed, promises kept. Most of the work is a loop: plan, draft fast, then revise against how real readers respond. Structure models and rules of thumb are tools for diagnosing a draft, not forms to fill in.',
  root: 'novel',
  nodes,
  assembly: [
    { title: 'Find the premise', text: 'Start with a what-if. Pin it down in one sentence, name the question the ending must answer, and decide what failure would cost.', adds: ['logline', 'dramatic-question', 'stakes', 'promise-payoff'], makes: 'premise' },
    { title: 'Plan the story', text: 'Grow the premise into people, a place and a chain of events. Put the scenes on cards and arrange them, as much or as little as suits you.', adds: ['premise', 'characters', 'setting', 'plot-structure', 'planning'], makes: 'outline' },
    { title: 'Draft', text: 'Choose who tells the story and how close we stand, then write it through to the end at a steady daily pace. Do not stop to polish.', adds: ['outline', 'narration', 'prose', 'drafting', 'daily-word-target'], makes: 'first-draft' },
    { title: 'Revise', text: 'Read the draft as a reader, test it on beta readers, find the theme you actually wrote, and cut it to length. Repeat until the big problems are gone.', adds: ['first-draft', 'revision-loop', 'reader-experience', 'theme', 'word-count'], makes: 'revised-draft' },
    { title: 'Edit', text: 'Edit from big to small: structure, then sentences, then consistency, then typos. Format the result as a standard manuscript.', adds: ['revised-draft', 'editing-levels'], makes: 'final-manuscript' },
    { title: 'Publish', text: 'Choose a path to readers. The manuscript becomes a paperback, a hardback, an e-book or an audiobook.', adds: ['final-manuscript', 'publishing-path'], makes: 'novel' },
  ],
}
fs.writeFileSync(OUT, JSON.stringify(field, null, 1))
console.log(`wrote ${OUT}: ${nodes.length} nodes`)
if (missing.length) console.log('unverified:', missing.join(', '))
