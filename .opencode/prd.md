# Fase 1: PRD — Efi- Pos

## Problema y Solución

**Problema:** Pequeños comercios en Venezuela llevan facturación en cuadernos, Excel o sistemas complicados que requieren internet constante. Cuando falla la conexión, dejan de vender o pierden datos.

**Solución:** Sistema PWA de facturación y administración que funciona offline, se instala en segundos y corre en cualquier dispositivo. El comerciante factura, controla inventario y genera reportes sin depender de internet.

---

## User Personas

| Persona | Rol | Necesidad | Dolor |
|---------|-----|-----------|-------|
| **Carlos** | Dueño de bodega/tienda | Saber qué se vendió, controlar inventario, ver ganancias | No entiende de tecnología, quiere algo simple |
| **María** | Cajera/empleada | Facturar rápido, imprimir ticket, sin complicaciones | Clientes esperando, sistema lento o caído |
| **Roberto** | Admin/contador | Reportes de ventas, productos más vendidos, cierres de caja | Perder tiempo cuadrando cuentas manualmente |

---

## Funcionalidades (MVP)

| # | Funcionalidad | Prioridad |
|---|--------------|-----------|
| 1 | Login y roles (dueño, cajero, admin) | Alta |
| 2 | CRUD de productos (nombre, precio, stock, código) | Alta |
| 3 | CRUD de clientes (nombre, cédula/RIF, teléfono) | Alta |
| 4 | CRUD de proveedores (nombre, RIF, teléfono, dirección) | Alta |
| 5 | Crear cotización (seleccionar cliente, agregar productos, calcular total, válida por X días) | Alta |
| 6 | Convertir cotización en factura con un clic | Alta |
| 7 | Crear factura (seleccionar cliente, agregar productos, calcular total) | Alta |
| 8 | Cálculo automático de IVA/IVU según producto | Alta |
| 9 | Historial de facturas (ver, buscar, anular) | Alta |
| 10 | Historial de cotizaciones (ver, buscar, eliminar) | Alta |
| 11 | Impresión de factura y cotización (PDF + formato para impresora térmica 80mm/58mm) | Alta |
| 12 | Control de inventario (restar stock al facturar, alerta de bajo stock) | Alta |
| 13 | Reportes de ventas (por día, semana, mes, producto más vendido) | Media |
| 14 | Cierre de caja (total del día, efectivo vs facturado) | Media |
| 15 | Sincronización offline (trabajar sin internet, sincronizar después) | Alta |
| 16 | Respaldo y restauración de datos | Media |

### Out of Scope (MVP)
- Factura electrónica SENIAT
- Múltiples sucursales
- Pasarela de pago (online)
- Notificaciones push
- App nativa

---

## User Stories

### Módulo de Autenticación y Roles
- **US-01:** Como dueño, quiero crear usuarios con roles (cajero/admin) para controlar quién accede al sistema.
- **US-02:** Como cajero, quiero iniciar sesión con mi usuario y contraseña para acceder al sistema.

### Módulo de Productos
- **US-03:** Como dueño, quiero registrar productos (nombre, precio, stock, código, % IVA) para tener el catálogo actualizado.
- **US-04:** Como cajero, quiero buscar productos por nombre o código al facturar para encontrarlos rápido.

### Módulo de Clientes
- **US-05:** Como cajero, quiero registrar clientes (nombre, cédula/RIF, teléfono) para asociarlos a las facturas.
- **US-06:** Como cajero, quiero buscar clientes por nombre o cédula al crear una factura.

### Módulo de Proveedores
- **US-06:** Como dueño, quiero registrar proveedores (nombre, RIF, teléfono, dirección) para tener control de quién me surte.
- **US-07:** Como dueño, quiero asociar productos a un proveedor para saber a quién pedir cuando falte stock.

### Módulo de Cotizaciones
- **US-08:** Como cajero/vendedor, quiero crear una cotización con cliente y productos para entregar un presupuesto.
- **US-09:** Como cajero/vendedor, quiero convertir una cotización en factura con un clic cuando el cliente apruebe.
- **US-10:** Como dueño, quiero ver el historial de cotizaciones y saber cuáles fueron convertidas a factura.

### Módulo de Facturación
- **US-11:** Como cajero, quiero crear una factura seleccionando cliente y agregando productos con cantidad para registrar la venta.
- **US-12:** Como cajero, quiero que el sistema calcule automáticamente el subtotal, IVA y total general.
- **US-13:** Como cajero, quiero imprimir o descargar la factura en PDF/térmico para entregarla al cliente.
- **US-14:** Como dueño, quiero ver el historial de facturas y anular una si es necesario.

### Módulo de Inventario
- **US-15:** Como dueño, quiero que el stock se descuente automáticamente al facturar para mantener el inventario actualizado.
- **US-16:** Como dueño, quiero recibir alertas de productos con stock bajo para reabastecer a tiempo.
- **US-17:** Como dueño, quiero filtrar productos por proveedor para saber qué pedirle a cada uno.

### Módulo de Reportes
- **US-18:** Como dueño/admin, quiero ver reportes de ventas por período (día, semana, mes) para analizar el negocio.
- **US-19:** Como dueño, quiero ver el producto más vendido y el total de ventas del día.

### Módulo Offline
- **US-20:** Como cajero, quiero poder facturar y cotizar aunque no haya internet para no detener las ventas.
- **US-21:** Como dueño, quiero que los datos se sincronicen automáticamente cuando haya conexión.

---

## Métricas de Éxito (MVP)
- Tiempo de creación de factura < 30 segundos
- Sin pérdida de datos en cortes de internet
- Capacidad offline por +8 horas
- Sincronización automática al recuperar conexión

---

¿Apruebas este PRD? Si hay ajustes, dímelos. Si está bien, pasamos a **Fase 2 (Flujo de la App)**.
