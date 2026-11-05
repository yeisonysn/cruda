# Informe Técnico de Auditoría del Proyecto — M00

**Proyecto:** CRUDA (E-commerce de Materas y Objetos de Concreto Arquitectónico)  
**Fecha:** 2026-11-03  
**Auditor:** Equipo de Ingeniería Multidisciplinario CRUDA  
**Alcance:** Evaluación exhaustiva del repositorio preexistente vs. Arquitectura Objetivo.

---

## 1. Árbol de Carpetas y Estructura Actual

```text
/Users/macbookairm2/Desktop/test/cruda/
├── .env                        # Variables de entorno locales (con credenciales expuestas)
├── .gitignore                  # Ignora node_modules, dist, .env, uploads
├── README.md                   # Documentación conceptual y paleta visual de la marca
├── index.html                  # Punto de entrada HTML con fuentes y viewport
├── package.json                # Metadatos, scripts y dependencias npm
├── package-lock.json           # Lockfile de npm (v3)
├── postcss.config.js           # PostCSS con Tailwind y Autoprefixer
├── tailwind.config.js          # Configuración de Tailwind CSS con paleta CRUDA
├── tsconfig.json               # Configuración TypeScript Frontend
├── tsconfig.server.json        # Configuración TypeScript Backend
├── vite.config.ts              # Configuración de Vite con React y Basic-SSL
├── dist/                       # Artefactos de build de producción
├── public/                     # Assets estáticos (iconos, previews)
├── server/
│   ├── index.ts                # Monolito Express inicial con endpoints básicos
│   ├── data/
│   │   └── materas.json        # Base de datos en archivo JSON plano
│   └── uploads/                # Directorio local de archivos STL cargados
└── src/
    ├── App.tsx                 # Aplicación monolítica con state interno de vistas
    ├── main.tsx                # Bootstrap de React 18
    ├── index.css               # Estilos globales y directivas Tailwind
    ├── ar/
    │   └── ar.ts               # Lógica de Realidad Aumentada móvil con WebGL / Sensores
    ├── components/
    │   └── StlViewer.tsx       # Visor 3D Three.js con STLLoader y OrbitControls
    └── services/
        └── api.ts              # Cliente HTTP fetch para `/api`
```

---

## 2. Inventario de Tecnologías y Dependencias

### 2.1 Dependencias de Producción (`dependencies`)
| Paquete | Versión | Propósito Actual | Evaluación vs. Arquitectura Objetivo |
|---|---|---|---|
| `react` / `react-dom` | `^18.3.1` | UI Library | Conforme a la arquitectura objetivo. |
| `express` | `^5.3.0` | Servidor HTTP | Conforme; requiere estructuración modular en M03. |
| `three` | `^0.187.0` | Renderizado 3D WebGL (STLLoader, OrbitControls, AR) | Conservar como activo diferencial para visualización y personalización STL. |
| `lucide-react` | `^1.16.0` | Iconografía UI | Adecuado para UI minimalista. |
| `jsonwebtoken` | `^9.0.3` | Autenticación JWT básica | No conforme: almacena tokens en cliente; objetivo: cookies HttpOnly + Argon2id. |
| `multer` | `^2.5.0` | Carga de archivos multipart | Debe migrar a almacenamiento S3 compatible con URLs prefirmadas en M09. |
| `cors` | `^2.8.6` | Cabeceras CORS | Requiere endurecimiento con allowlist estricta en M03/M04. |
| `dotenv` | `^18.0.9` | Carga de `.env` | Conforme. |

### 2.2 Dependencias Faltantes Requeridas por la Arquitectura Objetivo
- **Base de Datos & ORM:** `@prisma/client`, `prisma` (PostgreSQL).
- **Validación:** `zod`.
- **Criptografía:** `argon2` / `@node-rs/argon2`.
- **Enrutamiento Frontend:** `react-router-dom`.
- **Gestión de Estado:** `@tanstack/react-query`, `zustand`.
- **Logs estructurados:** `pino` o `winston`.
- **Testing:** `vitest`, `@testing-library/react`, `supertest`.

---

## 3. Rutas y Endpoints Detectados

### 3.1 Frontend
- No existe enrutador (`react-router`). Se alterna condicionalmente entre 3 vistas internas en `src/App.tsx` (`home`, `admin`, `ar`).
- No existen rutas canónicas como `/catalogo`, `/producto/:id`, `/carrito`, `/checkout`, `/orden/:id`, `/politicas`.

### 3.2 Backend (`server/index.ts`)
| Método | Endpoint | Autenticación | Funcionalidad |
|---|---|---|---|
| `POST` | `/api/admin/login` | Contraseña fija en body | Emite JWT de 8h si `password === ADMIN_PASSWORD` |
| `GET` | `/api/materas` | Pública | Lee `server/data/materas.json` y retorna lista |
| `POST` | `/api/materas` | Bearer Token | Recibe multipart con archivo `.stl`, escribe a disco y actualiza JSON |
| `DELETE` | `/api/materas/:id` | Bearer Token | Elimina registro del JSON y archivo del disco |
| `GET` | `/uploads/*` | Pública (estático) | Expone la carpeta de archivos STL sin control de acceso |

---

## 4. Estado de Datos y Almacenamiento

- **Base de Datos:** Inexistente. Utiliza lectura/escritura síncrona a un archivo `server/data/materas.json`.
  - Sin transacciones ACID.
  - Riesgo de corrupción por condiciones de carrera (`race conditions`) en escrituras concurrentes.
  - Sin historial, sin auditoría, sin soporte de soft delete (`deletedAt`).
- **Almacenamiento Multimedia:** Archivos `.stl` guardados directamente en el sistema de archivos local (`server/uploads/`).
  - Sin validación real de cabeceras mágicas (solo comprueba la extensión de nombre `.stl`).
  - Sin integración con S3 ni URLs prefirmadas.

---

## 5. Auditoría de Seguridad (Vulnerabilidades y Riesgos)

| Riesgo | Severidad | Descripción | Evidencia / Ubicación |
|---|---|---|---|
| **Credenciales fijas / texto plano** | **CRÍTICA** | `ADMIN_PASSWORD=cruda2024admin` configurado por defecto y en `.env`. Sin Argon2id. | `server/index.ts:17`, `.env:1` |
| **Secretos en repositorio local sin `.env.example`** | **ALTA** | El archivo `.env` contiene secretos locales sin un archivo plantilla `.env.example` sanitizado. | Raíz del proyecto |
| **Almacenamiento no transaccional en JSON** | **ALTA** | Operaciones de catálogo usan `fs.writeFileSync`. Imposibilita pedidos y pagos concurrentes. | `server/index.ts:65` |
| **Validación MIME superficial en uploads** | **ALTA** | El filtro de Multer solo valida la extensión `.stl`, permitiendo archivos binarios maliciosos renombrados. | `server/index.ts:50-54` |
| **CORS permisivo (`origin: true`)** | **MEDIA** | Acepta cualquier origen reflectado con credenciales habilitadas. | `server/index.ts:33` |
| **Endpoints sin Rate Limiting** | **MEDIA** | `/api/admin/login` es vulnerable a ataques de fuerza bruta ilimitados. | `server/index.ts:97` |
| **Sin aislamiento Multi-Tienda** | **ALTA** | No existe noción de `store_id` ni separación de datos por marca o tenant. | Todo el codebase |
| **Tokens JWT sin revocación ni cookies seguras** | **MEDIA** | El frontend almacena el token en memoria o localStorage sin `HttpOnly`. | `src/services/api.ts:25` |

---

## 6. Funcionalidades Existentes y Activos Reutilizables

1. **Visor 3D de Materas (`src/components/StlViewer.tsx`):**
   - Implementado en Three.js con `STLLoader`, `OrbitControls`, cálculo de normales, centrado geométrico y cambio dinámico de color en tiempo real.
   - **Veredicto:** Conservar y encapsular como componente desacoplado para M05 y M06.
2. **Módulo de Realidad Aumentada (`src/ar/ar.ts`):**
   - Interfaz con sensores de orientación (`DeviceOrientationEvent`) y WebGL transparente para superposición con cámara trasera en móviles.
   - **Veredicto:** Conservar como valor agregado experimental para la experiencia de producto en M05.
3. **Dirección Creativa y Paleta de Estilos (`tailwind.config.js`, `README.md`):**
   - Paleta de color brutalista y contemporánea ya definida (`#111313`, `#292B2B`, `#A7A7A2`, `#F1F0EB`, `#D5C8B5`, etc.).
   - **Veredicto:** Base estética aprobada para el sistema de diseño en M05.

---

## 7. Diferencias vs. Arquitectura Objetivo

| Área | Estado Actual | Arquitectura Objetivo (Sección 4) | Brecha a Resolver |
|---|---|---|---|
| **Enrutamiento** | `useState` en `App.tsx` | `react-router` v6+ con páginas canónicas | Implementar en M05 |
| **Estado Remoto** | `fetch` en componentes | `TanStack Query` | Implementar en M05 |
| **Estado Local** | Estado local en React | `Zustand` (carrito persistente y UI) | Implementar en M05/M07 |
| **Base de Datos** | Archivo `materas.json` | PostgreSQL + Prisma ORM | Implementar en M02 |
| **Validación** | Ad-hoc manual | Zod en cada endpoint / esquema compartido | Implementar en M03 |
| **Autenticación** | Password plano + JWT simple | Argon2id + Cookies HttpOnly/Secure + RBAC | Implementar en M04 |
| **Comercio / Pedidos**| Inexistente | Carrito, Checkout, Transacción atómica, Outbox | Implementar en M07/M08 |
| **Multi-tienda** | Ninguna | `store_id` obligatorio en entidades comerciales | Implementar en M01/M02/M03 |
| **Testing** | 0 tests, sin framework | Vitest + Supertest + Testing Library (70%+) | Implementar en M03/M12 |

---

## 8. Plan de Migración y Hoja de Ruta

1. **M01 (Arquitectura y Contratos):**
   - Definir ADR de Renderizado (D1) y ADR de Sesiones/CSRF.
   - Definir especificación OpenAPI 3.1 (`docs/api/openapi.yaml`) y catálogo de errores.
   - Diseñar catálogo de eventos de negocio y modelo de aislamiento multi-tienda.
2. **M02 (Base de Datos):**
   - Instalar y configurar Prisma con PostgreSQL.
   - Crear esquema declarativo con soporte multi-tienda (`store_id`), variantes, inventario, pedidos y outbox.
   - Generar migraciones reproducibles y seeds iniciales.
3. **M03 (Backend y API):**
   - Reestructurar el backend Express en módulos desacoplados con TypeScript, Zod y Pino.
   - Prisma Client Extensions para forzar filtro `store_id`.
   - Implementar suite de pruebas inicial (Vitest + Supertest).
4. **M04 a M12:**
   - Ejecución progresiva por miniprompts respetando dependencias y DoD.

