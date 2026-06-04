-- Sistema de Gestión de Vacaciones
-- Schema de base de datos

CREATE TABLE IF NOT EXISTS gerentes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  es_admin BOOLEAN DEFAULT FALSE,
  puede_ver_ids INTEGER[], -- IDs de otros gerentes cuyos pedidos puede ver (para Mauro)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS feriados (
  id SERIAL PRIMARY KEY,
  fecha DATE UNIQUE NOT NULL,
  descripcion VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  empleado_nombre VARCHAR(150) NOT NULL,
  empleado_email VARCHAR(150) NOT NULL,
  empresa_id INTEGER REFERENCES empresas(id),
  gerente_id INTEGER REFERENCES gerentes(id),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_habiles INTEGER NOT NULL,
  comentario_empleado TEXT,
  estado VARCHAR(30) DEFAULT 'pendiente',
  -- pendiente | aprobado | rechazado | a_revisar
  reemplazante VARCHAR(150),
  comentario_gerente TEXT,
  token_aprobacion VARCHAR(255) UNIQUE,
  resuelto_por INTEGER REFERENCES gerentes(id),
  resuelto_at TIMESTAMP,
  ultimo_recordatorio TIMESTAMP,
  recordatorios_enviados INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Datos iniciales: empresas
INSERT INTO empresas (nombre, color) VALUES
  ('Volkswagen', '#2563EB'),
  ('Turenne', '#EA580C'),
  ('Chevrolet', '#CA8A04'),
  ('Chery', '#DC2626'),
  ('Audi', '#1C1C1C'),
  ('Multimarca', '#7C3AED')
ON CONFLICT DO NOTHING;

-- Feriados nacionales Argentina 2025 + Día del Mecánico
INSERT INTO feriados (fecha, descripcion) VALUES
  ('2025-01-01', 'Año Nuevo'),
  ('2025-03-03', 'Carnaval'),
  ('2025-03-04', 'Carnaval'),
  ('2025-03-24', 'Día de la Memoria'),
  ('2025-04-02', 'Día del Veterano'),
  ('2025-04-18', 'Viernes Santo'),
  ('2025-05-01', 'Día del Trabajador'),
  ('2025-05-25', 'Día de la Patria'),
  ('2025-06-16', 'Paso a la Inmortalidad del Gral. Belgrano'),
  ('2025-06-20', 'Día del Mecánico'),
  ('2025-07-09', 'Día de la Independencia'),
  ('2025-08-17', 'Paso a la Inmortalidad del Gral. San Martín'),
  ('2025-10-12', 'Día del Respeto a la Diversidad Cultural'),
  ('2025-11-20', 'Día de la Soberanía Nacional'),
  ('2025-12-08', 'Inmaculada Concepción'),
  ('2025-12-25', 'Navidad'),
  -- 2026
  ('2026-01-01', 'Año Nuevo'),
  ('2026-02-16', 'Carnaval'),
  ('2026-02-17', 'Carnaval'),
  ('2026-03-24', 'Día de la Memoria'),
  ('2026-04-02', 'Día del Veterano'),
  ('2026-04-03', 'Viernes Santo'),
  ('2026-05-01', 'Día del Trabajador'),
  ('2026-05-25', 'Día de la Patria'),
  ('2026-06-15', 'Paso a la Inmortalidad del Gral. Belgrano'),
  ('2026-06-20', 'Día del Mecánico'),
  ('2026-07-09', 'Día de la Independencia'),
  ('2026-08-17', 'Paso a la Inmortalidad del Gral. San Martín'),
  ('2026-10-12', 'Día del Respeto a la Diversidad Cultural'),
  ('2026-11-20', 'Día de la Soberanía Nacional'),
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad')
ON CONFLICT DO NOTHING;
