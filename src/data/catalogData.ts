export interface ProductVariantOption {
  size: 'S' | 'M' | 'L';
  label: string;
  dimensions: string;
  weightKg: number;
  priceCop: number;
  skuSuffix: string;
}

export interface FinishColorOption {
  id: string;
  name: string;
  hex: string;
  textureDesc: string;
  surchargeCop: number;
}

export interface CatalogProduct {
  id: string;
  reference: string;
  slug: string;
  name: string;
  subtitle: string;
  collection: 'Serie Monolítica' | 'Serie Facetada' | 'Terrazo Andino' | 'Serie Biomórfica' | 'Personalizados STL';
  description: string;
  architecturalNotes: string;
  basePriceCop: number;
  inStock: boolean;
  stockCount: number;
  madeToOrder: boolean;
  leadTimeDays: number;
  geometryType: 'cylinder' | 'octagon' | 'cone' | 'organic' | 'monolith' | 'vessel' | 'stl';
  stlUrl?: string;
  defaultColorHex: string;
  variants: ProductVariantOption[];
  drainageIncluded: boolean;
  indoorOutdoor: 'Interior & Exterior Cubierto' | 'Todo Clima (Sellado Hidrófugo)';
}

export const FINISH_COLORS: FinishColorOption[] = [
  {
    id: 'cemento-natural',
    name: 'Gris Cemento Puro',
    hex: '#A7A7A2',
    textureDesc: 'Poro arquitectónico controlado, sellado nanométrico mate',
    surchargeCop: 0,
  },
  {
    id: 'blanco-mineral',
    name: 'Blanco Mineral Calizo',
    hex: '#E6E4DD',
    textureDesc: 'Cemento estructural blanco con áridos de mármol pulverizado',
    surchargeCop: 15000,
  },
  {
    id: 'grafito-profundo',
    name: 'Grafito Brutalista',
    hex: '#292B2B',
    textureDesc: 'Óxido de hierro sintético Bayferrox® negro profundo',
    surchargeCop: 20000,
  },
  {
    id: 'arena-caliza',
    name: 'Arena Tierra Cálida',
    hex: '#D5C8B5',
    textureDesc: 'Pigmentación ocre mineral inspirada en tapia pisada andina',
    surchargeCop: 15000,
  },
  {
    id: 'verde-oliva',
    name: 'Oliva Botánico',
    hex: '#596153',
    textureDesc: 'Óxido de cromo mineral de baja saturación',
    surchargeCop: 25000,
  },
  {
    id: 'champagne-mineral',
    name: 'Travertino Champagne',
    hex: '#B6A17E',
    textureDesc: 'Micro-agregado de cuarzo dorado y sílice desbastado',
    surchargeCop: 30000,
  },
];

export const PERMANENT_COLLECTION: CatalogProduct[] = [
  {
    id: 'cr-001',
    reference: 'CR-001',
    slug: 'cilindro-puro-cr-001',
    name: 'Cilindro Puro Bisel 45°',
    subtitle: 'Sección áurea con chaflán superior de precisión',
    collection: 'Serie Monolítica',
    description:
      'Contenedor monolítico vaciado en concreto de ultra-alto desempeño (UHPC). Su borde superior presenta un bisel continuo a 45° que proyecta un anillo de sombra nítida bajo iluminación cenital.',
    architecturalNotes:
      'Espesor de pared constante de 18 mm. Base elevada 6 mm con apoyos de neopreno de alta densidad para proteger pisos de madera o mármol.',
    basePriceCop: 185000,
    inStock: true,
    stockCount: 12,
    madeToOrder: false,
    leadTimeDays: 3,
    geometryType: 'cylinder',
    defaultColorHex: '#A7A7A2',
    drainageIncluded: true,
    indoorOutdoor: 'Todo Clima (Sellado Hidrófugo)',
    variants: [
      { size: 'S', label: 'Escala S — Mesa / Estudio', dimensions: 'Ø 18 × H 20 cm', weightKg: 3.4, priceCop: 145000, skuSuffix: 'S' },
      { size: 'M', label: 'Escala M — Piso / Rincón', dimensions: 'Ø 28 × H 32 cm', weightKg: 7.8, priceCop: 185000, skuSuffix: 'M' },
      { size: 'L', label: 'Escala L — Monumental', dimensions: 'Ø 42 × H 48 cm', weightKg: 18.5, priceCop: 310000, skuSuffix: 'L' },
    ],
  },
  {
    id: 'cr-002',
    reference: 'CR-002',
    slug: 'prisma-facetado-cr-002',
    name: 'Prisma Facetado Octogonal',
    subtitle: 'Geometría de aristas vivas y descomposición lumínica',
    collection: 'Serie Facetada',
    description:
      'Ocho caras planas convergen en aristas tensas logradas mediante moldes elastoméricos de grado industrial. Cada plano captura un gradiente distinto de luz natural a lo largo del día.',
    architecturalNotes:
      'Reforzado con microfibra alcalirresistente (AR-Glass). Ideal para cactus columnares, euphorbias y especies de porte escultórico.',
    basePriceCop: 235000,
    inStock: true,
    stockCount: 7,
    madeToOrder: false,
    leadTimeDays: 4,
    geometryType: 'octagon',
    defaultColorHex: '#292B2B',
    drainageIncluded: true,
    indoorOutdoor: 'Todo Clima (Sellado Hidrófugo)',
    variants: [
      { size: 'S', label: 'Escala S — Consola', dimensions: 'Ø 20 × H 22 cm', weightKg: 4.1, priceCop: 175000, skuSuffix: 'S' },
      { size: 'M', label: 'Escala M — Arquitectónica', dimensions: 'Ø 32 × H 36 cm', weightKg: 9.6, priceCop: 235000, skuSuffix: 'M' },
      { size: 'L', label: 'Escala L — Galería', dimensions: 'Ø 46 × H 54 cm', weightKg: 22.0, priceCop: 365000, skuSuffix: 'L' },
    ],
  },
  {
    id: 'cr-003',
    reference: 'CR-003',
    slug: 'terrazo-mineral-cr-003',
    name: 'Cono Invertido Terrazo Andino',
    subtitle: 'Agregado expuesto de cuarzo y basalto pulido al diamante',
    collection: 'Terrazo Andino',
    description:
      'Silueta troncocónica de estabilidad visual imponente. Tras 14 días de fraguado inicial, la superficie se desbasta manualmente con discos diamantados hasta grano 3000 para revelar la granulometría de cuarzos andinos.',
    architecturalNotes:
      'Cada pieza presenta un patrón geológico irrepetible. Sellado hidrofóbico y oleofóbico de grado museográfico.',
    basePriceCop: 290000,
    inStock: false,
    stockCount: 0,
    madeToOrder: true,
    leadTimeDays: 8,
    geometryType: 'cone',
    defaultColorHex: '#D5C8B5',
    drainageIncluded: true,
    indoorOutdoor: 'Todo Clima (Sellado Hidrófugo)',
    variants: [
      { size: 'S', label: 'Escala S — Sobremesa', dimensions: 'Ø 22 × H 24 cm', weightKg: 5.2, priceCop: 220000, skuSuffix: 'S' },
      { size: 'M', label: 'Escala M — Sala / Lobby', dimensions: 'Ø 35 × H 40 cm', weightKg: 11.4, priceCop: 290000, skuSuffix: 'M' },
      { size: 'L', label: 'Escala L — Atrio', dimensions: 'Ø 50 × H 58 cm', weightKg: 26.5, priceCop: 440000, skuSuffix: 'L' },
    ],
  },
  {
    id: 'cr-004',
    reference: 'CR-004',
    slug: 'escultura-organica-cr-004',
    name: 'Vasija Biomórfica Nervada',
    subtitle: 'Curvatura continua con estrías verticales de bajo relieve',
    collection: 'Serie Biomórfica',
    description:
      'Diálogo entre la rigidez pétrea del concreto y la fluidez orgánica del barro cocido tradicional. Sus acanaladuras verticales estilizan la silueta y acentúan la textura mineral táctil.',
    architecturalNotes:
      'Curado húmedo prolongado de 28 días para garantizar cero fisuración por retracción hidráulica en las nervaduras.',
    basePriceCop: 260000,
    inStock: true,
    stockCount: 5,
    madeToOrder: false,
    leadTimeDays: 5,
    geometryType: 'organic',
    defaultColorHex: '#E6E4DD',
    drainageIncluded: true,
    indoorOutdoor: 'Interior & Exterior Cubierto',
    variants: [
      { size: 'S', label: 'Escala S — Íntima', dimensions: 'Ø 20 × H 25 cm', weightKg: 4.5, priceCop: 195000, skuSuffix: 'S' },
      { size: 'M', label: 'Escala M — Estándar', dimensions: 'Ø 34 × H 38 cm', weightKg: 10.2, priceCop: 260000, skuSuffix: 'M' },
      { size: 'L', label: 'Escala L — Escultórica', dimensions: 'Ø 48 × H 52 cm', weightKg: 21.0, priceCop: 390000, skuSuffix: 'L' },
    ],
  },
  {
    id: 'cr-005',
    reference: 'CR-005',
    slug: 'monolito-rectangular-cr-005',
    name: 'Monolito Horizontal Jardinera',
    subtitle: 'Bloque arquitectónico lineal para división de espacios y terrazas',
    collection: 'Serie Monolítica',
    description:
      'Volumen prismático de proporción 3:1 diseñado para perfilar perímetros arquitectónicos, balcones, oficinas contemporáneas y accesos corporativos.',
    architecturalNotes:
      'Incluye doble perforación de drenaje con tapón removible y cámara interna de aligeramiento estructural.',
    basePriceCop: 380000,
    inStock: false,
    stockCount: 0,
    madeToOrder: true,
    leadTimeDays: 10,
    geometryType: 'monolith',
    defaultColorHex: '#596153',
    drainageIncluded: true,
    indoorOutdoor: 'Todo Clima (Sellado Hidrófugo)',
    variants: [
      { size: 'S', label: 'Escala S — Balcón 60 cm', dimensions: '60 × 22 × H 24 cm', weightKg: 14.0, priceCop: 295000, skuSuffix: 'S' },
      { size: 'M', label: 'Escala M — Terraza 80 cm', dimensions: '80 × 28 × H 32 cm', weightKg: 24.5, priceCop: 380000, skuSuffix: 'M' },
      { size: 'L', label: 'Escala L — Paisajismo 110 cm', dimensions: '110 × 35 × H 40 cm', weightKg: 42.0, priceCop: 540000, skuSuffix: 'L' },
    ],
  },
  {
    id: 'cr-006',
    reference: 'CR-006',
    slug: 'plinto-pedestal-cr-006',
    name: 'Copa Brutalista sobre Plinto',
    subtitle: 'Doble volumen geométrico en ensamble monolítico',
    collection: 'Serie Facetada',
    description:
      'Inspirada en la arquitectura cívica latinoamericana de los años 60. Combina una base cúbica retraída que genera un efecto de levitación sobre el piso con un cáliz cilíndrico de pared gruesa.',
    architecturalNotes:
      'Centro de gravedad bajo para máxima estabilidad ante viento en terrazas de gran altura.',
    basePriceCop: 320000,
    inStock: true,
    stockCount: 4,
    madeToOrder: false,
    leadTimeDays: 6,
    geometryType: 'vessel',
    defaultColorHex: '#B6A17E',
    drainageIncluded: true,
    indoorOutdoor: 'Todo Clima (Sellado Hidrófugo)',
    variants: [
      { size: 'S', label: 'Escala S — Galería', dimensions: 'Ø 24 × H 28 cm', weightKg: 6.8, priceCop: 245000, skuSuffix: 'S' },
      { size: 'M', label: 'Escala M — Pórtico', dimensions: 'Ø 36 × H 44 cm', weightKg: 14.2, priceCop: 320000, skuSuffix: 'M' },
      { size: 'L', label: 'Escala L — Museo', dimensions: 'Ø 52 × H 62 cm', weightKg: 31.0, priceCop: 495000, skuSuffix: 'L' },
    ],
  },
];

export const MANUFACTURING_STAGES = [
  {
    step: '01',
    title: 'Diseño Paramétrico & Validación STL',
    duration: 'Día 1–2',
    metric: 'Tolerancia ±0.4 mm',
    description:
      'Modelamos cada geometría en CAD tridimensional verificando ángulos de desmolde, espesores mínimos de pared (18 mm) y distribución de esfuerzos para evitar concentraciones de tensión.',
    specs: ['Análisis de espesor de pared', 'Cálculo de volumen neto de vaciado', 'Simulación de sombras e incidencia solar'],
  },
  {
    step: '02',
    title: 'Matricería en Elastómero de Poliuretano',
    duration: 'Día 3–4',
    metric: 'Dureza Shore A-45',
    description:
      'Construimos matrices flexibles de alta fidelidad con contramolde rígido en fibra estructural. Esto permite aristas filosas, biseles exactos y una textura epidérmica sedosa sin juntas visibles.',
    specs: ['Cero líneas de partición expuestas', 'Sellado estanco de base', 'Geometría indeformable bajo vibración'],
  },
  {
    step: '03',
    title: 'Dosificación UHPC & Pigmentación Mineral',
    duration: 'Día 5',
    metric: 'Resistencia > 65 MPa',
    description:
      'Formulamos concreto de ultra-alto desempeño con cemento estructural tipo ART, humo de sílice, superplastificantes de cuarta generación, cuarzos andinos seleccionados y óxidos inorgánicos Bayferrox®.',
    specs: ['Relación agua/cemento < 0.28', 'Fibra AR-Glass dispersa en matriz', 'Color integrado en toda la masa (no superficial)'],
  },
  {
    step: '04',
    title: 'Vaciado Asistido & Compactación de Frecuencia',
    duration: 'Día 6',
    metric: '120 Hz Vibración',
    description:
      'El vaciado se realiza en mesas vibratorias de frecuencia controlada para evacuar el aire atrapado, logrando caras densas con una micro-porosidad arquitectónica auténtica y controlada.',
    specs: ['Densidad aparente 2.350 kg/m³', 'Control higrométrico en cámara cerrada', 'Desmolde primario a las 36 horas'],
  },
  {
    step: '05',
    title: 'Curado Húmedo (28 Días) & Sellado Nanométrico',
    duration: 'Día 7–28',
    metric: 'Hidrofugado UV 100%',
    description:
      'Cada pieza completa su hidratación cristalina en cámara húmeda antes del micro-lijado al agua y la aplicación de tres capas de sellador silano-siloxano transpirable de acabado mate natural.',
    specs: ['Inmune a rayos UV y lluvia ácida', 'Impermeable por cara interna y externa', 'Sello numerado de control de calidad CRUDA'],
  },
];

export const MATERIAL_SAMPLES = [
  {
    id: 'mat-uhpc-grey',
    code: 'MAT-01',
    name: 'Matriz Gris Brutalista UHPC',
    origin: 'Cemento Estructural Boyacá + Sílice',
    hex: '#A7A7A2',
    compressiveStrength: '68 MPa',
    absorption: '< 2.1%',
    finishTouch: 'Sedoso mineral con micro-poro visto',
    description:
      'Nuestra firma cromática. Un gris neutro equilibrado que resalta el verde profundo del follaje botánico sin competir visualmente.',
  },
  {
    id: 'mat-mineral-white',
    code: 'MAT-02',
    name: 'Blanco Calizo Arquitectónico',
    origin: 'Cemento Blanco + Carbonato de Calcio Puro',
    hex: '#F1F0EB',
    compressiveStrength: '64 MPa',
    absorption: '< 2.4%',
    finishTouch: 'Mate aporcelanado de alta reflectancia',
    description:
      'Refleja hasta el 78% de la luz ambiental. Ideal para interiores minimalistas, galerías y patios de sombra.',
  },
  {
    id: 'mat-andes-terrazzo',
    code: 'MAT-03',
    name: 'Terrazo de Cuarzo & Basalto Andino',
    origin: 'Agregados triturados de Antioquia y Cundinamarca',
    hex: '#D5C8B5',
    compressiveStrength: '72 MPa',
    absorption: '< 1.8%',
    finishTouch: 'Pulido diamantado grano 3000',
    description:
      'Piedra natural expuesta mediante desbaste mecánico. Muestra vetas de cuarzo lechoso, granito negro y arena dorada.',
  },
  {
    id: 'mat-graphite-oxide',
    code: 'MAT-04',
    name: 'Grafito Profundo Bayferrox®',
    origin: 'Pigmento inorgánico de óxido de hierro',
    hex: '#292B2B',
    compressiveStrength: '66 MPa',
    absorption: '< 2.0%',
    finishTouch: 'Mate carbón aterciopelado',
    description:
      'Estabilidad cromática garantizada por más de 25 años a la intemperie sin decoloración por radiación solar.',
  },
];

export const ARCHITECTURAL_SPACES = [
  {
    id: 'proj-01',
    title: 'Casa Taller La Calera',
    location: 'Bogotá / La Calera, Cundinamarca',
    category: 'Residencial',
    architect: 'Estudio Altiplano',
    featuredRef: 'CR-001',
    featuredProductName: 'Cilindro Puro Bisel 45° (Escala L)',
    paletteHex: '#A7A7A2',
    accentHex: '#292B2B',
    quote: 'Las piezas de CRUDA actúan como pivotes espaciales entre el ventanal de piso a techo y el bosque de niebla.',
    specs: '6 unidades en Gris Cemento Puro · Olivos negros y Monstera deliciosa',
  },
  {
    id: 'proj-02',
    title: 'Penthouse Provenza Minimal',
    location: 'Medellín, Antioquia',
    category: 'Terraza',
    architect: 'Colectivo Materia Viva',
    featuredRef: 'CR-005',
    featuredProductName: 'Monolito Horizontal Jardinera (110 cm)',
    paletteHex: '#596153',
    accentHex: '#D5C8B5',
    quote: 'Reemplazamos los cerramientos tradicionales por una secuencia rítmica de monolitos en concreto verde oliva.',
    specs: '12 jardineras perimetrales · Resistencia certificada a intemperie tropical',
  },
  {
    id: 'proj-03',
    title: 'Galería & Café Quinta Camacho',
    location: 'Bogotá D.C.',
    category: 'Hospitalidad',
    architect: 'Taller Meridiano',
    featuredRef: 'CR-003',
    featuredProductName: 'Cono Invertido Terrazo Andino (Escala M)',
    paletteHex: '#D5C8B5',
    accentHex: '#111313',
    quote: 'El terrazo pulido dialoga con el ladrillo patrimonial bogotano y la carpintería en roble ahumado.',
    specs: '8 piezas numeradas · Sellado anti-manchas de grado comercial',
  },
  {
    id: 'proj-04',
    title: 'Estudio Creativo San Diego',
    location: 'Cartagena de Indias',
    category: 'Estudio',
    architect: 'Arquitectura Costera Contemporánea',
    featuredRef: 'CR-002',
    featuredProductName: 'Prisma Facetado Octogonal (Escala L)',
    paletteHex: '#E6E4DD',
    accentHex: '#B6A17E',
    quote: 'En el sol intenso del Caribe, las ocho facetas del prisma dibujan un reloj solar vivo sobre el piso de cemento pulido.',
    specs: '4 prismas en Blanco Mineral Calizo · Resistencia salina costera',
  },
];

export const FAQ_ITEMS = [
  {
    question: '¿Cuál es la diferencia entre un producto en stock y uno Bajo Pedido?',
    answer:
      'Las piezas en stock están listas en nuestro taller para despacho inmediato en 2 a 4 días hábiles. Las piezas "Bajo Pedido" o con personalización de color/STL se vacían expresamente para ti siguiendo nuestro protocolo de curado controlado, tomando entre 8 y 12 días hábiles antes del envío.',
  },
  {
    question: '¿Cómo funciona la personalización mediante archivo 3D (.STL)? (Decisión D7)',
    answer:
      'Puedes subir o visualizar tu modelo .STL en nuestro Laboratorio 3D y AR. Según nuestra política técnica (D7), toda pieza personalizada pasa por aprobación manual de un ingeniero de matricería de CRUDA para validar espesores de pared (mín. 18 mm) y ángulos de desmolde antes de confirmar su entrada a producción.',
  },
  {
    question: '¿Los precios incluyen IVA y cómo se calcula el envío en Colombia? (Decisiones D3 y D4)',
    answer:
      'Sí, todos nuestros precios exhibidos en pesos colombianos (COP) incluyen el IVA del 19% (D3). El envío (D4) se realiza en huacales de madera con protección de espuma de alta densidad: tarifa fija de $25.000 COP en Bogotá/Sabana (gratis en compras mayores a $450.000 COP), $38.000 COP en Medellín y ciudades principales, $55.000 COP resto del país, o $0 si eliges recogida en nuestro taller.',
  },
  {
    question: '¿Las materas resisten sol directo, lluvia e intemperie?',
    answer:
      'Absolutamente. Nuestro concreto UHPC (>65 MPa) incorpora pigmentos minerales inorgánicos Bayferrox® estables a los rayos UV y un sellador hidrofugante nanométrico que impide la eflorescencia, el musgo y las manchas por humedad.',
  },
  {
    question: '¿Qué cubre la garantía y cómo aplica el Derecho de Retracto (Ley 1480 de 2011)?',
    answer:
      'Ofrecemos 5 años de garantía estructural contra fisuras de origen constructivo o degradación del material. Para productos de catálogo estándar, cuentas con 5 días hábiles desde la entrega para ejercer el Derecho de Retracto (Art. 47 Ley 1480/2011). Conforme a la ley colombiana, el retracto no aplica en bienes confeccionados conforme a las especificaciones del consumidor (modelos STL personalizados o pigmentaciones a medida ya vaciadas).',
  },
];

