'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface InventoryItem {
  id: number
  sucursal: string
  producto: string
  cantidad: number
  minimo_alerta: number
  fecha_ingreso: string
}

interface Props {
  branchId: number | null
}

export default function InventoryView({ branchId }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventory()
  }, [branchId])

  const fetchInventory = async () => {
    setLoading(true)
    let query = supabase
      .from('inventario')
      .select(`
        id, cantidad, minimo_alerta, fecha_ingreso,
        productos ( nombre ),
        sucursales ( nombre )
      `)

    if (branchId) query = query.eq('sucursal_id', branchId)

    const { data } = await query

    if (data) {
      setInventory(
        (data as any[])
          .filter((d) => d.productos)
          .map((d) => ({
            id: d.id,
            sucursal: d.sucursales?.nombre || '-',
            producto: d.productos.nombre,
            cantidad: d.cantidad,
            minimo_alerta: d.minimo_alerta,
            fecha_ingreso: new Date(d.fecha_ingreso).toLocaleDateString('es-BO'),
          })),
      )
    }
    setLoading(false)
  }

  const lowStockCount = inventory.filter(i => i.cantidad < i.minimo_alerta).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Inventario</h2>
        <button
          onClick={fetchInventory}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total registros</div>
          <div className="text-3xl font-bold text-gray-900">{inventory.length}</div>
        </div>
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Stock bajo</div>
          <div className="text-3xl font-bold text-red-600">{lowStockCount}</div>
        </div>
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Stock normal</div>
          <div className="text-3xl font-bold text-green-600">{inventory.length - lowStockCount}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sucursal</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Producto</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Cantidad</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Minimo</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Estado</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td>
              </tr>
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Sin registros de inventario</td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{item.sucursal}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.producto}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{item.cantidad}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{item.minimo_alerta}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold ${
                      item.cantidad < item.minimo_alerta
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.cantidad < item.minimo_alerta ? 'Bajo' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">{item.fecha_ingreso}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
