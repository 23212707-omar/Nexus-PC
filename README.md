# Nexus PC

Sistema de venta de componentes de computadora en línea, con verificación de compatibilidad entre piezas.
Tienda ficticia desarrollada con fines académicos para la materia **Gestión de Proyectos de Software**
(Tecnológico Nacional de México – Instituto Tecnológico de Tijuana).

**Estado actual:** Etapa final – entrega del proyecto (26 de noviembre de 2026).

**Qué incluye el sistema:**
- Base de datos v0.2 (5 tablas y 30 productos).
- API en Node.js y Express: categorías, productos, pedidos y compatibilidad entre componentes.
- Página web completa: catálogo por categorías, detalle de producto, carrito, confirmación de compra y revisión de compatibilidad, con vista móvil.
- Pruebas, capturas de pantalla y documentación en las carpetas `07_Pruebas`, `08_Capturas_de_Pantalla` y `04_Documentacion`.

## Integrantes

| Integrante | Rol principal |
|---|---|
| González Cristóbal Omar | Frontend y diseño |
| Garcia Luna Ricardo Daniel | Líder del proyecto y base de datos |
| Cuevas Marquez Pablo Angel | Backend (API) |
| Perez Flores Andres Manuel | Documentación y responsable de pruebas y calidad |

Profesora: Mtra. María Guadalupe Rodríguez López

## Tecnologías utilizadas

- **Lenguaje de programación:** JavaScript
- **Servidor:** Node.js (versión 18.19 o superior) y Express 5
- **Base de datos:** SQL Server (administrada con SQL Server Management Studio)
- **Conexión a la base de datos:** paquete `mssql`; credenciales con `dotenv`
- **Página web:** HTML, CSS y JavaScript
- **Control de versiones:** Git y GitHub (Issues, Pull Requests y GitHub Projects)

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `01_Codigo_Fuente` | Código del backend (API) y del frontend (página web) |
| `02_Sistema_Ejecutable` | Cómo ejecutar el sistema |
| `03_Base_de_Datos` | Scripts SQL (tablas, datos de prueba y usuario de la API) y modelo entidad-relación |
| `04_Documentacion` | Plan de Calidad, Plan del Proyecto, especificación de la API y registro de cambios |
| `05_Manual_de_Usuario` | Manual de usuario |
| `06_Evidencias` | Evidencias de cada etapa |
| `07_Pruebas` | Plan, casos y resultados de pruebas |
| `08_Capturas_de_Pantalla` | Capturas del sistema funcionando |

La base de datos vigente es la **versión 0.2** (`03_Base_de_Datos/NexusPC.sql`).

## Instrucciones de instalación

1. Instalar **Node.js** (18.19 o superior) y **SQL Server** con SQL Server Management Studio (SSMS).
   Debe ser SQL Server Express (o Developer) completo: **LocalDB no sirve**, porque Node.js no puede
   conectarse a él.
2. Abrir `03_Base_de_Datos/NexusPC.sql` en SSMS y ejecutarlo completo para crear la base `NexusPC`.
   El script borra y recrea las tablas (y con ellas los pedidos y el stock), así que también sirve
   para dejar los datos como al inicio antes de una demostración.
3. Crear el usuario de la API (no usar `sa`):
   1. Abrir `03_Base_de_Datos/Crear_Usuario_API.sql` en SSMS y escribir una contraseña propia en la
      línea `DECLARE @pwd` (solo en tu copia local; nunca subas al repositorio el archivo con la contraseña real).
   2. Ejecutarlo. Crea el inicio de sesión `nexus_app` con permisos de **lectura y escritura** sobre
      `NexusPC` (`db_datareader` y `db_datawriter`); no es administrador y no puede borrar tablas.
      La escritura se necesita para registrar pedidos.
   3. Para conectar desde Node.js, habilitar el modo de autenticación mixto, activar TCP/IP con el puerto
      fijo 1433 en SQL Server Configuration Manager y reiniciar el servicio. Los pasos detallados y los
      errores comunes están en `01_Codigo_Fuente/backend/README.md`.
4. En `01_Codigo_Fuente/backend`, copiar `.env.example` como `.env` y escribir los datos de conexión.
   El archivo `.env` nunca se sube al repositorio. Variables:

   | Variable | Uso |
   |---|---|
   | `DB_USER` | Usuario de SQL Server (`nexus_app`) |
   | `DB_PASSWORD` | Contraseña de ese usuario |
   | `DB_SERVER` | Servidor (por ejemplo `localhost`) |
   | `DB_PORT` | Puerto de SQL Server (por ejemplo `1433`) |
   | `DB_INSTANCE` | Opcional: nombre de la instancia, si no se usa `DB_PORT` |
   | `DB_NAME` | Nombre de la base (`NexusPC`) |
   | `PORT` | Puerto en el que escucha la API (por ejemplo `3000`) |

5. En esa misma carpeta, instalar las dependencias con:
```
npm install
```

## Instrucciones para ejecutar el sistema

1. Desde `01_Codigo_Fuente/backend`, comprobar la conexión con la base de datos:
```
npm run probar-conexion
```

   Debe mostrar que la base tiene **30 productos**.

2. Iniciar el servidor:
```
npm start
```

   Deben aparecer tres mensajes `[OK]`: servidor corriendo, página servida y conectado a SQL Server.

3. Abrir en el navegador `http://localhost:3000`. La misma dirección sirve la página y la API
   (no abrir `index.html` como archivo ni con Live Server).

## Cómo se usa la tienda

1. **Catálogo:** elegir una de las 7 categorías del menú; cada producto muestra su precio y su disponibilidad (Disponible, Pocas piezas o Agotado).
2. **Detalle:** al abrir un producto se ven su descripción y especificaciones, y se elige la cantidad.
3. **Carrito:** desde la vista rápida o la pantalla del carrito se cambian cantidades, se quitan productos o se vacía el carrito.
4. **Compatibilidad:** con el botón «Ver compatibles con este» se revisan las piezas que funcionan con el producto elegido (procesador–tarjeta madre, RAM–tarjeta madre, fuente–consumo y gabinete–tarjeta madre). Las incompatibles aparecen al final, con su motivo, y avisan antes de agregarse.
5. **Compra:** se escribe el nombre y el correo (el teléfono es opcional) y se confirma el pedido; al terminar se muestra el número de pedido. No se realiza ningún cobro.

## Rutas de la API

| Ruta | Descripción |
|---|---|
| `GET /api/categorias` | Las 7 categorías con su número de productos |
| `GET /api/productos` | Los 30 productos |
| `GET /api/productos?categoria_id=1` | Productos de una categoría |
| `GET /api/productos/:id` | Detalle de un producto con sus especificaciones |
| `POST /api/pedidos` | Registra un pedido y descuenta el stock |
| `POST /api/compatibilidad` | Compatibilidad de un producto base con los de una categoría |

Todos los errores usan el mismo formato: `{ "error": { "codigo", "mensaje", "detalles" } }`.
La especificación completa está en `04_Documentacion/Artefactos/API_Especificacion.md`.

**Banderas de la página:** en `01_Codigo_Fuente/frontend/js/api.js`, las constantes
`USAR_DATOS_EJEMPLO` y `SIMULAR_PEDIDO` deben estar en `false` para usar la API y la base de datos reales
(es como se entrega). En `true` sirven solo para pruebas sin servidor.

## Credenciales de prueba

No aplica: el sistema no incluye inicio de sesión de usuarios. La contraseña del usuario
`nexus_app` de la base de datos la elige cada integrante en su equipo y se guarda solo en el archivo
`.env`, que no se sube al repositorio.

## Pruebas y evidencias

- Las pruebas de cada pantalla y de la API se registran en las descripciones de los Pull Requests y en la Bitácora de Supervisión y Pruebas.
- Capturas del sistema funcionando: `08_Capturas_de_Pantalla/`.
- Evidencias de cada etapa: `06_Evidencias/`.

## Documentos del proyecto

- Plan de Calidad: `04_Documentacion/Plan_de_Calidad_Nexus_PC.pdf`
- Especificación de la API: `04_Documentacion/Artefactos/API_Especificacion.md`
- Registro de cambios: `04_Documentacion/Registro_de_Cambios.md`
- Plan del Proyecto y cronograma: `04_Documentacion/`

## Flujo de trabajo del equipo

- Nadie trabaja directamente sobre la rama `main`: cada cambio va en una rama propia y se integra con un Pull Request.
- Cada Pull Request lo revisa otro integrante (Omar revisa a Angel, Daniel a Omar y Angel a Daniel) y lo confirma el responsable de pruebas y calidad.
- Los Pull Requests enlazan su issue con `Refs #N`; el issue se cierra solo cuando se confirma el cambio.
- Los mensajes de commit empiezan con el identificador de la actividad o del cambio (ejemplo: `API1: conexión a SQL Server`, `UI6: ...`).
- Los cambios al alcance o al diseño se solicitan con un Issue de tipo "solicitud de cambio" y se registran en `04_Documentacion/Registro_de_Cambios.md`.
