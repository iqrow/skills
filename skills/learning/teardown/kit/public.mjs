// Writes a teardown as a folder for the web: one HTML page per node, so every node URL has its own title,
// description, preview image and readable text. The 3D viewer then loads over the text.
//   index.html            the root           <id>.html   every other node
//   teardown.json         the compiled teardown: the pages load it, and `map.mjs <url>` reads it
//   viewer.js, viewer.css the viewer every page shares
//   cover.jpg             not written here: cover.mjs makes it from the built folder
// The server answers <url><id> with <id>.html (Caddy: a rewrite to {path}.html when that file exists).
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { AI_NOTE, usePrompt } from './prompts.mjs'

const SKILL_URL = 'https://github.com/iqrow/skills'
const OWNED = /^(.+\.html|teardown\.json|viewer\.(js|css)|cover\.jpg)$/

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const first = (s) => String(s ?? '').match(/^.*?[.!?](?=\s|$)/)?.[0] ?? String(s ?? '')
// The text's first sentences, up to about 300 characters: a search result or link preview shows no more.
const lead = (text) => {
  let s = ''
  for (const part of String(text).trim().split(/(?<=[.!?])\s+/)) {
    if (s && s.length + part.length > 300) break
    s += (s ? ' ' : '') + part
  }
  return s
}

// Readable without script; hidden once the viewer can start (the head marks <html class="js">).
const STYLE = `.js .tp-static { display: none; }
html:not(.js), html:not(.js) body { height: auto; overflow: auto; }
.tp-static { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; font-size: 16px; }
.tp-static nav { color: var(--muted); }
.tp-static .kind { margin: 24px 0 0; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--gold); }
.tp-static h1 { margin: 4px 0 8px; font-size: 32px; line-height: 1.15; }
.tp-static h2 { margin: 28px 0 8px; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.tp-static dl { display: grid; grid-template-columns: 120px 1fr; gap: 6px 12px; }
.tp-static dt { color: var(--muted); }
.tp-static dd { margin: 0; }
.tp-static q { display: block; color: var(--muted); font-style: italic; }
.tp-static pre { white-space: pre-wrap; background: var(--card); padding: 10px 12px; border-radius: 6px; }
.tp-static .note { margin-top: 32px; color: var(--muted); font-size: 14px; }`

/** Writes the folder. `url` is the folder's public URL, ending in "/"; `legalUrl`, if given, is the site's legal page,
 *  linked beside the AI note on every page. Returns the number of pages. */
export function writePublic(teardown, outDir, url, { viewerJs, viewerCss, legalUrl }) {
  if (teardown.root !== 'index' && teardown.nodes.some((n) => n.id === 'index')) throw new Error('node "index" would overwrite the root page; rename it')
  if (existsSync(outDir)) {
    const files = readdirSync(outDir)
    // Only a folder this function wrote may be emptied: a stale node page must go, nothing else may.
    if (files.length && !files.includes('teardown.json')) throw new Error(`${outDir} is not empty and holds no teardown.json; choose an empty folder`)
    const foreign = files.filter((f) => !OWNED.test(f))
    if (foreign.length) throw new Error(`${outDir} holds files the build does not write: ${foreign.join(', ')}`)
    for (const f of files) if (f.endsWith('.html')) unlinkSync(join(outDir, f))
  } else mkdirSync(outDir, { recursive: true })

  const byId = new Map(teardown.nodes.map((n) => [n.id, n]))
  const parentOf = new Map()
  for (const n of teardown.nodes) for (const c of n.children ?? []) parentOf.set(c, n.id)
  const href = (id) => (id === teardown.root ? './' : id)
  const a = (id) => `<a href="${href(id)}">${esc(byId.get(id).term)}</a>`
  const siteTitle = `${teardown.title} · teardown`

  // Every node, as a nested list from the root, then the nodes outside the tree: the root page's index.
  const seen = new Set()
  const outline = (id) => {
    seen.add(id)
    const kids = (byId.get(id).children ?? []).filter((c) => !seen.has(c))
    return `<li>${a(id)}${kids.length ? `<ul>${kids.map(outline).join('')}</ul>` : ''}</li>`
  }
  const tree = outline(teardown.root)
  const rest = teardown.nodes.filter((n) => !seen.has(n.id))

  const article = (n) => {
    const out = []
    const trail = []
    for (let p = parentOf.get(n.id); p; p = parentOf.get(p)) trail.unshift(a(p))
    out.push(`<nav>${n.id === teardown.root ? esc(siteTitle) : trail.join(' › ')}</nav>`)
    if (n.id === teardown.root) out.push(`<p>“${esc(teardown.prompt)}”</p>`, `<p>${esc(teardown.summary)}</p>`)
    out.push(`<p class="kind">${esc(cap(n.kind))}</p>`, `<h1>${esc(n.term)}</h1>`)
    if (n.aka?.length) out.push(`<p>You might say: ${esc(n.aka.join(', '))}</p>`)
    out.push(`<p>${esc(n.plain)}</p>`)
    const rows = [['What it does', n.does], ['Ask', n.ask], ['Typical', n.range], ['Trouble', n.trouble]].filter(([, v]) => v)
    if (rows.length) out.push(`<dl>${rows.map(([dt, dd]) => `<dt>${dt}</dt><dd>${esc(dd)}</dd>`).join('')}</dl>`)
    if (n.cues?.length) out.push('<h2>What to look for</h2>', `<ol>${n.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>`)
    if (n.children?.length) out.push('<h2>Parts</h2>', `<ul>${n.children.map((c) => `<li>${a(c)}: ${esc(first(byId.get(c).plain))}</li>`).join('')}</ul>`)
    for (const cat of n.variants ?? []) out.push(`<h2>Catalogue: ${esc(cat.label)}</h2>`, `<ul>${cat.items.map((it) => `<li><b>${esc(it.name)}</b>: ${esc(it.plain)}${it.why ? ` <i>${esc(it.why)}</i>` : ''}</li>`).join('')}</ul>`)
    if (n.loop) out.push(`<h2>Loop: ${esc(n.loop.type)}</h2>`, `<p>${n.loop.through.map((t) => (byId.has(t) ? a(t) : esc(t))).join(' → ')} ↺</p>`)
    if (n.pattern) out.push('<h2>Pattern</h2>', `<p>${a(n.pattern)}</p>`)
    if (n.links?.length) out.push('<h2>Connections</h2>', `<ul>${n.links.map((l) => `<li>${esc(cap(l.rel))}: ${a(l.to)}</li>`).join('')}</ul>`)
    if (n.sources?.length) out.push('<h2>Sources</h2>', `<ol>${n.sources.map((s) => `<li><a href="${esc(s.url)}">${esc(s.label)}</a>${s.page ? `, ${esc(s.page)}` : ''}${s.quote ? `<q>${esc(s.quote)}</q>` : ''}</li>`).join('')}</ol>`)
    if (n.unverified) out.push(`<p>Unverified: ${esc(n.unverified)}</p>`)
    out.push('<h2>Use it on your project</h2>', `<pre>${esc(usePrompt(teardown, n, url))}</pre>`,
      `<p>Paste it into a coding agent that has the <a href="${SKILL_URL}">teardown skills</a>.</p>`)
    if (n.id === teardown.root) out.push('<h2>Every part</h2>', `<ul>${tree}</ul>`, rest.length ? `<ul>${rest.map((r) => `<li>${a(r.id)}</li>`).join('')}</ul>` : '')
    out.push(`<p class="note">${esc(AI_NOTE)}${legalUrl ? ` <a href="${esc(legalUrl)}">About and legal</a>` : ''}</p>`)
    return out.join('\n')
  }

  const page = (n) => {
    const isRoot = n.id === teardown.root
    const title = isRoot ? siteTitle : `${n.term} · ${siteTitle}`
    const pageUrl = isRoot ? url : url + n.id
    const description = lead(isRoot ? teardown.summary : n.plain)
    return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(siteTitle)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(url)}cover.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(teardown.title)}: the teardown as a 3D exploded view">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="teardown.json" as="fetch" crossorigin>
<link rel="preload" href="viewer.js" as="script">
<link rel="stylesheet" href="viewer.css">
<script>document.documentElement.classList.add('js')</script>
<style>${STYLE}</style>
</head>
<body>
<article class="tp-static">
${article(n)}
</article>
<script type="application/json" id="teardown"${legalUrl ? ` data-legal="${esc(legalUrl)}"` : ''}></script>
<script>
// The viewer reads the teardown element when it runs, so it loads after the teardown. If the teardown cannot load, the text stays.
fetch('teardown.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.text() }).then((text) => {
  document.getElementById('teardown').textContent = text
  document.body.append(Object.assign(document.createElement('script'), { src: 'viewer.js' }))
}).catch(() => document.documentElement.classList.remove('js'))
</script>
</body>
</html>
`
  }

  writeFileSync(join(outDir, 'teardown.json'), JSON.stringify(teardown))
  writeFileSync(join(outDir, 'viewer.js'), readFileSync(viewerJs))
  writeFileSync(join(outDir, 'viewer.css'), readFileSync(viewerCss))
  for (const n of teardown.nodes) writeFileSync(join(outDir, n.id === teardown.root ? 'index.html' : `${n.id}.html`), page(n))
  return teardown.nodes.length
}
