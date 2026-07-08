'use client'

import { useState } from 'react'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  activeMenu: string
  onMenuSelect: (menu: string) => void
  rol?: string
}

export default function Sidebar({ isOpen, onToggle, activeMenu, onMenuSelect, rol }: SidebarProps) {
  const menuItems = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: 'Punto de Venta', value: 'pos' },
    { label: 'Ventas', value: 'ventas' },
    { label: 'Inventario', value: 'inventario' },
    ...(rol === 'admin' ? [{ label: 'Productos', value: 'productos' }] : []),
    { label: 'Configuración', value: 'configuracion' },
  ]

  return (
    <>
      {/* Sidebar - Desktop */}
      <aside className="hidden w-60 bg-gray-900 md:flex md:flex-col">
        {/* Logo Area */}
        <div className="flex h-16 items-center border-b border-gray-800 px-4">
          <div className="flex items-center gap-3 text-white">
            <span className="text-xl font-bold">RP</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => (
            <button
              key={item.value}
              onClick={() => onMenuSelect(item.value)}
              className={`w-full rounded px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeMenu === item.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-3">
          <button
            onClick={() => {
              localStorage.removeItem('usuario')
              window.location.href = '/login'
            }}
            className="w-full rounded bg-gray-800 px-3 py-2 text-center text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={(e) => e.currentTarget === e.target && onToggle()}>
          <aside className="h-full w-64 bg-gray-900">
            <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
              <div className="text-white">
                <div className="text-xl font-bold">RP</div>
              </div>
              <button
                onClick={() => onToggle()}
                className="text-gray-400 hover:text-white"
                aria-label="Close sidebar"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="space-y-2 px-3 py-6">
              {menuItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => onMenuSelect(item.value)}
                  className={`w-full rounded px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeMenu === item.value
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
