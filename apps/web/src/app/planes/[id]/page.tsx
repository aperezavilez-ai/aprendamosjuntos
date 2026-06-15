'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

export default function PlanDetallePage() {
  const params = useParams()
  const id = params?.id as string
  const supabase = createClient()
  const [plan, setPlan] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('planes_terapeuticos')
      .select(`
        *,
        paciente:pacientes(nombre, apellidos),
        terapeuta:usuarios(nombre, apellidos),
        objetivos(id, descripcion, area, estado, porcentaje, criterio_logro, fecha_meta)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => setPlan(data))
  }, [id, supabase])

  if (!plan) return <div className="skeleton h-64 rounded-2xl" />

  const objetivos = plan.objetivos || []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/planes" className="btn-icon">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">{plan.titulo}</h1>
          <p className="page-subtitle">
            {plan.paciente?.nombre} {plan.paciente?.apellidos}
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="badge badge-success capitalize">{plan.estado}</span>
          <p className="text-xl font-bold text-primary-600">{plan.porcentaje_avance?.toFixed(0) || 0}%</p>
        </div>
        <p className="text-sm text-neutral-700">{plan.objetivo_general}</p>
        {plan.justificacion && (
          <p className="text-sm text-neutral-500">{plan.justificacion}</p>
        )}
        <p className="text-xs text-neutral-400">
          {format(new Date(plan.fecha_inicio), "d MMM yyyy", { locale: es })}
          {plan.fecha_fin_estimada && ` → ${format(new Date(plan.fecha_fin_estimada), "d MMM yyyy", { locale: es })}`}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold mb-4">Objetivos ({objetivos.length})</h2>
        <div className="space-y-3">
          {objetivos.map((o: any) => (
            <div key={o.id} className="p-3 bg-neutral-50 rounded-xl">
              <p className="text-sm font-medium">{o.descripcion}</p>
              <div className="flex gap-2 mt-1 text-xs text-neutral-500">
                {o.area && <span>{o.area}</span>}
                <span className="capitalize">{o.estado?.replace('_', ' ')}</span>
                {o.porcentaje != null && <span>{o.porcentaje}%</span>}
              </div>
            </div>
          ))}
        </div>
        <Link
          href={`/sesiones/nueva?plan=${plan.id}&paciente=${plan.paciente_id}`}
          className="btn-primary btn-sm mt-4 inline-flex"
        >
          Registrar sesión
        </Link>
      </div>
    </div>
  )
}
