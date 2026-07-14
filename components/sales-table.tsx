'use client'

import { useState } from 'react'
import { VentaEnriquecida } from '@/lib/ventas-utils'

interface Props {
  sales?: VentaEnriquecida[]
}

export default function SalesTable({ sales = [] }: Props) {
  const [expandId, setExpandId] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-6 py-3 text-xs font-semibold text-gray-700">ID</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-700">Sucursal</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-700">Vendedor</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-700">Total</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-700">Método</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-700">Productos</th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-700">Fecha / Hora</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {sales?.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500 italic">
                Sin transacciones registradas para este criterio.
              </td>
            </tr>
          ) : (
            sales.map((sale) => {
              const isExpanded = expandId === sale.id
              const detalles = sale.detalles
              const maxPreview = 3
              const hasMore = detalles && detalles.length > maxPreview

              return (
                <tr key={sale.id} className={`hover:bg-gray-50/50 ready-transition ${sale.estado === 'anulada' ? 'opacity-40 line-through' : ''}`}>
                  <td className="px-6 py-4 font-medium text-gray-900">#{sale.id}</td>
                  <td className="px-6 py-4 text-gray-600">{sale.branch}</td>
                  <td className="px-6 py-4 text-gray-600">{sale.vendedor}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    Bs. {Number(sale.total).toLocaleString('es-BO')}
                  </td>
                  <td className="px-6 py-4">
                    {sale.method.toUpperCase() === 'MIXTO' ? (
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="inline-block rounded-sm px-2 py-0.5 font-bold uppercase bg-gray-50 text-gray-700 border border-gray-200">Mixto</span>
                          {(sale.descuento ?? 0) > 0 && (
                            <span className="inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">Oferta</span>
                          )}
                        </div>
                        <div className="text-gray-500 pt-0.5">E: Bs. {(sale.montoEfectivo ?? 0).toFixed(2)}</div>
                        <div className="text-gray-500">QR: Bs. {(sale.montoQr ?? 0).toFixed(2)}</div>
                      </div>
                    ) : (
                      <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-bold uppercase ${sale.method.toUpperCase() === 'EFECTIVO'
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                        {sale.method}
                        {(sale.descuento ?? 0) > 0 && (
                          <span className="ml-1 inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">Oferta</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setExpandId(isExpanded ? null : sale.id)}
                      className="text-left w-full text-xs cursor-pointer"
                    >
                      {!detalles || detalles.length === 0 ? (
                        <span className="text-gray-400 italic">Sin detalle</span>
                      ) : isExpanded ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider block mb-1">Productos vendidos</span>
                          {detalles.map((d, i) => (
                            <div key={i} className="text-gray-600">• {d.cantidad}× {d.producto}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {detalles.slice(0, maxPreview).map((d, i) => (
                            <div key={i} className="text-gray-600">{d.cantidad}× {d.producto}</div>
                          ))}
                          {hasMore && <span className="text-gray-500 font-medium">+{detalles.length - maxPreview} más...</span>}
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{sale.date}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}