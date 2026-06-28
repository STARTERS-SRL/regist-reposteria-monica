'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Branch {
  id: number
  nombre: string
}

interface HeaderProps {
  selectedBranchId: number | null
  onBranchChange: (branchId: number | null) => void
  onSidebarToggle: () => void
}

export default function Header({ selectedBranchId, onBranchChange, onSidebarToggle }: HeaderProps) {
  const [branches, setBranches] = useState<Branch[]>([])

  useEffect(() => {
    supabase.from('sucursales').select('*').order('nombre').then(({ data }) => {
      if (data) setBranches(data)
    })
  }, [])

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <button
          onClick={onSidebarToggle}
          className="mr-4 inline-flex md:hidden items-center justify-center rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Toggle sidebar"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-lg md:text-2xl font-bold text-gray-900">Panel de Administracion</h1>

        <div className="flex items-center gap-2">
          <label className="hidden sm:block text-sm font-medium text-gray-700">Sucursal:</label>
          <select
            value={selectedBranchId ?? ''}
            onChange={(e) => onBranchChange(e.target.value ? Number(e.target.value) : null)}
            className="rounded border border-gray-300 bg-white px-2 md:px-3 py-2 text-xs md:text-sm font-medium text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
          >
            <option value="">Todas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
  )
}
