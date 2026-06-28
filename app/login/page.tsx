'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: queryError } = await supabase
      .from('usuarios')
      .select('*, sucursales(nombre)')
      .eq('pin', pin)
      .eq('activo', true)
      .single()

    if (queryError || !data) {
      setError('PIN incorrecto')
      setLoading(false)
      return
    }

    const usuario = {
      id: data.id,
      nombre: data.nombre,
      rol: data.rol,
      sucursal_id: data.sucursal_id,
      sucursal_nombre: (data as any).sucursales?.nombre || null,
    }

    localStorage.setItem('usuario', JSON.stringify(usuario))

    router.push(data.rol === 'admin' ? '/admin' : '/caja')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm rounded border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-bold text-gray-900">Iniciar Sesion</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
              PIN de acceso
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ingrese su PIN"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
