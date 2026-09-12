'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { EllipsisVerticalIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline'

type Props = {
  pacienteId: string
  activo: boolean
  onDarDeBaja: () => void
}

export default function PacienteAccionesMenu({ pacienteId, activo, onDarDeBaja }: Props) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const menuHeight = 220
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUp(spaceBelow < menuHeight)
    }
    setOpen(prev => !prev)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !menuRef.current?.contains(target)
        && !btnRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        className="btn-icon btn-ghost text-neutral-400"
        aria-label="Acciones del paciente"
        aria-expanded={open}
        onClick={toggle}
      >
        <EllipsisVerticalIcon className="w-4 h-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`absolute right-0 z-50 w-44 bg-white rounded-xl shadow-modal border border-neutral-200 py-1 ${
            openUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <Link
            href={`/pacientes/${pacienteId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={() => setOpen(false)}
          >
            Ver expediente
          </Link>
          <Link
            href={`/pacientes/${pacienteId}/editar`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={() => setOpen(false)}
          >
            Editar
          </Link>
          <Link
            href={`/agenda?paciente=${pacienteId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={() => setOpen(false)}
          >
            Agendar cita
          </Link>
          {activo && (
            <>
              <div className="divider my-1" />
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 w-full"
                onClick={() => {
                  setOpen(false)
                  onDarDeBaja()
                }}
              >
                <ArchiveBoxIcon className="w-4 h-4" />
                Dar de baja
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
