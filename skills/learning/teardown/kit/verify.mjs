#!/usr/bin/env node
// Checks every citation against the page it names. Opens each URL once, then for each citation:
//   errors   the page is gone, or its `quote` is not on the page
//   warnings no `quote`; a page that never names the node; a book label on a page that never names
//            the book; a book cited from its contents or blurb
//   unchecked a page the checker cannot read (a site that refuses bots, a scanned or image page),
//            or a book read in a copy that is not in the field's raw/ folder
// The mechanical part only. Whether a quote supports what the node says is for a reader who did
// not write the citation (SKILL.md, Build and check).
//
// Usage: node verify.mjs <field> [--only id,id] [--fresh] [--report out.json]
// A field folder keeps a snapshot of each page in raw/web/ until --fresh, so a later run checks the
// same text. A citation with "copy": true is checked against raw/<work>.txt, .md or .pdf, the
// user's own copy of the book. A JSON field caches pages for 7 days in the system temp folder.
// PDFs need pdfjs-dist: run `npm ci` in kit/src once. Without it PDFs are reported as unchecked.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadField } from './field.mjs'
import { fold } from './search.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const opt = (name) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv.splice(i, 2)[1] }
const only = opt('--only')?.split(',')
const reportFile = opt('--report')
const fresh = argv.includes('--fresh')
const file = argv.find((a) => !a.startsWith('--'))
if (!file) { console.error('usage: node verify.mjs <field> [--only id,id] [--fresh] [--report out.json]'); process.exit(2) }
const { field, errors: loadErrors, dir } = loadField(file.replace(/(.)\/+$/, '$1'))
if (loadErrors.length) { console.error(`${file} has errors; run build first:\n- ${loadErrors.join('\n- ')}`); process.exit(1) }

// ---------- the citations ----------
const cites = []
for (const n of field.nodes) {
  if (only && !only.includes(n.id)) continue
  const words = [n.term, ...(n.aka ?? [])]
  for (const s of n.sources ?? []) cites.push({ where: n.id, words, s })
  for (const c of n.variants ?? []) for (const it of c.items) for (const s of it.sources ?? []) cites.push({ where: `${n.id} / ${it.name}`, words: [it.name, n.term], s })
}

// ---------- fetching, with a cache ----------
const CACHE = dir ? join(dir, 'raw', 'web') : join(tmpdir(), 'teardown-verify')
mkdirSync(CACHE, { recursive: true })
const MAX_AGE = dir ? Infinity : 7 * 24 * 3600 * 1000
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

let pdfjs
async function pdfText(bytes) {
  if (pdfjs === undefined) {
    try {
      const require = createRequire(join(here, 'src', 'package.json'))
      pdfjs = await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href)
    } catch { pdfjs = null }
  }
  if (!pdfjs) return null
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false, verbosity: 0 }).promise
  const pages = []
  for (let p = 1; p <= doc.numPages; p++) pages.push((await (await doc.getPage(p)).getTextContent()).items.map((i) => i.str).join(' '))
  return pages.join('\n')
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', times: '×' }
const htmlText = (html) => html
  .replace(/<img\b[^>]*?\balt="([^"]*)"[^>]*>/gi, ' $1 ')
  .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m)

async function open(url, attempt = 1) {
  const path = join(CACHE, createHash('sha1').update(url).digest('hex') + '.json')
  if (!fresh && existsSync(path) && Date.now() - statSync(path).mtimeMs < MAX_AGE) return JSON.parse(readFileSync(path, 'utf8'))
  let page
  try {
    const res = await fetch(url.split('#')[0], { headers: { 'user-agent': UA, accept: 'text/html,application/pdf;q=0.9,*/*;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok) page = { status: res.status }
    else if (/pdf/.test(type) || /\.pdf($|\?)/i.test(url)) {
      const text = await pdfText(await res.arrayBuffer())
      page = text === null ? { status: res.status, unreadable: 'PDF: run `npm ci` in kit/src so verify can read PDFs' } : { status: res.status, text, pdf: true }
    } else if (/html|xml|text\/plain|json/.test(type)) page = { status: res.status, text: htmlText(await res.text()) }
    else page = { status: res.status, unreadable: `a ${type || 'file'} the checker cannot read` }
  } catch (e) {
    const code = e.cause?.code ?? e.name
    if (/TIMEOUT|TimeoutError|ECONNRESET/i.test(code) && attempt < 2) return open(url, attempt + 1)
    page = /TIMEOUT|TimeoutError|ECONNRESET|EAI_AGAIN/i.test(code) ? { status: 0, unreadable: `no answer (${code}): try again later, or open it yourself` } : { status: 0, error: code }
  }
  if (page.text !== undefined && fold(page.text).trim().split(' ').length < 80) page = { status: page.status, unreadable: 'almost no text: a script-built, scanned or image page' }
  if (page.status !== 0) writeFileSync(path, JSON.stringify(page))
  return page
}

const urls = [...new Set(cites.map((c) => c.s.url))]
const pages = new Map()
let done = 0
await Promise.all(Array.from({ length: 8 }, async () => {
  while (urls.length) {
    const url = urls.shift()
    pages.set(url, await open(url))
    if (++done % 10 === 0) process.stderr.write(`\ropened ${done}`)
  }
}))
process.stderr.write('\r')

// The user's own copies of books: raw/<work>.txt, .md or .pdf in a field folder.
const copies = new Map()
for (const work of dir ? new Set(cites.filter((c) => c.s.copy && c.s.work).map((c) => c.s.work)) : []) {
  for (const ext of ['txt', 'md', 'pdf']) {
    const path = join(dir, 'raw', `${work}.${ext}`)
    if (!existsSync(path)) continue
    const text = ext === 'pdf' ? await pdfText(readFileSync(path)) : readFileSync(path, 'utf8')
    if (text !== null) { copies.set(work, { text: fold(text).replace(/ /g, ''), file: `raw/${work}.${ext}` }); break }
  }
}

// ---------- the checks ----------
const has = (text, phrase) => text.includes(fold(phrase))
// A quote may skip words with an ellipsis; every piece must be on the page. Spaces are ignored,
// because PDF text splits words at line breaks ("acti- vate").
const squash = (s) => fold(s).replace(/ /g, '')
const quoteOn = (text, quote) => quote.split(/…|\.\.\./).map((q) => q.trim()).filter((q) => q.split(/\s+/).length >= 3).every((q) => text.includes(squash(q)))
// The short title: "Game Mechanics: Advanced Game Design" -> "game mechanics". Checked on web pages only:
// an article mislabelled as a book is a web page, and a chapter PDF's running heads often skip the title.
const shortTitle = (label) => fold((label.includes(', ') ? label.slice(label.indexOf(', ') + 2) : label).split(/[:(!?]/)[0]).trim().split(' ').slice(0, 3).join(' ')
const CONTENTS = /\b(table of )?contents\b(?! and text)|\bblurb\b|\bdescription\b|official (author|studio )?page|book page|product page/i

const found = []
for (const [i, c] of cites.entries()) {
  const p = pages.get(c.s.url)
  const add = (level, what) => found.push({ level, what, where: c.where, label: c.s.label, url: c.s.url, i })
  const note = `${c.s.page ?? ''} ${c.s.flag ?? ''}`
  if (c.s.kind === 'book' && CONTENTS.test(note) && !c.s.quote) add('warning', 'book cited from its contents or blurb: that shows the topic, not the claim')
  if (c.s.copy) {
    const copy = copies.get(c.s.work)
    if (!copy) add('unchecked', dir ? `read in a copy of the book: put its text in raw/${c.s.work}.txt (or .md, .pdf), or check the quote at its page` : 'read in a copy of the book: check the quote at its page')
    else if (!quoteOn(copy.text, c.s.quote)) add('error', `quote not in ${copy.file}: "${c.s.quote.slice(0, 80)}${c.s.quote.length > 80 ? '…' : ''}"`)
    continue
  }
  if (p.error) { add('error', `could not open: ${p.error}`); continue }
  if ([401, 403, 429, 503].includes(p.status)) { add('unchecked', `site refused the checker (HTTP ${p.status}): open it yourself`); continue }
  if (p.status >= 400) { add('error', `page gone (HTTP ${p.status})`); continue }
  if (p.unreadable) { add('unchecked', p.unreadable); continue }
  const text = fold(p.text)
  if (c.s.quote) { if (!quoteOn(text.replace(/ /g, ''), c.s.quote)) add('error', `quote not on the page: "${c.s.quote.slice(0, 80)}${c.s.quote.length > 80 ? '…' : ''}"`) }
  else {
    add('warning', 'no quote')
    if (!c.words.some((w) => has(text, w))) add('warning', `the page never names "${c.words[0]}"${c.words.length > 1 ? ' or its other names' : ''}`)
  }
  if (c.s.kind === 'book' && !p.pdf && !/\.pdf($|\?)/i.test(c.s.url) && !has(text, shortTitle(c.s.label))) add('warning', `a book label on a page that never names "${shortTitle(c.s.label)}": an article or talk is its own work`)
}

// ---------- report ----------
const LEVELS = ['error', 'unchecked', 'warning']
const flagged = (test) => new Set(found.filter(test).map((f) => f.i)).size
console.log(`${file}: ${cites.length} citations on ${pages.size} pages.`)
for (const level of LEVELS) {
  const list = found.filter((f) => f.level === level)
  if (!list.length) continue
  const groups = new Map()
  for (const f of list) {
    const k = `${f.what}\n${f.label} <${f.url}>`
    groups.set(k, [...(groups.get(k) ?? []), f.where])
  }
  console.log(`\n${level.toUpperCase()}S (${list.length})`)
  const byWhat = new Map()
  for (const [k, where] of groups) { const [what, src] = k.split('\n'); byWhat.set(what.replace(/".*"/, '"…"'), [...(byWhat.get(what.replace(/".*"/, '"…"')) ?? []), { what, src, where }]) }
  for (const [kind, rows] of [...byWhat].sort((a, b) => b[1].length - a[1].length)) {
    if (kind === 'no quote') { console.log(`- no quote: ${rows.reduce((n, r) => n + r.where.length, 0)} citations`); continue }
    console.log(`- ${kind}: ${rows.reduce((n, r) => n + r.where.length, 0)}`)
    for (const r of rows.slice(0, 12)) console.log(`    ${r.src}${r.what !== kind ? ` ${r.what.match(/".*"/)?.[0] ?? ''}` : ''}\n      on ${r.where.slice(0, 6).join(', ')}${r.where.length > 6 ? ` +${r.where.length - 6}` : ''}`)
    if (rows.length > 12) console.log(`    … ${rows.length - 12} more sources`)
  }
}
const quoted = cites.filter((c) => c.s.quote).length
const quoteFails = flagged((f) => f.what.startsWith('quote not'))
const quoteUnchecked = flagged((f) => f.level === 'unchecked' && cites[f.i].s.quote)
console.log(`\nQuotes: ${quoted} of ${cites.length} citations have one; ${quoted - quoteFails - quoteUnchecked} found where they cite, ${quoteFails} not found, ${quoteUnchecked} unchecked.`)
console.log(`${cites.length - flagged(() => true)} of ${cites.length} citations pass every check.`)
if (reportFile) writeFileSync(reportFile, JSON.stringify(found, null, 1))
process.exit(found.some((f) => f.level === 'error') ? 1 : 0)
