export interface DetalleVentaItem {
  cantidad: number
  producto: string
}

export interface VentaEnriquecida {
  id: string
  branch: string
  total: string
  method: string
  date: string
  estado: 'activa' | 'anulada'
  vendedor: string
  montoEfectivo?: number
  montoQr?: number
  subtotalOriginal?: number
  descuento?: number
  detalles?: DetalleVentaItem[]
}

export function mapearVenta(v: any): VentaEnriquecida {
  const detalles = ((v as any).detalle_ventas as any[])?.map((d: any) => ({
    cantidad: d.cantidad,
    producto: d.es_producto_manual ? d.nombre_manual : (d.productos?.nombre || 'Producto')
  })) || []

  return {
    id: String(v.id),
    branch: v.sucursales?.nombre || 'General',
    total: String(v.total),
    method: v.metodo_pago.toUpperCase(),
    date: new Date(v.fecha).toLocaleDateString('es-BO', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }),
    estado: v.estado,
    vendedor: v.usuarios?.nombre || 'Sin asignar',
    montoEfectivo: Number(v.monto_efectivo) || 0,
    montoQr: Number(v.monto_qr) || 0,
    subtotalOriginal: Number(v.subtotal_original) || 0,
    descuento: Number(v.descuento) || 0,
    detalles
  }
}
