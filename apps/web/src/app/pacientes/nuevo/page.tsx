'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon, UserPlusIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const DIAGNOSTICOS_COMUNES = [
  'Trastorno del Espectro Autista (TEA)',
  'Trastorno por Déficit de Atención e Hiperactividad (TDAH)',
  'Parálisis Cerebral',
  'Síndrome de Down',
  'Retraso en el Desarrollo Psicomotor',
  'Trastorno de Procesamiento Sensorial',
  'Dislexia',
  'Discapacidad Intelectual',
  'Síndrome de Rett',
  'Hipotomía muscular',
  'Otro',
]

const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const LATERALIDADES = ['diestro', 'zurdo', 'ambidiestro', 'sin_definir']

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  )
}

export default function NuevoPacientePage() {
  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState({
    // Datos básicos
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    sexo: '',
    curp: '',
    nss: '',
    grupo_sanguineo: '',
    lateralidad: '',
    escuela: '',
    grado_escolar: '',

    // Datos clínicos
    diagnostico_principal: '',
    diagnostico_secundario: '',
    motivo_consulta: '',
    antecedentes_medicos: '',
    medicamentos: '',
    alergias: '',
    antecedentes_familiares: '',
    embarazo: '',
    parto: '',
    desarrollo_motor: '',

    // Contacto de emergencia
    familiar_nombre: '',
    familiar_parentesco: '',
    familiar_telefono: '',
    familiar_email: '',
    familiar_tiene_acceso_portal: true,
  })
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  const f = (campo: keyof typeof form, valor: string | boolean) =>
    setForm(prev => ({ ...prev, [campo]: valor }))

  const handleGuardar = async () => {
    if (!form.nombre || !form.apellidos || !form.fecha_nacimiento) {
      toast.error('Nombre, apellidos y fecha de nacimiento son obligatorios')
      return
    }
    setGuardando(true)
    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al registrar el paciente')
        return
      }

      if (data.warning) toast.error(data.warning)
      if (data.portalPassword) {
        toast.success(`Portal creado. Contraseña temporal: ${data.portalPassword}`, { duration: 12000 })
      }

      toast.success('Paciente registrado exitosamente')
      router.push(`/pacientes/${data.paciente?.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar el paciente'
      toast.error(message)
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/pacientes" className="btn-ghost btn-sm text-neutral-500">
          <ArrowLeftIcon className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Nuevo Paciente</h1>
          <p className="page-subtitle">Paso {paso} de 3</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill bg-primary-500" style={{ width: `${(paso / 3) * 100}%` }} />
      </div>

      <div className="card p-6 space-y-5">
        {/* PASO 1: Datos personales */}
        {paso === 1 && (
          <>
            <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
              Datos personales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="Nombre(s)" value={form.nombre} onChange={e => f('nombre', e.target.value)} required placeholder="Juan Diego" />
              <FormInput label="Apellidos" value={form.apellidos} onChange={e => f('apellidos', e.target.value)} required placeholder="García Martínez" />
              <FormInput label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={e => f('fecha_nacimiento', e.target.value)} type="date" required />
              <div>
                <label className="label">Sexo</label>
                <select className="input" value={form.sexo} onChange={e => f('sexo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <FormInput label="CURP" value={form.curp} onChange={e => f('curp', e.target.value)} placeholder="GAEM010101HMCRNS00" />
              <FormInput label="NSS (IMSS/ISSSTE)" value={form.nss} onChange={e => f('nss', e.target.value)} placeholder="12345678900" />
              <div>
                <label className="label">Grupo sanguíneo</label>
                <select className="input" value={form.grupo_sanguineo} onChange={e => f('grupo_sanguineo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {GRUPOS_SANGUINEOS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Lateralidad</label>
                <select className="input" value={form.lateralidad} onChange={e => f('lateralidad', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="diestro">Diestro</option>
                  <option value="zurdo">Zurdo</option>
                  <option value="ambidiestro">Ambidiestro</option>
                  <option value="sin_definir">Sin definir</option>
                </select>
              </div>
              <FormInput label="Escuela" value={form.escuela} onChange={e => f('escuela', e.target.value)} placeholder="Primaria Benito Juárez" />
              <FormInput label="Grado escolar" value={form.grado_escolar} onChange={e => f('grado_escolar', e.target.value)} placeholder="3° de Primaria" />
            </div>
          </>
        )}

        {/* PASO 2: Datos clínicos */}
        {paso === 2 && (
          <>
            <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
              Historia clínica
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Diagnóstico principal</label>
                <select className="input" value={form.diagnostico_principal} onChange={e => f('diagnostico_principal', e.target.value)}>
                  <option value="">Seleccionar diagnóstico...</option>
                  {DIAGNOSTICOS_COMUNES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <FormInput label="Diagnóstico secundario" value={form.diagnostico_secundario} onChange={e => f('diagnostico_secundario', e.target.value)} placeholder="Diagnóstico secundario si aplica" />
              <div>
                <label className="label">Motivo de consulta</label>
                <textarea className="input resize-none" rows={3}
                  placeholder="Describa el motivo principal por el que se busca la terapia ocupacional..."
                  value={form.motivo_consulta} onChange={e => f('motivo_consulta', e.target.value)} />
              </div>
              <div>
                <label className="label">Antecedentes médicos relevantes</label>
                <textarea className="input resize-none" rows={3}
                  placeholder="Cirugías, hospitalizaciones, enfermedades previas relevantes..."
                  value={form.antecedentes_medicos} onChange={e => f('antecedentes_medicos', e.target.value)} />
              </div>
              <div>
                <label className="label">Medicamentos actuales</label>
                <textarea className="input resize-none" rows={2}
                  placeholder="Nombre del medicamento, dosis y frecuencia..."
                  value={form.medicamentos} onChange={e => f('medicamentos', e.target.value)} />
              </div>
              <div>
                <label className="label">Alergias conocidas</label>
                <input className="input" placeholder="Alergias a medicamentos, alimentos, materiales..." value={form.alergias} onChange={e => f('alergias', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Datos del embarazo</label>
                  <textarea className="input resize-none" rows={3}
                    placeholder="Semanas de gestación, complicaciones, control prenatal..."
                    value={form.embarazo} onChange={e => f('embarazo', e.target.value)} />
                </div>
                <div>
                  <label className="label">Tipo de parto</label>
                  <textarea className="input resize-none" rows={3}
                    placeholder="Natural, cesárea, complicaciones, uso de fórceps..."
                    value={form.parto} onChange={e => f('parto', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Desarrollo psicomotor</label>
                <textarea className="input resize-none" rows={3}
                  placeholder="Hitos del desarrollo: gateo, primeras palabras, caminar, control de esfínteres..."
                  value={form.desarrollo_motor} onChange={e => f('desarrollo_motor', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* PASO 3: Familiar/Contacto */}
        {paso === 3 && (
          <>
            <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
              Tutor o familiar responsable
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="Nombre completo" value={form.familiar_nombre} onChange={e => f('familiar_nombre', e.target.value)} placeholder="María García Pérez" required />
              <div>
                <label className="label">Parentesco</label>
                <select className="input" value={form.familiar_parentesco} onChange={e => f('familiar_parentesco', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="madre">Madre</option>
                  <option value="padre">Padre</option>
                  <option value="abuelo">Abuelo/a</option>
                  <option value="tutor">Tutor legal</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <FormInput label="Teléfono" value={form.familiar_telefono} onChange={e => f('familiar_telefono', e.target.value)} type="tel" placeholder="+52 33 1234 5678" required />
              <FormInput label="Email" value={form.familiar_email} onChange={e => f('familiar_email', e.target.value)} type="email" placeholder="mama@email.com" />
            </div>

            <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl mt-2">
              <input
                type="checkbox"
                id="acceso_portal"
                checked={form.familiar_tiene_acceso_portal}
                onChange={e => f('familiar_tiene_acceso_portal', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <label htmlFor="acceso_portal" className="text-sm text-neutral-700 cursor-pointer">
                <span className="font-medium">Dar acceso al portal de padres</span>
                <br />
                <span className="text-xs text-neutral-500">
                  El familiar podrá ver citas, reportes y comunicarse con el terapeuta
                </span>
              </label>
            </div>

            {/* Resumen */}
            <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Resumen del paciente</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="text-neutral-500">Nombre:</div>
                <div className="font-medium text-neutral-900">{form.nombre} {form.apellidos}</div>
                <div className="text-neutral-500">Nacimiento:</div>
                <div className="font-medium">{form.fecha_nacimiento || '—'}</div>
                <div className="text-neutral-500">Diagnóstico:</div>
                <div className="font-medium">{form.diagnostico_principal || '—'}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        {paso > 1 && (
          <button onClick={() => setPaso(p => p - 1)} className="btn-secondary">
            <ArrowLeftIcon className="w-4 h-4" /> Anterior
          </button>
        )}
        <Link href="/pacientes" className="btn-secondary">Cancelar</Link>
        <div className="flex-1" />
        {paso < 3 ? (
          <button
            onClick={() => setPaso(p => p + 1)}
            disabled={paso === 1 && (!form.nombre || !form.apellidos || !form.fecha_nacimiento)}
            className="btn-primary disabled:opacity-50"
          >
            Siguiente →
          </button>
        ) : (
          <button onClick={handleGuardar} disabled={guardando} className="btn-primary">
            {guardando ? 'Guardando...' : 'Registrar paciente'}
            <UserPlusIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
