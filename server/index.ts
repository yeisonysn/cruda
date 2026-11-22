import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';
const JWT_SECRET = process.env.JWT_SECRET || 'cruda_secret_change_me';

// Rutas de datos (compatible con disco local y Vercel Serverless /tmp)
const IS_VERCEL = Boolean(process.env.VERCEL);
const STATIC_UPLOADS_DIR = path.join(__dirname, 'uploads');
const STATIC_DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = IS_VERCEL ? '/tmp/cruda-uploads' : STATIC_UPLOADS_DIR;
const DATA_DIR = IS_VERCEL ? '/tmp/cruda-data' : STATIC_DATA_DIR;
const DATA_FILE = path.join(DATA_DIR, 'materas.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const CONTACT_FILE = path.join(DATA_DIR, 'contacts.json');

// Asegurar directorios
[UPLOADS_DIR, DATA_DIR].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Ignorar en entornos de solo lectura
  }
});

// Inicializar archivos JSON si no existen (copiando semilla en Vercel si existe)
const ensureJsonSeed = (targetFile: string, seedFileName: string) => {
  try {
    if (!fs.existsSync(targetFile)) {
      const seedPath = path.join(STATIC_DATA_DIR, seedFileName);
      const initialContent = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf-8') : '[]';
      fs.writeFileSync(targetFile, initialContent, 'utf-8');
    }
  } catch {
    // Fallback en memoria si el filesystem está restringido
  }
};
ensureJsonSeed(DATA_FILE, 'materas.json');
ensureJsonSeed(ORDERS_FILE, 'orders.json');
ensureJsonSeed(CONTACT_FILE, 'contacts.json');

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR), express.static(STATIC_UPLOADS_DIR));

// Multer para subida de STL (máximo 20 MB)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.stl') {
      return cb(new Error('Solo se permiten archivos .stl'));
    }
    cb(null, true);
  },
});

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface Matera {
  id: string;
  storeId?: string;
  sku?: string;
  nombre: string;
  descripcion: string;
  precio: number;
  color?: string;
  categoria?: string;
  acabado?: string;
  dimensiones?: string;
  pesoKg?: number;
  bajoPedido?: boolean;
  tiempoFabricacionDias?: number;
  stock?: number;
  isActive?: boolean;
  deletedAt?: string | null;
  archivo: string;
  archivoUrl: string;
  creadoEn: string;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItemRecord {
  productId: string;
  sku: string;
  name: string;
  size: string;
  finish: string;
  colorHex: string;
  unitPrice: number;
  quantity: number;
  isCustomStl?: boolean;
  leadTimeDays?: number;
}

export interface OrderStatusHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string;
  note: string;
  timestamp: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  storeId: string;
  idempotencyKey?: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    documentType: string;
    documentNumber: string;
    city: string;
    department: string;
    address: string;
    notes?: string;
    acceptedPrivacyPolicy: boolean;
    acceptedTerms: boolean;
  };
  shippingMethod: string;
  shippingZone: string;
  shippingCost: number;
  subtotal: number;
  taxIncluded: number;
  total: number;
  paymentMethod: string;
  paymentReference: string;
  status: OrderStatus;
  items: OrderItemRecord[];
  history: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const readJsonFile = <T>(filePath: string, fallback: T): T => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
};

const writeJsonFile = <T>(filePath: string, data: T): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const readMateras = (): Matera[] => readJsonFile<Matera[]>(DATA_FILE, []);
const writeMateras = (data: Matera[]) => writeJsonFile(DATA_FILE, data);

const readOrders = (): OrderRecord[] => readJsonFile<OrderRecord[]>(ORDERS_FILE, []);
const writeOrders = (data: OrderRecord[]) => writeJsonFile(ORDERS_FILE, data);

const verifyToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido.' });
    return;
  }
  try {
    jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada o token inválido. Inicia sesión nuevamente.' });
  }
};

// ─── Rutas de Salud (M03) ───────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cruda-api',
    storeId: 'store_cruda_main',
    timestamp: new Date().toISOString(),
  });
});

// ─── Auth (M04 Preliminar + Compatibilidad) ─────────────────────────────────

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const validUser = !username || username.trim().toLowerCase() === ADMIN_USER.toLowerCase();
  if (!validUser || !password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos. Verifica tus credenciales (admin / 1234).' });
    return;
  }
  const token = jwt.sign({ role: 'ADMIN', username: ADMIN_USER, storeId: 'store_cruda_main' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: 'ADMIN', username: ADMIN_USER, storeId: 'store_cruda_main', mensaje: 'Sesión iniciada correctamente.' });
});

// ─── Catálogo & Materas STL (M06) ───────────────────────────────────────────

app.get('/api/materas', (_req, res) => {
  const all = readMateras().filter(m => !m.deletedAt);
  res.json(all);
});

app.post('/api/materas', verifyToken, (req, res, next) => {
  upload.single('stl')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'El archivo STL supera el límite de 20 MB.' });
        return;
      }
      res.status(400).json({ error: `Error al subir archivo: ${err.message}` });
      return;
    }
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    const { nombre, descripcion, precio, color, categoria, acabado, dimensiones, pesoKg, bajoPedido, tiempoFabricacionDias } = req.body as Record<string, string | undefined>;

    if (!req.file) {
      res.status(400).json({ error: 'Se requiere un archivo .stl.' });
      return;
    }
    if (!nombre || precio === undefined) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'El nombre y el precio son obligatorios.' });
      return;
    }

    const precioNum = Math.round(parseFloat(precio));
    if (isNaN(precioNum) || precioNum < 0) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'El precio debe ser un número entero válido en COP.' });
      return;
    }

    const id = `mat-${Date.now()}`;
    const nuevaMatera: Matera = {
      id,
      storeId: 'store_cruda_main',
      sku: `STL-${Date.now().toString().slice(-5)}`,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || 'Pieza arquitectónica personalizada en concreto UHPC.',
      precio: precioNum,
      color: color || '#9e9e99',
      categoria: categoria || 'Personalizados STL',
      acabado: acabado || 'Sellado Mate Suizo',
      dimensiones: dimensiones || '25 × 25 × 30 cm',
      pesoKg: pesoKg ? parseFloat(pesoKg) : 6.5,
      bajoPedido: bajoPedido !== 'false',
      tiempoFabricacionDias: tiempoFabricacionDias ? parseInt(tiempoFabricacionDias, 10) : 10,
      stock: 5,
      isActive: true,
      deletedAt: null,
      archivo: req.file.filename,
      archivoUrl: `/uploads/${req.file.filename}`,
      creadoEn: new Date().toISOString(),
    };

    const materas = readMateras();
    materas.push(nuevaMatera);
    writeMateras(materas);

    res.status(201).json({ mensaje: 'Matera registrada correctamente.', matera: nuevaMatera });
    next();
  });
});

app.patch('/api/materas/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { color, nombre, descripcion, precio, isActive } = req.body as Partial<Matera>;
  const materas = readMateras();
  const idx = materas.findIndex(m => m.id === id && !m.deletedAt);

  if (idx === -1) {
    res.status(404).json({ error: 'Matera no encontrada.' });
    return;
  }

  if (color !== undefined) materas[idx].color = color;
  if (nombre !== undefined) materas[idx].nombre = nombre.trim();
  if (descripcion !== undefined) materas[idx].descripcion = descripcion.trim();
  if (precio !== undefined && !isNaN(Number(precio)) && Number(precio) >= 0) {
    materas[idx].precio = Math.round(Number(precio));
  }
  if (isActive !== undefined) materas[idx].isActive = Boolean(isActive);

  writeMateras(materas);
  res.json({ mensaje: 'Matera actualizada.', matera: materas[idx] });
});

app.delete('/api/materas/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const materas = readMateras();
  const idx = materas.findIndex(m => m.id === id);

  if (idx === -1) {
    res.status(404).json({ error: 'Matera no encontrada.' });
    return;
  }

  const [eliminada] = materas.splice(idx, 1);
  writeMateras(materas);

  // Eliminar archivo STL del disco
  const filePath = path.join(UPLOADS_DIR, eliminada.archivo);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch { /* ignorar */ }
  }

  res.json({ mensaje: `Matera "${eliminada.nombre}" eliminada correctamente.` });
});

// ─── Pedidos y Checkout (M07 / M08) ─────────────────────────────────────────

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['IN_PRODUCTION', 'REFUNDED'],
  IN_PRODUCTION: ['READY', 'REFUNDED'],
  READY: ['SHIPPED', 'REFUNDED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const SHIPPING_RATES: Record<string, { label: string; cost: number }> = {
  BOGOTA: { label: 'Bogotá y Sabana (Huacal Estructural)', cost: 25000 },
  MEDELLIN_PRINCIPALES: { label: 'Medellín, Cali, Eje Cafetero y Costa', cost: 38000 },
  NACIONAL: { label: 'Resto del País (Transporte Especializado)', cost: 55000 },
  PICKUP: { label: 'Recogida en Taller (Bogotá / Medellín)', cost: 0 },
};

// Catálogo oficial de precios en el servidor para prevenir manipulación desde el cliente (Price Tampering)
const OFFICIAL_BASE_PRICES: Record<string, Record<string, number>> = {
  'CR-001': { S: 145000, M: 185000, L: 265000 },
  'CR-002': { S: 185000, M: 235000, L: 330000 },
  'CR-003': { S: 225000, M: 290000, L: 410000 },
  'CR-004': { S: 240000, M: 320000, L: 440000 },
  'CR-005': { S: 310000, M: 420000, L: 580000 },
  'CR-006': { S: 195000, M: 255000, L: 355000 },
};

const FINISH_SURCHARGES: Record<string, number> = {
  'Gris Cemento Puro': 0,
  'Blanco Mineral Calizo': 15000,
  'Grafito Brutalista': 20000,
  'Ocre Desierto': 18000,
  'Verde Salvia': 22000,
  'Terracota Fuego': 18000,
};

app.post('/api/orders', (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  const orders = readOrders();

  if (idempotencyKey) {
    const existing = orders.find(o => o.idempotencyKey === idempotencyKey);
    if (existing) {
      res.status(200).json({ order: existing, idempotentReplay: true });
      return;
    }
  }

  const { customer, items, shippingZone, shippingMethod, paymentMethod, simulatePaid } = req.body as {
    customer?: OrderRecord['customer'];
    items?: OrderItemRecord[];
    shippingZone?: string;
    shippingMethod?: string;
    paymentMethod?: string;
    simulatePaid?: boolean;
  };

  if (!customer?.fullName || !customer?.email || !customer?.phone || !customer?.city || !customer?.address) {
    res.status(400).json({ error: 'Datos de contacto (nombre, correo, celular, ciudad) y dirección de entrega son obligatorios.' });
    return;
  }

  if (!customer.acceptedPrivacyPolicy || !customer.acceptedTerms) {
    res.status(400).json({ error: 'Debes aceptar la Política de Tratamiento de Datos (Ley 1581/2012) y los Términos Comerciales.' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'El carrito no puede estar vacío.' });
    return;
  }

  const registeredStlMateras = readMateras();

  // Validar y calcular precios autoritativamente en el servidor
  let subtotal = 0;
  const sanitizedItems: OrderItemRecord[] = items.map(item => {
    const qty = Math.max(1, Math.min(50, Math.round(Number(item.quantity) || 1)));
    const sizeKey = (['S', 'M', 'L'].includes(String(item.size)) ? String(item.size) : 'M') as 'S' | 'M' | 'L';
    const skuStr = String(item.sku || 'CR-001');
    const refMatch = skuStr.match(/^(CR-\d{3})/i)?.[1]?.toUpperCase();
    const finishName = String(item.finish || 'Gris Cemento Puro');
    const finishExtra = FINISH_SURCHARGES[finishName] ?? 0;

    let verifiedUnitPrice = 0;
    if (refMatch && OFFICIAL_BASE_PRICES[refMatch]) {
      verifiedUnitPrice = OFFICIAL_BASE_PRICES[refMatch][sizeKey] + finishExtra;
    } else {
      const stlMatch = registeredStlMateras.find(
        m => m.id === item.productId || item.name?.toLowerCase().includes(m.nombre.toLowerCase())
      );
      if (stlMatch && stlMatch.precio > 0) {
        const mult = sizeKey === 'S' ? 0.8 : sizeKey === 'L' ? 1.45 : 1;
        verifiedUnitPrice = Math.round((stlMatch.precio * mult) / 1000) * 1000 + finishExtra;
      } else {
        const clientPrice = Math.round(Number(item.unitPrice) || 185000);
        verifiedUnitPrice = Math.max(115000, clientPrice);
      }
    }

    subtotal += verifiedUnitPrice * qty;
    return {
      productId: String(item.productId || 'cr-001'),
      sku: skuStr,
      name: String(item.name || 'Matera CRUDA'),
      size: sizeKey,
      finish: finishName,
      colorHex: String(item.colorHex || '#A7A7A2'),
      unitPrice: verifiedUnitPrice,
      quantity: qty,
      isCustomStl: Boolean(item.isCustomStl),
      leadTimeDays: Number(item.leadTimeDays) || 5,
    };
  });

  const requestedZone = shippingZone || shippingMethod || 'BOGOTA';
  const zoneKey = SHIPPING_RATES[requestedZone] ? requestedZone : 'BOGOTA';
  const baseShipping = SHIPPING_RATES[zoneKey].cost;
  // Envío gratuito en compras superiores a $450.000 COP (excepto nacional lejano)
  const shippingCost = subtotal >= 450000 && zoneKey !== 'NACIONAL' ? 0 : baseShipping;
  const total = subtotal + shippingCost;
  // D3: Precios con IVA 19% incluido
  const taxIncluded = Math.round(total - total / 1.19);

  const now = new Date().toISOString();
  const orderNumber = `CRU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const initialStatus: OrderStatus = simulatePaid !== false ? 'PAID' : 'PENDING_PAYMENT';

  const history: OrderStatusHistoryEntry[] = [
    {
      fromStatus: null,
      toStatus: 'PENDING_PAYMENT',
      changedBy: 'SYSTEM',
      note: 'Orden creada y reserva de fabricación registrada.',
      timestamp: now,
    },
  ];

  if (initialStatus === 'PAID') {
    history.push({
      fromStatus: 'PENDING_PAYMENT',
      toStatus: 'PAID',
      changedBy: 'WOMPI_SANDBOX_WEBHOOK',
      note: `Pago aprobado en Wompi Sandbox (${paymentMethod || 'PSE / Tarjeta'}).`,
      timestamp: now,
    });
  }

  const newOrder: OrderRecord = {
    id: `ord_${Date.now()}`,
    orderNumber,
    storeId: 'store_cruda_main',
    idempotencyKey,
    customer,
    shippingMethod: SHIPPING_RATES[zoneKey].label,
    shippingZone: zoneKey,
    shippingCost,
    subtotal,
    taxIncluded,
    total,
    paymentMethod: paymentMethod || 'WOMPI_SANDBOX',
    paymentReference: `WMP-SBX-${Date.now().toString().slice(-7)}`,
    status: initialStatus,
    items: sanitizedItems,
    history,
    createdAt: now,
    updatedAt: now,
  };

  orders.unshift(newOrder);
  writeOrders(orders);

  res.status(201).json({ order: newOrder });
});

// Consultar pedido público por número de orden
app.get('/api/orders/:orderNumber', (req, res) => {
  const { orderNumber } = req.params;
  const orders = readOrders();
  const found = orders.find(
    o => o.orderNumber.toUpperCase() === orderNumber.trim().toUpperCase() || o.id === orderNumber
  );

  if (!found) {
    res.status(404).json({ error: 'No encontramos un pedido con ese código de referencia.' });
    return;
  }

  res.json({ order: found });
});

// Listar todos los pedidos (Admin)
app.get('/api/admin/orders', verifyToken, (_req, res) => {
  res.json({ orders: readOrders() });
});

// Cambiar estado de pedido respetando matriz de transiciones (M07)
app.patch('/api/admin/orders/:id/status', verifyToken, (req, res) => {
  const { id } = req.params;
  const { toStatus, note } = req.body as { toStatus?: OrderStatus; note?: string };
  const orders = readOrders();
  const idx = orders.findIndex(o => o.id === id || o.orderNumber === id);

  if (idx === -1) {
    res.status(404).json({ error: 'Pedido no encontrado.' });
    return;
  }

  const currentOrder = orders[idx];
  if (!toStatus || !VALID_TRANSITIONS[currentOrder.status]?.includes(toStatus)) {
    res.status(400).json({
      error: `Transición inválida desde ${currentOrder.status} hacia ${toStatus}. Permitidas: ${VALID_TRANSITIONS[currentOrder.status]?.join(', ') || 'ninguna'}.`,
    });
    return;
  }

  const now = new Date().toISOString();
  currentOrder.history.push({
    fromStatus: currentOrder.status,
    toStatus,
    changedBy: 'ADMIN',
    note: note?.trim() || `Estado actualizado a ${toStatus}`,
    timestamp: now,
  });
  currentOrder.status = toStatus;
  currentOrder.updatedAt = now;

  writeOrders(orders);
  res.json({ order: currentOrder });
});

// ─── Contacto & Cotizaciones Arquitectónicas ────────────────────────────────

app.post('/api/contact', (req, res) => {
  const { name, email, phone, projectType, city, message, acceptedPrivacy } = req.body as Record<string, unknown>;
  if (!name || (!email && !phone) || !message) {
    res.status(400).json({ error: 'Nombre, teléfono o correo y mensaje son obligatorios.' });
    return;
  }

  const contacts = readJsonFile<Record<string, unknown>[]>(CONTACT_FILE, []);
  const entry = {
    id: `msg_${Date.now()}`,
    storeId: 'store_cruda_main',
    name: String(name).trim(),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    projectType: String(projectType || 'Residencial / Interiorismo'),
    city: String(city || 'Bogotá'),
    message: String(message).trim(),
    acceptedPrivacy: acceptedPrivacy !== undefined ? Boolean(acceptedPrivacy) : true,
    createdAt: new Date().toISOString(),
  };
  contacts.unshift(entry);
  writeJsonFile(CONTACT_FILE, contacts);

  res.status(201).json({ mensaje: 'Solicitud recibida. Nuestro equipo de arquitectura te contactará en menos de 24 horas hábiles.', entry });
});

// ─── Puente con Agente de Ventas IA en n8n (Gemini + Postgres Blindado) ────

const N8N_CHAT_WEBHOOK_URL =
  process.env.N8N_CHAT_WEBHOOK_URL || 'http://127.0.0.1:5678/webhook/cruda-agente-ventas/chat';

app.post('/api/ai-chat', async (req, res) => {
  const { chatInput, sessionId } = req.body as { chatInput?: string; sessionId?: string };
  if (!chatInput || !String(chatInput).trim()) {
    res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    return;
  }

  const cleanSessionId = String(sessionId || `cruda-web-${Date.now()}`).trim();

  try {
    const n8nRes = await fetch(N8N_CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendMessage',
        sessionId: cleanSessionId,
        chatInput: String(chatInput).trim(),
      }),
    });

    const rawText = await n8nRes.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { output: rawText };
    }

    if (!n8nRes.ok) {
      res.status(n8nRes.status).json({
        error:
          (parsed.message as string) ||
          (parsed.error as string) ||
          'El flujo de n8n devolvió un error. Verifica que el workflow esté activo en http://localhost:5678.',
      });
      return;
    }

    const reply =
      (parsed.output as string) ||
      (parsed.text as string) ||
      (Array.isArray(parsed) && (parsed[0]?.output as string)) ||
      'Sin respuesta del agente.';

    res.json({
      reply,
      sessionId: cleanSessionId,
    });
  } catch (err: any) {
    console.error('[CRUDA n8n Chat Bridge]', err?.message || err);
    res.status(502).json({
      error:
        'No se pudo conectar con n8n en http://127.0.0.1:5678. Asegúrate de que el contenedor cruda-n8n esté activo.',
    });
  }
});

// Manejo global de errores
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[CRUDA Server]', err.message);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  🪴  CRUDA API → http://localhost:${PORT}`);
    console.log(`  📂  Uploads  → ${UPLOADS_DIR}`);
    console.log(`  📋  Datos    → ${DATA_FILE}\n`);
  });
}

export default app;
