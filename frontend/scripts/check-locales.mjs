// Verifies every locale file has exactly the same keys as en.json.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/locales')

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  )
}

// Plural suffixes differ per language, so compare keys with them stripped.
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '')
const keys = (file) => new Set(flatten(JSON.parse(readFileSync(path.join(dir, file), 'utf8'))).map(base))

const reference = keys('en.json')
let failed = false

// {{placeholders}} and <1>tags</1> must match the English string for the same key,
// otherwise the translation shows blanks or raw markup.
function placeholders(file) {
  const out = new Map()
  const walk = (obj, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') walk(v, `${prefix}${k}.`)
      else {
        const found = new Set([...String(v).matchAll(/\{\{\s*(\w+)\s*\}\}|<\/?(\d+)>/g)].map((m) => m[1] ?? `<${m[2]}>`))
        out.set(base(`${prefix}${k}`), [...(out.get(base(`${prefix}${k}`)) ?? []), found])
      }
    }
  }
  walk(JSON.parse(readFileSync(path.join(dir, file), 'utf8')))
  return out
}
const enPlaceholders = placeholders('en.json')

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'en.json')) {
  const current = keys(file)
  const missing = [...reference].filter((k) => !current.has(k))
  const extra = [...current].filter((k) => !reference.has(k))
  const mismatched = []
  const own = placeholders(file)
  for (const [key, sets] of own) {
    const expected = enPlaceholders.get(key)
    if (!expected) continue
    // count is implicit for plural forms, so ignore it when comparing
    const norm = (set) => [...set].filter((x) => x !== 'count').sort().join(',')
    const want = new Set(expected.map(norm))
    for (const set of sets) if (!want.has(norm(set))) mismatched.push(key)
  }
  if (mismatched.length) {
    failed = true
    console.error(`\n${file}`)
    mismatched.forEach((k) => console.error(`  placeholder mismatch: ${k}`))
  }
  if (missing.length || extra.length) {
    failed = true
    console.error(`\n${file}`)
    missing.forEach((k) => console.error(`  missing: ${k}`))
    extra.forEach((k) => console.error(`  extra:   ${k}`))
  } else {
    console.log(`${file}: ok (${current.size} keys)`)
  }
}

process.exit(failed ? 1 : 0)
