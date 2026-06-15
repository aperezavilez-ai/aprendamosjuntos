import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generarPassword(longitud = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#'
  let pwd = ''
  for (let i = 0; i < longitud; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

const ROLES_STAFF = ['admin_general', 'director_clinico', 'terapeuta', 'recepcion']

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: staff } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!staff || !['admin_general', 'director_clinico'].includes(staff.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { email, nombre, apellidos, rol, telefono, password: customPassword } = body

    if (!email || !nombre || !rol) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }
    if (!ROLES_STAFF.includes(rol)) {
      return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })
    }

    const emailNorm = email.trim().toLowerCase()
    const password = customPassword || generarPassword()
    const admin = adminClient()

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellidos: apellidos || '' },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Ese correo ya tiene una cuenta' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: perfilError } = await admin.from('usuarios').insert({
      id: authUser.user.id,
      clinica_id: staff.clinica_id,
      nombre: nombre.trim(),
      apellidos: (apellidos || '').trim(),
      email: emailNorm,
      telefono: telefono?.trim() || null,
      rol,
      activo: true,
    })

    if (perfilError) {
      await admin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: perfilError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      email: emailNorm,
      password,
      user_id: authUser.user.id,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
