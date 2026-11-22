-- =============================================================================
-- CRUDA — Base de Datos de Negocio para Agente de Ventas IA + Control Humano
-- Incluye blindaje transaccional, auditoría y metadatos para Google Drive / STL
-- =============================================================================

CREATE DATABASE cruda;
\connect cruda

-- 1. Rol con privilegios mínimos para el Agente de IA
CREATE ROLE cruda_agente LOGIN PASSWORD 'agente_cambiar_123';

-- 2. Catálogo de productos (con soporte para archivos STL y enlaces de Google Drive)
CREATE TABLE productos (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT UNIQUE,
  nombre TEXT NOT NULL UNIQUE,
  dimensiones TEXT NOT NULL,
  material TEXT NOT NULL DEFAULT 'Concreto UHPC',
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0), -- COP
  stock_disponible INTEGER NOT NULL DEFAULT 0 CHECK (stock_disponible >= 0),
  url_stl TEXT,
  drive_file_id TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Clientes registrados por WhatsApp / Web
CREATE TABLE clientes (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono_whatsapp TEXT NOT NULL UNIQUE,
  email TEXT,
  ciudad TEXT,
  drive_folder_id TEXT, -- Carpeta del cliente en Google Drive para cotizaciones y planos STL
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Cotizaciones (precios y estado controlados 100% por PostgreSQL via Trigger)
CREATE TABLE cotizaciones (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  detalles_json JSONB NOT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente_aprobacion'
    CHECK (estado IN ('pendiente_aprobacion','aprobada','rechazada','enviada','convertida_pedido')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprobado_por TEXT,
  fecha_decision TIMESTAMPTZ,
  drive_doc_id TEXT,    -- ID del documento/PDF generado en Google Drive al aprobar
  drive_doc_url TEXT,   -- URL compartible de Google Drive
  notas TEXT
);

-- 5. Bitácora de auditoría inmutable para trazabilidad de aprobaciones y cambios
CREATE TABLE auditoria_cotizaciones (
  id BIGSERIAL PRIMARY KEY,
  cotizacion_id BIGINT NOT NULL REFERENCES cotizaciones(id),
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  usuario_bd TEXT NOT NULL DEFAULT current_user,
  aprobado_por TEXT,
  fecha_evento TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- FUNCIÓN & TRIGGER 1: Cálculo Autoritativo de Precios y Blindaje de Estado
-- Soporta tanto JSONB array nativo como JSON serializado en string desde n8n AI
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_preparar_cotizacion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_payload jsonb;
  v_items jsonb;
  v_total numeric(12,2);
  v_validos int;
  v_esperados int;
BEGIN
  v_payload := NEW.detalles_json;

  -- Si el nodo de n8n envía el array serializado como string dentro de JSONB, desempaquetarlo automáticamente
  IF jsonb_typeof(v_payload) = 'string' THEN
    BEGIN
      v_payload := (v_payload #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'detalles_json contiene un texto que no es JSON válido: %', NEW.detalles_json;
    END;
  END IF;

  IF jsonb_typeof(v_payload) <> 'array' OR jsonb_array_length(v_payload) = 0 THEN
    RAISE EXCEPTION 'detalles_json debe ser un array JSON no vacío, ej: [{"producto_id":1,"cantidad":2}]';
  END IF;

  v_esperados := jsonb_array_length(v_payload);

  SELECT
    jsonb_agg(
      jsonb_build_object(
        'producto_id', p.id,
        'sku', p.sku,
        'nombre', p.nombre,
        'cantidad', i.cantidad,
        'precio_unitario', p.precio_unitario,
        'subtotal', p.precio_unitario * i.cantidad,
        'stock_actual', p.stock_disponible,
        'requiere_bajo_pedido', (i.cantidad > p.stock_disponible)
      )
    ),
    COALESCE(SUM(p.precio_unitario * i.cantidad), 0),
    COUNT(*)
  INTO v_items, v_total, v_validos
  FROM jsonb_to_recordset(v_payload) AS i(producto_id int, cantidad int)
  JOIN productos p ON p.id = i.producto_id AND p.activo
  WHERE i.cantidad > 0;

  IF v_validos <> v_esperados THEN
    RAISE EXCEPTION 'Hay productos inexistentes/inactivos o cantidades inválidas. Consulta el catálogo con consultar_catalogo.';
  END IF;

  NEW.detalles_json := v_items;
  NEW.total := v_total;
  NEW.estado := 'pendiente_aprobacion';
  NEW.fecha_creacion := now();
  NEW.aprobado_por := NULL;
  NEW.fecha_decision := NULL;

  RETURN NEW;
END
$$;

CREATE TRIGGER trg_preparar_cotizacion
BEFORE INSERT ON cotizaciones
FOR EACH ROW EXECUTE FUNCTION fn_preparar_cotizacion();

-- =============================================================================
-- FUNCIÓN & TRIGGER 2: Registro Automático en Auditoría
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_auditar_cotizacion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_cotizaciones (cotizacion_id, estado_anterior, estado_nuevo, usuario_bd, aprobado_por)
    VALUES (NEW.id, NULL, NEW.estado, current_user, NEW.aprobado_por);
  ELSIF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO auditoria_cotizaciones (cotizacion_id, estado_anterior, estado_nuevo, usuario_bd, aprobado_por)
    VALUES (NEW.id, OLD.estado, NEW.estado, current_user, NEW.aprobado_por);
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_auditar_cotizacion
AFTER INSERT OR UPDATE ON cotizaciones
FOR EACH ROW EXECUTE FUNCTION fn_auditar_cotizacion();

-- =============================================================================
-- VISTAS PARA REVISIÓN HUMANA Y EXPORTACIÓN A GOOGLE DRIVE / SHEETS
-- =============================================================================
CREATE VIEW v_cotizaciones_pendientes AS
SELECT
  q.id,
  c.nombre,
  c.telefono_whatsapp,
  c.email,
  c.ciudad,
  q.detalles_json,
  q.total,
  q.fecha_creacion
FROM cotizaciones q
JOIN clientes c ON c.id = q.cliente_id
WHERE q.estado = 'pendiente_aprobacion'
ORDER BY q.fecha_creacion;

-- =============================================================================
-- PERMISOS MÍNIMOS (Principio de Menor Privilegio para el Agente IA)
-- El agente NO puede hacer UPDATE ni DELETE en cotizaciones ni productos
-- =============================================================================
GRANT CONNECT ON DATABASE cruda TO cruda_agente;
GRANT USAGE ON SCHEMA public TO cruda_agente;
GRANT SELECT ON productos TO cruda_agente;
GRANT SELECT, INSERT, UPDATE ON clientes TO cruda_agente;
GRANT SELECT, INSERT ON cotizaciones TO cruda_agente;
GRANT INSERT ON auditoria_cotizaciones TO cruda_agente;
GRANT USAGE ON SEQUENCE clientes_id_seq, cotizaciones_id_seq, auditoria_cotizaciones_id_seq TO cruda_agente;

-- =============================================================================
-- DATOS SEMILLA (IDs 1-3 del laboratorio + Catálogo Arquitectónico CRUDA)
-- =============================================================================
INSERT INTO productos (sku, nombre, dimensiones, material, precio_unitario, stock_disponible, url_stl) VALUES
('LAB-HEX-S', 'Matera Hexagonal S',           '12 x 12 x 10 cm', 'Concreto gris pulido',      45000,  25, 'file:///files/stl/hexagonal_s.stl'),
('LAB-TRI-M', 'Matera Prisma Triangular M',   '18 x 16 x 15 cm', 'Concreto gris natural',     78000,  12, 'file:///files/stl/prisma_triangular_m.stl'),
('LAB-DOD-L', 'Matera Facetada Dodecaedro L', '25 x 25 x 22 cm', 'Concreto negro pigmentado', 120000, 6,  'file:///files/stl/dodecaedro_l.stl'),
('CR-001-M',  'Cilindro Puro Bisel 45° (M)',  'Ø 28 x H 32 cm',  'Concreto UHPC Gris Puro',   185000, 12, 'file:///files/stl/cr001_cilindro.stl'),
('CR-002-M',  'Prisma Facetado Octogonal (M)','Ø 32 x H 36 cm',  'Concreto UHPC Grafito',     235000, 7,  'file:///files/stl/cr002_octagono.stl'),
('CR-003-M',  'Cono Invertido Terrazo (M)',   'Ø 35 x H 40 cm',  'Terrazo Cuarzo Andino',     290000, 4,  'file:///files/stl/cr003_cono.stl');
