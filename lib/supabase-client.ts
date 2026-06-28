import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

const isConfigured = !!(supabaseUrl && supabaseKey)

if (!isConfigured) {
  console.warn('Supabase configuration incomplete. Using fallback data.')
}

const createStub = () => {
  const handler: ProxyHandler<object> = {
    get() {
      return () => ({
        data: null,
        error: new Error('Supabase no configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'),
      })
    },
  }
  return new Proxy({}, handler)
}

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseKey) : createStub()

// Mock data para desarrollo y fallback
export const mockSalesData = [
  {
    id: 1,
    date: '2024-01-15',
    branch: 'Sucursal Centro',
    product: 'Torta Chocolate',
    quantity: 3,
    amount: 450,
    paymentMethod: 'Efectivo'
  },
  {
    id: 2,
    date: '2024-01-15',
    branch: 'Sucursal Centro',
    product: 'Pan de Yuca',
    quantity: 12,
    amount: 240,
    paymentMethod: 'QR'
  },
  {
    id: 3,
    date: '2024-01-15',
    branch: 'Sucursal Norte',
    product: 'Donas Azucaradas',
    quantity: 24,
    amount: 360,
    paymentMethod: 'Efectivo'
  },
  {
    id: 4,
    date: '2024-01-15',
    branch: 'Sucursal Sur',
    product: 'Croissants',
    quantity: 8,
    amount: 320,
    paymentMethod: 'QR'
  },
  {
    id: 5,
    date: '2024-01-15',
    branch: 'Sucursal Centro',
    product: 'Pie de Queso',
    quantity: 5,
    amount: 250,
    paymentMethod: 'Efectivo'
  }
]

export const mockInventoryData = [
  {
    id: 1,
    product: 'Harina Integral',
    stock: 45,
    minStock: 50,
    status: 'Bajo'
  },
  {
    id: 2,
    product: 'Azúcar Blanca',
    stock: 120,
    minStock: 100,
    status: 'Normal'
  },
  {
    id: 3,
    product: 'Levadura',
    stock: 8,
    minStock: 10,
    status: 'Bajo'
  },
  {
    id: 4,
    product: 'Mantequilla',
    stock: 35,
    minStock: 40,
    status: 'Bajo'
  },
  {
    id: 5,
    product: 'Chocolate',
    stock: 25,
    minStock: 20,
    status: 'Normal'
  }
]

export interface Sale {
  id: string
  branch: string
  total: string
  method: string
  date: string
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
}

// Funciones placeholder para futuras llamadas a API/Supabase
export async function fetchTodaySales(branchId?: string): Promise<number> {
  // TODO: Implementar llamada a Supabase
  // const { data } = await supabase
  //   .from('sales')
  //   .select('total')
  //   .eq('date', today)
  //   .maybe_eq('branch_id', branchId)
  // return data?.reduce((sum, sale) => sum + sale.total, 0) || 0
  return 0
}

export async function fetchCashIncome(branchId?: string): Promise<number> {
  // TODO: Implementar llamada a Supabase
  return 0
}

export async function fetchQRIncome(branchId?: string): Promise<number> {
  // TODO: Implementar llamada a Supabase
  return 0
}

export async function fetchInventoryAlerts(): Promise<InventoryAlert[]> {
  // TODO: Implementar llamada a Supabase
  // const { data } = await supabase
  //   .from('products')
  //   .select('*')
  //   .lt('quantity', 'minimum_stock')
  return []
}

export async function fetchRecentSales(limit: number = 5, branchId?: string): Promise<Sale[]> {
  // TODO: Implementar llamada a Supabase
  // const { data } = await supabase
  //   .from('sales')
  //   .select('*')
  //   .maybe_eq('branch_id', branchId)
  //   .order('created_at', { ascending: false })
  //   .limit(limit)
  return []
}

export async function fetchBranches(): Promise<Branch[]> {
  // TODO: Implementar llamada a Supabase
  // const { data } = await supabase
  //   .from('branches')
  //   .select('*')
  return []
}
