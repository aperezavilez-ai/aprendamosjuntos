import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
    }

    const body = await request.json()
    const {
      nombre_clinica,
      nombre,
      apellidos,
      email,
      password,
      telefono,
      ciudad,
    } = body

    if (!nombre_clinica?.trim() || !nombre?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Completa los campos obligatorios' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const emailNorm = email.trim().toLowerCase()
    const admin = adminClient()

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: {
        nombre: nombre.trim(),
        apellidos: (apellidos || '').trim(),
      },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Ese correo ya está registrado' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { data: clinica, error: clinicaError } = await admin
      .from('clinicas')
      .insert({
        nombre: nombre_clinica.trim(),
        email: emailNorm,
        telefono: telefono?.trim() || null,
        ciudad: ciudad?.trim() || null,
        plan: 'profesional',
        activa: true,
      })
      .select('id')
      .single()

    if (clinicaError || !clinica) {
      await admin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: clinicaError?.message || 'Error al crear la clínica' }, { status: 400 })
    }

    const { error: sucursalError } = await admin.from('sucursales').insert({
      clinica_id: clinica.id,
      nombre: 'Sucursal principal',
      ciudad: ciudad?.trim() || null,
      activa: true,
    })

    if (sucursalError) {
      await admin.from('clinicas').delete().eq('id', clinica.id)
      await admin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: sucursalError.message }, { status: 400 })
    }

    const { error: perfilError } = await admin.from('usuarios').insert({
      id: authUser.user.id,
      clinica_id: clinica.id,
      nombre: nombre.trim(),
      apellidos: (apellidos || '').trim(),
      email: emailNorm,
      telefono: telefono?.trim() || null,
      rol: 'admin_general',
      activo: true,
    })

    if (perfilError) {
      await admin.from('clinicas').delete().eq('id', clinica.id)
      await admin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: perfilError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      clinica_id: clinica.id,
      email: emailNorm,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
