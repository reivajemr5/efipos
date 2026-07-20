# Fase 3: Especificaciones UI/UX — Efi- Pos

## Sistema de Diseño

### Colores
| Token | Color | Hex | Uso |
|-------|-------|-----|-----|
| Primary | Azul corporativo | `#1E40AF` | Navbars, headers, botones principales |
| Primary Light | Azul claro | `#3B82F6` | Hover, links |
| Secondary | Verde éxito | `#16A34A` | Confirmar factura, éxito, sincronizado |
| Danger | Rojo | `#DC2626` | Anular, eliminar, errores |
| Warning | Ámbar | `#F59E0B` | Alertas, stock bajo, sin conexión |
| Surface | Blanco | `#FFFFFF` | Fondos de tarjetas |
| Background | Gris claro | `#F3F4F6` | Fondo de pantalla |
| Text | Gris oscuro | `#1F2937` | Texto principal |
| Text Secondary | Gris medio | `#6B7280` | Subtítulos, etiquetas |

### Tipografía
- **Familia:** `Inter, system-ui, -apple-system, sans-serif` (carga rápida, sin fuentes externas pesadas)
- **Jerarquía:**
  - Headings: `text-lg` (18px) / `text-xl` (20px) / `text-2xl` (24px)
  - Body: `text-base` (16px) — mínimo legible en móviles
  - Small: `text-sm` (14px) — etiquetas, metadatos
  - Números de factura/monto: `font-mono` o `tabular-nums`

### Botones
- Altura mínima: 44px (touch target)
- Bordes redondeados: `rounded-lg` (8px)
- Estados: normal, hover, active, disabled

---

## Wireframes por Pantalla

### 1. Login
```
┌──────────────────────────┐
│                          │
│     [Logo] Efi- Pos      │
│                          │
│  ┌────────────────────┐  │
│  │  Usuario           │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │  Contraseña        │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │   Iniciar Sesión   │  │
│  └────────────────────┘  │
│                          │
│  ─── Offline ───         │
└──────────────────────────┘
```
- Indicador de conectividad arriba
- Si está offline, show "Modo offline - datos locales"

### 2. Dashboard (Home)
```
┌──────────────────────────┐
│ ☰ Efi- Pos      🔔 👤   │
├──────────────────────────┤
│  ┌──────┐ ┌──────┐       │
│  │  🧾  │ │  📋  │       │
│  │Fact. │ │Cotiz.│       │
│  └──────┘ └──────┘       │
│  ┌──────┐ ┌──────┐       │
│  │  📦  │ │  👥  │       │
│  │Prod. │ │Client│       │
│  └──────┘ └──────┘       │
│  ┌──────┐ ┌──────┐       │
│  │  🏭  │ │  📊  │       │
│  │Prov. │ │Report│       │
│  └──────┘ └──────┘       │
│                          │
│  [Resumen Rápido]        │
│  Ventas hoy: $45.00     │
│  Facturas: 12           │
│  Stock bajo: 3 prods.   │
│  ● Sincronizado         │
└──────────────────────────┘
```
- Grid 2x2 de tarjetas con íconos grandes (touch-friendly)
- Resumen debajo con cards pequeñas
- Indicador de sincronización

### 3. Lista de Productos
```
┌──────────────────────────┐
│ ← Productos       +      │
├──────────────────────────┤
│ 🔍 Buscar producto...    │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ Arroz 1kg     📦 50  │ │
│ │ $1.20     ● Activo   │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Aceura              │ │
│ │ Precio: $2.50  | 0  │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Leche Completa       │ │
│ │ Precio: $1.80  | 12 │ │
│ └──────────────────────┘ │
│                          │
│     [Cargar más...]      │
└──────────────────────────┘
```
- Pull-to-refresh
- Scroll infinito o paginación
- Swipe left para eliminar / editar
- Alerta visual en productos con stock bajo (fondo ámbar)
- Filtro por proveedor

### 4. Nuevo Producto
```
┌──────────────────────────┐
│ ← Nuevo Producto    💾  │
├──────────────────────────┤
│ Nombre                  │
│ ┌────────────────────┐  │
│ │                    │  │
│ └────────────────────┘  │
│ Código (opcional)       │
│ ┌────────────────────┐  │
│ │                    │  │
│ └────────────────────┘  │
│ Precio de venta ($)     │
│ ┌────────────────────┐  │
│ │                    │  │
│ └────────────────────┘  │
│ Stock inicial           │
│ ┌────────────────────┐  │
│ │                    │  │
│ └────────────────────┘  │
│ IVA %              [▼] │
│ Proveedor          [▼] │
│                          │
│ ┌────────────────────┐  │
│ │    Guardar         │  │
│ └────────────────────┘  │
└──────────────────────────┘
```
- Formulario vertical, un campo por línea
- Selectores dropdown para IVA y Proveedor
- Botón Guardar fijo abajo o en header

### 5. Nueva Factura
```
┌──────────────────────────┐
│ ← Nueva Factura   💾    │
├──────────────────────────┤
│ Cliente: Buscar... [👤] │
│ ┌──────────────────────┐ │
│ │ Juan Pérez           │ │
│ │ C.I: 12.345.678      │ │
│ └──────────────────────┘ │
│                          │
│ Productos:               │
│ ┌──────────────────────┐ │
│ │ Arroz 1kg   x3  $3.60│ │
│ │ Aceite      x1  $2.50│ │
│ │ Leche       x2  $3.60│ │
│ │                      │ │
│ │ + Agregar producto   │ │
│ └──────────────────────┘ │
│                          │
│ Subtotal:      $9.70    │
│ IVA (16%):     $1.55    │
│ ─────────────────────── │
│ **Total:**     **$11.25**│
│                          │
│ ┌────────────────────┐  │
│ │  Confirmar Factura │  │
│ └────────────────────┘  │
└──────────────────────────┘
```
- Selector de cliente con búsqueda
- Agregar productos: modal/buscador con cantidad
- Cada item muestra: nombre, cantidad, subtotal
- Total se recalcula en vivo
- Botón confirmar abajo

### 6. Factura / Cotización (vista impresión)
```
┌──────────────────────────┐
│     Efi- Pos             │
│  RIF: J-12345678-9       │
│  Av. Principal, Local 1  │
│  Tel: 0412-1234567       │
├──────────────────────────┤
│ FACTURA #001             │
│ Fecha: 20/07/2026        │
│                          │
│ Cliente: Juan Pérez      │
│ C.I: 12.345.678          │
├──────────────────────────┤
│ Cant  Producto    Total  │
│ ──────────────────────── │
│  3    Arroz 1kg   $3.60 │
│  1    Aceite      $2.50 │
│  2    Leche       $3.60 │
├──────────────────────────┤
│ Subtotal:       $9.70   │
│ IVA 16%:        $1.55   │
│ **TOTAL:**    **$11.25** │
├──────────────────────────┤
│ Forma pago: Efectivo     │
│                          │
│ ¡Gracias por su compra!  │
└──────────────────────────┘
```
- Vista previa antes de imprimir
- Formato compatible con impresora térmica 80mm/58mm (menos de 40 columnas)
- Botones: Imprimir (térmica) | Descargar PDF | Compartir

### 7. Reportes
```
┌──────────────────────────┐
│ ← Reportes               │
├──────────────────────────┤
│ Período: [▼]             │
│ Hoy | Semana | Mes | Año │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ Ventas totales       │ │
│ │      $1,245.00       │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Facturas: 45         │ │
│ │ Ticket prom: $27.67  │ │
│ └──────────────────────┘ │
│                          │
│ Productos más vendidos   │
│ ┌──────────────────────┐ │
│ │ 1. Arroz 1kg   45ud  │ │
│ │ 2. Leche       38ud  │ │
│ │ 3. Huevos      30ud  │ │
│ └──────────────────────┘ │
│                          │
│ [Cierre de Caja]         │
└──────────────────────────┘
```
- Gráficos simples (barras horizontales)
- Datos en cards grandes

### 8. Menú Lateral (Drawer)
```
┌──────────────────────────┐
│ ┌────────────────────────│
│ │ 👤 Carlos Dueño       │
│ │    Dueño               │
│ ├────────────────────────│
│ │ 🏠 Dashboard          │
│ │ 🧾 Facturación        │
│ │ 📋 Cotizaciones       │
│ │ 📦 Productos          │
│ │ 👥 Clientes           │
│ │ 🏭 Proveedores        │
│ │ 📊 Reportes           │
│ │ ⚙️ Configuración      │
│ ├────────────────────────│
│ │ 🚪 Cerrar Sesión      │
│ └────────────────────────│
└──────────────────────────┘
```
- Acceso via icono ☰ en navbar
- Muestra rol del usuario activo
- Opciones visibles según rol

---

## Criterios de Interacción

| Elemento | Comportamiento |
|----------|---------------|
| **Cards en Dashboard** | Tap → abre módulo |
| **Listas** | Tap → ver detalle; Swipe left → editar/eliminar (con confirmación) |
| **Búsqueda** | Resultados filtrados en tiempo real (debounce 300ms) |
| **Selectores dropdown** | Modal con lista scrolleable (no select nativo para mejor control visual) |
| **Teclado numérico** | En campos de precio/cantidad, forzar teclado numérico en móvil |
| **Pull-to-refresh** | En listas y dashboard |
| **Modo offline** | Barra superior ámbar con texto "Sin conexión - datos locales" |
| **Sincronización** | Icono verde ● cuando está sincronizado, animación de carga mientras sincroniza |
| **Tiempo de inactividad** | Auto-logout después de 30 min (configurable) |
| **Confirmaciones** | Toda acción destructiva requiere confirmación modal |
| **Feedback táctil** | Botones muestran feedback visual inmediato (opacity change) |

---

## Responsive Breakpoints

| Rango | Dispositivo | Layout |
|-------|------------|--------|
| < 480px | Teléfono | Single column, bottom sheet modals |
| 480-768px | Tablet pequeño | Grid 2 columnas, side panels |
| 768-1024px | Tablet grande | Sidebar + content |
| \> 1024px | Desktop | Sidebar + content max-width 1200px |

---

¿Aprobada la UI/UX? Pasamos a **Fase 4: TRD (Tech Stack y Arquitectura Técnica)** 🛠️
