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
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-700">{title}</h3>
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

  // Estados separados para cada tipo de alerta operativa
  const [alertasStock, setAlertasStock] = useState(0)
  const [alertasTiempo, setAlertasTiempo] = useState(0)

  useEffect(() => {
    fetchData()
  }, [branchId])

  const fetchData = async () => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    // 1. Consulta de Ventas del día de hoy
    let query = supabase
      .from('ventas')
      .select('total, metodo_pago')
      .eq('estado', 'activa')
      .gte('fecha', startOfToday.toISOString())
      .lte('fecha', endOfToday.toISOString())

    if (branchId) query = query.eq('sucursal_id', branchId)

    const { data: ventas } = await query

    if (ventas) {
      setVentasHoy(ventas.reduce((s, v) => s + Number(v.total), 0))
      setEfectivo(ventas.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + Number(v.total), 0))
      setQr(ventas.filter(v => v.metodo_pago === 'qr').reduce((s, v) => s + Number(v.total), 0))
    } else {
      setVentasHoy(0)
      setEfectivo(0)
      setQr(0)
    }

    // 2. Consulta de Inventario Vivo para procesar las dos lógicas por separado
    let invQuery = supabase
      .from('inventario')
      .select('cantidad, minimo_alerta, fecha_ingreso')

    if (branchId) invQuery = invQuery.eq('sucursal_id', branchId)

    const { data: todoInv } = await invQuery

    if (todoInv) {
      const ahora = new Date()

      // Lógica 1: Contador de productos bajos en stock o agotados
      const conteoStockBajo = todoInv.filter((item: any) =>
        item.cantidad <= (item.minimo_alerta ?? 2)
      ).length

      // Lógica 2: Contador de productos con 3 o más días en estante (Mayor o igual a 3)
      const conteoTiempoVitrinas = todoInv.filter((item: any) => {
        const fechaIngreso = new Date(item.fecha_ingreso)
        const diferenciaDias = Math.floor((ahora.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24))
        return diferenciaDias >= 3 && item.cantidad > 0
      }).length

      setAlertasStock(conteoStockBajo)
      setAlertasTiempo(conteoTiempoVitrinas)
    } else {
      setAlertasStock(0)
      setAlertasTiempo(0)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card title="Ventas de Hoy">
        <div className="text-4xl font-bold text-gray-900">Bs. {ventasHoy.toLocaleString('es-BO')}</div>
      </Card>

      <Card title="Ingresos del Día">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="inline-block rounded-sm bg-green-50 px-2 py-0.5 text-xs font-bold uppercase text-green-700 border border-green-100">
              Efectivo
            </span>
            <p className="text-xl font-bold text-gray-900">Bs. {efectivo.toLocaleString('es-BO')}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-block rounded-sm bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase text-blue-700 border border-blue-100">
              QR
            </span>
            <p className="text-xl font-bold text-gray-900">Bs. {qr.toLocaleString('es-BO')}</p>
          </div>
        </div>
      </Card>

      <Card title="Alertas de Inventario">
        <div className="space-y-4">
          {/* Fila Lógica 1: Por Stock */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="inline-block rounded-sm bg-red-50 px-2 py-0.5 text-xs font-bold uppercase text-red-700 border border-red-100">
              Por Bajo Stock
            </span>
            <p className={`text-xl font-bold ${alertasStock > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {alertasStock} {alertasStock === 1 ? 'producto' : 'productos'}
            </p>
          </div>

          {/* Fila Lógica 2: Por Tiempo de Antigüedad (>= 3 días) */}
          <div className="flex items-center justify-between">
            <span className="inline-block rounded-sm bg-amber-50 px-2 py-0.5 text-xs font-bold uppercase text-amber-800 border border-amber-100">
              Estancados (≥ 3 días)
            </span>
            <p className={`text-xl font-bold ${alertasTiempo > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {alertasTiempo} {alertasTiempo === 1 ? 'producto' : 'productos'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}