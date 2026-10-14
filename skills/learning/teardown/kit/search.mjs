// Full-text search over a field: every node's words, its catalogue items and its sources.
// Shared by the viewer's Index (bundled) and map.mjs (the command-line map for agents).

// Fields in the order a match is reported; earlier fields rank higher.
const NODE_FIELDS = [['term', 'Term'], ['aka', 'Also called'], ['plain', 'What it is'], ['does', 'What it does'], ['ask', 'Ask'], ['range', 'Typical'], ['trouble', 'Trouble'], ['deeper', 'Go deeper'], ['unverified', 'Unverified']]

// Lower case, with punctuation as spaces: "hits-to-kill" matches "hits to kill".
export const fold = (s) => ` ${String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `

/** One entry per node and per catalogue item. `fields` is [label, text][] in rank order; `summary` is its plain text. */
export function searchEntries(field) {
  const out = []
  for (const n of field.nodes) {
    const fields = NODE_FIELDS.flatMap(([k, label]) => n[k] == null ? [] : [[label, Array.isArray(n[k]) ? n[k].join(', ') : n[k]]])
    for (const s of n.sources ?? []) fields.push(['Source', [s.label, s.page].filter(Boolean).join(', ')])
    out.push({ id: n.id, term: n.term, kind: n.kind, summary: n.plain, fields })
    for (const [ci, cat] of (n.variants ?? []).entries())
      for (const [ii, it] of cat.items.entries()) {
        const f = [['Term', it.name], [cat.label, it.plain]]
        f.push(['Catalogue', `${cat.label}, in ${n.term}`])
        for (const s of it.sources ?? []) f.push(['Source', [s.label, s.page].filter(Boolean).join(', ')])
        out.push({ id: n.id, term: it.name, kind: n.kind, summary: it.plain, item: { ci, ii, of: n.term, catalogue: cat.label }, fields: f.filter(([, t]) => t) })
      }
  }
  return out.map((e) => ({ ...e, folded: e.fields.map(([, t]) => fold(t)) }))
}

/**
 * Entries holding every word of `query` (in any field), best first: whole-word hits beat
 * prefix hits, and hits in the term or aka beat hits in sources. Each hit says where it matched.
 * When no entry holds every word, the entries holding the most of them, each marked `partial`:
 * a word the field never uses ("httk matrix") still finds what the other words name.
 */
export function search(entries, query) {
  const words = fold(query).trim().split(' ').filter(Boolean)
  if (!words.length) return []
  const hits = []
  for (const e of entries) {
    let score = 0, found = 0, where = -1
    for (const w of words) {
      let best = 0, at = -1
      e.folded.forEach((t, i) => {
        const s = t.includes(` ${w} `) ? 3 : t.includes(` ${w}`) ? 2 : t.includes(w) ? 1 : 0
        const weighted = s && s * 10 - Math.min(i, 9)
        if (weighted > best) { best = weighted; at = i }
      })
      if (!best) continue
      found++
      score += best
      if (where < 0 || at < where) where = at
    }
    if (found) hits.push({ ...e, found, score, field: e.fields[where][0], text: e.fields[where][1] })
  }
  const most = Math.max(0, ...hits.map((h) => h.found))
  const partial = most < words.length
  return hits.filter((h) => h.found === most).map((h) => ({ ...h, partial }))
    .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term, 'en-GB'))
}

/** The part of `text` around the first query word, at most `max` characters. */
export function snippet(text, query, max = 140) {
  if (text.length <= max) return text
  const lower = text.toLowerCase()
  const at = Math.max(0, ...fold(query).trim().split(' ').map((w) => lower.indexOf(w)).filter((i) => i >= 0).slice(0, 1))
  const start = Math.max(0, Math.min(at - 40, text.length - max))
  return `${start ? '…' : ''}${text.slice(start, start + max).trim()}${start + max < text.length ? '…' : ''}`
}
