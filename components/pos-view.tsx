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

interface VentaLocal {
  id: string
  fecha: string
  total: number
  metodo_pago: string
  estado: string
  vendedor: string
}

interface JornadaActual {
  apertura: boolean
  cierre: boolean
  bloqueada: boolean
  snapshotApertura?: any
  snapshotCierre?: any
}

type SubPestañaPos = 'punto_venta' | 'historial_ventas'

const jornadaInicial: JornadaActual = {
  apertura: false,
  cierre: false,
  bloqueada: false,
}

export default function PosView() {
  const [usuario, setUsuario] = useState<any>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [jornadaActual, setJornadaActual] = useState<JornadaActual>(jornadaInicial)
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'qr'>('efectivo')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [pestañaActiva, setPestañaActiva] = useState<SubPestañaPos>('punto_venta')
  const [ventasDeHoy, setVentasDeHoy] = useState<VentaLocal[]>([])
  const [valoresInputs, setValoresInputs] = useState<Record<number, string>>({})
  const [stockSucursal, setStockSucursal] = useState<StockReal[]>([])
  const [stockJornada, setStockJornada] = useState<StockReal[]>([])
  const [modoCierreAdministrador, setModoCierreAdministrador] = useState(false)

  const esAdministradora = usuario?.rol === 'admin'
  const esVendedora = usuario?.rol === 'empleado'
  const puedeOperar = esAdministradora || esVendedora

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (stored) {
      const user = JSON.parse(stored)
      setUsuario(user)
      if (user.rol === 'empleado' && user.sucursal_id) {
        setSucursalId(user.sucursal_id)
      }
    }

    fetchProductos()
    fetchSucursales()
  }, [])

  useEffect(() => {
    limpiarEstadoLocal()

    if (!usuario || !sucursalId) return

    cargarEstadoJornada()
    fetchVentasLocalesHoy()
  }, [usuario, sucursalId])

  const hoyIso = () => new Date().toISOString().split('T')[0]

  const limpiarEstadoLocal = () => {
    setJornadaActual(jornadaInicial)
    setCarrito([])
    setMetodoPago('efectivo')
    setMensaje('')
    setPestañaActiva('punto_venta')
    setVentasDeHoy([])
    setValoresInputs({})
    setStockSucursal([])
    setStockJornada([])
    setModoCierreAdministrador(false)
  }

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*').eq('activo', true).order('nombre')
    if (data) setProductos(data)
  }

  const fetchSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('*').order('nombre')
    if (data) setSucursales(data)
  }

  const fetchVentasLocalesHoy = async () => {
    if (!sucursalId) return

    const hoy = hoyIso()
    const startOfToday = `${hoy}T00:00:00.000Z`

    const { data } = await supabase
      .from('ventas')
      .select('id, fecha, total, metodo_pago, estado, usuario_id, usuarios(nombre)')
      .eq('sucursal_id', sucursalId)
      .gte('fecha', startOfToday)
      .order('fecha', { ascending: false })

    if (data) {
      setVentasDeHoy(data.map(v => ({
        id: String(v.id),
        fecha: new Date(v.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
        total: Number(v.total),
        metodo_pago: v.metodo_pago === 'efectivo' ? 'Efectivo' : 'QR',
        estado: v.estado,
        vendedor: (v as any).usuarios?.nombre || 'Sin asignar',
      })))
    }
  }

  const cargarEstadoJornada = async () => {
    if (!sucursalId) return

    const { data } = await supabase
      .from('registros_diarios')
      .select('id, tipo, snapshot_stock')
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoyIso())
      .in('tipo', ['apertura', 'cierre'])

    const apertura = data?.find((registro: any) => registro.tipo === 'apertura')
    const cierre = data?.find((registro: any) => registro.tipo === 'cierre')
    const siguienteJornada: JornadaActual = {
      apertura: Boolean(apertura),
      cierre: Boolean(cierre),
      bloqueada: Boolean(cierre),
      snapshotApertura: apertura?.snapshot_stock,
      snapshotCierre: cierre?.snapshot_stock,
    }

    setJornadaActual(siguienteJornada)
    setModoCierreAdministrador(false)

    if (siguienteJornada.cierre) {
      const stockCierre = await obtenerListadoDesdeSnapshot(siguienteJornada.snapshotCierre)
      actualizarStockEditable(stockCierre)
      setStockJornada(stockCierre)
      return
    }

    if (siguienteJornada.apertura) {
      setStockJornada(await obtenerListadoDesdeSnapshot(siguienteJornada.snapshotApertura))
      await cargarStockSugerido(null)
      return
    }

    await cargarStockSugeridoDeUltimoCierre()
  }

  const cargarStockSugeridoDeUltimoCierre = async () => {
    if (!sucursalId) return

    const { data: ultimoCierre } = await supabase
      .from('registros_diarios')
      .select('snapshot_stock')
      .eq('sucursal_id', sucursalId)
      .eq('tipo', 'cierre')
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ultimoCierre?.snapshot_stock) {
      const stockSugerido = await obtenerListadoDesdeSnapshot(ultimoCierre.snapshot_stock)
      actualizarStockEditable(stockSugerido)
      setStockJornada(stockSugerido)
      return
    }

    await cargarStockSugerido(null, true)
  }

  const cargarStockSugerido = async (snapshotPrevio: any, actualizarJornada = false) => {
    if (!sucursalId) return

    if (snapshotPrevio) {
      const listadoSnapshot = await obtenerListadoDesdeSnapshot(snapshotPrevio)
      actualizarStockEditable(listadoSnapshot)
      if (actualizarJornada) setStockJornada(listadoSnapshot)
      return
    }

    const { data: invData } = await supabase
      .from('inventario')
      .select('producto_id, cantidad')
      .eq('sucursal_id', sucursalId)

    const mapaInventario = new Map<number, number>()
    if (invData) {
      invData.forEach((item: any) => mapaInventario.set(item.producto_id, item.cantidad))
    }

    const { data: prods } = await supabase.from('productos').select('id, nombre').eq('activo', true).order('nombre')
    const catalogo = prods || []
    const listadoFinal: StockReal[] = catalogo.map((p) => ({
      producto_id: p.id,
      nombre: p.nombre,
      cantidad: mapaInventario.get(p.id) ?? 0,
    }))

    actualizarStockEditable(listadoFinal)
    if (actualizarJornada) setStockJornada(listadoFinal)
  }

  const mapearSnapshotAEstado = async (snapshot: any) => {
    actualizarStockEditable(await obtenerListadoDesdeSnapshot(snapshot))
  }

  const obtenerListadoDesdeSnapshot = async (snapshot: any) => {
    const snap = (snapshot as Record<string, number>) || {}
    const { data: prods } = await supabase.from('productos').select('id, nombre').eq('activo', true).order('nombre')
    const catalogo = prods || []

    return catalogo.map((p) => ({
      producto_id: p.id,
      nombre: p.nombre,
      cantidad: snap[String(p.id)] ?? 0,
    }))
  }

  const actualizarStockEditable = (listado: StockReal[]) => {
    setStockSucursal(listado)

    const inputs: Record<number, string> = {}
    listado.forEach(item => {
      inputs[item.producto_id] = String(item.cantidad)
    })
    setValoresInputs(inputs)
  }

  const crearSnapshotDesdeInputs = () => {
    const snapshotFinal: Record<string, number> = {}
    stockSucursal.forEach(item => {
      const valorInput = valoresInputs[item.producto_id]
      snapshotFinal[String(item.producto_id)] = valorInput === '' ? 0 : Number(valorInput)
    })
    return snapshotFinal
  }

  const sincronizarInventario = async (snapshot: Record<string, number>) => {
    if (!sucursalId) return

    for (const [prodId, cant] of Object.entries(snapshot)) {
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
          fecha_ingreso: new Date().toISOString(),
        })
      }
    }
  }

  const handleInputChange = (productoId: number, valor: string) => {
    setValoresInputs(prev => ({ ...prev, [productoId]: valor }))
  }

  const cantidadEnCarrito = (productoId: number) => (
    carrito.find(item => item.producto.id === productoId)?.cantidad ?? 0
  )

  const obtenerStockActual = (productoId: number) => (
    stockSucursal.find(s => s.producto_id === productoId)?.cantidad ?? 0
  )

  const calcularStockDisponible = (productoId: number) => {
    const stockActual = obtenerStockActual(productoId)
    return Math.max(0, stockActual - cantidadEnCarrito(productoId))
  }

  const iniciarDia = async () => {
    if (!sucursalId || !puedeOperar) {
      setMensaje('Permiso denegado: solo usuarios autorizados pueden iniciar la jornada')
      return
    }

    setCargando(true)
    const snapshotFinal = crearSnapshotDesdeInputs()

    const { data: registros } = await supabase
      .from('registros_diarios')
      .select('id, tipo')
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoyIso())
      .in('tipo', ['apertura', 'cierre'])

    if (registros?.some((registro: any) => registro.tipo === 'apertura')) {
      setMensaje('La jornada ya fue abierta')
      await cargarEstadoJornada()
      setCargando(false)
      return
    }

    const { error: errReg } = await supabase.from('registros_diarios').insert({
      sucursal_id: sucursalId,
      usuario_id: usuario?.id || null,
      fecha: hoyIso(),
      tipo: 'apertura',
      snapshot_stock: snapshotFinal,
      observaciones: 'Apertura con confirmación/modificación manual basada en cierre previo.',
    })

    if (errReg) {
      setMensaje('Error al registrar apertura')
      setCargando(false)
      return
    }

    await sincronizarInventario(snapshotFinal)
    setMensaje('Jornada iniciada con éxito')
    await cargarEstadoJornada()
    await fetchVentasLocalesHoy()
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const agregarAlCarrito = (producto: Producto) => {
    if (!puedeOperar || !jornadaActual.apertura || jornadaActual.bloqueada) return

    const stockDisponible = calcularStockDisponible(producto.id)

    if (stockDisponible <= 0) {
      alert('No hay stock suficiente en inventario vivo (0 disp.)')
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
    if (!puedeOperar || jornadaActual.bloqueada) return

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
    if (!sucursalId || carrito.length === 0 || !puedeOperar) {
      setMensaje('Permiso denegado: solo usuarios autorizados pueden registrar ventas')
      return
    }

    if (!jornadaActual.apertura || jornadaActual.bloqueada) {
      setMensaje('La jornada no permite registrar ventas')
      await cargarEstadoJornada()
      return
    }

    setCargando(true)

    for (const item of carrito) {
      if (item.cantidad > obtenerStockActual(item.producto.id)) {
        setMensaje('No hay stock suficiente para confirmar la venta')
        setCargando(false)
        return
      }
    }

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
        .maybeSingle()

      if (inv) {
        await supabase
          .from('inventario')
          .update({ cantidad: Math.max(0, inv.cantidad - item.cantidad) })
          .eq('id', inv.id)
      }
    }

    setMensaje('Venta realizada')
    await cargarEstadoJornada()
    setCarrito([])
    await fetchVentasLocalesHoy()
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const prepararCierreAdministrador = async () => {
    if (!esAdministradora) return
    await cargarStockSugerido(null)
    setModoCierreAdministrador(true)
  }

  const cancelarCierreAdministrador = async () => {
    setModoCierreAdministrador(false)
    await cargarEstadoJornada()
  }

  const confirmarCierre = async () => {
    if (!sucursalId || !esAdministradora) {
      setMensaje('Permiso denegado: solo la administradora puede confirmar el cierre')
      return
    }

    if (!jornadaActual.apertura) {
      setMensaje('No existe apertura para cerrar esta jornada')
      await cargarEstadoJornada()
      return
    }

    setCargando(true)
    const snapshotFinal = crearSnapshotDesdeInputs()

    const { data: cierreExistente } = await supabase
      .from('registros_diarios')
      .select('id')
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoyIso())
      .eq('tipo', 'cierre')
      .maybeSingle()

    if (cierreExistente) {
      setMensaje('La jornada ya tiene un cierre confirmado')
      await cargarEstadoJornada()
      setCargando(false)
      return
    }

    const { error: errReg } = await supabase.from('registros_diarios').insert({
      sucursal_id: sucursalId,
      usuario_id: usuario?.id || null,
      fecha: hoyIso(),
      tipo: 'cierre',
      snapshot_stock: snapshotFinal,
      observaciones: 'Cierre general con revisión/ajuste manual.',
    })

    if (errReg) {
      setMensaje('Error al guardar cierre')
      setCargando(false)
      return
    }

    await sincronizarInventario(snapshotFinal)
    setMensaje('Jornada cerrada de forma definitiva.')
    await cargarEstadoJornada()
    await fetchVentasLocalesHoy()
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const ejecutarRollbackJornada = async () => {
    if (!sucursalId || !esAdministradora) {
      setMensaje('Permiso denegado: solo la administradora puede ejecutar rollback')
      return
    }

    const seguro = confirm('¿Está seguro de restaurar el estado? Esto eliminará las fotos guardadas de hoy para reabrir los procesos.')
    if (!seguro) return

    setCargando(true)

    await supabase
      .from('registros_diarios')
      .delete()
      .eq('sucursal_id', sucursalId)
      .eq('fecha', hoyIso())

    setMensaje('Efectuando reversión...')
    await cargarEstadoJornada()
    await fetchVentasLocalesHoy()
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  const renderHeader = (mostrarPestañas: boolean) => (
    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Punto de Venta</h2>
        {usuario && <p className="text-xs text-gray-500 mt-0.5">Operador asignado: <strong className="text-gray-700">{usuario.nombre}</strong></p>}
      </div>

      {mostrarPestañas && sucursalId && jornadaActual.apertura && !jornadaActual.bloqueada && (
        <div className="flex bg-gray-100 p-0.5 rounded-sm border border-gray-200">
          <button
            onClick={() => setPestañaActiva('punto_venta')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${pestañaActiva === 'punto_venta' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            🛒 Caja / POS
          </button>
          <button
            onClick={() => setPestañaActiva('historial_ventas')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all relative ${pestañaActiva === 'historial_ventas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            📋 Ventas de Hoy
            {ventasDeHoy.length > 0 && (
              <span className="ml-1.5 bg-blue-600 text-white font-mono text-[10px] px-1 rounded-full">{ventasDeHoy.length}</span>
            )}
          </button>
        </div>
      )}
    </div>
  )

  const renderSelectorSucursal = (mostrarRollback: boolean, bloquearSelector: boolean) => (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white border border-gray-200 p-4 rounded-sm">
      <div className="max-w-xs w-full">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Sucursal Activa</label>
        <select
          value={sucursalId ?? ''}
          disabled={bloquearSelector}
          onChange={(e) => setSucursalId(e.target.value ? Number(e.target.value) : null)}
          className="w-full text-sm bg-white text-gray-900 border border-gray-200 h-9 px-2 rounded-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-50"
        >
          <option value="">Seleccione sucursal...</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {mostrarRollback && sucursalId && (jornadaActual.apertura || jornadaActual.cierre) && (
        <button
          onClick={ejecutarRollbackJornada}
          disabled={cargando}
          className="rounded-sm border border-amber-300 bg-amber-50 px-4 h-9 text-xs font-semibold uppercase text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          Revertir / Reiniciar Jornada
        </button>
      )}
    </div>
  )

  const renderMensaje = () => mensaje && (
    <div className={`rounded-sm border p-4 ${mensaje.includes('Error') || mensaje.includes('denegado') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
      <p className="text-sm font-medium">{mensaje}</p>
    </div>
  )

  const renderTablaStockEditable = (tituloCantidad: string, bloqueada: boolean) => (
    <div className="border border-gray-200 rounded-sm overflow-hidden max-w-md">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2 text-right">{tituloCantidad}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stockSucursal.map((item) => (
            <tr key={item.producto_id}>
              <td className="px-4 py-2 text-gray-700 font-medium">{item.nombre}</td>
              <td className="px-4 py-2 text-right">
                {bloqueada ? (
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
  )

  const renderInventarioJornada = () => (
    <div className="border border-gray-200 bg-white p-6 rounded-sm space-y-4">
      <div className="border-b border-gray-100 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Inventario del Día</h3>
        <p className="text-xs text-gray-500">
          {jornadaActual.cierre ? 'Snapshot final confirmado para esta jornada:' : 'Snapshot inicial confirmado para esta jornada:'}
        </p>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-hidden max-w-md">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2 text-right">Cantidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stockJornada.map((item) => (
              <tr key={item.producto_id}>
                <td className="px-4 py-2 text-gray-700 font-medium">{item.nombre}</td>
                <td className="px-4 py-2 text-right font-bold text-gray-900">{item.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderApertura = () => (
    <div className="border border-gray-200 bg-white p-6 rounded-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Apertura e Inicio de Jornada</h3>
          <p className="text-xs text-gray-500">Los números iniciales se precargaron automáticamente del inventario físico remanente:</p>
        </div>
      </div>

      {renderTablaStockEditable('Cantidad Inicial', false)}

      <button
        onClick={iniciarDia}
        disabled={cargando}
        className="rounded-sm bg-gray-900 px-5 h-9 text-xs font-semibold uppercase tracking-wider text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {cargando ? 'Registrando Apertura...' : 'Confirmar Inventario de Inicio y Abrir Caja'}
      </button>
    </div>
  )

  const renderHistorialVentas = (titulo = 'Mis Ventas de Hoy', descripcion = 'Transacciones completadas en esta caja durante el turno actual.') => (
    <div className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">{titulo}</h3>
        <p className="text-xs text-gray-500">{descripcion}</p>
      </div>

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
              <th className="px-4 py-3">Código / ID</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Método Pago</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ventasDeHoy.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">
                  Aún no hay ventas registradas este día.
                </td>
              </tr>
            ) : (
              ventasDeHoy.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">#{v.id}</td>
                  <td className="px-4 py-3 text-gray-600">{v.fecha}</td>
                  <td className="px-4 py-3 text-gray-600">{v.vendedor}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{v.metodo_pago}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">Bs. {v.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-bold ${v.estado === 'activa' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                      {v.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderPuntoVenta = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-3 rounded-sm">
        <span className="text-xs text-blue-800 font-medium">📸 Foto de apertura guardada con éxito. Registrando ventas activas.</span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1 lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Catálogo de Repostería</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {productos.map((producto) => {
              const disponible = calcularStockDisponible(producto.id)

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
              )
            })}
          </div>
        </div>

        <div className="rounded-sm border border-gray-200 bg-white p-4 space-y-4 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Pedido Actual</h3>
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
                    <button onClick={() => agregarAlCarrito(item.producto)} disabled={calcularStockDisponible(item.producto.id) <= 0} className="w-6 h-6 border border-gray-200 rounded-sm bg-gray-50 text-xs disabled:opacity-40">+</button>
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
  )

  const renderCierreAdministrador = () => {
    const cierreConfirmado = jornadaActual.cierre

    return (
      <div className="border border-gray-200 bg-white p-6 rounded-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Resumen y Cierre de Jornada</h3>
            <p className="text-xs text-gray-500">
              {cierreConfirmado ? 'Historial de saldos inamovibles guardados para el cierre de hoy:' : 'Verifique o ajuste manualmente el remanente físico final antes de cerrar:'}
            </p>
          </div>
          {cierreConfirmado && (
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider border border-green-300">
              Cierre Bloqueado / Confirmado
            </span>
          )}
        </div>

        {renderTablaStockEditable('Saldo Final', cierreConfirmado)}

        {!cierreConfirmado && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={confirmarCierre}
              disabled={cargando}
              className="rounded-sm bg-blue-600 px-5 h-9 text-xs font-semibold uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {cargando ? 'Guardando Cierre...' : 'Confirmar y Bloquear Jornada'}
            </button>
            <button
              onClick={cancelarCierreAdministrador}
              disabled={cargando}
              className="rounded-sm border border-gray-200 bg-white px-5 h-9 text-xs font-semibold uppercase tracking-wider text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderJornadaOperativa = (mensajeEstado: string, mostrarAccionCierre: boolean) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-3 rounded-sm">
        <span className="text-xs text-blue-800 font-medium">{mensajeEstado}</span>
        {mostrarAccionCierre && (
          <button
            onClick={prepararCierreAdministrador}
            disabled={cargando}
            className="rounded-sm border border-red-200 bg-red-50 px-4 h-8 text-xs font-semibold uppercase tracking-wider text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Ir al Cierre de Día
          </button>
        )}
      </div>
      {renderInventarioJornada()}
      {renderPuntoVenta()}
      {renderHistorialVentas('Ventas de Hoy', 'Transacciones completadas en esta sucursal durante la jornada actual.')}
    </div>
  )

  const renderVistaVendedora = () => (
    <div className="space-y-6 text-gray-900 pb-12">
      {renderHeader(true)}
      {renderSelectorSucursal(false, Boolean(jornadaActual.apertura))}
      {renderMensaje()}

      {!sucursalId && (
        <div className="bg-white border border-gray-200 rounded-sm p-6 text-sm text-gray-500">Seleccione una sucursal para operar.</div>
      )}

      {sucursalId && jornadaActual.bloqueada && (
        <>
          <div className="border border-gray-200 bg-white p-8 rounded-sm text-center">
            <p className="text-sm font-bold text-gray-900">Jornada Cerrada.</p>
            <p className="text-sm text-gray-600 mt-1">No se pueden realizar más operaciones hoy.</p>
          </div>
          {renderInventarioJornada()}
          {renderHistorialVentas('Ventas de Hoy', 'Transacciones completadas en esta sucursal durante la jornada actual.')}
        </>
      )}

      {sucursalId && !jornadaActual.bloqueada && !jornadaActual.apertura && renderApertura()}

      {sucursalId && !jornadaActual.bloqueada && jornadaActual.apertura && (
        renderJornadaOperativa('📸 Foto de apertura guardada con éxito. Registrando ventas activas.', false)
      )}
    </div>
  )

  const renderVistaAdministradora = () => (
    <div className="space-y-6 text-gray-900 pb-12">
      {renderHeader(true)}
      {renderSelectorSucursal(true, false)}
      {renderMensaje()}

      {!sucursalId && (
        <div className="bg-white border border-gray-200 rounded-sm p-6 text-sm text-gray-500">Seleccione una sucursal para revisar la jornada.</div>
      )}

      {sucursalId && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-sm border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Apertura</p>
            <p className={`mt-2 text-sm font-bold ${jornadaActual.apertura ? 'text-green-700' : 'text-amber-700'}`}>
              {jornadaActual.apertura ? 'Confirmada' : 'Pendiente'}
            </p>
          </div>
          <div className="rounded-sm border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Cierre</p>
            <p className={`mt-2 text-sm font-bold ${jornadaActual.cierre ? 'text-green-700' : 'text-gray-700'}`}>
              {jornadaActual.cierre ? 'Confirmado' : 'Sin confirmar'}
            </p>
          </div>
          <div className="rounded-sm border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Ventas de Hoy</p>
            <p className="mt-2 text-sm font-bold text-blue-700">{ventasDeHoy.length} transacciones</p>
          </div>
        </div>
      )}

      {sucursalId && !jornadaActual.apertura && (
        renderApertura()
      )}

      {sucursalId && jornadaActual.apertura && !jornadaActual.cierre && !modoCierreAdministrador && (
        renderJornadaOperativa('📸 Foto de apertura guardada con éxito. La administradora puede revisar ventas y cerrar la jornada.', true)
      )}

      {sucursalId && jornadaActual.apertura && jornadaActual.cierre && renderInventarioJornada()}

      {sucursalId && jornadaActual.apertura && (jornadaActual.cierre || modoCierreAdministrador) && renderCierreAdministrador()}
    </div>
  )

  if (esAdministradora) return renderVistaAdministradora()
  return renderVistaVendedora()
}
