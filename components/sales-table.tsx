'use client'

interface Sale {
  id: string
  branch: string
  total: string
  method: string
  date: string
  estado: 'activa' | 'anulada'
  vendedor: string
}

interface Props {
  sales?: Sale[] // Hacemos la propiedad opcional con "?" para evitar que el Dashboard rompa
}

export default function SalesTable({ sales = [] }: Props) { // Asignamos un arreglo vacío por defecto
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
            <th className="px-6 py-3 text-xs font-semibold text-gray-700">Fecha / Hora</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {/* Protección añadida con ?.length e inicialización segura */}
          {sales?.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 italic">
                Sin transacciones registradas para este criterio.
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <tr key={sale.id} className={`hover:bg-gray-50/50 ready-transition ${sale.estado === 'anulada' ? 'opacity-40 line-through' : ''}`}>
                <td className="px-6 py-4 font-medium text-gray-900">#{sale.id}</td>
                <td className="px-6 py-4 text-gray-600">{sale.branch}</td>
                <td className="px-6 py-4 text-gray-600">{sale.vendedor}</td>
                <td className="px-6 py-4 font-semibold text-gray-900">
                  Bs. {Number(sale.total).toLocaleString('es-BO')}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-bold uppercase ${sale.method.toUpperCase() === 'EFECTIVO'
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                    {sale.method}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{sale.date}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}