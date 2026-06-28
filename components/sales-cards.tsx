'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface CardProps {
  title: string
  children: React.ReactNode
}

function Card({ title, children }: CardProps) {
  return (
    <div className="rounded border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  )
}

interface Props {
  branchId: number | null
}

export default function SalesCards({ branchId }: Props) {
  const [ventasHoy, setVentasHoy] = useState(0)
  const [efectivo, setEfectivo] = useState(0)
  const [qr, setQr] = useState(0)
  const [alertas, setAlertas] = useState(0)

  useEffect(() => {
    fetchData()
  }, [branchId])

  const fetchData = async () => {
    const hoy = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('ventas')
      .select('total, metodo_pago')
      .eq('estado', 'activa')
      .gte('fecha', hoy)
      .lt('fecha', hoy + 'T23:59:59.999Z')

    if (branchId) query = query.eq('sucursal_id', branchId)

    const { data: ventas } = await query

    if (ventas) {
      setVentasHoy(ventas.reduce((s, v) => s + Number(v.total), 0))
      setEfectivo(ventas.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + Number(v.total), 0))
      setQr(ventas.filter(v => v.metodo_pago === 'qr').reduce((s, v) => s + Number(v.total), 0))
    }

    let invQuery = supabase
      .from('inventario')
      .select('cantidad, minimo_alerta')

    if (branchId) invQuery = invQuery.eq('sucursal_id', branchId)

    const { data: todoInv } = await invQuery
    setAlertas(todoInv ? todoInv.filter((i: any) => i.cantidad < i.minimo_alerta).length : 0)
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card title="Ventas de Hoy">
        <div className="text-4xl font-bold text-gray-900">Bs. {ventasHoy.toLocaleString()}</div>
      </Card>

      <Card title="Ingresos">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-600">Efectivo</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">Bs. {efectivo.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">QR</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">Bs. {qr.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      <Card title="Alertas de Inventario">
        <div className="text-4xl font-bold text-red-600">{alertas} productos</div>
      </Card>
    </div>
  )
}
