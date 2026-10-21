#!/usr/bin/env node
// Makes cover.jpg for a public folder (build.mjs --public): the root split apart, 1200 × 630, the size link previews use.
// It serves the folder over local HTTP the way the web server does, so it also proves the folder loads:
// any page error fails it.
// Usage: node cover.mjs <public folder>
// Env: CHROME=/path/to/chrome to choose the browser.
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { launch } from './chrome.mjs'

const dir = resolve(process.argv[2] ?? '')
if (!process.argv[2] || !existsSync(join(dir, 'teardown.json'))) {
  console.error('Usage: node cover.mjs <public folder>   (a folder from build.mjs --public, holding teardown.json)')
  process.exit(2)
}
const OUT_W = 1200, OUT_H = 630

// The folder at /: a file by its name, a node page by its id (<id>.html), anything else the root page.
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg' }
const server = createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).slice(1)
  const file = [name, `${name}.html`].map((f) => join(dir, f)).find((f) => !name.includes('..') && name && existsSync(f) && statSync(f).isFile()) ?? join(dir, 'index.html')
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((res) => server.listen(0, '127.0.0.1', res))

const { S, js, waitFor, errors, cleanup } = await launch({ width: 1600, height: 1000 }).catch((e) => {
  console.error(`FAIL: ${e.message}`)
  process.exit(1)
})
const finish = async (code, msg) => {
  if (msg) console.error(msg)
  await cleanup()
  server.close()
  process.exit(code)
}
try {
  await S('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` })
  await waitFor('window.__ev && window.__ev.ready')
  // Size the window so the 3D stage itself is 1200 × 630: the viewer then fits the split-apart root to the cover.
  const stage = await js(`(() => { const b = document.querySelector('.ev-stage').getBoundingClientRect(); return { w: b.width, h: b.height } })()`)
  await S('Emulation.setDeviceMetricsOverride', { width: 1600 + OUT_W - stage.w, height: 1000 + OUT_H - stage.h, deviceScaleFactor: 1, mobile: false })
  await sleep(300)
  await js(`[...document.querySelectorAll('.ev-actions button')].find((b) => b.textContent === 'Explode').click()`)
  await sleep(500)
  await waitFor('window.__ev.state().exploded && window.__ev.state().blur === 0 && window.__ev.settled()', 10000)
  // The hint is for a reader at the page, not for a preview.
  await js(`document.querySelector('.ev-hint').style.visibility = 'hidden'`)
  await sleep(300)
  // The largest 1200:630 box centred in the 3D stage, scaled to 1200 wide.
  const clip = await js(`(() => {
    const b = document.querySelector('.ev-stage').getBoundingClientRect()
    const w = Math.min(b.width, b.height * ${OUT_W / OUT_H})
    const h = w * ${OUT_H / OUT_W}
    return { x: b.left + (b.width - w) / 2, y: b.top + (b.height - h) / 2, width: w, height: h }
  })()`)
  const { data } = await S('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip: { ...clip, scale: OUT_W / clip.width } })
  if (errors.length) await finish(1, `FAIL: page errors:\n- ${errors.join('\n- ')}`)
  const out = join(dir, 'cover.jpg')
  writeFileSync(out, Buffer.from(data, 'base64'))
  console.log(`wrote ${out}`)
  await finish(0)
} catch (e) {
  await finish(1, `FAIL: ${e.message}${errors.length ? `\npage errors:\n- ${errors.join('\n- ')}` : ''}`)
}
