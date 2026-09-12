/**
 * Verifica login completo (Auth + perfil usuarios) para cuentas staff.
 * node --env-file=.env.local apps/web/scripts/verify-staff-login.mjs
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const ACCOUNTS = [
  { email: 'psicomarioarmenta@gmail.com', password: 'Marioarmenta2026' },
  { email: 'donis22mily@gmail.com', password: 'Donis222026' },
]

if (!SUPABASE_URL?.endsWith('/aprendiendo-juntos')) {
  console.error('URL incorrecta:', SUPABASE_URL)
  process.exit(1)
}

async function checkOne({ email, password }) {
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const login = await loginRes.json()
  if (!loginRes.ok) {
    return { email, ok: false, step: 'auth', error: login }
  }

  const userId = login.user.id
  const token = login.access_token

  // Igual que el cliente de la app
  const byIdRes = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?select=id,activo,rol,email,clinica_id&id=eq.${userId}&limit=1`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Accept-Profile': 'aprendamosjuntos',
      },
    }
  )
  const byIdText = await byIdRes.text()
  let byId = []
  try { byId = byIdText ? JSON.parse(byIdText) : [] } catch { byId = byIdText }

  // Fallback por email
  const byEmailRes = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?select=id,activo,rol,email,clinica_id&email=ilike.${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Accept-Profile': 'aprendamosjuntos',
      },
    }
  )
  const byEmailText = await byEmailRes.text()
  let byEmail = []
  try { byEmail = byEmailText ? JSON.parse(byEmailText) : [] } catch { byEmail = byEmailText }

  // Service role vista (diagnóstico)
  const adminRes = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?select=id,activo,rol,email&email=eq.${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Accept-Profile': 'aprendamosjuntos',
      },
    }
  )
  const adminProfile = await adminRes.json()

  const profile = Array.isArray(byId) && byId[0] ? byId[0] : (Array.isArray(byEmail) && byEmail[0] ? byEmail[0] : null)
  const ok = Boolean(profile?.activo && profile?.rol && profile.rol !== 'padre')

  return {
    email,
    ok,
    userId,
    authOk: true,
    byIdStatus: byIdRes.status,
    byId,
    byEmailStatus: byEmailRes.status,
    byEmail,
    adminProfile,
    canEnterApp: ok,
  }
}

const results = []
for (const account of ACCOUNTS) {
  results.push(await checkOne(account))
}

for (const r of results) {
  console.log('\n========', r.email, '========')
  console.log(JSON.stringify(r, null, 2))
}

const allOk = results.every((r) => r.ok)
console.log('\nRESULTADO:', allOk ? 'AMBAS OK' : 'HAY FALLOS')
process.exit(allOk ? 0 : 1)
