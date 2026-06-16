'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Logo from '@/components/brand/Logo'

interface EncuestaInfo {
  periodo: string
  respondida: boolean
  puntuacion: number | null
  clinica: { nombre: string } | null
  paciente: { nombre: string } | null
}

export default function EncuestaPublicaPage() {
  const params = useParams()
  const token = params.token as string
  const [encuesta, setEncuesta] = useState<EncuestaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [puntuacion, setPuntuacion] = useState(8)
  const [comentarios, setComentarios] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)

  useEffect(() => {
    fetch(`/api/encuestas/responder?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.encuesta) {
          setEncuesta(data.encuesta)
          if (data.encuesta.respondida) setEnviada(true)
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = await fetch('/api/encuestas/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, puntuacion, comentarios }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar')
      toast.success('¡Gracias por tu opinión!')
      setEnviada(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="skeleton h-48 w-full max-w-md rounded-2xl" />
      </div>
    )
  }

  if (!encuesta) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-sm">
          <p className="font-semibold text-neutral-900">Encuesta no encontrada</p>
          <p className="text-sm text-neutral-500 mt-2">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Logo iconSize="lg" href={null} className="justify-center mx-auto" />
        </div>

        <div className="card p-6 shadow-modal">
          {enviada ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-3">🙏</p>
              <h1 className="text-lg font-bold text-neutral-900">¡Gracias!</h1>
              <p className="text-sm text-neutral-500 mt-2">Tu respuesta nos ayuda a mejorar el servicio.</p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-neutral-900 mb-1">Encuesta de satisfacción</h1>
              <p className="text-sm text-neutral-500 mb-6">
                {encuesta.clinica?.nombre}
                {encuesta.paciente?.nombre ? ` · ${encuesta.paciente.nombre}` : ''}
                {encuesta.periodo ? ` · ${encuesta.periodo}` : ''}
              </p>
              <form onSubmit={enviar} className="space-y-5">
                <div>
                  <label className="label">¿Qué tan satisfecho estás con el servicio? (1–10)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={puntuacion}
                      onChange={(e) => setPuntuacion(Number(e.target.value))}
                      className="flex-1 accent-primary-600"
                    />
                    <span className="text-2xl font-bold text-primary-600 w-10 text-center">{puntuacion}</span>
                  </div>
                </div>
                <div>
                  <label className="label">Comentarios (opcional)</label>
                  <textarea
                    className="input resize-none"
                    rows={3}
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    placeholder="Cuéntanos tu experiencia..."
                  />
                </div>
                <button type="submit" disabled={enviando} className="btn-primary w-full">
                  {enviando ? 'Enviando...' : 'Enviar respuesta'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          <Link href="/auth/login" className="hover:underline">
            Ir al portal
          </Link>
        </p>
      </div>
    </div>
  )
}
