import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  ArrowUpRight,
  FileCode2,
  Trash2,
  Plus,
  Minus,
  X,
  Eye,
  Scale,
  RefreshCw,
} from 'lucide-react';
import {
  PERMANENT_COLLECTION,
  FINISH_COLORS,
  MANUFACTURING_STAGES,
  MATERIAL_SAMPLES,
  ARCHITECTURAL_SPACES,
  FAQ_ITEMS,
  CatalogProduct,
  FinishColorOption,
} from './data/catalogData';
import { ArchitecturalRender } from './components/ArchitecturalRender';
import { Interactive3DLab, ServerStlMatera } from './components/Interactive3DLab';

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
  { id: 'PICKUP', label: 'Recogida en Taller (Bogotá Quinta Camacho / Medellín)', cost: 0, eta: 'Sin costo de flete' },
] as const;

const ORDER_STEPS = [
  { key: 'PENDING_PAYMENT', label: 'Pago Pendiente' },
  { key: 'PAID', label: 'Pago Confirmado' },
  { key: 'IN_PRODUCTION', label: 'En Fraguado UHPC' },
  { key: 'READY', label: 'Curado & Sellado Listo' },
  { key: 'SHIPPED', label: 'En Tránsito' },
  { key: 'DELIVERED', label: 'Entregado' },
];

export function App() {
  const uid = useId();

  // ─── Server STL Materas ────────────────────────────────────────────────────
  const [stlMateras, setStlMateras] = useState<ServerStlMatera[]>([]);
  const [selectedStlUrl, setSelectedStlUrl] = useState<string>('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);

  // ─── Catalog Filtering & Sorting ───────────────────────────────────────────
  const [selectedCollection, setSelectedCollection] = useState<string>('Todas');
  const [selectedAvailability, setSelectedAvailability] = useState<'all' | 'stock' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  // ─── Active Product Modal State ────────────────────────────────────────────
  const [activeProduct, setActiveProduct] = useState<CatalogProduct | null>(null);
  const [modalSize, setModalSize] = useState<'S' | 'M' | 'L'>('M');
  const [modalFinish, setModalFinish] = useState<FinishColorOption>(FINISH_COLORS[0]);
  const [modalQty, setModalQty] = useState<number>(1);
  const productDialogRef = useRef<HTMLDialogElement>(null);

  // ─── Cart & Checkout State (Persisted in localStorage) ─────────────────────
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
  const [paymentMethod, setPaymentMethod] = useState<string>('WOMPI_PSE');
  const [customerForm, setCustomerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    documentType: 'CC',
    documentNumber: '',
    city: 'Bogotá D.C.',
    department: 'Cundinamarca',
    address: '',
    notes: '',
    acceptedPrivacyPolicy: false,
    acceptedTerms: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null);
  const cartDialogRef = useRef<HTMLDialogElement>(null);

  // ─── Order Tracking State ──────────────────────────────────────────────────
  const [trackingInput, setTrackingInput] = useState<string>('');
  const [trackedOrder, setTrackedOrder] = useState<OrderResponse | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isSearchingOrder, setIsSearchingOrder] = useState<boolean>(false);

  // ─── Interactive Sections State ────────────────────────────────────────────
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [activeMaterial, setActiveMaterial] = useState(MATERIAL_SAMPLES[0]);
  const [spaceFilter, setSpaceFilter] = useState<string>('Todos');

  // ─── Contact Form State ────────────────────────────────────────────────────
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    projectType: 'Residencial / Interiorismo',
    city: 'Bogotá D.C.',
    message: '',
    acceptedPrivacy: false,
  });
  const [contactStatus, setContactStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmittingContact, setIsSubmittingContact] = useState<boolean>(false);

  // ─── Admin Modal State (STL Upload + Catalog + Orders) ─────────────────────
  const adminDialogRef = useRef<HTMLDialogElement>(null);
  const [adminTab, setAdminTab] = useState<'stl' | 'orders'>('stl');
  const [adminPassword, setAdminPassword] = useState<string>('cruda2024admin');
  const [adminToken, setAdminToken] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [modelPrice, setModelPrice] = useState<string>('210000');
  const [modelDesc, setModelDesc] = useState<string>('');
  const [stlFile, setStlFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ text: string; error: boolean } | null>(null);
  const [isUploadingStl, setIsUploadingStl] = useState<boolean>(false);
  const [adminOrders, setAdminOrders] = useState<OrderResponse[]>([]);

  // ─── Toast Notification ────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3800);
  };

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cruda_cart_v1', JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  // Load STL Materas from backend
  const loadMateras = async () => {
    setIsLoadingCatalog(true);
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
      console.error('Error cargando materas', e);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadMateras();
  }, []);

  // Modern Web Guidance: Light dismiss fallback for <dialog closedby="any"> in browsers lacking native closedBy
  useEffect(() => {
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const dialogs = [productDialogRef.current, cartDialogRef.current, adminDialogRef.current].filter(
      Boolean
    ) as HTMLDialogElement[];

    const isOutside = (e: PointerEvent, dialog: HTMLDialogElement) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const cleanups = dialogs.map((dialog) => {
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e, dialog);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e, dialog)) {
          dialog.close();
        }
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      return () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  // Merge Permanent Architectural Collection + Server STL Models into unified catalog
  const unifiedCatalog: CatalogProduct[] = useMemo(() => {
    const customProducts: CatalogProduct[] = stlMateras.map((m, idx) => {
      const basePrice = m.precio && m.precio >= 10000 ? m.precio : 195000;
      return {
        id: m.id,
        reference: `STL-0${idx + 1}`,
        slug: `stl-${m.id}`,
        name: `Edición Custom STL: ${m.nombre.toUpperCase()}`,
        subtitle: 'Geometría tridimensional cargada en servidor · Validación D7',
        collection: 'Personalizados STL',
        description:
          m.descripcion ||
          'Pieza personalizada generada a partir de malla tridimensional .STL, vaciada bajo pedido en concreto arquitectónico UHPC con aprobación técnica de desmolde.',
        architecturalNotes: `Archivo origen: ${m.archivo}. Renderizado WebGL en tiempo real.`,
        basePriceCop: basePrice,
        inStock: false,
        stockCount: 0,
        madeToOrder: true,
        leadTimeDays: 10,
        geometryType: 'stl',
        stlUrl: m.archivoUrl,
        defaultColorHex: m.color || '#A7A7A2',
        drainageIncluded: true,
        indoorOutdoor: 'Todo Clima (Sellado Hidrófugo)',
        variants: [
          { size: 'S', label: 'Escala S — 20 cm', dimensions: 'Ø 20 × H 20 cm', weightKg: 3.8, priceCop: Math.round(basePrice * 0.85), skuSuffix: 'S' },
          { size: 'M', label: 'Escala M — 30 cm', dimensions: 'Ø 30 × H 30 cm', weightKg: 7.5, priceCop: basePrice, skuSuffix: 'M' },
          { size: 'L', label: 'Escala L — 42 cm', dimensions: 'Ø 42 × H 42 cm', weightKg: 15.2, priceCop: Math.round(basePrice * 1.45), skuSuffix: 'L' },
        ],
      };
    });
    return [...PERMANENT_COLLECTION, ...customProducts];
  }, [stlMateras]);

  const filteredCatalog = useMemo(() => {
    return unifiedCatalog
      .filter((item) => {
        if (selectedCollection !== 'Todas' && item.collection !== selectedCollection) return false;
        if (selectedAvailability === 'stock' && !item.inStock) return false;
        if (selectedAvailability === 'custom' && !item.madeToOrder) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchRef = item.reference.toLowerCase().includes(q);
          const matchCol = item.collection.toLowerCase().includes(q);
          return matchName || matchRef || matchCol;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.basePriceCop - b.basePriceCop;
        if (sortBy === 'price-desc') return b.basePriceCop - a.basePriceCop;
        return 0;
      });
  }, [unifiedCatalog, selectedCollection, selectedAvailability, searchQuery, sortBy]);

  // ─── Modal & Cart Handlers ─────────────────────────────────────────────────

  const openProductModal = (product: CatalogProduct) => {
    setActiveProduct(product);
    setModalSize('M');
    const matchingFinish =
      FINISH_COLORS.find((f) => f.hex.toLowerCase() === product.defaultColorHex.toLowerCase()) || FINISH_COLORS[0];
    setModalFinish(matchingFinish);
    setModalQty(1);
    productDialogRef.current?.showModal();
  };

  const openCartModal = (step: 'cart' | 'shipping' = 'cart') => {
    setCheckoutStep(step);
    cartDialogRef.current?.showModal();
  };

  const openAdminModal = () => {
    adminDialogRef.current?.showModal();
  };

  const addToCart = (item: Omit<CartItem, 'cartItemId'>) => {
    const cartItemId = `${item.productId}-${item.size}-${item.colorHex}`;
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartItemId === cartItemId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += item.quantity;
        return updated;
      }
      return [...prev, { ...item, cartItemId }];
    });
    showToast(`Añadido al carrito: ${item.name} (Escala ${item.size})`);
  };

  const updateCartQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0), [cart]);

  const selectedShippingZoneObj = SHIPPING_ZONES.find((z) => z.id === shippingZone) || SHIPPING_ZONES[0];
  const computedShippingCost =
    cartSubtotal >= 450000 && shippingZone !== 'NACIONAL' ? 0 : selectedShippingZoneObj.cost;
  const cartTotal = cartSubtotal + computedShippingCost;
  const cartTaxIncluded = Math.round(cartTotal - cartTotal / 1.19);
  const freeShippingProgress = Math.min(100, Math.round((cartSubtotal / 450000) * 100));

  // ─── Checkout Validation (Validate on Blur, Clear on Input) ────────────────

  const validateField = (name: string, value: string): string => {
    if (name === 'fullName' && value.trim().length < 3) return 'Ingresa tu nombre y apellido completos.';
    if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Ingresa un correo electrónico válido.';
    if (name === 'phone' && value.trim().length < 7) return 'Ingresa un teléfono celular o fijo de contacto.';
    if (name === 'documentNumber' && value.trim().length < 5) return 'Ingresa un número de documento válido.';
    if (name === 'address' && value.trim().length < 6) return 'Especifica dirección, barrio y detalles de entrega.';
    return '';
  };

  const handleCustomerBlur = (field: keyof typeof customerForm) => {
    const val = String(customerForm[field] ?? '');
    const err = validateField(field, val);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleCustomerInput = (field: keyof typeof customerForm, value: string | boolean) => {
    setCustomerForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    (['fullName', 'email', 'phone', 'documentNumber', 'address'] as const).forEach((f) => {
      const msg = validateField(f, customerForm[f]);
      if (msg) errors[f] = msg;
    });
    if (!customerForm.acceptedPrivacyPolicy) {
      errors.privacy = 'Debes autorizar el tratamiento de datos personales (Ley 1581/2012).';
    }
    if (!customerForm.acceptedTerms) {
      errors.terms = 'Debes aceptar las condiciones comerciales y de retracto (Ley 1480/2011).';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          customer: customerForm,
          shippingZone,
          paymentMethod,
          simulatePaid: true,
          items: cart,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo procesar el pedido.');

      setCreatedOrder(data.order);
      setTrackedOrder(data.order);
      setTrackingInput(data.order.orderNumber);
      setCart([]);
      setCheckoutStep('confirmation');
      showToast(`Orden ${data.order.orderNumber} confirmada con éxito`);
    } catch (err: any) {
      setFieldErrors({ submit: err.message });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ─── Order Tracking Handler ────────────────────────────────────────────────

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInput.trim()) return;
    setIsSearchingOrder(true);
    setTrackingError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(trackingInput.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pedido no encontrado.');
      setTrackedOrder(data.order);
    } catch (err: any) {
      setTrackedOrder(null);
      setTrackingError(err.message);
    } finally {
      setIsSearchingOrder(false);
    }
  };

  // ─── Contact Form Handler ──────────────────────────────────────────────────

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
      if (!res.ok) throw new Error(data.error || 'Error al enviar el mensaje.');
      setContactStatus({ text: data.mensaje, isError: false });
      setContactForm({
        name: '',
        email: '',
        phone: '',
        projectType: 'Residencial / Interiorismo',
        city: 'Bogotá D.C.',
        message: '',
        acceptedPrivacy: false,
      });
    } catch (err: any) {
      setContactStatus({ text: err.message, isError: true });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // ─── Admin Handlers (STL Upload, Delete & Order Transitions) ───────────────

  const ensureAdminToken = async (): Promise<string> => {
    if (adminToken) return adminToken;
    const loginRes = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.error || 'Contraseña de administrador inválida');
    setAdminToken(loginData.token);
    return loginData.token as string;
  };

  const handleAdminUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stlFile) return;
    setIsUploadingStl(true);
    setUploadStatus({ text: 'Validando y almacenando malla .STL en servidor...', error: false });
    try {
      const token = await ensureAdminToken();
      const fd = new FormData();
      fd.append('stl', stlFile);
      fd.append('nombre', modelName.trim());
      fd.append('precio', modelPrice || '210000');
      fd.append('descripcion', modelDesc.trim());

      const uploadRes = await fetch('/api/materas', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Error al subir archivo STL');

      setUploadStatus({
        text: `Modelo "${modelName}" publicado en el catálogo y en el Laboratorio 3D.`,
        error: false,
      });
      setModelName('');
      setModelDesc('');
      setStlFile(null);
      await loadMateras();
      if (uploadData.matera?.archivoUrl) {
        setSelectedStlUrl(uploadData.matera.archivoUrl);
      }
    } catch (err: any) {
      setUploadStatus({ text: err.message, error: true });
    } finally {
      setIsUploadingStl(false);
    }
  };

  const handleDeleteStlMatera = async (id: string) => {
    try {
      const token = await ensureAdminToken();
      const res = await fetch(`/api/materas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadMateras();
        showToast('Modelo STL eliminado del servidor.');
      }
    } catch (err: any) {
      setUploadStatus({ text: err.message, error: true });
    }
  };

  const loadAdminOrders = async () => {
    try {
      const token = await ensureAdminToken();
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminOrders(data.orders || []);
      }
    } catch (err: any) {
      setUploadStatus({ text: err.message, error: true });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, toStatus: string) => {
    try {
      const token = await ensureAdminToken();
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toStatus, note: `Transición ejecutada desde consola ADMIN a ${toStatus}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadAdminOrders();
      if (trackedOrder?.id === orderId) {
        setTrackedOrder(data.order);
      }
      showToast(`Pedido actualizado a ${toStatus}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeVariant =
    activeProduct?.variants.find((v) => v.size === modalSize) || activeProduct?.variants[1] || activeProduct?.variants[0];
  const modalUnitPrice = (activeVariant?.priceCop || activeProduct?.basePriceCop || 185000) + modalFinish.surchargeCop;

  return (
    <div className="min-h-screen bg-[#F1F0EB] text-[#111313] flex flex-col font-sans selection:bg-[#B6A17E] selection:text-[#111313]">
      {/* Skip Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="visually-hidden focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#111313] focus:text-[#F1F0EB] focus:font-mono focus:text-xs"
      >
        Saltar al contenido principal
      </a>

      {/* Top Engineering Specification Bar */}
      <div className="bg-[#111313] text-[#D5C8B5] border-b border-[#292B2B] py-2 px-4 text-[11px] font-mono tracking-widest uppercase">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>CRUDA · ARQUITECTURA EN CONCRETO UHPC · HECHO A MANO EN COLOMBIA</span>
          <span className="hidden md:inline text-[#A7A7A2]">
            ENVÍO ASEGURADO EN HUACAL ESTRUCTURAL · GRATIS EN BOGOTÁ DESDE $450.000 COP
          </span>
        </div>
      </div>

      {/* Translucent Editorial Header & Primary Navigation */}
      <header className="sticky top-0 z-40 glass-light border-b border-[#A7A7A2]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Monogram */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#111313] text-[#F1F0EB] flex items-center justify-center font-serif text-lg tracking-widest border border-[#111313] group-hover:bg-[#B6A17E] group-hover:text-[#111313] transition-colors">
              C
            </div>
            <div>
              <span className="font-serif text-2xl tracking-[0.22em] font-semibold block leading-none">
                CRUDA
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#596153] block mt-1">
                Materia & Espacio
              </span>
            </div>
          </a>

          {/* Primary Navigation */}
          <nav aria-label="Principal" className="hidden lg:flex items-center gap-7 text-xs font-mono uppercase tracking-widest text-[#292B2B]">
            <a href="#catalogo" className="hover:text-[#B6A17E] transition-colors">
              Catálogo
            </a>
            <a href="#laboratorio-3d" className="hover:text-[#B6A17E] transition-colors flex items-center gap-1">
              <span>Lab 3D & AR</span>
              <span className="px-1.5 py-0.5 text-[9px] bg-[#111313] text-[#B6A17E]">STL</span>
            </a>
            <a href="#manifiesto" className="hover:text-[#B6A17E] transition-colors">
              Manifiesto
            </a>
            <a href="#proceso" className="hover:text-[#B6A17E] transition-colors">
              Proceso UHPC
            </a>
            <a href="#materiales" className="hover:text-[#B6A17E] transition-colors">
              Materialidad
            </a>
            <a href="#espacios" className="hover:text-[#B6A17E] transition-colors">
              Espacios
            </a>
            <a href="#seguimiento" className="hover:text-[#B6A17E] transition-colors">
              Rastrear Pedido
            </a>
            <a href="#legal-faq" className="hover:text-[#B6A17E] transition-colors">
              FAQ & Legal
            </a>
          </nav>

          {/* Right Actions: Admin Studio & Shopping Cart */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openAdminModal}
              className="px-3.5 py-2 border border-[#292B2B]/30 hover:border-[#111313] bg-[#F9F8F5] text-[#111313] font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <FileCode2 className="w-3.5 h-3.5 text-[#596153]" aria-hidden="true" />
              <span className="hidden sm:inline">Taller Admin / STL</span>
            </button>

            <button
              type="button"
              onClick={() => openCartModal('cart')}
              aria-label={`Abrir carrito de compras con ${cartCount} piezas`}
              className="px-4 py-2 bg-[#111313] hover:bg-[#292B2B] text-[#F1F0EB] font-mono text-xs uppercase tracking-widest flex items-center gap-2.5 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-[#B6A17E]" aria-hidden="true" />
              <span className="hidden sm:inline">Carrito</span>
              <span className="px-1.5 py-0.5 bg-[#B6A17E] text-[#111313] font-bold text-[11px]">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Live Toast Feedback */}
      <div aria-live="polite" className="fixed bottom-6 right-6 z-50 pointer-events-none">
        {toastMessage && (
          <div className="pointer-events-auto bg-[#111313] text-[#F1F0EB] border border-[#B6A17E] px-5 py-3.5 shadow-sculptural flex items-center gap-3 font-mono text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#B6A17E] shrink-0" aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Main Content Landmark */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {/* ─── 1. HERO ARQUITECTÓNICO DE GRAN FORMATO ───────────────────────── */}
        <section className="relative bg-concrete-grain border-b border-[#A7A7A2]/40 overflow-hidden">
          <div className="absolute inset-0 arch-grid-lines pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Editorial Copy (7 cols) */}
              <div className="lg:col-span-7 space-y-8">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-[#111313] text-[#F1F0EB] font-mono text-[11px] uppercase tracking-[0.22em]">
                  <span className="w-2 h-2 bg-[#B6A17E]" />
                  <span>EDICIÓN ARQUITECTÓNICA PERMANENTE · BOGOTÁ & MEDELLÍN</span>
                </div>

                <h1 className="font-serif text-4xl sm:text-6xl lg:text-[64px] leading-[1.06] tracking-tight text-[#111313]">
                  LA FORMA TAMBIÉN <span className="italic font-normal text-[#596153]">HABITA</span> EL ESPACIO.
                </h1>

                <p className="text-base sm:text-lg text-[#292B2B] max-w-2xl leading-relaxed font-normal">
                  Materas monolíticas y volúmenes escultóricos vaciados en concreto de ultra-alto desempeño (UHPC). Diseñados para dialogar con la luz natural, la vegetación contemporánea y la arquitectura brutalista.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="#catalogo"
                    className="px-8 py-4 bg-[#111313] hover:bg-[#292B2B] text-[#F1F0EB] font-mono text-xs uppercase tracking-[0.2em] font-semibold flex items-center gap-3 transition-all shadow-luxury"
                  >
                    <span>Explorar Colección</span>
                    <ArrowUpRight className="w-4 h-4 text-[#B6A17E]" aria-hidden="true" />
                  </a>
                  <a
                    href="#laboratorio-3d"
                    className="px-7 py-4 bg-[#F9F8F5] hover:bg-[#D5C8B5]/40 text-[#111313] border border-[#111313] font-mono text-xs uppercase tracking-[0.2em] font-semibold transition-all"
                  >
                    Laboratorio 3D / AR (.STL)
                  </a>
                </div>

                {/* Architectural Specs Metrics */}
                <dl className="grid grid-cols-3 gap-6 pt-8 border-t border-[#A7A7A2]/50 max-w-xl">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-[#596153]">
                      Resistencia Matriz
                    </dt>
                    <dd className="font-serif text-2xl sm:text-3xl text-[#111313] mt-1">&gt; 65 MPa</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-[#596153]">
                      Curado en Cámara
                    </dt>
                    <dd className="font-serif text-2xl sm:text-3xl text-[#111313] mt-1">28 Días</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-[#596153]">
                      Garantía Estructural
                    </dt>
                    <dd className="font-serif text-2xl sm:text-3xl text-[#111313] mt-1">5 Años</dd>
                  </div>
                </dl>
              </div>

              {/* Right Hero Sculptural Composition (5 cols) */}
              <div className="lg:col-span-5">
                <div className="relative border border-[#111313] bg-[#F9F8F5] p-3 shadow-sculptural">
                  <div className="aspect-[4/5] w-full relative overflow-hidden">
                    <ArchitecturalRender
                      geometryType="cylinder"
                      colorHex="#A7A7A2"
                      referenceCode="CR-001 · EDICIÓN MONOLÍTICA"
                      dimensionsLabel="Ø 42 × H 48 cm · 18.5 kg"
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#A7A7A2]/40 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[#596153] block text-[10px]">PIEZA DESTACADA</span>
                      <span className="font-bold text-[#111313]">CR-001 CILINDRO BISEL 45°</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openProductModal(PERMANENT_COLLECTION[0])}
                      className="px-3.5 py-2 bg-[#111313] text-[#F1F0EB] hover:bg-[#B6A17E] hover:text-[#111313] uppercase text-[10px] tracking-widest transition-colors"
                    >
                      Ver Ficha Técnica
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. MANIFIESTO DE MARCA ("LA BELLEZA DE LO ESENCIAL") ────────── */}
        <section id="manifiesto" className="py-20 bg-[#F9F8F5] border-b border-[#A7A7A2]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-5">
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#596153] block mb-3">
                  01 · Manifiesto Arquitectónico
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#111313]">
                  LA BELLEZA DE LO ESENCIAL.
                </h2>
                <div className="w-16 h-0.5 bg-[#B6A17E] my-6" />
                <p className="text-sm sm:text-base text-[#292B2B] leading-relaxed">
                  En CRUDA concebimos cada matera como una micro-arquitectura. Rechazamos los recubrimientos plásticos y las imitaciones sintéticas: celebramos la honestidad tectónica del cemento estructural, los áridos de cuarzo andino y la huella silenciosa del vaciado artesanal.
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  {
                    code: 'I',
                    title: 'Pureza Formal',
                    desc: 'Geometrías euclidianas, aristas tensas y proporciones áureas que ordenan el espacio interior y exterior.',
                  },
                  {
                    code: 'II',
                    title: 'Honestidad Material',
                    desc: 'Pigmentos minerales integrados en toda la masa del concreto. El color no se descascara: envejece con nobleza pétrea.',
                  },
                  {
                    code: 'III',
                    title: 'Artesanía de Alta Precisión',
                    desc: 'Matrices elastoméricas propias y desbaste diamantado manual grano a grano en nuestro taller en Colombia.',
                  },
                  {
                    code: 'IV',
                    title: 'Permanencia Temporal',
                    desc: 'Objetos concebidos para durar décadas a la intemperie, acompañando el crecimiento radicular de especies botánicas mayores.',
                  },
                ].map((pilar) => (
                  <div
                    key={pilar.code}
                    className="p-6 bg-[#F1F0EB] border border-[#A7A7A2]/40 hover:border-[#111313] transition-colors"
                  >
                    <span className="font-serif text-xs tracking-widest text-[#B6A17E] bg-[#111313] px-2.5 py-1 inline-block mb-4">
                      PILAR {pilar.code}
                    </span>
                    <h3 className="font-serif text-xl text-[#111313] mb-2">{pilar.title}</h3>
                    <p className="text-xs sm:text-sm text-[#292B2B] leading-relaxed">{pilar.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. CATÁLOGO COMERCIAL ("OBJETOS CON CARÁCTER" — M05/M06) ─────── */}
        <section id="catalogo" className="py-24 bg-[#F1F0EB]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#596153] block mb-2">
                  02 · Catálogo de Ediciones & Modelos STL
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl text-[#111313]">OBJETOS CON CARÁCTER</h2>
              </div>
              <p className="text-xs sm:text-sm font-mono text-[#292B2B] max-w-md">
                Precios en Pesos Colombianos (COP) con IVA 19% incluido (D3). Selecciona escala (S, M, L) y acabado mineral en cada ficha técnica.
              </p>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-[#F9F8F5] border border-[#A7A7A2]/50 p-4 sm:p-5 mb-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Collection Tabs */}
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por colección">
                  {[
                    'Todas',
                    'Serie Monolítica',
                    'Serie Facetada',
                    'Terrazo Andino',
                    'Serie Biomórfica',
                    'Personalizados STL',
                  ].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedCollection(col)}
                      className={`px-3.5 py-2 font-mono text-xs uppercase tracking-wider border transition-colors ${
                        selectedCollection === col
                          ? 'bg-[#111313] text-[#F1F0EB] border-[#111313]'
                          : 'bg-[#F1F0EB] text-[#292B2B] border-[#A7A7A2]/40 hover:border-[#111313]'
                      }`}
                    >
                      {col}
                      {col === 'Personalizados STL' && ` (${stlMateras.length})`}
                    </button>
                  ))}
                </div>

                {/* Availability & Sort */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <label htmlFor={`${uid}-catalog-search`} className="visually-hidden">
                      Buscar por referencia, nombre o material
                    </label>
                    <Search
                      className="w-4 h-4 text-[#596153] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id={`${uid}-catalog-search`}
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar CR-001, terrazo, STL..."
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="w-full pl-9 pr-3 py-2 bg-[#F1F0EB] border border-[#A7A7A2]/60 font-mono text-xs text-[#111313]"
                    />
                  </div>

                  <div>
                    <label htmlFor={`${uid}-availability`} className="visually-hidden">
                      Disponibilidad
                    </label>
                    <select
                      id={`${uid}-availability`}
                      value={selectedAvailability}
                      onChange={(e) => setSelectedAvailability(e.target.value as any)}
                      className="px-3 py-2 bg-[#F1F0EB] border border-[#A7A7A2]/60 font-mono text-xs text-[#111313]"
                    >
                      <option value="all">Todos (Stock + Bajo Pedido)</option>
                      <option value="stock">Entrega Inmediata (En Stock)</option>
                      <option value="custom">Fabricación Bajo Pedido</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`${uid}-sort`} className="visually-hidden">
                      Ordenar por
                    </label>
                    <select
                      id={`${uid}-sort`}
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 bg-[#F1F0EB] border border-[#A7A7A2]/60 font-mono text-xs text-[#111313]"
                    >
                      <option value="featured">Orden Editorial</option>
                      <option value="price-asc">Precio: Menor a Mayor</option>
                      <option value="price-desc">Precio: Mayor a Menor</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {isLoadingCatalog ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-[460px] bg-[#E5E3DC] animate-pulse border border-[#A7A7A2]/30 p-6" />
                ))}
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="bg-[#F9F8F5] border border-[#A7A7A2]/50 p-12 text-center space-y-4">
                <p className="font-serif text-2xl text-[#111313]">No se encontraron piezas con esos criterios.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCollection('Todas');
                    setSelectedAvailability('all');
                    setSearchQuery('');
                  }}
                  className="px-6 py-2.5 bg-[#111313] text-[#F1F0EB] font-mono text-xs uppercase tracking-widest"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <ul role="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCatalog.map((product) => {
                  const defaultVariant = product.variants[1] || product.variants[0];
                  return (
                    <li
                      key={product.id}
                      className="group bg-[#F9F8F5] border border-[#A7A7A2]/50 hover:border-[#111313] transition-all flex flex-col justify-between shadow-subtle hover:shadow-luxury"
                    >
                      <div>
                        {/* Visual Render Container */}
                        <div className="aspect-square w-full relative border-b border-[#A7A7A2]/40 overflow-hidden">
                          <ArchitecturalRender
                            geometryType={product.geometryType}
                            colorHex={product.defaultColorHex}
                            stlUrl={product.stlUrl}
                            referenceCode={product.reference}
                            dimensionsLabel={defaultVariant.dimensions}
                          />

                          {/* Status Badge */}
                          <div className="absolute bottom-3 right-3">
                            {product.inStock ? (
                              <span className="px-2.5 py-1 bg-[#111313] text-[#F1F0EB] font-mono text-[10px] uppercase tracking-wider">
                                En Stock ({product.stockCount})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-[#596153] text-[#F1F0EB] font-mono text-[10px] uppercase tracking-wider">
                                Bajo Pedido ({product.leadTimeDays}d hábiles)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Copy */}
                        <div className="p-6 space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-[#596153]">
                            <span>{product.collection}</span>
                            <span> Escalas: S · M · L</span>
                          </div>

                          <h3 className="font-serif text-2xl text-[#111313] leading-snug">{product.name}</h3>
                          <p className="text-xs text-[#292B2B] line-clamp-2 leading-relaxed">{product.description}</p>
                        </div>
                      </div>

                      {/* Price & Actions Footer */}
                      <div className="px-6 pb-6 pt-3 border-t border-[#A7A7A2]/30 flex items-center justify-between gap-3">
                        <div>
                          <span className="block font-mono text-[10px] uppercase text-[#596153]">
                            Desde (IVA inc.)
                          </span>
                          <span className="font-serif text-xl font-semibold text-[#111313]">
                            ${product.basePriceCop.toLocaleString('es-CO')}{' '}
                            <span className="font-mono text-[10px] font-normal">COP</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openProductModal(product)}
                            aria-label={`Configurar y ver ficha de ${product.name}`}
                            className="px-3.5 py-2.5 border border-[#111313] hover:bg-[#111313] hover:text-[#F1F0EB] font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Ficha</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              addToCart({
                                productId: product.id,
                                sku: `${product.reference}-M-STD`,
                                name: product.name,
                                size: 'M',
                                finish: 'Gris Cemento Puro',
                                colorHex: product.defaultColorHex,
                                unitPrice: product.basePriceCop,
                                quantity: 1,
                                isCustomStl: product.geometryType === 'stl',
                                leadTimeDays: product.leadTimeDays,
                              })
                            }
                            aria-label={`Agregar ${product.name} escala M al carrito`}
                            className="px-4 py-2.5 bg-[#111313] hover:bg-[#B6A17E] text-[#F1F0EB] hover:text-[#111313] font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
                          >
                            + Carrito
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ─── 4. LABORATORIO 3D, STL Y REALIDAD AUMENTADA (WebXR) ─────────── */}
        <Interactive3DLab
          stlMateras={stlMateras}
          selectedStlUrl={selectedStlUrl}
          onSelectStlUrl={setSelectedStlUrl}
          onOpenAdminModal={openAdminModal}
          onAddCustomToCart={(customItem) => {
            addToCart({
              productId: `lab-${Date.now()}`,
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
          }}
        />

        {/* ─── 5. PROCESO DE FABRICACIÓN ("LA MATERIA, EL PROCESO Y LA FORMA") ─ */}
        <section id="proceso" className="py-24 bg-[#F9F8F5] border-b border-[#A7A7A2]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#596153] block mb-2">
                03 · Ingeniería de Manufactura
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl text-[#111313]">
                LA MATERIA, EL PROCESO Y LA FORMA
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[#292B2B] leading-relaxed">
                Cada pieza atraviesa un ciclo riguroso de 28 días desde el modelado paramétrico hasta el hidrofugado nanométrico final.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Step Selector List */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-2">
                {MANUFACTURING_STAGES.map((st, idx) => (
                  <button
                    key={st.step}
                    type="button"
                    onClick={() => setActiveStageIdx(idx)}
                    className={`p-5 text-left border transition-all flex items-center justify-between ${
                      activeStageIdx === idx
                        ? 'bg-[#111313] text-[#F1F0EB] border-[#111313] shadow-luxury'
                        : 'bg-[#F1F0EB] text-[#111313] border-[#A7A7A2]/40 hover:border-[#111313]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`font-mono text-xs px-2 py-1 border ${
                          activeStageIdx === idx
                            ? 'border-[#B6A17E] text-[#B6A17E]'
                            : 'border-[#292B2B]/30 text-[#596153]'
                        }`}
                      >
                        {st.step}
                      </span>
                      <span className="font-serif text-base sm:text-lg">{st.title}</span>
                    </div>
                    <span className="font-mono text-[11px] opacity-75 shrink-0 ml-2">{st.duration}</span>
                  </button>
                ))}
              </div>

              {/* Active Stage Technical Detail Card */}
              <div className="lg:col-span-7 bg-[#111313] text-[#F1F0EB] p-8 sm:p-12 border border-[#292B2B] flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-6 relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#292B2B]">
                    <div>
                      <span className="font-mono text-xs uppercase tracking-widest text-[#B6A17E]">
                        ETAPA {MANUFACTURING_STAGES[activeStageIdx].step} · {MANUFACTURING_STAGES[activeStageIdx].duration}
                      </span>
                      <h3 className="font-serif text-2xl sm:text-3xl mt-1">
                        {MANUFACTURING_STAGES[activeStageIdx].title}
                      </h3>
                    </div>
                    <span className="px-3.5 py-1.5 bg-[#181A1A] border border-[#B6A17E]/50 font-mono text-xs text-[#B6A17E]">
                      {MANUFACTURING_STAGES[activeStageIdx].metric}
                    </span>
                  </div>

                  <p className="text-base text-[#D5C8B5] leading-relaxed">
                    {MANUFACTURING_STAGES[activeStageIdx].description}
                  </p>

                  <div className="pt-4">
                    <h4 className="font-mono text-xs uppercase tracking-widest text-[#A7A7A2] mb-3">
                      Protocolos de Control de Calidad:
                    </h4>
                    <ul className="space-y-2.5">
                      {MANUFACTURING_STAGES[activeStageIdx].specs.map((sp) => (
                        <li key={sp} className="flex items-center gap-3 font-mono text-xs text-[#F1F0EB]">
                          <span className="w-2 h-2 bg-[#B6A17E]" />
                          <span>{sp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t border-[#292B2B] flex items-center justify-between text-xs font-mono text-[#A7A7A2]">
                  <span>NORMA TÉCNICA INTERNA CRUDA-UHPC-2026</span>
                  <span>PASO {activeStageIdx + 1} DE 5</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 6. CATÁLOGO DE MATERIALIDAD ARQUITECTÓNICA ───────────────────── */}
        <section id="materiales" className="py-24 bg-[#F1F0EB] border-b border-[#A7A7A2]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#596153] block mb-2">
                  04 · Muestrario Geológico & Matrices
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl text-[#111313]">MATERIALIDAD ARQUITECTÓNICA</h2>
              </div>
              <p className="text-xs sm:text-sm font-mono text-[#292B2B] max-w-md">
                Selecciona una muestra mineral para inspeccionar su origen geológico, resistencia a la compresión y absorción capilar.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MATERIAL_SAMPLES.map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setActiveMaterial(mat)}
                    className={`p-6 text-left border transition-all ${
                      activeMaterial.id === mat.id
                        ? 'border-[#111313] bg-[#F9F8F5] ring-2 ring-[#111313] shadow-luxury'
                        : 'border-[#A7A7A2]/50 bg-[#F9F8F5]/60 hover:border-[#111313]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-12 h-12 border border-[#111313]/30 shadow-inner"
                        style={{ backgroundColor: mat.hex }}
                      />
                      <span className="font-mono text-xs text-[#596153]">{mat.code}</span>
                    </div>
                    <h3 className="font-serif text-lg text-[#111313] mb-1">{mat.name}</h3>
                    <p className="font-mono text-[11px] text-[#596153]">{mat.origin}</p>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-6 bg-[#F9F8F5] border border-[#111313] p-8 sm:p-10 space-y-6 shadow-subtle">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 border border-[#111313] shrink-0"
                    style={{ backgroundColor: activeMaterial.hex }}
                  />
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-[#596153]">
                      FICHA MINERAL · {activeMaterial.code}
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl text-[#111313]">{activeMaterial.name}</h3>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-[#292B2B] leading-relaxed">{activeMaterial.description}</p>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#A7A7A2]/40 font-mono text-xs">
                  <div className="p-3 bg-[#F1F0EB]">
                    <dt className="text-[10px] uppercase text-[#596153]">Compresión (28d)</dt>
                    <dd className="text-base font-bold text-[#111313] mt-1">{activeMaterial.compressiveStrength}</dd>
                  </div>
                  <div className="p-3 bg-[#F1F0EB]">
                    <dt className="text-[10px] uppercase text-[#596153]">Absorción H₂O</dt>
                    <dd className="text-base font-bold text-[#111313] mt-1">{activeMaterial.absorption}</dd>
                  </div>
                  <div className="p-3 bg-[#F1F0EB]">
                    <dt className="text-[10px] uppercase text-[#596153]">Tacto Superficial</dt>
                    <dd className="text-xs font-bold text-[#111313] mt-1">{activeMaterial.finishTouch}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. GALERÍA DE INSPIRACIÓN & ESPACIOS HABITADOS ───────────────── */}
        <section id="espacios" className="py-24 bg-[#F9F8F5] border-b border-[#A7A7A2]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#596153] block mb-2">
                  05 · Archivo de Proyectos en Colombia
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl text-[#111313]">ESPACIOS HABITADOS</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {['Todos', 'Residencial', 'Terraza', 'Hospitalidad', 'Estudio'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSpaceFilter(cat)}
                    className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider border ${
                      spaceFilter === cat
                        ? 'bg-[#111313] text-[#F1F0EB] border-[#111313]'
                        : 'bg-[#F1F0EB] text-[#292B2B] border-[#A7A7A2]/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {ARCHITECTURAL_SPACES.filter((s) => spaceFilter === 'Todos' || s.category === spaceFilter).map((proj) => {
                const linkedProduct =
                  PERMANENT_COLLECTION.find((p) => p.reference === proj.featuredRef) || PERMANENT_COLLECTION[0];
                return (
                  <article
                    key={proj.id}
                    className="bg-[#F1F0EB] border border-[#A7A7A2]/50 p-6 sm:p-8 flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-mono text-[#596153] uppercase tracking-wider">
                        <span>
                          {proj.category} · {proj.location}
                        </span>
                        <span>{proj.architect}</span>
                      </div>

                      <div className="h-56 w-full border border-[#A7A7A2]/40 overflow-hidden">
                        <ArchitecturalRender
                          geometryType={linkedProduct.geometryType}
                          colorHex={proj.paletteHex}
                          referenceCode={proj.featuredRef}
                          dimensionsLabel={proj.location}
                        />
                      </div>

                      <h3 className="font-serif text-2xl text-[#111313]">{proj.title}</h3>
                      <blockquote className="text-sm italic text-[#292B2B] border-l-2 border-[#B6A17E] pl-4">
                        “{proj.quote}”
                      </blockquote>
                      <p className="font-mono text-xs text-[#596153]">{proj.specs}</p>
                    </div>

                    <div className="pt-4 border-t border-[#A7A7A2]/30 flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-[#111313]">
                        Referencia: {proj.featuredProductName}
                      </span>
                      <button
                        type="button"
                        onClick={() => openProductModal(linkedProduct)}
                        className="font-mono text-xs uppercase tracking-widest text-[#111313] underline hover:text-[#B6A17E]"
                      >
                        Inspeccionar Pieza →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 8. SEGUIMIENTO DE PEDIDO EN TIEMPO REAL (M07) ────────────────── */}
        <section id="seguimiento" className="py-20 bg-[#111313] text-[#F1F0EB] border-b border-[#292B2B]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#B6A17E] block mb-2">
                06 · Trazabilidad de Manufactura y Despacho
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl">CONSULTA EL ESTADO DE TU PEDIDO</h2>
              <p className="text-xs sm:text-sm text-[#A7A7A2] mt-2 font-mono">
                Ingresa tu código de orden (ej. <code className="text-[#B6A17E]">CRU-2026-...</code>) para consultar en vivo la etapa de fraguado, curado o guía de transporte.
              </p>
            </div>

            <form onSubmit={handleTrackOrder} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 mb-10">
              <label htmlFor={`${uid}-track-order`} className="visually-hidden">
                Código de orden CRUDA
              </label>
              <input
                id={`${uid}-track-order`}
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="Código de pedido: CRU-2026-XXXX"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                required
                className="flex-1 bg-[#181A1A] border border-[#292B2B] px-4 py-3.5 text-xs font-mono text-[#F1F0EB] uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={isSearchingOrder}
                className="px-7 py-3.5 bg-[#B6A17E] hover:bg-[#c8b391] text-[#111313] font-mono text-xs uppercase tracking-widest font-bold transition-colors"
              >
                {isSearchingOrder ? 'Consultando...' : 'Consultar Estado'}
              </button>
            </form>

            {trackingError && (
              <div role="alert" className="max-w-xl mx-auto p-4 bg-red-950/50 border border-red-700/60 text-xs font-mono text-red-200 text-center">
                {trackingError}
              </div>
            )}

            {trackedOrder && (
              <div className="bg-[#181A1A] border border-[#292B2B] p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#292B2B]">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#A7A7A2]">
                      ORDEN VERIFICADA EN SERVIDOR
                    </span>
                    <h3 className="font-serif text-2xl text-[#B6A17E]">{trackedOrder.orderNumber}</h3>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="px-3 py-1 bg-[#B6A17E]/20 border border-[#B6A17E] text-[#B6A17E] font-bold">
                      ESTADO: {trackedOrder.status}
                    </span>
                    <p className="text-[11px] text-[#A7A7A2] mt-1">
                      Total: ${trackedOrder.total.toLocaleString('es-CO')} COP · Ref: {trackedOrder.paymentReference}
                    </p>
                  </div>
                </div>

                {/* Progress Pipeline */}
                <ol className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {ORDER_STEPS.map((st, i) => {
                    const activeIndex = ORDER_STEPS.findIndex((s) => s.key === trackedOrder.status);
                    const isCompleted = activeIndex >= i;
                    return (
                      <li
                        key={st.key}
                        className={`p-3 border text-center font-mono text-[10px] uppercase ${
                          isCompleted
                            ? 'border-[#B6A17E] bg-[#B6A17E]/15 text-[#F1F0EB]'
                            : 'border-[#292B2B] bg-[#111313] text-[#A7A7A2]/50'
                        }`}
                      >
                        <span className="block font-bold mb-1">0{i + 1}</span>
                        <span>{st.label}</span>
                      </li>
                    );
                  })}
                </ol>

                {/* Status History Log */}
                <div>
                  <h4 className="font-mono text-xs uppercase tracking-widest text-[#A7A7A2] mb-2">
                    Bitácora de Transiciones (OrderStatusHistory):
                  </h4>
                  <ul className="space-y-2 text-xs font-mono">
                    {trackedOrder.history.map((h, i) => (
                      <li key={i} className="p-2.5 bg-[#111313] border border-[#292B2B] flex flex-wrap justify-between gap-2">
                        <span>
                          <strong className="text-[#B6A17E]">{h.toStatus}</strong> — {h.note} ({h.changedBy})
                        </span>
                        <span className="text-[#A7A7A2]">{new Date(h.timestamp).toLocaleString('es-CO')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── 9. FAQ & CUMPLIMIENTO LEGAL COLOMBIA (M11) ───────────────────── */}
        <section id="legal-faq" className="py-24 bg-[#F1F0EB] border-b border-[#A7A7A2]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* FAQ Column */}
              <div className="lg:col-span-7 space-y-6">
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#596153] block">
                  07 · Preguntas Frecuentes
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#111313]">ESPECIFICACIONES Y ENVÍOS</h2>

                <div className="space-y-4">
                  {FAQ_ITEMS.map((faq, idx) => (
                    <div key={idx} className="bg-[#F9F8F5] border border-[#A7A7A2]/50 p-6">
                      <h3 className="font-serif text-lg text-[#111313] mb-2">{faq.question}</h3>
                      <p className="text-xs sm:text-sm text-[#292B2B] leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Framework Column (Colombia Laws 1581, 1480, 527) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-[#F9F8F5] border border-[#111313] p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-[#596153]" aria-hidden="true" />
                    <h2 className="font-serif text-2xl text-[#111313]">MARCO LEGAL COLOMBIA</h2>
                  </div>

                  <p className="font-mono text-[11px] text-[#596153] uppercase tracking-wider">
                    Base normativa sujeta a validación jurídica final (M11)
                  </p>

                  <div className="space-y-4 text-xs text-[#292B2B] leading-relaxed">
                    <div className="p-4 bg-[#F1F0EB] border-l-2 border-[#111313]">
                      <strong className="block font-mono uppercase text-[#111313] mb-1">
                        1. Protección de Datos Personales (Ley 1581 de 2012 & Decreto 1377 de 2013)
                      </strong>
                      CRUDA recolecta datos de identificación y despacho únicamente bajo consentimiento previo, expreso e informado del titular para la ejecución contractual, entrega de pedidos y atención postventa. El titular puede ejercer sus derechos de conocer, actualizar, rectificar y suprimir sus datos (Habeas Data) escribiendo a <span className="underline">privacidad@cruda.co</span>.
                    </div>

                    <div className="p-4 bg-[#F1F0EB] border-l-2 border-[#596153]">
                      <strong className="block font-mono uppercase text-[#111313] mb-1">
                        2. Estatuto del Consumidor y Derecho de Retracto (Ley 1480 de 2011, Art. 47)
                      </strong>
                      En compras de productos de línea estándar, el consumidor goza de cinco (5) días hábiles contados a partir de la entrega para ejercer el derecho de retracto. <strong>Excepción legal expresa:</strong> Conforme al numeral 3 del Artículo 47 de la Ley 1480 de 2011, no procede el derecho de retracto en los contratos de suministro de bienes confeccionados conforme a las especificaciones del consumidor o netamente personalizados (incluyendo impresiones/moldes a partir de archivos <code>.STL</code> del cliente).
                    </div>

                    <div className="p-4 bg-[#F1F0EB] border-l-2 border-[#B6A17E]">
                      <strong className="block font-mono uppercase text-[#111313] mb-1">
                        3. Comercio Electrónico (Ley 527 de 1999) y Transparencia de Precios
                      </strong>
                      Todos los valores están expresados en Pesos Colombianos (COP) con IVA incluido (D3). Los costos de envío en huacal estructural y los tiempos de fabricación en días hábiles se discriminan antes del pago final.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 10. CONTACTO, SHOWROOMS Y COTIZADOR DE ARQUITECTURA ──────────── */}
        <section id="contacto" className="py-24 bg-[#F9F8F5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-5 space-y-6">
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#596153] block">
                  08 · Atención a Arquitectos, Paisajistas y Clientes
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#111313]">TALLERES & SHOWROOMS</h2>
                <p className="text-sm text-[#292B2B] leading-relaxed">
                  Desarrollamos series especiales a medida para proyectos residenciales, hotelería, oficinas y paisajismo urbano en toda Colombia.
                </p>

                <div className="space-y-4 pt-2 font-mono text-xs">
                  <div className="p-5 bg-[#F1F0EB] border border-[#A7A7A2]/40">
                    <strong className="block text-[#111313] uppercase tracking-wider mb-1">
                      Showroom Bogotá D.C. — Quinta Camacho
                    </strong>
                    <p className="text-[#292B2B]">Calle 70A # 9-42 · Cita previa · Lun–Sáb 10:00 – 18:30</p>
                  </div>
                  <div className="p-5 bg-[#F1F0EB] border border-[#A7A7A2]/40">
                    <strong className="block text-[#111313] uppercase tracking-wider mb-1">
                      Taller de Matricería & Planta UHPC — Medellín
                    </strong>
                    <p className="text-[#292B2B]">Sector Industriales / El Poblado · Despachos Nacionales</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-[#F1F0EB] border border-[#111313] p-8 sm:p-10">
                <h3 className="font-serif text-2xl text-[#111313] mb-6">Solicitar Asesoría o Cotización Especial</h3>
                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`${uid}-ct-name`} className="block font-mono text-xs uppercase text-[#111313] mb-1.5">
                        Nombre Completo o Estudio *
                      </label>
                      <input
                        id={`${uid}-ct-name`}
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full px-3.5 py-3 bg-[#F9F8F5] border border-[#A7A7A2] text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-ct-email`} className="block font-mono text-xs uppercase text-[#111313] mb-1.5">
                        Correo Electrónico *
                      </label>
                      <input
                        id={`${uid}-ct-email`}
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-3.5 py-3 bg-[#F9F8F5] border border-[#A7A7A2] text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`${uid}-ct-phone`} className="block font-mono text-xs uppercase text-[#111313] mb-1.5">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        id={`${uid}-ct-phone`}
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="w-full px-3.5 py-3 bg-[#F9F8F5] border border-[#A7A7A2] text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-ct-city`} className="block font-mono text-xs uppercase text-[#111313] mb-1.5">
                        Ciudad de Destino
                      </label>
                      <input
                        id={`${uid}-ct-city`}
                        name="city"
                        type="text"
                        autoComplete="address-level2"
                        value={contactForm.city}
                        onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                        className="w-full px-3.5 py-3 bg-[#F9F8F5] border border-[#A7A7A2] text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`${uid}-ct-msg`} className="block font-mono text-xs uppercase text-[#111313] mb-1.5">
                      Especificaciones del Proyecto o Consulta *
                    </label>
                    <textarea
                      id={`${uid}-ct-msg`}
                      name="message"
                      rows={3}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full px-3.5 py-3 bg-[#F9F8F5] border border-[#A7A7A2] text-sm"
                    />
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      id={`${uid}-ct-privacy`}
                      name="acceptedPrivacy"
                      type="checkbox"
                      required
                      checked={contactForm.acceptedPrivacy}
                      onChange={(e) => setContactForm({ ...contactForm, acceptedPrivacy: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-[#111313]"
                    />
                    <label htmlFor={`${uid}-ct-privacy`} className="text-xs text-[#292B2B]">
                      Autorizo de manera voluntaria e informada el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 y la Política de Privacidad de CRUDA. *
                    </label>
                  </div>

                  {contactStatus && (
                    <div
                      role="status"
                      className={`p-3 font-mono text-xs border ${
                        contactStatus.isError
                          ? 'bg-red-50 border-red-400 text-red-900'
                          : 'bg-emerald-50 border-emerald-600 text-emerald-900'
                      }`}
                    >
                      {contactStatus.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full py-4 bg-[#111313] hover:bg-[#292B2B] text-[#F1F0EB] font-mono text-xs uppercase tracking-[0.2em] font-bold transition-colors"
                  >
                    {isSubmittingContact ? 'Enviando Solicitud...' : 'Enviar Solicitud al Taller'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER BRUTALISTA ──────────────────────────────────────────────── */}
      <footer className="bg-[#111313] text-[#F1F0EB] border-t border-[#292B2B] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#292B2B]">
            <div className="space-y-3">
              <span className="font-serif text-2xl tracking-[0.25em] block">CRUDA</span>
              <p className="text-xs text-[#A7A7A2] leading-relaxed">
                Diseño, matricería y manufactura de objetos arquitectónicos en concreto UHPC. Store ID: <code className="text-[#B6A17E]">store_cruda_main</code>.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-[#B6A17E] mb-3">Colecciones</h3>
              <ul className="space-y-2 text-xs text-[#A7A7A2] font-mono">
                <li>Serie Monolítica (CR-001 / CR-005)</li>
                <li>Serie Facetada (CR-002 / CR-006)</li>
                <li>Terrazo Andino (CR-003)</li>
                <li>Personalización 3D (.STL)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-[#B6A17E] mb-3">Cumplimiento Colombia</h3>
              <ul className="space-y-2 text-xs text-[#A7A7A2] font-mono">
                <li>Ley 1581/2012 (Habeas Data)</li>
                <li>Ley 1480/2011 (Estatuto Consumidor)</li>
                <li>Ley 527/1999 (Comercio Electrónico)</li>
                <li>Pasarela Wompi Sandbox (D2)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-[#B6A17E] mb-3">Operación & Taller</h3>
              <p className="text-xs text-[#A7A7A2] font-mono leading-relaxed">
                Bogotá D.C. & Medellín, Colombia.
                <br />
                Embalaje certificado en huacal de madera.
              </p>
            </div>
          </div>
          <div className="pt-8 flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-[#A7A7A2]">
            <span>© {new Date().getFullYear()} CRUDA ARQUITECTURA EN CONCRETO. TODOS LOS DERECHOS RESERVADOS.</span>
            <span>ARQUITECTURA MODULAR M00–M12</span>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: FICHA TÉCNICA EDITORIAL DE PRODUCTO (Native <dialog>)
         ═══════════════════════════════════════════════════════════════════════ */}
      <dialog
        ref={productDialogRef}
        aria-labelledby={`${uid}-product-dialog-title`}
        {...({ closedby: 'any' } as any)}
        className="w-full max-w-4xl bg-[#F9F8F5] text-[#111313] border border-[#111313] p-0 shadow-sculptural m-auto"
      >
        {activeProduct && (
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left Visual Render */}
            <div className="md:col-span-6 min-h-[340px] border-b md:border-b-0 md:border-r border-[#A7A7A2]/40">
              <ArchitecturalRender
                geometryType={activeProduct.geometryType}
                colorHex={modalFinish.hex}
                stlUrl={activeProduct.stlUrl}
                referenceCode={activeProduct.reference}
                dimensionsLabel={activeVariant?.dimensions}
              />
            </div>

            {/* Right Configuration & Specs */}
            <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#596153]">
                      {activeProduct.reference} · {activeProduct.collection}
                    </span>
                    <h2 id={`${uid}-product-dialog-title`} className="font-serif text-2xl sm:text-3xl text-[#111313]">
                      {activeProduct.name}
                    </h2>
                  </div>
                  <form method="dialog">
                    <button
                      type="submit"
                      aria-label="Cerrar ficha técnica"
                      className="p-2 border border-[#A7A7A2] hover:border-[#111313] text-[#111313]"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </form>
                </div>

                <p className="text-xs sm:text-sm text-[#292B2B] leading-relaxed">{activeProduct.description}</p>
                <p className="text-xs font-mono text-[#596153] bg-[#F1F0EB] p-3 border-l-2 border-[#111313]">
                  {activeProduct.architecturalNotes}
                </p>

                {/* Variant Scale Selector */}
                <div>
                  <span className="block font-mono text-[11px] uppercase tracking-wider text-[#111313] mb-2">
                    1. Selecciona Escala (Dimensiones & Peso):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {activeProduct.variants.map((v) => (
                      <button
                        key={v.size}
                        type="button"
                        onClick={() => setModalSize(v.size)}
                        className={`p-2.5 border text-left font-mono transition-all ${
                          modalSize === v.size
                            ? 'border-[#111313] bg-[#111313] text-[#F1F0EB]'
                            : 'border-[#A7A7A2] bg-[#F1F0EB] text-[#111313]'
                        }`}
                      >
                        <span className="text-xs font-bold block">Escala {v.size}</span>
                        <span className="text-[10px] opacity-80 block">{v.dimensions}</span>
                        <span className="text-[10px] opacity-75 block">{v.weightKg} kg</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Finish Selector */}
                <div>
                  <span className="block font-mono text-[11px] uppercase tracking-wider text-[#111313] mb-2">
                    2. Acabado Mineral: <strong>{modalFinish.name}</strong>
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {FINISH_COLORS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setModalFinish(f)}
                        aria-label={`Acabado ${f.name}`}
                        className={`h-9 border ${
                          modalFinish.id === f.id ? 'border-[#111313] ring-2 ring-[#111313]' : 'border-[#A7A7A2]'
                        }`}
                        style={{ backgroundColor: f.hex }}
                      />
                    ))}
                  </div>
                  <span className="block font-mono text-[10px] text-[#596153] mt-1.5">{modalFinish.textureDesc}</span>
                </div>

                {/* Quantity & Lead Time */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center border border-[#111313] bg-[#F1F0EB]">
                    <button
                      type="button"
                      onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                      aria-label="Disminuir cantidad"
                      className="p-2.5 hover:bg-[#D5C8B5]"
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <span className="px-4 font-mono text-xs font-bold">{modalQty}</span>
                    <button
                      type="button"
                      onClick={() => setModalQty((q) => q + 1)}
                      aria-label="Aumentar cantidad"
                      className="p-2.5 hover:bg-[#D5C8B5]"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="block font-mono text-[10px] uppercase text-[#596153]">
                      Total Pieza (IVA 19% inc.)
                    </span>
                    <span className="font-serif text-2xl font-bold text-[#111313]">
                      ${(modalUnitPrice * modalQty).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#A7A7A2]/40 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    addToCart({
                      productId: activeProduct.id,
                      sku: `${activeProduct.reference}-${modalSize}-${modalFinish.id.slice(0, 3).toUpperCase()}`,
                      name: activeProduct.name,
                      size: modalSize,
                      finish: modalFinish.name,
                      colorHex: modalFinish.hex,
                      unitPrice: modalUnitPrice,
                      quantity: modalQty,
                      isCustomStl: activeProduct.geometryType === 'stl',
                      leadTimeDays: activeProduct.leadTimeDays,
                    });
                    productDialogRef.current?.close();
                  }}
                  className="flex-1 py-3.5 bg-[#111313] hover:bg-[#B6A17E] text-[#F1F0EB] hover:text-[#111313] font-mono text-xs uppercase tracking-widest font-bold transition-colors"
                >
                  Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: CARRITO Y CHECKOUT TRANSACCIONAL WOMPI SANDBOX (M07 / M08)
         ═══════════════════════════════════════════════════════════════════════ */}
      <dialog
        ref={cartDialogRef}
        aria-labelledby={`${uid}-cart-dialog-title`}
        {...({ closedby: 'any' } as any)}
        className="w-full max-w-3xl bg-[#F9F8F5] text-[#111313] border border-[#111313] p-0 shadow-sculptural m-auto"
      >
        <div className="p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#A7A7A2]/50">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#596153]">
                SISTEMA COMERCIAL TRANSACCIONAL · M07 & M08
              </span>
              <h2 id={`${uid}-cart-dialog-title`} className="font-serif text-2xl sm:text-3xl text-[#111313]">
                {checkoutStep === 'cart'
                  ? 'CARRITO DE COMPRAS'
                  : checkoutStep === 'shipping'
                  ? 'DESPACHO Y PAGO WOMPI SANDBOX'
                  : 'ORDEN CONFIRMADA'}
              </h2>
            </div>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Cerrar ventana de compra"
                className="p-2 border border-[#A7A7A2] hover:border-[#111313]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          {/* Free Shipping Progress Bar */}
          {checkoutStep !== 'confirmation' && (
            <div className="p-3.5 bg-[#F1F0EB] border border-[#A7A7A2]/50 space-y-2">
              <div className="flex justify-between font-mono text-[11px]">
                <span>
                  {cartSubtotal >= 450000
                    ? '✓ Huacal y flete gratuito desbloqueado para Bogotá y Ciudades Principales'
                    : `Te faltan $${(450000 - cartSubtotal).toLocaleString('es-CO')} COP para envío gratuito`}
                </span>
                <span>{freeShippingProgress}%</span>
              </div>
              <progress value={freeShippingProgress} max={100} className="w-full h-1.5 accent-[#111313]" />
            </div>
          )}

          {/* STEP 1: CART ITEMS */}
          {checkoutStep === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <p className="font-serif text-xl text-[#292B2B]">Tu carrito arquitectónico está vacío.</p>
                  <form method="dialog">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#111313] text-[#F1F0EB] font-mono text-xs uppercase tracking-widest"
                    >
                      Explorar Catálogo
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <ul className="divide-y divide-[#A7A7A2]/40">
                    {cart.map((item) => (
                      <li key={item.cartItemId} className="py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div
                            className="w-10 h-10 border border-[#111313] shrink-0"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          <div>
                            <h3 className="font-serif text-base text-[#111313]">{item.name}</h3>
                            <p className="font-mono text-[11px] text-[#596153]">
                              SKU: {item.sku} · Escala {item.size} · {item.finish}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-[#A7A7A2] bg-[#F1F0EB]">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.cartItemId, -1)}
                              aria-label={`Disminuir cantidad de ${item.name}`}
                              className="px-2 py-1"
                            >
                              -
                            </button>
                            <span className="px-2.5 font-mono text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.cartItemId, 1)}
                              aria-label={`Aumentar cantidad de ${item.name}`}
                              className="px-2 py-1"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-mono text-xs font-bold w-28 text-right">
                            ${(item.unitPrice * item.quantity).toLocaleString('es-CO')}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeCartItem(item.cartItemId)}
                            aria-label={`Eliminar ${item.name} del carrito`}
                            className="p-1.5 text-[#596153] hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Financial Summary */}
                  <div className="p-5 bg-[#F1F0EB] border border-[#A7A7A2]/50 space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal Piezas:</span>
                      <span>${cartSubtotal.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div className="flex justify-between text-[#596153]">
                      <span>IVA Discriminado Informativo (19% Incluido - D3):</span>
                      <span>${cartTaxIncluded.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Envío Estimado ({selectedShippingZoneObj.label}):</span>
                      <span>${computedShippingCost.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#A7A7A2] text-sm font-bold text-[#111313]">
                      <span>Total a Pagar:</span>
                      <span>${cartTotal.toLocaleString('es-CO')} COP</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('shipping')}
                      className="px-8 py-4 bg-[#111313] hover:bg-[#B6A17E] text-[#F1F0EB] hover:text-[#111313] font-mono text-xs uppercase tracking-widest font-bold transition-colors"
                    >
                      Continuar al Despacho y Pago →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: SHIPPING & WOMPI SANDBOX CHECKOUT */}
          {checkoutStep === 'shipping' && (
            <form onSubmit={handleCheckoutSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`${uid}-co-name`} className="block font-mono text-xs uppercase mb-1">
                    Nombre y Apellidos *
                  </label>
                  <input
                    id={`${uid}-co-name`}
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={customerForm.fullName}
                    onBlur={() => handleCustomerBlur('fullName')}
                    onChange={(e) => handleCustomerInput('fullName', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    className="w-full px-3 py-2.5 bg-[#F1F0EB] border border-[#A7A7A2] text-sm"
                  />
                  {fieldErrors.fullName && <p className="text-xs text-red-700 font-mono mt-1">{fieldErrors.fullName}</p>}
                </div>

                <div>
                  <label htmlFor={`${uid}-co-email`} className="block font-mono text-xs uppercase mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    id={`${uid}-co-email`}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={customerForm.email}
                    onBlur={() => handleCustomerBlur('email')}
                    onChange={(e) => handleCustomerInput('email', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    className="w-full px-3 py-2.5 bg-[#F1F0EB] border border-[#A7A7A2] text-sm"
                  />
                  {fieldErrors.email && <p className="text-xs text-red-700 font-mono mt-1">{fieldErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor={`${uid}-co-doc`} className="block font-mono text-xs uppercase mb-1">
                    Cédula / NIT *
                  </label>
                  <input
                    id={`${uid}-co-doc`}
                    name="documentNumber"
                    type="text"
                    inputMode="numeric"
                    required
                    value={customerForm.documentNumber}
                    onBlur={() => handleCustomerBlur('documentNumber')}
                    onChange={(e) => handleCustomerInput('documentNumber', e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F1F0EB] border border-[#A7A7A2] text-sm"
                  />
                  {fieldErrors.documentNumber && (
                    <p className="text-xs text-red-700 font-mono mt-1">{fieldErrors.documentNumber}</p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${uid}-co-phone`} className="block font-mono text-xs uppercase mb-1">
                    Celular / WhatsApp *
                  </label>
                  <input
                    id={`${uid}-co-phone`}
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    value={customerForm.phone}
                    onBlur={() => handleCustomerBlur('phone')}
                    onChange={(e) => handleCustomerInput('phone', e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F1F0EB] border border-[#A7A7A2] text-sm"
                  />
                  {fieldErrors.phone && <p className="text-xs text-red-700 font-mono mt-1">{fieldErrors.phone}</p>}
                </div>

                <div>
                  <label htmlFor={`${uid}-co-city`} className="block font-mono text-xs uppercase mb-1">
                    Ciudad / Municipio *
                  </label>
                  <input
                    id={`${uid}-co-city`}
                    name="city"
                    type="text"
                    required
                    autoComplete="address-level2"
                    value={customerForm.city}
                    onChange={(e) => handleCustomerInput('city', e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F1F0EB] border border-[#A7A7A2] text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={`${uid}-co-address`} className="block font-mono text-xs uppercase mb-1">
                  Dirección Exacta de Entrega (Calle/Carrera, Edificio, Apto) *
                </label>
                <textarea
                  id={`${uid}-co-address`}
                  name="address"
                  rows={2}
                  required
                  autoComplete="street-address"
                  value={customerForm.address}
                  onBlur={() => handleCustomerBlur('address')}
                  onChange={(e) => handleCustomerInput('address', e.target.value)}
                  className="w-full px-3 py-2 bg-[#F1F0EB] border border-[#A7A7A2] text-sm"
                />
                {fieldErrors.address && <p className="text-xs text-red-700 font-mono mt-1">{fieldErrors.address}</p>}
              </div>

              {/* D4: Shipping Zone Radio Group (4 options -> radio buttons per modern-web-guidance) */}
              <fieldset className="space-y-2">
                <legend className="font-mono text-xs uppercase tracking-wider text-[#111313] mb-2">
                  Zona de Envío en Colombia (Decisión D4):
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SHIPPING_ZONES.map((z) => (
                    <label
                      key={z.id}
                      className={`p-3 border cursor-pointer flex items-start gap-2.5 text-xs font-mono ${
                        shippingZone === z.id ? 'border-[#111313] bg-[#F1F0EB]' : 'border-[#A7A7A2]/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingZone"
                        value={z.id}
                        checked={shippingZone === z.id}
                        onChange={() => setShippingZone(z.id)}
                        className="mt-0.5 accent-[#111313]"
                      />
                      <div>
                        <span className="font-bold block text-[#111313]">{z.label}</span>
                        <span className="text-[#596153]">
                          ${z.cost.toLocaleString('es-CO')} COP · {z.eta}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* D2: Payment Method Radio Group (Wompi Sandbox) */}
              <fieldset className="space-y-2">
                <legend className="font-mono text-xs uppercase tracking-wider text-[#111313] mb-2">
                  Pasarela de Pago Wompi Sandbox (Decisión D2 — Sin almacenar tarjetas PCI):
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'WOMPI_PSE', label: 'PSE / Débito Bancario' },
                    { id: 'WOMPI_CARD', label: 'Tarjeta Crédito (Redirect)' },
                    { id: 'WOMPI_NEQUI', label: 'Nequi / Bancolombia' },
                  ].map((pm) => (
                    <label
                      key={pm.id}
                      className={`p-3 border cursor-pointer flex items-center gap-2 text-xs font-mono ${
                        paymentMethod === pm.id ? 'border-[#111313] bg-[#F1F0EB] font-bold' : 'border-[#A7A7A2]/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={pm.id}
                        checked={paymentMethod === pm.id}
                        onChange={() => setPaymentMethod(pm.id)}
                        className="accent-[#111313]"
                      />
                      <span>{pm.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Colombian Legal Checkboxes */}
              <div className="space-y-2.5 pt-2 border-t border-[#A7A7A2]/40 text-xs">
                <div className="flex items-start gap-2.5">
                  <input
                    id={`${uid}-co-privacy`}
                    type="checkbox"
                    checked={customerForm.acceptedPrivacyPolicy}
                    onChange={(e) => handleCustomerInput('acceptedPrivacyPolicy', e.target.checked)}
                    className="mt-1 accent-[#111313]"
                  />
                  <label htmlFor={`${uid}-co-privacy`}>
                    Acepto la Política de Tratamiento de Datos Personales (Ley 1581/2012 y Decreto 1377/2013). *
                  </label>
                </div>
                {fieldErrors.privacy && <p className="text-xs text-red-700 font-mono">{fieldErrors.privacy}</p>}

                <div className="flex items-start gap-2.5">
                  <input
                    id={`${uid}-co-terms`}
                    type="checkbox"
                    checked={customerForm.acceptedTerms}
                    onChange={(e) => handleCustomerInput('acceptedTerms', e.target.checked)}
                    className="mt-1 accent-[#111313]"
                  />
                  <label htmlFor={`${uid}-co-terms`}>
                    Acepto los Términos Comerciales, tiempos de fabricación y condiciones de retracto (Ley 1480/2011). *
                  </label>
                </div>
                {fieldErrors.terms && <p className="text-xs text-red-700 font-mono">{fieldErrors.terms}</p>}
              </div>

              {fieldErrors.submit && (
                <div role="alert" className="p-3 bg-red-50 border border-red-500 text-xs font-mono text-red-900">
                  {fieldErrors.submit}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#A7A7A2]">
                <button
                  type="button"
                  onClick={() => setCheckoutStep('cart')}
                  className="px-4 py-3 border border-[#111313] font-mono text-xs uppercase"
                >
                  ← Volver al Carrito
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="px-8 py-4 bg-[#111313] hover:bg-[#B6A17E] text-[#F1F0EB] hover:text-[#111313] font-mono text-xs uppercase tracking-widest font-bold transition-colors"
                >
                  {isSubmittingOrder
                    ? 'Verificando Pago Sandbox...'
                    : `Pagar $${cartTotal.toLocaleString('es-CO')} COP`}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ORDER CONFIRMATION */}
          {checkoutStep === 'confirmation' && createdOrder && (
            <div className="space-y-6 py-4">
              <div className="p-6 bg-[#111313] text-[#F1F0EB] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#B6A17E] uppercase tracking-widest">
                    TRANSACCIÓN WOMPI SANDBOX APROBADA
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 bg-emerald-900/60 text-emerald-300 border border-emerald-500/40">
                    {createdOrder.status}
                  </span>
                </div>
                <h3 className="font-serif text-3xl text-[#F1F0EB]">Orden #{createdOrder.orderNumber}</h3>
                <p className="font-mono text-xs text-[#A7A7A2]">
                  Referencia de Pago: {createdOrder.paymentReference} · Cliente: {createdOrder.customer.fullName}
                </p>
              </div>

              <div className="p-5 bg-[#F1F0EB] border border-[#A7A7A2] font-mono text-xs space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Total Pagado (IVA 19% inc.):</span>
                  <span>${createdOrder.total.toLocaleString('es-CO')} COP</span>
                </div>
                <div className="flex justify-between text-[#596153]">
                  <span>Modalidad de Entrega:</span>
                  <span>{createdOrder.shippingMethod}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <form method="dialog">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#111313] text-[#F1F0EB] font-mono text-xs uppercase tracking-widest"
                  >
                    Ver Seguimiento en Página Principal
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: TALLER ADMIN — SUBIDA STL Y GESTIÓN DE PEDIDOS (M06 / M07)
         ═══════════════════════════════════════════════════════════════════════ */}
      <dialog
        ref={adminDialogRef}
        aria-labelledby={`${uid}-admin-dialog-title`}
        {...({ closedby: 'any' } as any)}
        className="w-full max-w-4xl bg-[#111313] text-[#F1F0EB] border border-[#B6A17E]/50 p-0 shadow-sculptural m-auto"
      >
        <div className="p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-[#292B2B]">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#B6A17E]">
                CONSOLA ADMINISTRATIVA · STORE_CRUDA_MAIN
              </span>
              <h2 id={`${uid}-admin-dialog-title`} className="font-serif text-2xl text-[#F1F0EB]">
                GESTIÓN DE CATÁLOGO STL Y PEDIDOS
              </h2>
            </div>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Cerrar consola administrativa"
                className="p-2 border border-[#292B2B] hover:border-[#B6A17E] text-[#F1F0EB]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="flex gap-3 border-b border-[#292B2B] pb-3">
            <button
              type="button"
              onClick={() => setAdminTab('stl')}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-widest ${
                adminTab === 'stl' ? 'bg-[#B6A17E] text-[#111313] font-bold' : 'bg-[#181A1A] text-[#A7A7A2]'
              }`}
            >
              Modelos 3D .STL ({stlMateras.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminTab('orders');
                loadAdminOrders();
              }}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-widest ${
                adminTab === 'orders' ? 'bg-[#B6A17E] text-[#111313] font-bold' : 'bg-[#181A1A] text-[#A7A7A2]'
              }`}
            >
              Órdenes y Producción
            </button>
          </div>

          {adminTab === 'stl' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Upload STL Form */}
              <form onSubmit={handleAdminUpload} className="md:col-span-6 space-y-4 bg-[#181A1A] p-5 border border-[#292B2B]">
                <h3 className="font-serif text-lg text-[#F1F0EB]">Subir Nuevo Modelo .STL</h3>
                <div>
                  <label htmlFor={`${uid}-adm-pass`} className="block font-mono text-[10px] uppercase text-[#A7A7A2] mb-1">
                    Contraseña Admin (JWT Auth)
                  </label>
                  <input
                    id={`${uid}-adm-pass`}
                    type="password"
                    autoComplete="current-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    className="w-full bg-[#111313] border border-[#292B2B] px-3 py-2 text-xs font-mono text-[#F1F0EB]"
                  />
                </div>

                <div>
                  <label htmlFor={`${uid}-adm-name`} className="block font-mono text-[10px] uppercase text-[#A7A7A2] mb-1">
                    Nombre de la Pieza *
                  </label>
                  <input
                    id={`${uid}-adm-name`}
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="Ej. Matera Hexagonal Brutalista"
                    required
                    className="w-full bg-[#111313] border border-[#292B2B] px-3 py-2 text-xs font-mono text-[#F1F0EB]"
                  />
                </div>

                <div>
                  <label htmlFor={`${uid}-adm-price`} className="block font-mono text-[10px] uppercase text-[#A7A7A2] mb-1">
                    Precio Base COP (IVA inc.) *
                  </label>
                  <input
                    id={`${uid}-adm-price`}
                    type="text"
                    inputMode="numeric"
                    value={modelPrice}
                    onChange={(e) => setModelPrice(e.target.value)}
                    required
                    className="w-full bg-[#111313] border border-[#292B2B] px-3 py-2 text-xs font-mono text-[#F1F0EB]"
                  />
                </div>

                <div>
                  <label htmlFor={`${uid}-adm-file`} className="block font-mono text-[10px] uppercase text-[#A7A7A2] mb-1">
                    Archivo 3D .stl (Máx. 20 MB) *
                  </label>
                  <input
                    id={`${uid}-adm-file`}
                    type="file"
                    accept=".stl"
                    onChange={(e) => setStlFile(e.target.files ? e.target.files[0] : null)}
                    required
                    className="w-full bg-[#111313] border border-[#292B2B] p-2 text-xs font-mono text-[#A7A7A2]"
                  />
                </div>

                {uploadStatus && (
                  <p className={`text-xs font-mono ${uploadStatus.error ? 'text-red-400' : 'text-emerald-400'}`}>
                    {uploadStatus.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isUploadingStl}
                  className="w-full py-3 bg-[#B6A17E] hover:bg-[#c8b391] text-[#111313] font-mono text-xs uppercase tracking-widest font-bold"
                >
                  {isUploadingStl ? 'Subiendo...' : 'Publicar Modelo .STL'}
                </button>
              </form>

              {/* Existing STL Models List */}
              <div className="md:col-span-6 space-y-3">
                <h3 className="font-serif text-lg text-[#F1F0EB]">Archivos .STL Activos en Servidor</h3>
                {stlMateras.length === 0 ? (
                  <p className="text-xs font-mono text-[#A7A7A2]">No hay modelos STL registrados.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {stlMateras.map((m) => (
                      <li
                        key={m.id}
                        className="p-3.5 bg-[#181A1A] border border-[#292B2B] flex items-center justify-between gap-3"
                      >
                        <div>
                          <strong className="font-serif text-base text-[#F1F0EB] block">{m.nombre}</strong>
                          <span className="font-mono text-[11px] text-[#B6A17E]">
                            ${m.precio.toLocaleString('es-CO')} COP · {m.archivo}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteStlMatera(m.id)}
                          aria-label={`Eliminar modelo ${m.nombre}`}
                          className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-800/50 font-mono text-[10px] uppercase"
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {adminTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-[#A7A7A2]">
                  Matriz oficial de transiciones M07 (PENDING_PAYMENT → PAID → IN_PRODUCTION → READY → SHIPPED → DELIVERED)
                </p>
                <button
                  type="button"
                  onClick={loadAdminOrders}
                  className="px-3 py-1.5 border border-[#292B2B] font-mono text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Actualizar
                </button>
              </div>

              {adminOrders.length === 0 ? (
                <p className="p-8 bg-[#181A1A] border border-[#292B2B] text-center font-mono text-xs text-[#A7A7A2]">
                  Aún no hay órdenes registradas. Crea un pedido de prueba desde el carrito para gestionar su fabricación aquí.
                </p>
              ) : (
                <ul className="space-y-3">
                  {adminOrders.map((ord) => (
                    <li key={ord.id} className="p-4 bg-[#181A1A] border border-[#292B2B] space-y-3">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <span className="font-mono text-sm font-bold text-[#B6A17E]">{ord.orderNumber}</span>
                          <span className="font-mono text-xs text-[#F1F0EB] ml-3">{ord.customer.fullName}</span>
                        </div>
                        <span className="font-mono text-xs px-2.5 py-0.5 border border-[#B6A17E] text-[#B6A17E]">
                          {ord.status} · ${ord.total.toLocaleString('es-CO')} COP
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(['IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'REFUNDED'] as const).map((nextSt) => (
                          <button
                            key={nextSt}
                            type="button"
                            onClick={() => handleUpdateOrderStatus(ord.id, nextSt)}
                            className="px-2.5 py-1 bg-[#111313] hover:bg-[#B6A17E] hover:text-[#111313] border border-[#292B2B] font-mono text-[10px] uppercase transition-colors"
                          >
                            → {nextSt}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}

export default App;
