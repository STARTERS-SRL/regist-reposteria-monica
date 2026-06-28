# Integración con Supabase

Este dashboard está preparado para ser integrado con Supabase. A continuación se describe cómo configurarlo.

## Estructura de Componentes

El dashboard está dividido en componentes reutilizables:

- **`dashboard-layout.tsx`** - Layout principal que gestiona el estado del sidebar y sucursal seleccionada
- **`sidebar.tsx`** - Navegación lateral con menú de opciones
- **`header.tsx`** - Encabezado con selector de sucursal
- **`sales-cards.tsx`** - Tarjetas de resumen (Ventas, Ingresos, Alertas)
- **`sales-table.tsx`** - Tabla de últimas ventas

## Próximos Pasos para Integración Supabase

### 1. Crear Cliente Supabase

Crea un archivo `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 2. Configurar Variables de Entorno

En `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Schema Supabase Sugerido

```sql
-- Tabla de sucursales
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de ventas
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  total DECIMAL(10, 2),
  payment_method TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de productos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity INT,
  min_stock INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Actualizar Componentes para Datos Dinámicos

**En `sales-cards.tsx`:**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SalesCards() {
  const [todaySales, setTodaySales] = useState(0)
  // ... resto del código
  
  useEffect(() => {
    // Fetch data from Supabase
    // const { data } = await supabase
    //   .from('sales')
    //   .select('total')
    //   .eq('created_at', today)
  }, [])
}
```

**En `sales-table.tsx`:**

```typescript
useEffect(() => {
  // Fetch from Supabase
  // const { data: sales } = await supabase
  //   .from('sales')
  //   .select('*')
  //   .order('created_at', { ascending: false })
  //   .limit(5)
}, [])
```

## Características Implementadas

✅ Diseño minimalista y corporativo
✅ Sidebar responsivo con navegación
✅ Selector de sucursales
✅ Tarjetas de resumen de ventas
✅ Tabla de últimas transacciones
✅ Totalmente responsivo (desktop, tablet, móvil)
✅ Datos estáticos listos para ser reemplazados por datos dinámicos
✅ Estructura lista para integración con Supabase

## Notas de Diseño

- Sin emojis, gradientes ni glassmorphism
- Colores sólidos: blanco, gris claro/oscuro, azul y rojo
- Tipografía: Inter (sans-serif) en toda la aplicación
- Bordes simples de 1px en gris claro
- Sidebar oscuro (gris-900) con menú en blanco
- Espaciado generoso para interfaz minimalista
