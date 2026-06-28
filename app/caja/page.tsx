'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

interface Producto {
  id: number
  nombre: string
  precio: number
}

interface CarritoItem {
  producto: Producto
  cantidad: number
}

type EstadoCaja = 'apertura_pendiente' | 'vendiendo' | 'cerrado'

export default function CajaPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [estado, setEstado] = useState<EstadoCaja>('apertura_pendiente')
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'qr'>('efectivo')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    if (user.rol !== 'empleado') { router.push('/login'); return }
    setUsuario(user)
    setSucursalId(user.sucursal_id)
  }, [router])

  useEffect(() => {
    if (!sucursalId) return
    fetchProductos()
    verificarEstado()
  }, [sucursalId])

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('nombre')
    if (data) setProductos(data)
  }

  const verificarEstado = async () => {
    const hoy = new Date().toISOString().split('T')[0]

    const { data: apertura } = await supabase
      .from('registros_diarios')
      .select('id')
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoy)
      .eq('tipo', 'apertura')
      .single()

    if (!apertura) {
      setEstado('apertura_pendiente')
      precargarCantidades()
      return
    }

    const { data: cierre } = await supabase
      .from('registros_diarios')
      .select('id')
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoy)
      .eq('tipo', 'cierre')
      .single()

    if (cierre) {
      setEstado('cerrado')
    } else {
      setEstado('vendiendo')
    }
  }

  const precargarCantidades = async () => {
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    const ayerStr = ayer.toISOString().split('T')[0]

    const { data: cierreAyer } = await supabase
      .from('registros_diarios')
      .select('snapshot_stock')
      .eq('sucursal_id', sucursalId)
      .eq('fecha', ayerStr)
      .eq('tipo', 'cierre')
      .single()

    const initial: Record<number, number> = {}
    const { data: prods } = await supabase.from('productos').select('*').order('nombre')
    const lista = prods || []

    if (cierreAyer?.snapshot_stock) {
      const snap = cierreAyer.snapshot_stock as Record<string, number>
      lista.forEach((p: any) => {
        initial[p.id] = snap[String(p.id)] ?? 0
      })
    } else {
      lista.forEach((p: any) => { initial[p.id] = 0 })
    }

    setCantidades(initial)
  }

  const iniciarDia = async () => {
    setCargando(true)
    const hoy = new Date().toISOString().split('T')[0]

    const { error: errReg } = await supabase.from('registros_diarios').insert({
      sucursal_id: sucursalId,
      usuario_id: usuario.id,
      fecha: hoy,
      tipo: 'apertura',
      snapshot_stock: cantidades,
      observaciones: '',
    })

    if (errReg) {
      setMensaje('Error al abrir el dia')
      setCargando(false)
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    for (const [prodId, cantidad] of Object.entries(cantidades)) {
      const { data: existente } = await supabase
        .from('inventario')
        .select('id')
        .eq('sucursal_id', sucursalId)
        .eq('producto_id', Number(prodId))
        .single()

      if (existente) {
        await supabase.from('inventario').update({ cantidad }).eq('id', existente.id)
      } else {
        await supabase.from('inventario').insert({
          sucursal_id: sucursalId,
          producto_id: Number(prodId),
          cantidad,
          minimo_alerta: 0,
          fecha_ingreso: new Date().toISOString(),
        })
      }
    }

    setMensaje('Dia iniciado correctamente')
    setEstado('vendiendo')
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.producto.id === producto.id)
      if (existente) {
        return prev.map((item) =>
          item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item,
        )
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  const quitarDelCarrito = (productoId: number) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.producto.id === productoId)
      if (existente && existente.cantidad > 1) {
        return prev.map((item) =>
          item.producto.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item,
        )
      }
      return prev.filter((item) => item.producto.id !== productoId)
    })
  }

  const total = carrito.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0)

  const registrarVenta = async () => {
    if (carrito.length === 0) return
    setCargando(true)

    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert({
        sucursal_id: sucursalId,
        usuario_id: usuario.id,
        total,
        estado: 'activa',
        metodo_pago: metodoPago,
        fecha: new Date().toISOString(),
      })
      .select()
      .single()

    if (errorVenta || !venta) {
      setMensaje('Error al registrar la venta')
      setCargando(false)
      return
    }

    const detalles = carrito.map((item) => ({
      venta_id: venta.id,
      producto_id: item.producto.id,
      cantidad: item.cantidad,
      subtotal: item.producto.precio * item.cantidad,
    }))

    const { error: errorDetalles } = await supabase.from('detalle_ventas').insert(detalles)

    if (errorDetalles) {
      setMensaje('Error al registrar los detalles')
      setCargando(false)
      return
    }

    for (const item of carrito) {
      const { data: inv } = await supabase
        .from('inventario')
        .select('id, cantidad')
        .eq('sucursal_id', sucursalId)
        .eq('producto_id', item.producto.id)
        .single()

      if (inv) {
        await supabase
          .from('inventario')
          .update({ cantidad: inv.cantidad - item.cantidad })
          .eq('id', inv.id)
      }
    }

    setMensaje('Venta exitosa')
    setCarrito([])
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const cerrarDia = async () => {
    setEstado('cerrado')
    setMensaje('')
  }

  const confirmarCierre = async () => {
    setCargando(true)
    const hoy = new Date().toISOString().split('T')[0]

    const { error: errReg } = await supabase.from('registros_diarios').insert({
      sucursal_id: sucursalId,
      usuario_id: usuario.id,
      fecha: hoy,
      tipo: 'cierre',
      snapshot_stock: cantidades,
      observaciones: '',
    })

    if (errReg) {
      setMensaje('Error al cerrar el dia')
      setCargando(false)
      return
    }

    for (const [prodId, cantidad] of Object.entries(cantidades)) {
      const { data: existente } = await supabase
        .from('inventario')
        .select('id')
        .eq('sucursal_id', sucursalId)
        .eq('producto_id', Number(prodId))
        .single()

      if (existente) {
        await supabase.from('inventario').update({ cantidad }).eq('id', existente.id)
      }
    }

    setMensaje('Dia cerrado correctamente')
    setCargando(false)
  }

  const precargarCierre = async () => {
    const initial: Record<number, number> = {}

    for (const prod of productos) {
      const { data: inv } = await supabase
        .from('inventario')
        .select('cantidad')
        .eq('sucursal_id', sucursalId)
        .eq('producto_id', prod.id)
        .single()

      initial[prod.id] = inv?.cantidad ?? 0
    }

    setCantidades(initial)
  }

  useEffect(() => {
    if (estado === 'cerrado' && productos.length > 0) {
      precargarCierre()
    }
  }, [estado, productos])

  if (!usuario || !sucursalId) return null

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
          <p className="text-gray-600">{usuario.nombre} - {usuario.sucursal_nombre || `Sucursal #${sucursalId}`}</p>
        </div>

        {mensaje && (
          <div className={`mb-4 rounded border p-4 ${
            mensaje.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <p className="text-sm font-medium">{mensaje}</p>
          </div>
        )}

        {estado === 'apertura_pendiente' && (
          <div className="rounded border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Apertura del Dia</h2>
            <p className="mb-4 text-sm text-gray-600">Ingrese las cantidades iniciales de cada producto:</p>
            <div className="space-y-3">
              {productos.map((p) => (
                <div key={p.id} className="flex items-center gap-4">
                  <label className="w-40 text-sm font-medium text-gray-700">{p.nombre}</label>
                  <input
                    type="number"
                    min={0}
                    value={cantidades[p.id] ?? 0}
                    onChange={(e) => setCantidades((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                    className="w-24 rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={iniciarDia}
              disabled={cargando}
              className="mt-6 rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {cargando ? 'Iniciando...' : 'Abrir Caja'}
            </button>
          </div>
        )}

        {estado === 'vendiendo' && (
          <>
            <div className="mb-4 flex justify-end">
              <button
                onClick={cerrarDia}
                className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
              >
                Cerrar Dia
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Productos</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {productos.map((producto) => (
                    <button
                      key={producto.id}
                      onClick={() => agregarAlCarrito(producto)}
                      className="rounded border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <p className="font-medium text-gray-900">{producto.nombre}</p>
                      <p className="text-sm text-gray-600">Bs. {producto.precio}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded border border-gray-200 bg-white p-4">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Carrito</h2>
                {carrito.length === 0 ? (
                  <p className="text-sm text-gray-500">Seleccione productos</p>
                ) : (
                  <div className="space-y-3">
                    {carrito.map((item) => (
                      <div key={item.producto.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.producto.nombre}</p>
                          <p className="text-xs text-gray-600">Bs. {item.producto.precio} x {item.cantidad}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => quitarDelCarrito(item.producto.id)}
                            className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100">-</button>
                          <span className="w-4 text-center text-sm font-medium">{item.cantidad}</span>
                          <button onClick={() => agregarAlCarrito(item.producto)}
                            className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2">
                      <p className="text-lg font-bold text-gray-900">Total: Bs. {total}</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Metodo de pago</label>
                  <div className="flex gap-2">
                    <button onClick={() => setMetodoPago('efectivo')}
                      className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
                        metodoPago === 'efectivo'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}>Efectivo</button>
                    <button onClick={() => setMetodoPago('qr')}
                      className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
                        metodoPago === 'qr'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}>QR</button>
                  </div>
                </div>

                <button onClick={registrarVenta} disabled={carrito.length === 0 || cargando}
                  className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {cargando ? 'Registrando...' : 'Registrar Venta'}
                </button>
              </div>
            </div>
          </>
        )}

        {estado === 'cerrado' && (
          <div className="rounded border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Cierre del Dia</h2>
            <p className="mb-4 text-sm text-gray-600">Confirme las cantidades finales de cada producto:</p>
            <div className="space-y-3">
              {productos.map((p) => (
                <div key={p.id} className="flex items-center gap-4">
                  <label className="w-40 text-sm font-medium text-gray-700">{p.nombre}</label>
                  <input
                    type="number" min={0}
                    value={cantidades[p.id] ?? 0}
                    onChange={(e) => setCantidades((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                    className="w-24 rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <button onClick={confirmarCierre} disabled={cargando}
              className="mt-6 rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {cargando ? 'Cerrando...' : 'Confirmar Cierre'}
            </button>
          </div>
        )}

        <button onClick={() => { localStorage.removeItem('usuario'); router.push('/login') }}
          className="mt-6 text-sm text-gray-500 hover:text-gray-700">Cerrar sesion</button>
      </div>
    </div>
  )
}
