-- Add tipo and activo columns to productos table
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('Entero', 'Porción')),
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
