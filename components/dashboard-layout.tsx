'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import Sidebar from './sidebar'
import Header from './header'
import SalesCards from './sales-cards'
import SalesTable from './sales-table'
import SalesView from './sales-view'
import InventoryView from './inventory-view'
import SettingsView from './settings-view'
import PosView from './pos-view'
import ProductsView from './products-view'
import DespachosView from './despachos-view'
import { mapearVenta, VentaEnriquecida } from '@/lib/ventas-utils'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [rol, setRol] = useState<string>('')

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (stored) {
      const user = JSON.parse(stored)
      setRol(user.rol || '')
    }
  }, [])

  // NUEVOS ESTADOS EXCLUSIVOS PARA LAS VENTAS DE HOY DEL DASHBOARD
  const [todaySales, setTodaySales] = useState<VentaEnriquecida[]>([])
  const [loadingSales, setLoadingSales] = useState(false)

  // EFECTO PARA TRAER LAS VENTAS DE HOY AUTOMÁTICAMENTE CUANDO CAMBIE LA SUCURSAL O EL MENÚ
  useEffect(() => {
    if (activeMenu !== 'dashboard') return

    async function fetchTodaySales() {
      try {
        setLoadingSales(true)
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        let query = supabase
          .from('ventas')
          .select('id, total, metodo_pago, monto_efectivo, monto_qr, subtotal_original, descuento, fecha, estado, sucursales(nombre), usuario_id, usuarios(nombre), detalle_ventas(cantidad,productos(nombre))')
          .gte('fecha', startOfToday.toISOString())
          .order('fecha', { ascending: false })

        if (selectedBranchId) {
          query = query.eq('sucursal_id', selectedBranchId)
        }

        const { data, error } = await query
        if (error) throw error

        if (data) {
          setTodaySales(
            data.map((v: any) => {
              const base = mapearVenta(v)
              return {
                ...base,
                branch: v.sucursales?.nombre || '-',
                method: v.metodo_pago === 'efectivo' ? 'Efectivo' : v.metodo_pago === 'mixto' ? 'Mixto' : 'QR',
                date: new Date(v.fecha).toLocaleDateString('es-BO', {
                  hour: '2-digit', minute: '2-digit'
                }),
              }
            })
          )
        }
      } catch (err) {
        const supaErr = err as any
        console.error('Error cargando ventas de hoy en layout:', supaErr?.message || supaErr, '| details:', supaErr?.details, '| hint:', supaErr?.hint, '| code:', supaErr?.code)
      } finally {
        setLoadingSales(false)
      }
    }

    fetchTodaySales()
  }, [selectedBranchId, activeMenu])

  const renderContent = () => {
    switch (activeMenu) {
      case 'pos':
        return <PosView />
      case 'ventas':
        return <SalesView branchId={selectedBranchId} />
      case 'inventario':
        return <InventoryView branchId={selectedBranchId} />
      case 'configuracion':
        return <SettingsView />
      case 'productos':
        return <ProductsView />
      case 'despachos':
        return <DespachosView />
      case 'dashboard':
      default:
        return (
          <>
            <SalesCards branchId={selectedBranchId} />
            <div className="mt-6 md:mt-8">
              {/* TÍTULO VISUAL EXCLUSIVO PARA EL DASHBOARD */}
              <div className="rounded-sm border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Últimas Ventas de Hoy
                  </h2>
                </div>
                {loadingSales ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    Cargando transacciones de hoy...
                  </div>
                ) : (
                  /* ENVIAMOS LAS VENTAS DE HOY CARGADAS A NUESTRA TABLA PURA */
                  <SalesTable sales={todaySales} />
                )}
              </div>
            </div>
          </>
        )
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeMenu={activeMenu}
          onMenuSelect={(menu) => {
            setActiveMenu(menu)
            setSidebarOpen(false)
          }}
          rol={rol}
        />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}