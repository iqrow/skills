// Reads and writes a field. A field is a folder (the format you edit) or a compiled JSON file
// (what build embeds in the page, and what a generator script may write). See SCHEMA.md.
//
//   <field>/field.md         frontmatter: title, prompt, root, assembly. Body: the summary.
//   <field>/survey.md        frontmatter: lists, voices.
//   <field>/nodes/<id>.md    frontmatter: one node, without its drawings.
//   <field>/looks/<id>.json  the node's drawings: look, feel, plot, and items: { <item id>: { look, tint, svg } }.
//   <field>/works/<id>.md    frontmatter: one cited work: label, kind, url, isbn, canon.
//   <field>/raw/             not compiled: page snapshots from verify, the user's own copies of books.
//   <field>/log.md           not compiled: what changed and why, newest last.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { Document, isScalar, isSeq, parse, visit } from './yaml.mjs'

const NODE_KEYS = ['term', 'aka', 'kind', 'plain', 'does', 'ask', 'range', 'trouble', 'children', 'at', 'links', 'pattern', 'loop', 'variants', 'sources', 'unverified', 'deeper']
const NODE_VISUALS = ['look', 'feel', 'plot']
const ITEM_VISUALS = ['look', 'tint', 'svg']
const CITE_KEYS = ['work', 'url', 'page', 'quote', 'flag', 'copy']
const WORK_KEYS = ['label', 'kind', 'url', 'isbn', 'canon']
const CANON_KEYS = ['why', 'named', 'specialism', 'page', 'flag']

export const isFolder = (path) => existsSync(path) && statSync(path).isDirectory()

// ---------- reading ----------

/** Returns { field, errors }. Errors name the file to fix; a folder field also gets `dir`. */
export function loadField(path) {
  if (!isFolder(path)) {
    try {
      return { field: JSON.parse(readFileSync(path, 'utf8')), errors: [] }
    } catch (e) {
      return { field: null, errors: [`${path}: ${e.message}`] }
    }
  }
  const errors = []
  const err = (file, msg) => errors.push(`${file}: ${msg}`)
  const md = (rel, { body = false } = {}) => {
    const file = join(path, rel)
    if (!existsSync(file)) return null
    const m = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/)
    if (!m) { err(rel, 'must start with a --- frontmatter block'); return null }
    let data
    try { data = parse(m[1]) ?? {} } catch (e) { err(rel, e.message.split('\n')[0]); return null }
    if (typeof data !== 'object' || Array.isArray(data)) { err(rel, 'the frontmatter must be a mapping'); return null }
    const text = (m[2] ?? '').trim()
    if (!body && text) err(rel, 'write everything in the frontmatter; the body must be empty')
    return { data, text }
  }
  const list = (dir, ext) => (isFolder(join(path, dir)) ? readdirSync(join(path, dir)).filter((f) => f.endsWith(ext)).sort() : [])

  const head = md('field.md', { body: true })
  if (!head) err('field.md', 'missing')
  const field = { title: head?.data.title, prompt: head?.data.prompt, summary: head?.text, root: head?.data.root, nodes: [], assembly: head?.data.assembly }
  for (const k of Object.keys(head?.data ?? {})) if (!['title', 'prompt', 'root', 'assembly'].includes(k)) err('field.md', `unknown key "${k}"`)

  const works = new Map()
  for (const f of list('works', '.md')) {
    const w = md(`works/${f}`)
    if (!w) continue
    for (const k of Object.keys(w.data)) if (!WORK_KEYS.includes(k)) err(`works/${f}`, `unknown key "${k}"`)
    for (const k of Object.keys(w.data.canon ?? {})) if (!CANON_KEYS.includes(k)) err(`works/${f}`, `unknown canon key "${k}"`)
    works.set(basename(f, '.md'), w.data)
  }
  const used = new Set()
  const cite = (where, cites) => {
    if (!Array.isArray(cites)) return cites
    return cites.map((c, i) => {
      const w = works.get(c?.work)
      for (const k of Object.keys(c ?? {})) if (!CITE_KEYS.includes(k)) err(where, `sources[${i}] "${k}" belongs in works/${c?.work ?? '<work>'}.md`)
      if (!w) { err(where, `sources[${i}] work "${c?.work}" is not in works/`); return c }
      used.add(c.work)
      return strip({ label: w.label, url: c.url ?? w.url, kind: w.kind, isbn: w.isbn, page: c.page, quote: c.quote, flag: c.flag, copy: c.copy, work: c.work })
    })
  }

  const nodes = new Map()
  for (const f of list('nodes', '.md')) {
    const rel = `nodes/${f}`
    const n = md(rel)
    if (!n) continue
    for (const k of Object.keys(n.data)) if (!NODE_KEYS.includes(k)) err(rel, NODE_VISUALS.includes(k) ? `"${k}" belongs in looks/${basename(f, '.md')}.json` : k === 'id' ? 'the file name is the id; remove "id"' : `unknown key "${k}"`)
    const node = { ...n.data, id: basename(f, '.md') }
    node.sources = cite(rel, node.sources)
    for (const cat of Array.isArray(node.variants) ? node.variants : []) for (const it of Array.isArray(cat?.items) ? cat.items : []) if (it) it.sources = cite(`${rel} item ${it.id}`, it.sources)
    nodes.set(node.id, strip(node))
  }

  for (const f of list('looks', '.json')) {
    const rel = `looks/${f}`
    const id = basename(f, '.json')
    let v
    try { v = JSON.parse(readFileSync(join(path, rel), 'utf8')) } catch (e) { err(rel, e.message); continue }
    const node = nodes.get(id)
    if (!node) { err(rel, `no nodes/${id}.md`); continue }
    for (const [k, val] of Object.entries(v)) {
      if (NODE_VISUALS.includes(k)) node[k] = val
      else if (k !== 'items') err(rel, `unknown key "${k}"`)
    }
    const items = new Map((node.variants ?? []).flatMap((c) => c?.items ?? []).map((it) => [it?.id, it]))
    for (const [itemId, vis] of Object.entries(v.items ?? {})) {
      const it = items.get(itemId)
      if (!it) { err(rel, `items: "${itemId}" is not a catalogue item of ${id}`); continue }
      for (const [k, val] of Object.entries(vis)) {
        if (ITEM_VISUALS.includes(k)) it[k] = val
        else err(rel, `items.${itemId}: unknown key "${k}"`)
      }
    }
  }

  // Tree order: the root, depth first, then the nodes outside the tree.
  const seen = new Set()
  const walk = (id) => {
    if (seen.has(id) || !nodes.has(id)) return
    seen.add(id)
    field.nodes.push(nodes.get(id))
    for (const c of nodes.get(id).children ?? []) walk(c)
  }
  walk(field.root)
  for (const id of nodes.keys()) walk(id)

  const survey = md('survey.md')
  const canon = [...works].filter(([, w]) => w.canon).map(([id, w]) => strip({ label: w.label, url: w.url, kind: w.kind, isbn: w.isbn, ...w.canon, work: id }))
  canon.sort((a, b) => (b.named?.length ?? 0) - (a.named?.length ?? 0) || String(a.label).localeCompare(String(b.label)))
  if (survey || canon.length) field.survey = { lists: survey?.data.lists ?? [], canon, voices: survey?.data.voices ?? [] }
  for (const k of Object.keys(survey?.data ?? {})) if (!['lists', 'voices'].includes(k)) err('survey.md', `unknown key "${k}"`)
  for (const [id, w] of works) if (!used.has(id) && !w.canon) err(`works/${id}.md`, 'no node cites it and it is not canon; delete it')
  return { field: strip(field), errors, dir: path }
}

const strip = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

// ---------- writing (split) ----------

/** Writes a compiled field into an empty folder. Returns the number of files written. */
export function writeFolder(field, dir) {
  if (existsSync(dir) && readdirSync(dir).length) throw new Error(`${dir} is not empty`)
  for (const d of ['', 'nodes', 'looks', 'works']) mkdirSync(join(dir, d), { recursive: true })
  let files = 0
  const put = (rel, text) => { writeFileSync(join(dir, rel), text); files++ }

  // One work per isbn, or else per kind and label: the Sources view groups citations the same way.
  const workKey = (s) => (s.isbn ? `isbn ${s.isbn.replace(/[^0-9X]/gi, '').toUpperCase()}` : `${s.kind} ${s.label}`)
  const works = new Map()
  const workOf = (s) => {
    const k = workKey(s)
    if (!works.has(k)) works.set(k, { id: null, label: s.label, kind: s.kind, isbn: s.isbn, urls: new Map(), canon: null })
    return works.get(k)
  }
  const cites = []
  for (const n of field.nodes) {
    for (const s of n.sources ?? []) cites.push(s)
    for (const c of n.variants ?? []) for (const it of c.items) for (const s of it.sources ?? []) cites.push(s)
  }
  for (const s of cites) { const w = workOf(s); w.urls.set(s.url, (w.urls.get(s.url) ?? 0) + 1) }
  for (const c of field.survey?.canon ?? []) {
    const w = workOf(c)
    w.canon = strip({ why: c.why, named: c.named, specialism: c.specialism, page: c.page, flag: c.flag })
    w.url = c.url
  }
  const taken = new Set()
  for (const w of works.values()) {
    w.url ??= [...w.urls].sort((a, b) => b[1] - a[1])[0][0]
    const base = slug(w.label)
    let id = base
    for (let i = 2; taken.has(id); i++) id = `${base}-${i}`
    taken.add(id)
    w.id = id
  }
  const citation = (s) => {
    const w = workOf(s)
    return strip({ work: w.id, url: s.url === w.url ? undefined : s.url, page: s.page, quote: s.quote, flag: s.flag, copy: s.copy })
  }

  const { nodes, assembly, survey, summary, ...head } = field
  put('field.md', frontmatter({ title: head.title, prompt: head.prompt, root: head.root, assembly }) + `\n${summary}\n`)
  if (survey) put('survey.md', frontmatter({ lists: survey.lists ?? [], voices: survey.voices ?? [] }))
  for (const n of nodes) {
    const node = {}
    for (const k of NODE_KEYS) if (n[k] !== undefined) node[k] = n[k]
    const looks = {}
    for (const k of NODE_VISUALS) if (n[k] !== undefined) looks[k] = n[k]
    if (node.sources) node.sources = node.sources.map(citation)
    if (node.variants) {
      node.variants = node.variants.map((cat) => ({
        ...cat,
        items: cat.items.map((it) => {
          const vis = strip(Object.fromEntries(ITEM_VISUALS.map((k) => [k, it[k]])))
          if (Object.keys(vis).length) (looks.items ??= {})[it.id] = vis
          const rest = Object.fromEntries(Object.entries(it).filter(([k]) => !ITEM_VISUALS.includes(k)))
          if (rest.sources) rest.sources = rest.sources.map(citation)
          return rest
        }),
      }))
    }
    put(`nodes/${n.id}.md`, frontmatter(node))
    if (Object.keys(looks).length) put(`looks/${n.id}.json`, compactJson(looks) + '\n')
  }
  for (const w of works.values()) put(`works/${w.id}.md`, frontmatter(strip({ label: w.label, kind: w.kind, url: w.url, isbn: w.isbn, canon: w.canon ?? undefined })))
  return files
}

function slug(label) {
  const words = label.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '').split(/[^a-z0-9]+/).filter(Boolean)
  let out = ''
  for (const w of words) {
    if (out && out.length + w.length + 1 > 48) break
    out = out ? `${out}-${w}` : w
  }
  return out || 'work'
}

/** YAML frontmatter: short lists of plain values and small mappings in a list stay on one line. */
export function frontmatter(data) {
  const doc = new Document(data)
  visit(doc, {
    Seq(_, node) {
      if (node.items.every((i) => isScalar(i) && String(i.value).length < 60)) node.flow = true
    },
    Map(_, node, path) {
      const parent = path.at(-1)
      if (isSeq(parent) && node.items.every((p) => isScalar(p.value)) && JSON.stringify(node.toJSON()).length < 80) node.flow = true
    },
  })
  return `---\n${doc.toString({ lineWidth: 0, flowCollectionPadding: false })}---\n`
}

/** JSON with short values on one line, so a drawing reads one part per line. */
export function compactJson(v, indent = '') {
  const flat = JSON.stringify(v)
  if (v === null || typeof v !== 'object' || flat.length <= 100) return flat
  const inner = indent + '  '
  if (Array.isArray(v)) return `[\n${v.map((x) => inner + compactJson(x, inner)).join(',\n')}\n${indent}]`
  return `{\n${Object.entries(v).map(([k, x]) => `${inner}${JSON.stringify(k)}: ${compactJson(x, inner)}`).join(',\n')}\n${indent}}`
}
