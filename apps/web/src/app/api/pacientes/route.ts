import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, resolveSucursalId } from '@/lib/staff-auth'

export async function GET(request: NextRequest) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { staff, admin } = auth.session
  const { searchParams } = request.nextUrl
  const busqueda = searchParams.get('q')?.trim() || ''
  const filtro = searchParams.get('filtro') || 'activos'
  const pagina = Math.max(1, Number(searchParams.get('pagina') || 1))
  const porPagina = Math.min(50, Math.max(1, Number(searchParams.get('porPagina') || 20)))

  let query = admin
    .from('pacientes')
    .select(`
      *,
      terapeuta_asignado:usuarios(nombre, apellidos, foto_url),
      sucursal:sucursales(nombre)
    `, { count: 'exact' })
    .eq('clinica_id', staff.clinica_id)
    .order('nombre')
    .range((pagina - 1) * porPagina, pagina * porPagina - 1)

  if (filtro === 'activos') query = query.eq('activo', true)
  if (filtro === 'inactivos') query = query.eq('activo', false)
  if (filtro === 'nuevos') {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    query = query.gte('created_at', inicioMes)
  }
  if (busqueda) query = query.ilike('nombre', `%${busqueda}%`)
  if (staff.rol === 'terapeuta') query = query.eq('terapeuta_asignado_id', staff.id)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data: data || [], count: count ?? 0 })
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { staff, admin, user } = auth.session

  try {
    const body = await request.json()
    const {
      nombre,
      apellidos,
      fecha_nacimiento,
      sexo,
      curp,
      escuela,
      grado_escolar,
      motivo_consulta,
      diagnostico_principal,
      diagnostico_secundario,
      antecedentes_medicos,
      antecedentes_familiares,
      medicamentos,
      alergias,
      embarazo,
      parto,
      desarrollo_motor,
      familiar_nombre,
      familiar_parentesco,
      familiar_telefono,
      familiar_email,
      familiar_tiene_acceso_portal,
    } = body

    if (!nombre?.trim() || !apellidos?.trim() || !fecha_nacimiento) {
      return NextResponse.json(
        { error: 'Nombre, apellidos y fecha de nacimiento son obligatorios' },
        { status: 400 }
      )
    }

    const sucursalId = await resolveSucursalId(admin, staff.clinica_id, staff.sucursal_id)
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'No hay sucursal activa. Crea una en Configuración → Sucursales.' },
        { status: 400 }
      )
    }

    const diagnosticos = []
    if (diagnostico_principal) {
      diagnosticos.push({ descripcion: diagnostico_principal, tipo: 'principal' })
    }
    if (diagnostico_secundario) {
      diagnosticos.push({ descripcion: diagnostico_secundario, tipo: 'secundario' })
    }

    const antecedentesPartes = [
      antecedentes_medicos && `Antecedentes médicos: ${antecedentes_medicos}`,
      antecedentes_familiares && `Antecedentes familiares: ${antecedentes_familiares}`,
    ].filter(Boolean)

    const historialPartes = [
      embarazo && `Embarazo: ${embarazo}`,
      parto && `Parto: ${parto}`,
      desarrollo_motor && `Desarrollo psicomotor: ${desarrollo_motor}`,
    ].filter(Boolean)

    const { data: paciente, error } = await admin.from('pacientes').insert({
      clinica_id: staff.clinica_id,
      sucursal_id: sucursalId,
      terapeuta_asignado_id: staff.rol === 'terapeuta' ? user.id : null,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      fecha_nacimiento,
      genero: sexo || null,
      curp: curp || null,
      escuela: escuela || null,
      grado_escolar: grado_escolar || null,
      motivo_consulta: motivo_consulta || null,
      diagnosticos,
      antecedentes: antecedentesPartes.length ? antecedentesPartes.join('\n\n') : null,
      historial_medico: historialPartes.length ? historialPartes.join('\n\n') : null,
      medicamentos: medicamentos?.trim()
        ? [{ descripcion: medicamentos.trim() }]
        : [],
      alergias: alergias?.trim()
        ? alergias.split(',').map((a: string) => a.trim()).filter(Boolean)
        : [],
      activo: true,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    let portalPassword: string | undefined

    if (familiar_nombre?.trim() && familiar_telefono?.trim() && paciente) {
      const partesFamiliar = familiar_nombre.trim().split(/\s+/)
      const { data: familiar, error: famError } = await admin.from('familiares').insert({
        paciente_id: paciente.id,
        tipo_relacion: familiar_parentesco || 'tutor',
        nombre: partesFamiliar[0] || familiar_nombre.trim(),
        apellidos: partesFamiliar.slice(1).join(' ') || null,
        telefono: familiar_telefono.trim(),
        email: familiar_email?.trim() || null,
        tiene_acceso_portal: Boolean(familiar_tiene_acceso_portal),
        es_contacto_principal: true,
      }).select().single()

      if (famError) {
        return NextResponse.json({
          ok: true,
          paciente,
          warning: `Paciente creado, pero falló el familiar: ${famError.message}`,
        })
      }

      if (familiar_tiene_acceso_portal && familiar_email?.trim() && familiar) {
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
        const res = await fetch(`${origin}/api/padres/crear-acceso`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            email: familiar_email.trim(),
            nombre: partesFamiliar[0] || familiar_nombre.trim(),
            apellidos: partesFamiliar.slice(1).join(' ') || '',
            familiar_id: familiar.id,
            paciente_id: paciente.id,
          }),
        })
        const data = await res.json()
        if (res.ok) portalPassword = data.password
      }
    }

    return NextResponse.json({ ok: true, paciente, portalPassword })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar el paciente'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
