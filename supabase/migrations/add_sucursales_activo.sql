-- Add activo column to sucursales table
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
