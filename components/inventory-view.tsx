'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface InventoryItem {
  id: number
  sucursal_id: number
  producto_id: number
  cantidad: number
  minimo_alerta: number
  fecha_ingreso: string
  productos: {
    id?: number
    nombre: string
    precio: number
  }
  sucursales?: {
    nombre: string
  }
}

interface ProductoCatalogo {
  id: number
  nombre: string
  precio: number
}

interface SucursalCatalogo {
  id: number
  nombre: string
}

interface Props {
  branchId: number | null
}

export default function InventoryView({ branchId }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [productos, setProductos] = useState<ProductoCatalogo[]>([])
  const [sucursales, setSucursales] = useState<SucursalCatalogo[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para Añadir Producto
  const [isAdding, setIsAdding] = useState(false)
  const [newProductoId, setNewProductoId] = useState('')
  const [newSucursalId, setNewSucursalId] = useState('')
  const [newPrecio, setNewPrecio] = useState('')
  const [newCantidad, setNewCantidad] = useState('0')
  const [newMinimo, setNewMinimo] = useState('2')

  // NUEVOS ESTADOS: Para controlar la edición en línea de la fila elegida
  // Buscador en tiempo real
  const [searchTerm, setSearchTerm] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editProductoId, setEditProductoId] = useState('')
  const [editSucursalId, setEditSucursalId] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editCantidad, setEditCantidad] = useState('')
  const [editMinimo, setEditMinimo] = useState('')

  useEffect(() => {
    fetchInventory()
    fetchCatalogos()
  }, [branchId])

  useEffect(() => {
    if (branchId) {
      setNewSucursalId(branchId.toString())
    } else {
      setNewSucursalId('')
    }
  }, [isAdding, branchId])

  const fetchCatalogos = async () => {
    const { data: prods } = await supabase.from('productos').select('id, nombre, precio').eq('activo', true)
    const { data: sucs } = await supabase.from('sucursales').select('id, nombre')
    if (prods) setProductos(prods)
    if (sucs) setSucursales(sucs.filter((s: any) => s.activo !== false))
  }

  const fetchInventory = async () => {
    setLoading(true)
    let query = supabase
      .from('inventario')
      .select('id, sucursal_id, producto_id, cantidad, minimo_alerta, fecha_ingreso, productos(id, nombre, precio, activo), sucursales(nombre)')

    if (branchId) {
      query = query.eq('sucursal_id', branchId)
    }

    const { data, error } = await query.order('id', { ascending: true })

    if (error) {
      console.error('Error fetching inventory:', error)
    } else if (data) {
      setInventory((data as any[]).filter((item: any) => item.productos?.activo !== false) as unknown as InventoryItem[])
    }
    setLoading(false)
  }

  // Activa el modo edición sobre una fila rellenando los estados con los datos que ya existen
  const startEditing = (item: InventoryItem) => {
    setEditingId(item.id)
    setEditProductoId(item.producto_id.toString())
    setEditSucursalId(item.sucursal_id.toString())
    setEditPrecio((item.productos?.precio || 0).toString())
    setEditCantidad(item.cantidad.toString())
    setEditMinimo((item.minimo_alerta ?? 2).toString())
  }

  // Maneja el cambio de producto dentro de la edición para auto-moldear el precio
  const handleSelectProductEditChange = (prodIdStr: string) => {
    setEditProductoId(prodIdStr)
    const prodSeleccionado = productos.find(p => p.id === parseInt(prodIdStr))
    if (prodSeleccionado) {
      setEditPrecio(prodSeleccionado.precio.toString())
    }
  }

  // GUARDA la fila modificada directamente en la base de datos
  const handleSaveEdit = async (id: number) => {
    if (!editProductoId || !editSucursalId) {
      alert('Por favor, complete todos los campos requeridos.')
      return
    }

    // Actualiza el precio del producto si se modificó en caliente
    if (editPrecio) {
      await supabase
        .from('productos')
        .update({ precio: parseFloat(editPrecio) })
        .eq('id', parseInt(editProductoId))
    }

    const { error } = await supabase
      .from('inventario')
      .update({
        producto_id: parseInt(editProductoId),
        sucursal_id: parseInt(editSucursalId),
        cantidad: parseInt(editCantidad) || 0,
        minimo_alerta: parseInt(editMinimo) || 2
      })
      .eq('id', id)

    if (error) {
      console.error('Error al actualizar registro:', error)
      alert('Error al guardar las modificaciones.')
    } else {
      setEditingId(null)
      fetchInventory()
    }
  }

  const handleDeleteInventory = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este producto por completo del inventario?')) {
      const { error } = await supabase.from('inventario').delete().eq('id', id)
      if (!error) setInventory(prev => prev.filter(item => item.id !== id))
    }
  }

  const handleSelectProductChange = (prodIdStr: string) => {
    setNewProductoId(prodIdStr)
    const prodSeleccionado = productos.find(p => p.id === parseInt(prodIdStr))
    if (prodSeleccionado) {
      setNewPrecio(prodSeleccionado.precio.toString())
    }
  }

  const handleSaveNewProduct = async () => {
    const sucursalDestino = branchId || parseInt(newSucursalId) || 1

    if (!newProductoId) {
      alert('Por favor, seleccione un producto válido de la lista.')
      return
    }

    if (newPrecio) {
      await supabase
        .from('productos')
        .update({ precio: parseFloat(newPrecio) })
        .eq('id', parseInt(newProductoId))
    }

    const { error } = await supabase
      .from('inventario')
      .insert([
        {
          sucursal_id: sucursalDestino,
          producto_id: parseInt(newProductoId),
          cantidad: parseInt(newCantidad) || 0,
          minimo_alerta: parseInt(newMinimo) || 2,
          fecha_ingreso: new Date().toISOString()
        }
      ])

    if (error) {
      console.error(error)
      alert('Error al guardar el artículo.')
    } else {
      setIsAdding(false)
      setNewProductoId('')
      setNewCantidad('0')
      setNewMinimo('2')
      fetchInventory()
    }
  }

  // Filtro en tiempo real sobre los datos ya cargados
  const filteredInventory = searchTerm
    ? inventory.filter(item =>
        item.productos?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : inventory

  return (
    <div className="rounded border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Control de Existencias y Frescura</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {branchId ? 'Vista por Sucursal Comercial' : 'Vista Corporativa Global (Todas las Sucursales)'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="rounded-sm bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800 ready-transition"
          >
            {isAdding ? 'Cancelar' : '+ Añadir Producto'}
          </button>

          <button onClick={fetchInventory} className="rounded-sm bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 ready-transition">
            Sincronizar
          </button>
        </div>
      </div>

      {/* Buscador en tiempo real */}
      <div className="border-b border-gray-100 px-6 py-3">
        <input
          type="text"
          placeholder="Buscar producto…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-700">
              <th className="px-6 py-3">Producto</th>
              <th className="px-6 py-3">Sucursal</th>
              <th className="px-6 py-3">Precio</th>
              <th className="px-6 py-3 w-44">Stock Físico</th>
              <th className="px-6 py-3">Alertas Operativas</th>
              <th className="px-6 py-3">Fecha de Ingreso</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">

            {/* Formulario Dinámico para Añadir Nuevo Producto */}
            {isAdding && (
              <tr className="bg-blue-50/40 border-b border-blue-100">
                <td className="px-6 py-3">
                  <select
                    value={newProductoId}
                    onChange={(e) => handleSelectProductChange(e.target.value)}
                    className="w-full rounded border border-gray-300 p-1.5 text-xs text-gray-900 bg-white font-medium focus:outline-none"
                  >
                    <option value="">-- Seleccionar --</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3">
                  <select
                    value={newSucursalId}
                    disabled={!!branchId}
                    onChange={(e) => setNewSucursalId(e.target.value)}
                    className="w-full rounded border border-gray-300 p-1.5 text-xs text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500 font-medium focus:outline-none"
                  >
                    <option value="">-- Sucursal --</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 font-medium">Bs.</span>
                    <input
                      type="number"
                      value={newPrecio}
                      onChange={(e) => setNewPrecio(e.target.value)}
                      className="w-20 rounded border border-gray-300 p-1.5 text-xs text-gray-900 bg-white font-bold focus:outline-none"
                    />
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-col gap-1">
                    <input
                      type="number"
                      value={newCantidad}
                      onChange={(e) => setNewCantidad(e.target.value)}
                      className="w-24 rounded border border-gray-300 p-1.5 text-xs text-gray-900 bg-white font-bold focus:outline-none"
                    />
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-gray-500">Mín:</span>
                      <input
                        type="number"
                        value={newMinimo}
                        onChange={(e) => setNewMinimo(e.target.value)}
                        className="w-12 rounded border border-gray-200 p-0.5 text-[10px] text-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3">
                  {(() => {
                    const cant = parseInt(newCantidad) || 0
                    const min = parseInt(newMinimo) || 2
                    return cant === 0 ? (
                      <span className="rounded-sm bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white border border-red-700">Agotado</span>
                    ) : cant <= min ? (
                      <span className="rounded-sm bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 border border-red-200">Agotándose</span>
                    ) : (
                      <span className="rounded-sm bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 border border-green-200">Normal</span>
                    )
                  })()}
                </td>
                <td className="px-6 py-3 text-xs text-gray-400 font-medium">Hoy</td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={handleSaveNewProduct}
                    className="rounded-sm bg-green-600 px-3 py-1 text-xs font-bold text-white hover:bg-green-700 active:scale-95 transition-all"
                  >
                    Guardar
                  </button>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Analizando vitrinas en tiempo real...</td>
              </tr>
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">
                  {searchTerm ? `No se encontraron resultados para "${searchTerm}".` : 'No hay productos vinculados.'}
                </td>
              </tr>
            ) : (
              filteredInventory.map((item) => {
                const ahora = new Date()
                const fechaIngreso = new Date(item.fecha_ingreso)
                const diasEnEstante = Math.floor((ahora.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24))

                // APARTADO NUEVO: RENDERIZAR FILA EN MODO EDICIÓN (Punto Solicitado)
                if (editingId === item.id) {
                  return (
                    <tr key={item.id} className="bg-amber-50/40 border-b border-amber-200">
                      {/* Producto modificable */}
                      <td className="px-6 py-3">
                        <select
                          value={editProductoId}
                          onChange={(e) => handleSelectProductEditChange(e.target.value)}
                          className="w-full rounded border border-gray-300 p-1.5 text-xs text-gray-900 bg-white font-medium focus:outline-none"
                        >
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </td>
                      {/* Sucursal modificable */}
                      <td className="px-6 py-3">
                        <select
                          value={editSucursalId}
                          onChange={(e) => setEditSucursalId(e.target.value)}
                          className="w-full rounded border border-gray-300 p-1.5 text-xs text-gray-900 bg-white font-medium focus:outline-none"
                        >
                          {sucursales.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                          ))}
                        </select>
                      </td>
                      {/* Precio modificable */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 font-medium">Bs.</span>
                          <input
                            type="number"
                            value={editPrecio}
                            onChange={(e) => setEditPrecio(e.target.value)}
                            className="w-20 rounded border border-gray-300 p-1.5 text-xs text-gray-900 bg-white font-bold focus:outline-none"
                          />
                        </div>
                      </td>
                      {/* Cantidad/Stock modificable */}
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            value={editCantidad}
                            onChange={(e) => setEditCantidad(e.target.value)}
                            className="w-24 rounded border border-gray-300 p-1.5 text-xs text-gray-900 bg-white font-bold focus:outline-none"
                          />
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-gray-500">Mín:</span>
                            <input
                              type="number"
                              value={editMinimo}
                              onChange={(e) => setEditMinimo(e.target.value)}
                              className="w-12 rounded border border-gray-200 p-0.5 text-[10px] text-gray-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      </td>
                      {/* Alerta interactiva automatizada sobre lo editado */}
                      <td className="px-6 py-3">
                        {(() => {
                          const cant = parseInt(editCantidad) || 0
                          const min = parseInt(editMinimo) || 2
                          return cant === 0 ? (
                            <span className="rounded-sm bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white border border-red-700">Agotado</span>
                          ) : cant <= min ? (
                            <span className="rounded-sm bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 border border-red-200">Agotándose</span>
                          ) : (
                            <span className="rounded-sm bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 border border-green-200">Normal</span>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-400 font-medium">Conservada</td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="rounded-sm bg-green-600 px-2 py-1 text-xs font-bold text-white hover:bg-green-700 active:scale-95 transition-all"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-sm bg-gray-200 px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-300 active:scale-95 transition-all"
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  )
                }

                // MODO VISTA NORMAL DE LAS FILAS
                const esAgotado = item.cantidad === 0
                const esAgotandose = item.cantidad <= (item.minimo_alerta ?? 2) && item.cantidad > 0
                const esAntiguo = diasEnEstante >= 4 && item.cantidad > 0

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 ready-transition">
                    <td className="px-6 py-4 font-medium text-gray-900 uppercase text-xs tracking-wide">
                      {item.productos?.nombre || '-'}
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase">
                      {item.sucursales?.nombre || '-'}
                    </td>

                    <td className="px-6 py-4 text-gray-600 font-medium">
                      Bs. {Number(item.productos?.precio || 0).toLocaleString('es-BO')}
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {item.cantidad} unidades
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {esAgotado ? (
                          <span className="rounded-sm bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white border border-red-700">
                            Agotado
                          </span>
                        ) : esAgotandose ? (
                          <span className="rounded-sm bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 border border-red-200">
                            Agotándose
                          </span>
                        ) : (
                          <span className="rounded-sm bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 border border-green-200">
                            Normal
                          </span>
                        )}

                        {esAntiguo && (
                          <span className="rounded-sm bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 border border-amber-200">
                            🕒 ESTANCADO ({diasEnEstante}d)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {fechaIngreso.toLocaleDateString('es-BO')} — Hace {diasEnEstante} {diasEnEstante === 1 ? 'día' : 'días'}
                    </td>

                    <td className="px-6 py-4 text-right text-xs font-semibold space-x-3">
                      <button
                        onClick={() => startEditing(item)}
                        className="text-blue-600 hover:text-blue-800 uppercase tracking-wider text-[11px] font-bold active:scale-95 transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteInventory(item.id)}
                        className="text-red-600 hover:text-red-800 uppercase tracking-wider text-[11px] font-bold active:scale-95 transition-all"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}