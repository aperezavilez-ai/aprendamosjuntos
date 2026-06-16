'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { StarIcon } from '@heroicons/react/24/solid'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface EncuestaPendiente {
  id: string
  periodo: string
  respondida: boolean
  puntuacion: number | null
  comentarios: string | null
  paciente: { nombre: string; apellidos: string } | null
}

export default function PortalEncuestaPage() {
  const [encuestas, setEncuestas] = useState<EncuestaPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [puntuacion, setPuntuacion] = useState(8)
  const [comentarios, setComentarios] = useState('')
  const supabase = createClient()

  const fetchEncuestas = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: familiares } = await supabase
      .from('familiares')
      .select('id')
      .eq('auth_user_id', session.user.id)

    const familiarIds = (familiares || []).map((f) => f.id)
    if (!familiarIds.length) {
      setEncuestas([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('encuestas_satisfaccion')
      .select('id, periodo, respondida, puntuacion, comentarios, paciente:pacientes(nombre, apellidos)')
      .in('familiar_id', familiarIds)
      .order('created_at', { ascending: false })

    setEncuestas((data || []) as unknown as EncuestaPendiente[])
    setLoading(false)
  }

  useEffect(() => {
    fetchEncuestas()
  }, [])

  const enviarRespuesta = async (id: string) => {
    setRespondiendo(id)
    try {
      const { error } = await supabase
        .from('encuestas_satisfaccion')
        .update({
          puntuacion,
          comentarios: comentarios.trim() || null,
          respondida: true,
          respondida_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      toast.success('¡Gracias por tu opinión!')
      setComentarios('')
      setPuntuacion(8)
      fetchEncuestas()
    } catch {
      toast.error('Error al enviar la encuesta')
    } finally {
      setRespondiendo(null)
    }
  }

  const pendientes = encuestas.filter((e) => !e.respondida)
  const respondidas = encuestas.filter((e) => e.respondida)

  if (loading) {
    return <div className="skeleton h-40 rounded-2xl" />
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-neutral-900">Encuesta de satisfacción</h1>
        <p className="text-sm text-neutral-500">Tu opinión nos ayuda a mejorar</p>
      </div>

      {pendientes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-700">Pendientes</h2>
          {pendientes.map((enc) => (
            <div key={enc.id} className="card p-4 space-y-4">
              <div>
                <p className="font-medium text-neutral-900">
                  {enc.paciente ? `${enc.paciente.nombre} ${enc.paciente.apellidos || ''}` : 'Paciente'}
                </p>
                <p className="text-xs text-neutral-500">{enc.periodo}</p>
              </div>
              <div>
                <label className="label">Calificación (1–10)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={puntuacion}
                    onChange={(e) => setPuntuacion(Number(e.target.value))}
                    className="flex-1 accent-primary-600"
                  />
                  <span className="text-xl font-bold text-primary-600">{puntuacion}</span>
                </div>
              </div>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Comentarios opcionales..."
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
              />
              <button
                type="button"
                onClick={() => enviarRespuesta(enc.id)}
                disabled={respondiendo === enc.id}
                className="btn-primary w-full btn-sm"
              >
                {respondiendo === enc.id ? 'Enviando...' : 'Enviar respuesta'}
              </button>
            </div>
          ))}
        </div>
      )}

      {respondidas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-700">Respondidas</h2>
          {respondidas.map((enc) => (
            <div key={enc.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{enc.periodo}</p>
                  <p className="text-xs text-neutral-500">
                    {enc.paciente?.nombre} {enc.paciente?.apellidos}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <StarIcon className="w-4 h-4" />
                  <span className="font-bold text-sm">{enc.puntuacion}/10</span>
                </div>
              </div>
              {enc.comentarios && (
                <p className="text-xs text-neutral-600 mt-2 italic">&ldquo;{enc.comentarios}&rdquo;</p>
              )}
            </div>
          ))}
        </div>
      )}

      {encuestas.length === 0 && (
        <div className="card empty-state py-12">
          <p className="empty-state-title">Sin encuestas</p>
          <p className="empty-state-desc">Cuando la clínica te envíe una encuesta, aparecerá aquí.</p>
        </div>
      )}
    </div>
  )
}
