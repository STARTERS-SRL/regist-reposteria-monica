'use client'

import { useState } from 'react'
import Sidebar from './sidebar'
import Header from './header'
import SalesCards from './sales-cards'
import SalesTable from './sales-table'
import SalesView from './sales-view'
import InventoryView from './inventory-view'
import SettingsView from './settings-view'
import PosView from './pos-view'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
  const [activeMenu, setActiveMenu] = useState('dashboard')

  const renderContent = () => {
    switch (activeMenu) {
      case 'pos':
        return <PosView />
      case 'ventas':
        return <SalesView branchId={selectedBranchId} />
      case 'inventario':
        return <InventoryView branchId={selectedBranchId} />
      case 'configuracion':
        return <SettingsView />
      case 'dashboard':
      default:
        return (
          <>
            <SalesCards branchId={selectedBranchId} />
            <div className="mt-6 md:mt-8">
              <SalesTable branchId={selectedBranchId} />
            </div>
          </>
        )
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeMenu={activeMenu}
        onMenuSelect={(menu) => {
          setActiveMenu(menu)
          setSidebarOpen(false)
        }}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}
