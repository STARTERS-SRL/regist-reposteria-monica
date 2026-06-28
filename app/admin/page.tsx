'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'

export default function AdminPage() {
  const router = useRouter()
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (!stored) {
      router.push('/login')
      return
    }
    const user = JSON.parse(stored)
    if (user.rol !== 'admin') {
      router.push('/login')
      return
    }
    setAutorizado(true)
  }, [router])

  if (!autorizado) return null

  return <DashboardLayout />
}
