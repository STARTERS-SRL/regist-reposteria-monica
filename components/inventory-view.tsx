'use client'

import { useEffect, useState } from 'react'
import { supabase, fetchBranches, Branch } from '@/lib/supabase-client'

interface InventoryItem {
  id: number
  sucursal_id: number
  producto_id: number
  sucursal: string
  producto: string
  cantidad: number
  minimo_alerta: number
  fecha_ingreso: string
  antiguedadDias: number
}

interface ProductoLista {
  id: number
  nombre: string
}

interface Props {
  branchId: number | null
}

export default function InventoryView({ branchId }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [productsList, setProductsList] = useState<ProductoLista[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para el Modal de Agregar Registro
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newBranchId, setNewBranchId] = useState('')
  const [newProductId, setNewProductId] = useState('')
  const [newQuantity, setNewQuantity] = useState(0)

  useEffect(() => {
    fetchInventory()
    loadFormOptions()
  }, [branchId])

  const loadFormOptions = async () => {
    const branchData = await fetchBranches()
    setBranches(branchData)

    const { data: prodData } = await supabase
      .from('productos')
      .select('id, nombre')
      .order('nombre', { ascending: true })
    if (prodData) setProductsList(prodData)
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('inventario')
        .select(`
          id, sucursal_id, producto_id, cantidad, minimo_alerta, fecha_ingreso,
          productos ( nombre ),
          sucursales ( nombre )
        `)

      if (branchId) query = query.eq('sucursal_id', branchId)

      const { data } = await query

      if (data) {
        // Obtenemos la fecha de hoy a la medianoche en hora local para comparar días enteros
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        setInventory(
          (data as any[])
            .filter((d) => d.productos)
            .map((d) => {
              const fechaIngreso = new Date(d.fecha_ingreso)

              // Forzar ambas fechas a la medianoche para calcular la diferencia neta en días calendarios
              const fechaIngresoPlana = new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth(), fechaIngreso.getDate())
              const hoyPlano = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

              const diferenciaTiempo = hoyPlano.getTime() - fechaIngresoPlana.getTime()
              const dias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24))

              return {
                id: d.id,
                sucursal_id: d.sucursal_id,
                producto_id: d.producto_id,
                sucursal: d.sucursales?.nombre || 'General',
                producto: d.productos.nombre,
                cantidad: d.cantidad,
                minimo_alerta: d.minimo_alerta || 2,
                fecha_ingreso: fechaIngreso.toLocaleDateString('es-BO'),
                antiguedadDias: dias >= 0 ? dias : 0,
              }
            })
        )
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Cambiar cantidad de stock de forma inmediata (+1 / -1)
  const handleUpdateStock = async (itemId: number, cantidadActual: number, cambio: number) => {
    const nuevaCantidad = cantidadActual + cambio
    if (nuevaCantidad < 0) return

    const { error } = await supabase
      .from('inventario')
      .update({ cantidad: nuevaCantidad })
      .eq('id', itemId)

    if (!error) {
      setInventory(prev =>
        prev.map(item => (item.id === itemId ? { ...item, cantidad: nuevaCantidad } : item))
      )
    }
  }

  // Eliminar un lote completo del inventario
  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('¿Estás segura de eliminar este registro del inventario? Doña Mónica')) return

    const { error } = await supabase
      .from('inventario')
      .delete()
      .eq('id', itemId)

    if (!error) {
      setInventory(prev => prev.filter(item => item.id !== itemId))
    }
  }

  // Guardar nuevo registro
  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBranchId || !newProductId) return alert('Selecciona sucursal y producto')

    const { error } = await supabase
      .from('inventario')
      .insert([
        {
          sucursal_id: parseInt(newBranchId),
          producto_id: parseInt(newProductId),
          cantidad: newQuantity,
        },
      ])

    if (!error) {
      setIsModalOpen(false)
      setNewQuantity(0)
      fetchInventory()
    } else {
      alert('Error al insertar registro. Verifica si ya existe en esa sucursal.')
    }
  }

  return (
    <div className="space-y-6 text-gray-900">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Control de Inventario y Antigüedad
        </h2>
        <div className="space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-sm bg-gray-900 px-4 h-9 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-gray-800"
          >
            + Agregar Lote
          </button>
          <button
            onClick={fetchInventory}
            className="rounded-sm border border-gray-200 bg-white px-4 h-9 text-xs font-semibold uppercase tracking-wider text-gray-700 transition-colors hover:bg-gray-50"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="overflow-x-auto rounded-sm border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Sucursal</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Producto</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Cantidad Actual</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Antigüedad</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha Ingreso</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Consultando stock real...</td>
              </tr>
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Sin registros en esta sucursal</td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{item.sucursal}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.producto}</td>

                  {/* Celda Cantidad con Modificadores rapidos */}
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleUpdateStock(item.id, item.cantidad, -1)}
                        className="px-1.5 py-0.5 border border-gray-200 bg-gray-50 rounded-sm text-xs hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.cantidad}</span>
                      <button
                        onClick={() => handleUpdateStock(item.id, item.cantidad, 1)}
                        className="px-1.5 py-0.5 border border-gray-200 bg-gray-50 rounded-sm text-xs hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* Estado Condicional */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ${item.cantidad === 0
                        ? 'bg-red-200 text-red-900 border border-red-400 font-bold'
                        : item.cantidad <= item.minimo_alerta
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                      {item.cantidad === 0 ? 'Agotado' : item.cantidad <= item.minimo_alerta ? 'Agotándose' : 'Normal'}
                    </span>
                  </td>

                  {/* Antigüedad Calculada Exacta */}
                  <td className="px-4 py-3 text-center text-sm">
                    <span className={`font-medium ${item.antiguedadDias >= 1 ? 'text-amber-600 font-semibold' : 'text-gray-600'}`}>
                      {item.antiguedadDias === 0 ? 'Hoy' : item.antiguedadDias === 1 ? '1 día' : `${item.antiguedadDias} días`}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center text-sm text-gray-500">{item.fecha_ingreso}</td>

                  {/* Botón Eliminar */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-xs uppercase tracking-wider text-red-500 font-semibold hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL SOBREPUESTO PARA AGREGAR NUEVO LOTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-300 rounded-sm max-w-md w-full p-6 shadow-xl space-y-4 text-gray-900">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Registrar Lote en Inventario</h3>

            <form onSubmit={handleCreateInventory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal Destino</label>
                <select
                  value={newBranchId}
                  onChange={(e) => setNewBranchId(e.target.value)}
                  className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
                >
                  <option value="" className="text-gray-900 bg-white">Selecciona Sucursal</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="text-gray-900 bg-white">{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Producto</label>
                <select
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
                >
                  <option value="" className="text-gray-900 bg-white">Selecciona Producto</option>
                  {productsList.map(p => (
                    <option key={p.id} value={p.id} className="text-gray-900 bg-white">{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad Inicial</label>
                <input
                  type="number"
                  min="0"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                  className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-sm border border-gray-200 bg-white px-4 h-9 text-xs font-semibold uppercase tracking-wider text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-sm bg-gray-900 px-4 h-9 text-xs font-semibold uppercase tracking-wider text-white hover:bg-gray-800"
                >
                  Guardar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}