# Investigación Visual y de Catálogo: KANTE (`kantegarden.com`)

**Objetivo:** Analizar la tienda [kantegarden.com](https://kantegarden.com/) (KANTE® Official, operado por Rosemead Home & Garden, Inc.) para identificar patrones estéticos, presentación comercial y oportunidades de fabricación mediante **impresión 3D + moldes de silicona + concreto pigmentado**, con el fin de desarrollar una **línea original de productos para Cruda** (sin copiar sus diseños).

> **Nota sobre capturas de pantalla:** En la sesión de navegador automatizada, la herramienta `take_screenshot` no estuvo habilitada en la configuración del servidor MCP `chrome_devtools`, por lo que no se generaron archivos `.png` locales. En su lugar, se documentan las **URLs directas de las fotografías oficiales** observadas en el DOM del sitio.

---

## 1. Categorías y Colecciones de Materas

El catálogo completo consta de **20 referencias** organizadas en el menú `Products` bajo tres ejes de filtrado:

### Por Material (`BROWSE BY MATERIAL`)
- **Concrete Planters** (`/product-category/concrete-planter/`) — 19 referencias.
- **Plastic Planters** (`/product-category/plastic-planters/`) — 1 referencia.
- **All Products** (`/products/`) — 20 referencias en total.

### Por Forma / Perfil (`BROWSE BY SHAPE`)
- **Round Planters** (`/shape/round/`) — Cilíndricas, cónicas y cuencos.
- **Square Planters** (`/product-category/concrete-planter/square-concrete-planters/`) — 3 referencias cúbicas y de columna cuadrada.
- **Tall Planters** (`/profile/tall/`) — Materas altas de acento vertical.
- **Low Bowl Planters** (`/profile/low-bowl/`) — Cuencos bajos y anchos.
- **Tapered Planters** (`/products/?filter_profile=tall-tapered,tapered&query_type_profile=or`) — Cónicas invertidas (boca más ancha que la base).
- **Fluted Planters** (`/profile/fluted-column/`) — Columnas con acanalado vertical continuo.

### Por Ancho Exterior Máximo (`BROWSE BY WIDTH`)
*(En sets, la clasificación toma la matera de mayor tamaño)*
- **Small (Under 12 in / < 30.5 cm):** 7 referencias.
- **Medium (12 to under 18 in / 30.5 – 45.7 cm):** 10 referencias.
- **Large (18 in & up / ≥ 45.7 cm):** 3 referencias.

### Colecciones y Secciones Adicionales
- **Featured Planters (Holiday Collection)** (`/featured-planters/`): Selección de 10 materas destacadas con badges de descuento verificados en Amazon US.
- **Planter Inspiration** (`/inspiration/`): Contenido editorial y de estilo de vida (porches, salas, terrazas, piscina).
- **Where to Buy** (`/where-to-buy/`): Directorio de canales minoristas autorizados.

---

## 2. Productos Representativos Inspeccionados

| Producto | SKU / Modelo | Forma / Perfil | Dimensiones (D × W × H) | Capacidad | Color / Acabado | Drenaje |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **17.7-Inch Fluted Concrete Planter** | `RC0142A-C80011` | Round / Fluted column, Tall | 11" × 11" × 17.7" (28 × 28 × 45 cm) | 4.6 gal | White | Orificio + tapón de goma removible |
| **White Tapered Concrete Planters — Set of 3** | `CTC0154BCD-C80011` | Round / Tapered | G: 15.8"×15.8"×15.8"<br>M: 11.8"×11.8"×11.8"<br>P: 8.7"×8.7"×8.7" | 9.4 / 4.2 / 1.8 gal | White | Orificios + tapones de goma removibles |
| **Concrete Bowl Planters — Set of 3** | `RC0049ABC-C80021-2` | Round / Low bowl | G: 18.1"×18.1"×9.8"<br>M: 14.2"×14.2"×8.1"<br>P: 10.6"×10.6"×6.3" | 6.3 / 3.0 / 1.4 gal | Weathered Concrete | Orificios + tapones de goma removibles |
| **10.2-Inch Square Lion Head Concrete Planter** | `AF0172A-C80451` | Square / Standard (relieve clásico) | 10.2" × 10.2" × 10.2" (26 × 26 × 26 cm) | 3.2 gal | Gravel Gray | Concreto |
| **13-Inch Plastic Planters — Set of 2** | `RF0301XXS-C70221` | Round / Tapered | 13" × 13" × 17.7" (c/u) | 8.6 gal | Black | 4 orificios pre-perforados + 4 tapones |

Otras referencias visibles en catálogo:
- **Small:** *11.8-Inch Fluted Concrete Planter (White)*, *8.7-Inch Tall Fluted Concrete Planter (Charcoal)*, *11.8-Inch Tapered Concrete Planter (Black)*, *10.6-Inch Low Round Bowl (Weathered Concrete)*, *9.5-Inch Tapered Concrete Planter (Charcoal)*.
- **Medium:** *12-Inch Square Concrete Planter (Black)*, *19.9-Inch Tall Square Concrete Planter (Weathered Concrete)*, *23.6-Inch Tapered Concrete Planter (Charcoal)*, *24-Inch Tapered Concrete Planter (Weathered Concrete)*, *18-Inch Bowl Planter (Weathered Concrete)*, *Low Round Bowl Planter (Weathered Concrete)*, *Curved Round Concrete Planter (Weathered Concrete)*.

---

## 3. Patrones Estéticos: Formas, Tamaños, Colores, Texturas y Acabados

### Formas Geométricas y Proporciones
1. **Cónicas invertidas (*Tapered*):** Boca ancha y base estrecha; transmiten ligereza visual pese al material mineral. Muy usadas en pares para flanquear entradas o en sets de 3 escalonados.
2. **Columnas acanaladas (*Fluted*):** Cilindros altos o medianos con estrías verticales continuas que generan ritmo visual y juego de luces y sombras.
3. **Cuencos bajos (*Low Bowls*):** Relación ancho/alto cercana a 2:1 (ej. 18.1" ancho × 9.8" alto). Ideales para centros de mesa, terrazas bajas, suculentas y arreglos horizontales.
4. **Cúbicas y columnas cuadradas (*Square*):** Aristas limpias y proporciones arquitectónicas 1:1 (10.2", 12") o verticales (~1:1.6).
5. **Relieve ornamental puntual:** Únicamente una pieza (*Lion Head*) incorpora escultura clásica en relieve sobre un cubo limpio.

### Paleta de Colores
Estrictamente **neutra, mineral y arquitectónica** (5 tonos principales):
- **Weathered Concrete:** Gris concreto con veladura/envejecido natural.
- **White:** Blanco mate cálido/mineral.
- **Charcoal:** Gris carbón profundo.
- **Black:** Negro mate.
- **Gravel Gray:** Gris grava medio.

### Texturas y Acabados
- **Mate mineral poroso sutil:** Sin brillos plásticos; la superficie evoca piedra natural o concreto arquitectónico lavado.
- **Efecto *Weathered* (envejecido):** Variación tonal orgánica que disimula el desgaste exterior y aporta carácter artesanal.
- **Relieve lineal (*Fluted*):** Acanalado vertical uniforme que eleva el valor percibido frente a un cilindro liso.

---

## 4. Presentación de Productos, Precios y Variantes

### Modelo Comercial (Vitrina sin Carrito Propio)
- KANTE **no muestra precios en dólares ni procesa pagos en `kantegarden.com`**.
- Funciona como **vitrina oficial de marca** que redirige al usuario a **Amazon** (`VIEW ON AMAZON`) y a otros retailers autorizados (`Home Depot`, `Wayfair`, `Lowe's`).
- En `/featured-planters/` muestran **badges de porcentaje de descuento** de Amazon US (ej. `37% OFF`, `31% OFF`, `21% OFF`, `8% OFF`) con fecha de verificación.
- Cada ficha incluye el aviso: *"View this exact size and finish on Amazon for current price, availability and delivery details."*

### Estrategia Fotográfica y Visual
- **Efecto hover en tarjetas de catálogo:** Alterna automáticamente entre **dos fotografías** (por ejemplo, ambiente exterior en porche vs. ambiente interior junto a sofá o consola), permitiendo imaginar la versatilidad de uso sin abrir la ficha.
- **Prioridad lifestyle:** Combinan fondos limpios de estudio con escenas reales de alto contraste material (concreto junto a ladrillo visto, madera cálida, pisos de piedra, piscinas y follaje verde).
- **Integración social:** Enlace directo a inspiración en Instagram, TikTok y Pinterest, además de guías estacionales.

### Presentación de Variantes y Especificaciones Técnicas
- **Estandarización técnica:** Todas las fichas reportan exactamente: ancho máximo en pulgadas, dimensiones `D × W × H`, capacidad en galones, cantidad de piezas (`1 planter`, `Set of 2`, `Set of 3`) y SKU/ASIN.
- **Detalle funcional clave:** Destacan siempre la inclusión de **orificio de drenaje con tapón de goma removible**, posicionando cada pieza como apta tanto para **interior** (con tapón puesto) como para **exterior** (sin tapón).
- **Estrategia de Sets:** Fuerte apuesta por **Sets de 3 anidados** (tamaños progresivos G/M/P) y **Sets de 2 iguales** para simetría arquitectónica.

---

## 5. Análisis de Viabilidad: Impresión 3D + Moldes de Silicona + Concreto Pigmentado

Evaluación técnica para producir piezas originales inspiradas en estos principios estéticos (no copias) utilizando el flujo **modelo maestro impreso en 3D → molde de silicona → vaciado en concreto pigmentado**:

### A. Diseños Altamente Viables (Sweet Spot para Cruda)
1. **Formas *Tapered* (cónicas) pequeñas y medianas (Ø 15–30 cm):**
   - **Por qué funcionan:** La conicidad natural actúa como **ángulo de salida (*draft angle*)**, facilitando muchísimo el desmolde de la silicona y reduciendo el riesgo de fractura en verde.
   - **Ventaja 3D:** Las líneas de capa de la impresión 3D pueden lijarse/imprimarse para acabado liso o aprovecharse sutilmente como microtextura orgánica.
2. **Cuencos bajos (*Low Bowls*) de escritorio, centro de mesa o terraza pequeña (Ø 18–32 cm):**
   - **Por qué funcionan:** Baja altura = menor presión hidrostática del concreto sobre la silicona, menos consumo de silicona por molde y excelente estabilidad estructural.
   - **Oportunidad Cruda:** Ideales para ventas en **sets de 2 o 3** escalonados y fáciles de embalar/enviar.
3. **Texturas acanaladas (*Fluted*) o geométricas paramétricas:**
   - **Por qué funcionan:** La impresión 3D permite generar **estrías, facetas, ondas o relieves paramétricos complejos** con precisión milimétrica que sería muy costosa de tallar a mano. La silicona captura perfectamente cada arista.
   - **Precaución técnica:** Evitar socavados (*undercuts*) profundos en las estrías; mantener canales verticales o helicoidales suaves para liberar burbujas de aire mediante vibrado.
4. **Cúbicas pequeñas y medianas (12–25 cm):**
   - **Por qué funcionan:** Fáciles de modular en impresión 3D (incluso en placas ensamblables) y muy estables en molde de silicona con carcasa rígida (*mother mold* impresa en 3D o en madera/yeso).

### B. Diseños con Restricciones Técnicas (No recomendados en concreto macizo artesanal)
- **Columnas muy altas y grandes (> 40–45 cm de alto, como las de 24"):**
  - En concreto pigmentado tradicional resultan **excesivamente pesadas**, costosas en volumen de silicona para el molde y frágiles ante impactos si se hacen paredes delgadas sin fibra de vidrio (GFRC) o aditivos poliméricos.
  - **Alternativa para Cruda:** Si se quiere formato grande, usar **concreto reforzado con fibra (GFRC / microfibra de polipropileno)** y moldes bipartidos o tripartidos con contramolde rígido, o bien enfocarse en formatos **Small y Medium (10–30 cm)** donde el margen y la logística son óptimos.

### C. Acabados y Detalles Constructivos Replicables
- **Pigmentación integral en masa:** Reemplaza la pintura superficial; el color (*Charcoal*, *Bone/White*, *Terracota desaturada*, *Gris grava*) vive en todo el espesor del material.
- **Efecto *Weathered* / Mineral:** Lograble mediante lavado ácido suave, lijado selectivo post-curado o técnica de doble colada/veladura mineral en el molde.
- **Drenaje profesional:** Incorporar en el modelo 3D el alojamiento exacto para **orificio de drenaje + tapón de silicona o corcho/goma estándar**, comunicando claramente el doble uso interior/exterior igual que KANTE.

---

## 6. Referencias Visuales Capturadas del DOM

URLs directas de imágenes representativas observadas durante la navegación:

1. **Fluted White (17.7" Tall Fluted):**  
   `https://kantegarden.com/wp-content/uploads/2026/11/rc0142a-c80011-scene-1.webp`
2. **Tapered Charcoal (23.6"):**  
   `https://kantegarden.com/wp-content/uploads/2026/11/KANTE-AC0099A-C60121-%E2%80%94-main-%E2%80%94-verified-Amazon-source-2026-11-20.jpg`
3. **Tapered Weathered (24" Lifestyle Interior):**  
   `https://kantegarden.com/wp-content/uploads/2026/11/ac0261a-c80021-2-clean-lifestyle.webp`
4. **Low Round Bowl (Weathered Concrete):**  
   `https://kantegarden.com/wp-content/uploads/2026/11/rc0051b-c80021-2-scene-1.webp`
5. **Tall Square (19.9" Weathered Concrete):**  
   `https://kantegarden.com/wp-content/uploads/2026/11/rf0002a-c80021-2-scene-2-1536x1536.webp`
6. **Inspiración de Materiales (Concreto + Ladrillo + Madera Cálida):**  
   `https://kantegarden.com/wp-content/uploads/2026/11/KANTE-Inspiration-%E2%80%94-Concrete-brick-and-warm-wood.jpg`

---

## 7. Oportunidades para una Línea Original de Cruda

Sin copiar las siluetas exactas de KANTE, estos son los aprendizajes estratégicos para diferenciar a **Cruda**:

1. **Arquitectura de colección en 3 familias claras:**
   - **Familia Cuenco (Low Bowls):** Para mesa, consola y suculentas.
   - **Familia Cónica (Tapered):** Silueta atemporal y fácil de desmoldar.
   - **Familia Textura 3D (Paramétrica):** Aprovechar lo que KANTE *no* explota a fondo (más allá del *fluted* clásico): estrías asimétricas, facetas geométricas o relieves sutiles diseñados nativamente para impresión 3D + silicona.
2. **Venta en Sets Escalonados (Sets de 2 y 3):** Aumenta el ticket promedio y facilita la composición visual en el hogar.
3. **Paleta mineral curada (4–5 tonos):** Neutros arquitectónicos (blanco hueso, gris cemento, carbón) + 1 tono firma cálido de Cruda (ej. arena, arcilla o terracota apagada) en concreto pigmentado integral.
4. **Propuesta de valor técnica:** Incluir siempre tapón de drenaje removible y base protegida (corcho o pad antideslizante) para uso seguro en muebles interiores.
5. **Fotografía dual en catálogo:** Mostrar siempre la pieza en **contexto real (interior/exterior)** y en **detalle macro de textura**, resaltando la honestidad del concreto pigmentado frente a imitaciones plásticas.
