'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Producto {
  id: number
  nombre: string
  precio: number
  tipo: string
  activo: boolean
}

export default function ProductsView() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newPrecio, setNewPrecio] = useState('')
  const [newTipo, setNewTipo] = useState('Entero')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editTipo, setEditTipo] = useState('')
  const [editActivo, setEditActivo] = useState(true)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    fetchProductos()
  }, [])

  const fetchProductos = async () => {
    setLoading(true)
    const { data } = await supabase.from('productos').select('*').order('nombre')
    if (data) setProductos(data)
    setLoading(false)
  }

  const handleSaveNew = async () => {
    if (!newNombre || !newPrecio) {
      alert('Complete nombre y precio.')
      return
    }
    const { error } = await supabase.from('productos').insert({
      nombre: newNombre,
      precio: parseFloat(newPrecio),
      tipo: newTipo || '',
      activo: true,
    })
    if (error) {
      console.error(error)
      alert('Error al crear producto.')
    } else {
      setIsAdding(false)
      setNewNombre('')
      setNewPrecio('')
      setNewTipo('Entero')
      setMensaje('Producto creado exitosamente.')
      fetchProductos()
    }
    setTimeout(() => setMensaje(''), 3000)
  }

  const startEditing = (p: Producto) => {
    setEditingId(p.id)
    setEditNombre(p.nombre)
    setEditPrecio(p.precio.toString())
    setEditTipo(p.tipo || '')
    setEditActivo(p.activo)
  }

  const handleSaveEdit = async (id: number) => {
    if (!editNombre || !editPrecio) {
      alert('Complete nombre y precio.')
      return
    }
    const { error } = await supabase.from('productos').update({
      nombre: editNombre,
      precio: parseFloat(editPrecio),
      tipo: editTipo || '',
      activo: editActivo,
    }).eq('id', id)
    if (error) {
      console.error(error)
      alert('Error al actualizar producto.')
    } else {
      setEditingId(null)
      setMensaje('Producto actualizado.')
      fetchProductos()
    }
    setTimeout(() => setMensaje(''), 3000)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Desactivar este producto? No se eliminará del historial de ventas.')) {
      const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id)
      if (error) {
        console.error(error)
        alert('Error al desactivar producto.')
      } else {
        setMensaje('Producto desactivado.')
        fetchProductos()
      }
      setTimeout(() => setMensaje(''), 3000)
    }
  }

  const handleReactivate = async (id: number) => {
    const { error } = await supabase.from('productos').update({ activo: true }).eq('id', id)
    if (error) {
      console.error(error)
      alert('Error al reactivar producto.')
    } else {
      setMensaje('Producto reactivado.')
      fetchProductos()
    }
    setTimeout(() => setMensaje(''), 3000)
  }

  const tipos = ['Entero', 'Porción']

  return (
    <div className="rounded border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Catálogo de Productos</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gestión completa del catálogo de repostería</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="rounded-sm bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800 ready-transition"
          >
            {isAdding ? 'Cancelar' : '+ Nuevo Producto'}
          </button>
          <button onClick={fetchProductos} className="rounded-sm bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 ready-transition">
            Sincronizar
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="mx-6 mt-4 rounded-sm border border-green-200 bg-green-50 p-3">
          <p className="text-xs font-medium text-green-700">{mensaje}</p>
        </div>
      )}

      {isAdding && (
        <div className="border-b border-blue-100 bg-blue-50/40 px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                placeholder="Ej: Torta de Chocolate"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Precio (Bs.)</label>
              <input
                type="number"
                step="0.01"
                value={newPrecio}
                onChange={(e) => setNewPrecio(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
              >
                {tipos.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSaveNew}
                className="rounded-sm bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 ready-transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-700">
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Precio</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                  Cargando productos...
                </td>
              </tr>
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                  No hay productos registrados.
                </td>
              </tr>
            ) : (
              productos.map((p) => {
                const isEditing = editingId === p.id
                return (
                  <tr key={p.id} className={`hover:bg-gray-50/50 ready-transition ${!p.activo ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none w-full"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{p.nombre}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editPrecio}
                          onChange={(e) => setEditPrecio(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none w-24"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900">Bs. {p.precio.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          value={editTipo}
                          onChange={(e) => setEditTipo(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                        >
                          {tipos.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-600">{p.tipo || '-'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
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
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${p.activo ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(p.id)}
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
                        <>
                          <button
                            onClick={() => startEditing(p)}
                            className="text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                          >
                            Modificar
                          </button>
                          {p.activo ? (
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-xs text-red-600 font-semibold hover:text-red-800 transition-colors"
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(p.id)}
                              className="text-xs text-green-600 font-semibold hover:text-green-800 transition-colors"
                            >
                              Reactivar
                            </button>
                          )}
                        </>
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
  )
}
