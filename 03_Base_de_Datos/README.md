# Base de datos

Scripts SQL (creación de tablas y datos de prueba) y modelo entidad-relación de **Nexus PC**.
Motor: **SQL Server** (administrado con SQL Server Management Studio).
Responsable principal: Daniel.

**Versión vigente: 0.2** (`NexusPC.sql`). Los cambios al diseño se registran en `../04_Documentacion/Registro_de_Cambios.md`.

## Contenido de la carpeta

| Archivo | Para qué sirve |
|---|---|
| `NexusPC.sql` | Crea la base `NexusPC`: borra y recrea las tablas, inserta las 7 categorías y los 30 productos con sus especificaciones, y trae consultas de verificación. Es la fuente de verdad de la base |
| `Crear_Usuario_API.sql` | Crea el inicio de sesión `nexus_app` que usa la API, con permisos de lectura y escritura (`db_datareader` y `db_datawriter`) sobre `NexusPC`. No es administrador |
| `NexusPC.dbml`, `NexusPCDiagramaV0.2DBML.dbml` | Modelo de la base en formato DBML (para generar el diagrama en dbdiagram.io) |
| `DiagramaNexuspcV0.2.png`, `NexusPcSqlV0.2.png` | Diagrama entidad-relación de la versión 0.2 |
| `diagrama entidad relacion nexus pc.png`, `Basededatos1.0.png` | Diagramas de versiones anteriores del diseño |

## Tablas

| Tabla | Contenido |
|---|---|
| `Categorias` | Las 7 categorías de componentes |
| `Productos` | Los 30 productos: nombre, marca, precio, stock, imagen y categoría |
| `EspecificacionesProducto` | Datos técnicos de cada producto (por ejemplo socket, consumo en watts, núcleos), usados por la compatibilidad |
| `Pedidos` | Datos del comprador: nombre y correo obligatorios, teléfono opcional |
| `DetallePedido` | Productos, cantidades y precios de cada pedido |

## Cómo crear la base de datos

1. Abrir `NexusPC.sql` en SSMS y ejecutarlo completo (F5). Al final, la consulta de conteo debe mostrar `TOTAL = 30`.
2. Abrir `Crear_Usuario_API.sql`, escribir una contraseña propia en la línea `DECLARE @pwd` (solo en tu copia local) y ejecutarlo.
3. Seguir con la configuración de TCP/IP y autenticación mixta descrita en `../01_Codigo_Fuente/backend/README.md`.

> `NexusPC.sql` borra las tablas cada vez que se ejecuta, así que solo se usa en desarrollo.
> Nunca se debe subir al repositorio el archivo con la contraseña real.

## Consultas de verificación incluidas en `NexusPC.sql`

Productos por categoría, conteo total (30), disponibilidad (Agotado, Pocas piezas, Disponible), productos con claves obligatorias faltantes, regla procesador–tarjeta madre por socket, regla de la fuente de poder y pruebas de `Pedidos` que se deshacen con `ROLLBACK`.
