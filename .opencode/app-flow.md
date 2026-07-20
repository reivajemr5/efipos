# Fase 2: App Flow — Efi- Pos

## Mapa de Navegación

```mermaid
flowchart TD
    A[Login] --> B{Dashboard}
    B --> C[Facturación y Cotizaciones]
    B --> D[Productos]
    B --> E[Clientes]
    B --> F[Proveedores]
    B --> G[Reportes]
    B --> H[Configuración]

    C --> C1[Nueva Factura]
    C --> C2[Nueva Cotización]
    C --> C3[Historial Facturas]
    C --> C4[Historial Cotizaciones]
    C2 --> C5[Seleccionar Cliente]
    C5 --> C6[Agregar Productos]
    C6 --> C7[Resumen y Total]
    C7 --> C8[Generar Cotización]
    C8 --> C9[Imprimir Cotización PDF]
    C8 --> C10[Convertir a Factura ➡️]
    C10 --> C1
    C1 --> C11[Seleccionar Cliente]
    C11 --> C12[Agregar Productos]
    C12 --> C13[Resumen y Total]
    C13 --> C14[Confirmar Factura]
    C14 --> C15[Imprimir PDF/Térmico]
    C3 --> C16[Ver Factura]
    C16 --> C17[Anular Factura]
    C4 --> C18[Ver Cotización]
    C18 --> C10

    D --> D1[Lista de Productos]
    D1 --> D2[Nuevo Producto]
    D1 --> D3[Editar Producto]
    D1 --> D4[Eliminar Producto]

    E --> E1[Lista de Clientes]
    E1 --> E2[Nuevo Cliente]
    E1 --> E3[Editar Cliente]

    F --> F1[Lista de Proveedores]
    F1 --> F2[Nuevo Proveedor]
    F1 --> F3[Editar Proveedor]
    F1 --> F4[Ver productos del proveedor]

    G --> G1[Ventas por Período]
    G --> G2[Producto Más Vendido]
    G --> G3[Cierre de Caja]

    H --> H1[Usuarios y Roles]
    H --> H2[Respaldo de Datos]
    H --> H3[Configuración de Impresión]

    H1 --> H4[Crear Usuario]
    H1 --> H5[Editar Usuario]
```

---

## Matriz de Estados por Rol

| Pantalla | Dueño | Admin | Cajero |
|----------|-------|-------|--------|
| Dashboard | ✅ | ✅ | ✅ |
| Facturación (nueva) | ✅ | ✅ | ✅ |
| Cotizaciones (nueva) | ✅ | ✅ | ✅ |
| Convertir cotización a factura | ✅ | ✅ | ✅ |
| Anular factura | ✅ | ✅ | ❌ |
| Productos (CRUD) | ✅ | ✅ | ❌ solo ver |
| Clientes (CRUD) | ✅ | ✅ | ✅ |
| Proveedores (CRUD) | ✅ | ✅ | ❌ |
| Reportes | ✅ | ✅ | ❌ |
| Configuración | ✅ | ❌ | ❌ |
| Usuarios | ✅ | ❌ | ❌ |
| Respaldo BD | ✅ | ✅ | ❌ |

---

## Matriz de Estados por Conectividad

| Acción | Online | Offline |
|--------|--------|---------|
| Login | ✅ | ✅ (credenciales cacheadas) |
| CRUD Productos | ✅ | ✅ (local) |
| CRUD Clientes | ✅ | ✅ (local) |
| Crear Factura | ✅ | ✅ (local, sincroniza después) |
| Crear Cotización | ✅ | ✅ (local, sincroniza después) |
| Ver Historial | ✅ | ✅ (datos cacheados) |
| Imprimir | ✅ | ✅ |
| Reportes | ✅ | ❌ (solo datos cacheados) |
| Respaldar BD | ✅ | ❌ |

---

## Flujo de Excepciones

- **Sin conexión:** La app muestra un indicador "Offline" en la barra superior. Todas las operaciones se guardan en IndexedDB. Al recuperar conexión, sincroniza automáticamente.
- **Stock insuficiente:** Al agregar producto a factura con cantidad > stock disponible, muestra alerta y no permite agregar más del stock actual.
- **Factura anulada:** Se marca como "Anulada" en el historial, no se elimina. El stock se reincorpora automáticamente.
- **Campos vacíos:** Validación en todos los formularios antes de guardar.
- **Cierre de caja:** Si hay facturas offline sin sincronizar, no permite cerrar caja hasta sincronizar.

---

¿Aprobado? Pasamos a **Fase 3 (UI/UX)** ✍️
