// SVG cards for child nodes. Each export documents its viewBox size.
import { SANS, SERIF, MONO, svg, T, TR, wrap, bars, rng, arc, polar, r4 } from './lib.mjs'

export const INK = '#2a2530', PAPER = '#fbf7ee', CARDW = '#fbf9f2', RED = '#c0392b', BLUE = '#2f6db0', GREEN = '#3f8f5a'
export const GOLD = '#e8c26b', DARK = '#1b2a36', LIGHT = '#ece6dc', MUTED = '#8a8190', RULE = '#a8c7e6', PEN = '#1f3a68', TEAL = '#6cc4b8'

export const tick = (x, y, s = 14, c = GREEN, w = 3) => `<path d="M${x} ${y} l${r4(s * 0.35)} ${r4(s * 0.38)} l${r4(s * 0.65)} ${r4(-s * 0.8)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
export const cross = (x, y, s = 12, c = RED, w = 3) => `<path d="M${x} ${r4(y - s / 2)} l${s} ${s} M${x + s} ${r4(y - s / 2)} l${-s} ${s}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`
const head = (x, y, ang, s, c) => {
  const a = (ang * Math.PI) / 180
  const p = (da, r) => `${r4(x + r * Math.cos(a + da))} ${r4(y + r * Math.sin(a + da))}`
  return `<path d="M${x} ${y} L${p(2.6, s)} L${p(-2.6, s)} Z" fill="${c}"/>`
}
const arrow = (x1, y1, x2, y2, c, w = 3, s = 10) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>` + head(x2, y2, (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI, s, c)

const indexBase = (W, H, header, rules = []) =>
  `<rect width="${W}" height="${H}" fill="${CARDW}"/><line x1="0" y1="48" x2="${W}" y2="48" stroke="#e06666" stroke-width="2"/>` +
  rules.map((y) => `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${RULE}" stroke-width="1.2"/>`).join('') +
  T(18, 34, header, { size: 18, weight: 700, fill: RED, ls: 3 })
const hand = (x, y, s, o = {}) => T(x, y, s, { size: 18, font: SERIF, style: 'italic', fill: PEN, ...o })

// ---------- premise (400 x 240) ----------
export const premise = svg(400, 240, indexBase(400, 240, 'PREMISE', [78, 108, 138, 168, 198, 228]) +
  `<g transform="rotate(-8 336 27)"><rect x="286" y="12" width="100" height="30" rx="4" fill="none" stroke="${BLUE}" stroke-width="2.5"/>${T(336, 33, 'THRILLER', { size: 15, weight: 700, fill: BLUE, anchor: 'middle', ls: 2 })}</g>` +
  ['What if a night nurse found her own', 'name on a list of patients who will', 'die before dawn, and had until 6 a.m.', 'to prove who wrote it?'].map((l, i) => hand(18, 74 + i * 30, l)).join('') +
  `<path d="M18 141 q7 -4 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0" fill="none" stroke="${RED}" stroke-width="2.2"/>` +
  `<circle cx="352" cy="194" r="26" fill="none" stroke="${RED}" stroke-width="3"/>` + T(352, 207, '?', { size: 36, weight: 700, fill: RED, anchor: 'middle', font: SERIF }))

// ---------- logline (400 x 240) ----------
export const logline = svg(400, 240, indexBase(400, 240, 'LOGLINE', [86, 116]) +
  hand(18, 82, 'A nurse must expose the doctor who', { size: 19 }) + hand(18, 112, 'put her name on a death list.', { size: 19 }) +
  T(18, 161, 'WORDS', { size: 12, weight: 700, fill: MUTED, ls: 2 }) +
  `<rect x="80" y="149" width="300" height="16" rx="3" fill="#ece7dc"/><rect x="260" y="149" width="120" height="16" rx="3" fill="#f3d1cc"/><rect x="80" y="149" width="168" height="16" rx="3" fill="${GREEN}"/>` +
  [0, 5, 10, 15, 20, 25].map((w) => `<line x1="${80 + w * 12}" y1="167" x2="${80 + w * 12}" y2="173" stroke="${MUTED}" stroke-width="1.5"/>` + T(80 + w * 12, 188, String(w), { size: 11, fill: MUTED, anchor: 'middle' })).join('') +
  `<line x1="260" y1="141" x2="260" y2="173" stroke="${RED}" stroke-width="2"/>` + T(266, 142, 'limit', { size: 11, fill: RED }) +
  T(360, 224, '14 words', { size: 17, weight: 700, fill: GREEN, anchor: 'end' }) + tick(366, 216, 16))

// ---------- stakes dial (360 x 300), k = highlighted kind of death ----------
const DEATHS = ['PHYSICAL', 'PROFESSIONAL', 'PSYCHOLOGICAL']
function deathIcon(k, x, y, c) {
  if (k === 0) return `<path d="M${x} ${y + 12} C${x - 20} ${y - 2} ${x - 14} ${y - 18} ${x} ${y - 8} C${x + 14} ${y - 18} ${x + 20} ${y - 2} ${x} ${y + 12} Z" fill="${c}"/>`
  if (k === 1) return `<rect x="${x - 12}" y="${y - 14}" width="24" height="30" rx="3" fill="${c}"/><rect x="${x - 5}" y="${y - 19}" width="10" height="7" rx="2" fill="${c}"/><circle cx="${x}" cy="${y - 3}" r="5" fill="#22252c"/><line x1="${x - 7}" y1="${y + 8}" x2="${x + 7}" y2="${y + 8}" stroke="#22252c" stroke-width="2.5"/>`
  return `<circle cx="${x}" cy="${y - 2}" r="14" fill="${c}"/><path d="M${x - 3} ${y - 16} l5 7 l-5 5 l6 6 l-3 9" fill="none" stroke="#22252c" stroke-width="2.5"/>`
}
export function stakes(k) {
  const cx = 180, cy = 184
  let s = `<rect width="360" height="300" rx="18" fill="#22252c"/>` + T(180, 34, 'STAKES', { size: 18, weight: 700, fill: GOLD, anchor: 'middle', ls: 4 })
  s += [[180, 124, '#4f9a5f'], [122, 62, '#d9a441'], [60, 0, RED]].map(([a1, a2, c]) => `<path d="${arc(cx, cy, 112, a1, a2)}" fill="none" stroke="${c}" stroke-width="22"/>`).join('')
  s += T(68, 210, 'LOW', { size: 12, weight: 700, fill: '#c9c4bb', anchor: 'middle' }) + T(292, 210, 'HIGH', { size: 12, weight: 700, fill: '#c9c4bb', anchor: 'middle' })
  const [nx, ny] = polar(cx, cy, 96, 34)
  s += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#f4f1ea" stroke-width="5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="10" fill="#f4f1ea"/>`
  s += DEATHS.map((name, i) => {
    const x = 64 + i * 116, on = i === k
    return (on ? `<circle cx="${x}" cy="244" r="24" fill="${GOLD}"/>` : '') + deathIcon(i, x, 244, on ? '#22252c' : '#7d8590') + T(x, 288, name, { size: 11, weight: 700, fill: on ? GOLD : '#8f97a3', anchor: 'middle', ls: 1 })
  }).join('')
  return svg(360, 300, s)
}

// ---------- characters board (400 x 400), seen from above ----------
export const SPOTS = { hero: [174, 265], antag: [316, 174], ally: [62, 236], mentor: [112, 96] }
export const charactersBoard = (() => {
  const { hero, antag, ally, mentor } = SPOTS
  const line = (a, b, c, w, dash = '') => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
  return svg(400, 400, `<circle cx="200" cy="200" r="199" fill="#6f5034"/><circle cx="200" cy="200" r="186" fill="#8d6a48" stroke="#5e432b" stroke-width="3"/>` +
    line(ally, mentor, '#efe2c4', 3, '9 7') + line(antag, mentor, '#efe2c4', 3, '9 7') + line(hero, ally, '#efe2c4', 5) + line(hero, mentor, '#efe2c4', 5) + line(hero, antag, '#e0453a', 7) +
    Object.values(SPOTS).map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="30" ry="30" fill="#5e432b" opacity="0.55"/>`).join('') +
    `<path d="M186 300 C 210 352, 262 362, 306 330" fill="none" stroke="${GOLD}" stroke-width="6" stroke-dasharray="14 9" stroke-linecap="round"/>` + head(318, 321, -36, 20, GOLD) +
    T(150, 334, 'LIE', { size: 20, weight: 700, fill: GOLD, anchor: 'middle' }) + T(332, 300, 'TRUTH', { size: 20, weight: 700, fill: GOLD, anchor: 'middle' }))
})()

// ---------- speech bubble (200 x 110) ----------
export const bubble = svg(200, 110, `<path d="M14 6 h172 a10 10 0 0 1 10 10 v54 a10 10 0 0 1 -10 10 h-118 l-28 24 l6 -24 h-32 a10 10 0 0 1 -10 -10 v-54 a10 10 0 0 1 10 -10 z" fill="#ffffff" stroke="${INK}" stroke-width="2.5"/>` +
  T(100, 42, '“I’m fine.”', { size: 26, font: SERIF, anchor: 'middle' }) + T(100, 68, '(she isn’t)', { size: 15, font: SERIF, style: 'italic', fill: MUTED, anchor: 'middle' }))

// ---------- character sheets (400 x 520) ----------
function sheet({ dark, tag, name, role, job, figure, sections, sliders, foot }) {
  const bg = dark ? '#1e1a20' : '#fbf8f0', band = dark ? '#5c1a24' : '#2c3e50', text = dark ? '#ece6ea' : INK, label = dark ? '#b9a9b4' : '#8a7f70'
  let s = `<rect width="400" height="520" fill="${bg}"/><rect width="400" height="66" fill="${band}"/>` + T(20, 24, tag, { size: 12, weight: 700, fill: dark ? '#f0b3b3' : GOLD, ls: 3 }) + T(20, 54, name, { size: 27, font: SERIF, weight: 700, fill: '#ffffff' })
  s += `<rect x="20" y="82" width="96" height="112" fill="${dark ? '#2c2530' : '#efe2c8'}" stroke="${dark ? '#5c1a24' : '#c9b48e'}" stroke-width="2"/><circle cx="68" cy="124" r="22" fill="${figure}"/><path d="M28 194 Q68 136 108 194 Z" fill="${figure}"/>`
  if (dark) s += `<rect x="54" y="118" width="12" height="7" rx="2" fill="none" stroke="#f0b3b3" stroke-width="2"/><rect x="71" y="118" width="12" height="7" rx="2" fill="none" stroke="#f0b3b3" stroke-width="2"/>`
  s += T(134, 100, 'ROLE', { size: 11, weight: 700, fill: label, ls: 2 }) + T(134, 120, role, { size: 17, font: SERIF, fill: text })
  s += T(134, 150, 'JOB', { size: 11, weight: 700, fill: label, ls: 2 }) + T(134, 170, job, { size: 17, font: SERIF, fill: text })
  let y = 226
  for (const [lab, col, val] of sections) {
    s += T(20, y, lab, { size: 11, weight: 700, fill: col, ls: 2 })
    wrap(val, 44).forEach((l, i) => (s += T(20, y + 21 + i * 20, l, { size: 16, font: SERIF, fill: text })))
    y += 21 + wrap(val, 44).length * 20 + 12
  }
  if (sliders) {
    s += `<line x1="20" y1="${y - 6}" x2="380" y2="${y - 6}" stroke="#d8cfbe" stroke-width="1.5"/>`
    y += 14
    for (const [lab, v, col] of sliders) {
      s += T(20, y + 4, lab, { size: 11, weight: 700, fill: label, ls: 1.5 }) + `<rect x="150" y="${y - 5}" width="220" height="8" rx="4" fill="#e2dccd"/><rect x="150" y="${y - 5}" width="${22 * v}" height="8" rx="4" fill="${col}"/><circle cx="${150 + 22 * v}" cy="${y - 1}" r="8" fill="#ffffff" stroke="${col}" stroke-width="3"/>`
      y += 28
    }
  }
  if (foot) s += T(200, 504, foot, { size: 13, font: SERIF, style: 'italic', fill: label, anchor: 'middle' })
  return svg(400, 520, s)
}
export const SLIDERS = [['LIKABILITY', 7, '#e2a13b'], ['PROACTIVITY', 3, '#3f73b5'], ['COMPETENCE', 8, GREEN]]
export const protagonist = sheet({ tag: 'CHARACTER SHEET', name: 'Maya Cole, 34', role: 'Protagonist', job: 'Night-shift nurse', figure: '#e2a13b',
  sections: [['WANT (OUTER GOAL)', RED, 'Keep her head down and finish the shift.'], ['NEED (INNER GOAL)', GREEN, 'Speak up, even when it costs her.'], ['THE LIE SHE BELIEVES', '#7a4fa0', '“If I stay quiet, I stay safe.”']],
  sliders: SLIDERS })
export const antagonist = sheet({ dark: true, tag: 'OPPONENT', name: 'Dr Adrian Voss', role: 'Antagonist', job: 'Hospital director', figure: '#8e2430',
  sections: [['WANTS', '#e06666', 'A full ward and low costs, whatever it takes.'], ['WHY HE THINKS HE IS RIGHT', '#e8a87c', '“Someone has to decide who gets a bed.”'], ['STRENGTH', '#c9a0dc', 'Power, money, and everyone’s silence.'], ['WEAK SPOT', '#8fc1e3', 'His plan only works if the staff stay quiet.']],
  foot: 'He mirrors Maya: both rely on silence.' })

// ---------- mixing-desk face for the character sliders (400 x 284) ----------
export const FADER_X = [80, 200, 320]
export const faders = svg(400, 284, `<rect width="400" height="284" rx="12" fill="#1d2026"/>` + T(200, 28, 'SANDERSON’S SLIDERS', { size: 14, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 }) +
  FADER_X.map((x) => `<rect x="${x - 5}" y="50" width="10" height="180" rx="5" fill="#0b0c0f"/>` + Array.from({ length: 11 }, (_, i) => `<line x1="${x - 26}" y1="${50 + i * 18}" x2="${x - 14}" y2="${50 + i * 18}" stroke="#6b6f7a" stroke-width="${i % 5 ? 1 : 2}"/>`).join('')).join('') +
  T(36, 55, '10', { size: 11, fill: '#9aa0aa', anchor: 'end' }) + T(36, 145, '5', { size: 11, fill: '#9aa0aa', anchor: 'end' }) + T(36, 235, '0', { size: 11, fill: '#9aa0aa', anchor: 'end' }) +
  ['LIKABILITY', 'PROACTIVITY', 'COMPETENCE'].map((l, i) => T(FADER_X[i], 262, l, { size: 13, weight: 700, fill: '#e9e6df', anchor: 'middle', ls: 1 })).join(''))

// ---------- character web board (400 x 400): five pawns on a ring ----------
export const WEB = [['HERO', '#e2a13b'], ['RIVAL', '#8e2430'], ['FOIL', '#7d5ba6'], ['MENTOR', '#8ea37f'], ['ALLY', '#3f73b5']]
export const webSpots = WEB.map((_, k) => {
  const a = ((90 + 72 * k) * Math.PI) / 180
  return [r4(200 + 129 * Math.cos(a)), r4(200 + 129 * Math.sin(a))]
})
export const webBoard = (() => {
  const P = webSpots
  const rel = [[0, 1, '#e0453a', 6], [0, 4, '#6fa3e0', 5], [0, 3, GOLD, 5], [0, 2, '#b994e6', 4, '10 7'], [1, 2, '#efe2c4', 2.5], [2, 3, '#efe2c4', 2.5], [3, 4, '#efe2c4', 2.5], [4, 1, '#efe2c4', 2.5, '8 6'], [1, 3, '#efe2c4', 2, '6 6'], [2, 4, '#efe2c4', 2, '6 6']]
  return svg(400, 400, `<circle cx="200" cy="200" r="199" fill="#6f5034"/><circle cx="200" cy="200" r="186" fill="#8d6a48" stroke="#5e432b" stroke-width="3"/>` +
    rel.map(([a, b, c, w, d]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${d ? ` stroke-dasharray="${d}"` : ''}/>`).join('') +
    P.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="27" fill="#5e432b" opacity="0.6"/>`).join('') +
    WEB.map(([l], k) => {
      const [x, y] = P[k], w = l.length * 13 + 16
      return `<rect x="${r4(x - w / 2)}" y="${r4(y + 34)}" width="${w}" height="26" rx="6" fill="#4a3522" opacity="0.9"/>` + T(x, r4(y + 54), l, { size: 17, weight: 700, fill: '#f6ecd6', anchor: 'middle' })
    }).join(''))
})()

// ---------- characterization page (400 x 512), k = highlighted method ----------
export const METHODS = [
  ['APPEARANCE', '#fde68a', '#a16207', ['Maya wore scrubs two sizes too big,', 'sleeves rolled past the elbow.']],
  ['SPEECH', '#bfdbfe', '#1d4ed8', ['“I’m fine,” she told the charge nurse.']],
  ['ACTION', '#bbf7d0', '#15803d', ['She checked bed four’s drip twice,', 'then a third time.']],
  ['THOUGHT', '#fbcfe8', '#be185d', ['She was not fine. Someone had', 'written her name.']],
  ['AUTHORIAL INTERPRETATION', '#e5e7eb', '#4b5563', ['Maya had always been careful.']],
]
export function characterization(k) {
  let s = `<rect width="400" height="512" fill="${PAPER}"/>` + T(200, 44, 'CHAPTER 2', { size: 12, weight: 700, fill: '#8a7f70', anchor: 'middle', ls: 4 })
  let y = 92
  METHODS.forEach(([lab, hl, dk, lines], i) => {
    const on = i === k
    if (on) s += `<rect x="18" y="${y - 30}" width="364" height="${lines.length * 24 + 28}" rx="6" fill="${hl}"/>`
    s += T(30, y - 12, lab, { size: 10.5, weight: 700, fill: on ? dk : '#a59a8a', ls: 1.5 })
    lines.forEach((l, j) => (s += T(30, y + 10 + j * 24, l, { size: 17, font: SERIF, fill: on ? INK : '#6d6475' })))
    y += lines.length * 24 + 52
  })
  return svg(400, 512, s)
}

// ---------- plot and structure overview (480 x 320) ----------
export const plotStructure = (() => {
  let s = `<rect width="480" height="320" fill="#f7f3e8"/>`
  for (let x = 20; x <= 460; x += 20) s += `<line x1="${x}" y1="52" x2="${x}" y2="250" stroke="#e1e7ee" stroke-width="1"/>`
  for (let y = 60; y <= 250; y += 20) s += `<line x1="20" y1="${y}" x2="460" y2="${y}" stroke="#e1e7ee" stroke-width="1"/>`
  const br = [[20, 460, 8, 46, '#3f8f5a', 'M'], [70, 410, 13, 41, '#2f6db0', 'I'], [120, 360, 18, 36, '#7a4fa0', 'C'], [170, 310, 23, 31, RED, 'E']]
  s += br.map(([x1, x2, y1, y2, c, l]) => `<path d="M${x1 + 9} ${y1} H${x1} V${y2} H${x1 + 9} M${x2 - 9} ${y1} H${x2} V${y2} H${x2 - 9}" fill="none" stroke="${c}" stroke-width="3"/>` + T(x1 + 13, (y1 + y2) / 2 + 4, l, { size: 11, weight: 700, fill: c })).join('')
  s += `<line x1="20" y1="250" x2="460" y2="250" stroke="#5b5560" stroke-width="2"/><line x1="20" y1="52" x2="20" y2="250" stroke="#5b5560" stroke-width="2"/>`
  s += `<polyline points="20,244 100,236 180,226 260,214 340,206 420,198 460,232" fill="none" stroke="${BLUE}" stroke-width="2.5" stroke-dasharray="7 5"/>` + T(110, 254 - 26, 'B story', { size: 11, style: 'italic', fill: BLUE })
  s += `<polyline points="20,232 64,214 130,190 183,168 210,178 240,150 270,162 300,126 330,142 350,150 380,104 416,66 440,150 460,192" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`
  s += [[64, 214], [240, 150], [416, 66]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${RED}"/>`).join('')
  s += T(64, 202, 'inciting', { size: 11, fill: RED, anchor: 'middle' }) + T(240, 138, 'midpoint', { size: 11, fill: RED, anchor: 'middle' }) + T(416, 56, 'climax', { size: 11, weight: 700, fill: RED, anchor: 'middle' })
  s += T(98, 196, 'therefore', { size: 10.5, style: 'italic', fill: '#7a6f80', anchor: 'middle', rot: -20 }) + T(158, 170, 'but', { size: 10.5, style: 'italic', fill: '#7a6f80', anchor: 'middle', rot: -24 })
  s += T(316, 112, 'try–fail', { size: 11, style: 'italic', fill: '#7a6f80', anchor: 'middle' })
  s += `<rect x="20" y="258" width="110" height="20" fill="#ead9b9"/><rect x="130" y="258" width="220" height="20" fill="#d8e3cf"/><rect x="350" y="258" width="110" height="20" fill="#ebcac4"/>`
  s += T(75, 272, 'ACT I', { size: 11, weight: 700, fill: '#5b5560', anchor: 'middle', ls: 1 }) + T(240, 272, 'ACT II', { size: 11, weight: 700, fill: '#5b5560', anchor: 'middle', ls: 1 }) + T(405, 272, 'ACT III', { size: 11, weight: 700, fill: '#5b5560', anchor: 'middle', ls: 1 })
  for (let i = 0; i < 22; i++) s += `<rect x="${20 + i * 20}" y="286" width="16" height="18" rx="2" fill="${i === 13 ? BLUE : '#cfc7b8'}"/>`
  return svg(480, 320, s)
})()

// ---------- structure models (440 x 300), one diagram per model ----------
const dk = (s) => svg(440, 300, `<rect width="440" height="300" rx="16" fill="${DARK}"/>` + s)
const lab = (x, y, s, o = {}) => T(x, y, s, { size: 12, fill: '#e9e4da', anchor: 'middle', ...o })
export const MODELS = {
  'model-three-act': dk(T(220, 34, 'THREE ACTS', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 }) +
    `<rect x="20" y="120" width="100" height="70" fill="#3b5266"/><rect x="120" y="120" width="200" height="70" fill="#2f4456"/><rect x="320" y="120" width="100" height="70" fill="#3b5266"/>` +
    lab(70, 160, 'ACT I', { size: 15, weight: 700 }) + lab(220, 160, 'ACT II', { size: 15, weight: 700 }) + lab(370, 160, 'ACT III', { size: 15, weight: 700 }) +
    [[120, 'plot point 1', '25%'], [220, 'midpoint', '50%'], [320, 'plot point 2', '75%'], [380, 'climax', '~90%']].map(([x, a, b], i) => `<line x1="${x}" y1="${i % 2 ? 96 : 104}" x2="${x}" y2="120" stroke="${GOLD}" stroke-width="2.5"/><line x1="${x}" y1="190" x2="${x}" y2="206" stroke="${GOLD}" stroke-width="2.5"/><circle cx="${x}" cy="120" r="6" fill="${GOLD}"/>` + lab(x, i % 2 ? 84 : 92, a, { fill: GOLD, size: 11.5 }) + lab(x, 226, b, { size: 12, weight: 700 })).join('') +
    lab(220, 268, 'Weiland: setup to 25%, middle to 75%, then the end', { size: 12.5, fill: '#b9c2cc' })),
  'model-save-the-cat': dk(T(220, 34, 'SAVE THE CAT! BEATS', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 }) +
    `<line x1="20" y1="150" x2="420" y2="150" stroke="#e9e4da" stroke-width="3"/>` +
    [[0, 'Opening image 0–1%', 80, 'start'], [5, 'Theme stated 5%', 204, 'start'], [10, 'Catalyst 10%', 104, 'start'], [20, 'Break into 2 20%', 180, 'start'], [22, 'B story 22%', 128, 'start'], [50, 'Midpoint 50%', 128, 'middle'], [75, 'All is lost 75%', 180, 'middle'], [80, 'Break into 3 80%', 128, 'middle'], [99.5, 'Final image 99–100%', 104, 'end']].map(([p, n, y, anchor]) => {
      const x = r4(20 + p * 4), up = y < 150, tx = anchor === 'start' ? x - 4 : anchor === 'end' ? x + 4 : x
      return `<line x1="${x}" y1="150" x2="${x}" y2="${up ? y + 5 : y - 13}" stroke="${GOLD}" stroke-width="1.5"/><circle cx="${x}" cy="150" r="5" fill="${GOLD}"/>` + lab(tx, y, n, { size: 11, anchor })
    }).join('') +
    lab(220, 268, 'Brody: 15 beats, each at a set % of the book', { size: 12.5, fill: '#b9c2cc' })),
  'model-heros-journey': dk(T(220, 30, 'HERO’S JOURNEY (VOGLER)', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 2 }) +
    `<circle cx="220" cy="160" r="96" fill="none" stroke="#e9e4da" stroke-width="3"/><line x1="96" y1="160" x2="344" y2="160" stroke="${GOLD}" stroke-width="2" stroke-dasharray="6 5"/>` +
    lab(372, 156, 'threshold', { size: 10.5, fill: GOLD }) + lab(66, 120, 'ordinary', { size: 11, fill: '#b9c2cc' }) + lab(66, 206, 'special', { size: 11, fill: '#b9c2cc' }) +
    ['Ordinary world', 'Call', 'Refusal', 'Mentor', 'Threshold', 'Tests', 'Approach', 'Ordeal', 'Reward', 'Road back', 'Resurrection', 'Return'].map((n, i) => {
      const a = 90 - i * 30, [x, y] = polar(220, 160, 96, a), [tx, ty] = polar(220, 160, 120, a)
      return `<circle cx="${x}" cy="${y}" r="5" fill="${GOLD}"/>` + lab(tx, ty + 4, n, { size: 10.5, anchor: Math.abs(tx - 220) < 12 ? 'middle' : tx > 220 ? 'start' : 'end' })
    }).join('')),
  'model-seven-point': dk(T(220, 34, 'SEVEN-POINT STRUCTURE (WELLS)', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 2 }) +
    `<polyline points="40,236 100,200 160,214 220,150 280,168 340,110 400,70" fill="none" stroke="#e9e4da" stroke-width="3"/>` +
    [[40, 236, 'Hook'], [100, 200, 'Plot turn 1'], [160, 214, 'Pinch 1'], [220, 150, 'Midpoint'], [280, 168, 'Pinch 2'], [340, 110, 'Plot turn 2'], [400, 70, 'Resolution']].map(([x, y, n], i) => `<circle cx="${x}" cy="${y}" r="6" fill="${GOLD}"/>` + lab(x, i % 2 ? y + 26 : y - 14, n, { size: 11.5 })).join('') +
    lab(220, 276, 'Wells: plan backward from the resolution', { size: 12.5, fill: '#b9c2cc' })),
  'model-freytag': dk(T(220, 34, 'FREYTAG’S PYRAMID', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 }) +
    `<polyline points="30,230 120,230 220,80 320,230 410,230" fill="none" stroke="#e9e4da" stroke-width="3.5" stroke-linejoin="round"/>` +
    lab(75, 252, 'introduction') + lab(150, 160, 'rise', { anchor: 'end' }) + lab(220, 66, 'CLIMAX', { weight: 700, fill: GOLD }) + lab(292, 160, 'fall', { anchor: 'start' }) + lab(365, 252, 'catastrophe') +
    [[120, 230, 'exciting force'], [250, 125, 'tragic force'], [300, 200, 'last suspense']].map(([x, y, n]) => `<circle cx="${x}" cy="${y}" r="6" fill="${RED}"/>` + lab(x + 10, y - 10, n, { size: 10.5, fill: '#f0a59c', anchor: 'start' })).join('')),
  'model-kishotenketsu': dk(T(220, 34, 'KISHŌTENKETSU', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 }) +
    [['起', 'KI', 'introduction'], ['承', 'SHŌ', 'development'], ['転', 'TEN', 'twist'], ['結', 'KETSU', 'conclusion']].map(([k, r, n], i) => {
      const x = 22 + i * 102, tw = i === 2
      return `<rect x="${x}" y="70" width="90" height="150" rx="8" fill="${tw ? '#5a3a2a' : '#2f4456'}" stroke="${tw ? GOLD : 'none'}" stroke-width="3"/>` + T(x + 45, 132, k, { size: 44, fill: tw ? GOLD : '#e9e4da', anchor: 'middle', font: 'Noto Sans CJK JP, sans-serif' }) + lab(x + 45, 172, r, { size: 15, weight: 700 }) + lab(x + 45, 196, n, { size: 11.5, fill: '#b9c2cc' })
    }).join('') +
    lab(220, 262, 'Four parts; ten brings the unexpected turn', { size: 12.5, fill: '#b9c2cc' })),
}

// ---------- turning points road map (440 x 300) ----------
export const ROAD_PINS = [[118, 152, 'inciting incident', '~10%'], [252, 206, 'midpoint', '~50%'], [342, 82, 'climax', '~90%']]
export const turningPoints = (() => {
  const road = 'M-10 262 C 60 252, 80 160, 118 152 S 200 214, 252 206 S 300 96, 342 82 S 420 46, 450 40'
  let s = `<rect width="440" height="300" fill="#a9c48f"/><path d="M0 0 H440 V300 H0 Z" fill="none" stroke="#7f9a66" stroke-width="6"/>`
  s += `<circle cx="60" cy="70" r="26" fill="#8fb07a"/><circle cx="390" cy="230" r="34" fill="#8fb07a"/><circle cx="200" cy="80" r="18" fill="#8fb07a"/>`
  s += `<path d="${road}" fill="none" stroke="#5a5a5e" stroke-width="30" stroke-linecap="round"/><path d="${road}" fill="none" stroke="#f4e8b0" stroke-width="3" stroke-dasharray="12 10"/>`
  s += ROAD_PINS.map(([x, y, n, p]) => `<path d="M${x} ${y} c-14 -16 -16 -24 -16 -30 a16 16 0 0 1 32 0 c0 6 -2 14 -16 30 z" fill="${RED}" stroke="#7d1d14" stroke-width="2"/><circle cx="${x}" cy="${y - 30}" r="6" fill="#ffffff"/>` +
    `<rect x="${x - 62}" y="${y + 10}" width="124" height="38" rx="6" fill="#ffffff" opacity="0.92"/>` + T(x, y + 27, n, { size: 13, weight: 700, fill: INK, anchor: 'middle' }) + T(x, y + 43, p, { size: 12, fill: MUTED, anchor: 'middle' })).join('')
  return svg(440, 300, s)
})()

// ---------- inciting incident: the list on a clipboard (340 x 440) ----------
export const nightList = (() => {
  const rows = [['1', 'Okafor, J.'], ['2', 'Lindqvist, A.'], ['4', 'Reyes, T.'], ['7', 'Park, S.'], ['9', 'Brennan, M.'], ['staff', 'Cole, M.']]
  let s = `<rect width="340" height="440" fill="#fdfbf6"/>` + T(24, 46, 'WARD 6 · NIGHT LIST', { size: 18, weight: 700, fill: INK, ls: 1 }) + T(24, 72, 'by 06:00 — do not resuscitate', { size: 14, font: SERIF, style: 'italic', fill: '#6d6475' })
  s += `<line x1="24" y1="88" x2="316" y2="88" stroke="${INK}" stroke-width="2"/>`
  rows.forEach(([bed, n], i) => {
    const y = 126 + i * 46
    s += T(28, y, bed === 'staff' ? 'STAFF' : `Bed ${bed}`, { size: 14, weight: 700, fill: '#6d6475' }) + T(118, y, n, { size: 19, font: MONO, fill: INK }) + `<line x1="24" y1="${y + 14}" x2="316" y2="${y + 14}" stroke="#d9d2c4" stroke-width="1"/>`
  })
  s += `<ellipse cx="190" cy="352" rx="118" ry="24" fill="none" stroke="${RED}" stroke-width="3.5" transform="rotate(-3 190 352)"/>` + T(240, 412, 'that’s me?!', { size: 22, font: SERIF, style: 'italic', weight: 700, fill: RED, anchor: 'middle', rot: -4 })
  return svg(340, 440, s)
})()

// ---------- climax (440 x 300) ----------
export const climax = (() => {
  const pts = '30,250 70,236 100,242 140,214 170,222 210,190 240,200 270,164 300,176 330,128 356,140 384,52 404,150 420,200'
  let s = `<rect width="440" height="300" rx="16" fill="#141821"/>`
  s += `<line x1="30" y1="262" x2="420" y2="262" stroke="#5c6470" stroke-width="2"/>` + T(30, 284, '0%', { size: 12, fill: '#9aa3ad' }) + T(225, 284, '50%', { size: 12, fill: '#9aa3ad', anchor: 'middle' }) + T(420, 284, '100%', { size: 12, fill: '#9aa3ad', anchor: 'end' })
  s += `<line x1="381" y1="46" x2="381" y2="262" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="5 5"/>` + T(372, 250, '≈90%', { size: 12, weight: 700, fill: GOLD, anchor: 'end' })
  s += `<polyline points="${pts}" fill="none" stroke="#f4efe6" stroke-width="4" stroke-linejoin="round"/>`
  s += `<path d="M384 22 l7 18 l19 -5 l-13 14 l13 14 l-19 -4 l-7 18 l-6 -18 l-19 4 l13 -14 l-13 -14 l19 5 z" fill="${GOLD}"/>`
  s += T(330, 40, 'CLIMAX', { size: 18, weight: 700, fill: GOLD, anchor: 'end', ls: 3 }) + T(30, 40, 'the dramatic question', { size: 13, font: SERIF, style: 'italic', fill: '#c9c2b6' }) + T(30, 58, 'gets its answer', { size: 13, font: SERIF, style: 'italic', fill: '#c9c2b6' })
  return svg(440, 300, s)
})()

// ---------- subplots braid (400 x 400) ----------
export const braid = (() => {
  const strands = [['A', 'main plot', GOLD, 0], ['B', 'love story', '#e67fa0', 2.094], ['C', 'mentor', '#5cc1b5', 4.189]]
  const path = (ph) => {
    const p = []
    for (let x = 90; x <= 352; x += 4) p.push(`${x},${r4(196 + 64 * (1 - (x - 90) / 262) * Math.sin((x - 90) / 30 + ph))}`)
    return p.join(' ')
  }
  let s = `<rect width="400" height="400" rx="16" fill="${DARK}"/>` + T(200, 40, 'SUBPLOTS', { size: 16, weight: 700, fill: GOLD, anchor: 'middle', ls: 4 })
  s += strands.map(([, , c, ph]) => `<polyline points="${path(ph)}" fill="none" stroke="#0e1720" stroke-width="16" stroke-linecap="round"/><polyline points="${path(ph)}" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/>`).join('')
  s += `<circle cx="356" cy="196" r="16" fill="${GOLD}"/>` + T(356, 238, 'climax', { size: 13, weight: 700, fill: GOLD, anchor: 'middle' })
  s += strands.map(([l, n, c], i) => T(24, 300 + i * 30, l, { size: 18, weight: 700, fill: c }) + T(48, 300 + i * 30, n, { size: 16, fill: '#e9e4da' })).join('')
  s += T(24, 140, 'start', { size: 12, fill: '#9aa3ad' })
  return svg(400, 400, s)
})()

// ---------- MICE nesting (440 x 300), k = highlighted thread ----------
export const MICE = [['M', 'Milieu', 'enter a place', 'leave it', '#5fb37a'], ['I', 'Inquiry', 'a question', 'the answer', '#5b9bd5'], ['C', 'Character', 'unhappy with self', 'changed self', '#a77bd6'], ['E', 'Event', 'order breaks', 'new order', '#e06a5f']]
export function mice(k) {
  let s = `<rect width="440" height="300" rx="16" fill="${DARK}"/>` + T(220, 32, 'MICE THREADS', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 })
  MICE.forEach(([l, , , , c], i) => {
    const x1 = 30 + i * 34, x2 = 410 - i * 34, y1 = 52 + i * 14, y2 = 178 - i * 14, on = i === k, op = on || k < 0 ? 1 : 0.35
    s += `<path d="M${x1 + 14} ${y1} H${x1} V${y2} H${x1 + 14} M${x2 - 14} ${y1} H${x2} V${y2} H${x2 - 14}" fill="none" stroke="${c}" stroke-width="${on ? 6 : 4}" opacity="${op}"/>`
    s += T(x1 + 18, y1 + 16, l, { size: 14, weight: 700, fill: c, op }) + T(x2 - 18, y1 + 16, l, { size: 14, weight: 700, fill: c, anchor: 'end', op })
  })
  s += T(220, 122, 'story', { size: 13, style: 'italic', fill: '#9aa3ad', anchor: 'middle' })
  s += T(30, 204, 'open →', { size: 12, fill: '#9aa3ad' }) + T(410, 204, '← close in reverse order', { size: 12, fill: '#9aa3ad', anchor: 'end' })
  MICE.forEach(([l, n, a, b, c], i) => {
    const x = i % 2 ? 228 : 24, y = 236 + Math.floor(i / 2) * 32, on = i === k
    s += T(x, y, `${l} · ${n}`, { size: 13, weight: 700, fill: c, op: on || k < 0 ? 1 : 0.5 }) + T(x, y + 15, `${a} → ${b}`, { size: 11.5, fill: '#e9e4da', op: on || k < 0 ? 1 : 0.5 })
  })
  return svg(440, 300, s)
}

// ---------- scene card (400 x 240) ----------
export const sceneCard = svg(400, 240, indexBase(400, 240, 'SCENE 14', [80, 110, 140, 178]) + T(384, 33, 'POV: Maya · ch. 9', { size: 12, fill: MUTED, anchor: 'end' }) +
  [['GOAL', 'Get the list to security.', 76], ['CONFLICT', 'Voss’s guard blocks the stairs.', 106], ['DISASTER', 'Security is in on it.', 136]].map(([l, t, y]) => T(16, y, l, { size: 11.5, weight: 700, fill: '#6d6475', ls: 1 }) + hand(110, y, t, { size: 17 })).join('') +
  T(16, 172, 'VALUE', { size: 11.5, weight: 700, fill: '#6d6475', ls: 1 }) + hand(110, 172, 'safe', { size: 17 }) + T(152, 172, '+', { size: 20, weight: 700, fill: GREEN }) + arrow(180, 166, 236, 166, INK, 2.5, 9) + hand(250, 172, 'hunted', { size: 17 }) + T(310, 172, '−', { size: 22, weight: 700, fill: RED }) +
  T(16, 212, 'Scene → sequel → next scene', { size: 12, fill: MUTED }))
export const blankScene = (n, seed) => svg(400, 240, indexBase(400, 240, `SCENE ${n}`, [80, 110, 140, 178]) + bars(110, 66, [180, 0, 210, 0, 150, 0, 120].map((w) => (w ? Math.round(w * (0.8 + rng(seed)() * 0.3)) : 0)), { lh: 15, h: 6, fill: '#9fb8d6' }))

// ---------- scene and sequel step cards (320 x 400) ----------
const STEP_ICON = {
  goal: (c) => `<line x1="122" y1="88" x2="122" y2="214" stroke="#f4efe6" stroke-width="7" stroke-linecap="round"/><path d="M126 92 L214 116 L126 146 Z" fill="${c}"/><ellipse cx="122" cy="216" rx="34" ry="7" fill="#2e4152"/>`,
  conflict: (c) => arrow(56, 150, 132, 150, c, 12, 26) + arrow(264, 150, 188, 150, '#f4efe6', 12, 26) + `<path d="M160 116 l8 22 l22 -6 l-14 18 l14 18 l-22 -6 l-8 22 l-8 -22 l-22 6 l14 -18 l-14 -18 l22 6 z" fill="#ffffff" opacity="0.9"/>`,
  disaster: (c) => `<path d="M182 80 L122 160 H158 L136 222 L202 134 H164 Z" fill="${c}" stroke="#f4efe6" stroke-width="3" stroke-linejoin="round"/>`,
  reaction: (c) => `<circle cx="160" cy="150" r="56" fill="none" stroke="${c}" stroke-width="7"/><circle cx="140" cy="134" r="7" fill="${c}"/><circle cx="180" cy="134" r="7" fill="${c}"/><ellipse cx="160" cy="174" rx="14" ry="18" fill="${c}"/><path d="M214 110 q8 14 0 20 q-8 -6 0 -20z" fill="#9fd8f0"/>`,
  dilemma: (c) => `<line x1="160" y1="94" x2="160" y2="220" stroke="#f4efe6" stroke-width="7" stroke-linecap="round"/><path d="M152 100 H88 L72 120 L88 140 H152 Z" fill="${c}"/><path d="M168 146 H232 L248 166 L232 186 H168 Z" fill="#f4efe6"/>` + T(114, 126, 'RUN', { size: 15, weight: 700, fill: DARK, anchor: 'middle' }) + T(206, 172, 'STAY', { size: 15, weight: 700, fill: DARK, anchor: 'middle' }),
  decision: (c) => arrow(70, 150, 222, 150, c, 16, 40) + `<circle cx="252" cy="150" r="18" fill="none" stroke="#f4efe6" stroke-width="5"/><circle cx="252" cy="150" r="6" fill="#f4efe6"/>`,
}
export function step(n, kind, label, icon, text) {
  const c = kind === 'SCENE' ? GOLD : TEAL
  return svg(320, 400, `<rect width="320" height="400" rx="20" fill="${DARK}"/><rect width="320" height="56" rx="20" fill="${c}"/><rect y="34" width="320" height="22" fill="${c}"/>` +
    T(24, 39, String(n), { size: 26, weight: 700, fill: DARK }) + T(296, 37, kind, { size: 13, weight: 700, fill: DARK, anchor: 'end', ls: 3 }) + STEP_ICON[icon](c) +
    T(160, 268, label.toUpperCase(), { size: 30, weight: 700, fill: '#f4efe6', anchor: 'middle', ls: 2 }) +
    wrap(text, 24).map((l, i) => T(160, 310 + i * 26, l, { size: 19, font: SERIF, style: 'italic', fill: '#d9d2c5', anchor: 'middle' })).join(''))
}

// ---------- value shift gauge (440 x 280) ----------
export const valueShift = svg(440, 280, `<defs><linearGradient id="v" x1="0" x2="1"><stop offset="0" stop-color="${RED}"/><stop offset="0.5" stop-color="#6b7280"/><stop offset="1" stop-color="${GREEN}"/></linearGradient></defs>
<rect width="440" height="280" rx="16" fill="${DARK}"/>` + T(220, 36, 'VALUE AT STAKE: SAFETY', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 2 }) +
  `<rect x="40" y="132" width="360" height="26" rx="13" fill="url(#v)"/>` + T(24, 152, '−', { size: 26, weight: 700, fill: '#f0a59c', anchor: 'middle' }) + T(416, 152, '+', { size: 24, weight: 700, fill: '#9fd6a9', anchor: 'middle' }) +
  `<path d="M350 118 l-10 -16 h20 z" fill="#9fd6a9"/>` + T(350, 96, 'START: safe', { size: 13, weight: 700, fill: '#9fd6a9', anchor: 'middle' }) +
  `<path d="M90 172 l-10 16 h20 z" fill="#f0a59c"/>` + T(90, 206, 'END: hunted', { size: 13, weight: 700, fill: '#f0a59c', anchor: 'middle' }) +
  `<path d="M330 108 C 280 60, 150 64, 104 116" fill="none" stroke="#f4f1ea" stroke-width="3"/>` + head(104, 116, 130, 13, '#f4f1ea') +
  T(220, 244, 'The scene turns: + → −', { size: 17, weight: 700, fill: '#f4f1ea', anchor: 'middle' }) + T(220, 266, 'No turn? McKee calls it a non-event.', { size: 12.5, fill: '#b9c2cc', anchor: 'middle' }))

// ---------- setting map (440 x 340) ----------
export const MAP = { pin: [170, 104], legend: [357, 66], note: [206, 306] }
export const settingMap = (() => {
  let s = `<rect width="440" height="340" fill="#efe2c4"/><rect x="6" y="6" width="428" height="328" fill="none" stroke="#b49a6e" stroke-width="3"/>`
  s += `<path d="M440 150 C 400 170, 392 240, 410 340 H440 Z" fill="#9cc9e3"/>`
  s += `<path d="M-10 60 C 80 90, 120 160, 220 190 S 360 230, 420 210" fill="none" stroke="#86b8db" stroke-width="12"/>`
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 3 !== 2) s += `<rect x="${92 + i * 34}" y="${96 + j * 30}" width="24" height="18" fill="#dccaa3"/>`
  s += `<path d="M20 250 H300 M240 20 V320 M60 20 L180 320" stroke="#f8f1df" stroke-width="7"/>`
  s += `<rect x="196" y="214" width="56" height="40" fill="#5b4a3a" opacity="0.55"/><path d="M196 214 l56 40 M210 214 l42 30 M196 228 l40 26" stroke="#3a2e22" stroke-width="2" opacity="0.6"/>`
  s += `<rect x="156" y="112" width="28" height="28" fill="#ffffff" stroke="#9b8a6c"/><path d="M170 117 v18 M161 126 h18" stroke="${RED}" stroke-width="5"/>`
  s += `<path d="M170 104 c-12 -14 -14 -20 -14 -26 a14 14 0 0 1 28 0 c0 6 -2 12 -14 26 z" fill="${RED}" stroke="#7d1d14" stroke-width="2"/><circle cx="170" cy="78" r="5" fill="#fff"/>`
  s += T(190, 82, 'St Jude’s', { size: 15, font: SERIF, style: 'italic', weight: 700, fill: INK }) + `<rect x="188" y="88" width="104" height="20" rx="4" fill="${INK}"/>` + T(240, 102, 'JAN · 02:00 · snow', { size: 11, weight: 700, fill: '#fff8e6', anchor: 'middle' })
  s += `<rect x="296" y="18" width="128" height="96" fill="#fff8e6" stroke="#8a7458" stroke-width="2"/>` + T(306, 38, 'RULES', { size: 12, weight: 700, fill: INK, ls: 2 }) +
    ['Doors lock at midnight', 'Every badge swipe logged', 'Snow closes the roads'].map((r, i) => T(306, 60 + i * 18, r, { size: 11, fill: INK })).join('')
  s += T(206, 296, 'old wing burned in 1998', { size: 14, font: SERIF, style: 'italic', fill: '#5d4b36', anchor: 'middle' }) + arrow(250, 284, 236, 262, '#5d4b36', 2, 8)
  s += `<g transform="translate(392 290)"><circle r="24" fill="#fff8e6" stroke="#8a7458" stroke-width="2"/><path d="M0 -20 L6 0 L0 20 L-6 0 Z" fill="${INK}"/><path d="M0 -20 L6 0 L-6 0 Z" fill="${RED}"/></g>` + T(392, 260, 'N', { size: 12, weight: 700, fill: INK, anchor: 'middle' })
  return svg(440, 340, s)
})()

// ---------- place and time postcard (440 x 280) ----------
export const placeTime = (() => {
  let s = `<rect width="440" height="280" fill="#fbf7ee"/><rect x="6" y="6" width="428" height="268" fill="none" stroke="#d9cbb0" stroke-width="2"/><line x1="232" y1="24" x2="232" y2="256" stroke="#d9cbb0" stroke-width="2"/>`
  s += `<rect x="20" y="22" width="196" height="236" fill="#efe2c4"/><path d="M20 180 C 80 160, 140 200, 216 170" stroke="#86b8db" stroke-width="10" fill="none"/>`
  s += `<path d="M20 100 H216 M120 22 V258 M40 258 L180 22" stroke="#f8f1df" stroke-width="6"/>`
  s += `<path d="M120 130 c-14 -16 -16 -24 -16 -30 a16 16 0 0 1 32 0 c0 6 -2 14 -16 30 z" fill="${RED}" stroke="#7d1d14" stroke-width="2"/><circle cx="120" cy="100" r="6" fill="#fff"/>` + T(120, 154, 'BOSTON', { size: 14, weight: 700, fill: INK, anchor: 'middle', ls: 2 })
  s += `<rect x="252" y="22" width="166" height="150" rx="8" fill="#ffffff" stroke="#c9bda5"/><rect x="252" y="22" width="166" height="38" rx="8" fill="${RED}"/><rect x="252" y="46" width="166" height="14" fill="${RED}"/>`
  s += T(335, 48, 'JANUARY', { size: 17, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 3 }) + T(335, 136, '14', { size: 66, weight: 700, fill: INK, anchor: 'middle' }) + T(335, 160, 'TUESDAY', { size: 12, fill: MUTED, anchor: 'middle', ls: 2 })
  s += `<circle cx="282" cy="218" r="26" fill="#ffffff" stroke="${INK}" stroke-width="3"/><line x1="282" y1="218" x2="282" y2="200" stroke="${INK}" stroke-width="3"/><line x1="282" y1="218" x2="296" y2="212" stroke="${INK}" stroke-width="3"/>` + T(322, 226, '02:00', { size: 24, weight: 700, fill: INK })
  s += `<g stroke="#5b9bd5" stroke-width="2.5"><path d="M400 200 v28 M388 207 l24 14 M388 221 l24 -14"/></g>`
  return svg(440, 280, s)
})()

// ---------- world bible binder cover (360 x 460) ----------
export const worldBible = svg(360, 460, `<rect width="360" height="460" fill="#2e4a62"/><rect x="40" y="36" width="280" height="80" rx="4" fill="#f3ead6"/>` +
  T(180, 72, 'WORLD BIBLE', { size: 28, font: SERIF, weight: 700, fill: INK, anchor: 'middle', ls: 2 }) + T(180, 100, 'the rules of this world', { size: 15, font: SERIF, style: 'italic', fill: '#6d6475', anchor: 'middle' }) +
  `<rect x="26" y="140" width="308" height="292" rx="4" fill="#f3ead6"/>` +
  [['1', 'Magic solves problems only as far as the reader understands it.'], ['2', 'Limitations > Powers.'], ['3', 'Expand what you have before you add more.']].map(([n, r], i) => {
    const y = 180 + i * 92
    return T(44, y + 4, n, { size: 30, weight: 700, fill: RED, font: SERIF }) + wrap(r, 28).map((l, j) => T(76, y + j * 22, l, { size: 17, font: SERIF, fill: INK })).join('')
  }).join(''))

// ---------- exposition target page (300 x 200) ----------
export const expoPage = svg(300, 200, `<rect width="300" height="200" fill="${PAPER}"/>` + bars(24, 28, [250, 236, 252, 120], { lh: 18, h: 6 }) +
  `<ellipse cx="150" cy="122" rx="28" ry="9" fill="#3b7dd8" opacity="0.8"/>` + T(150, 150, 'backstory', { size: 15, font: SERIF, style: 'italic', fill: '#3b7dd8', anchor: 'middle' }) + bars(24, 168, [240, 200], { lh: 18, h: 6 }))

// ---------- narrative person dial face (400 x 400), k = selected setting ----------
export const PERSON = [['I', 'first', 150], ['YOU', 'second', 110], ['SHE', 'third limited', 70], ['ALL', 'omniscient', 30]]
export const DIAL = { cx: 200, cy: 190 }
export function personFace(k, sample) {
  let s = `<rect width="400" height="400" rx="20" fill="#1f232b"/>` + T(200, 36, 'NARRATIVE PERSON', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 })
  s += `<circle cx="${DIAL.cx}" cy="${DIAL.cy}" r="88" fill="none" stroke="#3a3f4a" stroke-width="2"/>`
  PERSON.forEach(([w, cap, a], i) => {
    const on = i === k, [x1, y1] = polar(DIAL.cx, DIAL.cy, 92, a), [x2, y2] = polar(DIAL.cx, DIAL.cy, 104, a), [tx, ty] = polar(DIAL.cx, DIAL.cy, 128, a)
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on ? GOLD : '#6b7280'}" stroke-width="4"/>` + T(tx, ty, w, { size: 20, weight: 700, fill: on ? GOLD : '#9aa0aa', anchor: 'middle' }) + T(tx, ty + 16, cap, { size: 11, fill: on ? GOLD : '#7b8290', anchor: 'middle' })
  })
  s += `<rect x="24" y="296" width="352" height="82" rx="8" fill="#f6f1e4"/>` + wrap(sample, 40).map((l, i) => T(200, 328 + i * 24, l, { size: 17, font: SERIF, style: 'italic', fill: INK, anchor: 'middle' })).join('')
  return svg(400, 400, s)
}

// ---------- viewpoint character (440 x 300) ----------
export const povCharacter = (() => {
  const headF = (x, c, op = 1) => `<g opacity="${op}"><circle cx="${x}" cy="150" r="34" fill="${c}"/><path d="M${x - 62} 246 Q${x} 168 ${x + 62} 246 Z" fill="${c}"/></g>`
  let s = `<rect width="440" height="300" rx="16" fill="${DARK}"/>` + T(220, 34, 'WHOSE HEAD ARE WE IN?', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 2 })
  s += headF(90, '#4b5563', 0.8) + headF(220, '#e2a13b') + headF(350, '#4b5563', 0.8)
  s += `<path d="M196 78 h48 l14 -10 v34 l-14 -10 h-48 z" fill="#f4efe6"/><circle cx="214" cy="85" r="6" fill="${DARK}"/>`
  s += T(90, 270, 'Voss', { size: 15, fill: '#9aa3ad', anchor: 'middle' }) + T(220, 270, 'Maya', { size: 16, weight: 700, fill: GOLD, anchor: 'middle' }) + T(350, 270, 'Guard', { size: 15, fill: '#9aa3ad', anchor: 'middle' })
  s += `<path d="M262 120 C 290 96, 310 96, 330 116" fill="none" stroke="#f0a59c" stroke-width="3" stroke-dasharray="6 5"/>` + cross(288, 96, 16, '#f0a59c', 4) + T(300, 76, 'no head-hopping', { size: 11.5, fill: '#f0a59c', anchor: 'middle' })
  s += T(220, 292, 'one viewpoint per scene', { size: 12, fill: '#b9c2cc', anchor: 'middle' })
  return svg(440, 300, s)
})()

// ---------- tense switch face (400 x 280), k = 0 past, 1 present ----------
export function tenseFace(k, sample) {
  let s = `<rect width="400" height="280" rx="20" fill="#1f232b"/>` + T(200, 34, 'TENSE', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 4 })
  s += T(120, 104, 'PAST', { size: 22, weight: 700, fill: k === 0 ? GOLD : '#7b8290', anchor: 'end' }) + T(284, 104, 'PRESENT', { size: 22, weight: 700, fill: k === 1 ? GOLD : '#7b8290', anchor: 'start' })
  s += `<circle cx="200" cy="96" r="34" fill="#2c313b" stroke="#454b57" stroke-width="3"/>`
  s += `<rect x="24" y="170" width="352" height="86" rx="8" fill="#f6f1e4"/>` + wrap(sample, 40).map((l, i) => T(200, 204 + i * 26, l, { size: 18, font: SERIF, style: 'italic', fill: INK, anchor: 'middle' })).join('')
  return svg(400, 280, s)
}

// ---------- psychic distance face (440 x 288), level 1..5 ----------
const frame = (i, x, y) => {
  // five shots from wide to extreme close-up
  const fig = [
    `<rect x="${x}" y="${y + 38}" width="72" height="16" fill="#e8eef5"/><path d="M${x + 6} ${y + 38} v-24 h14 v24 M${x + 50} ${y + 38} v-30 h16 v30" fill="#6b7a8c"/><rect x="${x + 33}" y="${y + 30}" width="3" height="8" fill="#1f232b"/><circle cx="${x + 34.5}" cy="${y + 28}" r="2" fill="#1f232b"/>`,
    `<rect x="${x}" y="${y + 44}" width="72" height="10" fill="#e8eef5"/><circle cx="${x + 36}" cy="${y + 14}" r="6" fill="#1f232b"/><path d="M${x + 28} ${y + 22} h16 l3 22 h-22 z" fill="#1f232b"/>`,
    `<circle cx="${x + 36}" cy="${y + 20}" r="11" fill="#1f232b"/><path d="M${x + 14} ${y + 54} Q${x + 36} ${y + 26} ${x + 58} ${y + 54} Z" fill="#1f232b"/>`,
    `<circle cx="${x + 36}" cy="${y + 30}" r="22" fill="#1f232b"/><circle cx="${x + 28}" cy="${y + 26}" r="3" fill="#f6f1e4"/><circle cx="${x + 44}" cy="${y + 26}" r="3" fill="#f6f1e4"/>`,
    `<ellipse cx="${x + 36}" cy="${y + 27}" rx="30" ry="14" fill="#f6f1e4" stroke="#1f232b" stroke-width="3"/><circle cx="${x + 36}" cy="${y + 27}" r="10" fill="#3f73b5"/><circle cx="${x + 36}" cy="${y + 27}" r="4" fill="#1f232b"/>`,
  ][i]
  return `<rect x="${x}" y="${y}" width="72" height="54" fill="#cfd9e4"/>` + fig
}
export const PD_X = (lvl) => 60 + (lvl - 1) * 80
export function distanceFace(lvl, sample) {
  let s = `<rect width="440" height="288" rx="20" fill="#1f232b"/>` + T(220, 30, 'PSYCHIC DISTANCE', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 })
  for (let i = 1; i <= 5; i++) {
    const x = PD_X(i) - 36
    s += frame(i - 1, x, 46) + (i === lvl ? `<rect x="${x - 3}" y="43" width="78" height="60" fill="none" stroke="${GOLD}" stroke-width="4"/>` : `<rect x="${x}" y="46" width="72" height="54" fill="#1f232b" opacity="0.35"/>`)
    s += `<line x1="${PD_X(i)}" y1="128" x2="${PD_X(i)}" y2="142" stroke="#6b7280" stroke-width="2"/>` + T(PD_X(i), 168, String(i), { size: 14, weight: 700, fill: i === lvl ? GOLD : '#7b8290', anchor: 'middle' })
  }
  s += `<rect x="40" y="132" width="360" height="8" rx="4" fill="#3a3f4a"/>` + T(40, 122, 'far', { size: 11, fill: '#7b8290' }) + T(400, 122, 'close', { size: 11, fill: '#7b8290', anchor: 'end' })
  s += `<rect x="20" y="182" width="400" height="90" rx="8" fill="#f6f1e4"/>` + wrap(sample, 46).slice(0, 3).map((l, i) => T(220, 208 + i * 23, l, { size: 16, font: SERIF, style: 'italic', fill: INK, anchor: 'middle' })).join('')
  return svg(440, 288, s)
}

// ---------- prose page (400 x 558) ----------
export const prosePage = (() => {
  const F = { size: 15.5, font: SERIF }
  let s = `<rect width="400" height="558" fill="${PAPER}"/>` + T(200, 46, '9', { size: 22, font: SERIF, fill: '#8a7f70', anchor: 'middle' })
  ;['The night shift had always suited Maya. For', 'six years she had worked the quiet hours,', 'learning which doors stuck and which', 'doctors lied.'].forEach((l, i) => (s += T(36, 86 + i * 21, l, F)))
  s += TR(36, 186, ['The list was clipped to the board under ', ['a', {}]], F) + TR(36, 207, [['chipped blue mug', { fill: '#a16207', weight: 700 }], ' that said WORLD’S BEST DAD.'], F)
  ;['She ran. Down the stairs, past the dark', 'pharmacy, through the door that always', 'stuck and did not stick tonight. Locked.', 'Of course.'].forEach((l, i) => (s += T(36, 252 + i * 21, l, F)))
  ;['“You shouldn’t be here,” Voss said.', '“Neither should she.” Maya nodded at the', 'woman in bed four.'].forEach((l, i) => (s += T(36, 350 + i * 21, l, F)))
  s += bars(36, 424, [330, 318, 326, 210, 0, 322, 330, 300, 160], { lh: 14, h: 5, fill: '#cbc2b2' })
  s += T(200, 544, '127', { size: 12, font: SERIF, fill: '#8a7f70', anchor: 'middle' })
  return svg(400, 558, s)
})()

// ---------- show / tell slider face (424 x 284), k = 0 show, 1 tell ----------
export const ST_X = [364, 60]
export function showTellFace(k) {
  const box = (x, on, title, lines) => `<rect x="${x}" y="134" width="186" height="134" rx="8" fill="${on ? '#f6f1e4' : '#2c313b'}"/>` + T(x + 14, 156, title, { size: 11, weight: 700, fill: on ? '#8a7f70' : '#6b7280', ls: 2 }) + lines.map((l, i) => T(x + 14, 184 + i * 22, l, { size: 16, font: SERIF, style: 'italic', fill: on ? INK : '#7b8290' })).join('')
  let s = `<rect width="424" height="284" rx="20" fill="#1f232b"/>` + T(212, 32, 'SHOW ↔ TELL', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 })
  s += `<rect x="40" y="70" width="344" height="8" rx="4" fill="#3a3f4a"/>`
  s += T(40, 110, 'TELL', { size: 15, weight: 700, fill: k === 1 ? GOLD : '#7b8290' }) + T(40, 125, 'summary', { size: 11, fill: '#7b8290' }) + T(384, 110, 'SHOW', { size: 15, weight: 700, fill: k === 0 ? GOLD : '#7b8290', anchor: 'end' }) + T(384, 125, 'scene', { size: 11, fill: '#7b8290', anchor: 'end' })
  s += box(20, k === 1, 'TELL', ['Maya was scared.']) + box(218, k === 0, 'SHOW', ['Her hands shook so', 'hard the clipboard', 'rattled on the rail.'])
  return svg(424, 284, s)
}

// ---------- significant detail page (400 x 280) and lens (200 x 200) ----------
export const detailPage = svg(400, 280, `<rect width="400" height="280" fill="${PAPER}"/>` + bars(28, 30, [330, 340, 300, 0, 344, 0, 320, 336, 250, 0, 330, 290], { lh: 18, h: 6, fill: '#c7beae' }) +
  T(28, 120, 'clipped under a chipped blue mug that', { size: 13, font: SERIF, fill: INK }) + T(28, 138, 'said WORLD’S BEST DAD. Nobody here', { size: 13, font: SERIF, fill: INK }))
export const lens = svg(200, 200, `<circle cx="100" cy="100" r="98" fill="#fdf9ef"/>` +
  `<path d="M70 70 h50 v52 a16 16 0 0 1 -16 16 h-18 a16 16 0 0 1 -16 -16 z" fill="#3f73b5"/><path d="M120 82 a14 14 0 0 1 0 28" fill="none" stroke="#3f73b5" stroke-width="7"/><path d="M70 70 l8 10 l7 -10 z" fill="#fdf9ef"/>` +
  T(97, 108, 'BEST', { size: 9, weight: 700, fill: '#ffffff', anchor: 'middle' }) + T(97, 120, 'DAD', { size: 9, weight: 700, fill: '#ffffff', anchor: 'middle' }) +
  T(100, 166, 'chipped blue mug', { size: 17, font: SERIF, weight: 700, fill: '#a16207', anchor: 'middle' }))

// ---------- dialogue page (400 x 420) ----------
export const DIALOGUE_SAID = [226, 248]
export const dialoguePage = svg(400, 420, `<rect width="400" height="420" fill="${PAPER}"/>` +
  T(34, 62, '“You shouldn’t be here.”', { size: 17, font: SERIF }) +
  ['“Neither should you.” Maya held up', 'the list. “Want to explain this?”', 'He smiled. “Explain what?”', '“My name. Bed four. Six names, Adrian.”'].map((l, i) => T(34, 98 + i * 36 + (i > 1 ? 10 : 0), l, { size: 17, font: SERIF })).join('') +
  TR(34, 252, ['“Go home, Maya,” Voss ', ['said', { fill: '#a16207', weight: 700 }], '.'], { size: 17, font: SERIF }) +
  T(34, 288, 'She didn’t.', { size: 17, font: SERIF }) +
  bars(34, 340, [320, 300, 180], { lh: 18, h: 6, fill: '#cbc2b2' }))

// ---------- dialogue tags (440 x 300), k = highlighted row ----------
export const TAG_ROWS = [['“Go home,” he said.', 'said', true], ['He smiled. “Go home.”', 'action beat', true], ['“Go home.”', 'no tag', true], ['“Go home,” he hissed menacingly.', 'adverb tag', false]]
export function tags(k) {
  let s = `<rect width="440" height="300" rx="16" fill="${DARK}"/>` + T(220, 32, 'DIALOGUE TAGS', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 3 })
  TAG_ROWS.forEach(([line, name, ok], i) => {
    const y = 74 + i * 58, on = i === k
    if (on) s += `<rect x="12" y="${y - 30}" width="416" height="50" rx="8" fill="#2f4456"/>`
    s += T(28, y, line, { size: 18, font: SERIF, fill: on ? '#ffffff' : '#c9c2b6' }) + T(28, y + 15, name, { size: 11, weight: 700, fill: ok ? '#9fd6a9' : '#f0a59c', ls: 1.5 })
    s += ok ? tick(394, y - 6, 18, '#9fd6a9', 4) : cross(396, y - 4, 16, '#f0a59c', 4)
  })
  return svg(440, 300, s)
}

// ---------- sentence rhythm (440 x 300) ----------
export const rhythm = (() => {
  let s = `<rect width="440" height="300" rx="16" fill="${DARK}"/>` + T(220, 32, 'SENTENCE LENGTH (WORDS)', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 2 })
  const row = (y, label, lens, c) => {
    let x = 92, r = T(24, y + 13, label, { size: 15, weight: 700, fill: '#e9e4da' })
    for (const n of lens) {
      r += `<rect x="${x}" y="${y}" width="${n * 10}" height="18" rx="4" fill="${c}"/>` + T(x + n * 5, y - 6, String(n), { size: 11, fill: '#9aa3ad', anchor: 'middle' })
      x += n * 10 + 8
    }
    return r
  }
  s += row(76, 'Drone', [5, 5, 5, 5, 5], '#7b8290') + row(146, 'Music', [3, 9, 2, 14, 5], GOLD)
  s += ['“This sentence has five words.', 'Here are five more words.”', '— Gary Provost'].map((l, i) => T(220, 222 + i * 24, l, { size: 16, font: SERIF, style: 'italic', fill: '#e9e4da', anchor: 'middle' })).join('')
  return svg(440, 300, s)
})()

// ---------- motif (440 x 280) ----------
export const motif = (() => {
  const bulb = (x, y, state) => {
    const fill = state === 2 ? '#ffd45c' : state === 1 ? '#6b7280' : '#f4e3a1'
    let b = `<circle cx="${x}" cy="${y}" r="13" fill="${fill}"/><rect x="${x - 6}" y="${y + 11}" width="12" height="9" fill="#9aa0aa"/>`
    if (state === 0) b += `<path d="M${x - 22} ${y - 4} h-6 M${x + 22} ${y - 4} h6 M${x - 16} ${y - 18} l-4 -4 M${x + 16} ${y - 18} l4 -4" stroke="#f4e3a1" stroke-width="3" stroke-dasharray="3 3"/>`
    if (state === 2) b += `<path d="M${x - 22} ${y} h-10 M${x + 22} ${y} h10 M${x - 16} ${y - 16} l-7 -7 M${x + 16} ${y - 16} l7 -7 M${x} ${y - 22} v-9" stroke="#ffd45c" stroke-width="3"/>`
    return b
  }
  let s = `<rect width="440" height="280" rx="16" fill="${DARK}"/>` + T(220, 30, 'MOTIF: THE WARD LIGHTS', { size: 15, weight: 700, fill: GOLD, anchor: 'middle', ls: 2 })
  ;[['ch. 1', 'flicker', 0], ['ch. 12', 'dark', 1], ['ch. 30', 'steady', 2]].forEach(([c, n, st], i) => {
    const x = 26 + i * 140
    s += `<rect x="${x}" y="50" width="108" height="150" rx="4" fill="#fbf7ee"/>` + bars(x + 12, 104, [84, 80, 84, 60, 84, 74, 50], { lh: 13, h: 5, fill: '#cbc2b2' }) + `<rect x="${x + 30}" y="56" width="48" height="44" rx="6" fill="#26313d"/>` + bulb(x + 54, 74, st)
    s += T(x + 54, 226, c, { size: 14, weight: 700, fill: '#e9e4da', anchor: 'middle' }) + T(x + 54, 246, n, { size: 13, font: SERIF, style: 'italic', fill: '#b9c2cc', anchor: 'middle' })
    if (i < 2) s += arrow(x + 112, 124, x + 134, 124, GOLD, 3, 9)
  })
  s += T(220, 270, 'same image, more meaning each time', { size: 12, fill: '#9aa3ad', anchor: 'middle' })
  return svg(440, 280, s)
})()

// ---------- open book pages (340 x 477) ----------
export const leftPage = svg(340, 477, `<rect width="340" height="477" fill="#fbf6ea"/>` + bars(30, 40, [280, 276, 282, 270, 280, 230, 0, 282, 276, 268, 150], { lh: 15, h: 5, fill: '#bfb6a6' }) +
  T(170, 232, '*   *   *', { size: 18, font: SERIF, fill: '#8a7f70', anchor: 'middle' }) + bars(30, 262, [280, 276, 270, 282, 200, 0], { lh: 15, h: 5, fill: '#bfb6a6' }) +
  `<rect x="26" y="350" width="290" height="22" rx="3" fill="#fde68a"/>` + T(30, 366, 'She did not see the man behind the door.', { size: 14, font: SERIF, style: 'italic', fill: INK }) + bars(30, 392, [276, 282, 264, 120], { lh: 15, h: 5, fill: '#bfb6a6' }) + T(170, 462, '126', { size: 11, font: SERIF, fill: '#8a7f70', anchor: 'middle' }))
export const rightPage = svg(340, 477, `<rect width="340" height="477" fill="#fbf6ea"/>` + bars(26, 40, [282, 276, 280, 270, 284, 266, 280, 150, 0, 282, 274, 280, 268, 284, 276, 200, 0, 280, 272, 230], { lh: 15, h: 5, fill: '#bfb6a6' }) +
  T(26, 378, 'The last name on the list was hers.', { size: 16, font: SERIF, style: 'italic', weight: 700, fill: INK }) +
  `<path d="M318 362 v14 a7 7 0 0 1 -14 0 v-4 l-4 4" fill="none" stroke="${RED}" stroke-width="2.5" stroke-linecap="round"/>` + T(170, 462, '127', { size: 11, font: SERIF, fill: '#8a7f70', anchor: 'middle' }))
export const turningPage = svg(340, 464, `<rect width="340" height="464" fill="#fffaf0"/>` + bars(28, 40, [280, 270, 282, 276, 260, 0, 282, 270, 280, 274, 282, 210, 0, 280, 276, 268, 282, 270, 276, 190, 0, 278, 270, 282, 150], { lh: 15, h: 5, fill: '#cfc6b6' }))

// ---------- wall clock face (200 x 200) and mystery parcel tag (100 x 100) ----------
export const clockFace = (() => {
  let s = `<circle cx="100" cy="100" r="96" fill="#fbf9f2" stroke="#2a2530" stroke-width="7"/>`
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = polar(100, 100, 84, 90 - i * 30), [x2, y2] = polar(100, 100, i % 3 ? 76 : 68, 90 - i * 30)
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2a2530" stroke-width="${i % 3 ? 3 : 6}"/>`
  }
  const [hx, hy] = polar(100, 100, 44, 90 - 22.5), [mx, my] = polar(100, 100, 70, 180)
  s += `<line x1="100" y1="100" x2="${hx}" y2="${hy}" stroke="#2a2530" stroke-width="8" stroke-linecap="round"/><line x1="100" y1="100" x2="${mx}" y2="${my}" stroke="#2a2530" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="100" r="7" fill="${RED}"/>`
  return svg(200, 200, s)
})()
export const parcelTag = svg(100, 100, `<rect x="4" y="4" width="92" height="92" rx="8" fill="#f6efe0" stroke="#7a5a3a" stroke-width="3"/>` + T(50, 78, '?', { size: 70, weight: 700, fill: RED, anchor: 'middle', font: SERIF }))
// Gingham tablecloth face (w x h px). `folds` adds soft vertical shadows for a hanging skirt.
export function gingham(w, h, folds = 0) {
  const step = 30
  let s = `<defs><linearGradient id="f"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.5" stop-color="#000" stop-opacity="0.3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="${w}" height="${h}" fill="#f7f2ea"/>`
  for (let x = 0; x < w; x += step * 2) s += `<rect x="${x}" width="${step}" height="${h}" fill="#c8323c" opacity="0.5"/>`
  for (let y = 0; y < h; y += step * 2) s += `<rect y="${y}" width="${w}" height="${step}" fill="#c8323c" opacity="0.5"/>`
  for (let i = 0; i < folds; i++) s += `<rect x="${r4(((i + 0.5) * w) / folds - 36)}" width="72" height="${h}" fill="url(#f)"/>`
  return svg(w, h, s)
}

// ---------- hooks page (400 x 520) ----------
export const hooksPage = svg(400, 520, `<rect width="400" height="520" fill="${PAPER}"/>` + bars(34, 44, [330, 322, 330, 300, 326, 330, 200, 0, 330, 318, 326, 330, 310, 240, 0, 328, 330, 316, 290], { lh: 15, h: 5, fill: '#c7beae' }) +
  T(34, 346, 'The last name on the list was hers.', { size: 19, font: SERIF, style: 'italic', weight: 700, fill: INK }) +
  `<path d="M372 318 v26 a11 11 0 0 1 -22 0 v-6 l-6 6" fill="none" stroke="${RED}" stroke-width="3.5" stroke-linecap="round"/><circle cx="372" cy="316" r="3.5" fill="none" stroke="${RED}" stroke-width="2.5"/>` +
  T(200, 430, 'end of chapter 3', { size: 12, fill: '#a59a8a', anchor: 'middle', ls: 3 }) + T(200, 500, '43', { size: 12, font: SERIF, fill: '#8a7f70', anchor: 'middle' }))

// ---------- metronome (360 x 440), transparent background ----------
export const metronome = svg(360, 440, `<path d="M100 410 L260 410 L214 50 L146 50 Z" fill="#8a5a36"/><path d="M118 396 L242 396 L204 78 L156 78 Z" fill="#b3824f"/>` +
  Array.from({ length: 9 }, (_, i) => `<line x1="${168 - i * 0.6}" y1="${110 + i * 30}" x2="${192 + i * 0.6}" y2="${110 + i * 30}" stroke="#5e3b22" stroke-width="2"/>`).join('') +
  T(234, 116, 'PRESTO', { size: 11, weight: 700, fill: '#f4e9d8' }) + T(244, 376, 'LARGO', { size: 11, weight: 700, fill: '#f4e9d8' }) +
  `<line x1="180" y1="380" x2="236" y2="92" stroke="#e8e1d5" stroke-width="5" stroke-linecap="round"/><rect x="${210 - 14}" y="196" width="30" height="26" rx="4" fill="#d9d4cc" stroke="#5e3b22" stroke-width="2" transform="rotate(11 211 209)"/>` +
  `<rect x="84" y="408" width="192" height="20" rx="4" fill="#5e3b22"/>` +
  T(298, 150, 'fast', { size: 15, weight: 700, fill: '#e8c26b' }) + T(298, 168, 'routine and', { size: 11.5, fill: '#e9e4da' }) + T(298, 182, 'travel', { size: 11.5, fill: '#e9e4da' }) +
  T(298, 320, 'slow', { size: 15, weight: 700, fill: '#8fc1e3' }) + T(298, 338, 'the big', { size: 11.5, fill: '#e9e4da' }) + T(298, 352, 'moments', { size: 11.5, fill: '#e9e4da' }))

// ---------- writer's desk props ----------
export const corkCards = (() => {
  const r = rng(3), cols = ['#fbf9f2', '#fff3b0', '#fbd5d5', '#d5e8fb']
  let s = `<rect width="290" height="200" fill="#c49a64"/>`
  for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) if (!(row === 2 && i > 2)) {
    const x = 14 + i * 55, y = 14 + row * 62, c = cols[(row + i) % 4]
    s += `<rect x="${x}" y="${y}" width="46" height="50" fill="${c}" transform="rotate(${r4((r() - 0.5) * 8)} ${x + 23} ${y + 25})"/>` + bars(x + 6, y + 14, [34, 30, 24], { lh: 9, h: 3, fill: '#8a8190' }) + `<circle cx="${x + 23}" cy="${y + 5}" r="3.5" fill="${['#c0392b', '#2f6db0', '#3f8f5a'][row]}"/>`
  }
  return svg(290, 200, s)
})()
export function screenDoc({ words, badge }) {
  // word processor (520 x 320)
  let s = `<rect width="520" height="320" fill="#e9e9ec"/><rect width="520" height="30" fill="#d4d6dc"/>` + T(14, 20, 'the-last-hour.docx', { size: 13, fill: '#3a3d45' })
  s += `<rect x="96" y="40" width="328" height="244" fill="#ffffff"/>` + bars(122, 64, [270, 276, 262, 280, 240, 0, 270, 280, 266, 274, 150], { lh: 16, h: 5, fill: '#9a9aa3' }) + `<rect x="276" y="221" width="3" height="14" fill="#1a1a1a"/>`
  s += `<rect y="294" width="520" height="26" fill="#2b5797"/>` + T(14, 312, 'Page 168', { size: 12, fill: '#ffffff' }) + T(260, 312, `Words: ${words}`, { size: 13, weight: 700, fill: '#ffffff', anchor: 'middle' }) + T(506, 312, 'English (UK)', { size: 12, fill: '#ffffff', anchor: 'end' })
  if (badge) s += `<rect x="352" y="46" width="160" height="40" rx="8" fill="${GREEN}"/>` + T(366, 63, 'TODAY', { size: 10, weight: 700, fill: '#d6f5df', ls: 2 }) + T(366, 80, '1,124 / 1,000', { size: 14, weight: 700, fill: '#ffffff' }) + tick(480, 62, 18, '#ffffff', 4)
  return svg(520, 320, s)
}
export const markedTopPage = svg(280, 380, `<rect width="280" height="380" fill="#ffffff"/>` + bars(22, 30, [230, 236, 220, 238, 200, 0, 232, 236, 228, 238, 180, 0, 234, 226, 236, 200], { lh: 18, h: 6, fill: '#a9a3a9' }) +
  `<path d="M22 69 h170 M40 213 h150" stroke="${RED}" stroke-width="3"/><path d="M200 120 q20 -14 36 4" fill="none" stroke="${RED}" stroke-width="3"/>` + T(232, 156, 'cut?', { size: 18, font: SERIF, style: 'italic', weight: 700, fill: RED }))

// ---------- notebook pages (232 x 320) ----------
export const notesPage = svg(232, 320, `<rect width="232" height="320" fill="#fdfaf2"/>` + Array.from({ length: 13 }, (_, i) => `<line x1="0" y1="${44 + i * 22}" x2="232" y2="${44 + i * 22}" stroke="${RULE}" stroke-width="1"/>`).join('') +
  `<line x1="28" y1="0" x2="28" y2="320" stroke="#e8a3a3" stroke-width="1.5"/>` + [['ideas', 38], ['nurse finds a list', 82], ['who wrote it?', 126], ['her name is on it!', 170], ['ending: roof at dawn?', 214]].map(([t, y]) => T(36, y, t, { size: 16, font: SERIF, style: 'italic', fill: PEN })).join(''))
export const PLANS = {
  architect: svg(232, 320, `<rect width="232" height="320" fill="#eaf2fb"/>` + Array.from({ length: 16 }, (_, i) => `<line x1="${i * 16}" y1="0" x2="${i * 16}" y2="320" stroke="#c7dbf0" stroke-width="1"/><line x1="0" y1="${i * 20}" x2="232" y2="${i * 20}" stroke="#c7dbf0" stroke-width="1"/>`).join('') +
    T(116, 30, 'OUTLINE', { size: 14, weight: 700, fill: '#1d4e89', anchor: 'middle', ls: 3 }) +
    [['ACT I', 3, 44], ['ACT II', 5, 120], ['ACT III', 3, 228]].map(([a, n, y]) => T(14, y + 12, a, { size: 11, weight: 700, fill: '#1d4e89' }) + Array.from({ length: n }, (_, i) => `<rect x="${14 + (i % 3) * 70}" y="${y + 20 + Math.floor(i / 3) * 34}" width="60" height="26" fill="#ffffff" stroke="#1d4e89" stroke-width="1.5"/>` + (i < n - 1 ? `<path d="M${74 + (i % 3) * 70} ${y + 33 + Math.floor(i / 3) * 34} h10" stroke="#1d4e89" stroke-width="1.5"/>` : '')).join('')).join('')),
  gardener: svg(232, 320, `<rect width="232" height="320" fill="#fdfaf2"/>` + Array.from({ length: 13 }, (_, i) => `<line x1="0" y1="${44 + i * 22}" x2="232" y2="${44 + i * 22}" stroke="${RULE}" stroke-width="1"/>`).join('') +
    `<path d="M116 300 C 116 250, 112 210, 120 170" stroke="#3f8f5a" stroke-width="5" fill="none"/><path d="M118 230 C 90 222, 80 200, 84 186 C 104 192, 116 210, 118 230 Z M120 200 C 146 190, 160 168, 154 152 C 134 160, 122 180, 120 200 Z" fill="#5fb37a"/><ellipse cx="116" cy="302" rx="40" ry="8" fill="#8a6446"/>` +
    T(20, 60, 'what if she...?', { size: 16, font: SERIF, style: 'italic', fill: PEN }) + T(120, 104, 'follow Maya →', { size: 15, font: SERIF, style: 'italic', fill: PEN }) + T(24, 146, '???', { size: 18, font: SERIF, style: 'italic', fill: RED })),
  snowflake: svg(232, 320, `<rect width="232" height="320" fill="#fdfaf2"/>` + T(116, 30, 'SNOWFLAKE', { size: 14, weight: 700, fill: '#1d4e89', anchor: 'middle', ls: 3 }) +
    [['1 sentence', 30], ['1 paragraph', 60], ['character sheets', 90], ['1-page synopsis', 120], ['4-page synopsis', 150], ['scene list', 180]].map(([t, w], i) => {
      const y = 50 + i * 44
      return `<rect x="${116 - w / 2 - 20}" y="${y}" width="${w + 40}" height="28" rx="4" fill="#ffffff" stroke="#1d4e89" stroke-width="1.5"/>` + T(116, y + 19, t, { size: 13, fill: '#1d4e89', anchor: 'middle' }) + (i < 5 ? `<path d="M116 ${y + 28} v16" stroke="#1d4e89" stroke-width="1.5"/>` : '')
    }).join('')),
}

// ---------- corkboard outline (448 x 304) ----------
export const outlineBoard = (() => {
  const r = rng(5), acts = [['I', ['night shift', 'the list', 'her name', 'tells Ruth']], ['II', ['security?', 'the guard', 'pharmacy', 'bed four', 'Voss calls', 'all is lost']], ['III', ['back in', 'the roof', 'dawn']]]
  let s = `<rect width="448" height="304" fill="#c49a64"/>`
  acts.forEach(([a, cards], row) => {
    const y = 18 + row * 96
    s += `<rect x="8" y="${y + 18}" width="30" height="36" rx="4" fill="#5e3b22"/>` + T(23, y + 43, a, { size: 15, weight: 700, fill: '#f4e9d8', anchor: 'middle' })
    cards.forEach((c, i) => {
      const x = 46 + i * 66
      s += `<g transform="rotate(${r4((r() - 0.5) * 6)} ${x + 29} ${y + 36})"><rect x="${x}" y="${y}" width="58" height="72" fill="#fbf9f2"/><line x1="${x}" y1="${y + 16}" x2="${x + 58}" y2="${y + 16}" stroke="#e06666" stroke-width="1.5"/>` +
        T(x + 29, y + 36, c, { size: 9.5, font: SERIF, style: 'italic', fill: PEN, anchor: 'middle' }) + bars(x + 8, y + 46, [42, 36], { lh: 9, h: 3, fill: '#a8c7e6' }) + `</g><circle cx="${x + 29}" cy="${y + 6}" r="4.5" fill="${['#c0392b', '#2f6db0', '#3f8f5a'][row]}"/>`
    })
  })
  return svg(448, 304, s)
})()

// ---------- keyboard (480 x 200) ----------
export const keyboard = (() => {
  let s = `<rect width="480" height="200" rx="10" fill="#c3c6cc"/>`
  for (let row = 0; row < 4; row++) for (let i = 0; i < 12; i++) s += `<rect x="${22 + i * 37 + (row % 2) * 8}" y="${16 + row * 34}" width="31" height="28" rx="4" fill="#2b2d33"/>`
  s += `<rect x="130" y="152" width="220" height="28" rx="4" fill="#2b2d33"/>`
  return svg(480, 200, s)
})()

// ---------- calendar of daily word counts (440 x 340) ----------
export function calendar(rate) {
  const r = rng(9)
  let s = `<rect width="440" height="340" fill="#fbf9f2"/><rect width="440" height="48" fill="${RED}"/>` + T(20, 32, 'NOVEMBER', { size: 20, weight: 700, fill: '#ffffff', ls: 3 }) + T(420, 32, `target ${rate.toLocaleString('en-GB')} / day`, { size: 15, weight: 700, fill: '#ffffff', anchor: 'end' })
  ;['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => (s += T(48 + i * 58, 68, d, { size: 12, weight: 700, fill: MUTED, anchor: 'middle' })))
  let total = 0
  for (let d = 0; d < 30; d++) {
    const col = (d + 2) % 7, row = Math.floor((d + 2) / 7), x = 20 + col * 58, y = 78 + row * 46
    const miss = [5, 13, 19].includes(d), w = miss ? 0 : Math.round((rate * (0.85 + r() * 0.4)) / 10) * 10
    total += w
    s += `<rect x="${x}" y="${y}" width="54" height="42" rx="4" fill="${miss ? '#fbe3df' : '#e3f2e6'}"/>` + T(x + 5, y + 13, String(d + 1), { size: 10, fill: MUTED }) + T(x + 27, y + 33, miss ? '0' : w.toLocaleString('en-GB'), { size: 12.5, weight: 700, fill: miss ? RED : GREEN, anchor: 'middle' })
  }
  s += `<rect x="20" y="318" width="300" height="12" rx="6" fill="#e5ddd0"/><rect x="20" y="318" width="${r4((300 * Math.min(total, 90000)) / 90000)}" height="12" rx="6" fill="${GREEN}"/>` + T(420, 328, `${Math.round(total / 1000)}k / 90k`, { size: 12, weight: 700, fill: INK, anchor: 'end' })
  return svg(440, 340, s)
}

// ---------- manuscript title pages (340 x 441) ----------
export function titlePage({ draft, words, coffee }) {
  let s = `<rect width="340" height="441" fill="#ffffff"/>` + T(24, 34, 'J. R. Hale', { size: 12, font: MONO, fill: INK }) + T(316, 34, `${words} words`, { size: 12, font: MONO, fill: INK, anchor: 'end' })
  s += T(170, 180, 'THE LAST HOUR', { size: 22, font: MONO, weight: 700, fill: INK, anchor: 'middle' }) + T(170, 210, 'a novel', { size: 14, font: MONO, fill: INK, anchor: 'middle' }) + T(170, 260, draft, { size: 15, font: MONO, weight: 700, fill: '#6d6475', anchor: 'middle', ls: 2 })
  if (coffee) s += `<circle cx="252" cy="352" r="38" fill="none" stroke="#b8875a" stroke-width="6" opacity="0.35"/>` + T(60, 360, 'TK: fix ch. 6!', { size: 18, font: SERIF, style: 'italic', fill: RED, rot: -6 })
  return svg(340, 441, s)
}
export const sticky = svg(120, 120, `<rect width="120" height="120" fill="#f7e463"/>` + T(60, 34, 'DRAFT 2', { size: 15, font: SERIF, style: 'italic', weight: 700, fill: INK, anchor: 'middle' }) + T(60, 62, '−10%', { size: 26, font: SERIF, style: 'italic', weight: 700, fill: RED, anchor: 'middle' }) + T(60, 92, 'cut Ruth', { size: 14, font: SERIF, style: 'italic', fill: INK, anchor: 'middle' }))

// ---------- word count status bar (480 x 170) ----------
export function wordBar(goal, label) {
  const pct = Math.min(1, 86612 / goal[1])
  let s = `<rect width="480" height="170" rx="10" fill="#e9e9ec"/><rect x="60" y="10" width="360" height="70" fill="#ffffff"/>` + bars(80, 26, [310, 300, 316, 220], { lh: 12, h: 4, fill: '#a9a3a9' })
  s += T(20, 104, `Goal ${goal[0].toLocaleString('en-GB')}–${goal[1].toLocaleString('en-GB')}`, { size: 12, weight: 700, fill: '#3a3d45' }) + T(460, 104, label, { size: 12, fill: '#6d6475', anchor: 'end' })
  s += `<rect x="20" y="112" width="440" height="10" rx="5" fill="#cfd2d8"/><rect x="${20 + (440 * goal[0]) / goal[1]}" y="112" width="${440 - (440 * goal[0]) / goal[1]}" height="10" fill="#bfe3c8"/><rect x="20" y="112" width="${r4(440 * pct)}" height="10" rx="5" fill="${GREEN}"/>`
  s += `<rect y="132" width="480" height="38" rx="0" fill="#2b5797"/>` + T(16, 156, 'Page 312 of 330', { size: 13, fill: '#ffffff' }) + T(240, 157, 'Words: 86,612', { size: 16, weight: 700, fill: '#ffffff', anchor: 'middle' }) + T(464, 156, 'English (UK)', { size: 13, fill: '#ffffff', anchor: 'end' })
  return svg(480, 170, s)
}

// ---------- reverse outline (440 x 320) ----------
export const reverseOutline = (() => {
  const rows = [['1', 'Maya starts the night shift', 'sets the routine'], ['2', 'Finds the list', 'safe → afraid'], ['3', 'Coffee with Ruth', 'nothing', 'CUT?'], ['4', 'Tells security', 'trust → betrayed'], ['5', 'Hides in the pharmacy', 'hunted → hidden'], ['6', 'Flashback: old patient', 'nothing', 'MOVE?'], ['7', 'Warns bed four', 'fear → courage'], ['8', 'The roof at dawn', 'silent → speaks']]
  let s = `<rect width="440" height="320" fill="${PAPER}"/>` + T(20, 30, 'REVERSE OUTLINE · DRAFT 1', { size: 14, weight: 700, fill: INK, ls: 2 })
  s += T(20, 56, 'CH', { size: 11, weight: 700, fill: MUTED }) + T(56, 56, 'WHAT HAPPENS', { size: 11, weight: 700, fill: MUTED }) + T(262, 56, 'WHAT CHANGES', { size: 11, weight: 700, fill: MUTED }) + `<line x1="16" y1="64" x2="424" y2="64" stroke="${INK}" stroke-width="1.5"/>`
  rows.forEach(([c, h, ch, flag], i) => {
    const y = 88 + i * 29
    if (flag) s += `<rect x="16" y="${y - 19}" width="408" height="26" fill="#fbe3df"/>`
    s += T(24, y, c, { size: 14, weight: 700, fill: INK }) + T(56, y, h, { size: 14, fill: INK }) + T(262, y, ch, { size: 14, fill: flag ? RED : INK, style: flag ? 'italic' : undefined }) + (flag ? T(420, y, flag, { size: 13, weight: 700, fill: RED, anchor: 'end' }) : '')
  })
  return svg(440, 320, s)
})()

// ---------- beta readers page (400 x 520) ----------
export const betaPage = (() => {
  const notes = [[100, 'A', 'bored here', '#e8913a'], [196, 'B', 'who is Ruth?', '#3f73b5'], [300, 'C', 'loved this!', GREEN], [400, 'A', 'stopped here', RED]]
  let s = `<rect width="400" height="520" fill="${PAPER}"/>` + bars(24, 40, Array.from({ length: 28 }, (_, i) => (i % 7 === 6 ? 120 : 210 + ((i * 37) % 30))), { lh: 15, h: 5, fill: '#c7beae' })
  notes.forEach(([y, who, t, c]) => {
    s += `<path d="M262 ${y - 14} v28" stroke="${c}" stroke-width="3"/><rect x="270" y="${y - 22}" width="124" height="40" rx="8" fill="${c}" opacity="0.16" stroke="${c}" stroke-width="2"/><circle cx="286" cy="${y - 2}" r="10" fill="${c}"/>` + T(286, y + 3, who, { size: 11, weight: 700, fill: '#ffffff', anchor: 'middle' }) + T(302, y + 3, t, { size: 12, weight: 700, fill: c })
  })
  s += `<rect x="16" y="466" width="368" height="38" rx="6" fill="#ece4d4"/>` + T(200, 490, 'Skimmed ch. 3: 3 of 5 readers', { size: 15, weight: 700, fill: INK, anchor: 'middle' })
  return svg(400, 520, s)
})()

// ---------- revision pass page (400 x 512) ----------
export const revisionPage = (() => {
  let s = `<rect width="400" height="512" fill="#ffffff"/>` + T(200, 34, '2nd draft = 1st draft − 10%', { size: 17, font: SERIF, style: 'italic', weight: 700, fill: RED, anchor: 'middle' })
  s += bars(28, 66, [330, 320, 334, 300, 326, 0, 332, 318, 330, 260, 0, 324, 334, 316, 330, 300, 0, 330, 322, 334, 210, 0, 328, 320, 330, 312], { lh: 16, h: 6, fill: '#a9a3a9' })
  s += [[82, 28, 300], [98, 28, 200], [146, 120, 330], [162, 28, 250], [274, 28, 330], [290, 28, 334]].map(([y, x1, x2]) => `<line x1="${x1}" y1="${y + 3}" x2="${x2}" y2="${y + 3}" stroke="${RED}" stroke-width="3"/>`).join('')
  s += T(214, 136, 'she ran', { size: 16, font: SERIF, style: 'italic', fill: RED }) + `<path d="M210 140 l6 10 l6 -10" fill="none" stroke="${RED}" stroke-width="2"/>`
  s += `<circle cx="352" cy="440" r="34" fill="none" stroke="${RED}" stroke-width="3"/>` + T(352, 448, '−10%', { size: 18, font: SERIF, weight: 700, fill: RED, anchor: 'middle' })
  return svg(400, 512, s)
})()

// ---------- editing levels (400 x 512) ----------
const edBase = (title, sub) => `<rect width="400" height="512" fill="#ffffff"/><rect width="400" height="52" fill="#eef1f6"/>` + T(20, 24, title, { size: 15, weight: 700, fill: '#1d4e89', ls: 2 }) + T(20, 42, sub, { size: 12, fill: '#4b5563' })
export const EDITS = {
  developmental: svg(400, 512, edBase('DEVELOPMENTAL EDIT', 'structure, plot, character, pacing') + bars(24, 80, [250, 244, 252, 230, 0, 250, 246, 240, 252, 180, 0, 248, 252, 240, 236, 0, 250, 244, 252, 200, 0, 246, 252, 238], { lh: 16, h: 6, fill: '#b9b3b9' }) +
    `<path d="M16 76 v62" stroke="#1d4e89" stroke-width="4"/><path d="M16 236 v62" stroke="#1d4e89" stroke-width="4"/>` +
    [[96, 'Move ch. 7 before ch. 5?'], [180, 'Voss needs a reason'], [252, 'Cut the Ruth subplot'], [340, 'Midpoint comes too late']].map(([y, t]) => `<rect x="280" y="${y - 18}" width="112" height="${wrap(t, 15).length * 16 + 12}" rx="6" fill="#dbe7f7"/>` + wrap(t, 15).map((l, i) => T(288, y + i * 16, l, { size: 12, fill: '#1d4e89', weight: 700 })).join('')).join('')),
  line: svg(400, 512, edBase('LINE EDIT', 'sentences, rhythm, word choice') +
    [['She was very scared and she ran', 'She ran.'], ['down the stairs that went down.', 'Down the stairs.'], ['The door was locked, which was bad.', 'Locked.']].map(([a, b], i) => {
      const y = 104 + i * 92
      return T(24, y, a, { size: 17, font: SERIF, fill: INK }) + `<line x1="24" y1="${y - 6}" x2="${24 + a.length * 7.4}" y2="${y - 6}" stroke="${RED}" stroke-width="2.5"/>` + T(30, y + 32, b, { size: 19, font: SERIF, style: 'italic', weight: 700, fill: RED })
    }).join('') + T(380, 108, 'tighten', { size: 13, weight: 700, fill: RED, anchor: 'end' }) + T(380, 200, 'repetition', { size: 13, weight: 700, fill: RED, anchor: 'end' }) + bars(24, 380, [330, 320, 334, 300, 260], { lh: 16, h: 6, fill: '#b9b3b9' })),
  copy: svg(400, 512, edBase('COPYEDIT', 'grammar, consistency, facts, house style') +
    TR(24, 100, ['Dr ', ['Vos', { fill: RED, weight: 700 }], ' smiled. (Voss on p. 12?)'], { size: 17, font: SERIF }) + TR(24, 150, ['Back by ', ['6:00 AM', { fill: RED, weight: 700 }], ' (style: 6 a.m.)'], { size: 17, font: SERIF }) + TR(24, 200, ['St Judes', ['’', { fill: RED, weight: 700 }], 's ward, on Tuesday, 14 January'], { size: 17, font: SERIF }) +
    `<rect x="20" y="236" width="360" height="150" rx="6" fill="#f3f4f6" stroke="#9ca3af"/>` + T(34, 260, 'STYLE SHEET', { size: 12, weight: 700, fill: '#374151', ls: 2 }) +
    ['Voss (two s)', 'St Jude’s Hospital', 'times: 6 a.m., 2 a.m.', 'Ward 6 (numeral)', 'OK: “gonna” in dialogue only'].map((t, i) => T(34, 284 + i * 20, t, { size: 13, fill: '#374151' })).join('')),
  proof: svg(400, 512, edBase('PROOFREAD', 'last check of the typeset pages') +
    TR(24, 100, ['She ran down ', ['teh', { fill: RED, weight: 700 }], ' stairs.'], { size: 18, font: SERIF }) + `<path d="M126 104 q8 10 16 0 q8 -10 16 0" fill="none" stroke="${RED}" stroke-width="2"/>` + T(380, 100, 'tr', { size: 15, weight: 700, fill: RED, anchor: 'end' }) +
    TR(24, 160, ['past the the', ' dark pharmacy'], { size: 18, font: SERIF }) + `<path d="M84 150 h28" stroke="${RED}" stroke-width="2.5"/>` + T(380, 160, 'del', { size: 15, weight: 700, fill: RED, anchor: 'end' }) +
    TR(24, 220, ['Locked', ['  ', {}], 'Of course.'], { size: 18, font: SERIF }) + `<circle cx="84" cy="216" r="6" fill="none" stroke="${RED}" stroke-width="2"/><circle cx="84" cy="216" r="1.6" fill="${RED}"/>` + T(380, 220, 'add .', { size: 15, weight: 700, fill: RED, anchor: 'end' }) +
    bars(24, 270, [330, 320, 334, 300, 326, 0, 332, 318, 330, 260], { lh: 16, h: 6, fill: '#b9b3b9' })),
}

// ---------- standard manuscript format page (400 x 518) ----------
export const shunnPage = svg(400, 518, `<rect width="400" height="518" fill="#ffffff"/>` +
  ['Jordan R. Hale', '12 Elm Street', 'Boston, MA 02118', 'jr@hale.example'].map((l, i) => T(40, 44 + i * 13, l, { size: 10.5, font: MONO, fill: INK })).join('') + T(360, 44, 'about 86,600 words', { size: 10.5, font: MONO, fill: INK, anchor: 'end' }) +
  T(200, 230, 'THE LAST HOUR', { size: 14, font: MONO, fill: INK, anchor: 'middle' }) + T(200, 256, 'by J. R. Hale', { size: 12, font: MONO, fill: INK, anchor: 'middle' }) +
  T(200, 300, 'Chapter One', { size: 12, font: MONO, fill: INK, anchor: 'middle' }) +
  ['    The night shift had always suited', 'Maya Cole. For six years she had', 'worked the quiet hours, learning which', 'doors stuck and which doctors lied.', '    The list was clipped to the board'].map((l, i) => T(40, 336 + i * 26, l, { size: 12, font: MONO, fill: INK })).join('') +
  `<path d="M14 330 v120 M386 330 v120" stroke="#9ca3af" stroke-width="1" stroke-dasharray="3 3"/>` + T(392, 400, '1"', { size: 9, fill: '#9ca3af' }) + T(330, 486, 'double-spaced', { size: 10, fill: '#9ca3af', anchor: 'middle' }))

// ---------- publishing paths (440 x 320) ----------
function flow(title, steps, note, color) {
  let s = `<rect width="440" height="320" rx="16" fill="${DARK}"/>` + T(220, 32, title, { size: 15, weight: 700, fill: color, anchor: 'middle', ls: 3 })
  const n = steps.length
  steps.forEach((t, i) => {
    const col = i % 3, row = Math.floor(i / 3), x = row % 2 ? 296 - col * 138 : 20 + col * 138, y = 60 + row * 96
    s += `<rect x="${x}" y="${y}" width="124" height="60" rx="10" fill="${i === n - 1 ? color : '#2f4456'}"/>` + wrap(t, 14).map((l, j, a) => T(x + 62, y + 34 - (a.length - 1) * 8 + j * 16, l, { size: 13.5, weight: 700, fill: i === n - 1 ? DARK : '#f4efe6', anchor: 'middle' })).join('')
    if (i < n - 1) {
      const nc = (i + 1) % 3, nr = Math.floor((i + 1) / 3)
      if (nr === row) s += row % 2 ? arrow(x - 2, y + 30, x - 12, y + 30, color, 3, 9) : arrow(x + 126, y + 30, x + 136, y + 30, color, 3, 9)
      else s += arrow(x + 62, y + 62, x + 62, y + 92, color, 3, 9)
      void nc
    }
  })
  s += wrap(note, 54).map((l, i) => T(220, 272 + i * 20, l, { size: 14, fill: '#d9d2c5', anchor: 'middle' })).join('')
  return svg(440, 320, s)
}
export const PUBLISH = {
  traditional: flow('TRADITIONAL', ['Manuscript', 'Query letters', 'Literary agent', 'Publisher', 'Bookshops', 'Readers'], 'The publisher pays for editing, cover and print, and pays you an advance and royalties.', GOLD),
  self: flow('SELF-PUBLISHING', ['Manuscript', 'Hire editor and cover', 'Upload to stores', 'Readers'], 'You act as the publisher: you pay the costs and keep the rights and control.', TEAL),
  hybrid: flow('HYBRID', ['Manuscript', 'Author pays fees', 'Hybrid publisher', 'Readers'], 'You pay for publication; the publisher’s name goes on the book. Costs vary widely.', '#c49be8'),
}
