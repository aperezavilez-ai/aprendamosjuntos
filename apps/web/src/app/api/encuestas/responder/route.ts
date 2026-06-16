import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    const admin = adminClient()
    const { data, error } = await admin
      .from('encuestas_satisfaccion')
      .select('id, periodo, respondida, puntuacion, clinica:clinicas(nombre), paciente:pacientes(nombre)')
      .eq('token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Encuesta no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ encuesta: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
    }

    const body = await request.json()
    const { token, puntuacion, comentarios } = body

    if (!token || !puntuacion) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const score = Number(puntuacion)
    if (score < 1 || score > 10) {
      return NextResponse.json({ error: 'La puntuación debe ser entre 1 y 10' }, { status: 400 })
    }

    const admin = adminClient()
    const { data: encuesta, error: findError } = await admin
      .from('encuestas_satisfaccion')
      .select('id, respondida')
      .eq('token', token)
      .single()

    if (findError || !encuesta) {
      return NextResponse.json({ error: 'Encuesta no encontrada' }, { status: 404 })
    }

    if (encuesta.respondida) {
      return NextResponse.json({ error: 'Esta encuesta ya fue respondida' }, { status: 400 })
    }

    const { error: updateError } = await admin
      .from('encuestas_satisfaccion')
      .update({
        puntuacion: score,
        comentarios: comentarios?.trim() || null,
        respondida: true,
        respondida_at: new Date().toISOString(),
      })
      .eq('id', encuesta.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
