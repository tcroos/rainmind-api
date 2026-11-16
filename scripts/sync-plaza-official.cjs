/**
 * Refresh the Model Plaza official price snapshot (official.json) from the
 * upstream's daily build on jsDelivr. Display-only data — never touches
 * pricing/billing config.
 *
 * Usage: node scripts/sync-plaza-official.cjs
 * Deploy cron example:  17 9 * * * node /path/to/new-api/scripts/sync-plaza-official.cjs
 */
const fs = require('fs')
const path = require('path')

const URL_ =
  'https://cdn.jsdelivr.net/gh/TransAPI-eng/new-api-model-plaza@main/official.json'
const OUT = path.join(
  __dirname,
  '..',
  'web',
  'public',
  'plaza',
  'official.json'
)

async function main() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)
  const res = await fetch(URL_, { signal: controller.signal })
  clearTimeout(timer)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const text = await res.text()
  const json = JSON.parse(text) // fail fast on truncated/HTML responses
  const models = json.models ? Object.keys(json.models).length : 0
  fs.writeFileSync(OUT, text)
  console.log(
    'official.json updated ->',
    OUT,
    '| models:',
    models,
    '| fx:',
    json.fx ? JSON.stringify(json.fx) : 'n/a'
  )
}

main().catch((e) => {
  console.error('sync failed:', e.message)
  process.exit(1)
})
