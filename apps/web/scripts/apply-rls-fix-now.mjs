/**
 * Aplica la migración 008 (fix recursión RLS pacientes/familiares).
 *
 * node --env-file=apps/web/.env.local apps/web/scripts/apply-rls-fix-now.mjs
 *
 * Requiere SUPABASE_DB_URL en .env.local (Supabase → Settings → Database → URI)
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const DB_URL = process.env.SUPABASE_DB_URL
const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '../../../supabase/migrations/008_rls_fix_recursion.sql'), 'utf8')

async function main() {
  if (!DB_URL) {
    console.log('❌ Falta SUPABASE_DB_URL en .env.local')
    console.log('\nCopia y pega esto en Supabase → SQL Editor:\n')
    console.log('─'.repeat(60))
    console.log(sql)
    console.log('─'.repeat(60))
    process.exit(1)
  }

  const pg = await import('pg')
  const client = new pg.default.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(sql)
    console.log('✅ Migración 008 aplicada — RLS corregido')
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
