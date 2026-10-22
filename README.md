# Sistema de Ventas, Caja e Inventario

Proyecto base con `frontend/` (React + Vite + TypeScript + Tailwind CSS) y `backend/` (FastAPI + SQLAlchemy + PostgreSQL/Supabase).

## Requisitos
- Node.js LTS y npm
- Python 3.11 o superior
- Cuenta de Supabase

## 1. Crear la base de datos en Supabase
1. Crea un proyecto en https://supabase.com/.
2. Abre **SQL Editor → New query**.
3. Copia y ejecuta todo el archivo `database/schema.sql`.
4. En **Project Settings → Database**, copia la cadena de conexión PostgreSQL. Usa la URI de conexión (preferiblemente Session pooler si tu proveedor/red lo requiere). Reemplaza la contraseña y codifica caracteres especiales de la contraseña URL-encoded.
5. No pongas la clave `service_role` ni la contraseña de PostgreSQL en React/Vite.

## 2. Configurar backend
En terminal:
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
# .venv\Scripts\activate.bat
pip install -r requirements.txt
```
Copia `.env.example` a `.env` y completa `DATABASE_URL` con la URI PostgreSQL de Supabase.
```bash
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000  
Documentación interactiva: http://127.0.0.1:8000/docs

Si PowerShell bloquea la activación, ejecuta `Set-ExecutionPolicy -Scope Process Bypass` en esa terminal y vuelve a activar el entorno.

## 3. Configurar frontend
Abre otra terminal:
```bash
cd frontend
npm install
npm run dev
```
Abre la URL local que muestre Vite, normalmente http://localhost:5173.

## 4. Prueba rápida
- Entra a Productos y crea un producto.
- Registra una deuda y prueba el botón Cobrar.
- En Caja, escribe cantidades físicas; la diferencia se actualiza en tiempo real.
- Dashboard usa los endpoints del backend y muestra ventas/productos/deudas.

## Notas importantes
- Los importes iniciales (S/ 109.00, S/ 14.10, S/ 72.80, S/ 25.40) son datos de demostración solicitados; no representan movimientos reales hasta registrar operaciones.
- Este starter usa una tabla `sales` para registrar ventas y una tabla `cash_closings` para guardar arqueos. Antes de usarlo en producción agrega autenticación, autorización por rol, validaciones de negocio y políticas RLS. La conexión directa desde el backend usa credenciales de servidor; jamás las publiques en el frontend.
