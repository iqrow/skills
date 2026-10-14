#!/usr/bin/env node
// Rebuilds kit/viewer.js (three.js + viewer, one IIFE) after editing viewer.src.js,
// and kit/yaml.mjs (the yaml package, which the kit uses to read a field folder).
// Usage: cd kit/src && npm ci && node bundle.mjs   (versions are pinned in package.json)
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(join(here, 'package.json'))
const esbuild = require('esbuild')
const three = JSON.parse(readFileSync(join(here, 'node_modules/three/package.json'), 'utf8')).version
const result = await esbuild.build({
  entryPoints: [join(here, 'viewer.src.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2020',
  legalComments: 'none',
  outfile: join(here, '..', 'viewer.js'),
  banner: { js: `/* teardown viewer; three.js ${three} (MIT, three.js authors) */` },
  metafile: true,
})
const bytes = Object.values(result.metafile.outputs)[0].bytes
console.log(`kit/viewer.js: ${Math.round(bytes / 1024)} KB, three ${three}`)

const yamlVersion = JSON.parse(readFileSync(join(here, 'node_modules/yaml/package.json'), 'utf8')).version
const yaml = await esbuild.build({
  stdin: { contents: "export { parse, parseDocument, stringify, Document, visit, isMap, isSeq, isScalar } from 'yaml'", resolveDir: here },
  bundle: true,
  format: 'esm',
  platform: 'browser', // yaml's ESM build, which needs no Node built-ins
  minify: true,
  target: 'node22',
  legalComments: 'none',
  outfile: join(here, '..', 'yaml.mjs'),
  banner: { js: `/* yaml ${yamlVersion} (ISC, Eemeli Aro) bundled for the teardown kit */` },
  metafile: true,
})
console.log(`kit/yaml.mjs: ${Math.round(Object.values(yaml.metafile.outputs)[0].bytes / 1024)} KB, yaml ${yamlVersion}`)
