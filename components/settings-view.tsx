'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

export default function SettingsView() {
  // PIN de administrador
  const [pinAdmin, setPinAdmin] = useState('')
  const [adminMensaje, setAdminMensaje] = useState('')

  // Empleadas
  const [empleadas, setEmpleadas] = useState<any[]>([])
  const [sucursales, setSucursales] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [pinEmpleada, setPinEmpleada] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [mensaje, setMensaje] = useState('')

  // Estado para la edición de empleadas en línea
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPin, setEditPin] = useState('')
  const [editSucursalId, setEditSucursalId] = useState('')
  const [editActivo, setEditActivo] = useState(true)

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

  const actualizarPinAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminMensaje('')

    if (pinAdmin.length !== 4) {
      setAdminMensaje('Error: El PIN debe tener 4 dígitos')
      return
    }

    const { error } = await supabase
      .from('usuarios')
      .update({ pin: pinAdmin })
      .eq('rol', 'admin') // Actualiza al rol administrador

    if (error) {
      setAdminMensaje('Error al cambiar el PIN del Administrador')
    } else {
      setAdminMensaje('PIN de Administrador actualizado con éxito')
      setPinAdmin('')
    }
    setTimeout(() => setAdminMensaje(''), 3000)
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

  const iniciarEdicion = (emp: any) => {
    setEditingId(emp.id)
    setEditNombre(emp.nombre)
    setEditPin(emp.pin)
    setEditSucursalId(String(emp.sucursal_id || ''))
    setEditActivo(emp.activo)
  }

  const guardarCambiosEmpleada = async (id: number) => {
    if (editPin.length !== 4) {
      alert('El PIN debe tener exactamente 4 dígitos')
      return
    }

    const { error } = await supabase
      .from('usuarios')
      .update({
        nombre: editNombre,
        pin: editPin,
        sucursal_id: Number(editSucursalId),
        activo: editActivo
      })
      .eq('id', id)

    if (error) {
      alert('Error al actualizar la empleada')
    } else {
      setEditingId(null)
      fetchEmpleadas()
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h2>
      </div>

      {/* SEGURIDAD: Cambiar PIN del Administrador */}
      <div className="bg-white rounded border border-gray-200 p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-700">Seguridad - PIN Administrador</h3>
        <form onSubmit={actualizarPinAdmin} className="max-w-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo PIN de Acceso (4 dígitos)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinAdmin}
              onChange={(e) => setPinAdmin(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {adminMensaje && (
            <p className={`text-sm font-medium ${adminMensaje.includes('Error') ? 'text-red-600' : 'text-green-700'}`}>
              {adminMensaje}
            </p>
          )}
          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Actualizar PIN Maestro
          </button>
        </form>
      </div>

      {/* Gestión de Empleadas */}
      <div className="bg-white rounded border border-gray-200 p-6">
        <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-gray-700">Gestión de Empleadas</h3>

        {/* Formulario de registro */}
        <form onSubmit={crearEmpleada} className="mb-8 space-y-4 border-b border-gray-100 pb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Registrar Nueva Empleada</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN de Caja (4 dígitos)</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal Asignada</label>
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

        {/* Tabla con Edición Modificable */}
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Personal Registrado</h4>
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-sm font-semibold text-gray-900">Nombre</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-900">Sucursal</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-900">PIN</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Estado</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {empleadas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay empleadas registradas
                  </td>
                </tr>
              ) : (
                empleadas.map((emp) => {
                  const isEditing = editingId === emp.id

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 ready-transition">
                      {/* NOMBRE */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1 text-gray-900 focus:outline-none focus:border-blue-500 w-full"
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{emp.nombre}</span>
                        )}
                      </td>

                      {/* SUCURSAL */}
                      <td className="px-4 py-3 text-gray-700">
                        {isEditing ? (
                          <select
                            value={editSucursalId}
                            onChange={(e) => setEditSucursalId(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1 text-gray-900 focus:outline-none focus:border-blue-500 w-full"
                          >
                            {sucursales.map((s) => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                          </select>
                        ) : (
                          emp.sucursales?.nombre || '-'
                        )}
                      </td>

                      {/* PIN */}
                      <td className="px-4 py-3 text-gray-700">
                        {isEditing ? (
                          <input
                            type="text"
                            maxLength={4}
                            value={editPin}
                            onChange={(e) => setEditPin(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1 text-gray-900 focus:outline-none focus:border-blue-500 w-20 text-center"
                          />
                        ) : (
                          <span className="font-mono">{emp.pin}</span>
                        )}
                      </td>

                      {/* ESTADO */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <select
                            value={editActivo ? 'true' : 'false'}
                            onChange={(e) => setEditActivo(e.target.value === 'true')}
                            className="rounded border border-gray-300 px-2 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                          >
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${emp.activo ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                            {emp.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        )}
                      </td>

                      {/* BOTONES DE ACCIÓN */}
                      <td className="px-4 py-3 text-center space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => guardarCambiosEmpleada(emp.id)}
                              className="text-xs bg-green-600 text-white font-medium px-2 py-1 rounded hover:bg-green-700 transition-colors"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs bg-gray-200 text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-300 transition-colors"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => iniciarEdicion(emp)}
                            className="text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                          >
                            Modificar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}