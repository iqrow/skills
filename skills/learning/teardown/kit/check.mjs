#!/usr/bin/env node
// Opens a built teardown page in headless Chrome, clicks through it with real mouse input,
// and saves screenshots. No npm dependencies: it talks to Chrome over the DevTools protocol.
// Usage: node check.mjs page.html [out-dir] [--open id,id,...]
//   default: the standard tour (root, explode, two levels down, turntable, catalogues, a loop, plot and feel, flatpack)
//   --open:  the root, then only the listed nodes, each opened from the Index (a node with a catalogue opens
//            whole on its turntable, then is split apart if it has parts)
// Env: CHROME=/path/to/chrome to choose the browser.
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { launch } from './chrome.mjs'

const args = process.argv.slice(2)
const oi = args.indexOf('--open')
const only = oi >= 0 ? (args.splice(oi, 2)[1] ?? '').split(',').filter(Boolean) : null
if (!args[0] || (only && !only.length)) {
  console.error('Usage: node check.mjs page.html [out-dir] [--open id,id,...]')
  process.exit(2)
}
const page = resolve(args[0])
const outDir = resolve(args[1] ?? join(dirname(page), basename(page, extname(page)) + '-check'))
mkdirSync(outDir, { recursive: true })
const W = 1440, H = 900
const { version, S, js, waitFor, errors, cleanup } = await launch({ width: W, height: H }).catch((e) => {
  console.error(`FAIL: ${e.message}`)
  process.exit(1)
})
await S('Page.navigate', { url: pathToFileURL(page).href })
const settle = async () => { await sleep(500); await waitFor('window.__ev.settled()', 8000).catch(() => {}); await sleep(250) }
const shots = []
const shot = async (name, note) => {
  const { data } = await S('Page.captureScreenshot', { format: 'png' })
  const file = join(outDir, `${String(shots.length + 1).padStart(2, '0')}-${name}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  shots.push({ file, note })
}
const click = async (x, y) => {
  await S('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await sleep(60)
  await S('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await S('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
}
// On a turntable the open node is clicked through its front item; the items behind it would turn the plate instead.
const clickNode = async (id) => {
  const p = await js(`(() => { const s = window.__ev.state(); return s.turntable && s.path.at(-1) === ${JSON.stringify(id)} ? window.__ev.platePos(s.choice) : window.__ev.screenPos(${JSON.stringify(id)}) })()`)
  if (!p?.visible) throw new Error(`"${id}" is not on screen`)
  await click(p.x, p.y)
}
const clickEl = async (selector, text) => {
  const r = await js(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const e = ${text ? `els.find((x) => x.textContent.trim() === ${JSON.stringify(text)})` : 'els[0]'}
    if (!e) return null
    e.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const b = e.getBoundingClientRect()
    const x = b.left + b.width / 2, y = b.top + b.height / 2
    const top = document.elementFromPoint(x, y)
    const hit = !!top && (top === e || e.contains(top))
    const desc = (t) => t ? t.tagName.toLowerCase() + (t.className ? '.' + String(t.className).split(' ').join('.') : '') + (t.textContent ? ' "' + t.textContent.trim().slice(0, 40) + '"' : '') : 'nothing'
    return { x, y, hit, top: desc(top), box: [b.left, b.top, b.width, b.height].map(Math.round) }
  })()`)
  if (!r) throw new Error(`no element ${selector}${text ? ` "${text}"` : ''}`)
  if (!r.hit) throw new Error(`click on ${selector}${text ? ` "${text}"` : ''} at box ${r.box} would land on ${r.top}`)
  await click(r.x, r.y)
}
const key = async (k, code = k, vk = 27) => {
  await S('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk })
  await S('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk })
}
const state = () => js('window.__ev.state()')
const expect = async (cond, msg) => { if (!(await js(cond))) throw new Error(msg) }

const report = []
const hasPlate = (n) => (n.variants?.[0]?.items.length ?? 0) > 1
// A node with a catalogue opens whole, on its turntable. Clicking it takes it apart.
const splitTurntable = async (n) => {
  if ((await state()).exploded || !(n.children ?? []).length) return
  await shot(`turntable-${n.id}`, `opened "${n.term}" whole, on its ${n.variants[0].label} turntable`)
  await clickNode(n.id)
  await settle()
  await expect('window.__ev.state().exploded', `clicking "${n.id}" on its turntable did not take it apart`)
}
const openViaIndex = async (n) => {
  await clickEl('.ev-actions button', 'Index')
  await sleep(200)
  await clickEl(`.ev-terms a[data-id="${n.id}"]`)
  await settle()
  await expect(`window.__ev.state().path.at(-1) === ${JSON.stringify(n.id)}`, `index did not open "${n.id}"`)
}

async function tour(teardown, byId) {
  await clickNode(teardown.root)
  await settle()
  await expect('window.__ev.state().exploded', 'clicking the root did not explode it')
  // The turntable's depth of field must clear once the node splits apart, or every part stays blurred.
  await waitFor('window.__ev.state().blur === 0', 3000).catch(() => { throw new Error('the view is still blurred after the root split apart') })
  await shot('root-exploded', `root split into ${byId.get(teardown.root).children.length} parts`)

  const branchy = (id) => (byId.get(id).children ?? []).find((c) => (byId.get(c).children ?? []).length) ?? (byId.get(id).children ?? [])[0]
  let id = branchy(teardown.root)
  for (let depth = 1; id && depth <= 2; depth++) {
    await clickNode(id)
    await settle()
    const s = await state()
    if (s.path.at(-1) !== id) throw new Error(`clicking "${id}" did not open it (path ${s.path.join(' > ')})`)
    await splitTurntable(byId.get(id))
    await shot(`open-${id}`, `opened "${byId.get(id).term}" (depth ${depth})`)
    id = (byId.get(id).children ?? []).length ? branchy(id) : null
  }
  for (let i = 0; i < 6 && (await state()).path.length > 1; i++) { await key('Escape'); await sleep(150) }
  await settle()
  await expect('window.__ev.state().path.length === 1', 'Esc did not return to the root')
  await key('Escape')
  await settle()
  await expect('!window.__ev.state().exploded', 'Esc at the root did not put it back together')

  const plate = byId.get(teardown.root).variants?.[0]
  if (plate?.items.length > 1) {
    await expect('window.__ev.state().turntable', 'the root does not show its turntable')
    await waitFor('window.__ev.state().blur > 0.004', 3000).catch(() => { throw new Error('the turntable is back but its blur did not return') })
    const p = await js('window.__ev.platePos(1)')
    if (!p?.visible) throw new Error(`turntable item "${plate.items[1].id}" is not on screen`)
    await click(p.x, p.y)
    await settle()
    await expect('window.__ev.state().choice === 1 && !window.__ev.state().exploded', `clicking "${plate.items[1].id}" on the turntable did not choose it`)
    await shot(`turntable-${plate.items[1].id}`, `${plate.label}: ${plate.items[1].name}, turned to the front`)
  }

  for (const cat of byId.get(teardown.root).variants ?? []) {
    const item = cat.items[cat.items.length - 1]
    await clickEl('.ev-strip .ev-row button', item.name)
    await settle()
    await shot(`catalogue-${item.id}`, `${cat.label}: ${item.name}`)
  }

  for (const kind of ['loop', 'plot', 'feel']) {
    const n = teardown.nodes.find((x) => (kind === 'plot' ? x.plot && !x.look : kind === 'feel' ? x.feel && !x.look && !x.loop && !x.plot : x.kind === 'loop'))
    if (!n) continue
    await openViaIndex(n)
    await shot(`${kind}-${n.id}`, `${kind}: "${n.term}"`)
  }

  await clickEl('.ev-actions button', 'Sources')
  await sleep(300)
  await expect('document.querySelectorAll(".ev-works .ev-work").length > 0', 'the Sources view lists no works')
  await shot('sources', 'Sources view: every cited work, books first')
  const cited = await js(`decodeURIComponent([...document.querySelectorAll('.ev-works .ev-chip')].map((a) => a.getAttribute('href')).find((h) => h.includes('#')).split('#')[1])`)
  await clickEl(`.ev-works .ev-chip[href$="#${encodeURIComponent(cited)}"]`)
  await settle()
  await expect(`window.__ev.state().path.at(-1) === ${JSON.stringify(cited)} && document.querySelector('.ev-overlay').hidden`, `a Sources chip did not open "${cited}"`)

  // Search reaches past terms: a catalogue item's name finds the item, and the hit opens its node.
  const owner = teardown.nodes.find((n) => n.variants?.length)
  if (owner) {
    const item = owner.variants[0].items.at(-1)
    await clickEl('.ev-actions button', 'Index')
    await sleep(200)
    await js(`(() => { const i = document.querySelector('.ev-overlay input'); i.value = ${JSON.stringify(item.name)}; i.dispatchEvent(new Event('input')) })()`)
    await sleep(200)
    await expect('document.querySelectorAll(".ev-terms li").length > 0', `search for "${item.name}" found nothing`)
    await shot('search', `Index search: "${item.name}"`)
    await clickEl(`.ev-terms a[data-id="${owner.id}"]`)
    await settle()
    await expect(`window.__ev.state().path.at(-1) === ${JSON.stringify(owner.id)} && document.querySelector('.ev-overlay').hidden`, `the search hit did not open "${owner.id}"`)
  }

  await clickEl('.ev-actions button', 'Flatpack')
  await sleep(900)
  await shot('flatpack-step-1', `flatpack step 1: ${teardown.assembly[0].title}, parts gathering`)
  const last = teardown.assembly.length
  await clickEl('.ev-strip .ev-row button', `${last}. ${teardown.assembly[last - 1].title}`)
  await sleep(2600)
  await settle()
  await shot(`flatpack-step-${last}`, `flatpack step ${last}: ${teardown.assembly[last - 1].title}, joined`)
}

try {
  await waitFor('window.__ev && window.__ev.ready')
  const teardown = await js('JSON.parse(document.getElementById("teardown").textContent)')
  const byId = new Map(teardown.nodes.map((n) => [n.id, n]))
  const renderer = await js('window.__ev.renderer()')
  const software = /swiftshader|llvmpipe|software/i.test(renderer)
  report.push(`Chrome ${version.product}; WebGL renderer: ${renderer}${software ? ' (SOFTWARE: fine for visuals, not a GPU check)' : ''}`)
  await settle()
  await shot('root', `root "${byId.get(teardown.root).term}", assembled`)
  if (only) {
    for (const id of only) {
      const n = byId.get(id)
      if (!n) throw new Error(`--open: no node "${id}"`)
      await openViaIndex(n)
      await splitTurntable(n)
      const kids = (n.children ?? []).length
      await shot(`open-${n.id}`, `${n.kind} "${n.term}"${kids ? `, split into ${kids} part${kids === 1 ? '' : 's'}` : hasPlate(n) ? ', on its turntable' : ''}`)
    }
  } else await tour(teardown, byId)
} catch (e) {
  errors.push(`check: ${e.message}`)
}

console.log(report.join('\n'))
for (const s of shots) console.log(`${s.file}  ${s.note}`)
if (errors.length) {
  console.error(`\n${errors.length} error(s):\n- ${errors.join('\n- ')}`)
  await cleanup()
  process.exit(1)
}
console.log(`\nOK: ${shots.length} screenshots, no page errors. Read every screenshot.`)
await cleanup()
process.exit(0)
