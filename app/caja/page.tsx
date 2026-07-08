'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PosView from '@/components/pos-view'

export default function CajaPage() {
  const router = useRouter()
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (!stored) { router.push('/login'); return }
    const user = JSON.parse(stored)
    if (user.rol !== 'empleado') { router.push('/login'); return }
    setAutorizado(true)
  }, [router])

  if (!autorizado) return null

  return <PosView />
}
