# Supuestos y Decisiones Iniciales del Negocio (CRUDA)

Documento generado conforme al protocolo de gobernanza (Sección 0.1). Las decisiones no resueltas de forma explícita por el negocio se registran aquí como **SUPUESTO** y definen el comportamiento de la arquitectura y los módulos para el MVP.

---

## Matriz de Decisiones D1 – D10

| # | Decisión | Supuesto Aplicado para MVP | Justificación Técnica / Operativa | Módulos Impactados |
|---|---|---|---|---|
| **D1** | **Estrategia de renderizado** | **SPA Vite + Prerendering / SSG selectivo** | El catálogo actual y los assets Three.js/WebGL requieren un cliente interactivo ágil. Se implementará prerenderizado de rutas estáticas y catálogo público para SEO en M05/M11. ADR detallado en M01. | M05, M11 |
| **D2** | **Pasarela de pago inicial** | **Wompi (Sandbox inicialmente)** | Cobertura nativa en Colombia (PSE, Tarjetas, Nequi, Bancolombia). Arquitectura desacoplada vía interfaz `PaymentProvider`. | M08 |
| **D3** | **IVA** | **Precios con IVA incluido** | Modelo comercial B2C estándar para productos decorativos en Colombia. Se almacena y computa internamente en centavos/enteros COP. | M02, M07 |
| **D4** | **Envío** | **Zonas con tarifa fija / recogida local** | Matriz de tarifas por departamento/ciudad (Bogotá vs Nacional) con opción de recogida en taller. Fácil configuración sin requerir API de transportadora en MVP día 1. | M02, M07 |
| **D5** | **Cupones y reembolsos** | **Fase 2 (Post-lanzamiento)** | Conforme al alcance MVP 0.2. El modelo de datos en M02 dejará prevista la extensibilidad sin sobrecargar la lógica de M07/M08. | M02, M07, M08 |
| **D6** | **Variantes de producto** | **Sí (Soporte activo)** | Las materas de concreto varían por tamaño (S, M, L), color de pigmento (grafito, cemento, arena) y acabado (sellado, mate, poro abierto). Cada una con SKU único. | M02, M06 |
| **D7** | **Personalización STL** | **Aprobación manual por operador** | La fabricación en concreto arquitectónico requiere inspección humana de factibilidad de desmolde y volúmenes antes de producción. | M06, M09 |
| **D8** | **CMS de páginas** | **Sí (`ContentPage` básica)** | Se requiere para gestionar Términos y Condiciones, Políticas de Privacidad (Habeas Data Colombia), Preguntas Frecuentes e Historia de Marca. | M05, M11 |
| **D9** | **MFA para ADMIN** | **Opcional en MVP / Recomendado para Producción** | Para agilidad de desarrollo y pruebas locales de MVP se habilita sin bloqueo estricto, dejando el hook y contrato de MFA listo en M04. | M04 |
| **D10** | **Facturación electrónica DIAN** | **Fase 2** | Conforme al alcance 0.2. Se generarán recibos de compra/comprobantes internos válidos comercialmente; integración XML/DIAN pospuesta para Fase 2. | M02, M07 |

---

## Registro de Cambios
- **2026-11-03:** Creación inicial tras auditoría M00. Supuestos base adoptados para desbloquear la arquitectura M01 y M02.

