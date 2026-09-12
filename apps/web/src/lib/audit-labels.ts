export interface AuditRow {
  id: string
  tabla: string
  accion: string
  registro_id: string | null
  datos_antes: Record<string, unknown> | null
  datos_despues: Record<string, unknown> | null
  created_at: string
  usuario?: { nombre: string; apellidos?: string; rol?: string } | null
}

const TABLA_LABEL: Record<string, string> = {
  pacientes: 'Paciente',
  citas: 'Cita',
  sesiones: 'Sesión',
  evaluaciones: 'Evaluación',
  planes_terapeuticos: 'Plan terapéutico',
  usuarios: 'Usuario',
  familiares: 'Familiar',
  facturacion: 'Factura',
}

const ACCION_LABEL: Record<string, string> = {
  INSERT: 'Creó',
  UPDATE: 'Actualizó',
  DELETE: 'Eliminó',
}

function pickLabel(data: Record<string, unknown> | null | undefined): string {
  if (!data) return ''
  if (data.nombre && data.apellidos) return `${data.nombre} ${data.apellidos}`.trim()
  if (data.nombre) return String(data.nombre)
  if (data.email) return String(data.email)
  if (data.periodo) return String(data.periodo)
  if (data.estado) return String(data.estado)
  if (data.id) return String(data.id).slice(0, 8)
  return ''
}

export function formatAuditEntry(row: AuditRow): string {
  const accion = ACCION_LABEL[row.accion] || row.accion
  const entidad = TABLA_LABEL[row.tabla] || row.tabla
  const detalle = pickLabel(row.datos_despues) || pickLabel(row.datos_antes)
  return detalle ? `${accion} ${entidad.toLowerCase()}: ${detalle}` : `${accion} ${entidad.toLowerCase()}`
}

export function getAuditIcon(tabla: string): string {
  const icons: Record<string, string> = {
    pacientes: '👤',
    citas: '📅',
    sesiones: '📋',
    evaluaciones: '📊',
    planes_terapeuticos: '📝',
    usuarios: '🔑',
    familiares: '👨‍👩‍👧',
    facturacion: '💰',
  }
  return icons[tabla] || '📌'
}
