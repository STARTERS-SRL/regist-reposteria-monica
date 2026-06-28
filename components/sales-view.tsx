'use client'

import { useEffect, useState } from 'react'
import { supabase, mockSalesData } from '@/lib/supabase-client'

interface Sale {
  id: number
  date: string
  branch: string
  product: string
  quantity: number
  amount: number
  paymentMethod: string
}

interface Props {
  branchId: number | null
}

export default function SalesView({ branchId }: Props) {
  const [sales, setSales] = useState<Sale[]>(mockSalesData)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'cash' | 'qr'>('all')

  useEffect(() => {
    fetchSales()
  }, [branchId])

  const fetchSales = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('detalle_ventas')
        .select(`
          id, cantidad, subtotal,
          ventas!inner ( id, total, estado, metodo_pago, fecha, sucursales ( nombre ) ),
          productos ( nombre )
        `)
        .limit(50)

      if (branchId) query = query.eq('ventas.sucursal_id', branchId)

      const { data, error } = await query

      if (error) {
        console.error('Error fetching sales:', error)
        setSales(mockSalesData)
      } else if (data) {
        const flat: Sale[] = (data as any[])
          .filter((d: any) => d.ventas && d.productos)
          .map((d: any) => ({
            id: d.id,
            date: d.ventas.fecha,
            branch: d.ventas.sucursales?.nombre || '-',
            product: d.productos.nombre,
            quantity: d.cantidad,
            amount: d.subtotal,
            paymentMethod: d.ventas.metodo_pago === 'efectivo' ? 'Efectivo' : 'QR',
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setSales(flat)
      }
    } catch (err) {
      console.error('Error:', err)
      setSales(mockSalesData)
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter(sale => {
    if (filter === 'cash') return sale.paymentMethod === 'Efectivo'
    if (filter === 'qr') return sale.paymentMethod === 'QR'
    return true
  })

  const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Registro de Ventas</h2>
        <button
          onClick={fetchSales}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Actualizar
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('cash')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            filter === 'cash'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          Efectivo
        </button>
        <button
          onClick={() => setFilter('qr')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            filter === 'qr'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          QR
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded border border-gray-200 p-4">
        <div className="text-sm text-gray-600">Total de ventas ({filteredSales.length})</div>
        <div className="text-3xl font-bold text-gray-900">Bs. {totalAmount.toLocaleString()}</div>
      </div>

      {/* Sales Table */}
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sucursal</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Producto</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Cantidad</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Monto</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Método</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No hay ventas registradas
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{sale.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{sale.branch}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{sale.product}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{sale.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    Bs. {sale.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold ${
                      sale.paymentMethod === 'Efectivo'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {sale.paymentMethod}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
