'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevaSesionRedirect() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('nueva', '1')
    router.replace(`/sesiones?${params.toString()}`)
  }, [router])

  return null
}
