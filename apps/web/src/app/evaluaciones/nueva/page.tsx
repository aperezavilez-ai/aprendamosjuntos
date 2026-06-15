'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevaEvaluacionRedirect() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paciente = params.get('paciente')
    const url = paciente
      ? `/evaluaciones?nueva=1&paciente=${paciente}`
      : '/evaluaciones?nueva=1'
    router.replace(url)
  }, [router])

  return null
}
