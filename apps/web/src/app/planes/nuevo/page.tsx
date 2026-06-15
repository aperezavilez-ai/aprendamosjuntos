'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevoPlanRedirect() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paciente = params.get('paciente')
    const url = paciente
      ? `/planes?nuevo=1&paciente=${paciente}`
      : '/planes?nuevo=1'
    router.replace(url)
  }, [router])

  return null
}
