/**
 * Asegura cuenta admin en Supabase Auth + perfil aprendamosjuntos.usuarios.
 *
 * Uso:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node --env-file=.env.local scripts/ensure-admin.mjs
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const ADMIN = {
  email: (process.env.ADMIN_EMAIL || 'admin@aprendamosjuntos.mx').trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || 'Aprendamos2026!',
  nombre: process.env.ADMIN_NOMBRE || 'Alfonso',
  apellidos: process.env.ADMIN_APELLIDOS || 'Avilez',
  rol: 'admin_general',
}

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  'Content-Type': 'application/json',
}

function assertEnv() {
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY')
  }
  if (!SUPABASE_URL.endsWith('/aprendiendo-juntos')) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL no corresponde a aprendiendo-juntos: ${SUPABASE_URL}`)
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

async function getOrCreateClinic() {
  let rows = await rest('/clinicas?select=id,nombre&order=created_at.asc&limit=1')
  if (rows[0]?.id) return rows[0].id
  rows = await rest('/clinicas', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Aprendamos Juntos', activa: true }),
  })
  return rows[0].id
}

async function findUserByEmail(email) {
  const list = await adminFetch('/auth/v1/admin/users?page=1&per_page=1000')
  return (list.users || []).find((user) => user.email?.toLowerCase() === email) || null
}

async function findReusableAdminAuthUser() {
  const admins = await rest('/usuarios?select=id,email,rol&rol=eq.admin_general&order=created_at.asc&limit=1')
  const adminProfile = admins[0]
  if (!adminProfile?.id) return null
  const list = await adminFetch('/auth/v1/admin/users?page=1&per_page=1000')
  return (list.users || []).find((user) => user.id === adminProfile.id) || null
}

async function ensureAuthUser() {
  let user = await findUserByEmail(ADMIN.email)
  if (!user) user = await findReusableAdminAuthUser()

  if (user) {
    const updated = await adminFetch(`/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        email: ADMIN.email,
        password: ADMIN.password,
        email_confirm: true,
        ban_duration: 'none',
        user_metadata: { nombre: ADMIN.nombre, apellidos: ADMIN.apellidos, rol: ADMIN.rol },
      }),
    })
    return updated
  }

  return adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN.email,
      password: ADMIN.password,
      email_confirm: true,
      user_metadata: { nombre: ADMIN.nombre, apellidos: ADMIN.apellidos, rol: ADMIN.rol },
    }),
  })
}

async function ensureProfile(authUserId, clinicaId) {
  const profileById = await rest(`/usuarios?select=id,email&id=eq.${authUserId}&limit=1`)
  if (profileById[0]?.id) {
    await rest(`/usuarios?id=eq.${authUserId}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        clinica_id: clinicaId,
        nombre: ADMIN.nombre,
        apellidos: ADMIN.apellidos,
        email: ADMIN.email,
        rol: ADMIN.rol,
        activo: true,
      }),
    })
    return
  }

  const profileByEmail = await rest(
    `/usuarios?select=id,email&email=eq.${encodeURIComponent(ADMIN.email)}&limit=1`
  )
  if (profileByEmail[0]?.id && profileByEmail[0].id !== authUserId) {
    await rest(`/usuarios?id=eq.${profileByEmail[0].id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ email: `${ADMIN.email}.old-${profileByEmail[0].id.slice(0, 8)}`, activo: false }),
    })
  }

  await rest('/usuarios', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      id: authUserId,
      clinica_id: clinicaId,
      nombre: ADMIN.nombre,
      apellidos: ADMIN.apellidos,
      email: ADMIN.email,
      rol: ADMIN.rol,
      activo: true,
    }),
  })
}

async function verifyLogin() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Login test failed: ${JSON.stringify(data)}`)

  const profile = await rest(`/usuarios?select=id,email,rol,activo&id=eq.${data.user.id}&limit=1`)
  if (!profile[0]?.activo) throw new Error('Login OK, pero el perfil admin no está activo')
}

async function main() {
  assertEnv()
  const clinicaId = await getOrCreateClinic()
  const authUser = await ensureAuthUser()
  await ensureProfile(authUser.id, clinicaId)
  await verifyLogin()
  console.log('Admin Aprendamos Juntos verificado OK:', ADMIN.email)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
