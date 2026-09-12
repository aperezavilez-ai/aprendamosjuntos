import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { RolUsuario } from '@/types'

const STAFF_ROLES: RolUsuario[] = ['admin_general', 'director_clinico', 'recepcion', 'terapeuta']

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

export type StaffSession = {
  user: { id: string; email?: string }
  staff: {
    id: string
    clinica_id: string
    sucursal_id: string | null
    rol: RolUsuario
    activo: boolean
  }
  admin: SupabaseClient
}

export async function requireStaff(): Promise<
  { ok: true; session: StaffSession } | { ok: false; error: string; status: number }
> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: 'Servicio no configurado', status: 500 }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autorizado', status: 401 }

  const admin = adminClient()
  const { data: staff, error } = await admin
    .from('usuarios')
    .select('id, clinica_id, sucursal_id, rol, activo')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !staff || !staff.activo || !STAFF_ROLES.includes(staff.rol as RolUsuario)) {
    return { ok: false, error: 'No autorizado', status: 403 }
  }

  return {
    ok: true,
    session: {
      user: { id: user.id, email: user.email },
      staff: staff as StaffSession['staff'],
      admin,
    },
  }
}

export async function resolveSucursalId(
  admin: SupabaseClient,
  clinicaId: string,
  sucursalId: string | null
): Promise<string | null> {
  if (sucursalId) return sucursalId
  const { data } = await admin
    .from('sucursales')
    .select('id')
    .eq('clinica_id', clinicaId)
    .eq('activa', true)
    .order('nombre')
    .limit(1)
  return data?.[0]?.id ?? null
}
