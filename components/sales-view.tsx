'use client'

import { useEffect, useState } from 'react'
import { supabase, fetchBranches, Branch } from '@/lib/supabase-client'
import SalesTable from './sales-table'
import { mapearVenta, VentaEnriquecida } from '@/lib/ventas-utils'

export default function SalesView() {
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<string>('')

  const [branches, setBranches] = useState<Branch[]>([])
  const [sales, setSales] = useState<VentaEnriquecida[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const years = ['2024', '2025', '2026', '2027']
  const months = [
    { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
  ]

  useEffect(() => {
    const loadBranches = async () => {
      const data = await fetchBranches()
      setBranches(data)
    }
    loadBranches()
  }, [])

  const fetchSalesData = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('ventas')
        .select(`
          id,
          total,
          metodo_pago,
          monto_efectivo,
          monto_qr,
          subtotal_original,
          descuento,
          fecha,
          estado,
          usuario_id,
          sucursales ( nombre ),
          usuarios ( nombre ),
          detalle_ventas (
            cantidad,
            productos ( nombre )
          )
        `)
        .order('fecha', { ascending: false })

      if (selectedBranch !== 'all') {
        query = query.eq('sucursal_id', parseInt(selectedBranch))
      }

      if (selectedYear) {
        let inicioStr = ''
        let finStr = ''

        if (selectedMonth) {
          if (selectedDay) {
            const diaFormateado = selectedDay.padStart(2, '0')
            inicioStr = `${selectedYear}-${selectedMonth}-${diaFormateado}T00:00:00.000`
            finStr = `${selectedYear}-${selectedMonth}-${diaFormateado}T23:59:59.999`
          } else {
            inicioStr = `${selectedYear}-${selectedMonth}-01T00:00:00.000`
            const ultimoDia = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate()
            finStr = `${selectedYear}-${selectedMonth}-${String(ultimoDia).padStart(2, '0')}T23:59:59.999`
          }
        } else {
          inicioStr = `${selectedYear}-01-01T00:00:00.000`
          finStr = `${selectedYear}-12-31T23:59:59.999`
        }

        query = query.gte('fecha', inicioStr).lte('fecha', finStr)
      }

      const { data, error } = await query
      if (error) throw error

      if (data) {
        const mappedSales = data.map((v: any) => mapearVenta(v))
        setSales(mappedSales)
      }
    } catch (error) {
      const supaErr = error as any
      console.error('Error cargando historial de ventas:', supaErr?.message || supaErr, '| details:', supaErr?.details, '| hint:', supaErr?.hint, '| code:', supaErr?.code)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalesData()
  }, [selectedBranch, selectedYear, selectedMonth, selectedDay])

  const totalRecaudado = sales
    .filter(s => s.estado === 'activa')
    .reduce((acc, curr) => acc + Number(curr.total), 0)

  const getListTitle = () => {
    if (selectedDay && selectedMonth) return `Historial Completo: Ventas del Día ${selectedDay}/${selectedMonth}/${selectedYear}`
    if (selectedMonth) return `Historial Completo: Ventas de ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
    return `Historial Completo: Registro Anual de Ventas ${selectedYear}`
  }

  return (
    <div className="space-y-6 text-gray-900">
      {/* Caja Superior de Filtros */}
      <div className="bg-white border border-gray-200 rounded-sm p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Filtros - Historial por Día / Mes / Año
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Sucursal */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
            <select
              value={selectedBranch}
              onChange={(e) => { setSelectedBranch(e.target.value); setSelectedDay(''); }}
              className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
            >
              <option value="all" className="text-gray-900 bg-white">Todas las Sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="text-gray-900 bg-white">{b.name}</option>
              ))}
            </select>
          </div>

          {/* Año */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setSelectedDay(''); }}
              className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
            >
              {years.map((y) => (
                <option key={y} value={y} className="text-gray-900 bg-white">{y}</option>
              ))}
            </select>
          </div>

          {/* Mes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mes</label>
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDay(''); }}
              className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
            >
              <option value="" className="text-gray-900 bg-white">Todos los meses</option>
              {months.map((m) => (
                <option key={m.value} value={m.value} className="text-gray-900 bg-white">{m.label}</option>
              ))}
            </select>
          </div>

          {/* Día */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Día del Mes</label>
            <select
              value={selectedDay}
              disabled={!selectedMonth}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="" className="text-gray-900 bg-white">Todo el mes</option>
              {selectedMonth && Array.from({ length: new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate() }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)} className="text-gray-900 bg-white">{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Indicador de Desempeño Financiero */}
      <div className="bg-white border border-gray-200 rounded-sm p-4">
        <span className="text-xs font-medium text-gray-500 block">Total en el Período Seleccionado</span>
        <span className="text-2xl font-bold tracking-tight text-gray-900">
          Bs. {totalRecaudado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* REGISTRO DE VENTAS GENERAL CORREGIDO (Removido el contenedor estático de 'Ventas de Hoy') */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-sm p-8 text-center text-sm text-gray-400">
          Buscando registros en Supabase...
        </div>
      ) : sales.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-sm p-4">
          <div className="border-b border-gray-100 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">{getListTitle()}</h3>
          </div>
          <SalesTable sales={sales} />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-sm p-8 text-center text-sm text-gray-400 border-dashed">
          No se registraron transacciones para los filtros aplicados.
        </div>
      )}
    </div>
  )
}