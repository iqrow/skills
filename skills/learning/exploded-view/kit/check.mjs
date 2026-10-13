#!/usr/bin/env node
// Opens a built exploded-view page in headless Chrome, clicks through it with real mouse input,
// and saves screenshots. No npm dependencies: it talks to Chrome over the DevTools protocol.
// Usage: node check.mjs page.html [out-dir] [--open id,id,...]
//   default: the standard tour (root, explode, two levels down, catalogues, a loop, plot and feel, flatpack)
//   --open:  the root, then only the listed nodes, each opened from the Index (split apart if it has parts)
// Env: CHROME=/path/to/chrome to choose the browser.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

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
const chrome = process.env.CHROME ?? ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p))
if (!chrome) {
  console.error('No Chrome found. Set CHROME=/path/to/chrome.')
  process.exit(2)
}
const env = { ...process.env }
if (!env.DISPLAY && existsSync('/tmp/.X11-unix/X0')) env.DISPLAY = ':0'
if (env.DISPLAY && !env.XAUTHORITY && existsSync(join(homedir(), '.Xauthority'))) env.XAUTHORITY = join(homedir(), '.Xauthority')
const profile = mkdtempSync(join(tmpdir(), 'ev-check-'))
const W = 1440, H = 900
const proc = spawn(chrome, ['--headless=new', '--enable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { env, stdio: ['ignore', 'ignore', 'pipe'] })
// Chrome writes to its profile until it exits, and its helpers can write a last file just after.
// So wait for the exit (or 5 s), then retry deleting the whole tree for up to 5 s:
// rmSync's own retries only repeat the final rmdir. A leftover temp dir must not fail the check.
const exited = new Promise((res) => proc.once('exit', res))
const cleanup = async () => {
  try { proc.kill() } catch {}
  await Promise.race([exited, sleep(5000)])
  for (let i = 0; i < 20; i++) {
    try { rmSync(profile, { recursive: true, force: true }); return } catch { await sleep(250) }
  }
}
const fail = async (msg) => { console.error(`FAIL: ${msg}`); await cleanup(); process.exit(1) }

const wsUrl = await new Promise((res, rej) => {
  let buf = ''
  proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]) })
  proc.on('exit', (c) => rej(new Error(`Chrome exited (${c}): ${buf.slice(-400)}`)))
  setTimeout(() => rej(new Error(`Chrome did not start: ${buf.slice(-400)}`)), 20000)
}).catch((e) => fail(e.message))

const ws = new WebSocket(wsUrl)
await new Promise((res) => ws.addEventListener('open', res))
let seq = 0
const pending = new Map()
const listeners = []
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result)
  } else for (const l of listeners) l(msg)
})
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq
  pending.set(id, { res, rej })
  ws.send(JSON.stringify({ id, method, params, sessionId }))
})
const version = await send('Browser.getVersion')
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const S = (method, params) => send(method, params, sessionId)
const errors = []
listeners.push((msg) => {
  if (msg.sessionId !== sessionId) return
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '))
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(msg.params.entry.text)
})
await S('Runtime.enable')
await S('Page.enable')
await S('Log.enable')
await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await S('Page.navigate', { url: pathToFileURL(page).href })

const js = async (expr) => {
  const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r.result.value
}
const waitFor = async (expr, ms = 15000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if (await js(expr)) return true } catch {}
    await sleep(100)
  }
  throw new Error(`timed out waiting for ${expr}`)
}
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
const clickNode = async (id) => {
  const p = await js(`window.__ev.screenPos(${JSON.stringify(id)})`)
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
const openViaIndex = async (n) => {
  await clickEl('.ev-actions button', 'Index')
  await sleep(200)
  await clickEl(`.ev-index a[data-id="${n.id}"]`)
  await settle()
  await expect(`window.__ev.state().path.at(-1) === ${JSON.stringify(n.id)}`, `index did not open "${n.id}"`)
}

async function tour(field, byId) {
  await clickNode(field.root)
  await settle()
  await expect('window.__ev.state().exploded', 'clicking the root did not explode it')
  await shot('root-exploded', `root split into ${byId.get(field.root).children.length} parts`)

  const branchy = (id) => (byId.get(id).children ?? []).find((c) => (byId.get(c).children ?? []).length) ?? (byId.get(id).children ?? [])[0]
  let id = branchy(field.root)
  for (let depth = 1; id && depth <= 2; depth++) {
    await clickNode(id)
    await settle()
    const s = await state()
    if (s.path.at(-1) !== id) throw new Error(`clicking "${id}" did not open it (path ${s.path.join(' > ')})`)
    await shot(`open-${id}`, `opened "${byId.get(id).term}" (depth ${depth})`)
    id = (byId.get(id).children ?? []).length ? branchy(id) : null
  }
  for (let i = 0; i < 6 && (await state()).path.length > 1; i++) { await key('Escape'); await sleep(150) }
  await settle()
  await expect('window.__ev.state().path.length === 1', 'Esc did not return to the root')
  await key('Escape')
  await settle()
  await expect('!window.__ev.state().exploded', 'Esc at the root did not put it back together')

  for (const cat of byId.get(field.root).variants ?? []) {
    const item = cat.items[cat.items.length - 1]
    await clickEl('.ev-strip .ev-row button', item.name)
    await settle()
    await shot(`catalogue-${item.id}`, `${cat.label}: ${item.name}`)
  }

  for (const kind of ['loop', 'plot', 'feel']) {
    const n = field.nodes.find((x) => (kind === 'plot' ? x.plot && !x.look : kind === 'feel' ? x.feel && !x.look && !x.loop && !x.plot : x.kind === 'loop'))
    if (!n) continue
    await openViaIndex(n)
    await shot(`${kind}-${n.id}`, `${kind}: "${n.term}"`)
  }

  await clickEl('.ev-actions button', 'Flatpack')
  await sleep(900)
  await shot('flatpack-step-1', `flatpack step 1: ${field.assembly[0].title}, parts gathering`)
  const last = field.assembly.length
  await clickEl('.ev-strip .ev-row button', `${last}. ${field.assembly[last - 1].title}`)
  await sleep(2600)
  await settle()
  await shot(`flatpack-step-${last}`, `flatpack step ${last}: ${field.assembly[last - 1].title}, joined`)
}

try {
  await waitFor('window.__ev && window.__ev.ready')
  const field = await js('JSON.parse(document.getElementById("field").textContent)')
  const byId = new Map(field.nodes.map((n) => [n.id, n]))
  const renderer = await js('window.__ev.renderer()')
  const software = /swiftshader|llvmpipe|software/i.test(renderer)
  report.push(`Chrome ${version.product}; WebGL renderer: ${renderer}${software ? ' (SOFTWARE: fine for visuals, not a GPU check)' : ''}`)
  await settle()
  await shot('root', `root "${byId.get(field.root).term}", assembled`)
  if (only) {
    for (const id of only) {
      const n = byId.get(id)
      if (!n) throw new Error(`--open: no node "${id}"`)
      await openViaIndex(n)
      const kids = (n.children ?? []).length
      await shot(`open-${n.id}`, `${n.kind} "${n.term}"${kids ? `, split into ${kids} part${kids === 1 ? '' : 's'}` : ''}`)
    }
  } else await tour(field, byId)
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
