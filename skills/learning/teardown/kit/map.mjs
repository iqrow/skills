#!/usr/bin/env node
// The teardown as text for an agent: the outline first, then one node at a time, or a search.
// A teardown is mostly drawings and citations; this prints the words without them.
//
// Usage (<slug> is a teardown folder, a compiled JSON file, or a published teardown's URL):
//   node map.mjs <slug>                 outline: every node, one line each, as a tree; then the flatpack steps
//   node map.mjs <slug> <id> [<id>...]  each node in full: path, files, words, children, links, catalogue, sources
//   node map.mjs <slug> --json <id>...  each node as compiled JSON, drawings and work labels included
//   node map.mjs <slug> --find <words>  nodes and catalogue items holding every word, best first
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fetchTeardown, loadTeardown } from './teardown.mjs'
import { searchEntries, search, snippet } from './search.mjs'

const [file, ...args] = process.argv.slice(2)
if (!file) { console.error('usage: node map.mjs <slug> [<id>... | --json <id>... | --find <words>]'); process.exit(2) }
const remote = /^https?:\/\//.test(file)
const { teardown, errors, dir } = remote ? await fetchTeardown(file) : loadTeardown(file.replace(/(.)\/+$/, '$1'))
if (!teardown) { console.error(errors.join('\n')); process.exit(1) }
if (errors.length) console.error(`${errors.length} error(s): run build for the list. First: ${errors[0]}\n`)
const byId = new Map(teardown.nodes.map((n) => [n.id, n]))
const parentOf = new Map()
for (const n of teardown.nodes) for (const c of n.children ?? []) parentOf.set(c, n.id)
const first = (s) => (String(s ?? '').match(/^.*?[.!?](?=\s|$)/)?.[0] ?? String(s ?? ''))
const out = []

if (!args.length) {
  out.push(`# ${teardown.title}: "${teardown.prompt}"`, '', teardown.summary, '')
  const seen = new Set()
  const walk = (id, depth) => {
    const n = byId.get(id)
    seen.add(id)
    const items = (n.variants ?? []).map((c) => ` [${c.label}: ${c.items.map((i) => i.name).join(', ')}]`).join('')
    out.push(`${'  '.repeat(depth)}- ${n.id} — ${n.term} (${n.kind})${(n.children ?? []).length ? '' : n.deeper ? ' leaf, can go deeper' : ' leaf'}: ${first(n.plain)}${items}`)
    for (const c of n.children ?? []) walk(c, depth + 1)
  }
  walk(teardown.root, 0)
  const rest = teardown.nodes.filter((n) => !seen.has(n.id))
  if (rest.length) out.push('', 'Outside the tree (patterns and other shared nodes):', ...rest.map((n) => `- ${n.id} — ${n.term} (${n.kind}): ${first(n.plain)}`))
  const s = teardown.survey
  if (s) out.push('', `Survey: ${s.lists?.length ?? 0} lists. Canon: ${(s.canon ?? []).map((c) => c.label).join('; ')}. Voices: ${(s.voices ?? []).map((v) => v.name).join(', ')}.`)
  out.push('', 'Flatpack:', ...teardown.assembly.map((a, i) => `${i + 1}. ${a.title}: ${a.adds.join(', ')} → ${a.makes ?? teardown.root}`))
  out.push('', `Next: node map.mjs ${file} <id>   or   --find <words>${dir || remote ? '' : '   or   --json <id> to edit'}`)
} else if (args[0] === '--json') {
  for (const id of args.slice(1)) out.push(byId.has(id) ? JSON.stringify(byId.get(id), null, 1) : `No node "${id}". Try --find.`)
} else if (args[0] === '--find') {
  const q = args.slice(1).join(' ')
  const hits = search(searchEntries(teardown), q)
  out.push(hits[0]?.partial
    ? `No node holds every word of "${q}". ${hits.length} closest, holding some of them:`
    : `${hits.length} match${hits.length === 1 ? '' : 'es'} for "${q}"`)
  for (const r of hits.slice(0, 30)) out.push(`- ${r.id}${r.item ? ` / ${r.term} (${r.item.catalogue} item)` : ` — ${r.term}`} · ${r.field}: ${snippet(r.text, q)}`)
  if (hits.length > 30) out.push(`… ${hits.length - 30} more; add words to narrow`)
} else {
  for (const id of args) {
    const n = byId.get(id)
    if (!n) { out.push(`No node "${id}". Try --find.`, ''); continue }
    const path = []
    for (let p = id; p; p = parentOf.get(p)) path.unshift(byId.get(p).term)
    out.push(`## ${n.term} (${n.id}, ${n.kind})`, `Path: ${path.join(' › ')}`)
    if (dir) out.push(`Files: ${[`nodes/${id}.md`, `looks/${id}.json`].filter((f) => existsSync(join(dir, f))).join(', ')}`)
    if (n.aka?.length) out.push(`Also called: ${n.aka.join(', ')}`)
    for (const [k, label] of [['plain', 'What it is'], ['does', 'What it does'], ['ask', 'Ask'], ['range', 'Typical'], ['trouble', 'Trouble'], ['deeper', 'Go deeper'], ['unverified', 'Unverified']])
      if (n[k]) out.push(`${label}: ${n[k]}`)
    if (n.cues?.length) out.push('What to look for:', ...n.cues.map((c, i) => `${i + 1}. ${c}`))
    if (n.pattern) out.push(`Pattern: ${n.pattern}`)
    if (n.loop) out.push(`Loop (${n.loop.type}): ${n.loop.through.map((t) => byId.get(t)?.term ?? t).join(' → ')}`)
    if (n.plot) out.push(`Plot: ${n.plot.y} by ${n.plot.x}: ${(n.plot.series ?? []).map((s) => s.name).join(', ')}`)
    const kids = n.children ?? []
    if (kids.length) out.push('Children:', ...kids.map((c) => `- ${c} — ${byId.get(c).term}: ${first(byId.get(c).plain)}`))
    if (n.links?.length) out.push('Links:', ...n.links.map((l) => `- ${l.rel} ${l.to} — ${byId.get(l.to)?.term ?? '?'}`))
    for (const cat of n.variants ?? []) out.push(`Catalogue, ${cat.label}:`, ...cat.items.map((i) => `- ${i.name}: ${i.plain}${i.why ? ` Why it belongs: ${i.why}` : ''}`))
    if (n.sources?.length) out.push('Sources:', ...n.sources.map((s) => `- ${s.label}${s.page ? `, ${s.page}` : ''} <${s.url}>${s.flag ? ` (${s.flag})` : ''}${s.work && dir ? ` [works/${s.work}.md]` : ''}`))
    out.push('')
  }
}
console.log(out.join('\n').trimEnd())
