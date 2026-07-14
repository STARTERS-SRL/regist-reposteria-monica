'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Sucursal {
  id: number
  nombre: string
}

interface ProductoOrigen {
  producto_id: number
  nombre: string
  precio: number
  stock: number
}

interface CarritoItem {
  producto_id: number
  nombre: string
  stockDisponible: number
  cantidad: number
}

interface DetalleDespacho {
  id: number
  cantidad: number
  productos: { nombre: string }
}

interface Despacho {
  id: number
  fecha: string
  sucursal_origen_id: number
  sucursal_destino_id: number
  usuario_id: number
  estado: string
  usuarios: { nombre: string }
  detalle_despachos: DetalleDespacho[]
}

export default function DespachosView() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [productosOrigen, setProductosOrigen] = useState<ProductoOrigen[]>([])
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [usuario, setUsuario] = useState<any>(null)
  const [despachos, setDespachos] = useState<Despacho[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const [filtroSucursal, setFiltroSucursal] = useState('all')
  const [filtroYear, setFiltroYear] = useState<string>(new Date().getFullYear().toString())
  const [filtroMonth, setFiltroMonth] = useState<string>('')
  const [filtroDay, setFiltroDay] = useState<string>('')

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
    const stored = localStorage.getItem('usuario')
    if (stored) setUsuario(JSON.parse(stored))
    fetchSucursales()
  }, [])

  useEffect(() => {
    if (origenId) fetchProductosOrigen()
    else setProductosOrigen([])
  }, [origenId])

  const fetchSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('*').order('nombre')
    if (data) setSucursales(data.filter((s: any) => s.activo !== false))
  }

  const fetchProductosOrigen = async () => {
    const { data } = await supabase
      .from('inventario')
      .select('producto_id, cantidad, productos(id, nombre, precio)')
      .eq('sucursal_id', parseInt(origenId))
      .gt('cantidad', 0)

    if (data) {
      const mapped = (data as any[])
        .filter((item: any) => item.productos?.activo !== false)
        .map((item: any) => ({
          producto_id: item.producto_id,
          nombre: item.productos?.nombre || 'Producto',
          precio: item.productos?.precio || 0,
          stock: item.cantidad,
        }))
      setProductosOrigen(mapped)
    }
  }

  const fetchDespachos = useCallback(async () => {
    setCargandoHistorial(true)
    let query = supabase
      .from('despachos')
      .select(`
        *,
        usuarios ( nombre ),
        detalle_despachos ( id, cantidad, productos ( nombre ) )
      `)
      .order('fecha', { ascending: false })

    if (filtroSucursal !== 'all') {
      const sucId = parseInt(filtroSucursal)
      query = query.or(`sucursal_origen_id.eq.${sucId},sucursal_destino_id.eq.${sucId}`)
    }

    if (filtroYear) {
      let inicioStr = ''
      let finStr = ''

      if (filtroMonth) {
        if (filtroDay) {
          const diaFormateado = filtroDay.padStart(2, '0')
          inicioStr = `${filtroYear}-${filtroMonth}-${diaFormateado}T00:00:00.000`
          finStr = `${filtroYear}-${filtroMonth}-${diaFormateado}T23:59:59.999`
        } else {
          inicioStr = `${filtroYear}-${filtroMonth}-01T00:00:00.000`
          const ultimoDia = new Date(parseInt(filtroYear), parseInt(filtroMonth), 0).getDate()
          finStr = `${filtroYear}-${filtroMonth}-${String(ultimoDia).padStart(2, '0')}T23:59:59.999`
        }
      } else {
        inicioStr = `${filtroYear}-01-01T00:00:00.000`
        finStr = `${filtroYear}-12-31T23:59:59.999`
      }

      query = query.gte('fecha', inicioStr).lte('fecha', finStr)
    }

    const { data } = await query
    if (data) setDespachos(data as unknown as Despacho[])
    setCargandoHistorial(false)
  }, [filtroSucursal, filtroYear, filtroMonth, filtroDay])

  useEffect(() => {
    fetchDespachos()
  }, [fetchDespachos])

  const sucursalNombre = (id: number) =>
    sucursales.find((s) => s.id === id)?.nombre || `#${id}`

  const agregarAlCarrito = (prod: ProductoOrigen) => {
    setCarrito((prev) => {
      const existente = prev.find((c) => c.producto_id === prod.producto_id)
      if (existente) return prev
      return [
        ...prev,
        { producto_id: prod.producto_id, nombre: prod.nombre, stockDisponible: prod.stock, cantidad: 1 },
      ]
    })
  }

  const actualizarCantidad = (productoId: number, cantidad: number) => {
    setCarrito((prev) =>
      prev.map((c) =>
        c.producto_id === productoId
          ? { ...c, cantidad: Math.max(0, Math.min(cantidad, c.stockDisponible)) }
          : c
      ).filter((c) => c.cantidad > 0)
    )
  }

  const quitarDelCarrito = (productoId: number) => {
    setCarrito((prev) => prev.filter((c) => c.producto_id !== productoId))
  }

  const confirmarDespacho = async () => {
    if (!origenId || !destinoId) {
      setMensaje('Seleccione sucursal origen y destino.')
      return
    }
    if (origenId === destinoId) {
      setMensaje('La sucursal origen y destino deben ser diferentes.')
      return
    }
    if (carrito.length === 0) {
      setMensaje('Agregue al menos un producto al despacho.')
      return
    }
    if (!usuario?.id) {
      setMensaje('Debe iniciar sesión para realizar un despacho.')
      return
    }

    setCargando(true)
    setMensaje('')

    try {
      const { data: despacho, error: errDespacho } = await supabase
        .from('despachos')
        .insert({
          sucursal_origen_id: parseInt(origenId),
          sucursal_destino_id: parseInt(destinoId),
          usuario_id: usuario.id,
          fecha: new Date().toISOString(),
          estado: 'completado',
        })
        .select()

      if (errDespacho || !despacho || despacho.length === 0) {
        throw new Error(errDespacho?.message || 'Error al crear despacho')
      }

      const despachoId = despacho[0].id
      const detalleInserts = carrito.map((c) => ({
        despacho_id: despachoId,
        producto_id: c.producto_id,
        cantidad: c.cantidad,
      }))

      const { error: errDetalle } = await supabase
        .from('detalle_despachos')
        .insert(detalleInserts)

      if (errDetalle) throw new Error(errDetalle.message)

      for (const item of carrito) {
        const { data: invOrigen } = await supabase
          .from('inventario')
          .select('id, cantidad')
          .eq('sucursal_id', parseInt(origenId))
          .eq('producto_id', item.producto_id)
          .maybeSingle()

        const nuevaCantidad = Math.max(0, (invOrigen?.cantidad || 0) - item.cantidad)
        if (invOrigen) {
          await supabase
            .from('inventario')
            .update({ cantidad: nuevaCantidad })
            .eq('id', invOrigen.id)
        }

        const { data: invDest } = await supabase
          .from('inventario')
          .select('id, cantidad')
          .eq('sucursal_id', parseInt(destinoId))
          .eq('producto_id', item.producto_id)
          .maybeSingle()

        if (invDest) {
          await supabase
            .from('inventario')
            .update({ cantidad: (invDest.cantidad || 0) + item.cantidad })
            .eq('id', invDest.id)
        } else {
          await supabase
            .from('inventario')
            .insert({
              sucursal_id: parseInt(destinoId),
              producto_id: item.producto_id,
              cantidad: item.cantidad,
              minimo_alerta: 2,
              fecha_ingreso: new Date().toISOString(),
            })
        }
      }

      setMensaje('Despacho realizado exitosamente.')
      setCarrito([])
      setOrigenId('')
      setDestinoId('')
      setProductosOrigen([])
      fetchDespachos()
    } catch (err: any) {
      setMensaje(err.message || 'Error al realizar el despacho.')
    } finally {
      setCargando(false)
      setTimeout(() => setMensaje(''), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Despachos</h2>
      </div>

      {/* SELECTORES ORIGEN / DESTINO */}
      <div className="bg-white rounded border border-gray-200 p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-700">Nuevo Despacho</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal origen</label>
            <select
              value={origenId}
              onChange={(e) => { setOrigenId(e.target.value); if (e.target.value === destinoId) setDestinoId('') }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
            >
              <option value="">Seleccionar sucursal</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal destino</label>
            <select
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
            >
              <option value="">Seleccionar sucursal</option>
              {sucursales
                .filter((s) => s.id !== parseInt(origenId) || !origenId)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
            </select>
            {origenId && destinoId && origenId === destinoId && (
              <p className="text-xs text-red-600 mt-1">El origen y destino no pueden ser iguales.</p>
            )}
          </div>
        </div>
      </div>

      {/* TABLA DE PRODUCTOS DE ORIGEN */}
      {origenId && (
        <div className="bg-white rounded border border-gray-200 p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-700">
            Productos disponibles — {sucursalNombre(parseInt(origenId))}
          </h3>
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-700">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Stock disponible</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {productosOrigen.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 italic">
                      No hay productos disponibles en esta sucursal.
                    </td>
                  </tr>
                ) : (
                  productosOrigen.map((prod) => {
                    const enCarrito = carrito.find((c) => c.producto_id === prod.producto_id)
                    return (
                      <tr key={prod.producto_id} className="hover:bg-gray-50/50 ready-transition">
                        <td className="px-4 py-3 font-medium text-gray-900">{prod.nombre}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{prod.stock} unidades</td>
                        <td className="px-4 py-3 text-center">
                          {enCarrito ? (
                            <span className="text-xs font-semibold text-green-600">Agregado</span>
                          ) : (
                            <button
                              onClick={() => agregarAlCarrito(prod)}
                              className="rounded-sm bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all"
                            >
                              Agregar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CARRITO DE DESPACHO */}
      {carrito.length > 0 && (
        <div className="bg-white rounded border border-gray-200 p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-700">
            Productos a despachar ({carrito.length})
          </h3>
          <div className="space-y-3">
            {carrito.map((item) => (
              <div key={item.producto_id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.nombre}</p>
                  <p className="text-xs text-gray-500">Disponible: {item.stockDisponible}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                    className="w-7 h-7 border border-gray-200 rounded-sm bg-gray-50 text-xs font-bold hover:bg-gray-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.cantidad}
                    min={1}
                    max={item.stockDisponible}
                    onChange={(e) => actualizarCantidad(item.producto_id, parseInt(e.target.value) || 0)}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-xs text-center font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                    className="w-7 h-7 border border-gray-200 rounded-sm bg-gray-50 text-xs font-bold hover:bg-gray-100"
                  >
                    +
                  </button>
                  <button
                    onClick={() => quitarDelCarrito(item.producto_id)}
                    className="ml-2 text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500">
              Total: {carrito.reduce((acc, c) => acc + c.cantidad, 0)} unidades
            </p>
            <button
              onClick={confirmarDespacho}
              disabled={cargando || !destinoId || origenId === destinoId}
              className="rounded bg-gray-900 px-6 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {cargando ? 'Procesando...' : 'Realizar despacho'}
            </button>
          </div>
        </div>
      )}

      {mensaje && (
        <p className={`text-sm font-medium ${mensaje.includes('Error') || mensaje.includes('error') ? 'text-red-600' : 'text-green-700'}`}>
          {mensaje}
        </p>
      )}

      {/* HISTORIAL DE DESPACHOS */}
      <div className="bg-white rounded border border-gray-200 p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-700">Historial de Despachos</h3>

        {/* FILTROS — mismo sistema que Ventas */}
        <div className="bg-white border border-gray-200 rounded-sm p-4 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Filtros - Historial por Día / Mes / Año
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
              <select
                value={filtroSucursal}
                onChange={(e) => { setFiltroSucursal(e.target.value); setFiltroDay(''); }}
                className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
              >
                <option value="all" className="text-gray-900 bg-white">Todas las Sucursales</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id} className="text-gray-900 bg-white">{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
              <select
                value={filtroYear}
                onChange={(e) => { setFiltroYear(e.target.value); setFiltroDay(''); }}
                className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="text-gray-900 bg-white">{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={filtroMonth}
                onChange={(e) => { setFiltroMonth(e.target.value); setFiltroDay(''); }}
                className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
              >
                <option value="" className="text-gray-900 bg-white">Todos los meses</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value} className="text-gray-900 bg-white">{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Día del Mes</label>
              <select
                value={filtroDay}
                disabled={!filtroMonth}
                onChange={(e) => setFiltroDay(e.target.value)}
                className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="" className="text-gray-900 bg-white">Todo el mes</option>
                {filtroMonth && Array.from({ length: new Date(parseInt(filtroYear), parseInt(filtroMonth), 0).getDate() }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)} className="text-gray-900 bg-white">{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABLA HISTORIAL */}
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-700">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Productos</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {cargandoHistorial ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando historial...</td>
                </tr>
              ) : despachos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                    No hay despachos registrados.
                  </td>
                </tr>
              ) : (
                despachos.map((d) => {
                  const expandido = expandedId === d.id
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/50 ready-transition">
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {new Date(d.fecha).toLocaleDateString('es-BO', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">
                        {sucursalNombre(d.sucursal_origen_id)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">
                        {sucursalNombre(d.sucursal_destino_id)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.usuarios?.nombre || '—'}</td>
                      <td className="px-4 py-3">
                        {d.detalle_despachos && d.detalle_despachos.length > 0 ? (
                          <div>
                            <button
                              onClick={() => setExpandedId(expandido ? null : d.id)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {expandido ? 'Ocultar' : `Ver detalle (${d.detalle_despachos.length})`}
                            </button>
                            {expandido && (
                              <div className="mt-2 space-y-1">
                                {d.detalle_despachos.map((det) => (
                                  <div key={det.id} className="text-[10px] text-gray-600">
                                    • {det.productos?.nombre || 'Producto'} x{det.cantidad}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-bold ${
                          d.estado === 'completado'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}>
                          {d.estado}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
