'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function EditarPacientePage() {
  const params = useParams()
  const pacienteId = params?.id as string
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    genero: '',
    curp: '',
    escuela: '',
    grado_escolar: '',
    motivo_consulta: '',
    antecedentes: '',
    historial_medico: '',
    notas_internas: '',
    activo: true,
  })

  useEffect(() => {
    if (!pacienteId) return
    supabase
      .from('pacientes')
      .select('nombre, apellidos, fecha_nacimiento, genero, curp, escuela, grado_escolar, motivo_consulta, antecedentes, historial_medico, notas_internas, activo')
      .eq('id', pacienteId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error('No se pudo cargar el paciente')
          router.push('/pacientes')
          return
        }
        setForm({
          nombre: data.nombre || '',
          apellidos: data.apellidos || '',
          fecha_nacimiento: data.fecha_nacimiento || '',
          genero: data.genero || '',
          curp: data.curp || '',
          escuela: data.escuela || '',
          grado_escolar: data.grado_escolar || '',
          motivo_consulta: data.motivo_consulta || '',
          antecedentes: data.antecedentes || '',
          historial_medico: data.historial_medico || '',
          notas_internas: data.notas_internas || '',
          activo: data.activo ?? true,
        })
        setLoading(false)
      })
  }, [pacienteId, router, supabase])

  const f = (campo: keyof typeof form, valor: string | boolean) =>
    setForm(prev => ({ ...prev, [campo]: valor }))

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.apellidos || !form.fecha_nacimiento) {
      toast.error('Nombre, apellidos y fecha de nacimiento son obligatorios')
      return
    }
    setGuardando(true)
    try {
      const { error } = await supabase.from('pacientes').update({
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        fecha_nacimiento: form.fecha_nacimiento,
        genero: form.genero || null,
        curp: form.curp || null,
        escuela: form.escuela || null,
        grado_escolar: form.grado_escolar || null,
        motivo_consulta: form.motivo_consulta || null,
        antecedentes: form.antecedentes || null,
        historial_medico: form.historial_medico || null,
        notas_internas: form.notas_internas || null,
        activo: form.activo,
        updated_at: new Date().toISOString(),
      }).eq('id', pacienteId)

      if (error) throw error
      toast.success('Paciente actualizado')
      router.push(`/pacientes/${pacienteId}`)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return <div className="skeleton h-96 rounded-2xl" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/pacientes/${pacienteId}`} className="btn-icon">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">Editar paciente</h1>
          <p className="page-subtitle">{form.nombre} {form.apellidos}</p>
        </div>
      </div>

      <form onSubmit={handleGuardar} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.nombre} onChange={e => f('nombre', e.target.value)} required />
          </div>
          <div>
            <label className="label">Apellidos *</label>
            <input className="input" value={form.apellidos} onChange={e => f('apellidos', e.target.value)} required />
          </div>
          <div>
            <label className="label">Fecha de nacimiento *</label>
            <input type="date" className="input" value={form.fecha_nacimiento} onChange={e => f('fecha_nacimiento', e.target.value)} required />
          </div>
          <div>
            <label className="label">Género</label>
            <select className="input" value={form.genero} onChange={e => f('genero', e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="label">CURP</label>
            <input className="input" value={form.curp} onChange={e => f('curp', e.target.value)} />
          </div>
          <div>
            <label className="label">Escuela</label>
            <input className="input" value={form.escuela} onChange={e => f('escuela', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Motivo de consulta</label>
          <textarea className="input" rows={2} value={form.motivo_consulta} onChange={e => f('motivo_consulta', e.target.value)} />
        </div>
        <div>
          <label className="label">Antecedentes</label>
          <textarea className="input" rows={2} value={form.antecedentes} onChange={e => f('antecedentes', e.target.value)} />
        </div>
        <div>
          <label className="label">Historial médico</label>
          <textarea className="input" rows={2} value={form.historial_medico} onChange={e => f('historial_medico', e.target.value)} />
        </div>
        <div>
          <label className="label">Notas internas</label>
          <textarea className="input" rows={2} value={form.notas_internas} onChange={e => f('notas_internas', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)} />
          Paciente activo
        </label>
        <div className="flex gap-3 pt-2">
          <Link href={`/pacientes/${pacienteId}`} className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={guardando} className="btn-primary">
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
