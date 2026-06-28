'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Sale {
  id: number
  branch: string
  total: string
  method: string
  date: string
}

interface Props {
  branchId: number | null
}

export default function SalesTable({ branchId }: Props) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSales()
  }, [branchId])

  const fetchSales = async () => {
    setLoading(true)
    let query = supabase
      .from('ventas')
      .select('id, total, metodo_pago, fecha, sucursales(nombre)')
      .order('fecha', { ascending: false })
      .limit(5)

    if (branchId) query = query.eq('sucursal_id', branchId)

    const { data } = await query
    if (data) {
      setSales(
        (data as any[]).map((v) => ({
          id: v.id,
          branch: v.sucursales?.nombre || '-',
          total: `Bs. ${Number(v.total).toLocaleString()}`,
          method: v.metodo_pago === 'efectivo' ? 'Efectivo' : 'QR',
          date: new Date(v.fecha).toLocaleString('es-BO'),
        })),
      )
    }
    setLoading(false)
  }

  return (
    <div className="rounded border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Ultimas Ventas</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Sucursal</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Metodo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Cargando...</td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Sin ventas registradas</td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-100">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{sale.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.branch}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{sale.total}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.method}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
