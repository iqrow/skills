// Headless Chrome over the DevTools protocol, with no npm dependencies. Used by check.mjs and cover.mjs.
// Env: CHROME=/path/to/chrome to choose the browser.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

/**
 * Starts Chrome with one blank tab of `width` × `height` CSS pixels.
 * Returns { version, S, js, waitFor, errors, cleanup }: S sends a DevTools command to the tab, js evaluates an
 * expression in it, errors collects the page's exceptions and console errors. Always await cleanup() before exit.
 */
export async function launch({ width, height }) {
  const chrome = process.env.CHROME ?? ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p))
  if (!chrome) throw new Error('No Chrome found. Set CHROME=/path/to/chrome.')
  const env = { ...process.env }
  if (!env.DISPLAY && existsSync('/tmp/.X11-unix/X0')) env.DISPLAY = ':0'
  if (env.DISPLAY && !env.XAUTHORITY && existsSync(join(homedir(), '.Xauthority'))) env.XAUTHORITY = join(homedir(), '.Xauthority')
  const profile = mkdtempSync(join(tmpdir(), 'ev-check-'))
  const proc = spawn(chrome, ['--headless=new', '--enable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { env, stdio: ['ignore', 'ignore', 'pipe'] })
  // Chrome writes to its profile until it exits, and its helpers can write a last file just after.
  // So wait for the exit (or 5 s), then retry deleting the whole tree for up to 5 s:
  // rmSync's own retries only repeat the final rmdir. A leftover temp dir must not fail the caller.
  const exited = new Promise((res) => proc.once('exit', res))
  const cleanup = async () => {
    try { proc.kill() } catch {}
    await Promise.race([exited, sleep(5000)])
    for (let i = 0; i < 20; i++) {
      try { rmSync(profile, { recursive: true, force: true }); return } catch { await sleep(250) }
    }
  }

  const wsUrl = await new Promise((res, rej) => {
    let buf = ''
    proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]) })
    proc.on('exit', (c) => rej(new Error(`Chrome exited (${c}): ${buf.slice(-400)}`)))
    setTimeout(() => rej(new Error(`Chrome did not start: ${buf.slice(-400)}`)), 20000)
  }).catch(async (e) => { await cleanup(); throw e })

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
  await S('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })

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
  return { version, S, js, waitFor, errors, cleanup }
}
