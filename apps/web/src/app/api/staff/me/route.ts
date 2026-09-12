import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'aprendamosjuntos' },
    }
  )
}

/** Perfil del usuario autenticado para el layout (evita CORS del proxy). */
export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = adminClient()
    let { data: perfil } = await admin
      .from('usuarios')
      .select('*, clinica:clinicas(nombre)')
      .eq('id', user.id)
      .maybeSingle()

    if (!perfil && user.email) {
      const { data: byEmail } = await admin
        .from('usuarios')
        .select('*, clinica:clinicas(nombre)')
        .ilike('email', user.email)
        .maybeSingle()
      perfil = byEmail
    }

    if (!perfil) {
      // Fallback mínimo desde metadata Auth
      const meta = user.user_metadata || {}
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          nombre: meta.nombre || user.email?.split('@')[0] || 'Usuario',
          apellidos: meta.apellidos || '',
          rol: meta.rol || 'terapeuta',
          activo: true,
          foto_url: null,
        },
        notifCount: 0,
      })
    }

    const { count } = await admin
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', user.id)
      .eq('leida', false)

    return NextResponse.json({
      user: perfil,
      notifCount: count || 0,
    })
  } catch (err) {
    console.error('[api/staff/me]', err)
    return NextResponse.json({ error: 'Error al cargar perfil' }, { status: 500 })
  }
}
