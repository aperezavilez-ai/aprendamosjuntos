import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { authErrorMessage, normalizeEmail } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'alfonsoavilery@icloud.com'

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

/**
 * Login same-origin para evitar CORS del proxy GafCore en el navegador.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Servicio de acceso no configurado' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const email = normalizeEmail(String(body.email || ''))
    const password = String(body.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Ingresa tu email y contraseña' }, { status: 400 })
    }

    const cookieJar: CookieToSet[] = []

    const supabase = createServerClient(supabaseUrl, anonKey, {
      db: { schema: 'aprendamosjuntos' },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookieJar.push(...cookiesToSet)
        },
      },
    })

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: authErrorMessage(error.message) }, { status: 401 })
    }

    if (!data.session || !data.user) {
      return NextResponse.json({ error: 'No se pudo iniciar sesión' }, { status: 401 })
    }

    let rol: string | null = null
    let activo = true

    if (email === ADMIN_EMAIL || data.user.email?.trim().toLowerCase() === ADMIN_EMAIL) {
      rol = 'admin_general'
    } else {
      const { data: byId } = await supabase
        .from('usuarios')
        .select('id, activo, rol')
        .eq('id', data.user.id)
        .maybeSingle()

      let profile = byId
      if (!profile) {
        const { data: byEmail } = await supabase
          .from('usuarios')
          .select('id, activo, rol')
          .ilike('email', email)
          .maybeSingle()
        profile = byEmail
      }

      if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          db: { schema: 'aprendamosjuntos' },
        })
        const { data: adminProfile } = await admin
          .from('usuarios')
          .select('id, activo, rol')
          .eq('id', data.user.id)
          .maybeSingle()
        profile = adminProfile
      }

      if (!profile) {
        await supabase.auth.signOut()
        return NextResponse.json(
          { error: 'Tu cuenta no está configurada. Contacta al administrador.' },
          { status: 403 }
        )
      }

      if (!profile.activo) {
        await supabase.auth.signOut()
        return NextResponse.json({ error: 'Tu cuenta está desactivada.' }, { status: 403 })
      }

      rol = profile.rol
      activo = profile.activo
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        rol,
        activo,
      },
    })

    for (const { name, value, options } of cookieJar) {
      response.cookies.set(name, value, options)
    }

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
    console.error('[api/auth/login]', message)
    return NextResponse.json(
      { error: 'No se pudo conectar con el servicio de acceso. Intenta de nuevo en unos momentos.' },
      { status: 503 }
    )
  }
}
