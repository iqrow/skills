// Exploded-view viewer. Reads <script type="application/json" id="field"> and renders it with three.js.
// Bundled into kit/viewer.js by kit/src/bundle.mjs; build.mjs inlines that bundle into each page.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const fieldEl = document.getElementById('field')
const field = JSON.parse(fieldEl.textContent)
// Path of the field's JSON on the author's machine. `build.mjs --public` leaves it out:
// a public page links to the skill instead of offering the Copy prompt.
const fieldFile = fieldEl.dataset.file
const SKILL_URL = 'https://github.com/iqrow/skills'
const byId = new Map(field.nodes.map((n) => [n.id, n]))
const parentOf = new Map()
for (const n of field.nodes) for (const c of n.children ?? []) parentOf.set(c, n.id)
const incoming = new Map()
for (const n of field.nodes)
  for (const l of n.links ?? []) {
    if (!incoming.has(l.to)) incoming.set(l.to, [])
    incoming.get(l.to).push({ from: n.id, rel: l.rel })
  }
const patternUsers = new Map()
for (const n of field.nodes) if (n.pattern) patternUsers.set(n.pattern, [...(patternUsers.get(n.pattern) ?? []), n.id])
const loopsThrough = new Map()
for (const n of field.nodes) for (const t of n.loop?.through ?? []) if (t !== n.id) loopsThrough.set(t, [...(loopsThrough.get(t) ?? []), n.id])

const KIND = {
  product: { label: 'Product', color: '#ECE5F1' },
  part: { label: 'Part', color: '#ECE5F1' },
  process: { label: 'Process: a step that makes or changes parts', short: 'Process', color: '#C9A45C' },
  knob: { label: 'Knob: a setting you choose', short: 'Knob', color: '#E663B5' },
  measure: { label: 'Measure: how you check', short: 'Measure', color: '#7FA8D9' },
  loop: { label: 'Feedback loop', short: 'Loop', color: '#7FC79A' },
  pattern: { label: 'Pattern: repeats across fields', short: 'Pattern', color: '#B79CE0' },
  concept: { label: 'Concept: an idea to think with', short: 'Concept', color: '#9686A2' },
}
const REL_OUT = { raises: 'Raises', lowers: 'Lowers', 'made from': 'Made from', 'made by': 'Made by', 'measured by': 'Measured by', controls: 'Controls', 'see also': 'See also' }
const REL_IN = { raises: 'Raised by', lowers: 'Lowered by', 'made from': 'Goes into', 'made by': 'Makes', 'measured by': 'Measures', controls: 'Controlled by', 'see also': 'See also' }
const LOOP_TEXT = {
  reinforcing: 'Reinforcing: each turn makes the next one bigger. Growth, or a snowball.',
  balancing: 'Balancing: each turn pushes back toward a set point. A brake, or a thermostat.',
  's-curve': 'S-curve: a reinforcing loop that meets a brake. Fast growth, then it levels off.',
  cycle: 'Cycle: the same steps come round again in order. A play loop, a routine, a turn.',
}
const SERIES = ['#E663B5', '#C9A45C', '#7FA8D9', '#7FC79A', '#B79CE0', '#E07A6F']
const BG = '#1B1621'
const S_FOCUS = 1.55
const S_CHILD = 0.72
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- DOM ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'html') el.innerHTML = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)))
  return el
}

// ---------- links ----------
// Every node has its own URL. Served from a folder URL (https://host/ or https://host/dir/), a node is the path
// <folder><id>, so the server must answer every path in the folder with this page. Opened as a file, or by a URL
// ending in .html, a page can change only its fragment, so a node is #<id>.
const usePaths = location.protocol !== 'file:' && !location.pathname.endsWith('.html')
const home = usePaths ? location.pathname.replace(/[^/]*$/, '') : location.pathname + location.search
const baseTitle = document.title
const hrefOf = (id) => (id === field.root ? home : (usePaths ? home : '#') + encodeURIComponent(id))
function idFromUrl() {
  let id = (usePaths && location.pathname.slice(home.length)) || location.hash.slice(1)
  try { id = decodeURIComponent(id) } catch { return field.root }
  return byId.has(id) ? id : field.root
}
// A plain click opens the node in place. A middle or modified click falls through to the browser: new tab, new window.
function link(id, attrs, open, ...kids) {
  return h('a', { ...attrs, href: hrefOf(id), onclick: (e) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    open()
  } }, ...kids)
}
const crumbsEl = h('nav', { class: 'ev-crumbs', 'aria-label': 'Path' })
const btnExplode = h('button', { type: 'button', onclick: () => toggleExplode() }, 'Explode')
const btnFlat = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => (mode === 'flatpack' ? leaveFlatpack() : enterFlatpack()) }, 'Flatpack')
const btnIndex = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => toggleIndex() }, 'Index')
const canvas = h('canvas', { 'aria-label': `${field.title}: 3D exploded view` })
const labelsEl = h('div', { class: 'ev-labels' })
const hintEl = h('div', { class: 'ev-hint' })
const panelEl = h('aside', { class: 'ev-panel', 'aria-live': 'polite' })
const stripEl = h('footer', { class: 'ev-strip' })
const indexEl = h('div', { class: 'ev-index', hidden: true })
const stageEl = h('main', { class: 'ev-stage' }, canvas, labelsEl, hintEl, indexEl)
document.body.append(
  h('div', { class: 'ev' },
    h('header', { class: 'ev-bar' },
      crumbsEl,
      h('div', { class: 'ev-title' }, h('b', {}, field.title), h('span', {}, `“${field.prompt}”`)),
      h('div', { class: 'ev-actions' }, btnExplode, btnFlat, btnIndex)),
    stageEl, panelEl, stripEl),
)

// ---------- three.js ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
const scene = new THREE.Scene()
scene.background = new THREE.Color(BG)
scene.fog = new THREE.Fog(BG, 10, 26)
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.85
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100)
camera.position.set(0, 1.4, 4.6)
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.05, 0)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.enablePan = false
controls.minDistance = 1.6
controls.maxDistance = 18
controls.minPolarAngle = 0.25
controls.maxPolarAngle = Math.PI * 0.6
scene.add(new THREE.HemisphereLight('#d9c8ff', '#2a1f30', 0.8))
const keyLight = new THREE.DirectionalLight('#fff3e6', 1.4)
keyLight.position.set(3, 5, 4)
scene.add(keyLight)
const rimLight = new THREE.DirectionalLight('#e663b5', 0.9)
rimLight.position.set(-4, 2, -3)
scene.add(rimLight)

function canvasTexture(size, draw) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
const dotTexture = canvasTexture(64, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.45, 'rgba(255,255,255,0.85)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, s, s)
})
const shadowTexture = canvasTexture(128, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  r.addColorStop(0, 'rgba(0,0,0,0.55)')
  r.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = r
  g.fillRect(0, 0, s, s)
})
const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }))
floor.rotation.x = -Math.PI / 2
floor.position.y = -S_FOCUS * 0.56
floor.scale.setScalar(1.5)
scene.add(floor)

// ---------- visuals ----------
const hashOf = (s) => { let x = 2166136261; for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return (x >>> 0) / 4294967296 }
const deg = (v) => (v * Math.PI) / 180

function material(p) {
  const color = new THREE.Color(p.color ?? '#c8bfd0')
  const opacity = p.opacity ?? 1
  let m
  if (p.svg) m = new THREE.MeshBasicMaterial({ color: '#141018', side: THREE.DoubleSide, toneMapped: false })
  else switch (p.material) {
    case 'glass': m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.6 }); break
    case 'liquid': m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 0.8, emissive: color.clone().multiplyScalar(0.22) }); break
    case 'foam': m = new THREE.MeshStandardMaterial({ color, roughness: 0.95 }); break
    case 'gloss': m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, clearcoat: 0.7 }); break
    case 'metal': m = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.9 }); break
    case 'screen': m = new THREE.MeshBasicMaterial({ color, toneMapped: false }); break
    case 'glow': m = new THREE.MeshBasicMaterial({ color, toneMapped: false }); break
    default: m = new THREE.MeshStandardMaterial({ color, roughness: 0.78 })
  }
  m.transparent = true
  m.userData.base = p.material === 'glass' && p.opacity == null ? 0.22 : opacity
  return m
}

function paintSvg(mat, svg, size) {
  const [w, hgt] = size ?? [1, 1]
  const W = 1024
  const H = Math.max(16, Math.round((W * hgt) / w))
  const sized = svg.replace(/<svg\b([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, '')} width="${W}" height="${H}">`)
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    c.getContext('2d').drawImage(img, 0, 0, W, H)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    mat.map = t
    mat.color.set('#ffffff')
    mat.needsUpdate = true
  }
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized)
}

function particles(p, anims) {
  const n = p.count
  const [w, hgt, d] = p.box
  const pos = new Float32Array(n * 3)
  const seed = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * w
    pos[i * 3 + 1] = (Math.random() - 0.5) * hgt
    pos[i * 3 + 2] = (Math.random() - 0.5) * d
    seed[i] = Math.random()
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const m = new THREE.PointsMaterial({ color: p.color ?? '#ffffff', size: 3, sizeAttenuation: false, map: dotTexture, transparent: true, depthWrite: false, alphaTest: 0.01 })
  m.userData.base = p.opacity ?? 1
  m.userData.baseSize = p.size ?? 0.02
  const pts = new THREE.Points(geo, m)
  const speed = hgt * 0.22
  if (!reducedMotion) anims.push((t, dt) => {
    const a = geo.attributes.position.array
    for (let i = 0; i < n; i++) {
      const j = i * 3
      if (p.motion === 'rise') {
        a[j + 1] += dt * speed * (0.5 + seed[i])
        if (a[j + 1] > hgt / 2) a[j + 1] = -hgt / 2
      } else if (p.motion === 'settle') {
        a[j + 1] -= dt * speed * 0.3 * (0.4 + seed[i])
        if (a[j + 1] < -hgt / 2) a[j + 1] = hgt / 2
      } else if (p.motion === 'drift') {
        a[j] += Math.sin(t * 0.6 + seed[i] * 40) * dt * 0.06 * w
        a[j + 2] += Math.cos(t * 0.5 + seed[i] * 30) * dt * 0.06 * d
        a[j + 1] += Math.sin(t * 0.4 + seed[i] * 20) * dt * 0.04 * hgt
      } else if (p.motion === 'orbit') {
        const x = a[j], z = a[j + 2], r = dt * 0.5
        a[j] = x * Math.cos(r) - z * Math.sin(r)
        a[j + 2] = x * Math.sin(r) + z * Math.cos(r)
      }
    }
    geo.attributes.position.needsUpdate = true
  })
  return pts
}

// A box whose front outline has rounded corners of `radius`: phones, tablets, cards, TV panels.
function slab(w, hgt, d, radius) {
  const b = Math.min(d * 0.3, radius * 0.5)
  const x = w / 2 - b, y = hgt / 2 - b
  const r = Math.max(0.001, Math.min(radius - b, x, y))
  const s = new THREE.Shape()
  s.moveTo(-x + r, -y)
  s.lineTo(x - r, -y)
  s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x, y - r)
  s.absarc(x - r, y - r, r, 0, Math.PI / 2, false)
  s.lineTo(-x + r, y)
  s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-x, -y + r)
  s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false)
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 12 })
  g.center()
  return g
}

function buildPart(p, anims) {
  let obj
  const m = () => material(p)
  // cutaway: a wedge of p.cut degrees is removed, centred on +z, the side the camera starts on
  const arc = [deg(p.cut ?? 0) / 2, Math.PI * 2 - deg(p.cut ?? 0)]
  switch (p.shape) {
    case 'lathe': {
      let pts = p.profile.map(([r, y]) => new THREE.Vector3(r, y, 0))
      if (p.smooth && pts.length > 2) pts = new THREE.CatmullRomCurve3(pts, false, 'centripetal').getPoints(pts.length * 10)
      obj = new THREE.Mesh(new THREE.LatheGeometry(pts.map((v) => new THREE.Vector2(Math.max(0, v.x), v.y)), 72, ...arc), m())
      break
    }
    case 'cylinder': obj = new THREE.Mesh(new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 64, 1, false, ...arc), m()); break
    case 'box': { const [w, hh, d] = p.size; obj = new THREE.Mesh(p.radius ? slab(w, hh, d, p.radius) : new RoundedBoxGeometry(w, hh, d, 3, Math.min(w, hh, d) * 0.12), m()); break }
    case 'sphere': obj = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 48, 32), m()); break
    case 'cone': obj = new THREE.Mesh(new THREE.ConeGeometry(p.radius, p.height, 64), m()); break
    case 'torus': obj = new THREE.Mesh(new THREE.TorusGeometry(p.radius, p.tube, 24, 96), m()); break
    case 'plane': obj = new THREE.Mesh(new THREE.PlaneGeometry(p.size[0], p.size[1]), m()); break
    case 'particles': obj = particles(p, anims); break
  }
  if (p.cut) obj.material.side = THREE.DoubleSide
  if (p.pos) obj.position.fromArray(p.pos)
  if (p.rot) obj.rotation.set(deg(p.rot[0]), deg(p.rot[1]), deg(p.rot[2]))
  if (p.svg && obj.material) paintSvg(obj.material, p.svg, p.size)
  if (p.face === 'camera') {
    const q = new THREE.Quaternion()
    anims.push(() => {
      obj.parent.getWorldQuaternion(q)
      obj.quaternion.copy(q.invert().multiply(camera.quaternion))
    })
  }
  if (!reducedMotion && p.shape !== 'particles') {
    if (p.motion === 'spin') anims.push((t, dt) => (obj.rotation.y += dt * 0.6))
    if (p.motion === 'bob') {
      const y0 = obj.position.y
      const amp = 0.04 * (p.size?.[1] ?? p.height ?? p.radius ?? 0.5)
      anims.push((t) => (obj.position.y = y0 + Math.sin(t * 1.7) * amp))
    }
  }
  return obj
}

function composeLook(node, sel) {
  let parts = node.look.parts.map((p) => ({ ...p }))
  const chosen = (node.variants ?? []).map((cat, ci) => cat.items[sel?.[ci] ?? 0])
  for (const item of chosen) {
    if (!item.look) continue
    const slots = new Set(item.look.parts.map((p) => p.slot))
    parts = parts.filter((p) => !slots.has(p.slot)).concat(item.look.parts.map((p) => ({ ...p })))
  }
  for (const item of chosen) {
    for (const [slot, c] of Object.entries(item.tint ?? {})) for (const p of parts) if (p.slot === slot) p.color = c
    for (const [slot, s] of Object.entries(item.svg ?? {})) for (const p of parts) if (p.slot === slot) p.svg = s
  }
  return parts
}

// Warmth runs cold blue, through magenta, to amber. Spiky bodies catch more light, so they start darker.
function feelColor(f) {
  if (f.color) return new THREE.Color(f.color)
  const w = f.warmth ?? 0.5
  return new THREE.Color().setHSL((0.6 + w * 0.48) % 1, 0.8, 0.52 - w * 0.1 - (f.shape ?? 0.5) * 0.14)
}

// Bouba (shape 0): a few broad, soft lobes. Kiki (shape 1): many narrow spikes, faceted.
function buildFeel(f, seed, anims) {
  const shape = f.shape ?? 0.5
  const energy = f.energy ?? 0.3
  const grain = f.grain ?? 0.2
  let geo = new THREE.IcosahedronGeometry(1, 5)
  geo.deleteAttribute('normal')
  geo.deleteAttribute('uv')
  geo = mergeVertices(geo)
  const pos = geo.attributes.position
  const n = Math.round(5 + shape * 23)
  const dirs = []
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    const a = i * 2.39996 + seed * 6.283
    dirs.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r))
  }
  const sharp = 3 + shape * shape * 50
  const amp = 0.36 + shape * 0.42
  const wob = (1 - shape) * 0.08
  const v = new THREE.Vector3()
  let maxR = 1
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    let s = 0
    for (const d of dirs) s += Math.pow(Math.max(0, v.dot(d)), sharp)
    const w = wob * Math.sin(2.6 * v.x + seed * 9) * Math.sin(2.2 * v.y + seed * 7) * Math.sin(2.9 * v.z + seed * 5)
    const r = 1 + amp * Math.min(s, 1.3) + w
    maxR = Math.max(maxR, r)
    v.multiplyScalar(r)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  const color = feelColor(f)
  const mat = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.2 + grain * 0.68, clearcoat: (1 - grain) * 0.8 * (1 - shape * 0.75), clearcoatRoughness: 0.25,
    envMapIntensity: 0.55 * (1 - shape * 0.6), specularIntensity: 1 - shape * 0.6,
    emissive: color.clone().multiplyScalar(0.1), flatShading: shape > 0.62, transparent: true,
  })
  mat.userData.base = 1
  const body = new THREE.Mesh(geo, mat)
  const g = new THREE.Group()
  g.add(body)
  if (grain > 0.35) {
    const halo = particles({ count: Math.round(40 + grain * 160), box: [2.6, 2.6, 2.6], size: 0.035, color: '#' + color.getHexString(), motion: 'drift' }, anims)
    g.add(halo)
  }
  g.scale.setScalar(1 / (2 * maxR))
  if (!reducedMotion) {
    const motion = f.motion ?? 'pulse'
    const weight = f.weight ?? 0
    const speed = 0.15 + energy * 1.4
    anims.push((t, dt) => {
      body.rotation.y += dt * speed * (motion === 'spin' ? 2.2 : 0.5)
      body.rotation.x += dt * speed * 0.15
      let y = -weight * 0.12
      let x = 0, z = 0, s = 1
      if (motion === 'pulse') s = 1 + 0.07 * Math.sin(t * (1.2 + energy * 4))
      if (motion === 'drift') { x = Math.sin(t * 0.5 + seed * 9) * 0.08; z = Math.cos(t * 0.4 + seed * 5) * 0.08 }
      if (motion === 'rise') y += ((t * 0.12 * (0.5 + energy)) % 0.3) - 0.15
      if (motion === 'settle') y -= ((t * 0.08 * (0.5 + energy)) % 0.25) - 0.125
      if (motion === 'orbit') { x = Math.cos(t * speed) * 0.12; z = Math.sin(t * speed) * 0.12 }
      if (motion === 'jitter') { x = (Math.random() - 0.5) * 0.03 * (0.3 + energy); y += (Math.random() - 0.5) * 0.03 * (0.3 + energy) }
      body.position.set(x / g.scale.x, (y + Math.sin(t * 0.9 + seed * 7) * 0.02) / g.scale.x, z / g.scale.x)
      body.scale.setScalar(s)
    })
  }
  return g
}

function tube(points, radius, color, opacity = 1, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal')
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false })
  mat.userData.base = opacity
  return { mesh: new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(64, points.length * 6), radius, 10, closed), mat), curve }
}
function bead(color, r = 0.055) {
  const mat = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.7), roughness: 0.3, transparent: true })
  mat.userData.base = 1
  return new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat)
}

// A cycle's steps sit clockwise from the top of its ring, in "through" order.
const CYCLE_R = 0.42
function cycleStop(loop, i) {
  const a = (i / Math.max(2, loop.through.length)) * Math.PI * 2
  return new THREE.Vector3(Math.sin(a) * CYCLE_R, Math.cos(a) * CYCLE_R, 0)
}

function buildLoop(loop, anims) {
  const g = new THREE.Group()
  if (loop.type === 'reinforcing') {
    const pts = []
    for (let i = 0; i <= 240; i++) {
      const t = i / 240
      const a = t * Math.PI * 2 * 2.6
      const r = 0.07 + 0.43 * t
      pts.push(new THREE.Vector3(Math.cos(a) * r, (t - 0.5) * 0.55, Math.sin(a) * r))
    }
    const { mesh, curve } = tube(pts, 0.016, '#E663B5', 0.9)
    const b = bead('#ffd0ec')
    g.add(mesh, b)
    let u = 0
    anims.push((t, dt) => { u += dt * (0.08 + 0.55 * u); if (u > 1) u = 0; b.position.copy(curve.getPointAt(u)); b.scale.setScalar(0.6 + u * 1.2) })
    if (reducedMotion) b.position.copy(curve.getPointAt(0.8))
  } else if (loop.type === 'balancing') {
    const pts = []
    for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * 0.42, -Math.cos(a) * 0.42, 0)) }
    const { mesh } = tube(pts, 0.018, '#7FA8D9', 0.9, true)
    const mark = bead('#C9A45C', 0.03)
    mark.position.set(0, -0.42, 0.04)
    const b = bead('#d6e6ff', 0.06)
    g.add(mesh, mark, b)
    anims.push((t) => {
      const c = t % 7
      const a = 2.4 * Math.exp(-0.55 * c) * Math.cos(c * 3.1)
      b.position.set(Math.sin(a) * 0.42, -Math.cos(a) * 0.42, 0.02)
    })
  } else if (loop.type === 'cycle') {
    const pts = []
    for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * CYCLE_R, Math.cos(a) * CYCLE_R, 0)) }
    g.add(tube(pts, 0.016, '#C9A45C', 0.9, true).mesh)
    const n = Math.max(2, loop.through.length)
    const stops = Array.from({ length: n }, (_, i) => {
      const s = bead('#C9A45C', 0.045)
      s.position.copy(cycleStop(loop, i))
      g.add(s)
      return s
    })
    const b = bead('#fff1cf', 0.06)
    g.add(b)
    // steady pace: one lap every 8 s; each stop swells as the bead passes it
    const at = (u) => {
      const a = u * Math.PI * 2
      b.position.set(Math.sin(a) * CYCLE_R, Math.cos(a) * CYCLE_R, 0.03)
      stops.forEach((s, i) => { const d = Math.abs(u * n - i); s.scale.setScalar(1 + 0.8 * Math.max(0, 1 - Math.min(d, n - d) * 2.5)) })
    }
    anims.push((t) => at((t / 8) % 1))
    if (reducedMotion) at(0.1)
  } else {
    const pts = []
    const ghost = []
    for (let i = 0; i <= 120; i++) {
      const x = i / 120
      const y = 1 / (1 + Math.exp(-11 * (x - 0.45)))
      pts.push(new THREE.Vector3(x - 0.5, y * 0.7 - 0.35, 0))
      const e = Math.exp(5.2 * (x - 0.45)) * 0.09
      if (e * 0.7 - 0.35 < 0.55) ghost.push(new THREE.Vector3(x - 0.5, e * 0.7 - 0.35, -0.02))
    }
    const { mesh, curve } = tube(pts, 0.018, '#7FC79A', 1)
    const gh = tube(ghost, 0.008, '#E663B5', 0.35).mesh
    const cap = tube([new THREE.Vector3(-0.5, 0.36, -0.01), new THREE.Vector3(0.5, 0.36, -0.01)], 0.006, '#7FA8D9', 0.6).mesh
    const b = bead('#e4ffe9')
    g.add(mesh, gh, cap, b)
    let u = 0
    anims.push((t, dt) => { u += dt * 0.16; if (u > 1) u = 0; b.position.copy(curve.getPointAt(u)) })
  }
  return g
}

function buildPlot(plot, selItem) {
  const g = new THREE.Group()
  const all = plot.series.flatMap((s) => s.points)
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(0, ...ys), Math.max(...ys)]
  const nx = (x) => (x - x0) / (x1 - x0 || 1) - 0.5
  const ny = (y) => ((y - y0) / (y1 - y0 || 1)) * 0.7 - 0.35
  const n = plot.series.length
  plot.series.forEach((s, i) => {
    const z = (i - (n - 1) / 2) * 0.07
    const on = !selItem || !s.item || s.item === selItem
    const pts = s.points.map(([x, y]) => new THREE.Vector3(nx(x), ny(y), z))
    g.add(tube(pts, on && selItem && s.item === selItem ? 0.02 : 0.012, SERIES[i % SERIES.length], on ? 1 : 0.22).mesh)
  })
  const axisMat = () => { const m = new THREE.MeshBasicMaterial({ color: '#9686A2', transparent: true }); m.userData.base = 0.7; return m }
  const ax = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.008, 0.008), axisMat())
  ax.position.set(0, -0.355, 0)
  const ay = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.74, 0.008), axisMat())
  ay.position.set(-0.52, 0, 0)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.78), (() => { const m = new THREE.MeshBasicMaterial({ color: '#251E2C', transparent: true, side: THREE.DoubleSide }); m.userData.base = 0.85; return m })())
  back.position.z = -(n / 2) * 0.07 - 0.04
  g.add(ax, ay, back)
  return g
}

function selectedItemId(node, sel) {
  const cat = node.variants?.[0]
  return cat ? cat.items[sel?.[0] ?? 0]?.id : undefined
}

function buildVisual(node, sel) {
  const anims = []
  const center = new THREE.Vector3()
  let size = 1
  let obj
  if (node.look) {
    const g = new THREE.Group()
    for (const p of composeLook(node, sel)) g.add(buildPart(p, anims))
    const box = new THREE.Box3().setFromObject(g)
    box.getCenter(center)
    const s = box.getSize(new THREE.Vector3())
    size = Math.max(s.x, s.y, s.z) || 1
    g.position.copy(center).multiplyScalar(-1)
    obj = new THREE.Group()
    obj.add(g)
    obj.scale.setScalar(1 / size)
  } else if (node.loop) obj = buildLoop(node.loop, anims)
  else if (node.plot) obj = buildPlot(node.plot, selectedItemId(node, sel))
  else obj = buildFeel(node.feel ?? { shape: 0.4 }, hashOf(node.id), anims)
  return { obj, center, size, anims }
}

function dispose(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose()
    if (o.material) for (const m of [o.material].flat()) { m.map?.dispose(); m.dispose() }
  })
}

// ---------- items ----------
const items = new Map()
const selections = new Map()

class Item {
  constructor(id, from) {
    this.id = id
    this.node = byId.get(id)
    this.group = new THREE.Group()
    this.group.userData.id = id
    this.group.position.copy(from.pos)
    this.group.scale.setScalar(from.scale)
    this.targetPos = from.pos.clone()
    this.targetScale = from.scale
    this.fade = 0
    this.targetFade = 1
    this.dying = false
    this.halo = null
    this.leaderFrom = null
    this.leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(), V()]), new THREE.LineDashedMaterial({ color: '#9686A2', dashSize: 0.06, gapSize: 0.045, transparent: true, opacity: 0, depthWrite: false }))
    this.leader.frustumCulled = false
    this.leader.visible = false
    scene.add(this.leader)
    this.build()
    scene.add(this.group)
    this.label = link(id, { class: `ev-label k-${this.node.kind}`, 'data-id': id, style: `--k:${KIND[this.node.kind].color}`, onpointerenter: () => setHover(id), onpointerleave: () => setHover(null) }, () => pick(id),
      h('span', { class: 'dot' }), this.node.term)
    labelsEl.append(this.label)
  }
  build() {
    if (this.content) { this.group.remove(this.content); dispose(this.content) }
    const v = buildVisual(this.node, selections.get(this.id))
    this.content = v.obj
    this.center = v.center
    this.size = v.size
    this.anims = v.anims
    this.group.add(this.content)
    this.mats = []
    this.points = []
    this.content.traverse((o) => {
      if (o.material) this.mats.push(o.material)
      if (o.isPoints) this.points.push(o.material)
    })
    this.applyFade()
  }
  applyFade() {
    for (const m of this.mats) {
      m.opacity = m.userData.base * this.fade
      m.visible = this.fade > 0.01
    }
  }
  // px: screen pixels per world unit at the focus plane
  update(t, dt, px) {
    if (this.halo) this.targetPos = haloPoint(this.halo)
    const k = 1 - Math.exp(-dt * 5.5)
    this.group.position.lerp(this.targetPos, k)
    const s = this.group.scale.x + (this.targetScale - this.group.scale.x) * k
    this.group.scale.setScalar(s)
    this.fade += (this.targetFade - this.fade) * (this.dying ? 1 - Math.exp(-dt * 7) : k)
    this.applyFade()
    const unit = this.node.look ? s / this.size : s * 0.5
    for (const m of this.points) m.size = THREE.MathUtils.clamp(m.userData.baseSize * unit * px, 2.2, 14)
    for (const a of this.anims) a(t, dt)
    const showLeader = this.leaderFrom && !this.dying && this.fade > 0.05
    this.leader.visible = !!showLeader
    if (showLeader) {
      const a = anchorOf(this.leaderFrom, this.id)
      const b = this.group.position.clone()
      const len = a.distanceTo(b)
      b.addScaledVector(b.clone().sub(a).normalize(), -Math.min(len * 0.5, s * 0.45))
      this.leader.geometry.setFromPoints([a, b])
      this.leader.computeLineDistances()
      this.leader.material.opacity = 0.55 * this.fade
    }
  }
  remove() {
    scene.remove(this.group, this.leader)
    dispose(this.group)
    dispose(this.leader)
    this.label.remove()
  }
}

// ---------- state ----------
let path = [field.root]
let exploded = false
let mode = 'explore'
let step = 0
let phase = 'gather'
let hoverId = null
let timers = []
let camGoal = 4.8
let camMoving = true
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
// Parts sit on an ellipse that always faces the camera, so none hides behind the centre or another part.
const HALO_DIST = 7.4
const camRight = V(1, 0, 0)
const camUp = V(0, 1, 0)
let haloRx = 2
let haloRy = 1.4
function haloRadii(dist) {
  const hh = dist * Math.tan(deg(camera.fov / 2))
  return [Math.max(1.3, hh * camera.aspect - 0.7), Math.max(1.0, hh - 0.72)]
}
function haloSlot(i, n) {
  const a = Math.PI / 2 + Math.PI / n - (i * 2 * Math.PI) / n
  return [Math.cos(a), Math.sin(a)]
}
function haloPoint([cx, cy]) {
  return controls.target.clone().addScaledVector(camRight, cx * haloRx).addScaledVector(camUp, cy * haloRy - 0.06)
}
function childScale(n) {
  const [rx, ry] = haloRadii(HALO_DIST)
  const per = (2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2)) / Math.max(1, n)
  return Math.min(S_CHILD, per * 0.6)
}
// Where a child sat inside its parent: its "at" point if the parent has a look, its stop if the parent is a cycle, else the parent's centre.
function anchorOf(parentId, childId) {
  const p = items.get(parentId)
  if (!p) return V()
  const c = byId.get(childId)
  if (c.at && p.node.look) return V(...c.at).sub(p.center).divideScalar(p.size).multiplyScalar(p.group.scale.x).add(p.group.position)
  const k = p.node.loop?.type === 'cycle' ? p.node.loop.through.indexOf(childId) : -1
  if (k >= 0) return cycleStop(p.node.loop, k).multiplyScalar(p.group.scale.x).add(p.group.position)
  return p.group.position.clone()
}
function startFrom(parentId, childId) {
  return { pos: anchorOf(parentId, childId), scale: byId.get(childId).at ? S_CHILD * 0.3 : 0.15 }
}

function layout() {
  const want = new Map()
  if (mode === 'explore') {
    const focus = path.at(-1)
    const kids = exploded ? byId.get(focus).children ?? [] : []
    const sc = childScale(kids.length)
    want.set(focus, { pos: V(), scale: kids.length ? S_FOCUS * 0.82 : S_FOCUS, fade: kids.length ? 0.16 : 1 })
    kids.forEach((c, i) => want.set(c, { halo: haloSlot(i, kids.length), scale: sc, fade: 1, leaderFrom: focus, from: () => startFrom(focus, c) }))
    camGoal = kids.length ? HALO_DIST : 4.6
  } else {
    const s = field.assembly[step]
    const makes = s.makes ?? field.root
    const adds = s.adds.filter((a) => a !== makes)
    const gather = phase === 'gather' && adds.length > 0
    const sc = childScale(adds.length)
    want.set(makes, { pos: V(), scale: gather ? S_FOCUS * 0.82 : S_FOCUS, fade: gather ? 0.2 : 1 })
    if (gather) adds.forEach((a, i) => want.set(a, { halo: haloSlot(i, adds.length), scale: sc, fade: 1, leaderFrom: makes, from: () => ({ pos: haloPoint(haloSlot(i, adds.length)).multiplyScalar(1.6), scale: 0.2 }) }))
    camGoal = gather ? HALO_DIST : 4.6
  }
  for (const [id, w] of want) {
    let it = items.get(id)
    if (!it || it.dying) {
      if (it) { it.remove(); items.delete(id) }
      const from = w.from ? w.from() : { pos: w.pos.clone(), scale: w.scale * 0.7 }
      it = new Item(id, from)
      items.set(id, it)
    }
    it.halo = w.halo ?? null
    it.leaderFrom = w.leaderFrom ?? null
    if (!it.halo) it.targetPos = w.pos
    it.targetScale = w.scale
    it.targetFade = w.fade
  }
  const sinkToCentre = mode === 'flatpack' && phase === 'join'
  for (const [id, it] of items) {
    if (want.has(id) || it.dying) continue
    it.dying = true
    it.halo = null
    it.targetFade = 0
    if (sinkToCentre) { it.targetPos = V(); it.targetScale = 0.25 } else it.targetPos = it.group.position.clone().multiplyScalar(1.4)
  }
  camMoving = true
  renderCrumbs()
  renderPanel()
  renderStrip()
  renderHint()
  btnExplode.textContent = exploded && mode === 'explore' ? 'Assemble' : 'Explode'
  btnExplode.disabled = mode !== 'explore' || !(byId.get(path.at(-1)).children ?? []).length
  btnFlat.setAttribute('aria-pressed', String(mode === 'flatpack'))
  syncUrl()
}
// The address bar follows the open node. Each move to another node adds a history entry, so Back and Forward work.
function syncUrl() {
  if (mode !== 'explore') return
  const id = path.at(-1)
  document.title = id === field.root ? baseTitle : `${byId.get(id).term} · ${baseTitle}`
  if (idFromUrl() !== id) history.pushState(null, '', hrefOf(id))
}

function pathTo(id) {
  const p = [id]
  while (parentOf.has(p[0])) p.unshift(parentOf.get(p[0]))
  return p
}
function go(id) {
  clearTimers()
  mode = 'explore'
  path = pathTo(id)
  exploded = (byId.get(id).children ?? []).length > 0
  closeIndex()
  layout()
}
function pick(id) {
  if (mode === 'flatpack') return go(id)
  const focus = path.at(-1)
  if (id === focus) return toggleExplode()
  if (exploded && (byId.get(focus).children ?? []).includes(id)) {
    path.push(id)
    exploded = (byId.get(id).children ?? []).length > 0
    return layout()
  }
  go(id)
}
function toggleExplode() {
  if (mode !== 'explore' || !(byId.get(path.at(-1)).children ?? []).length) return
  exploded = !exploded
  layout()
}
function back() {
  if (!indexEl.hidden) return closeIndex()
  if (mode === 'flatpack') return leaveFlatpack()
  if (path.length > 1) { path.pop(); exploded = true }
  else if (exploded) exploded = false
  else return
  layout()
}
function clearTimers() { for (const t of timers) clearTimeout(t); timers = [] }
function showStep(i, play = false) {
  clearTimers()
  step = Math.max(0, Math.min(field.assembly.length - 1, i))
  phase = 'gather'
  layout()
  timers.push(setTimeout(() => { phase = 'join'; layout() }, 1500))
  if (play && step < field.assembly.length - 1) timers.push(setTimeout(() => showStep(step + 1, true), 3600))
}
function enterFlatpack() { mode = 'flatpack'; closeIndex(); showStep(0, true) }
function leaveFlatpack() { clearTimers(); mode = 'explore'; exploded = false; path = [field.root]; layout() }

// ---------- panel ----------
const chip = (id, extra = '') => {
  const n = byId.get(id)
  return link(id, { class: 'ev-chip', style: `--k:${KIND[n.kind].color}`, title: n.plain }, () => go(id), h('span', { class: 'dot' }), n.term, extra)
}
function sourcesList(sources, unverified) {
  return h('div', { class: 'ev-sources' },
    (sources ?? []).length ? h('ol', {}, sources.map((s) => h('li', {},
      h('span', { class: 'kind' }, s.kind), ' ',
      h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label),
      s.page ? h('span', { class: 'page' }, ` ${s.page}`) : null,
      s.flag ? h('div', { class: 'flag' }, s.flag) : null))) : null,
    unverified ? h('p', { class: 'unverified' }, 'Unverified: ', unverified) : null)
}
function plotSvg(plot, selItem) {
  const W = 340, H = 210, L = 40, B = 34, T = 10, R = 10
  const all = plot.series.flatMap((s) => s.points)
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(0, ...ys), Math.max(...ys)]
  const X = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R)
  const Y = (y) => H - B - ((y - y0) / (y1 - y0 || 1)) * (H - B - T)
  const fmt = (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-GB') : +v.toPrecision(3))
  const lines = plot.series.map((s, i) => {
    const on = !selItem || !s.item || s.item === selItem
    return `<polyline fill="none" stroke="${SERIES[i % SERIES.length]}" stroke-width="${selItem && s.item === selItem ? 3 : 2}" opacity="${on ? 1 : 0.3}" points="${s.points.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')}"/>`
  }).join('')
  const legend = plot.series.map((s, i) => `<span style="color:${SERIES[i % SERIES.length]}">■</span> ${s.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}`).join('<br>')
  return h('figure', { class: 'ev-plot', html:
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${plot.y} against ${plot.x}">` +
    `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#4D2D49"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#4D2D49"/>` +
    `<text x="${L}" y="${H - B + 14}" fill="#9686A2" font-size="11">${fmt(x0)}</text><text x="${W - R}" y="${H - B + 14}" fill="#9686A2" font-size="11" text-anchor="end">${fmt(x1)}</text>` +
    `<text x="${L - 4}" y="${H - B}" fill="#9686A2" font-size="11" text-anchor="end">${fmt(y0)}</text><text x="${L - 4}" y="${T + 9}" fill="#9686A2" font-size="11" text-anchor="end">${fmt(y1)}</text>` +
    `<text x="${(L + W - R) / 2}" y="${H - 4}" fill="#9686A2" font-size="11" text-anchor="middle">${plot.x}</text>` +
    `<text transform="translate(11 ${(T + H - B) / 2}) rotate(-90)" fill="#9686A2" font-size="11" text-anchor="middle">${plot.y}</text>` +
    lines + `</svg><figcaption>${legend}</figcaption>` })
}
function section(title, ...kids) {
  const body = kids.flat().filter(Boolean)
  return body.length ? h('section', {}, h('h3', {}, title), body) : null
}
function nodePanel(id) {
  const n = byId.get(id)
  const k = KIND[n.kind]
  const sel = selections.get(id)
  const out = []
  if (id === field.root) out.push(h('div', { class: 'ev-summary' }, h('h3', {}, 'How a professional sees it'), h('p', {}, field.summary)))
  out.push(h('div', { class: 'ev-kind', style: `--k:${k.color}` }, n.loop?.type === 'cycle' ? 'Cycle: steps that repeat' : k.label))
  out.push(h('h2', {}, n.term))
  if (n.aka?.length) out.push(h('p', { class: 'ev-aka' }, 'You might say: ', n.aka.join(', ')))
  out.push(h('p', { class: 'ev-plain' }, n.plain))
  const rows = [['What it does', n.does], ['Ask', n.ask], ['Typical', n.range], ['Trouble', n.trouble]].filter(([, v]) => v)
  out.push(h('dl', {}, rows.map(([dt, dd]) => [h('dt', {}, dt), h('dd', {}, dd)])))
  if (n.variants?.length) {
    for (const [ci, cat] of n.variants.entries()) {
      const item = cat.items[sel?.[ci] ?? 0]
      out.push(section(`Catalogue: ${cat.label}`, h('p', {}, h('b', {}, item.name), ': ', item.plain), sourcesList(item.sources, item.unverified)))
    }
  }
  if (n.plot) out.push(section('Compare', plotSvg(n.plot, selectedItemId(n, sel))))
  if (n.loop) out.push(section('Loop',
    h('p', {}, LOOP_TEXT[n.loop.type]),
    h('div', { class: 'ev-chain' }, n.loop.through.flatMap((t, i) => [i ? h('span', { class: 'arrow' }, '→') : null, chip(t)]), h('span', { class: 'arrow' }, '↺'))))
  if (n.feel) out.push(section('Felt as', h('p', { class: 'ev-why' }, n.feel.why)))
  if (n.children?.length) out.push(section(id === path.at(-1) && exploded ? 'Parts (around it now)' : 'Parts', h('div', { class: 'ev-chips' }, n.children.map((c) => chip(c)))))
  const groups = new Map()
  for (const l of n.links ?? []) groups.set(REL_OUT[l.rel], [...(groups.get(REL_OUT[l.rel]) ?? []), l.to])
  for (const l of incoming.get(id) ?? []) groups.set(REL_IN[l.rel], [...(groups.get(REL_IN[l.rel]) ?? []), l.from])
  if (groups.size) out.push(section('Connections', h('dl', { class: 'ev-links' }, [...groups].map(([rel, ids]) => [h('dt', {}, rel), h('dd', {}, h('div', { class: 'ev-chips' }, [...new Set(ids)].map((t) => chip(t))))]))))
  if (loopsThrough.get(id)?.length) out.push(section('In loops', h('div', { class: 'ev-chips' }, loopsThrough.get(id).map((t) => chip(t)))))
  if (n.pattern) out.push(section('Pattern', h('div', { class: 'ev-chips' }, chip(n.pattern))))
  if (n.kind === 'pattern') out.push(section('Seen here in', h('div', { class: 'ev-chips' }, (patternUsers.get(id) ?? []).map((t) => chip(t)))))
  out.push(section('Sources', sourcesList(n.sources, n.unverified)))
  if (!n.children?.length && n.kind !== 'pattern') {
    const ask = fieldFile && `exploded-view: go deeper on "${n.term}" (${n.id}) in ${fieldFile}`
    out.push(section('Go deeper', n.deeper ? h('p', {}, n.deeper) : null,
      ask
        ? h('p', { class: 'ev-ask' }, h('code', {}, ask), ' ', h('button', { type: 'button', class: 'ev-copy', onclick: (e) => { navigator.clipboard?.writeText(ask); e.target.textContent = 'Copied' } }, 'Copy'))
        : h('p', {}, 'To open the next level, run the ', h('a', { href: SKILL_URL, target: '_blank', rel: 'noopener' }, 'exploded-view skill'), ' in your own coding agent.')))
  }
  return out
}
function stepPanel() {
  const s = field.assembly[step]
  return [
    h('div', { class: 'ev-kind', style: '--k:#C9A45C' }, `Flatpack: step ${step + 1} of ${field.assembly.length}`),
    h('h2', {}, s.title),
    h('p', { class: 'ev-plain' }, s.text),
    section('Brings together', h('div', { class: 'ev-chips' }, s.adds.map((a) => chip(a)))),
    section('Makes', h('div', { class: 'ev-chips' }, chip(s.makes ?? field.root))),
  ]
}
function renderPanel() {
  panelEl.replaceChildren(...(mode === 'flatpack' ? stepPanel() : nodePanel(path.at(-1))).filter(Boolean))
  panelEl.scrollTop = 0
}
function renderCrumbs() {
  const ids = mode === 'flatpack' ? [field.root] : path
  const parts = []
  ids.forEach((id, i) => {
    if (i) parts.push(h('span', { class: 'sep' }, '›'))
    parts.push(link(id, { 'aria-current': i === ids.length - 1 ? 'page' : null }, () => go(id), byId.get(id).term))
  })
  if (byId.get(path[0]).kind === 'pattern' && mode === 'explore') parts.unshift(h('span', { class: 'sep' }, 'Pattern ·'))
  crumbsEl.replaceChildren(...parts)
}
function renderStrip() {
  const rows = []
  if (mode === 'flatpack') {
    rows.push(h('div', { class: 'ev-row' },
      h('span', { class: 'ev-rowlabel' }, 'Flatpack'),
      h('div', { class: 'ev-cells' },
        h('button', { type: 'button', onclick: () => showStep(step - 1), disabled: step === 0 }, '‹ Back'),
        field.assembly.map((s, i) => h('button', { type: 'button', 'aria-pressed': String(i === step), onclick: () => showStep(i) }, `${i + 1}. ${s.title}`)),
        h('button', { type: 'button', onclick: () => showStep(step + 1), disabled: step === field.assembly.length - 1 }, 'Next ›'),
        h('button', { type: 'button', onclick: () => showStep(0, true) }, 'Replay'))))
  } else {
    const id = path.at(-1)
    const n = byId.get(id)
    for (const [ci, cat] of (n.variants ?? []).entries()) {
      const cur = selections.get(id)?.[ci] ?? 0
      rows.push(h('div', { class: 'ev-row' },
        h('span', { class: 'ev-rowlabel' }, cat.label),
        h('div', { class: 'ev-cells' },
          cat.items.map((it, ii) => h('button', { type: 'button', 'aria-pressed': String(ii === cur), title: it.plain, onclick: () => choose(id, ci, ii) }, it.name)))))
    }
  }
  stripEl.replaceChildren(...rows)
  stripEl.hidden = rows.length === 0
}
function choose(id, ci, ii) {
  const sel = [...(selections.get(id) ?? [])]
  sel[ci] = ii
  selections.set(id, sel)
  items.get(id)?.build()
  renderPanel()
  renderStrip()
}
function renderHint() {
  const n = byId.get(path.at(-1))
  hintEl.textContent = mode === 'flatpack'
    ? 'Watch the parts join. Pick a step below, or click a part to open it.'
    : !exploded && (n.children ?? []).length ? `Click the ${n.term.toLowerCase()} to take it apart. Drag to turn.`
    : exploded ? 'Click a part to open it. Click the centre to put it back together. Esc goes up a level.'
    : `This is a leaf. Esc goes up a level${n.kind !== 'pattern' ? ', or use Go deeper in the panel' : ''}.`
}

// ---------- index ----------
function toggleIndex() { indexEl.hidden ? openIndex() : closeIndex() }
function openIndex() {
  const input = h('input', { type: 'search', placeholder: 'Find a term', 'aria-label': 'Find a term' })
  const list = h('ul')
  const sorted = [...field.nodes].sort((a, b) => a.term.localeCompare(b.term, 'en-GB'))
  const draw = () => {
    const q = input.value.trim().toLowerCase()
    list.replaceChildren(...sorted.filter((n) => !q || [n.term, n.plain, ...(n.aka ?? [])].join(' ').toLowerCase().includes(q)).map((n) =>
      h('li', {}, link(n.id, { 'data-id': n.id }, () => go(n.id),
        h('span', { class: 'term', style: `--k:${KIND[n.kind].color}` }, h('span', { class: 'dot' }), n.term),
        h('span', { class: 'kind' }, KIND[n.kind].short ?? KIND[n.kind].label),
        h('span', { class: 'plain' }, n.plain)))))
  }
  input.addEventListener('input', draw)
  draw()
  indexEl.replaceChildren(h('div', { class: 'ev-index-head' }, h('b', {}, `Index · ${field.nodes.length} terms`), input), list)
  indexEl.hidden = false
  indexEl.scrollTop = 0
  btnIndex.setAttribute('aria-pressed', 'true')
  input.focus()
}
function closeIndex() { indexEl.hidden = true; btnIndex.setAttribute('aria-pressed', 'false') }

// ---------- input ----------
const raycaster = new THREE.Raycaster()
raycaster.params.Points.threshold = 0.03
const ndc = new THREE.Vector2()
let downAt = null
let pointerDirty = false
let lastPointer = null
function hit(clientX, clientY) {
  const r = canvas.getBoundingClientRect()
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  const targets = [...items.values()].filter((i) => !i.dying && i.fade > 0.1).map((i) => i.group)
  for (const x of raycaster.intersectObjects(targets, true)) {
    let o = x.object
    while (o && o.userData.id === undefined) o = o.parent
    if (o) return o.userData.id
  }
  return null
}
function setHover(id) {
  if (hoverId === id) return
  hoverId = id
  for (const it of items.values()) it.label.classList.toggle('hover', it.id === id)
  canvas.style.cursor = id ? 'pointer' : ''
}
canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]))
canvas.addEventListener('pointermove', (e) => { lastPointer = [e.clientX, e.clientY]; pointerDirty = true })
canvas.addEventListener('pointerleave', () => { lastPointer = null; setHover(null) })
canvas.addEventListener('pointerup', (e) => {
  if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) {
    const id = hit(e.clientX, e.clientY)
    if (id) pick(id)
  }
  downAt = null
})
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') closeIndex(); return }
  if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); back() }
  else if (e.key === 'Enter' || e.key === ' ') { if (e.target === document.body) { e.preventDefault(); toggleExplode() } }
  else if (e.key === '/') { e.preventDefault(); openIndex() }
})
addEventListener('popstate', () => { const id = idFromUrl(); if (mode !== 'explore' || id !== path.at(-1)) go(id) })
// Idle motion is a slow sway either side of the current view, not a full orbit:
// labels, leaders and flat cards are composed for the front, and an orbit turns cards edge-on.
const SWAY_AMP = 0.3, SWAY_PERIOD = 36
let swaying = !reducedMotion, swayFrom = 0, swayT = 0, idleTimer
controls.addEventListener('start', () => { camMoving = false; swaying = false; clearTimeout(idleTimer) })
controls.addEventListener('end', () => {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { swaying = !reducedMotion; swayFrom = controls.getAzimuthalAngle(); swayT = 0 }, 6000)
})

function resize() {
  const r = stageEl.getBoundingClientRect()
  renderer.setSize(r.width, r.height, false)
  camera.aspect = r.width / Math.max(1, r.height)
  camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(stageEl)
resize()

// ---------- loop ----------
const clock = new THREE.Clock()
const tmp = new THREE.Vector3()
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.elapsedTime
  camera.updateMatrixWorld()
  camRight.setFromMatrixColumn(camera.matrixWorld, 0)
  camUp.setFromMatrixColumn(camera.matrixWorld, 1)
  ;[haloRx, haloRy] = haloRadii(camGoal)
  const rect = canvas.getBoundingClientRect()
  const px = rect.height / 2 / (camera.position.distanceTo(controls.target) * Math.tan(deg(camera.fov / 2)))
  for (const [id, it] of items) {
    it.update(t, dt, px)
    if (it.dying && it.fade < 0.02) { it.remove(); items.delete(id) }
  }
  const k = 1 - Math.exp(-dt * 4)
  if (camMoving) {
    const d = camera.position.distanceTo(controls.target)
    const nd = d + (camGoal - d) * k
    camera.position.sub(controls.target).setLength(nd).add(controls.target)
    if (Math.abs(nd - camGoal) < 0.02) camMoving = false
  }
  if (swaying) {
    swayT += dt
    const turn = swayFrom + SWAY_AMP * Math.sin((swayT / SWAY_PERIOD) * Math.PI * 2) - controls.getAzimuthalAngle()
    camera.position.sub(controls.target).applyAxisAngle(camera.up, turn).add(controls.target)
  }
  controls.update(dt)
  if (pointerDirty && lastPointer) { pointerDirty = false; setHover(hit(...lastPointer)) }
  renderer.render(scene, camera)
  const focus = mode === 'explore' ? path.at(-1) : field.assembly[step].makes ?? field.root
  for (const it of items.values()) {
    tmp.copy(it.group.position)
    tmp.addScaledVector(camUp, it.group.scale.x * 0.56)
    tmp.project(camera)
    const ghost = !it.dying && it.targetFade < 0.5
    const show = it.fade > 0.08 && tmp.z < 1 && !ghost
    it.label.style.display = show ? '' : 'none'
    if (!show) continue
    it.label.style.transform = `translate(${((tmp.x + 1) / 2) * rect.width}px, ${((1 - tmp.y) / 2) * rect.height}px) translate(-50%, -100%)`
    it.label.style.opacity = String(Math.min(1, it.dying ? it.fade : Math.max(it.fade, it.id === focus ? 0.85 : 0)))
    it.label.style.zIndex = String(Math.round((1 - tmp.z) * 1e5))
    it.label.classList.toggle('focus', it.id === focus)
  }
  requestAnimationFrame(frame)
}

// ---------- start ----------
const start = idFromUrl()
history.replaceState(null, '', hrefOf(start))
if (start !== field.root) {
  path = pathTo(start)
  exploded = (byId.get(start).children ?? []).length > 0
}
layout()
requestAnimationFrame(frame)
window.__ev = {
  ready: true,
  state: () => ({ mode, path: [...path], exploded, step, phase, visible: [...items.values()].filter((i) => !i.dying && i.fade > 0.5).map((i) => i.id) }),
  screenPos(id) {
    const it = items.get(id)
    if (!it) return null
    const v = it.group.position.clone().project(camera)
    const r = canvas.getBoundingClientRect()
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, visible: v.z < 1 }
  },
  settled: () => [...items.values()].every((i) => Math.abs(i.fade - i.targetFade) < 0.03 && i.group.position.distanceTo(i.targetPos) < 0.03) && !camMoving,
  renderer: () => {
    const gl = renderer.getContext()
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
  },
}
