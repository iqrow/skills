// Teardown viewer. Reads <script type="application/json" id="teardown"> and renders it as a three.js exploded view.
// Bundled into kit/viewer.js by kit/src/bundle.mjs. build.mjs inlines that bundle into a local page; a --public
// folder loads it as viewer.js, after the page has filled the teardown element from teardown.json.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { searchEntries, search, snippet } from '../search.mjs'
import { AI_NOTE, usePrompt, deeperPrompt } from '../prompts.mjs'
import { stepId, stepOf, stepTitle } from '../flatpack.mjs'

const teardownEl = document.getElementById('teardown')
const teardown = JSON.parse(teardownEl.textContent)
// Path of the teardown on the author's machine. `build.mjs --public` leaves it out:
// a public page names the teardown by its URL instead, and links to the skill for going deeper.
const teardownFile = teardownEl.dataset.file
// The site's legal page, which `build.mjs --legal` names on a public folder: linked beside the AI note.
const legalUrl = teardownEl.dataset.legal
// The site's home page, which `build.mjs --home` names on a public folder: the mark at the top left links to it.
const siteHomeUrl = teardownEl.dataset.home
const MARK_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M5 8.5 16 3l11 5.5L16 14 5 8.5Z" fill="currentColor" opacity=".22"/><path d="M5 8.5v15L16 29l11-5.5v-15M5 8.5 16 14l11-5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m11 22.5 5-10.5 5 10.5M13 18.5h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const SKILL_URL = 'https://github.com/iqrow/skills'
const byId = new Map(teardown.nodes.map((n) => [n.id, n]))
const parentOf = new Map()
for (const n of teardown.nodes) for (const c of n.children ?? []) parentOf.set(c, n.id)
const incoming = new Map()
for (const n of teardown.nodes)
  for (const l of n.links ?? []) {
    if (!incoming.has(l.to)) incoming.set(l.to, [])
    incoming.get(l.to).push({ from: n.id, rel: l.rel })
  }
const patternUsers = new Map()
for (const n of teardown.nodes) if (n.pattern) patternUsers.set(n.pattern, [...(patternUsers.get(n.pattern) ?? []), n.id])
const loopsThrough = new Map()
for (const n of teardown.nodes) for (const t of n.loop?.through ?? []) if (t !== n.id) loopsThrough.set(t, [...(loopsThrough.get(t) ?? []), n.id])

const KIND = {
  product: { label: 'Product', color: '#ECE5F1' },
  part: { label: 'Part', color: '#ECE5F1' },
  process: { label: 'Process: a step that makes or changes parts', short: 'Process', color: '#C9A45C' },
  knob: { label: 'Knob: a setting you choose', short: 'Knob', color: '#E663B5' },
  measure: { label: 'Measure: how you check', short: 'Measure', color: '#7FA8D9' },
  loop: { label: 'Feedback loop', short: 'Loop', color: '#7FC79A' },
  pattern: { label: 'Pattern: repeats across subjects', short: 'Pattern', color: '#B79CE0' },
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
// Phones and tablets: a finger is the main pointer, so hints say tap and pinch, and the Index does not raise the keyboard on open.
const touchFirst = matchMedia('(pointer: coarse)')

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
// ending in .html, a page can change only its fragment, so a node is #<id>. Each flatpack step has a URL the same
// way, with the id flatpack.mjs gives it: `flatpack` for the first step, `flatpack-<n>` for step n.
const usePaths = location.protocol !== 'file:' && !location.pathname.endsWith('.html')
const home = usePaths ? location.pathname.replace(/[^/]*$/, '') : location.pathname + location.search
// A public node page arrives with its own title, so the teardown's title comes from the teardown, in build.mjs's format.
const baseTitle = `${teardown.title} · teardown`
// How a prompt names the teardown: its path on the author's machine, or the URL of the published page.
const teardownRef = teardownFile ?? (usePaths ? location.origin + home : null)
const hrefOf = (id) => (id === teardown.root ? home : (usePaths ? home : '#') + encodeURIComponent(id))
const stepHref = (i) => (usePaths ? home : '#') + stepId(i)
// What the URL opens: a flatpack step ({ step }), or else a node ({ step: -1, id }), the root when it names no node.
function viewFromUrl() {
  let id = (usePaths && location.pathname.slice(home.length)) || location.hash.slice(1)
  try { id = decodeURIComponent(id) } catch { return { step: -1, id: teardown.root } }
  const step = stepOf(id, teardown.assembly.length)
  return step >= 0 ? { step } : { step: -1, id: byId.has(id) ? id : teardown.root }
}
const viewHref = (v) => (v.step >= 0 ? stepHref(v.step) : hrefOf(v.id))
// A plain click opens the link's view in place. A middle or modified click falls through to the browser: new tab, new window.
function anchor(href, attrs, open, ...kids) {
  return h('a', { ...attrs, href, onclick: (e) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    open()
  } }, ...kids)
}
function link(id, attrs, open, ...kids) { return anchor(hrefOf(id), attrs, open, ...kids) }
const crumbsEl = h('nav', { class: 'ev-crumbs', 'aria-label': 'Path' })
const btnExplode = h('button', { type: 'button', onclick: () => toggleExplode() }, 'Explode')
const btnFlat = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => (mode === 'flatpack' ? leaveFlatpack() : enterFlatpack()) }, 'Flatpack')
const btnIndex = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => toggleOverlay('index') }, 'Index')
const btnSources = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => toggleOverlay('sources') }, 'Sources')
const canvas = h('canvas', { 'aria-label': `${teardown.title}: 3D exploded view` })
const labelsEl = h('div', { class: 'ev-labels' })
const hintEl = h('div', { class: 'ev-hint' })
const panelEl = h('aside', { class: 'ev-panel', 'aria-live': 'polite' })
const stripEl = h('footer', { class: 'ev-strip' })
const overlayEl = h('div', { class: 'ev-overlay', hidden: true })
const stageEl = h('main', { class: 'ev-stage' }, canvas, labelsEl, hintEl, overlayEl)
document.body.append(
  h('div', { class: 'ev' },
    h('header', { class: 'ev-bar' },
      h('div', { class: 'ev-head' },
        siteHomeUrl ? h('a', { class: 'ev-mark', href: siteHomeUrl, 'aria-label': 'Home', title: 'Home', html: MARK_SVG }) : null,
        h('div', { class: 'ev-title' }, link(teardown.root, { title: `${teardown.title}: start` }, () => go(teardown.root), teardown.title), h('span', {}, `“${teardown.prompt}”`)),
        crumbsEl),
      h('div', { class: 'ev-actions' }, btnExplode, btnFlat, btnIndex, btnSources)),
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
// Depth of field, on only while a turntable shows: the item at the front is sharp, the ones behind it blur.
// MSAA on the composer's target keeps edges as smooth as the plain render.
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }))
const bokeh = new BokehPass(scene, camera, { focus: 4, aperture: 0, maxblur: 0.008 })
// The stock shader blurs both sides of the focus plane, so the front item, which lies nearer than any
// single plane, came out soft. Here nothing nearer than the focus blurs: focus is the plate's centre,
// so the front half of the plate stays sharp and blur grows toward the back.
bokeh.materialBokeh.fragmentShader = bokeh.materialBokeh.fragmentShader.replace('float factor = ( focus + viewZ );', 'float factor = max( 0.0, - viewZ - focus );')
composer.addPass(new RenderPass(scene, camera))
composer.addPass(bokeh)
composer.addPass(new OutputPass())
// The plate's flat glow and lines stay out of the depth the blur reads: they lie in front of the back
// items' feet and would keep those sharp.
const renderBokeh = bokeh.render.bind(bokeh)
bokeh.render = (...args) => {
  const flats = []
  scene.traverse((o) => { if (o.userData.noDepth && o.visible) { o.visible = false; flats.push(o) } })
  renderBokeh(...args)
  for (const o of flats) o.visible = true
}
// The plain render leaves the background out of tone mapping; the composer tone-maps every pixel, which
// crushes the dark background to black. So the composer draws a background that tone-maps back to BG.
function acesOf([r, g, b]) {
  const e = renderer.toneMappingExposure / 0.6
  r *= e; g *= e; b *= e
  const f = [0.59719 * r + 0.35458 * g + 0.04823 * b, 0.076 * r + 0.90834 * g + 0.01566 * b, 0.0284 * r + 0.13383 * g + 0.83777 * b]
    .map((v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081))
  return [1.60475 * f[0] - 0.53108 * f[1] - 0.07367 * f[2], -0.10208 * f[0] + 1.10813 * f[1] - 0.00605 * f[2], -0.00327 * f[0] - 0.07276 * f[1] + 1.07602 * f[2]]
}
const bgPlain = scene.background
const bgToned = (() => {
  const want = [bgPlain.r, bgPlain.g, bgPlain.b]
  const c = want.map((v) => v * 20)
  for (let k = 0; k < 60; k++) {
    const out = acesOf(c)
    for (let i = 0; i < 3; i++) c[i] *= out[i] > 1e-6 ? Math.pow(want[i] / out[i], 0.5) : 2
  }
  return new THREE.Color().setRGB(...c)
})()
const BLUR = 0.012
let blur = 0
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

// ---------- turntable ----------
// A node with a catalogue opens whole, on a plate that carries every item of its first catalogue, like a
// microwave turntable: the chosen item at the front, the others round the back. Clicking another item turns
// the plate to bring it forward and chooses it; clicking the front item or the plate takes the node apart.
// A catalogue whose items have no drawings of their own rides the plate as name cards around the node.
const TT_R = 0.7
const hasTurntable = (n) => (n.variants?.[0]?.items.length ?? 0) > 1
const turntableOn = (id) => mode === 'explore' && !exploded && path.at(-1) === id && hasTurntable(byId.get(id))
const opensSplit = (n) => (n.children ?? []).length > 0 && !hasTurntable(n)
// A plot already compares every item, so it stays whole at the centre with name cards around it.
function catalogueDrawn(n) {
  return !!n.look && n.variants[0].items.some((it) => it.look || it.tint || it.svg)
}
function nameCard(text, on, anims) {
  const fs = 44, padX = 28, H = 84
  const font = `600 ${fs}px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`
  const c = document.createElement('canvas')
  const g = c.getContext('2d')
  g.font = font
  const W = Math.ceil(Math.min(1000, g.measureText(text).width + padX * 2))
  c.width = W
  c.height = H
  g.font = font // resizing the canvas resets its context
  g.fillStyle = on ? '#E663B5' : '#251E2C'
  g.beginPath()
  g.roundRect(0, 0, W, H, 18)
  g.fill()
  if (!on) { g.strokeStyle = '#4D2D49'; g.lineWidth = 4; g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, 16); g.stroke() }
  g.fillStyle = on ? '#1B1621' : '#ECE5F1'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, W / 2, H / 2 + 2, W - padX * 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  // The chosen card draws over everything: a drawing wider than the card's ring (a round loaf) would hide it.
  // The other cards keep the depth test, so the drawings in front still cover the ones round the back.
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false, depthTest: !on })
  m.userData.base = 1
  const hgt = 0.09
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry((hgt * W) / H, hgt), m)
  mesh.renderOrder = on ? 3 : 2
  const q = new THREE.Quaternion()
  anims.push(() => { mesh.parent.getWorldQuaternion(q); mesh.quaternion.copy(q.invert().multiply(camera.quaternion)) })
  return mesh
}
// The plate's glow: faint in the middle, brighter near the rim, gone past it.
const plateGlow = canvasTexture(256, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  r.addColorStop(0, 'rgba(183,156,224,0.10)')
  r.addColorStop(0.7, 'rgba(183,156,224,0.05)')
  r.addColorStop(0.93, 'rgba(230,99,181,0.28)')
  r.addColorStop(1, 'rgba(230,99,181,0)')
  g.fillStyle = r
  g.fillRect(0, 0, s, s)
})
const BG_COLOR = new THREE.Color(BG)
// Returns dim(d): d 0 leaves the objects as built, d 1 makes them faint, grey and dark.
function dimmer(objs) {
  const list = []
  for (const o of objs) o.traverse((x) => { for (const m of [x.material ?? []].flat()) list.push({ m, base: m.userData.base, c: m.color?.clone(), e: m.emissive?.clone(), map: m.map }) })
  const grey = new THREE.Color()
  return (d) => {
    for (const x of list) {
      // An svg drawing turns its material white once its texture loads, so its colour is read again then.
      if (x.m.map !== x.map) { x.map = x.m.map; x.c = x.m.color.clone() }
      x.m.userData.base = x.base * (1 - 0.7 * d)
      if (x.e) x.m.emissive.copy(x.e).multiplyScalar(1 - d)
      if (!x.c) continue
      const l = x.c.r * 0.3 + x.c.g * 0.59 + x.c.b * 0.11
      x.m.color.copy(x.c).lerp(grey.setRGB(l, l, l), 0.85 * d).lerp(BG_COLOR, 0.45 * d)
    }
  }
}
// spin keeps the plate's angle and each slot's scale across rebuilds, so choosing an item turns the plate
// from where it was instead of snapping.
function buildTurntable(node, sel, spin) {
  const anims = []
  const items = node.variants[0].items
  const n = items.length
  const cur = sel?.[0] ?? 0
  const drawn = catalogueDrawn(node)
  const root = new THREE.Group()
  const plate = new THREE.Group()
  root.add(plate)
  const top = -0.32
  const rim = TT_R + 0.38
  // The plate is implied: a faint glow, a rim line and the track the items ride on. Only the rim's
  // front arc is bright; it stays facing the reader and marks the chosen place.
  const flat = (geo, color, base, y = top) => {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide })
    m.userData.base = base
    const mesh = new THREE.Mesh(geo, m)
    mesh.userData.noDepth = true
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = y
    return mesh
  }
  const glow = flat(new THREE.CircleGeometry(rim, 96), '#ffffff', 0.28)
  glow.material.map = plateGlow
  plate.add(
    glow,
    flat(new THREE.RingGeometry(rim - 0.006, rim + 0.006, 160), '#E663B5', 0.4),
    flat(new THREE.RingGeometry(rim * 0.9 - 0.004, rim * 0.9 + 0.004, 160), '#B79CE0', 0.16, top - 0.07),
    flat(new THREE.RingGeometry(TT_R - 0.003, TT_R + 0.003, 160), '#9686A2', 0.22),
  )
  for (let i = 0; i < n; i++) {
    const tick = flat(new THREE.PlaneGeometry(0.012, 0.07), '#E663B5', 0.6)
    const a = (i / n) * Math.PI * 2
    tick.position.set(Math.sin(a) * (rim - 0.05), top, Math.cos(a) * (rim - 0.05))
    tick.rotation.z = a
    plate.add(tick)
  }
  const arc = Math.min(0.7, (Math.PI / n) * 0.9)
  const front = flat(new THREE.RingGeometry(rim - 0.016, rim + 0.016, 32, 1, -Math.PI / 2 - arc / 2, arc), '#ffd0ec', 0.9)
  root.add(front)
  anims.push(() => (front.rotation.z = controls.getAzimuthalAngle()))
  if (!drawn) {
    const v = buildVisual(node, sel)
    v.obj.scale.multiplyScalar(0.85)
    v.obj.position.y = top - new THREE.Box3().setFromObject(v.obj).min.y + 0.02
    root.add(v.obj)
    anims.push(...v.anims)
  }
  const [big, small] = drawn ? [0.95, 0.5] : [1, 1]
  items.forEach((it, i) => {
    const a = (i / n) * Math.PI * 2
    const slot = new THREE.Group()
    slot.userData.variant = i
    // Each drawing stands on the plate facing outward, so the one at the front faces the reader,
    // and it grows upward as it comes to the front.
    slot.position.set(Math.sin(a) * TT_R, top, Math.cos(a) * TT_R)
    slot.rotation.y = a
    if (drawn) {
      const s = [...(sel ?? [])]
      s[0] = i
      const v = buildVisual(node, s)
      v.obj.position.y = -new THREE.Box3().setFromObject(v.obj).min.y
      slot.add(v.obj)
      anims.push(...v.anims)
    }
    // Name cards sit on the rim in front of their item, so the front card never hides behind its drawing.
    const card = nameCard(it.name, i === cur, anims)
    card.userData.variant = i
    const cardR = drawn ? TT_R + 0.3 : TT_R
    card.position.set(Math.sin(a) * cardR, top + 0.09, Math.cos(a) * cardR)
    plate.add(card)
    const want = i === cur ? big : small
    slot.scale.setScalar(spin.scales[i] ?? want)
    // Items fade and grey out the further they turn from the front.
    const dim = dimmer([slot, card])
    anims.push((t, dt) => {
      const s = slot.scale.x + (want - slot.scale.x) * (1 - Math.exp(-dt * 6))
      slot.scale.setScalar(s)
      spin.scales[i] = s
      dim((1 - Math.cos(a + plate.rotation.y - controls.getAzimuthalAngle())) / 2)
    })
    plate.add(slot)
  })
  // The front is the side facing the camera, so the chosen item stays in front while the view sways.
  const goal = () => controls.getAzimuthalAngle() - (cur / n) * Math.PI * 2
  if (spin.angle == null) spin.angle = goal()
  plate.rotation.y = spin.angle
  anims.push((t, dt) => {
    const d = goal() - spin.angle
    spin.d = Math.atan2(Math.sin(d), Math.cos(d))
    spin.angle += reducedMotion ? spin.d : spin.d * (1 - Math.exp(-dt * 4))
    plate.rotation.y = spin.angle
  })
  root.scale.setScalar(0.55)
  return { obj: root, center: V(), size: 1, anims }
}
// Which item of the open node's turntable is under the pointer, or null for the plate, the centre or nothing.
function plateItemAt(clientX, clientY) {
  const it = items.get(path.at(-1))
  if (!it?.tt) return null
  aim(clientX, clientY)
  for (const x of raycaster.intersectObject(it.group, true)) {
    let o = x.object
    while (o && o.userData.variant === undefined && o.userData.id === undefined) o = o.parent
    return o?.userData.variant ?? null
  }
  return null
}
// A click on an item other than the chosen one turns the plate; a click on the chosen one opens the node.
function plateChoice(clientX, clientY) {
  const v = plateItemAt(clientX, clientY)
  return v === (selections.get(path.at(-1))?.[0] ?? 0) ? null : v
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
    this.tt = turntableOn(this.id)
    if (!this.tt) this.spin = null
    const sel = selections.get(this.id)
    const v = this.tt ? buildTurntable(this.node, sel, (this.spin ??= { angle: null, scales: [] })) : buildVisual(this.node, sel)
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
let path = [teardown.root]
let exploded = false
let mode = 'explore'
let step = 0
let phase = 'gather'
let hoverId = null
let timers = []
let haloOn = false
let camMoving = true
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
// Parts sit on an ellipse that always faces the camera, so none hides behind the centre or another part.
const HALO_DIST = 7.4
// An upright view (a phone) is too narrow for the ring at HALO_DIST: its narrowest width (rx 1.3, see haloRadii)
// runs past the sides. So the camera backs off until that width fits with the usual margin, and the ring grows taller.
function haloDist() {
  return Math.max(HALO_DIST, 2.0 / (Math.tan(deg(camera.fov / 2)) * camera.aspect))
}
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
  const [rx, ry] = haloRadii(haloDist())
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

function layout(replace = false) {
  // An item shows its turntable only while it is the open, whole node; rebuild those where that changes
  // before any part starts from its anchor.
  for (const it of items.values()) if (!it.dying && it.tt !== turntableOn(it.id)) it.build()
  const want = new Map()
  if (mode === 'explore') {
    const focus = path.at(-1)
    const kids = exploded ? byId.get(focus).children ?? [] : []
    const sc = childScale(kids.length)
    want.set(focus, { pos: V(), scale: kids.length ? S_FOCUS * 0.82 : S_FOCUS, fade: kids.length ? 0.16 : 1 })
    kids.forEach((c, i) => want.set(c, { halo: haloSlot(i, kids.length), scale: sc, fade: 1, leaderFrom: focus, from: () => startFrom(focus, c) }))
    haloOn = kids.length > 0
  } else {
    const s = teardown.assembly[step]
    const makes = s.makes ?? teardown.root
    const adds = s.adds.filter((a) => a !== makes)
    const gather = phase === 'gather' && adds.length > 0
    const sc = childScale(adds.length)
    want.set(makes, { pos: V(), scale: gather ? S_FOCUS * 0.82 : S_FOCUS, fade: gather ? 0.2 : 1 })
    if (gather) adds.forEach((a, i) => want.set(a, { halo: haloSlot(i, adds.length), scale: sc, fade: 1, leaderFrom: makes, from: () => ({ pos: haloPoint(haloSlot(i, adds.length)).multiplyScalar(1.6), scale: 0.2 }) }))
    haloOn = gather
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
  syncUrl(replace)
}
// The address bar follows the open node or flatpack step. Each move to another adds a history entry, so Back and
// Forward work; `replace` changes the entry instead, for the steps a run of Play moves on to.
function syncUrl(replace) {
  const id = path.at(-1)
  document.title = mode === 'flatpack' ? stepTitle(teardown, step) : id === teardown.root ? baseTitle : `${byId.get(id).term} · ${baseTitle}`
  const href = mode === 'flatpack' ? stepHref(step) : hrefOf(id)
  if (viewHref(viewFromUrl()) !== href) history[replace ? 'replaceState' : 'pushState'](null, '', href)
}

function pathTo(id) {
  const p = [id]
  while (parentOf.has(p[0])) p.unshift(parentOf.get(p[0]))
  return p
}
// On a phone the page scrolls; a link in the panel opens its node in the view at the top, so bring the view back.
function go(id) {
  clearTimers()
  mode = 'explore'
  path = pathTo(id)
  exploded = opensSplit(byId.get(id))
  closeOverlay()
  layout()
  if (stageEl.getBoundingClientRect().top < 0) scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
}
function pick(id) {
  if (mode === 'flatpack') return go(id)
  const focus = path.at(-1)
  // The centre splits apart or closes up; a leaf has nothing to split, so its centre goes up a level.
  if (id === focus) return (byId.get(focus).children ?? []).length ? toggleExplode() : back()
  if (exploded && (byId.get(focus).children ?? []).includes(id)) {
    path.push(id)
    exploded = opensSplit(byId.get(id))
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
  if (overlay) return closeOverlay()
  if (mode === 'flatpack') return leaveFlatpack()
  if (path.length > 1) { path.pop(); exploded = true }
  else if (exploded) exploded = false
  else return
  layout()
}
function clearTimers() { for (const t of timers) clearTimeout(t); timers = [] }
// Each step gathers its parts, then joins them. Steps move on only while the reader presses Play,
// so a reader can stay on a step as long as they like; Pause holds the view as it is, even mid-step.
// A run of Play adds one history entry for the steps it moves through, so one Back returns to the step it started from.
let playing = false
function showStep(i, play = false, replace = false) {
  clearTimers()
  const from = step
  step = Math.max(0, Math.min(teardown.assembly.length - 1, i))
  phase = 'gather'
  playing = play && step < teardown.assembly.length - 1
  layout(replace)
  timers.push(setTimeout(() => { phase = 'join'; layout() }, 1500))
  // The run's first move to another step adds its entry; every later move replaces that entry.
  const runEntry = replace || step !== from
  if (playing) timers.push(setTimeout(() => showStep(step + 1, true, runEntry), 3600))
}
function play() {
  if (phase === 'gather') return showStep(step, true)
  showStep(step === teardown.assembly.length - 1 ? 0 : step + 1, true)
}
function pause() { clearTimers(); playing = false; renderStrip() }
function enterFlatpack(i = 0) { mode = 'flatpack'; closeOverlay(); showStep(i) }
function leaveFlatpack() { clearTimers(); mode = 'explore'; exploded = false; path = [teardown.root]; layout() }

// ---------- panel ----------
const chip = (id, extra = '') => {
  const n = byId.get(id)
  return link(id, { class: 'ev-chip', style: `--k:${KIND[n.kind].color}`, title: n.plain }, () => go(id), h('span', { class: 'dot' }), n.term, extra)
}
// A book with an ISBN links to its Google Books page: a preview to read, and shops and libraries that have it, local to the reader.
const copyLink = (isbn) => h('a', { class: 'copy', href: `https://books.google.com/books?vid=ISBN${isbn.replace(/[^0-9X]/gi, '')}`, target: '_blank', rel: 'noopener' }, 'Find a copy')
function sourcesList(sources, unverified) {
  return h('div', { class: 'ev-sources' },
    (sources ?? []).length ? h('ol', {}, sources.map((s) => h('li', {},
      h('span', { class: 'kind' }, s.kind), ' ',
      h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label),
      s.page ? h('span', { class: 'page' }, ` ${s.page}`) : null,
      s.copy ? h('span', { class: 'page' }, ' · read in the book') : null,
      s.isbn ? [' · ', copyLink(s.isbn)] : null,
      s.quote ? h('q', { class: 'quote' }, s.quote) : null,
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
  if (id === teardown.root) out.push(h('div', { class: 'ev-summary' }, h('h3', {}, 'How a professional sees it'), h('p', {}, teardown.summary)))
  out.push(h('div', { class: 'ev-kind', style: `--k:${k.color}` }, n.loop?.type === 'cycle' ? 'Cycle: steps that repeat' : k.label))
  out.push(h('h2', {}, n.term))
  if (n.aka?.length) out.push(h('p', { class: 'ev-aka' }, 'You might say: ', n.aka.join(', ')))
  out.push(h('p', { class: 'ev-plain' }, n.plain))
  const rows = [['What it does', n.does], ['Ask', n.ask], ['Typical', n.range], ['Trouble', n.trouble]].filter(([, v]) => v)
  out.push(h('dl', {}, rows.map(([dt, dd]) => [h('dt', {}, dt), h('dd', {}, dd)])))
  if (n.cues?.length) out.push(section('What to look for', h('ol', { class: 'ev-cues' }, n.cues.map((c) => h('li', {}, c)))))
  if (n.variants?.length) {
    for (const [ci, cat] of n.variants.entries()) {
      const item = cat.items[sel?.[ci] ?? 0]
      out.push(section(`Catalogue: ${cat.label}`, h('p', {}, h('b', {}, item.name), ': ', item.plain), item.why ? h('p', { class: 'ev-why' }, item.why) : null, sourcesList(item.sources, item.unverified)))
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
  if (teardownRef) out.push(section('Use it on your project', copyPrompt(usePrompt(teardown, n, teardownRef)),
    teardownFile ? null : h('p', {}, 'Paste it into a coding agent that has the ', h('a', { href: SKILL_URL, target: '_blank', rel: 'noopener' }, 'teardown skills'), '.')))
  if (!n.children?.length && n.kind !== 'pattern') {
    out.push(section('Go deeper', n.deeper ? h('p', {}, n.deeper) : null,
      teardownFile
        ? copyPrompt(deeperPrompt(n, teardownFile))
        : h('p', {}, 'To open the next level, run the ', h('a', { href: SKILL_URL, target: '_blank', rel: 'noopener' }, 'teardown skill'), ' in your own coding agent.')))
  }
  return out
}
function copyPrompt(text) {
  return h('p', { class: 'ev-ask' }, h('code', {}, text), ' ', h('button', { type: 'button', class: 'ev-copy', onclick: (e) => { navigator.clipboard?.writeText(text); e.target.textContent = 'Copied' } }, 'Copy'))
}
function stepPanel() {
  const s = teardown.assembly[step]
  return [
    h('div', { class: 'ev-kind', style: '--k:#C9A45C' }, `Flatpack: step ${step + 1} of ${teardown.assembly.length}`),
    h('h2', {}, s.title),
    h('p', { class: 'ev-plain' }, s.text),
    section('Brings together', h('div', { class: 'ev-chips' }, s.adds.map((a) => chip(a)))),
    section('Makes', h('div', { class: 'ev-chips' }, chip(s.makes ?? teardown.root))),
  ]
}
// Every panel ends with the AI note, so a reader who lands on any node or flatpack step sees who wrote the map.
function renderPanel() {
  const note = h('p', { class: 'ev-note' }, AI_NOTE, legalUrl ? [' ', h('a', { href: legalUrl }, 'About and legal')] : null)
  panelEl.replaceChildren(...(mode === 'flatpack' ? stepPanel() : nodePanel(path.at(-1))).filter(Boolean), note)
  panelEl.scrollTop = 0
}
function renderCrumbs() {
  const ids = mode === 'flatpack' ? [teardown.root] : path
  const parts = []
  ids.forEach((id, i) => {
    if (i) parts.push(h('span', { class: 'sep' }, '›'))
    parts.push(link(id, { 'aria-current': i === ids.length - 1 ? 'page' : null }, () => go(id), byId.get(id).term))
  })
  if (byId.get(path[0]).kind === 'pattern' && mode === 'explore') parts.unshift(h('span', { class: 'sep' }, 'Pattern ·'))
  crumbsEl.replaceChildren(...parts)
  crumbsEl.scrollLeft = crumbsEl.scrollWidth
}
function renderStrip() {
  const rows = []
  if (mode === 'flatpack') {
    rows.push(h('div', { class: 'ev-row' },
      h('span', { class: 'ev-rowlabel' }, 'Flatpack'),
      h('div', { class: 'ev-cells' },
        h('button', { type: 'button', onclick: () => showStep(step - 1), disabled: step === 0 }, '‹ Back'),
        // Each step is a link to its own URL, so a reader can copy it or open the step in a new tab.
        teardown.assembly.map((s, i) => anchor(stepHref(i), { 'aria-current': i === step ? 'step' : null }, () => showStep(i), `${i + 1}. ${s.title}`)),
        h('button', { type: 'button', onclick: () => showStep(step + 1), disabled: step === teardown.assembly.length - 1 }, 'Next ›'),
        h('button', { type: 'button', 'aria-pressed': String(playing), onclick: () => (playing ? pause() : play()) }, playing ? 'Pause' : 'Play'))))
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
// On a touch screen the hint is shorter: the view is narrow, and the hint sits over its lowest part.
function renderHint() {
  const n = byId.get(path.at(-1))
  const deeper = n.kind !== 'pattern'
  if (turntableOn(n.id)) {
    const verb = touchFirst.matches ? 'Tap' : 'Click'
    const apart = (n.children ?? []).length ? ` ${verb} the front one to take the ${n.term.toLowerCase()} apart.` : ''
    hintEl.textContent = `${verb} another ${n.variants[0].label.toLowerCase()} on the plate to bring it to the front.${apart}`
    return
  }
  hintEl.textContent = touchFirst.matches
    ? mode === 'flatpack' ? 'Step through with Next, or press Play. Tap a part to open it.'
    : !exploded && (n.children ?? []).length ? `Tap the ${n.term.toLowerCase()} to take it apart. Drag to turn, pinch to zoom.`
    : exploded ? 'Tap a part to open it, or the centre to put it back.'
    : `This is a leaf. Tap it to go back up a level${deeper ? '; Go deeper is in the panel' : ''}.`
    : mode === 'flatpack' ? 'Pick a step below, or press Play to run through them. Click a part to open it.'
    : !exploded && (n.children ?? []).length ? `Click the ${n.term.toLowerCase()} to take it apart. Drag to turn.`
    : exploded ? 'Click a part to open it. Click the centre to put it back together. Esc goes up a level.'
    : `This is a leaf. Click it or press Esc to go back up a level${deeper ? ', or use Go deeper in the panel' : ''}.`
}

// ---------- overlays: index and sources ----------
let overlay = null
function toggleOverlay(which) { overlay === which ? closeOverlay() : openOverlay(which) }
function openOverlay(which) {
  overlay = which
  const v = which === 'index' ? indexView() : sourcesView()
  const input = h('input', { type: 'search', placeholder: v.find, 'aria-label': v.find })
  const list = h('ul', { class: v.list })
  const draw = () => list.replaceChildren(...v.rows(input.value.trim().toLowerCase()))
  input.addEventListener('input', draw)
  draw()
  overlayEl.replaceChildren(h('div', { class: 'ev-overlay-head' }, h('b', {}, v.title), input,
    h('button', { type: 'button', class: 'ev-close', onclick: closeOverlay }, 'Close')), list)
  overlayEl.hidden = false
  overlayEl.scrollTop = 0
  btnIndex.setAttribute('aria-pressed', String(which === 'index'))
  btnSources.setAttribute('aria-pressed', String(which === 'sources'))
  if (!touchFirst.matches) input.focus()
}
function closeOverlay() {
  overlay = null
  overlayEl.hidden = true
  btnIndex.setAttribute('aria-pressed', 'false')
  btnSources.setAttribute('aria-pressed', 'false')
}

// With no query, every term A–Z. With a query, every node and catalogue item that holds all its
// words in any field (search.mjs), best first, with the matching field and the words around the match.
const entries = searchEntries(teardown)
function indexView() {
  const sorted = [...teardown.nodes].sort((a, b) => a.term.localeCompare(b.term, 'en-GB'))
  const row = (n, term, kind, where, text, open) => h('li', {}, link(n.id, { 'data-id': n.id }, open,
    h('span', { class: 'term', style: `--k:${KIND[n.kind].color}` }, h('span', { class: 'dot' }), term),
    h('span', { class: 'kind' }, kind),
    h('span', { class: 'plain' }, where ? h('b', {}, `${where}: `) : null, text)))
  return {
    title: `Index · ${teardown.nodes.length} terms`, find: 'Search every term, note and source', list: 'ev-terms',
    rows: (q) => q
      ? (() => {
        const hits = search(entries, q)
        const rows = hits.map((r) => {
          const n = byId.get(r.id)
          const open = () => { go(r.id); if (r.item) choose(r.id, r.item.ci, r.item.ii) }
          const where = [r.item && `In ${r.item.of}`, r.field !== 'Term' && r.field].filter(Boolean).join(', ')
          return row(n, r.term, r.item ? r.item.catalogue : KIND[n.kind].short ?? KIND[n.kind].label, where, r.field === 'Term' ? r.summary : snippet(r.text, q), open)
        })
        return hits[0]?.partial ? [h('li', { class: 'ev-note' }, 'Nothing holds every word. Closest matches:'), ...rows] : rows
      })()
      : sorted.map((n) => row(n, n.term, KIND[n.kind].short ?? KIND[n.kind].label, null, n.plain, () => go(n.id))),
  }
}

// Every citation in the teardown, node and catalogue item alike, grouped by work. One ISBN is one work;
// without an ISBN, one kind and label is one work. The survey's canon comes first, most named first,
// even where no node cites it yet; then the rest by kind, books first, most cited first.
const SOURCE_GROUPS = { book: 'Books', research: 'Research', practitioner: 'Practitioners', maker: 'Makers', standard: 'Standards', reference: 'Reference', forum: 'Forums', neighbour: 'Neighbouring subjects' }
const SOURCE_ORDER = Object.keys(SOURCE_GROUPS)
const survey = teardown.survey ?? {}
const listById = new Map((survey.lists ?? []).map((l) => [l.id, l]))
function collectWorks() {
  const byKey = new Map()
  const most = (counts) => [...counts].sort((a, b) => b[1] - a[1])[0][0]
  const work = (s) => {
    const isbn = s.isbn?.replace(/[^0-9X]/gi, '').toUpperCase()
    const key = isbn ? `isbn ${isbn}` : `${s.kind} ${s.label}`
    if (!byKey.has(key)) byKey.set(key, { kind: s.kind, isbn, labels: new Map(), urls: new Map(), cites: new Map() })
    const w = byKey.get(key)
    w.labels.set(s.label, (w.labels.get(s.label) ?? 0) + 1)
    w.urls.set(s.url, (w.urls.get(s.url) ?? 0) + 1)
    return w
  }
  for (const c of survey.canon ?? []) work(c).canon = c
  const cite = (s, id, item) => work(s).cites.set(JSON.stringify([id, item, s.page, s.url]), { id, item, page: s.page, url: s.url })
  for (const n of teardown.nodes) {
    for (const s of n.sources ?? []) cite(s, n.id)
    for (const cat of n.variants ?? []) for (const it of cat.items) for (const s of it.sources ?? []) cite(s, n.id, it.name)
  }
  return [...byKey.values()]
    .map((w) => ({ ...w, label: w.canon?.label ?? most(w.labels), url: w.canon?.url ?? most(w.urls), cites: [...w.cites.values()], nodes: new Set([...w.cites.values()].map((c) => c.id)).size }))
    .sort((a, b) => SOURCE_ORDER.indexOf(a.kind) - SOURCE_ORDER.indexOf(b.kind) || b.nodes - a.nodes || a.label.localeCompare(b.label, 'en-GB'))
}
const ext = (href, ...kids) => h('a', { href, target: '_blank', rel: 'noopener' }, ...kids)
function sourcesView() {
  const works = collectWorks()
  const canon = works.filter((w) => w.canon).sort((a, b) => b.canon.named.length - a.canon.named.length || b.nodes - a.nodes)
  const rest = works.filter((w) => !w.canon)
  const books = works.filter((w) => w.kind === 'book').length
  const workRow = (w) => h('li', { class: 'ev-work' },
    h('div', { class: 'ev-work-head' },
      ext(w.url, w.label),
      h('span', { class: 'count' }, w.nodes ? `${w.nodes} ${w.nodes === 1 ? 'node' : 'nodes'}` : 'not cited on a node yet')),
    w.canon ? h('p', { class: 'ev-work-why' }, w.canon.specialism ? [h('b', {}, w.canon.specialism), ': '] : null, w.canon.why) : null,
    w.canon ? h('div', { class: 'ev-work-meta' }, `Named by ${w.canon.named.length}: `,
      w.canon.named.map((id, i) => [i ? ', ' : '', ext(listById.get(id).url, listById.get(id).label)])) : null,
    w.isbn ? h('div', { class: 'ev-work-meta' }, `ISBN ${w.isbn} · `, copyLink(w.isbn)) : null,
    w.cites.length ? h('div', { class: 'ev-cites' }, w.cites.map((c) => h('span', { class: 'ev-cite' },
      chip(c.id, c.item ? ` · ${c.item}` : ''),
      c.page ? h('a', { class: 'page', href: c.url, target: '_blank', rel: 'noopener' }, c.page)
      : c.url !== w.url ? h('a', { class: 'page', href: c.url, target: '_blank', rel: 'noopener', title: c.url }, 'page')
      : null))) : null)
  const voiceRow = (v) => h('li', { class: 'ev-work' },
    h('div', { class: 'ev-work-head' }, h('b', {}, v.name)),
    h('p', { class: 'ev-work-why' }, v.known),
    h('div', { class: 'ev-work-meta' }, v.links.map((l, i) => [i ? ' · ' : '', ext(l.url, l.label), ` (${l.kind})`])))
  const listRow = (l) => h('li', { class: 'ev-work' }, h('div', { class: 'ev-work-head' }, ext(l.url, l.label), h('span', { class: 'count' }, l.kind)))
  const group = (title, items, row) => (items.length ? [h('li', { class: 'ev-group' }, `${title} · ${items.length}`), ...items.map(row)] : [])
  const has = (q, ...texts) => !q || texts.join(' ').toLowerCase().includes(q)
  const workText = (w) => [w.label, ...w.labels.keys(), w.kind, w.isbn ?? '', w.canon?.why ?? '', ...w.cites.map((c) => c.page ?? '')]
  return {
    title: `Sources · ${works.length} works, ${books} ${books === 1 ? 'book' : 'books'}${survey.voices?.length ? `, ${survey.voices.length} voices` : ''}`, find: 'Find a source', list: 'ev-works',
    rows: (q) => [
      ...group('Canon: what practitioners say to read', canon.filter((w) => has(q, ...workText(w))), workRow),
      ...group('Voices: practitioners who teach in public', (survey.voices ?? []).filter((v) => has(q, v.name, v.known, ...v.links.map((l) => `${l.label} ${l.kind}`))), voiceRow),
      ...SOURCE_ORDER.flatMap((kind) => group(SOURCE_GROUPS[kind], rest.filter((w) => w.kind === kind && has(q, ...workText(w))), workRow)),
      ...group('Lists surveyed', (survey.lists ?? []).filter((l) => has(q, l.label, l.kind)), listRow),
    ],
  }
}

// ---------- input ----------
const raycaster = new THREE.Raycaster()
raycaster.params.Points.threshold = 0.03
const ndc = new THREE.Vector2()
let downAt = null
let pointerDirty = false
let lastPointer = null
function aim(clientX, clientY) {
  const r = canvas.getBoundingClientRect()
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
}
function hit(clientX, clientY) {
  aim(clientX, clientY)
  const targets = [...items.values()].filter((i) => !i.dying && i.fade > 0.1).map((i) => i.group)
  for (const x of raycaster.intersectObjects(targets, true)) {
    let o = x.object
    while (o && o.userData.id === undefined) o = o.parent
    if (o) return o.userData.id
  }
  return null
}
// On a touch screen the labels let touches through to the canvas, so a drag or pinch that starts on a label
// still turns or zooms the view. A tap on a label then lands here: the nearest label within a finger's reach wins.
function labelAt(x, y) {
  const reach = 8
  let best = null, bestD = Infinity
  for (const it of items.values()) {
    if (it.dying || it.label.style.display === 'none') continue
    const r = it.label.getBoundingClientRect()
    if (x < r.left - reach || x > r.right + reach || y < r.top - reach || y > r.bottom + reach) continue
    const d = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2)
    if (d < bestD) { best = it.id; bestD = d }
  }
  return best
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
    const id = labelAt(e.clientX, e.clientY)
    const v = id ? null : plateChoice(e.clientX, e.clientY)
    if (v != null) choose(path.at(-1), 0, v)
    else {
      const target = id ?? hit(e.clientX, e.clientY)
      if (target) pick(target)
    }
  }
  downAt = null
})
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') closeOverlay(); return }
  if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); back() }
  else if (e.key === 'Enter' || e.key === ' ') { if (e.target === document.body) { e.preventDefault(); toggleExplode() } }
  else if (e.key === '/') { e.preventDefault(); openOverlay('index') }
})
addEventListener('popstate', () => {
  const v = viewFromUrl()
  if (v.step >= 0) { if (mode !== 'flatpack' || v.step !== step) enterFlatpack(v.step) }
  else if (mode !== 'explore' || v.id !== path.at(-1)) go(v.id)
})
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
  composer.setPixelRatio(renderer.getPixelRatio())
  composer.setSize(r.width, r.height)
  camera.aspect = r.width / Math.max(1, r.height)
  camera.updateProjectionMatrix()
  bokeh.uniforms.aspect.value = camera.aspect
  if (haloOn) camMoving = true // the ring's distance depends on the view's shape
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
  const camGoal = haloOn ? haloDist() : 4.6
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
  // Blur eases in and out with the turntable. Its focus is the plate's centre: everything nearer is sharp.
  const tt = mode === 'explore' ? items.get(path.at(-1)) : null
  const blurOn = !!tt?.tt && !tt.dying
  blur += ((blurOn ? BLUR : 0) - blur) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 5))
  if (blur > 1e-4) {
    if (blurOn) bokeh.uniforms.focus.value = -tmp.copy(tt.group.position).applyMatrix4(camera.matrixWorldInverse).z
    bokeh.uniforms.aperture.value = blur
    scene.background = bgToned
    composer.render(dt)
    scene.background = bgPlain
  } else renderer.render(scene, camera)
  const focus = mode === 'explore' ? path.at(-1) : teardown.assembly[step].makes ?? teardown.root
  const placed = []
  for (const it of items.values()) {
    tmp.copy(it.group.position)
    tmp.addScaledVector(camUp, it.group.scale.x * 0.56)
    tmp.project(camera)
    const ax = ((tmp.x + 1) / 2) * rect.width, ay = ((1 - tmp.y) / 2) * rect.height
    const ghost = !it.dying && it.targetFade < 0.5
    // A label goes when its part leaves the view, as when a pinch zooms in close.
    const show = it.fade > 0.08 && tmp.z < 1 && !ghost && ax >= 0 && ax <= rect.width && ay >= 0 && ay <= rect.height
    it.label.style.display = show ? '' : 'none'
    if (!show) continue
    const focused = it.id === focus
    if (it.label.classList.contains('focus') !== focused) { it.label.classList.toggle('focus', focused); it.labelW = 0 }
    if (!it.labelW) { it.labelW = it.label.offsetWidth; it.labelH = it.label.offsetHeight }
    // The whole label stays inside the view: a part near the edge of a narrow screen would otherwise cut its name off.
    placed.push({ it, x: Math.min(Math.max(ax - it.labelW / 2, 4), rect.width - it.labelW - 4), y: ay - it.labelH })
    it.label.style.opacity = String(Math.min(1, it.dying ? it.fade : Math.max(it.fade, focused ? 0.85 : 0)))
    it.label.style.zIndex = String(Math.round((1 - tmp.z) * 1e5))
  }
  // Labels that overlap move apart, up and down. On a narrow screen the parts at the top and bottom of the ring sit close.
  const live = placed.filter((p) => !p.it.dying)
  for (let pass = 0; pass < 3; pass++)
    for (let i = 0; i < live.length; i++)
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j]
        if (a.x >= b.x + b.it.labelW + 2 || b.x >= a.x + a.it.labelW + 2) continue
        const [hi, lo] = a.y <= b.y ? [a, b] : [b, a]
        const d = hi.y + hi.it.labelH + 2 - lo.y
        if (d > 0) { hi.y -= d / 2; lo.y += d / 2 }
      }
  for (const p of placed) p.it.label.style.transform = `translate(${p.x}px, ${Math.max(p.y, 4)}px)`
  requestAnimationFrame(frame)
}

// ---------- start ----------
const start = viewFromUrl()
history.replaceState(null, '', viewHref(start))
if (start.step >= 0) enterFlatpack(start.step)
else {
  if (start.id !== teardown.root) {
    path = pathTo(start.id)
    exploded = opensSplit(byId.get(start.id))
  }
  layout()
}
requestAnimationFrame(frame)
window.__ev = {
  ready: true,
  state: () => ({ mode, path: [...path], exploded, step, phase, turntable: turntableOn(path.at(-1)), choice: selections.get(path.at(-1))?.[0] ?? 0, blur: blur > 1e-4 ? blur : 0, visible: [...items.values()].filter((i) => !i.dying && i.fade > 0.5).map((i) => i.id) }),
  screenPos(id) {
    const it = items.get(id)
    if (!it) return null
    const v = it.group.position.clone().project(camera)
    const r = canvas.getBoundingClientRect()
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, visible: v.z < 1 }
  },
  // A screen point where item i of the open node's turntable is the first thing under the pointer, nearest
  // the middle of its drawing and name card. Null when another item or the plate hides all of it.
  platePos(i) {
    const box = new THREE.Box3()
    items.get(path.at(-1))?.content.traverse((o) => { if (o.userData.variant === i) box.expandByObject(o) })
    if (box.isEmpty()) return null
    const r = canvas.getBoundingClientRect()
    const xs = [], ys = []
    for (let k = 0; k < 8; k++) {
      const v = V(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).project(camera)
      xs.push(r.left + ((v.x + 1) / 2) * r.width)
      ys.push(r.top + ((1 - v.y) / 2) * r.height)
    }
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    let best = null
    for (let a = 0; a <= 16; a++)
      for (let b = 0; b <= 16; b++) {
        const x = x0 + ((x1 - x0) * a) / 16, y = y0 + ((y1 - y0) * b) / 16
        const d = Math.hypot(x - cx, y - cy)
        if ((!best || d < best.d) && plateItemAt(x, y) === i) best = { x, y, d }
      }
    return best && { x: best.x, y: best.y, visible: true }
  },
  settled: () => [...items.values()].every((i) => Math.abs(i.fade - i.targetFade) < 0.03 && i.group.position.distanceTo(i.targetPos) < 0.03 && Math.abs(i.spin?.d ?? 0) < 0.01) && !camMoving,
  renderer: () => {
    const gl = renderer.getContext()
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
  },
}
