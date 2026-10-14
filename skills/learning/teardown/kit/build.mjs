#!/usr/bin/env node
// Validates a teardown field, then writes one self-contained HTML file.
// The field is a folder (see SCHEMA.md) or a compiled JSON file.
// Usage: node build.mjs <field> [out.html]            (default out: <field>.html next to the folder or JSON)
//        node build.mjs --public <field> [out.html]   (page for the web; default out: <field>.public.html)
//        node build.mjs --check <field>               (validate only)
// A local page puts the field's path in its "Go deeper" prompt. A --public page has no path and links to the skill instead.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, basename, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadField } from './field.mjs'

const KIT = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--')))
const args = argv.filter((a) => !a.startsWith('--'))
const checkOnly = flags.delete('--check')
const publicPage = flags.delete('--public')
const input = args[0]?.replace(/(.)\/+$/, '$1')
if (!input || flags.size) {
  console.error('Usage: node build.mjs [--check | --public] <field folder or .json> [out.html]')
  process.exit(2)
}

const loaded = loadField(input)
if (!loaded.field || loaded.errors.length) {
  console.error(`${loaded.errors.length} error(s) in ${input}'s files; fix these first:\n- ${loaded.errors.join('\n- ')}`)
  process.exit(1)
}
const field = loaded.field

const KINDS = ['product', 'part', 'process', 'knob', 'measure', 'loop', 'pattern', 'concept']
const RELS = ['raises', 'lowers', 'made from', 'made by', 'measured by', 'controls', 'see also']
const SHAPES = ['lathe', 'cylinder', 'box', 'sphere', 'cone', 'torus', 'plane', 'particles']
const MATERIALS = ['glass', 'liquid', 'foam', 'matte', 'gloss', 'metal', 'screen', 'glow']
const PARTICLE_MOTION = ['rise', 'settle', 'drift', 'orbit']
const PART_MOTION = ['spin', 'bob']
const FEEL_MOTION = ['pulse', 'spin', 'drift', 'rise', 'settle', 'jitter', 'orbit']
const LOOP_TYPES = ['reinforcing', 'balancing', 's-curve', 'cycle']
const SOURCE_KINDS = ['book', 'practitioner', 'maker', 'reference', 'standard', 'research', 'forum', 'neighbour']
const LIST_KINDS = ['practitioner', 'course', 'community', 'bibliography', 'award', 'conference', 'publisher']
const CHANNELS = ['talk', 'video', 'blog', 'newsletter', 'podcast', 'social', 'site']

const errors = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)
const isStr = (v) => typeof v === 'string' && v.trim().length > 0
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isVec = (v, n = 3) => Array.isArray(v) && v.length === n && v.every(isNum)
const isColor = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
const in01 = (v) => isNum(v) && v >= 0 && v <= 1
const isbnDigits = (v) => v.replace(/[^0-9X]/gi, '').toUpperCase()
function isIsbn(v) {
  if (typeof v !== 'string' || /[^0-9Xx\s-]/.test(v)) return false
  const d = isbnDigits(v)
  if (/^\d{9}[\dX]$/.test(d)) return [...d].reduce((s, c, i) => s + (c === 'X' ? 10 : +c) * (10 - i), 0) % 11 === 0
  if (/^97[89]\d{10}$/.test(d)) return [...d].reduce((s, c, i) => s + +c * (i % 2 ? 3 : 1), 0) % 10 === 0
  return false
}

for (const k of ['title', 'prompt', 'summary', 'root']) if (!isStr(field[k])) err('file', `"${k}" is required`)
if (!Array.isArray(field.nodes) || field.nodes.length === 0) err('file', '"nodes" must be a non-empty array')
if (!Array.isArray(field.assembly) || field.assembly.length === 0) err('file', '"assembly" must be a non-empty array')
const nodes = Array.isArray(field.nodes) ? field.nodes : []
const byId = new Map()
for (const [i, n] of nodes.entries()) {
  if (!n || !isStr(n.id)) { err(`nodes[${i}]`, 'missing "id"'); continue }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n.id)) err(n.id, 'id must be kebab-case')
  if (byId.has(n.id)) err(n.id, 'duplicate id')
  byId.set(n.id, n)
}
const has = (id) => byId.has(id)

function checkSources(where, sources, unverified) {
  if (sources === undefined) {
    if (!isStr(unverified)) err(where, 'needs "sources" or "unverified"')
    return
  }
  if (!Array.isArray(sources)) return err(where, '"sources" must be an array')
  if (sources.length === 0 && !isStr(unverified)) err(where, 'empty "sources" needs "unverified"')
  for (const [i, s] of sources.entries()) checkSource(`${where} sources[${i}]`, s)
}
function checkSource(w, s) {
  if (!isStr(s?.label)) err(w, 'missing "label"')
  if (!isStr(s?.url) || !/^https?:\/\//.test(s.url)) err(w, '"url" must be http(s)')
  if (!SOURCE_KINDS.includes(s?.kind)) err(w, `"kind" must be one of ${SOURCE_KINDS.join(', ')}`)
  if (s?.isbn !== undefined) {
    if (s.kind !== 'book') err(w, '"isbn" is for books only')
    else if (!isIsbn(s.isbn)) err(w, `"isbn" "${s.isbn}" is not a valid ISBN-10 or ISBN-13`)
  }
  if (s?.quote !== undefined && (!isStr(s.quote) || s.quote.length > 400)) err(w, '"quote" must be the words you read, 400 characters or fewer')
  if (s?.copy !== undefined && (s.copy !== true || s.kind !== 'book' || !isStr(s.page) || !isStr(s.quote))) err(w, '"copy": true is for a book read in a copy, and needs "page" and "quote"')
}

function checkPart(where, p) {
  if (!SHAPES.includes(p?.shape)) return err(where, `"shape" must be one of ${SHAPES.join(', ')}`)
  if (p.material !== undefined && !MATERIALS.includes(p.material)) err(where, `"material" must be one of ${MATERIALS.join(', ')}`)
  if (p.color !== undefined && !isColor(p.color)) err(where, '"color" must be #rrggbb')
  if (p.opacity !== undefined && !in01(p.opacity)) err(where, '"opacity" must be 0–1')
  if (p.pos !== undefined && !isVec(p.pos)) err(where, '"pos" must be [x, y, z]')
  if (p.rot !== undefined && !isVec(p.rot)) err(where, '"rot" must be [x, y, z] degrees')
  if (p.svg !== undefined && !(isStr(p.svg) && p.svg.trim().startsWith('<svg'))) err(where, '"svg" must be an <svg> string')
  if (p.face !== undefined && p.face !== 'camera') err(where, '"face" can only be "camera"')
  if (p.cut !== undefined && !(['lathe', 'cylinder'].includes(p.shape) && isNum(p.cut) && p.cut > 0 && p.cut <= 180)) err(where, '"cut" is 1–180 degrees, on lathe or cylinder parts only')
  switch (p.shape) {
    case 'lathe':
      if (!Array.isArray(p.profile) || p.profile.length < 2 || !p.profile.every((q) => isVec(q, 2) && q[0] >= 0)) err(where, 'lathe needs "profile": [[radius >= 0, y], ...] with 2+ points')
      if (p.smooth !== undefined && typeof p.smooth !== 'boolean') err(where, '"smooth" must be true or false')
      break
    case 'cylinder':
      if (![p.radiusTop, p.radiusBottom, p.height].every((v) => isNum(v) && v >= 0) || p.height <= 0) err(where, 'cylinder needs "radiusTop", "radiusBottom", "height"')
      break
    case 'box':
      if (!isVec(p.size) || p.size.some((v) => v <= 0)) err(where, 'box needs "size": [w, h, d]')
      if (p.radius !== undefined && !(isNum(p.radius) && p.radius > 0)) err(where, 'box "radius" is the corner radius of its front outline, > 0')
      break
    case 'plane':
      if (!isVec(p.size, 2) || p.size.some((v) => v <= 0)) err(where, 'plane needs "size": [w, h]')
      break
    case 'sphere':
      if (!(isNum(p.radius) && p.radius > 0)) err(where, 'sphere needs "radius"')
      break
    case 'cone':
      if (!(isNum(p.radius) && p.radius > 0 && isNum(p.height) && p.height > 0)) err(where, 'cone needs "radius" and "height"')
      break
    case 'torus':
      if (!(isNum(p.radius) && p.radius > 0 && isNum(p.tube) && p.tube > 0)) err(where, 'torus needs "radius" and "tube"')
      break
    case 'particles':
      if (!(Number.isInteger(p.count) && p.count > 0 && p.count <= 300)) err(where, 'particles need "count" 1–300')
      if (!isVec(p.box) || p.box.some((v) => v <= 0)) err(where, 'particles need "box": [w, h, d]')
      if (!PARTICLE_MOTION.includes(p.motion)) err(where, `particle "motion" must be one of ${PARTICLE_MOTION.join(', ')}`)
      break
  }
  if (p.shape !== 'particles' && p.motion !== undefined && !PART_MOTION.includes(p.motion)) err(where, `part "motion" must be one of ${PART_MOTION.join(', ')}`)
}

function checkLook(where, look) {
  if (!look || !Array.isArray(look.parts) || look.parts.length === 0) return err(where, '"look" needs "parts": [...]')
  look.parts.forEach((p, i) => checkPart(`${where} look.parts[${i}]`, p))
}

function checkFeel(where, f) {
  if (!f || typeof f !== 'object') return err(where, '"feel" must be an object')
  for (const k of ['shape', 'energy', 'grain']) if (f[k] !== undefined && !in01(f[k])) err(where, `feel.${k} must be 0–1`)
  if (f.warmth !== undefined && !in01(f.warmth)) err(where, 'feel.warmth must be 0–1')
  if (f.weight !== undefined && !(isNum(f.weight) && f.weight >= -1 && f.weight <= 1)) err(where, 'feel.weight must be -1–1')
  if (f.color !== undefined && !isColor(f.color)) err(where, 'feel.color must be #rrggbb')
  if (!in01(f.shape)) err(where, 'feel.shape (0 round … 1 spiky) is required')
  if (f.motion !== undefined && !FEEL_MOTION.includes(f.motion)) err(where, `feel.motion must be one of ${FEEL_MOTION.join(', ')}`)
  if (!isStr(f.why)) err(where, 'feel.why is required: one line on why this feel fits')
}

function checkPlot(where, plot, itemIds) {
  if (!plot || !isStr(plot.x) || !isStr(plot.y)) err(where, 'plot needs "x" and "y" labels')
  if (!Array.isArray(plot?.series) || plot.series.length === 0) return err(where, 'plot needs "series"')
  plot.series.forEach((s, i) => {
    const w = `${where} plot.series[${i}]`
    if (!isStr(s?.name)) err(w, 'missing "name"')
    if (!Array.isArray(s?.points) || s.points.length < 2 || !s.points.every((q) => isVec(q, 2))) err(w, '"points" must be [[x, y], ...] with 2+ points')
    if (s?.item !== undefined && !itemIds.has(s.item)) err(w, `"item" ${s.item} is not a catalogue item of this node`)
  })
}

const parentOf = new Map()
for (const n of nodes) {
  if (!isStr(n.id)) continue
  const w = n.id
  if (!KINDS.includes(n.kind)) err(w, `"kind" must be one of ${KINDS.join(', ')}`)
  for (const k of ['term', 'plain', 'ask']) if (!isStr(n[k])) err(w, `"${k}" is required`)
  if (!['product', 'pattern'].includes(n.kind) && !isStr(n.does)) err(w, '"does" is required')
  if (n.aka !== undefined && !(Array.isArray(n.aka) && n.aka.every(isStr))) err(w, '"aka" must be an array of strings')
  for (const c of n.children ?? []) {
    if (!has(c)) err(w, `child "${c}" does not exist`)
    else if (parentOf.has(c)) err(w, `child "${c}" already belongs to "${parentOf.get(c)}"`)
    else parentOf.set(c, n.id)
  }
  if (n.at !== undefined && !isVec(n.at)) err(w, '"at" must be [x, y, z]')
  for (const [i, l] of (n.links ?? []).entries()) {
    if (!has(l?.to)) err(w, `links[${i}] target "${l?.to}" does not exist`)
    if (!RELS.includes(l?.rel)) err(w, `links[${i}] "rel" must be one of ${RELS.join(', ')}`)
  }
  if (n.pattern !== undefined && byId.get(n.pattern)?.kind !== 'pattern') err(w, `"pattern" "${n.pattern}" is not a pattern node`)
  const itemIds = new Set()
  for (const [ci, cat] of (n.variants ?? []).entries()) {
    const cw = `${w} variants[${ci}]`
    if (!isStr(cat?.label)) err(cw, 'missing "label"')
    if (!Array.isArray(cat?.items) || cat.items.length < 2) { err(cw, 'a catalogue needs 2+ items'); continue }
    const slots = new Set((n.look?.parts ?? []).map((p) => p.slot).filter(Boolean))
    for (const [ii, it] of cat.items.entries()) {
      const iw = `${cw} items[${ii}]`
      if (!isStr(it?.id) || !isStr(it?.name) || !isStr(it?.plain)) err(iw, 'needs "id", "name", "plain"')
      if (itemIds.has(it?.id)) err(iw, `duplicate item id "${it?.id}"`)
      itemIds.add(it?.id)
      if (it?.look) {
        checkLook(iw, it.look)
        for (const p of it.look.parts ?? []) if (!p.slot) err(iw, 'catalogue look parts need a "slot"')
      }
      for (const key of ['tint', 'svg']) {
        if (it?.[key] === undefined) continue
        for (const [slot, v] of Object.entries(it[key])) {
          if (!slots.has(slot) && !(it.look?.parts ?? []).some((p) => p.slot === slot)) err(iw, `${key} slot "${slot}" is not a slot of the node's look`)
          if (key === 'tint' && !isColor(v)) err(iw, `tint "${slot}" must be #rrggbb`)
          if (key === 'svg' && !(isStr(v) && v.trim().startsWith('<svg'))) err(iw, `svg "${slot}" must be an <svg> string`)
        }
      }
      checkSources(iw, it?.sources, it?.unverified)
    }
  }
  if (n.look) checkLook(w, n.look)
  if (n.feel) checkFeel(w, n.feel)
  if (n.plot) checkPlot(w, n.plot, itemIds)
  if (n.kind === 'loop') {
    if (!n.loop) err(w, 'a loop node needs "loop"')
  }
  if (n.loop) {
    if (!LOOP_TYPES.includes(n.loop.type)) err(w, `loop.type must be one of ${LOOP_TYPES.join(', ')}`)
    if (!Array.isArray(n.loop.through) || n.loop.through.length < 2) err(w, 'loop.through needs 2+ node ids')
    else for (const t of n.loop.through) if (!has(t)) err(w, `loop.through "${t}" does not exist`)
  }
  if (!n.look && !n.feel && !n.loop && !n.plot) err(w, 'needs a visual: "look", "feel", "loop" or "plot"')
  checkSources(w, n.sources, n.unverified)
}

if (isStr(field.root)) {
  const root = byId.get(field.root)
  if (!root) err('file', `root "${field.root}" does not exist`)
  else {
    if (root.kind !== 'product') err(field.root, 'the root must have kind "product"')
    const seen = new Set()
    const walk = (id, depth) => {
      if (seen.has(id)) return
      seen.add(id)
      for (const c of byId.get(id)?.children ?? []) walk(c, depth + 1)
    }
    walk(field.root, 0)
    for (const n of nodes) if (isStr(n.id) && n.kind !== 'pattern' && !seen.has(n.id)) err(n.id, 'is not reachable from the root through "children"')
    for (const n of nodes) if (n.kind === 'pattern' && parentOf.has(n.id)) err(n.id, 'a pattern sits outside the tree; link to it with "pattern"')
  }
}

for (const [i, s] of (field.assembly ?? []).entries()) {
  const w = `assembly[${i}]`
  if (!isStr(s?.title) || !isStr(s?.text)) err(w, 'needs "title" and "text"')
  if (!Array.isArray(s?.adds) || s.adds.length === 0) err(w, 'needs "adds": [ids]')
  else for (const a of s.adds) if (!has(a)) err(w, `adds "${a}" does not exist`)
  if (s?.makes !== undefined && !has(s.makes)) err(w, `makes "${s.makes}" does not exist`)
}
const last = field.assembly?.at?.(-1)
if (last && last.makes !== undefined && last.makes !== field.root) err('assembly', 'the last step must make the root')

const survey = field.survey
if (survey !== undefined) {
  const isUrl = (v) => isStr(v) && /^https?:\/\//.test(v)
  const listIds = new Set()
  for (const [i, l] of (survey.lists ?? []).entries()) {
    const w = `survey.lists[${i}]`
    if (!isStr(l?.id) || !isStr(l?.label) || !isUrl(l?.url)) err(w, 'needs "id", "label" and an http(s) "url"')
    if (!LIST_KINDS.includes(l?.kind)) err(w, `"kind" must be one of ${LIST_KINDS.join(', ')}`)
    if (listIds.has(l?.id)) err(w, `duplicate id "${l?.id}"`)
    listIds.add(l?.id)
  }
  for (const [i, c] of (survey.canon ?? []).entries()) {
    const w = `survey.canon[${i}]`
    checkSource(w, c)
    if (!isStr(c?.why)) err(w, 'needs "why"')
    if (c?.specialism !== undefined && !isStr(c.specialism)) err(w, '"specialism" must be a name')
    if (!Array.isArray(c?.named) || new Set(c.named).size < 2) err(w, '"named" needs the ids of 2+ lists that name it')
    else for (const id of c.named) if (!listIds.has(id)) err(w, `named "${id}" is not in survey.lists`)
  }
  for (const [i, v] of (survey.voices ?? []).entries()) {
    const w = `survey.voices[${i}]`
    if (!isStr(v?.name) || !isStr(v?.known)) err(w, 'needs "name" and "known"')
    if (!Array.isArray(v?.links) || !v.links.length) err(w, 'needs "links"')
    else for (const [j, l] of v.links.entries()) {
      if (!isStr(l?.label) || !isUrl(l?.url)) err(`${w} links[${j}]`, 'needs "label" and an http(s) "url"')
      if (!CHANNELS.includes(l?.kind)) err(`${w} links[${j}]`, `"kind" must be one of ${CHANNELS.join(', ')}`)
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} error(s) in ${input}:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

// Summary
const count = {}
for (const n of nodes) count[n.kind] = (count[n.kind] ?? 0) + 1
const depthOf = (id) => { let d = 0; while (parentOf.has(id)) { id = parentOf.get(id); d++ } return d }
const maxDepth = Math.max(...nodes.map((n) => depthOf(n.id)))
const cited = nodes.flatMap((n) => [...(n.sources ?? []), ...(n.variants ?? []).flatMap((c) => c.items.flatMap((it) => it.sources ?? []))])
const works = new Map()
const workKey = (s) => (s.isbn ? `isbn ${isbnDigits(s.isbn)}` : `${s.kind} ${s.label}`)
for (const s of cited) works.set(workKey(s), s)
const books = [...works.values()].filter((s) => s.kind === 'book')
const unverified = nodes.filter((n) => isStr(n.unverified)).map((n) => n.id)
const catalogues = nodes.flatMap((n) => (n.variants ?? []).map((c) => `${n.id}:${c.label}(${c.items.length})`))
console.log(`${input}: OK. ${nodes.length} nodes (${Object.entries(count).map(([k, v]) => `${v} ${k}`).join(', ')}), depth ${maxDepth}, ${works.size} cited works (${books.length} books), ${field.assembly.length} assembly steps.`)
console.log(`catalogues: ${catalogues.join(', ') || 'none'}`)
const noIsbn = books.filter((s) => !s.isbn).map((s) => s.label)
if (noIsbn.length) console.log(`books without isbn: ${noIsbn.join('; ')}`)
if (unverified.length) console.log(`unverified: ${unverified.join(', ')}`)
if (survey) {
  const channels = new Set((survey.voices ?? []).flatMap((v) => v.links.map((l) => l.kind)))
  console.log(`survey: ${survey.lists?.length ?? 0} lists, ${survey.canon?.length ?? 0} canon works, ${survey.voices?.length ?? 0} voices (${[...channels].join(', ') || 'no channels'})`)
  const uncited = (survey.canon ?? []).filter((c) => !works.has(workKey(c))).map((c) => c.label)
  if (uncited.length) console.log(`canon not cited on any node: ${uncited.join('; ')}`)
} else console.log('survey: none')
if (checkOnly) process.exit(0)

const viewerJs = join(KIT, 'viewer.js')
const viewerCss = join(KIT, 'viewer.css')
if (!existsSync(viewerJs)) {
  console.error(`missing ${viewerJs}: rebuild it with kit/src/bundle.mjs`)
  process.exit(2)
}
const out = resolve(args[1] ?? join(dirname(input), basename(input, extname(input)) + (publicPage ? '.public.html' : '.html')))
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const file = resolve(input)
const fileAttr = publicPage ? '' : ` data-file="${esc(file.startsWith(homedir() + sep) ? '~' + file.slice(homedir().length) : file)}"`
const data = JSON.stringify(field).replace(/</g, '\\u003c')
const js = readFileSync(viewerJs, 'utf8').replace(/<\/script/gi, '<\\/script')
const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(field.title)} · teardown</title>
<style>${readFileSync(viewerCss, 'utf8')}</style>
</head>
<body>
<script type="application/json" id="field"${fileAttr}>${data}</script>
<script>${js}</script>
</body>
</html>
`
writeFileSync(out, html)
console.log(`wrote ${out} (${Math.round(html.length / 1024)} KB)`)
