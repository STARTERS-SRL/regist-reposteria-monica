'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

export default function SettingsView() {
  const [settings, setSettings] = useState({
    businessName: 'Reposterías ABC',
    email: 'admin@reposterias.com',
    phone: '+591 3 1234567',
    timezone: 'America/La_Paz',
    currency: 'BOB'
  })

  const [editMode, setEditMode] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setSaved(true)
    setEditMode(false)
    setTimeout(() => setSaved(false), 3000)
  }

  // Empleadas
  const [empleadas, setEmpleadas] = useState<any[]>([])
  const [sucursales, setSucursales] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [pinEmpleada, setPinEmpleada] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    fetchEmpleadas()
    fetchSucursales()
  }, [])

  const fetchEmpleadas = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, pin, rol, activo, sucursal_id, sucursales(nombre)')
      .eq('rol', 'empleado')
      .order('nombre')
    if (data) setEmpleadas(data)
  }

  const fetchSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('*').order('nombre')
    if (data) setSucursales(data)
  }

  const crearEmpleada = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje('')

    if (pinEmpleada.length !== 4) {
      setMensaje('El PIN debe tener 4 digitos')
      return
    }

    const { error } = await supabase.from('usuarios').insert({
      nombre,
      pin: pinEmpleada,
      sucursal_id: Number(sucursalId),
      rol: 'empleado',
      activo: true,
    })

    if (error) {
      setMensaje('Error al crear la empleada')
    } else {
      setMensaje('Empleada creada exitosamente')
      setNombre('')
      setPinEmpleada('')
      setSucursalId('')
      fetchEmpleadas()
    }

    setTimeout(() => setMensaje(''), 3000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
        <button
          onClick={() => setEditMode(!editMode)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {editMode ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="rounded bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-medium text-green-800">Cambios guardados exitosamente</p>
        </div>
      )}

      {/* Business Information */}
      <div className="bg-white rounded border border-gray-200 p-6">
        <h3 className="mb-6 text-lg font-semibold text-gray-900">Información del Negocio</h3>
        
        <div className="space-y-4">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Negocio
            </label>
            {editMode ? (
              <input
                type="text"
                value={settings.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-700">{settings.businessName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            {editMode ? (
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-700">{settings.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            {editMode ? (
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-700">{settings.phone}</p>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zona Horaria
            </label>
            {editMode ? (
              <select
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/La_Paz">Bolivia (La Paz)</option>
                <option value="America/Caracas">Venezuela</option>
                <option value="America/Argentina/Buenos_Aires">Argentina</option>
                <option value="America/Lima">Perú</option>
              </select>
            ) : (
              <p className="text-gray-700">{settings.timezone}</p>
            )}
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Moneda
            </label>
            {editMode ? (
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BOB">Bolivianos (Bs.)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="EUR">Euros (EUR)</option>
              </select>
            ) : (
              <p className="text-gray-700">{settings.currency}</p>
            )}
          </div>
        </div>

        {/* Save Button */}
        {editMode && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              className="rounded bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      {/* Additional Settings */}
      <div className="bg-white rounded border border-gray-200 p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Otras Configuraciones</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Notificaciones por Email</p>
              <p className="text-sm text-gray-600">Recibir alertas de stock bajo</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Respaldos Automáticos</p>
              <p className="text-sm text-gray-600">Realizar copias de seguridad diarias</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Modo Oscuro</p>
              <p className="text-sm text-gray-600">Cambiar a tema oscuro</p>
            </div>
            <input type="checkbox" className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Gestion de Empleadas */}
      <div className="bg-white rounded border border-gray-200 p-6">
        <h3 className="mb-6 text-lg font-semibold text-gray-900">Gestion de Empleadas</h3>

        <form onSubmit={crearEmpleada} className="mb-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4 digitos)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinEmpleada}
                onChange={(e) => setPinEmpleada(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccione...</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          {mensaje && (
            <p className={`text-sm font-medium ${mensaje.includes('Error') ? 'text-red-600' : 'text-green-700'}`}>
              {mensaje}
            </p>
          )}
          <button
            type="submit"
            className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Crear Empleada
          </button>
        </form>

        <h4 className="mb-3 text-sm font-semibold text-gray-900">Empleadas registradas</h4>
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sucursal</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">PIN</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Estado</th>
              </tr>
            </thead>
            <tbody>
              {empleadas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay empleadas registradas
                  </td>
                </tr>
              ) : (
                empleadas.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {(emp as any).sucursales?.nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{emp.pin}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold ${
                        emp.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {emp.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
