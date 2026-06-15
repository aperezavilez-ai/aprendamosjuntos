'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

const TIPO_LABEL: Record<string, string> = {
  motricidad_fina: 'Motricidad Fina',
  motricidad_gruesa: 'Motricidad Gruesa',
  integracion_sensorial: 'Integración Sensorial',
  atencion: 'Atención',
  conducta: 'Conducta',
  cognitivo: 'Cognitivo',
}

export default function EvaluacionDetallePage() {
  const params = useParams()
  const id = params?.id as string
  const supabase = createClient()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('evaluaciones')
      .select('*, paciente:pacientes(nombre, apellidos), terapeuta:usuarios(nombre, apellidos)')
      .eq('id', id)
      .single()
      .then(({ data }) => setData(data))
  }, [id, supabase])

  if (!data) return <div className="skeleton h-64 rounded-2xl" />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/evaluaciones" className="btn-icon">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">{TIPO_LABEL[data.tipo] || data.tipo}</h1>
          <p className="page-subtitle">
            {data.paciente?.nombre} {data.paciente?.apellidos} ·{' '}
            {format(new Date(data.fecha), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex gap-6">
          {data.porcentaje != null && (
            <div>
              <p className="text-2xl font-bold text-primary-600">{data.porcentaje.toFixed(0)}%</p>
              <p className="text-xs text-neutral-500">Resultado</p>
            </div>
          )}
          {data.nivel && (
            <div>
              <p className="text-lg font-semibold capitalize">{data.nivel.replace('_', ' ')}</p>
              <p className="text-xs text-neutral-500">Nivel</p>
            </div>
          )}
        </div>
        {data.observaciones && (
          <div>
            <h2 className="text-sm font-semibold mb-1">Observaciones</h2>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{data.observaciones}</p>
          </div>
        )}
        {data.recomendaciones && (
          <div>
            <h2 className="text-sm font-semibold mb-1">Recomendaciones</h2>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{data.recomendaciones}</p>
          </div>
        )}
        {data.terapeuta && (
          <p className="text-xs text-neutral-400">
            Evaluado por {data.terapeuta.nombre} {data.terapeuta.apellidos}
          </p>
        )}
      </div>
    </div>
  )
}
