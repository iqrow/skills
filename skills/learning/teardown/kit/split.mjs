#!/usr/bin/env node
// Turns a compiled teardown JSON into a teardown folder (see SCHEMA.md), then checks that the folder compiles back to the same teardown.
// Usage: node split.mjs teardown.json <slug>   (the folder must be new or empty)
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { loadTeardown, writeFolder } from './teardown.mjs'

const [input, dir] = process.argv.slice(2)
if (!input || !dir) { console.error('usage: node split.mjs teardown.json <slug>'); process.exit(2) }
const teardown = JSON.parse(readFileSync(input, 'utf8'))
const files = writeFolder(teardown, dir)
writeFileSync(join(dir, 'log.md'), `# Log\n\n- ${new Date().toISOString().slice(0, 10)}: split from ${input.split('/').pop()}.\n`)
writeFileSync(join(dir, '.gitignore'), 'raw/\n')

// The folder must hold the same teardown. Node order follows the tree; the compiled sources name their work.
const { teardown: back, errors } = loadTeardown(dir)
if (errors.length) { console.error(`${errors.length} error(s) reading ${dir} back:\n- ${errors.join('\n- ')}`); process.exit(1) }
const plain = (f) => {
  const g = JSON.parse(JSON.stringify(f, (k, v) => (k === 'work' ? undefined : v)))
  g.nodes.sort((a, b) => a.id.localeCompare(b.id))
  if (g.survey) g.survey.canon.sort((a, b) => a.label.localeCompare(b.label))
  return g
}
const a = plain(teardown)
const b = plain(back)
if (!isDeepStrictEqual(a, b)) {
  const diff = a.nodes.find((n, i) => !isDeepStrictEqual(n, b.nodes[i]))
  console.error(`${dir} does not compile back to ${input}${diff ? `: first difference in node ${diff.id}` : ''}`)
  process.exit(1)
}
console.log(`wrote ${files + 2} files to ${dir}; it compiles back to the same teardown.`)
