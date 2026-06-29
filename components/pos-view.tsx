'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Producto {
  id: number
  nombre: string
  precio: number
}

interface Sucursal {
  id: number
  nombre: string
}

interface CarritoItem {
  producto: Producto
  cantidad: number
}

interface StockReal {
  producto_id: number
  nombre: string
  cantidad: number
}

type EstadoCaja = 'apertura_pendiente' | 'vendiendo' | 'cerrado'

export default function PosView() {
  const [usuario, setUsuario] = useState<any>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [estado, setEstado] = useState<EstadoCaja>('apertura_pendiente')
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'qr'>('efectivo')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  // Control de inputs temporales (permite borrar y sobreescribir fácilmente en celulares)
  const [valoresInputs, setValoresInputs] = useState<Record<number, string>>({})
  const [stockSucursal, setStockSucursal] = useState<StockReal[]>([])
  const [cierreConfirmadoHoy, setCierreConfirmadoHoy] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (stored) setUsuario(JSON.parse(stored))
    fetchProductos()
    fetchSucursales()
  }, [])

  useEffect(() => {
    if (!sucursalId) return
    setCarrito([])
    setCierreConfirmadoHoy(false)
    verificarEstado()
  }, [sucursalId])

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('nombre')
    if (data) setProductos(data)
  }

  const fetchSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('*').order('nombre')
    if (data) setSucursales(data)
  }

  const verificarEstado = async () => {
    if (!sucursalId) return
    const hoy = new Date().toISOString().split('T')[0]

    // Validar Apertura
    const { data: apertura } = await supabase
      .from('registros_diarios')
      .select('id, snapshot_stock')
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoy)
      .eq('tipo', 'apertura')
      .maybeSingle()

    if (!apertura) {
      setEstado('apertura_pendiente')
      await cargarStockSugerido(null)
      return
    }

    // Validar Cierre
    const { data: cierre } = await supabase
      .from('registros_diarios')
      .select('id, snapshot_stock')
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoy)
      .eq('tipo', 'cierre')
      .maybeSingle()

    if (cierre) {
      setEstado('cerrado')
      setCierreConfirmadoHoy(true)
      // Cargar la foto fija del cierre guardado para visualización estricta
      await mapearSnapshotAEstado(cierre.snapshot_stock)
    } else {
      setEstado('vendiendo')
      await cargarStockSugerido(null)
    }
  }

  const cargarStockSugerido = async (snapshotPrevio: any) => {
    if (!sucursalId) return

    // Si pasamos un snapshot previo (Rollback), usamos esos datos directamente
    if (snapshotPrevio) {
      await mapearSnapshotAEstado(snapshotPrevio)
      return
    }

    // De lo contrario, lee el Stock Vivo actual de la tabla inventario
    const { data: invData } = await supabase
      .from('inventario')
      .select('producto_id, cantidad')
      .eq('sucursal_id', sucursalId)

    const mapaInventario = new Map<number, number>()
    if (invData) {
      invData.forEach((item: any) => mapaInventario.set(item.producto_id, item.cantidad))
    }

    const { data: prods } = await supabase.from('productos').select('id, nombre').order('nombre')
    const catalogo = prods || []

    const listadoFinal: StockReal[] = catalogo.map((p) => ({
      producto_id: p.id,
      nombre: p.nombre,
      cantidad: mapaInventario.get(p.id) ?? 0
    }))

    setStockSucursal(listadoFinal)

    // Inicializar inputs editables con el stock real como sugerido
    const inputsIniciales: Record<number, string> = {}
    listadoFinal.forEach(item => {
      inputsIniciales[item.producto_id] = String(item.cantidad)
    })
    setValoresInputs(inputsIniciales)
  }

  const mapearSnapshotAEstado = async (snapshot: any) => {
    const snap = (snapshot as Record<string, number>) || {}
    const { data: prods } = await supabase.from('productos').select('id, nombre').order('nombre')
    const catalogo = prods || []

    const listadoFinal: StockReal[] = catalogo.map((p) => ({
      producto_id: p.id,
      nombre: p.nombre,
      cantidad: snap[String(p.id)] ?? 0
    }))

    setStockSucursal(listadoFinal)
    const inputs: Record<number, string> = {}
    listadoFinal.forEach(item => { inputs[item.producto_id] = String(item.cantidad) })
    setValoresInputs(inputs)
  }

  const handleInputChange = (productoId: number, valor: string) => {
    // Permite que el input esté completamente vacío en celulares sin clavar un '0' molesto
    setValoresInputs(prev => ({ ...prev, [productoId]: valor }))
  }

  const iniciarDia = async () => {
    if (!sucursalId) return
    setCargando(true)
    const hoy = new Date().toISOString().split('T')[0]

    const snapshotFinal: Record<string, number> = {}
    stockSucursal.forEach(item => {
      const valorInput = valoresInputs[item.producto_id]
      snapshotFinal[String(item.producto_id)] = valorInput === '' ? 0 : Number(valorInput)
    })

    const { error: errReg } = await supabase.from('registros_diarios').insert({
      sucursal_id: sucursalId,
      usuario_id: usuario?.id || null,
      fecha: hoy,
      tipo: 'apertura',
      snapshot_stock: snapshotFinal,
      observaciones: 'Apertura con confirmación/modificación manual.',
    })

    if (errReg) {
      setMensaje('Error al registrar apertura')
      setCargando(false)
      return
    }

    // Actualizar la tabla de inventario vivo con los números manuales que definió la apertura
    for (const [prodId, cant] of Object.entries(snapshotFinal)) {
      const { data: exist } = await supabase
        .from('inventario')
        .select('id')
        .eq('sucursal_id', sucursalId)
        .eq('producto_id', Number(prodId))
        .maybeSingle()

      if (exist) {
        await supabase.from('inventario').update({ cantidad: cant }).eq('id', exist.id)
      } else {
        await supabase.from('inventario').insert({
          sucursal_id: sucursalId,
          producto_id: Number(prodId),
          cantidad: cant,
          minimo_alerta: 0,
          fecha_ingreso: new Date().toISOString()
        })
      }
    }

    setMensaje('Jornada iniciada con éxito')
    setEstado('vendiendo')
    await cargarStockSugerido(null)
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const agregarAlCarrito = (producto: Producto) => {
    const stockDisponible = stockSucursal.find(s => s.producto_id === producto.id)?.cantidad ?? 0
    const itemEnCarrito = carrito.find(item => item.producto.id === producto.id)
    const cantidadActualEnCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0

    if (cantidadActualEnCarrito >= stockDisponible) {
      alert(`No hay stock suficiente en inventario vivo (${stockDisponible} disp.)`)
      return
    }

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
    if (!sucursalId || carrito.length === 0) return
    setCargando(true)

    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert({
        sucursal_id: sucursalId,
        usuario_id: usuario?.id || null,
        total,
        estado: 'activa',
        metodo_pago: metodoPago,
        fecha: new Date().toISOString(),
      })
      .select().single()

    if (errorVenta || !venta) {
      setMensaje('Error al registrar venta')
      setCargando(false)
      return
    }

    const detalles = carrito.map((item) => ({
      venta_id: venta.id,
      producto_id: item.producto.id,
      cantidad: item.cantidad,
      subtotal: item.producto.precio * item.cantidad,
    }))

    await supabase.from('detalle_ventas').insert(detalles)

    for (const item of carrito) {
      const { data: inv } = await supabase
        .from('inventario')
        .select('id, cantidad')
        .eq('sucursal_id', sucursalId)
        .eq('producto_id', item.producto.id)
        .maybeSingle()

      if (inv) {
        await supabase
          .from('inventario')
          .update({ cantidad: Math.max(0, inv.cantidad - item.cantidad) })
          .eq('id', inv.id)
      }
    }

    setMensaje('Venta realizada')
    setCarrito([])
    await cargarStockSugerido(null)
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const irAlCierreDeDia = async () => {
    await cargarStockSugerido(null)
    setEstado('cerrado')
  }

  const confirmarCierre = async () => {
    if (!sucursalId) return
    setCargando(true)
    const hoy = new Date().toISOString().split('T')[0]

    const snapshotFinal: Record<string, number> = {}
    stockSucursal.forEach(item => {
      const valorInput = valoresInputs[item.producto_id]
      snapshotFinal[String(item.producto_id)] = valorInput === '' ? 0 : Number(valorInput)
    })

    const { error: errReg } = await supabase.from('registros_diarios').insert({
      sucursal_id: sucursalId,
      usuario_id: usuario?.id || null,
      fecha: hoy,
      tipo: 'cierre',
      snapshot_stock: snapshotFinal,
      observaciones: 'Cierre general con revisión/ajuste manual.',
    })

    if (errReg) {
      setMensaje('Error al guardar cierre')
      setCargando(false)
      return
    }

    // Actualizamos el inventario vivo de la sucursal para que coincida exactamente con lo cerrado manualmente
    for (const [prodId, cant] of Object.entries(snapshotFinal)) {
      await supabase
        .from('inventario')
        .update({ cantidad: cant })
        .eq('sucursal_id', sucursalId)
        .eq('producto_id', Number(prodId))
    }

    setMensaje('Jornada cerrada de forma definitiva.')
    setCierreConfirmadoHoy(true)
    setCargando(false)
  }

  // FUNCIÓN DE ROLLBACK: Borra los registros diarios de hoy para reiniciar la jornada
  const ejecutarRollbackJornada = async () => {
    if (!sucursalId) return
    const seguro = confirm('¿Está completamente seguro de restaurar y volver al inicio del día? Esto eliminará la foto de cierre/apertura guardada hoy para esta sucursal.')
    if (!seguro) return

    setCargando(true)
    const hoy = new Date().toISOString().split('T')[0]

    // 1. Intentar leer la apertura original por si deseamos re-sugerirla
    const { data: aperturaOriginal } = await supabase
      .from('registros_diarios')
      .select('snapshot_stock')
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoy)
      .eq('tipo', 'apertura')
      .maybeSingle()

    // 2. Eliminar registros diarios de hoy (Aperturas y Cierres)
    await supabase
      .from('registros_diarios')
      .delete()
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoy)

    setMensaje('Efectuando reversión de caja...')
    setCierreConfirmadoHoy(false)
    setEstado('apertura_pendiente')

    // Si ya había una apertura, restauramos su foto original, sino cargamos el stock de inventario vivo
    await cargarStockSugerido(aperturaOriginal?.snapshot_stock || null)
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  return (
    <div className="space-y-6 text-gray-900 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Punto de Venta</h2>
        {usuario && <p className="text-xs font-semibold bg-gray-100 px-2.5 py-1 text-gray-700 rounded-sm">Operador: {usuario.nombre}</p>}
      </div>

      {/* Selector de Sucursal y Botón Rollback */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white border border-gray-200 p-4 rounded-sm">
        <div className="max-w-xs w-full">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Sucursal de Trabajo</label>
          <select
            value={sucursalId ?? ''}
            disabled={estado === 'vendiendo'}
            onChange={(e) => setSucursalId(e.target.value ? Number(e.target.value) : null)}
            className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400"
          >
            <option value="">Seleccione una sucursal</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        {sucursalId && (estado === 'cerrado' || estado === 'vendiendo') && (
          <button
            onClick={ejecutarRollbackJornada}
            disabled={cargando}
            className="rounded-sm border border-amber-300 bg-amber-50 px-4 h-9 text-xs font-semibold uppercase text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            Revertir / Reiniciar Jornada
          </button>
        )}
      </div>

      {mensaje && (
        <div className={`rounded-sm border p-4 ${mensaje.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <p className="text-sm font-medium">{mensaje}</p>
        </div>
      )}

      {/* VISTA 1: APERTURA (Con Modificación Manual Fluida en Celular) */}
      {estado === 'apertura_pendiente' && sucursalId && (
        <div className="border border-gray-200 bg-white p-6 rounded-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Apertura Manual de Jornada</h3>
            <p className="text-xs text-gray-500">Revise o modifique el inventario físico con el que abre la repostería hoy:</p>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden max-w-md">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2 text-right">Cantidad Inicial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stockSucursal.map((item) => (
                  <tr key={item.producto_id}>
                    <td className="px-4 py-2 text-gray-700 font-medium">{item.nombre}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        min="0"
                        value={valoresInputs[item.producto_id] ?? ''}
                        onFocus={(e) => e.target.select()} // Resalta todo el texto al tocarlo en celular
                        onChange={(e) => handleInputChange(item.producto_id, e.target.value)}
                        className="w-24 text-right border border-gray-300 rounded-sm px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-gray-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={iniciarDia}
            disabled={cargando}
            className="rounded-sm bg-gray-900 px-5 h-9 text-xs font-semibold uppercase tracking-wider text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {cargando ? 'Guardando Apertura...' : 'Confirmar Stock Inicial y Abrir Caja'}
          </button>
        </div>
      )}

      {/* VISTA 2: PUNTO DE VENTA (Ventas directas) */}
      {estado === 'vendiendo' && sucursalId && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={irAlCierreDeDia}
              className="rounded-sm border border-red-200 bg-red-50 px-4 h-9 text-xs font-semibold uppercase tracking-wider text-red-700 hover:bg-red-100"
            >
              Ir al Cierre de Día
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Catálogo</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {productos.map((producto) => {
                  const stockItem = stockSucursal.find(s => s.producto_id === producto.id);
                  const disponible = stockItem ? stockItem.cantidad : 0;

                  return (
                    <button
                      key={producto.id}
                      onClick={() => agregarAlCarrito(producto)}
                      disabled={disponible <= 0}
                      className="rounded-sm border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-400 disabled:opacity-40"
                    >
                      <p className="font-semibold text-sm text-gray-900">{producto.nombre}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs font-bold text-gray-600">Bs. {producto.precio}</span>
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-sm ${disponible > 0 ? 'bg-green-50 text-green-700' : 'bg-red-100 text-red-900 font-bold'}`}>
                          {disponible > 0 ? `Stock: ${disponible}` : 'Agotado'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Carrito */}
            <div className="rounded-sm border border-gray-200 bg-white p-4 space-y-4 h-fit">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Pedido</h3>
              {carrito.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Carrito vacío.</p>
              ) : (
                <div className="space-y-3">
                  {carrito.map((item) => (
                    <div key={item.producto.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{item.producto.nombre}</p>
                        <p className="text-[11px] text-gray-500">Bs. {item.producto.precio} x {item.cantidad}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => quitarDelCarrito(item.producto.id)} className="w-6 h-6 border border-gray-200 rounded-sm bg-gray-50 text-xs">-</button>
                        <span className="w-5 text-center text-xs font-bold">{item.cantidad}</span>
                        <button onClick={() => agregarAlCarrito(item.producto)} className="w-6 h-6 border border-gray-200 rounded-sm bg-gray-50 text-xs">+</button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-bold">
                    <span>Total:</span>
                    <span>Bs. {total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="block text-[11px] font-bold uppercase text-gray-400">Modalidad de Pago</label>
                <div className="flex gap-2">
                  <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 rounded-sm border h-8 text-xs font-semibold ${metodoPago === 'efectivo' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}>Efectivo</button>
                  <button onClick={() => setMetodoPago('qr')} className={`flex-1 rounded-sm border h-8 text-xs font-semibold ${metodoPago === 'qr' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}>QR</button>
                </div>
              </div>

              <button onClick={registrarVenta} disabled={carrito.length === 0 || cargando} className="w-full rounded-sm bg-blue-600 h-10 text-xs font-semibold uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-50">
                {cargando ? 'Procesando...' : 'Registrar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: CIERRE (Fijo si ya está confirmado, modificable si está pendiente) */}
      {estado === 'cerrado' && sucursalId && (
        <div className="border border-gray-200 bg-white p-6 rounded-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Resumen y Cierre de Jornada</h3>
              <p className="text-xs text-gray-500">
                {cierreConfirmadoHoy ? 'Historial de saldos inamovibles guardados para el cierre de hoy:' : 'Verifique o ajuste manualmente el remanente físico final antes de cerrar:'}
              </p>
            </div>
            {cierreConfirmadoHoy && (
              <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider border border-green-300">
                Cierre Bloqueado / Confirmado
              </span>
            )}
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden max-w-md">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2 text-right">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stockSucursal.map((item) => (
                  <tr key={item.producto_id}>
                    <td className="px-4 py-2 text-gray-700 font-medium">{item.nombre}</td>
                    <td className="px-4 py-2 text-right">
                      {cierreConfirmadoHoy ? (
                        <span className="font-bold text-gray-900 text-sm px-2 py-1 inline-block">{item.cantidad} unidades</span>
                      ) : (
                        <input
                          type="number"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          min="0"
                          value={valoresInputs[item.producto_id] ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleInputChange(item.producto_id, e.target.value)}
                          className="w-24 text-right border border-gray-300 rounded-sm px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-gray-500"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!cierreConfirmadoHoy && (
            <button
              onClick={confirmarCierre}
              disabled={cargando}
              className="rounded-sm bg-blue-600 px-5 h-9 text-xs font-semibold uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {cargando ? 'Guardando Cierre...' : 'Confirmar y Bloquear Jornada'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}