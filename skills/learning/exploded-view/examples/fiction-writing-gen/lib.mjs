// Helpers for the fiction-writing exploded view generator (throwaway).
export const SANS = 'Liberation Sans, Arial, sans-serif'
export const SERIF = 'Liberation Serif, Georgia, serif'
export const MONO = 'Liberation Mono, Courier New, monospace'

export const r4 = (v) => Math.round(v * 1e4) / 1e4
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`

// One <text> element. Options: size, fill, font, weight, anchor, style, ls, op, rot
export function T(x, y, s, o = {}) {
  const a = [`x="${x}"`, `y="${y}"`, `font-family="${o.font ?? SANS}"`, `font-size="${o.size ?? 14}"`, `fill="${o.fill ?? '#2a2530'}"`]
  if (o.weight) a.push(`font-weight="${o.weight}"`)
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`)
  if (o.style) a.push(`font-style="${o.style}"`)
  if (o.ls) a.push(`letter-spacing="${o.ls}"`)
  if (o.op != null) a.push(`opacity="${o.op}"`)
  if (o.rot) a.push(`transform="rotate(${o.rot} ${x} ${y})"`)
  return `<text ${a.join(' ')}>${esc(s)}</text>`
}

// Text made of styled segments: [[text, {fill, weight, style}], ...]
export function TR(x, y, segs, o = {}) {
  const inner = segs.map((s) => (typeof s === 'string' ? esc(s) : `<tspan${s[1].fill ? ` fill="${s[1].fill}"` : ''}${s[1].weight ? ` font-weight="${s[1].weight}"` : ''}${s[1].style ? ` font-style="${s[1].style}"` : ''}>${esc(s[0])}</tspan>`)).join('')
  const a = [`x="${x}"`, `y="${y}"`, `font-family="${o.font ?? SANS}"`, `font-size="${o.size ?? 14}"`, `fill="${o.fill ?? '#2a2530'}"`]
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`)
  if (o.style) a.push(`font-style="${o.style}"`)
  if (o.weight) a.push(`font-weight="${o.weight}"`)
  return `<text ${a.join(' ')} xml:space="preserve">${inner}</text>`
}

export function wrap(text, max) {
  const lines = []
  let cur = ''
  for (const w of text.split(/\s+/)) {
    if (cur && (cur + ' ' + w).length > max) {
      lines.push(cur)
      cur = w
    } else cur = cur ? cur + ' ' + w : w
  }
  if (cur) lines.push(cur)
  return lines
}
export const para = (x, y, text, max, lh, o) => wrap(text, max).map((l, i) => T(x, y + i * lh, l, o)).join('')

// Grey bars that read as lines of text. widths in px.
export function bars(x, y, widths, { lh = 14, h = 5, fill = '#bdb4a5' } = {}) {
  return widths.map((w, i) => `<rect x="${x}" y="${y + i * lh}" width="${w}" height="${h}" rx="1.5" fill="${fill}"/>`).join('')
}

// Deterministic pseudo-random numbers
export function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// ---- rotation maths (three.js Euler order XYZ, degrees) ----
const RAD = Math.PI / 180
export function mat([x, y, z]) {
  const a = Math.cos(x * RAD), b = Math.sin(x * RAD), c = Math.cos(y * RAD), d = Math.sin(y * RAD), e = Math.cos(z * RAD), f = Math.sin(z * RAD)
  const ae = a * e, af = a * f, be = b * e, bf = b * f
  return [
    [c * e, -c * f, d],
    [af + be * d, ae - bf * d, -b * c],
    [bf - ae * d, be + af * d, a * c],
  ]
}
export function euler(m) {
  const y = Math.asin(Math.max(-1, Math.min(1, m[0][2])))
  let x, z
  if (Math.abs(m[0][2]) < 0.9999999) {
    x = Math.atan2(-m[1][2], m[2][2])
    z = Math.atan2(-m[0][1], m[0][0])
  } else {
    x = Math.atan2(m[2][1], m[1][1])
    z = 0
  }
  return [x, y, z].map((v) => Math.round((v / RAD) * 100) / 100 + 0)
}
const mul = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]))
export const apply = (M, v) => M.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2])

// Rotate a whole assembly about the origin by Euler `rot`, then move by `off`.
export function turn(parts, rot, off = [0, 0, 0]) {
  const M = mat(rot)
  return parts.map((p) => {
    const q = { ...p }
    q.pos = apply(M, p.pos ?? [0, 0, 0]).map((v, i) => r4(v + off[i]))
    const e = euler(mul(M, mat(p.rot ?? [0, 0, 0])))
    if (e.some((v) => v !== 0)) q.rot = e
    else delete q.rot
    return q
  })
}
export const turnPoint = (pt, rot, off = [0, 0, 0]) => apply(mat(rot), pt).map((v, i) => r4(v + off[i]))

// Euler rotation that points local +y along direction d
export function aimY(d) {
  const L = Math.hypot(...d)
  const [x, y, z] = d.map((v) => v / L)
  // axis = (0,1,0) x d = (z, 0, -x); angle = acos(y)
  const ax = [z, 0, -x]
  const s = Math.hypot(...ax)
  if (s < 1e-9) return y > 0 ? [0, 0, 0] : [180, 0, 0]
  const k = ax.map((v) => v / s)
  const ang = Math.acos(Math.max(-1, Math.min(1, y)))
  const c = Math.cos(ang), sn = Math.sin(ang), t = 1 - c
  const [kx, ky, kz] = k
  const m = [
    [t * kx * kx + c, t * kx * ky - sn * kz, t * kx * kz + sn * ky],
    [t * kx * ky + sn * kz, t * ky * ky + c, t * ky * kz - sn * kx],
    [t * kx * kz - sn * ky, t * ky * kz + sn * kx, t * kz * kz + c],
  ]
  return euler(m)
}

// A cylinder from point a to point b
export function rod(a, b, radius, color, extra = {}) {
  const d = b.map((v, i) => v - a[i])
  return { shape: 'cylinder', radiusTop: radius, radiusBottom: radius, height: r4(Math.hypot(...d)), pos: a.map((v, i) => r4((v + b[i]) / 2)), rot: aimY(d), color, ...extra }
}

// Map a point in an SVG card (W x H viewBox) to look coordinates of a plane (w x h) centred at c
export const cardPt = (vx, vy, W, H, w, h, c = [0, 0, 0]) => [r4(c[0] + (vx / W - 0.5) * w), r4(c[1] + (0.5 - vy / H) * h), r4(c[2])]

// A flat card: optional backing box plus an SVG plane
export function card(svgStr, w, h, { back, thick = 0.008, slot, pos = [0, 0, 0] } = {}) {
  const parts = []
  if (back) parts.push({ shape: 'box', size: [w, h, thick], pos: [pos[0], pos[1], r4(pos[2] - thick / 2 - 0.002)], color: back, material: 'matte', ...(slot ? { slot: slot + '-back' } : {}) })
  parts.push({ shape: 'plane', size: [w, h], pos: [...pos], svg: svgStr, ...(slot ? { slot } : {}) })
  return parts
}

// Chess-pawn style figure (lathe), height about 0.5 * s
const PAWN = [[0, 0], [0.15, 0], [0.15, 0.03], [0.12, 0.055], [0.08, 0.09], [0.06, 0.2], [0.05, 0.3], [0.09, 0.322], [0.09, 0.342], [0.055, 0.358], [0.075, 0.385], [0.086, 0.42], [0.076, 0.462], [0.045, 0.49], [0, 0.5]]
export const pawn = (color, pos, s = 1, extra = {}) => ({ shape: 'lathe', profile: PAWN.map(([r, y]) => [r4(r * s), r4(y * s)]), smooth: true, pos, color, material: 'gloss', ...extra })

// SVG arc on a gauge: angles in maths degrees (0 = right, 90 = up), a1 > a2
export function arc(cx, cy, r, a1, a2) {
  const p = (a) => `${r4(cx + r * Math.cos(a * RAD))} ${r4(cy - r * Math.sin(a * RAD))}`
  return `M${p(a1)} A${r} ${r} 0 0 1 ${p(a2)}`
}
export const polar = (cx, cy, r, a) => [r4(cx + r * Math.cos(a * RAD)), r4(cy - r * Math.sin(a * RAD))]
