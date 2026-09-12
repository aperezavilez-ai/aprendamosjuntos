import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/staff-auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { staff, admin } = auth.session
  const pacienteId = params.id

  const { data: paciente, error: pacError } = await admin
    .from('pacientes')
    .select(`
      *,
      terapeuta_asignado:usuarios(id, nombre, apellidos, foto_url, email),
      sucursal:sucursales(nombre)
    `)
    .eq('id', pacienteId)
    .eq('clinica_id', staff.clinica_id)
    .maybeSingle()

  if (pacError) return NextResponse.json({ error: pacError.message }, { status: 400 })
  if (!paciente) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  if (staff.rol === 'terapeuta' && paciente.terapeuta_asignado_id !== staff.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const [
    { data: familiares },
    { data: citas },
    { data: evaluaciones },
    { data: planes },
    { data: sesiones },
    { data: archivos },
  ] = await Promise.all([
    admin.from('familiares').select('*').eq('paciente_id', pacienteId).order('es_contacto_principal', { ascending: false }),
    admin.from('citas').select('*, terapeuta:usuarios(nombre, apellidos)').eq('paciente_id', pacienteId).order('fecha_inicio', { ascending: false }).limit(10),
    admin.from('evaluaciones').select('*, terapeuta:usuarios(nombre)').eq('paciente_id', pacienteId).order('fecha', { ascending: false }),
    admin.from('planes_terapeuticos').select('*, objetivos(id, estado, porcentaje)').eq('paciente_id', pacienteId).order('fecha_inicio', { ascending: false }),
    admin.from('sesiones').select('*, terapeuta:usuarios(nombre, apellidos)').eq('paciente_id', pacienteId).order('fecha', { ascending: false }).limit(20),
    admin.from('archivos_paciente').select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    paciente,
    familiares: familiares || [],
    citas: citas || [],
    evaluaciones: evaluaciones || [],
    planes: planes || [],
    sesiones: sesiones || [],
    archivos: archivos || [],
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { staff, admin } = auth.session
  const pacienteId = params.id
  const body = await request.json()

  const { data: existente } = await admin
    .from('pacientes')
    .select('id, terapeuta_asignado_id')
    .eq('id', pacienteId)
    .eq('clinica_id', staff.clinica_id)
    .maybeSingle()

  if (!existente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  if (staff.rol === 'terapeuta' && existente.terapeuta_asignado_id !== staff.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.activo === 'boolean') updates.activo = body.activo

  const { data, error } = await admin
    .from('pacientes')
    .update(updates)
    .eq('id', pacienteId)
    .eq('clinica_id', staff.clinica_id)
    .select('id, activo')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, paciente: data })
}
