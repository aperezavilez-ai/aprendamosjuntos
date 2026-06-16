/**
 * Smoke test del módulo IA clínica (sin UI).
 *
 * Valida:
 * 1) Acceso a DB con service role
 * 2) Llamada mínima a Anthropic
 * 3) Inserción de reporte IA en reportes_ia
 *
 * Uso:
 * node --env-file=.env.local scripts/smoke-ia.mjs
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_API_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o ANTHROPIC_API_KEY')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function rest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) throw new Error(`REST ${path} -> ${res.status}: ${text}`)
  return data
}

async function main() {
  console.log('1) Resolviendo clínica/paciente/terapeuta...')
  const usuarios = await rest('/usuarios?select=id,clinica_id,rol&rol=neq.padre&limit=1')
  if (!usuarios[0]) throw new Error('No hay usuario staff para smoke test')

  const staff = usuarios[0]
  const pacientes = await rest(
    `/pacientes?select=id,nombre,apellidos&clinica_id=eq.${staff.clinica_id}&activo=eq.true&limit=1`
  )
  if (!pacientes[0]) throw new Error('No hay paciente activo para smoke test')

  const paciente = pacientes[0]
  console.log(`   Staff: ${staff.id}`)
  console.log(`   Paciente: ${paciente.nombre} ${paciente.apellidos}`)

  console.log('2) Probando Anthropic...')
  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: 'Escribe 3 líneas sobre progreso terapéutico infantil en tono clínico.' }],
    }),
  })
  if (!aiRes.ok) {
    const errText = await aiRes.text()
    throw new Error(`Anthropic fallo: ${aiRes.status} ${errText}`)
  }
  const aiJson = await aiRes.json()
  const contenido =
    (aiJson.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
      .trim() || 'Sin contenido'
  console.log('   Anthropic OK')

  console.log('3) Guardando reporte IA de smoke test...')
  const hoy = new Date().toISOString().split('T')[0]
  const created = await rest('/reportes_ia', {
    method: 'POST',
    body: JSON.stringify({
      paciente_id: paciente.id,
      clinica_id: staff.clinica_id,
      generado_por: staff.id,
      tipo: 'mensual',
      titulo: `Smoke IA ${hoy}`,
      periodo_inicio: hoy,
      periodo_fin: hoy,
      contenido,
      modelo_ia: 'claude-sonnet-4-6',
      tokens_usados: Number(aiJson?.usage?.input_tokens || 0) + Number(aiJson?.usage?.output_tokens || 0),
    }),
  })
  console.log(`   Reporte guardado: ${created?.[0]?.id || 'N/A'}`)
  console.log('\n✅ Smoke test IA completado')
}

main().catch((err) => {
  console.error('\n❌ Smoke test IA falló:', err.message)
  process.exit(1)
})
