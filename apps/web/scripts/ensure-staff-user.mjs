/**
 * Asegura acceso de un usuario staff en Auth + perfil aprendamosjuntos.usuarios
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const EMAIL = (process.env.USER_EMAIL || 'psicomarioarmenta@gmail.com').trim().toLowerCase()
const PASSWORD = process.env.USER_PASSWORD || 'Marioarmenta2026'
const NOMBRE = process.env.USER_NOMBRE || 'Mario'
const APELLIDOS = process.env.USER_APELLIDOS || 'Armenta'
const ROL = process.env.USER_ROL || 'director_clinico'

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  'Content-Type': 'application/json',
}

function assertEnv() {
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) throw new Error('Faltan env vars')
  if (!SUPABASE_URL.endsWith('/aprendiendo-juntos')) {
    throw new Error(`URL incorrecta: ${SUPABASE_URL}`)
  }
}

async function adminFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${text}`)
  return data
}

async function rest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      ...headers,
      'Accept-Profile': 'aprendamosjuntos',
      'Content-Profile': 'aprendamosjuntos',
      Prefer: options.prefer || 'return=representation',
      ...options.headers,
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`REST ${path} -> ${res.status}: ${text}`)
  return data
}

async function getClinicId() {
  const rows = await rest('/clinicas?select=id,nombre&order=created_at.asc&limit=1')
  if (!rows[0]?.id) throw new Error('No hay clínica')
  return rows[0].id
}

async function findAuthUser(email) {
  const list = await adminFetch('/auth/v1/admin/users?page=1&per_page=1000')
  return (list.users || []).find((u) => u.email?.toLowerCase() === email) || null
}

async function ensureAuth() {
  let user = await findAuthUser(EMAIL)
  if (user) {
    console.log('Auth user exists:', user.id)
    return adminFetch(`/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        ban_duration: 'none',
        user_metadata: { nombre: NOMBRE, apellidos: APELLIDOS, rol: ROL },
      }),
    })
  }
  console.log('Creating auth user...')
  return adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { nombre: NOMBRE, apellidos: APELLIDOS, rol: ROL },
    }),
  })
}

async function ensureProfile(authUserId, clinicaId) {
  const byId = await rest(`/usuarios?select=id,email,rol,activo,clinica_id&id=eq.${authUserId}&limit=1`)
  if (byId[0]?.id) {
    console.log('Profile by id:', byId[0])
    await rest(`/usuarios?id=eq.${authUserId}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        clinica_id: clinicaId,
        nombre: NOMBRE,
        apellidos: APELLIDOS,
        email: EMAIL,
        rol: byId[0].rol || ROL,
        activo: true,
      }),
    })
    return byId[0].rol || ROL
  }

  const byEmail = await rest(`/usuarios?select=id,email,rol,activo&email=eq.${encodeURIComponent(EMAIL)}&limit=1`)
  if (byEmail[0]?.id && byEmail[0].id !== authUserId) {
    console.log('Stale profile by email, deactivating:', byEmail[0].id)
    await rest(`/usuarios?id=eq.${byEmail[0].id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        email: `${EMAIL}.old-${byEmail[0].id.slice(0, 8)}`,
        activo: false,
      }),
    })
  }

  console.log('Creating profile...')
  await rest('/usuarios', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      id: authUserId,
      clinica_id: clinicaId,
      nombre: NOMBRE,
      apellidos: APELLIDOS,
      email: EMAIL,
      rol: ROL,
      activo: true,
    }),
  })
  return ROL
}

async function verifyLogin() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(data)}`)
  const profile = await rest(`/usuarios?select=id,email,rol,activo&id=eq.${data.user.id}&limit=1`)
  console.log('Login OK. Profile:', profile[0])
  if (!profile[0]?.activo) throw new Error('Perfil inactivo')
}

async function main() {
  assertEnv()
  console.log('Target:', SUPABASE_URL)
  const clinicaId = await getClinicId()
  console.log('Clinica:', clinicaId)
  const authUser = await ensureAuth()
  const rol = await ensureProfile(authUser.id, clinicaId)
  await verifyLogin()
  console.log(`\nOK: ${EMAIL} / ${PASSWORD} (rol: ${rol})`)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
