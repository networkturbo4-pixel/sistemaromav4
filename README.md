# SISTEMA ROMA V4 — SaaS Multitenant para Agencia de Publicidad y Diseño

Sistema SaaS moderno tipo App construido en **TypeScript + Node.js + Express + PostgreSQL + React + Tailwind CSS**, diseñado específicamente para ejecutarse tanto en desarrollo local como en producción sobre **cPanel de BanaHosting (Phusion Passenger)**.

---

## 🚀 Acceso Rápido en Desarrollo Local

El servidor ya está configurado y listo:
- **Frontend (Vite HMR)**: `http://localhost:5173`
- **Backend API / Producción Unificada**: `http://localhost:3001`

### PINs de 8 Dígitos de Prueba (Multitenant):
| PIN (8 dígitos) | Usuario | Rol Granular | Tenant (Agencia) |
| :--- | :--- | :--- | :--- |
| `12345678` | César Augusto (CEO) | **Super Administrador** (17/17 permisos) | **ROMA Agencia Creativa & Diseño** (`PEN S/`) |
| `87654321` | Valeria Montes | **Director Creativo & Branding** (Clientes + Personalización) | **ROMA Agencia Creativa & Diseño** (`PEN S/`) |
| `20262026` | Mateo Paredes | **Ejecutivo de Cuentas** (Solo Clientes y Marcas, sin borrado ni seguridad) | **ROMA Agencia Creativa & Diseño** (`PEN S/`) |
| `11223344` | Camila Salazar | **Super Admin Tenant** | **Nova Pixel Branding Studio** (`USD $` - Tenant 2 aislado) |

---

## 📦 Guía de Despliegue en cPanel de BanaHosting

1. **Crear Base de Datos PostgreSQL en cPanel**:
   - En tu cPanel de BanaHosting, abre **PostgreSQL Database Wizard**.
   - Crea la base de datos (ej. `micuenta_romadb`) y el usuario (ej. `micuenta_admin`), y asígnale todos los privilegios.
   - *(Opcional)* Puedes importar [`database/schema.sql`](file:///d:/SISTEMAROMAV4/database/schema.sql) desde **phpPgAdmin** o dejar que el sistema cree las tablas y semilla automáticamente al iniciar.

2. **Compilar el Proyecto**:
   ```bash
   npm run build
   ```
   Esto genera el frontend optimizado en `dist/client` y el servidor CommonJS en `dist/server/index.js`.

3. **Configurar "Setup Node.js App" en cPanel**:
   - **Node.js version**: `18.x`, `20.x` o `22.x`
   - **Application mode**: `Production`
   - **Application root**: carpeta donde subiste el sistema
   - **Application startup file**: `app.js`
   - **Variables de Entorno (`.env`)**:
     ```env
     NODE_ENV=production
     JWT_SECRET=tu_clave_secreta_segura
     DATABASE_URL=postgresql://micuenta_admin:tu_password@localhost:5432/micuenta_romadb
     ```
   - Haz clic en **Run NPM Install** y luego en **Restart**.
