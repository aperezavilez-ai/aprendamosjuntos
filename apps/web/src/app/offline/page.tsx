'use client'

import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4" aria-hidden>
          📱
        </div>
        <h1 className="text-xl font-bold text-neutral-900 mb-2">Sin conexión a internet</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Puedes seguir viendo las páginas que ya visitaste. Cuando vuelva la conexión, los datos se
          actualizarán.
        </p>
        <button
          type="button"
          onClick={() => typeof window !== 'undefined' && window.location.reload()}
          className="btn-primary w-full mb-3"
        >
          Reintentar
        </button>
        <Link href="/dashboard" className="text-sm text-primary-600 font-medium hover:underline">
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
