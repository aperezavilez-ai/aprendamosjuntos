import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/auth/login', '/auth/registro', '/auth/callback', '/auth/nueva-contrasena', '/offline']

async function getUserRol(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data } = await supabase.from('usuarios').select('rol').eq('id', userId).maybeSingle()
  return data?.rol as string | undefined
}

const STAFF_ADMIN_ROUTES = ['/configuracion']
const STAFF_FACTURACION_ROUTES = ['/facturacion']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/encuesta/') ||
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/api/')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user) {
    const rol = await getUserRol(supabase, user.id)
    const esPadre = rol === 'padre'

    if (pathname.startsWith('/auth/login')) {
      const url = request.nextUrl.clone()
      url.pathname = esPadre ? '/portal/citas' : '/dashboard'
      return NextResponse.redirect(url)
    }

    if (esPadre && !pathname.startsWith('/portal') && !pathname.startsWith('/auth')) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal/citas'
      return NextResponse.redirect(url)
    }

    if (!esPadre && pathname.startsWith('/portal')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if (!esPadre && rol) {
      const esAdmin = ['admin_general', 'director_clinico'].includes(rol)
      const puedeFacturar = esAdmin || rol === 'recepcion'

      if (STAFF_ADMIN_ROUTES.some(r => pathname.startsWith(r)) && !esAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
      if (STAFF_FACTURACION_ROUTES.some(r => pathname.startsWith(r)) && !puedeFacturar) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons|brand|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
