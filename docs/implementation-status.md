# Estado de Implementación — CRUDA E-Commerce

**Última actualización:** 2026-11-03  
**Fase actual:** MVP (Miniprompts M00–M12)

---

## 1. Tabla de Control de Miniprompts

| Miniprompt | Nombre | Estado | Dependencias | Bloqueos / Decisiones |
|---|---|---|---|---|
| **M00** | Auditoría del proyecto | **COMPLETADO** | Ninguna | Ninguno. Supuestos D1–D10 adoptados. |
| **M01** | Arquitectura y contratos | **PENDIENTE** | M00 | D1 (resuelto como supuesto en ADR). |
| **M02** | Base de datos | **PENDIENTE** | M01 | D3, D4, D6, D10 (supuestos documentados). |
| **M03** | Backend y API | **PARCIAL (Endpoints operativos)** | M01, M02 | Pendiente migración a PostgreSQL/Prisma. |
| **M04** | Autenticación y seguridad | **PARCIAL (JWT Admin)** | M02, M03 | D9 (MFA opcional en MVP). |
| **M05** | Frontend y diseño visual | **COMPLETADO** | M01, M03 | Identidad brutalista, WCAG 2.2 AA, sistema visual completo. |
| **M06** | Catálogo y administración | **COMPLETADO (Funcional)** | M02, M03, M05 | D6 (variantes S/M/L + acabados), D7 (STL + visor 3D). |
| **M07** | Carrito y pedidos | **COMPLETADO (Funcional)** | M02, M03, M06 | D3 (IVA incluido), D4 (zonas Colombia), matriz de estados. |
| **M08** | Integración de pagos | **PARCIAL (Wompi Sandbox UI/API)** | M03, M07 | D2 (Wompi Sandbox + Idempotency-Key). |
| **M09** | Almacenamiento y multimedia | **PARCIAL (Uploads STL)** | M03 | D7 (STL upload y visor 3D). |
| **M10** | Automatización con n8n | **PENDIENTE** (Fase 1.5) | M03, M07, M08 | Outbox pattern en M02/M03. |
| **M11** | SEO, accesibilidad y cumplimiento | **COMPLETADO (Base Colombia)** | M05, M07 | Leyes 1581/2012, 1480/2011 y 527/1999 integradas. |
| **M12** | Pruebas, despliegue y monitoreo | **PENDIENTE** | M00–M11 | CI/CD, Docker, entorno de producción. |

---

## 2. Registro Histórico de Cambios

### 2026-11-03: Diseño Visual Integral e Implementación E-Commerce (M05, M06, M07, M11)
- **Acción:** Diseño y construcción completa de la experiencia visual arquitectónica y brutalista de CRUDA, integrando el catálogo de ediciones permanentes, los modelos `.STL` del servidor, el Laboratorio 3D + WebXR AR, el flujo de carrito/checkout con Wompi Sandbox, el rastreo de órdenes y la consola administrativa.
- **Archivos creados:**
  - `src/data/catalogData.ts`
  - `src/components/ArchitecturalRender.tsx`
  - `src/components/Interactive3DLab.tsx`
- **Archivos modificados:**
  - `src/App.tsx`: Experiencia completa con 10 secciones editoriales y 3 modales nativos `<dialog>`.
  - `src/index.css`: Reglas de accesibilidad `:focus-visible`, `.visually-hidden` y contención de scroll en `<dialog>`.
  - `server/index.ts`: Endpoints reales para órdenes (`POST /api/orders`, `GET /api/orders/:orderNumber`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`), contacto (`POST /api/contact`), salud (`GET /api/health`) y catálogo STL (`/api/materas`).
- **Resultados de pruebas:**
  - `npm run build`: Exitoso (`tsc && vite build` en 1.47s, 0 errores).
  - `curl http://localhost:4000/api/health`: Respuesta 200 OK.

### 2026-11-03: M00 — Auditoría del Proyecto
- **Acción:** Inspección integral del repositorio preexistente y habilitación del entorno de desarrollo.
- **Archivos creados:**
  - `docs/decisions/assumptions.md`
  - `docs/implementation-status.md`
  - `docs/architecture/m00-audit-report.md`
  - `.env.example`
- **Archivos modificados:**
  - `package.json`: Corrección del script `dev:server` para invocar `tsx server/index.ts`.
