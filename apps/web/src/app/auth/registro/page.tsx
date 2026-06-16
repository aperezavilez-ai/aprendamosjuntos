'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Logo from '@/components/brand/Logo'
import { createClient } from '@/lib/supabase/client'
import { normalizeEmail } from '@/lib/auth'

export default function RegistroPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre_clinica: '',
    nombre: '',
    apellidos: '',
    email: '',
    password: '',
    confirm: '',
    telefono: '',
    ciudad: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailNorm = normalizeEmail(form.email)
    if (!form.nombre_clinica.trim() || !form.nombre.trim() || !emailNorm || !form.password) {
      toast.error('Completa los campos obligatorios')
      return
    }
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (form.password !== form.confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email: emailNorm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al registrar')

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password: form.password,
      })
      if (error) {
        toast.success('Clínica creada. Inicia sesión con tu correo.')
        router.push('/auth/login')
        return
      }

      toast.success('¡Bienvenido! Tu clínica está lista')
      window.location.assign('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo iconSize="xl" href={null} className="justify-center mx-auto mb-2" />
          <h1 className="text-xl font-bold text-neutral-900 mt-2">Registrar mi clínica</h1>
          <p className="text-neutral-500 text-sm mt-1">Crea tu cuenta y empieza en minutos</p>
        </div>

        <div className="card p-6 shadow-modal">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre de la clínica *</label>
              <input
                className="input"
                value={form.nombre_clinica}
                onChange={(e) => setForm((f) => ({ ...f, nombre_clinica: e.target.value }))}
                placeholder="Ej: Centro Aprendamos Juntos"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tu nombre *</label>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Apellidos</label>
                <input
                  className="input"
                  value={form.apellidos}
                  onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Correo electrónico *</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                className="input"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input
                className="input"
                value={form.ciudad}
                onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirmar contraseña *</label>
              <input
                type="password"
                className="input"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creando clínica...' : 'Crear mi clínica'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-neutral-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="text-primary-600 font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
