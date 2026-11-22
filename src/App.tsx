// src/App.tsx
// CRUDA — Landing Page Comercial Minimalista, E-Commerce y Experiencia 3D/AR
// Rediseño arquitectónico enfocado en: Colección, Visualizador 3D/STL, Fabricación y Compra Directa/WhatsApp.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingBag,
  CheckCircle2,
  ArrowUpRight,
  Trash2,
  Plus,
  Minus,
  X,
  MessageSquare,
  Sparkles,
  Box,
  ShieldCheck,
  Truck,
  ArrowRight,
} from 'lucide-react';
import {
  PERMANENT_COLLECTION,
  FINISH_COLORS,
  CatalogProduct,
  FinishColorOption,
} from './data/catalogData';
import { ArchitecturalRender } from './components/ArchitecturalRender';
import { Interactive3DLab, ServerStlMatera } from './components/Interactive3DLab';
import { StlViewer } from './components/StlViewer';
import { CrudaAiChatDrawer } from './components/CrudaAiChatDrawer';

const WHATSAPP_PHONE = '573108204522';

interface CartItem {
  cartItemId: string;
  productId: string;
  sku: string;
  name: string;
  size: 'S' | 'M' | 'L';
  finish: string;
  colorHex: string;
  unitPrice: number;
  quantity: number;
  isCustomStl?: boolean;
  leadTimeDays: number;
}

interface OrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  taxIncluded: number;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
  paymentReference: string;
  createdAt: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    city: string;
    address: string;
  };
  items: Array<{
    sku: string;
    name: string;
    size: string;
    finish: string;
    unitPrice: number;
    quantity: number;
  }>;
  history: Array<{
    fromStatus: string | null;
    toStatus: string;
    changedBy: string;
    note: string;
    timestamp: string;
  }>;
}

const SHIPPING_ZONES = [
  { id: 'BOGOTA', label: 'Bogotá D.C. y Sabana (Huacal Estructural)', cost: 25000, eta: '2–3 días hábiles' },
  { id: 'MEDELLIN_PRINCIPALES', label: 'Medellín, Cali, Eje Cafetero y Costa', cost: 38000, eta: '3–5 días hábiles' },
  { id: 'NACIONAL', label: 'Resto del País (Transporte Especializado)', cost: 55000, eta: '5–8 días hábiles' },
  { id: 'PICKUP', label: 'Recogida en Taller (Bogotá)', cost: 0, eta: 'Sin costo de flete' },
] as const;

export function App() {
  // ─── STL Materas en Servidor ──────────────────────────────────────────────
  const [stlMateras, setStlMateras] = useState<ServerStlMatera[]>([]);
  const [selectedStlUrl, setSelectedStlUrl] = useState<string>('');

  // ─── Filtro de Colección ──────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<string>('Todas');

  // ─── Modal de Producto Activo ─────────────────────────────────────────────
  const [activeProduct, setActiveProduct] = useState<CatalogProduct | null>(null);
  const [modalSize, setModalSize] = useState<'S' | 'M' | 'L'>('M');
  const [modalFinish, setModalFinish] = useState<FinishColorOption>(FINISH_COLORS[0]);
  const [modalQty, setModalQty] = useState<number>(1);
  const [modalViewMode, setModalViewMode] = useState<'render' | '3d'>('render');
  const productDialogRef = useRef<HTMLDialogElement>(null);

  // ─── Carrito y Checkout ───────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cruda_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'confirmation'>('cart');
  const [shippingZone, setShippingZone] = useState<string>('BOGOTA');
  const [paymentMethod] = useState<string>('WOMPI_PSE');
  const [customerForm, setCustomerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: 'Bogotá D.C.',
    address: '',
    notes: '',
    acceptedPrivacyPolicy: true,
    acceptedTerms: true,
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null);
  const cartDialogRef = useRef<HTMLDialogElement>(null);

  // ─── Modal de Seguimiento ─────────────────────────────────────────────────
  const [trackingInput, setTrackingInput] = useState<string>('');
  const [trackedOrder, setTrackedOrder] = useState<OrderResponse | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isSearchingOrder, setIsSearchingOrder] = useState<boolean>(false);
  const trackingDialogRef = useRef<HTMLDialogElement>(null);

  // ─── Formulario de Contacto ───────────────────────────────────────────────
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [contactStatus, setContactStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmittingContact, setIsSubmittingContact] = useState<boolean>(false);

  // ─── Modal de Administración ──────────────────────────────────────────────
  const [adminTab, setAdminTab] = useState<'stl' | 'orders'>('stl');
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [modelPrice, setModelPrice] = useState<string>('185000');
  const [modelDesc, setModelDesc] = useState<string>('');
  const [stlFile, setStlFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ text: string; error: boolean } | null>(null);
  const [isUploadingStl, setIsUploadingStl] = useState<boolean>(false);
  const [adminOrders, setAdminOrders] = useState<OrderResponse[]>([]);
  const adminDialogRef = useRef<HTMLDialogElement>(null);

  // ─── Chat Lateral IA (n8n + Gemini + Postgres) ────────────────────────────
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Guardar carrito en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cruda_cart_v1', JSON.stringify(cart));
    } catch {
      // Ignorar errores de cuota en Safari
    }
  }, [cart]);

  // Cargar catálogo de materas STL del servidor
  const loadServerStlMateras = async () => {
    try {
      const res = await fetch('/api/materas');
      if (res.ok) {
        const data: ServerStlMatera[] = await res.json();
        setStlMateras(data);
        if (data.length > 0 && !selectedStlUrl) {
          setSelectedStlUrl(data[0].archivoUrl);
        }
      }
    } catch (e) {
      console.warn('Backend API no disponible en este momento:', e);
    }
  };

  useEffect(() => {
    loadServerStlMateras();
  }, []);

  // Catálogo unificado (Colección estándar + STL subidos como productos de catálogo)
  const allProducts: CatalogProduct[] = useMemo(() => {
    const customStlProducts: CatalogProduct[] = stlMateras.map((stl) => ({
      id: stl.id,
      reference: `STL-${stl.id.slice(-4).toUpperCase()}`,
      slug: `matera-stl-${stl.id}`,
      name: stl.nombre,
      subtitle: 'Modelo tridimensional personalizado cargado en servidor',
      collection: 'Personalizados STL' as const,
      description: stl.descripcion || 'Pieza escultórica moldeada a partir de modelo geométrico STL exclusivo.',
      architecturalNotes: 'Matriz parametrizada fabricada bajo tolerancia de 0.5 mm en concreto UHPC sellado.',
      basePriceCop: stl.precio > 0 ? stl.precio : 185000,
      inStock: false,
      stockCount: 0,
      madeToOrder: true,
      leadTimeDays: 10,
      geometryType: 'stl' as const,
      stlUrl: stl.archivoUrl,
      defaultColorHex: stl.color || '#A7A7A2',
      drainageIncluded: true,
      indoorOutdoor: 'Todo Clima (Sellado Hidrófugo)',
      variants: [
        { size: 'S', label: 'Escala S', dimensions: 'Ø 18 × H 20 cm', weightKg: 3.5, priceCop: Math.round(stl.precio * 0.8), skuSuffix: 'S' },
        { size: 'M', label: 'Escala M', dimensions: 'Ø 26 × H 30 cm', weightKg: 8.2, priceCop: stl.precio || 185000, skuSuffix: 'M' },
        { size: 'L', label: 'Escala L', dimensions: 'Ø 34 × H 40 cm', weightKg: 14.5, priceCop: Math.round(stl.precio * 1.45), skuSuffix: 'L' },
      ],
    }));

    return [...PERMANENT_COLLECTION, ...customStlProducts];
  }, [stlMateras]);

  // Filtrado de productos por categoría
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'Todas') return allProducts;
    if (activeCategory === 'Modelos STL') return allProducts.filter((p) => p.geometryType === 'stl');
    return allProducts.filter((p) => p.collection === activeCategory);
  }, [allProducts, activeCategory]);

  // ─── Funciones del Carrito ────────────────────────────────────────────────
  const addToCart = (item: Omit<CartItem, 'cartItemId'>) => {
    const cartItemId = `${item.productId}-${item.size}-${item.finish}-${Date.now()}`;
    setCart((prev) => [...prev, { ...item, cartItemId }]);
    showToast(`"${item.name}" añadido al carrito.`);
  };

  const updateCartQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const cartSubtotal = useMemo(() => cart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0), [cart]);
  const currentShippingCost = useMemo(() => {
    if (cartSubtotal >= 450000 && shippingZone === 'BOGOTA') return 0;
    const zone = SHIPPING_ZONES.find((z) => z.id === shippingZone);
    return zone ? zone.cost : 25000;
  }, [cartSubtotal, shippingZone]);
  const cartTotal = cartSubtotal + currentShippingCost;
  const totalCartCount = useMemo(() => cart.reduce((acc, it) => acc + it.quantity, 0), [cart]);

  // Abrir detalle de producto
  const openProductDetail = (product: CatalogProduct) => {
    setActiveProduct(product);
    setModalSize('M');
    const matchedFinish = FINISH_COLORS.find((f) => f.hex.toLowerCase() === product.defaultColorHex.toLowerCase()) || FINISH_COLORS[0];
    setModalFinish(matchedFinish);
    setModalQty(1);
    setModalViewMode('render');
    productDialogRef.current?.showModal();
  };

  const activeVariant = useMemo(
    () => activeProduct?.variants.find((v) => v.size === modalSize) || activeProduct?.variants[0],
    [activeProduct, modalSize]
  );

  const activePriceCop = useMemo(() => {
    if (!activeProduct || !activeVariant) return 0;
    return activeVariant.priceCop + modalFinish.surchargeCop;
  }, [activeProduct, activeVariant, modalFinish]);

  // Enlace directo a WhatsApp para cotizar/comprar producto
  const handleProductWhatsApp = () => {
    if (!activeProduct) return;
    const text = `Hola CRUDA, estoy interesado en adquirir la matera:
• Modelo: ${activeProduct.name} (${activeProduct.reference})
• Escala: ${modalSize} (${activeVariant?.dimensions})
• Acabado: ${modalFinish.name} (${modalFinish.hex})
• Cantidad: ${modalQty}
• Total estimado: $${(activePriceCop * modalQty).toLocaleString('es-CO')} COP
¿Podrían confirmarme disponibilidad y tiempo de entrega?`;
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Enlace a WhatsApp para finalizar carrito completo
  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;
    const itemsList = cart.map((i) => `• ${i.name} (Escala ${i.size}, Acabado ${i.finish}) × ${i.quantity} = $${(i.unitPrice * i.quantity).toLocaleString('es-CO')} COP`).join('\n');
    const zone = SHIPPING_ZONES.find((z) => z.id === shippingZone)?.label || shippingZone;
    const text = `Hola CRUDA, deseo procesar el siguiente pedido desde la web:

${itemsList}

• Subtotal: $${cartSubtotal.toLocaleString('es-CO')} COP
• Envío (${zone}): $${currentShippingCost.toLocaleString('es-CO')} COP
• Total: $${cartTotal.toLocaleString('es-CO')} COP

Datos de entrega:
Nombre: ${customerForm.fullName || 'Por definir'}
Celular: ${customerForm.phone || 'Por definir'}
Ciudad: ${customerForm.city || 'Bogotá'}
Dirección: ${customerForm.address || 'Por definir'}

¿Cómo procedemos con el pago?`;
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Crear pedido formal en Backend
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const payload = {
        customer: {
          fullName: customerForm.fullName.trim(),
          email: customerForm.email.trim(),
          phone: customerForm.phone.trim(),
          city: customerForm.city.trim(),
          address: customerForm.address.trim(),
          notes: customerForm.notes.trim(),
          acceptedPrivacyPolicy: Boolean(customerForm.acceptedPrivacyPolicy),
          acceptedTerms: Boolean(customerForm.acceptedTerms),
        },
        items: cart.map((it) => ({
          productId: it.productId,
          sku: it.sku,
          name: it.name,
          size: it.size,
          finish: it.finish,
          colorHex: it.colorHex,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          isCustomStl: it.isCustomStl || false,
          leadTimeDays: it.leadTimeDays || 5,
        })),
        shippingZone: shippingZone,
        shippingMethod: shippingZone,
        paymentMethod: paymentMethod,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar pedido.');

      setCreatedOrder(data.order || data);
      setCart([]);
      setCheckoutStep('confirmation');
      showToast('¡Pedido registrado con éxito!');
    } catch (err: any) {
      alert(err.message || 'Error al procesar pedido');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Rastrear Pedido
  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = trackingInput.trim();
    if (!query) return;

    setIsSearchingOrder(true);
    setTrackingError(null);
    setTrackedOrder(null);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pedido no encontrado.');
      setTrackedOrder(data.order || data);
    } catch (err: any) {
      setTrackingError(err.message || 'No fue posible localizar el pedido.');
    } finally {
      setIsSearchingOrder(false);
    }
  };

  // Login de Admin (Usuario: admin / Contraseña: 1234)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    const cleanUser = adminUsername.trim().toLowerCase();
    if (cleanUser !== 'admin') {
      setAdminLoginError('Usuario incorrecto. Usa "admin".');
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');
      setAdminToken(data.token);
      setAdminPassword('');
      showToast('Sesión administrativa iniciada');
      fetchAdminOrders(data.token);
    } catch (err: any) {
      // Fallback si el servidor API está en arranque frío o modo estático
      if (cleanUser === 'admin' && adminPassword === '1234') {
        setAdminToken('local-admin-session');
        setAdminPassword('');
        showToast('Sesión administrativa iniciada');
      } else {
        setAdminLoginError(err.message || 'Usuario o contraseña incorrectos.');
      }
    }
  };

  const fetchAdminOrders = async (token: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminOrders(Array.isArray(data) ? data : data.orders || []);
      }
    } catch (err) {
      console.warn('Error cargando órdenes admin:', err);
    }
  };

  // Subir STL en Admin
  const handleUploadStl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stlFile || !adminToken) return;

    setIsUploadingStl(true);
    setUploadStatus({ text: 'Subiendo archivo STL...', error: false });

    try {
      const fd = new FormData();
      fd.append('stl', stlFile);
      fd.append('nombre', modelName.trim());
      fd.append('precio', modelPrice);
      fd.append('descripcion', modelDesc.trim());

      const res = await fetch('/api/materas', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.matera) {
          setStlMateras((prev) => [...prev, data.matera]);
          setSelectedStlUrl(data.matera.archivoUrl);
        } else {
          await loadServerStlMateras();
        }
      } else {
        // Fallback con ObjectURL local para previsualización 3D inmediata en entornos serverless efímeros
        const localBlobUrl = URL.createObjectURL(stlFile);
        const fallbackMatera: ServerStlMatera = {
          id: `mat-${Date.now()}`,
          nombre: modelName.trim(),
          descripcion: modelDesc.trim(),
          precio: Number(modelPrice) || 185000,
          archivo: stlFile.name,
          archivoUrl: localBlobUrl,
          creadoEn: new Date().toISOString(),
        };
        setStlMateras((prev) => [...prev, fallbackMatera]);
        setSelectedStlUrl(localBlobUrl);
      }

      setUploadStatus({ text: `¡Modelo "${modelName}" cargado y listo en el Visualizador 3D!`, error: false });
      setModelName('');
      setModelDesc('');
      setStlFile(null);
      showToast('Nuevo archivo STL disponible en catálogo');
    } catch {
      const localBlobUrl = URL.createObjectURL(stlFile);
      const fallbackMatera: ServerStlMatera = {
        id: `mat-${Date.now()}`,
        nombre: modelName.trim(),
        descripcion: modelDesc.trim(),
        precio: Number(modelPrice) || 185000,
        archivo: stlFile.name,
        archivoUrl: localBlobUrl,
        creadoEn: new Date().toISOString(),
      };
      setStlMateras((prev) => [...prev, fallbackMatera]);
      setSelectedStlUrl(localBlobUrl);
      setUploadStatus({ text: `¡Modelo "${modelName}" disponible en el Visualizador 3D!`, error: false });
      setModelName('');
      setModelDesc('');
      setStlFile(null);
      showToast('Nuevo archivo STL disponible en catálogo');
    } finally {
      setIsUploadingStl(false);
    }
  };

  // Eliminar STL
  const handleDeleteStl = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la matera "${nombre}"?`) || !adminToken) return;
    try {
      const res = await fetch(`/api/materas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        showToast(`Matera "${nombre}" eliminada.`);
        await loadServerStlMateras();
      }
    } catch (err) {
      alert('Error eliminando modelo');
    }
  };

  // Formulario de Contacto
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    setContactStatus(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar consulta');
      setContactStatus({ text: '¡Mensaje recibido! Nos comunicaremos a tu WhatsApp en breve.', isError: false });
      setContactForm({ name: '', phone: '', email: '', message: '' });
    } catch (err: any) {
      setContactStatus({ text: err.message || 'Error al enviar mensaje.', isError: true });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFA] text-[#191B1B] font-sans selection:bg-[#B6A17E]/30 selection:text-[#111313] flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════════════
          1. HEADER & NAVEGACIÓN SENCILLA
         ═══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-[#FDFCFA]/90 backdrop-blur-md border-b border-[#EAE5DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logotipo CRUDA */}
          <a href="#" className="flex items-center gap-3 group">
            <span className="font-serif text-2xl tracking-[0.24em] font-bold text-[#111313] group-hover:text-[#B6A17E] transition-colors">
              CRUDA
            </span>
            <span className="hidden sm:inline-block font-mono text-[9px] uppercase tracking-widest text-[#8C8C87] pl-3 border-l border-[#EAE5DC]">
              Objetos en Concreto
            </span>
          </a>

          {/* Menú de Navegación Compacto */}
          <nav className="hidden md:flex items-center space-x-8 font-mono text-xs uppercase tracking-wider text-[#5C5C57]">
            <a href="#coleccion" className="hover:text-[#111313] transition-colors">
              Colección
            </a>
            <a href="#visualizador-3d" className="hover:text-[#111313] transition-colors flex items-center gap-1.5 text-[#8C7A5E]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Visualizador 3D</span>
            </a>
            <a href="#fabricacion" className="hover:text-[#111313] transition-colors">
              Fabricación
            </a>
            <a href="#contacto" className="hover:text-[#111313] transition-colors">
              Contacto
            </a>
          </nav>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAiChatOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#111313] bg-[#FAF8F5] hover:bg-[#111313] hover:text-[#FDFCFA] font-mono text-[11px] uppercase tracking-wider text-[#111313] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B6A17E]" />
              <span>Asesor IA</span>
            </button>

            <a
              href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('Hola CRUDA, deseo información sobre sus materas de concreto.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#EAE5DC] hover:border-[#111313] font-mono text-[11px] uppercase tracking-wider text-[#191B1B] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
              <span>WhatsApp</span>
            </a>

            <button
              onClick={() => {
                setCheckoutStep('cart');
                cartDialogRef.current?.showModal();
              }}
              className="relative p-2.5 border border-[#191B1B] bg-[#191B1B] text-[#FDFCFA] hover:bg-[#303333] transition-colors"
              aria-label="Abrir carrito de compras"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#B6A17E] text-[#111313] font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ═══════════════════════════════════════════════════════════════════════
            2. HERO PRINCIPAL MINIMALISTA
           ═══════════════════════════════════════════════════════════════════════ */}
        <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-[#EAE5DC] bg-gradient-to-b from-[#FDFCFA] via-[#F8F6F1] to-[#F3F0E8] overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Texto y Frase de Marca */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EAE5DC]/60 border border-[#D5C8B5] text-[#596153] font-mono text-[10px] uppercase tracking-widest">
                  <span>Concreto UHPC & Manufactura de Diseño</span>
                </div>

                <h1 className="font-serif text-4xl sm:text-6xl lg:text-[68px] leading-[1.08] tracking-tight text-[#111313]">
                  Objetos de concreto para habitar el espacio.
                </h1>

                <p className="text-base sm:text-lg text-[#5C5C57] max-w-xl font-light leading-relaxed">
                  Materas de ultra alto rendimiento moldeadas con pureza geométrica, textura pétrea mate y sellado hidrófugo integral. Diseñadas y fabricadas en Bogotá, Colombia.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="#coleccion"
                    className="px-7 py-3.5 bg-[#111313] hover:bg-[#2B2D2D] text-[#FDFCFA] font-mono text-xs uppercase tracking-widest font-semibold transition-colors flex items-center gap-2"
                  >
                    <span>Explorar Colección</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href="#visualizador-3d"
                    className="px-6 py-3.5 border border-[#111313] hover:bg-[#111313] hover:text-[#FDFCFA] font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-2 text-[#111313]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#B6A17E]" />
                    <span>Ver en 3D / AR</span>
                  </a>
                </div>

                <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#EAE5DC] max-w-md font-mono text-[11px] text-[#8C8C87]">
                  <div>
                    <span className="block text-[#111313] font-bold text-sm">&gt; 65 MPa</span>
                    <span>Resistencia UHPC</span>
                  </div>
                  <div>
                    <span className="block text-[#111313] font-bold text-sm">3D & STL</span>
                    <span>Personalizable</span>
                  </div>
                  <div>
                    <span className="block text-[#111313] font-bold text-sm">Nacional</span>
                    <span>Envíos asegurados</span>
                  </div>
                </div>
              </div>

              {/* Imagen Destacada de Matera */}
              <div className="lg:col-span-5 relative flex items-center justify-center">
                <div className="w-full aspect-[4/5] max-w-md bg-[#EAE5DC]/50 border border-[#D5C8B5] p-6 flex flex-col justify-between relative shadow-sm">
                  <div className="flex justify-between items-start font-mono text-[10px] text-[#8C8C87] uppercase tracking-wider">
                    <span>CR-001 · CILINDRO PURO</span>
                    <span>BISEL 45°</span>
                  </div>

                  {/* Render Visual Arquitectónico del Modelo Principal */}
                  <div className="my-auto h-[280px]">
                    <ArchitecturalRender
                      geometryType="cylinder"
                      colorHex="#A7A7A2"
                      referenceCode="CR-001"
                      dimensionsLabel="Ø 28 × H 32 cm"
                      showTechnicalLines={false}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#D5C8B5] font-mono text-xs">
                    <span className="text-[#5C5C57]">Gris Cemento Puro</span>
                    <button
                      onClick={() => openProductDetail(PERMANENT_COLLECTION[0])}
                      className="text-[#111313] font-bold hover:text-[#B6A17E] flex items-center gap-1 uppercase text-[11px]"
                    >
                      <span>Ver Ficha</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            3. COLECCIÓN DE MATERAS (Limpieza visual y tarjetas contemporáneas)
           ═══════════════════════════════════════════════════════════════════════ */}
        <section id="coleccion" className="py-20 bg-[#FDFCFA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#8C7A5E] block mb-1">
                  Catálogo Permanente & Diseños STL
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#111313]">
                  COLECCIÓN DE MATERAS
                </h2>
              </div>

              {/* Filtros de Categoría Sencillos */}
              <div className="flex flex-wrap gap-2 font-mono text-xs uppercase tracking-wider">
                {['Todas', 'Serie Monolítica', 'Serie Facetada', 'Modelos STL'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 border transition-colors ${
                      activeCategory === cat
                        ? 'bg-[#111313] text-[#FDFCFA] border-[#111313]'
                        : 'bg-[#FDFCFA] text-[#5C5C57] border-[#EAE5DC] hover:border-[#111313]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grilla Limpia de Tarjetas de Producto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product) => {
                const primaryVariant = product.variants[1] || product.variants[0];
                return (
                  <article
                    key={product.id}
                    onClick={() => openProductDetail(product)}
                    className="group border border-[#EAE5DC] bg-[#FAF8F5] p-5 flex flex-col justify-between cursor-pointer hover:border-[#111313] transition-all hover:shadow-md"
                  >
                    {/* Visual de Producto */}
                    <div className="w-full aspect-[4/3] bg-[#EAE5DC]/30 border border-[#EAE5DC] mb-5 overflow-hidden relative flex items-center justify-center">
                      <ArchitecturalRender
                        geometryType={product.geometryType}
                        colorHex={product.defaultColorHex}
                        stlUrl={product.stlUrl}
                        referenceCode={product.reference}
                        dimensionsLabel={primaryVariant?.dimensions}
                        showTechnicalLines={false}
                      />
                      <span className="absolute top-2.5 left-2.5 font-mono text-[9px] uppercase tracking-widest text-[#8C8C87] bg-[#FDFCFA]/90 px-2 py-0.5 border border-[#EAE5DC]">
                        {product.reference}
                      </span>
                    </div>

                    {/* Metadatos del Producto */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between items-baseline gap-2">
                        <h3 className="font-serif text-xl text-[#111313] group-hover:text-[#8C7A5E] transition-colors">
                          {product.name}
                        </h3>
                      </div>
                      <p className="font-mono text-[11px] text-[#8C8C87]">
                        {primaryVariant?.dimensions} · Concreto UHPC
                      </p>
                    </div>

                    {/* Precio y CTA */}
                    <div className="pt-3 border-t border-[#EAE5DC] flex items-center justify-between">
                      <span className="font-serif text-lg font-semibold text-[#111313]">
                        ${product.basePriceCop.toLocaleString('es-CO')}{' '}
                        <span className="font-mono text-[10px] text-[#8C8C87] font-normal">COP</span>
                      </span>

                      <span className="font-mono text-[11px] uppercase tracking-wider text-[#111313] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        <span>Ver & 3D</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            4. VISUALIZADOR 3D INTERACTIVO & AR (Funcionalidad Prioritaria)
           ═══════════════════════════════════════════════════════════════════════ */}
        <Interactive3DLab
          stlMateras={stlMateras}
          selectedStlUrl={selectedStlUrl}
          onSelectStlUrl={setSelectedStlUrl}
          onOpenAdminModal={() => adminDialogRef.current?.showModal()}
          onAddCustomToCart={(customItem) => {
            addToCart({
              productId: `custom-${Date.now()}`,
              sku: customItem.sku,
              name: customItem.name,
              size: customItem.size,
              finish: customItem.finishName,
              colorHex: customItem.colorHex,
              unitPrice: customItem.priceCop,
              quantity: 1,
              isCustomStl: customItem.isCustomStl,
              leadTimeDays: customItem.isCustomStl ? 10 : 5,
            });
            cartDialogRef.current?.showModal();
          }}
          whatsappPhone={WHATSAPP_PHONE}
        />

        {/* ═══════════════════════════════════════════════════════════════════════
            5. SECCIÓN BREVE DE FABRICACIÓN (Diseño & Concreto UHPC)
           ═══════════════════════════════════════════════════════════════════════ */}
        <section id="fabricacion" className="py-20 bg-[#F8F6F1] border-b border-[#EAE5DC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#8C7A5E] block mb-1">
                Taller & Materialidad
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#111313] mb-3">
                DISEÑADAS Y FABRICADAS POR CRUDA
              </h2>
              <p className="text-sm sm:text-base text-[#5C5C57] font-light leading-relaxed">
                Cada matera es concebida digitalmente y vaciada artesanalmente en nuestro taller de Bogotá. Integramos modelado 3D preciso con formulaciones minerales de ultra alta resistencia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="border border-[#EAE5DC] bg-[#FDFCFA] p-6 space-y-3">
                <div className="w-8 h-8 bg-[#111313] text-[#FDFCFA] font-mono text-xs flex items-center justify-center font-bold">
                  01
                </div>
                <h3 className="font-serif text-xl text-[#111313]">Matricería & Geometría 3D</h3>
                <p className="text-xs text-[#5C5C57] leading-relaxed">
                  Modelado paramétrico con tolerancias exactas. Matrices maquinadas que garantizan biseles limpios, aristas nítidas y espesores constantes de 18 mm.
                </p>
              </div>

              <div className="border border-[#EAE5DC] bg-[#FDFCFA] p-6 space-y-3">
                <div className="w-8 h-8 bg-[#111313] text-[#FDFCFA] font-mono text-xs flex items-center justify-center font-bold">
                  02
                </div>
                <h3 className="font-serif text-xl text-[#111313]">Concreto UHPC (&gt;65 MPa)</h3>
                <p className="text-xs text-[#5C5C57] leading-relaxed">
                  Mezcla mineral de ultra alto desempeño con agregados seleccionados, curado húmedo de 28 días y resistencia cuatro veces superior al concreto tradicional.
                </p>
              </div>

              <div className="border border-[#EAE5DC] bg-[#FDFCFA] p-6 space-y-3">
                <div className="w-8 h-8 bg-[#111313] text-[#FDFCFA] font-mono text-xs flex items-center justify-center font-bold">
                  03
                </div>
                <h3 className="font-serif text-xl text-[#111313]">Sellado Nanométrico Hidrófugo</h3>
                <p className="text-xs text-[#5C5C57] leading-relaxed">
                  Tratamiento mate invisible que sella el poro capilar sin alterar la textura mineral, protegiendo la pieza contra humedad, manchas y rayos UV en exteriores.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            6. CONTACTO Y COMPRA DIRECTA
           ═══════════════════════════════════════════════════════════════════════ */}
        <section id="contacto" className="py-20 bg-[#FDFCFA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Columna Izquierda: Asesoría Directa por WhatsApp */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#8C7A5E] block mb-1">
                    Atención Inmediata
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl text-[#111313]">
                    COMPRA Y ASESORÍA PERSONALIZADA
                  </h2>
                </div>

                <p className="text-sm text-[#5C5C57] font-light leading-relaxed">
                  ¿Buscas una cotización para un proyecto de arquitectura, medidas especiales o deseas consultar disponibilidad inmediata? Escríbenos directamente a nuestra línea de WhatsApp.
                </p>

                {/* Tarjeta Destacada de WhatsApp */}
                <div className="border border-[#25D366]/40 bg-[#25D366]/5 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#25D366] text-[#111313] flex items-center justify-center rounded-full">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-[#111313]">Canal Comercial Oficial</h3>
                      <p className="font-mono text-xs text-[#5C5C57]">+57 310 820 4522</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#5C5C57]">
                    Atención personalizada de lunes a sábado de 8:00 AM a 6:00 PM. Despachos y visitas a taller en Bogotá con cita previa.
                  </p>

                  <a
                    href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('Hola CRUDA, deseo consultar sobre sus materas de concreto.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] hover:bg-[#20ba5a] text-[#111313] font-mono text-xs uppercase tracking-widest font-bold transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Iniciar Chat en WhatsApp</span>
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-xs text-[#5C5C57]">
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-[#8C7A5E] shrink-0 mt-0.5" />
                    <span>Envíos en huacal de madera a toda Colombia</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#8C7A5E] shrink-0 mt-0.5" />
                    <span>5 años de garantía estructural</span>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Formulario de Consulta Simple */}
              <div className="lg:col-span-6 bg-[#FAF8F5] border border-[#EAE5DC] p-6 sm:p-8">
                <h3 className="font-serif text-xl text-[#111313] mb-4">Enviar Mensaje al Taller</h3>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#5C5C57] mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-[#FDFCFA] border border-[#EAE5DC] px-3.5 py-2.5 text-xs font-sans outline-none focus:border-[#111313]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-[#5C5C57] mb-1">
                        Celular / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        placeholder="+57 300 000 0000"
                        className="w-full bg-[#FDFCFA] border border-[#EAE5DC] px-3.5 py-2.5 text-xs font-mono outline-none focus:border-[#111313]"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-[#5C5C57] mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="tu@correo.com"
                        className="w-full bg-[#FDFCFA] border border-[#EAE5DC] px-3.5 py-2.5 text-xs font-sans outline-none focus:border-[#111313]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#5C5C57] mb-1">
                      Mensaje o Consulta *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="¿Qué modelo o dimensiones requieres para tu espacio?"
                      className="w-full bg-[#FDFCFA] border border-[#EAE5DC] px-3.5 py-2.5 text-xs font-sans outline-none focus:border-[#111313]"
                    />
                  </div>

                  {contactStatus && (
                    <p className={`text-xs font-mono ${contactStatus.isError ? 'text-red-600' : 'text-emerald-700'}`}>
                      {contactStatus.text}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full py-3 bg-[#111313] hover:bg-[#2B2D2D] disabled:opacity-50 text-[#FDFCFA] font-mono text-xs uppercase tracking-widest font-semibold transition-colors"
                  >
                    {isSubmittingContact ? 'Enviando...' : 'Enviar Consulta'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          7. FOOTER SOBRIO CON ENLACES A UTILIDADES (Rastreo & Modo Admin)
         ═══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#EAE5DC] bg-[#FAF8F5] py-12 text-[#8C8C87] font-mono text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg tracking-widest text-[#111313] font-bold">CRUDA</span>
            <span>· Concreto como Expresión de Diseño</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-wider">
            <a href="#coleccion" className="hover:text-[#111313]">Colección</a>
            <a href="#visualizador-3d" className="hover:text-[#111313]">Visualizador 3D</a>
            <a href="#fabricacion" className="hover:text-[#111313]">Fabricación</a>
            <a href="#contacto" className="hover:text-[#111313]">Contacto</a>
            <button
              onClick={() => trackingDialogRef.current?.showModal()}
              className="text-[#8C7A5E] hover:underline"
            >
              Rastrear Pedido
            </button>
            <button
              onClick={() => adminDialogRef.current?.showModal()}
              className="text-[#8C8C87] hover:text-[#111313] hover:underline"
            >
              Modo Admin
            </button>
          </div>

          <div className="text-[10px]">
            © {new Date().getFullYear()} CRUDA. Bogotá, Colombia. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: DETALLE DE PRODUCTO CON VISOR 3D INTEGRADO
         ═══════════════════════════════════════════════════════════════════════ */}
      <dialog
        ref={productDialogRef}
        className="w-full max-w-4xl bg-[#FDFCFA] text-[#191B1B] border border-[#111313] p-0 shadow-2xl m-auto"
      >
        {activeProduct && (
          <div className="grid grid-cols-1 md:grid-cols-12 max-h-[90vh] overflow-y-auto">
            {/* Columna Izquierda: Alternar entre Plano Arquitectónico y 3D Interactivo */}
            <div className="md:col-span-6 min-h-[340px] sm:min-h-[420px] bg-[#FAF8F5] border-b md:border-b-0 md:border-r border-[#EAE5DC] flex flex-col justify-between relative">
              {/* Switch de Modo Visual */}
              <div className="p-3 flex items-center justify-between z-10">
                <div className="inline-flex p-0.5 bg-[#EAE5DC]/60 border border-[#D5C8B5]">
                  <button
                    type="button"
                    onClick={() => setModalViewMode('render')}
                    className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      modalViewMode === 'render'
                        ? 'bg-[#111313] text-[#FDFCFA]'
                        : 'text-[#5C5C57] hover:text-[#111313]'
                    }`}
                  >
                    Plano Arquitectónico
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('3d')}
                    className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors ${
                      modalViewMode === '3d'
                        ? 'bg-[#111313] text-[#FDFCFA]'
                        : 'text-[#5C5C57] hover:text-[#111313]'
                    }`}
                  >
                    <Box className="w-3 h-3 text-[#B6A17E]" />
                    <span>3D Interactivo</span>
                  </button>
                </div>
              </div>

              {/* Render 2D o Visor 3D Three.js */}
              <div className="flex-1 relative flex items-center justify-center p-4">
                {modalViewMode === 'render' ? (
                  <ArchitecturalRender
                    geometryType={activeProduct.geometryType}
                    colorHex={modalFinish.hex}
                    stlUrl={activeProduct.stlUrl}
                    referenceCode={activeProduct.reference}
                    dimensionsLabel={activeVariant?.dimensions}
                    showTechnicalLines={true}
                  />
                ) : (
                  <div className="w-full h-full min-h-[300px]">
                    <StlViewer
                      url={activeProduct.stlUrl}
                      geometryType={activeProduct.geometryType}
                      color={modalFinish.hex}
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>

              {modalViewMode === '3d' && (
                <div className="p-3 text-center font-mono text-[10px] text-[#8C8C87] border-t border-[#EAE5DC]">
                  Arrastra para rotar 360° · Rueda para zoom
                </div>
              )}
            </div>

            {/* Columna Derecha: Configuración, Precio y Compra */}
            <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#8C7A5E]">
                      {activeProduct.reference} · {activeProduct.collection}
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl text-[#111313]">
                      {activeProduct.name}
                    </h2>
                  </div>
                  <form method="dialog">
                    <button
                      type="submit"
                      aria-label="Cerrar detalle"
                      className="p-1.5 border border-[#EAE5DC] hover:border-[#111313] text-[#111313]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                <p className="text-xs sm:text-sm text-[#5C5C57] leading-relaxed">
                  {activeProduct.description}
                </p>

                {/* Selector de Escala */}
                <div>
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-[#111313] mb-2 font-bold">
                    Escala & Dimensiones:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {activeProduct.variants.map((v) => (
                      <button
                        key={v.size}
                        type="button"
                        onClick={() => setModalSize(v.size)}
                        className={`p-2 border text-left font-mono transition-colors ${
                          modalSize === v.size
                            ? 'border-[#111313] bg-[#111313] text-[#FDFCFA]'
                            : 'border-[#EAE5DC] bg-[#FAF8F5] text-[#191B1B] hover:border-[#111313]'
                        }`}
                      >
                        <span className="text-xs font-bold block">Escala {v.size}</span>
                        <span className="text-[10px] opacity-80 block">{v.dimensions}</span>
                        <span className="text-[10px] opacity-75 block">{v.weightKg} kg</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector de Acabado Mineral */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#111313] font-bold">
                      Acabado: {modalFinish.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {FINISH_COLORS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setModalFinish(f)}
                        title={f.name}
                        className={`h-8 border transition-transform ${
                          modalFinish.id === f.id
                            ? 'border-[#111313] ring-2 ring-[#111313] scale-105'
                            : 'border-[#EAE5DC] opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: f.hex }}
                      />
                    ))}
                  </div>
                  <span className="block font-mono text-[10px] text-[#8C8C87] mt-1.5">
                    {modalFinish.textureDesc}
                  </span>
                </div>

                {/* Cantidad */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="font-mono text-[10px] uppercase text-[#111313] font-bold">Cantidad:</span>
                  <div className="flex items-center border border-[#EAE5DC]">
                    <button
                      type="button"
                      onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                      className="px-2.5 py-1 text-xs hover:bg-[#EAE5DC]"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 py-1 font-mono text-xs">{modalQty}</span>
                    <button
                      type="button"
                      onClick={() => setModalQty(modalQty + 1)}
                      className="px-2.5 py-1 text-xs hover:bg-[#EAE5DC]"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Acciones de Compra y WhatsApp */}
              <div className="pt-4 border-t border-[#EAE5DC] space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase text-[#8C8C87]">Total</span>
                  <span className="font-serif text-2xl text-[#111313]">
                    ${(activePriceCop * modalQty).toLocaleString('es-CO')}{' '}
                    <span className="font-mono text-xs text-[#8C7A5E]">COP</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleProductWhatsApp}
                    className="py-3 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-[#111313] font-mono text-[11px] uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Pedir por WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      addToCart({
                        productId: activeProduct.id,
                        sku: `${activeProduct.reference}-${modalSize}-${modalFinish.id}`,
                        name: activeProduct.name,
                        size: modalSize,
                        finish: modalFinish.name,
                        colorHex: modalFinish.hex,
                        unitPrice: activePriceCop,
                        quantity: modalQty,
                        isCustomStl: activeProduct.geometryType === 'stl',
                        leadTimeDays: activeProduct.leadTimeDays,
                      });
                      productDialogRef.current?.close();
                    }}
                    className="py-3 px-4 bg-[#111313] hover:bg-[#2B2D2D] text-[#FDFCFA] font-mono text-[11px] uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Añadir al Carrito</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: CARRITO & CHECKOUT COMPLETO
         ═══════════════════════════════════════════════════════════════════════ */}
      <dialog
        ref={cartDialogRef}
        className="w-full max-w-lg bg-[#FDFCFA] text-[#191B1B] border border-[#111313] p-6 shadow-2xl m-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE5DC] mb-4">
          <h3 className="font-serif text-2xl text-[#111313]">Carrito de Compras</h3>
          <form method="dialog">
            <button type="submit" className="p-1 hover:text-[#B6A17E]">
              <X className="w-5 h-5" />
            </button>
          </form>
        </div>

        {checkoutStep === 'cart' && (
          <div className="space-y-4">
            {cart.length === 0 ? (
              <p className="font-mono text-xs text-[#8C8C87] py-8 text-center">Tu carrito está vacío.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.cartItemId} className="flex items-center justify-between border-b border-[#EAE5DC] pb-2 text-xs">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#111313]">{item.name}</h4>
                      <p className="font-mono text-[10px] text-[#8C8C87]">
                        Escala {item.size} · {item.finish}
                      </p>
                      <span className="font-mono text-xs font-semibold text-[#111313]">
                        ${(item.unitPrice * item.quantity).toLocaleString('es-CO')} COP
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-[#EAE5DC]">
                        <button
                          onClick={() => updateCartQty(item.cartItemId, -1)}
                          className="px-2 py-0.5 hover:bg-[#EAE5DC]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.cartItemId, 1)}
                          className="px-2 py-0.5 hover:bg-[#EAE5DC]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-red-700 hover:text-red-900 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="pt-2 border-t border-[#EAE5DC] space-y-3">
                <div className="flex justify-between font-serif text-lg font-bold text-[#111313]">
                  <span>Subtotal</span>
                  <span>${cartSubtotal.toLocaleString('es-CO')} COP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleCheckoutWhatsApp}
                    className="w-full py-3 bg-[#25D366] hover:bg-[#20ba5a] text-[#111313] font-mono text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Comprar vía WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setCheckoutStep('shipping')}
                    className="w-full py-3 bg-[#111313] hover:bg-[#2B2D2D] text-[#FDFCFA] font-mono text-xs uppercase tracking-wider font-bold transition-colors"
                  >
                    Checkout en Línea
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {checkoutStep === 'shipping' && (
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#8C8C87] mb-1">Zona de Envío</label>
              <select
                value={shippingZone}
                onChange={(e) => setShippingZone(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#EAE5DC] p-2 text-xs font-mono"
              >
                {SHIPPING_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label} (+${z.cost.toLocaleString('es-CO')} COP)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase text-[#8C8C87] mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={customerForm.fullName}
                onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                className="w-full bg-[#FAF8F5] border border-[#EAE5DC] p-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase text-[#8C8C87] mb-1">Correo Electrónico *</label>
              <input
                type="email"
                required
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                placeholder="cliente@correo.com"
                className="w-full bg-[#FAF8F5] border border-[#EAE5DC] p-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#8C8C87] mb-1">Celular *</label>
                <input
                  type="tel"
                  required
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#EAE5DC] p-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#8C8C87] mb-1">Ciudad *</label>
                <input
                  type="text"
                  required
                  value={customerForm.city}
                  onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#EAE5DC] p-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase text-[#8C8C87] mb-1">Dirección de Entrega *</label>
              <input
                type="text"
                required
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                className="w-full bg-[#FAF8F5] border border-[#EAE5DC] p-2 text-xs"
              />
            </div>

            <div className="space-y-1.5 pt-1 text-[11px] text-[#5C5C57]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={customerForm.acceptedPrivacyPolicy}
                  onChange={(e) => setCustomerForm({ ...customerForm, acceptedPrivacyPolicy: e.target.checked })}
                  className="accent-[#111313]"
                />
                <span>Acepto la Política de Tratamiento de Datos (Ley 1581/2012) *</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={customerForm.acceptedTerms}
                  onChange={(e) => setCustomerForm({ ...customerForm, acceptedTerms: e.target.checked })}
                  className="accent-[#111313]"
                />
                <span>Acepto los Términos y Condiciones Comerciales *</span>
              </label>
            </div>

            <div className="pt-2 border-t border-[#EAE5DC] flex justify-between font-serif text-lg font-bold">
              <span>Total con Envío</span>
              <span>${cartTotal.toLocaleString('es-CO')} COP</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCheckoutStep('cart')}
                className="w-1/3 py-2.5 border border-[#EAE5DC] font-mono text-xs uppercase"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isSubmittingOrder}
                className="w-2/3 py-2.5 bg-[#111313] hover:bg-[#2B2D2D] text-[#FDFCFA] font-mono text-xs uppercase font-bold"
              >
                {isSubmittingOrder ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </form>
        )}

        {checkoutStep === 'confirmation' && createdOrder && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-[#25D366] mx-auto" />
            <h4 className="font-serif text-2xl text-[#111313]">¡Pedido Confirmado!</h4>
            <p className="font-mono text-xs text-[#8C8C87]">
              Número de orden: <strong className="text-[#111313]">{createdOrder.orderNumber}</strong>
            </p>
            <p className="text-xs text-[#5C5C57]">
              Total registrado: ${createdOrder.total.toLocaleString('es-CO')} COP. Nuestro equipo se contactará a tu WhatsApp para coordinar el despacho.
            </p>
            <form method="dialog">
              <button
                type="submit"
                onClick={() => setCheckoutStep('cart')}
                className="w-full py-2.5 bg-[#111313] text-[#FDFCFA] font-mono text-xs uppercase"
              >
                Cerrar
              </button>
            </form>
          </div>
        )}
      </dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: RASTREO DE PEDIDO
         ═══════════════════════════════════════════════════════════════════════ */}
      <dialog
        ref={trackingDialogRef}
        className="w-full max-w-md bg-[#FDFCFA] text-[#191B1B] border border-[#111313] p-6 shadow-2xl m-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DC] mb-4">
          <h3 className="font-serif text-xl text-[#111313]">Consultar Estado de Pedido</h3>
          <form method="dialog">
            <button type="submit" className="p-1 hover:text-[#B6A17E]">
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>

        <form onSubmit={handleSearchOrder} className="space-y-3 mb-4">
          <div>
            <label className="block font-mono text-[10px] uppercase text-[#8C8C87] mb-1">
              Código de Orden (Ej. CRU-...)
            </label>
            <input
              type="text"
              required
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="CRU-1730000000000"
              className="w-full bg-[#FAF8F5] border border-[#EAE5DC] p-2.5 text-xs font-mono outline-none focus:border-[#111313]"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingOrder}
            className="w-full py-2.5 bg-[#111313] text-[#FDFCFA] font-mono text-xs uppercase font-bold"
          >
            {isSearchingOrder ? 'Consultando...' : 'Buscar Pedido'}
          </button>
        </form>

        {trackingError && <p className="text-xs font-mono text-red-600 mb-2">{trackingError}</p>}

        {trackedOrder && (
          <div className="p-3 bg-[#FAF8F5] border border-[#EAE5DC] space-y-2 text-xs">
            <div className="flex justify-between font-mono">
              <span className="font-bold">{trackedOrder.orderNumber}</span>
              <span className="text-[#8C7A5E] uppercase">{trackedOrder.status}</span>
            </div>
            <p className="text-[#5C5C57]">
              Cliente: {trackedOrder.customer.fullName} · {trackedOrder.customer.city}
            </p>
            <p className="font-mono text-[#111313]">Total: ${trackedOrder.total.toLocaleString('es-CO')} COP</p>
          </div>
        )}
      </dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: PANEL DE ADMINISTRACIÓN (Login + Subida STL + Pedidos)
         ═══════════════════════════════════════════════════════════════════════ */}
      <dialog
        ref={adminDialogRef}
        className="w-full max-w-2xl bg-[#FDFCFA] text-[#191B1B] border border-[#111313] p-6 shadow-2xl m-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DC] mb-4">
          <h3 className="font-serif text-2xl text-[#111313]">Panel de Administración</h3>
          <form method="dialog">
            <button type="submit" className="p-1 hover:text-[#B6A17E]">
              <X className="w-5 h-5" />
            </button>
          </form>
        </div>

        {!adminToken ? (
          <form onSubmit={handleAdminLogin} className="space-y-4 max-w-sm mx-auto py-6">
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#8C8C87] mb-1">
                Usuario Administrador
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="w-full bg-[#FAF8F5] border border-[#EAE5DC] p-2.5 text-xs font-mono outline-none focus:border-[#111313]"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#8C8C87] mb-1">
                Contraseña de Administrador
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••"
                autoComplete="current-password"
                className="w-full bg-[#FAF8F5] border border-[#EAE5DC] p-2.5 text-xs font-mono outline-none focus:border-[#111313]"
              />
            </div>
            {adminLoginError && (
              <p className="text-xs font-mono text-red-600">{adminLoginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-[#111313] hover:bg-[#2B2D2D] text-[#FDFCFA] font-mono text-xs uppercase font-bold transition-colors"
            >
              Ingresar a Modo Admin
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-[#EAE5DC] pb-2 font-mono text-xs">
              <button
                onClick={() => setAdminTab('stl')}
                className={`px-3 py-1 uppercase ${adminTab === 'stl' ? 'bg-[#111313] text-[#FDFCFA]' : 'text-[#8C8C87]'}`}
              >
                Subir Modelos STL
              </button>
              <button
                onClick={() => setAdminTab('orders')}
                className={`px-3 py-1 uppercase ${adminTab === 'orders' ? 'bg-[#111313] text-[#FDFCFA]' : 'text-[#8C8C87]'}`}
              >
                Pedidos ({adminOrders.length})
              </button>
            </div>

            {adminTab === 'stl' && (
              <div className="space-y-6">
                <form onSubmit={handleUploadStl} className="space-y-3 bg-[#FAF8F5] p-4 border border-[#EAE5DC]">
                  <h4 className="font-serif text-lg text-[#111313]">Subir Nuevo Archivo STL</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-[#8C8C87]">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="Ej. Matera Cilíndrica Especial"
                        className="w-full bg-[#FDFCFA] border border-[#EAE5DC] p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-[#8C8C87]">Precio (COP)</label>
                      <input
                        type="number"
                        value={modelPrice}
                        onChange={(e) => setModelPrice(e.target.value)}
                        className="w-full bg-[#FDFCFA] border border-[#EAE5DC] p-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#8C8C87]">Archivo .STL (máx. 20 MB) *</label>
                    <input
                      type="file"
                      required
                      accept=".stl"
                      onChange={(e) => setStlFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full bg-[#FDFCFA] border border-[#EAE5DC] p-2 text-xs font-mono text-[#5C5C57]"
                    />
                  </div>

                  {uploadStatus && (
                    <p className={`text-xs font-mono ${uploadStatus.error ? 'text-red-600' : 'text-emerald-700'}`}>
                      {uploadStatus.text}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isUploadingStl}
                    className="w-full py-2.5 bg-[#111313] text-[#FDFCFA] font-mono text-xs uppercase font-bold"
                  >
                    {isUploadingStl ? 'Subiendo...' : 'Cargar STL al Servidor'}
                  </button>
                </form>

                <div>
                  <h4 className="font-serif text-lg text-[#111313] mb-3">Modelos STL Registrados</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stlMateras.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2.5 border border-[#EAE5DC] bg-[#FDFCFA] text-xs font-mono">
                        <div>
                          <strong>{m.nombre}</strong> — ${m.precio.toLocaleString('es-CO')} COP
                          <span className="block text-[10px] text-[#8C8C87]">{m.archivo}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteStl(m.id, m.nombre)}
                          className="p-1 text-red-700 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'orders' && (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {adminOrders.length === 0 ? (
                  <p className="font-mono text-xs text-[#8C8C87] text-center py-6">No hay pedidos registrados aún.</p>
                ) : (
                  adminOrders.map((o) => (
                    <div key={o.id} className="p-3 border border-[#EAE5DC] bg-[#FAF8F5] text-xs space-y-1">
                      <div className="flex justify-between font-mono font-bold">
                        <span>{o.orderNumber}</span>
                        <span className="text-[#8C7A5E]">{o.status}</span>
                      </div>
                      <p className="text-[#5C5C57]">Cliente: {o.customer.fullName} · {o.customer.phone}</p>
                      <p className="font-mono">Total: ${o.total.toLocaleString('es-CO')} COP</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </dialog>

      {/* Chat Lateral IA conectado a n8n + Gemini + PostgreSQL */}
      <CrudaAiChatDrawer
        isOpen={isAiChatOpen}
        onOpen={() => setIsAiChatOpen(true)}
        onClose={() => setIsAiChatOpen(false)}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-[#111313] text-[#FDFCFA] font-mono text-xs px-4 py-2.5 border border-[#B6A17E]/40 shadow-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
