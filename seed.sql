-- Sucursales
INSERT INTO sucursales (nombre) VALUES ('Sucursal Centro');
INSERT INTO sucursales (nombre) VALUES ('Sucursal Norte');

-- Admin (sin sucursal asignada)
INSERT INTO usuarios (nombre, pin, rol, activo) VALUES ('Doña Mónica', '1234', 'admin', true);

-- Empleadas
INSERT INTO usuarios (sucursal_id, nombre, pin, rol, activo) VALUES (1, 'Juana', '1111', 'empleado', true);
INSERT INTO usuarios (sucursal_id, nombre, pin, rol, activo) VALUES (2, 'Pedra', '2222', 'empleado', true);

-- Productos
INSERT INTO productos (nombre, precio) VALUES ('Torta Chocolate', 80);
INSERT INTO productos (nombre, precio) VALUES ('Torta Vainilla', 70);
INSERT INTO productos (nombre, precio) VALUES ('Cupcake', 10);
