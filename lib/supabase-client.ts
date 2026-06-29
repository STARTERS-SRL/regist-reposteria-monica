// lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

const isConfigured = !!(supabaseUrl && supabaseKey)

if (!isConfigured) {
  console.warn('Supabase configuration incomplete. Using fallback data stub.')
}

const createStub = () => {
  const handler: ProxyHandler<object> = {
    get() {
      return () => ({
        data: null,
        error: new Error('Supabase no configurado. Define las variables en .env.local.'),
      })
    },
  }
  return new Proxy({}, handler)
}

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseKey) : (createStub() as any)

// --- Interfaces Tipadas del Sistema de Repostería ---
export interface Sale {
  id: string
  branch: string
  total: string
  method: string
  date: string
  estado: 'activa' | 'anulada'
}

export interface Branch {
  id: string
  name: string
  location?: string
}

export interface InventoryAlert {
  id: string
  productName: string
  currentStock: number
  minimumStock: number
  daysInStock: number
}

// --- Funciones del Core Conectadas a tu BD Real ---

export async function fetchTodaySales(branchId?: string): Promise<number> {
  if (!isConfigured) return 0
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  let query = supabase
    .from('ventas')
    .select('total')
    .eq('estado', 'activa')
    .gte('fecha', hoy.toISOString())

  if (branchId && branchId !== 'all') {
    query = query.eq('sucursal_id', parseInt(branchId))
  }

  const { data, error } = await query
  if (error) return 0
  return data?.reduce((sum, s) => sum + Number(s.total), 0) || 0
}

export async function fetchCashIncome(branchId?: string): Promise<number> {
  if (!isConfigured) return 0
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  let query = supabase
    .from('ventas')
    .select('total')
    .eq('estado', 'activa')
    .eq('metodo_pago', 'efectivo')
    .gte('fecha', hoy.toISOString())

  if (branchId && branchId !== 'all') {
    query = query.eq('sucursal_id', parseInt(branchId))
  }

  const { data, error } = await query
  if (error) return 0
  return data?.reduce((sum, s) => sum + Number(s.total), 0) || 0
}

export async function fetchQRIncome(branchId?: string): Promise<number> {
  if (!isConfigured) return 0
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  let query = supabase
    .from('ventas')
    .select('total')
    .eq('estado', 'activa')
    .eq('metodo_pago', 'qr')
    .gte('fecha', hoy.toISOString())

  if (branchId && branchId !== 'all') {
    query = query.eq('sucursal_id', parseInt(branchId))
  }

  const { data, error } = await query
  if (error) return 0
  return data?.reduce((sum, s) => sum + Number(s.total), 0) || 0
}

export async function fetchInventoryAlerts(): Promise<InventoryAlert[]> {
  if (!isConfigured) return []
  const { data, error } = await supabase
    .from('inventario')
    .select(`
      id,
      cantidad,
      minimo_alerta,
      fecha_ingreso,
      productos ( nombre )
    `)

  if (error || !data) return []

  const ahora = new Date()
  return data
    .filter(item => item.cantidad <= item.minimo_alerta)
    .map(item => {
      const ingreso = new Date(item.fecha_ingreso)
      const dias = Math.floor((ahora.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: String(item.id),
        productName: (item.productos as any)?.nombre || 'Producto sin nombre',
        currentStock: item.cantidad,
        minimumStock: item.minimo_alerta,
        daysInStock: dias >= 0 ? dias : 0
      }
    })
}

export async function fetchRecentSales(limit: number = 5, branchId?: string): Promise<Sale[]> {
  if (!isConfigured) return []
  let query = supabase
    .from('ventas')
    .select(`
      id,
      total,
      metodo_pago,
      fecha,
      estado,
      sucursales ( nombre )
    `)
    .order('fecha', { ascending: false })
    .limit(limit)

  if (branchId && branchId !== 'all') {
    query = query.eq('sucursal_id', parseInt(branchId))
  }

  const { data, error } = await query
  if (error || !data) return []

  return data.map(sale => ({
    id: String(sale.id),
    branch: (sale.sucursales as any)?.nombre || 'General',
    total: String(sale.total),
    method: sale.metodo_pago.toUpperCase(),
    date: new Date(sale.fecha).toLocaleDateString('es-BO', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    estado: sale.estado as 'activa' | 'anulada'
  }))
}

export async function fetchBranches(): Promise<Branch[]> {
  if (!isConfigured) return []
  const { data, error } = await supabase
    .from('sucursales')
    .select('id, nombre')
    .order('nombre', { ascending: true })

  if (error || !data) return []
  return data.map(b => ({
    id: String(b.id),
    name: b.nombre
  }))
}