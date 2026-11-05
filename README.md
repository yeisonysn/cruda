# 🏛️ CRUDA — Concreto como Expresión de Diseño

Tienda virtual premium para **CRUDA**, marca colombiana de diseño, fabricación y comercialización de materas y objetos decorativos de concreto arquitectónico contemporáneo.

Desarrollada con **React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons y Canvas 3D**.

---

## 🎨 Dirección Creativa & Sistema Visual

- **Concepto:** Concreto como expresión de diseño.
- **Inspiración:** Arquitectura brutalista contemporánea, interiorismo minimalista, diseño industrial, escultura geométrica y galerías de diseño internacional.
- **Paleta de Color Oficial:**
  - `Negro profundo`: `#111313`
  - `Gris grafito`: `#292B2B`
  - `Gris cemento`: `#A7A7A2`
  - `Blanco mineral`: `#F1F0EB`
  - `Arena caliza`: `#D5C8B5`
  - `Verde oliva`: `#596153`
  - `Champagne`: `#B6A17E`
- **Tipografías:** `Syne` (Sans display arquitectónica), `Cinzel` (Serif editorial), `Plus Jakarta Sans` (Lectura técnica y especificaciones).
- **Glassmorphism Selectivo:** Navbar translúcida al hacer scroll, cajón del carrito, ventanas modales de ficha técnica y filtros flotantes con `backdrop-blur` y bordes sutiles.

---

## 🚀 Inicio Rápido

El servidor de desarrollo ya se encuentra compilado y disponible.

### Opción 1: Script Bash directo
```bash
./run_cruda.sh
```

### Opción 2: Script Python
```bash
python3 run_cruda.py
```

### Opción 3: NPM en la carpeta del proyecto
```bash
cd cruda
npm run dev
```

Abre en tu navegador:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📐 Estructura de Secciones Desarrolladas

1. **Navbar Translúcida:**
   - Logotipo y monograma geométrico de CRUDA.
   - Navegación fluida: Colección, Nuestra Esencia, Geometría 3D, Proceso, Materiales, Inspiración, Contacto.
   - Buscador en tiempo real por referencia (`CR-001` a `CR-005`), material o geometría.
   - Carrito con badge dinámico e indicador numérico de piezas.
   - Menú móvil desplegable editorial.

2. **Hero Principal de Alto Impacto:**
   - Titular: *"LA FORMA TAMBIÉN HABITA EL ESPACIO."*
   - Subtítulo: *"Objetos de concreto diseñados para transformar la manera en que habitamos nuestros espacios."*
   - Botones de acción *"EXPLORAR COLECCIÓN"* y *"DESCUBRIR CRUDA"*.
   - Composición fotográfica en gran formato con elementos geométricos tridimensionales (cilindros, cubos facetados, esferas minerales y planos isométricos).
   - Ticker de especificaciones de origen colombiano (UHPC, 28 días de curado en húmedo, 100% mineral).

3. **Manifiesto de Marca:**
   - Título: *"LA BELLEZA DE LO ESENCIAL."*
   - Declaración de principios formal, triptych fotográfico de macro-texturas de concreto, terrazo pulido con cuarzos andinos y espacialidad arquitectónica.
   - Cuatro pilares fundamentales de la marca: *Pureza Formal*, *Honestidad Material*, *Artesanía de Alta Precisión* y *Permanencia Temporal*.

4. **Catálogo de Ediciones Permanentes ("OBJETOS CON CARÁCTER"):**
   - **CR-001:** Cilindro Puro (Bisel a 45°, acabado gris cemento y blanco mineral).
   - **CR-002:** Prisma Facetado (Octogonal, refracción de sombras duras y aristas vivas).
   - **CR-003:** Terrazo Mineral (Cono truncado invertido con cuarzos andinos desbastados a grano 3000).
   - **CR-004:** Escultura Orgánica (Silueta biomórfica suave en concreto arena cálida).
   - **CR-005:** Monolito Rectangular (Pedestal horizontal y divisor de ambientes en concreto blanco tiza).
   - Filtros dinámicos por geometría/categoría, escala/talla (`S`, `M`, `L`), ordenamiento por precio y buscador instantáneo.

5. **Laboratorio Interactivo 3D de Geometría & Luz:**
   - Simulador en tiempo real desarrollado en Canvas HTML5.
   - Rota en 360° con el ratón o el dedo las cuatro geometrías primarias de CRUDA.
   - Alterna entre 4 acabados de concreto: *Cemento Gris Puro*, *Blanco Mineral*, *Terrazo Cuarzo* y *Grafito Profundo*.
   - Regulador interactivo de ángulo de luz solar para apreciar el comportamiento de las sombras.
   - Acceso directo a la ficha de la referencia homóloga.

6. **Proceso de Fabricación ("LA MATERIA, EL PROCESO Y LA FORMA"):**
   - 1. *Diseño Paramétrico & Geometría*
   - 2. *Desarrollo de Moldes Elastoméricos*
   - 3. *Preparación de la Mezcla Mineral (UHPC)*
   - 4. *Vaciado & Compactación Vibratoria*
   - 5. *Curado Lento (28 días) & Acabado Manual*
   - Navegación paso a paso con duración técnica y componentes certificados.

7. **Catálogo de Materialidad Arquitectónica:**
   - Muestrario interactivo: Cemento blanco estructural, cemento gris natural, cuarzos andinos, pigmentos Bayferrox® y sellador nanométrico mate suizo.
   - Fichas de origen geológico, tacto superficial, reflectancia lumínica y valor espacial.

8. **Galería de Inspiración:**
   - Proyectos arquitectónicos residenciales, estudios, terrazas, hospitalidad y concept stores en Bogotá, Medellín, Envigado y Cartagena.
   - Filtros de espacio y visor modal detallado con vinculación directa al producto.

9. **Ficha Técnica Editorial de Producto (Modal Interactivo):**
   - Galería fotográfica con selector de ángulos (Estudio cenital, En espacio, Macro detalle).
   - Selector interactivo de escala (`S`, `M`, `L`) con actualización de dimensiones y precio en COP.
   - Muestras de color con previsualización de acabado.
   - Selector de cantidad y agregado inmediato al carrito.
   - Botón directo para consultar y asesorarse por WhatsApp con mensaje pre-redactado.

10. **Carrito de Compras & Proceso de Compra (Checkout):**
    - Drawer lateral con animación fluida y blur de fondo.
    - Persistencia automática de productos en `localStorage`.
    - Barra de progreso hacia envío estructural gratuito (flete seguro en huacales de madera).
    - Cálculo dinámico de subtotal y total en pesos colombianos (`COP`).
    - Formulario de despacho con selección de ciudades principales de Colombia (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Cartagena, Pereira, etc.).
    - Generación automática de orden de compra formateada para WhatsApp y celebración con confetti mineral.

11. **Contacto & Showrooms:**
    - Asesoría directa para proyectos especiales de arquitectura e interiorismo.
    - Direcciones de taller en Medellín (El Poblado) y showroom en Bogotá (Quinta Camacho).
    - Formulario con validación en tiempo real.

12. **Footer Brutalista:**
    - Monograma CRUDA, políticas de despacho sísmico, garantía estructural de 5 años y redes sociales.

---

## 🛠️ Tecnologías y Estructura del Código

```
cruda/
├── index.html                  # Plantilla HTML con Google Fonts & meta
├── package.json                # Dependencias (React 18, Vite 6, Tailwind 3)
├── tailwind.config.js          # Paleta CRUDA, fuentes y sombras
├── tsconfig.json               # Configuración estricta de TypeScript
├── vite.config.ts              # Configuración de Vite
└── src/
    ├── App.tsx                 # Ensamblado principal de la experiencia
    ├── main.tsx                # Entrada React DOM
    ├── index.css               # Estilos globales, grano de concreto y overscroll containment
    ├── types/
    │   └── index.ts            # Interfaces TypeScript de Productos, Carrito, Materiales
    ├── data/
    │   ├── products.ts         # Catálogo de las 5 referencias (CR-001 a CR-005)
    │   ├── materials.ts        # Muestrario de agregados, matrices y selladores
    │   ├── manufacturing.ts    # 5 etapas del proceso de fabricación
    │   └── inspiration.ts      # Archivo de espacios arquitectónicos e interiores
    ├── context/
    │   └── CartContext.tsx     # Estado global, persistencia localStorage y conteo
    ├── utils/
    │   └── formatters.ts       # Formateador de moneda COP y generador de mensajes WhatsApp
    └── components/
        ├── common/
        │   ├── GeometricAccents.tsx  # SVGs de cilindros, cubos facetados y plintos
        │   └── Icons.tsx             # Iconos SVG personalizados
        ├── layout/
        │   ├── Navbar.tsx            # Navegación con glassmorphism
        │   └── Footer.tsx            # Pie de página editorial oscuro
        ├── home/
        │   ├── Hero.tsx                  # Hero editorial de gran formato
        │   ├── Manifesto.tsx             # Manifiesto "La belleza de lo esencial"
        │   ├── FeaturedProducts.tsx      # Colección "Objetos con carácter"
        │   ├── Interactive3DViewer.tsx   # Simulador 3D Canvas de formas y luces
        │   ├── ManufacturingProcess.tsx  # Etapas de producción artesanal
        │   ├── MaterialsCatalog.tsx      # Inspector de materiales y acabados
        │   ├── InspirationGallery.tsx    # Espacios habitados con lightbox
        │   └── ContactSection.tsx        # Showrooms, WhatsApp y cotizador
        └── shop/
            ├── ProductCard.tsx           # Tarjeta individual con microinteracciones
            ├── ProductDetailModal.tsx    # Ficha técnica completa de producto
            ├── CartDrawer.tsx            # Cajón de carrito con barra de flete
            ├── CheckoutModal.tsx         # Pasarela de despacho colombiana
            └── SearchModal.tsx           # Buscador interactivo en vivo
```

---

## 📸 Reemplazo de Recursos Fotográficos

Para sustituir las imágenes de muestra por fotografías reales de tu taller o producción:
1. Abre `src/data/products.ts` para las referencias de producto (`images: [...]`).
2. Abre `src/data/inspiration.ts` para los proyectos de arquitectura.
3. Abre `src/data/materials.ts` y `src/data/manufacturing.ts` para procesos y muestras.
4. Puedes colocar las imágenes en la carpeta `cruda/public/images/` y referenciarlas como `/images/cr-001-estudio.jpg`.

