/**
 * Verifica que las migraciones base (001-004) estén presentes en producción.
 *
 * Uso:
 * node --env-file=apps/web/.env.local apps/web/scripts/verify-prod-migrations.mjs
 */
import pg from 'pg'

const DB_URL = process.env.SUPABASE_DB_URL

const checks = [
  {
    id: '001_schema',
    sql: `
      select
        exists(select 1 from information_schema.tables where table_schema='public' and table_name='clinicas') as clinicas,
        exists(select 1 from information_schema.tables where table_schema='public' and table_name='usuarios') as usuarios,
        exists(select 1 from information_schema.tables where table_schema='public' and table_name='evaluaciones') as evaluaciones
    `,
    validate: (row) => row.clinicas && row.usuarios && row.evaluaciones,
  },
  {
    id: '002_portal_padres',
    sql: `
      select
        exists(
          select 1
          from information_schema.columns
          where table_schema='public' and table_name='reportes_ia' and column_name='enviado_a_padres'
        ) as enviado_a_padres
    `,
    validate: (row) => row.enviado_a_padres,
  },
  {
    id: '003_storage_archivos',
    sql: `
      select
        exists(
          select 1 from information_schema.columns
          where table_schema='public' and table_name='archivos_paciente' and column_name='visible_a_padres'
        ) as visible_a_padres,
        exists(
          select 1 from information_schema.columns
          where table_schema='public' and table_name='archivos_paciente' and column_name='storage_path'
        ) as storage_path
    `,
    validate: (row) => row.visible_a_padres && row.storage_path,
  },
  {
    id: '004_rls_staff_clinico',
    sql: `
      select exists(
        select 1 from pg_policies
        where schemaname='public'
          and tablename='evaluaciones'
          and policyname='Staff gestiona evaluaciones'
      ) as staff_eval_policy
    `,
    validate: (row) => row.staff_eval_policy,
  },
]

async function main() {
  if (!DB_URL) {
    console.error('Falta SUPABASE_DB_URL en el entorno')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    let failed = 0
    for (const check of checks) {
      const { rows } = await client.query(check.sql)
      const row = rows[0] || {}
      const ok = check.validate(row)
      if (ok) {
        console.log(`✅ ${check.id}`)
      } else {
        failed++
        console.log(`❌ ${check.id} → ${JSON.stringify(row)}`)
      }
    }

    if (failed > 0) {
      console.log(`\nResultado: ${failed} verificación(es) fallaron.`)
      process.exit(2)
    }

    console.log('\n✅ Migraciones 001-004 verificadas correctamente.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('\n❌ Error verificando migraciones:', err.message)
  process.exit(1)
})
