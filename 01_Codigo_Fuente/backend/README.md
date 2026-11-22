# Nexus PC – Backend (API)

API de Nexus PC hecha con **Node.js + Express** y conectada a **SQL Server** con el paquete `mssql`.

| Dato | Valor |
|---|---|
| Versión | v0.3 (agrega la compatibilidad entre productos) |
| Responsable | Angel (Backend / API) |
| Base de datos | `NexusPC.sql` v0.2 (fuente de verdad) |
| Especificación | `API_Especificacion.md` v0.2 |

## 1. Qué incluye esta versión

5 rutas de la especificación (las demás son de etapas posteriores):

| Ruta | Qué hace |
|---|---|
| `GET /api/categorias` | Lista las 7 categorías con su número de productos |
| `GET /api/productos` | Lista los productos. Filtro opcional: `?categoria_id=1` |
| `GET /api/productos/:id` | Detalle de un producto con descripción y `especificaciones` |
| `POST /api/pedidos` | Registra un pedido en una sola transacción: descuenta el stock, guarda el pedido y devuelve `201` con el pedido completo. Los precios salen siempre de la base |
| `POST /api/compatibilidad` | Lista los productos de una categoría indicando si son compatibles con un producto base y con el carrito (reglas R1 a R4). Solo lee la base; no cambia datos ni stock |

Además, Express sirve la carpeta `../frontend` (con su subcarpeta `img`) en la **misma dirección y puerto** que la API, por lo que no hace falta configurar CORS.

### Estructura de carpetas

```
01_Codigo_Fuente/
├── backend/
│   ├── servidor.js              ← arranca Express y conecta todo
│   ├── db/
│   │   ├── conexion.js          ← conexión única a SQL Server (pool)
│   │   └── probarConexion.js    ← npm run probar-conexion
│   ├── rutas/
│   │   ├── categorias.js        ← GET /api/categorias
│   │   ├── productos.js         ← GET /api/productos
│   │   ├── productoPorId.js     ← GET /api/productos/:id
│   │   ├── pedidos.js           ← POST /api/pedidos
│   │   └── compatibilidad.js    ← POST /api/compatibilidad
│   ├── utilidades/
│   │   ├── errores.js           ← formato único de error
│   │   ├── validaciones.js      ← validar ids y el body del pedido y de la compatibilidad
│   │   ├── formato.js           ← snake_case, estado, especificaciones, número de pedido
│   │   └── compatibilidad.js    ← reglas R1 a R4 (funciones puras)
│   ├── package.json
│   ├── .env.example             ← plantilla (SÍ se sube)
│   └── .env                     ← tus datos reales (NO se sube)
└── frontend/                    ← la página (la sirve Express)
    └── img/
```

## 2. Requisitos

- **Node.js 18.19 o superior** (recomendado la versión LTS desde <https://nodejs.org>). Comprueba con `node -v`.
- **SQL Server 2022** (Express o Developer completo; **LocalDB no sirve**, Node no puede conectarse a él) y **SSMS** en Windows.
- Git.

## 3. Instalación rápida

**Primero prepara SQL Server (sección 4) y deja listo el usuario `nexus_app`.** Después abre una terminal (la de VS Code sirve) y ejecuta:

```bash
cd 01_Codigo_Fuente/backend
npm install
copy .env.example .env
```

Edita `.env` con tus datos (ver sección 5). Luego:

```bash
npm run probar-conexion   # debe mostrar: Productos en la base de datos: 30
npm start                 # arranca la API
```

> En PowerShell el comando para copiar es `Copy-Item .env.example .env`. En Mac/Linux, `cp .env.example .env`.

## 4. Preparar SQL Server local (paso a paso)

### Paso 1. Crear la base de datos con `NexusPC.sql`

1. Abre **SSMS** y conéctate a tu servidor (con Autenticación de Windows, como siempre).
2. Menú **Archivo → Abrir → Archivo…** y elige `03_Base_de_Datos/NexusPC.sql`.
3. Pulsa **Ejecutar** (F5) para correr el script **completo**.
4. Revisa los resultados: la consulta de conteo debe terminar con una fila `TOTAL = 30`.

> El script borra y vuelve a crear las tablas cada vez que se ejecuta. Es solo para desarrollo.

**¿Cómo se llama mi servidor?** En una pestaña de consulta ejecuta:

```sql
SELECT @@SERVERNAME AS Servidor, @@SERVICENAME AS Instancia;
```

- Instancia `MSSQLSERVER` → es la **predeterminada**; se usa solo `localhost`.
- Cualquier otro nombre (por ejemplo `SQLEXPRESS`) → es una **instancia con nombre**; el servidor es `localhost\SQLEXPRESS`. Si instalaste la edición Express, casi seguro es este caso. Esta guía se probó con SQL Server 2022 Express, instancia `SQLEXPRESS`, puerto fijo 1433 y Node.js 24.

### Paso 2. Habilitar TCP/IP

Node se conecta por TCP/IP, y en muchas instalaciones viene apagado.

1. Abre el **SQL Server Configuration Manager** (búsqueda de Windows: “SQL Server 2022 Configuration Manager”, o `Win + R` y escribe `SQLServerManager16.msc`).
2. Despliega **Configuración de red de SQL Server** (*SQL Server Network Configuration*) y elige **Protocolos de MSSQLSERVER** (o **Protocolos de SQLEXPRESS**, según tu instancia).
3. Clic derecho en **TCP/IP → Habilitar**.
4. Doble clic en **TCP/IP → pestaña Direcciones IP**, baja hasta la sección **IPAll** y deja:
   - **Puertos dinámicos TCP**: vacío (borra el `0` si lo tiene).
   - **Puerto TCP**: `1433` (si ya hay otra instancia usando 1433, escribe otro, por ejemplo `1450`).
5. Acepta. Los cambios se aplican al reiniciar el servicio (Paso 5).

> Fijar el puerto es lo más estable: así en el `.env` pones `DB_PORT` y te evitas depender del servicio *SQL Server Browser*.

### Paso 3. Activar la autenticación mixta

Por defecto SQL Server solo acepta la cuenta de Windows. Hay que permitir también inicios de sesión de SQL Server:

1. En SSMS, en el **Explorador de objetos**, clic derecho sobre el nombre del servidor → **Propiedades**.
2. Pestaña **Seguridad**.
3. Elige **Modo de autenticación de SQL Server y Windows** → **Aceptar**.
4. Saldrá un aviso de que hay que reiniciar el servicio (Paso 5).

### Paso 4. Crear el inicio de sesión y el usuario de la API

La API **no debe usar la cuenta `sa`**. El repositorio incluye un script que crea una cuenta propia, `nexus_app`, con permisos mínimos: puede leer y escribir en la base `NexusPC`, pero no es administrador y no puede borrar tablas.

1. En SSMS abre `03_Base_de_Datos/Crear_Usuario_API.sql` (antes debes haber ejecutado `NexusPC.sql`).
2. En la línea `DECLARE @pwd` cambia `CAMBIAR_ESTA_CONTRASENA` por una contraseña propia. **Escríbela solo en tu copia local y nunca subas al repositorio el archivo con la contraseña real.**
3. Ejecútalo con **Ejecutar** (F5). Al final deben aparecer dos filas: `db_datareader` y `db_datawriter`.

Notas:

- Usa una contraseña de al menos 8 caracteres con mayúsculas, minúsculas y números o símbolos. **No uses `#`, comillas ni espacios** (el archivo `.env` los interpreta de forma especial).
- `NexusPC.sql` no borra la base de datos, solo sus tablas, así que el usuario se conserva cuando vuelves a ejecutarlo. Si algún día haces `DROP DATABASE NexusPC`, vuelve a ejecutar `Crear_Usuario_API.sql`.
- `POST /api/pedidos` escribe en `Pedidos` y `DetallePedido` y descuenta el stock en `Productos`; para eso sirve el rol `db_datawriter` del usuario. `POST /api/compatibilidad` solo lee (basta `db_datareader`).

### Paso 5. Reiniciar el servicio de SQL Server

Obligatorio después de los pasos 2 y 3. Elige una forma:

- **SSMS:** clic derecho en el servidor → **Reiniciar**.
- **Configuration Manager:** *Servicios de SQL Server* → clic derecho en **SQL Server (MSSQLSERVER)** o **SQL Server (SQLEXPRESS)** → **Reiniciar**.
- **PowerShell como administrador:**

```powershell
Restart-Service -Name 'MSSQLSERVER' -Force          # instancia predeterminada
Restart-Service -Name 'MSSQL$SQLEXPRESS' -Force     # instancia con nombre (cambia SQLEXPRESS por la tuya)
```

Para comprobar que el puerto quedó abierto (PowerShell):

```powershell
Test-NetConnection localhost -Port 1433    # debe decir: TcpTestSucceeded : True
```

### Paso 6 (solo si usas instancia con nombre sin puerto fijo)

Si dejaste puertos dinámicos y usas `DB_INSTANCE`, el servicio **SQL Server Browser** debe estar iniciado: en Configuration Manager → *Servicios de SQL Server* → **SQL Server Browser** → Propiedades → *Servicio*: modo de inicio **Automático** → **Iniciar**. Es la forma más frágil; por eso se recomienda fijar el puerto (Paso 2) y usar `DB_PORT`.

## 5. El archivo `.env`

Los datos de conexión **solo** van en `.env`. Este archivo está en `.gitignore` y **nunca se sube** (RNF-03). Lo que se sube es `.env.example`, sin datos reales.

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| `DB_USER` | Sí | Inicio de sesión de SQL Server (`nexus_app`) |
| `DB_PASSWORD` | Sí | Su contraseña |
| `DB_SERVER` | Sí | `localhost` (o `localhost\SQLEXPRESS`) |
| `DB_NAME` | Sí | `NexusPC` |
| `PORT` | No | Puerto de la API. Si no existe, usa `3000` |
| `DB_INSTANCE` | No | Nombre de la instancia (por ejemplo `SQLEXPRESS`) |
| `DB_PORT` | No | Puerto TCP fijo de SQL Server. Si se pone, **tiene prioridad** sobre la instancia |

**Caso A: instancia predeterminada (la más simple)**

```env
DB_USER=nexus_app
DB_PASSWORD=tu_contraseña
DB_SERVER=localhost
DB_NAME=NexusPC
PORT=3000
```

**Caso B: instancia con nombre, por puerto fijo (recomendado)**

```env
DB_USER=nexus_app
DB_PASSWORD=tu_contraseña
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=NexusPC
PORT=3000
```

**Caso C: instancia con nombre, por nombre (necesita SQL Server Browser)**

```env
DB_USER=nexus_app
DB_PASSWORD=tu_contraseña
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=NexusPC
PORT=3000
```

(También es válido `DB_SERVER=localhost` más `DB_INSTANCE=SQLEXPRESS`.)

Si el puerto 1433 ya lo usa otra instancia, fija otro en el Paso 2 (por ejemplo `1450`) y escribe ese mismo número en `DB_PORT`.

### ¿Por qué `trustServerCertificate`?

En `db/conexion.js` se usan dos opciones:

- `encrypt: true` → la comunicación entre Node y SQL Server va cifrada.
- `trustServerCertificate: true` → SQL Server en tu PC genera un certificado que él mismo se firma (no lo emitió una entidad oficial). Sin esta opción, Node lo rechaza con el error *self-signed certificate*. Es correcto para desarrollo local. En un servidor de producción real se usaría un certificado válido.

## 6. Ejecutar

```bash
npm start
```

Debe mostrar:

```
[OK] Servidor corriendo en http://localhost:3000
[OK] Página servida desde ...\01_Codigo_Fuente\frontend
[OK] Conectado a SQL Server (base NexusPC)
```

Abre en el navegador:

- <http://localhost:3000/api/categorias>
- <http://localhost:3000/api/productos>
- <http://localhost:3000/api/productos?categoria_id=1>
- <http://localhost:3000/api/productos/11>

`POST /api/pedidos` y `POST /api/compatibilidad` no se pueden abrir desde el navegador; se prueban con `curl.exe` (ver los ejemplos de las secciones «Registrar un pedido» y «Consultar compatibilidad»).

Para detener el servidor: `Ctrl + C` en la terminal.

### Registrar un pedido (`POST /api/pedidos`)

Body (sin precios; si llegan `precio`, `precio_unitario`, `subtotal` o `total`, se ignoran):

```json
{
  "nombre_comprador": "Ana López",
  "correo": "ana@correo.com",
  "telefono": "6641234567",
  "items": [ { "id_producto": 1, "cantidad": 1 }, { "id_producto": 6, "cantidad": 2 } ]
}
```

Reglas: `nombre_comprador` (1 a 100) y `correo` (máx. 120, un solo `@`, sin espacios, con punto en el dominio) son obligatorios; `telefono` es opcional (máx. 20); `items` no puede estar vacío y cada línea lleva enteros `id_producto` y `cantidad` (≥ 1). Las líneas repetidas del mismo producto se suman. Todo se valida antes de abrir la transacción y los problemas se devuelven juntos en `detalles`.

Ejemplo en PowerShell (guarda el JSON en `pedido.json`, UTF-8 sin BOM):

```powershell
curl.exe -i -X POST http://localhost:3000/api/pedidos -H "Content-Type: application/json" --data-binary "@pedido.json"
```

Si una línea falla, se cancela todo y la base queda igual. Estas pruebas cambian el stock: para dejarlo como al inicio, ejecuta `NexusPC.sql` completo.

### Consultar compatibilidad (`POST /api/compatibilidad`)

Devuelve los productos de una categoría con `compatible` (`true` o `false`), `regla` (`"R1"` a `"R4"` o `null`) y `motivo` (texto o `null`). Es solo informativo: nunca bloquea agregar ni comprar. **No cambia stock ni datos**, así que no hace falta reiniciar la base entre pruebas.

Body (los tres campos son obligatorios):

```json
{
  "id_producto_base": 11,
  "categoria_id": 6,
  "ids_carrito": [24]
}
```

| Campo | Regla |
|---|---|
| `id_producto_base` | Número entero de 1 a 2147483647; el producto debe existir |
| `categoria_id` | Número entero de 1 a 2147483647; la categoría a listar debe existir |
| `ids_carrito` | Lista de enteros de 1 a 2147483647; puede ser `[]`; cada id debe existir. **Máximo 100 ids distintos** (con más, responde `400`) |

Los números van como número JSON (no como texto `"5"`). Los ids repetidos, incluido el del producto base dentro de `ids_carrito`, cuentan una sola vez. Todo el formato se valida antes de consultar la base y los problemas se devuelven juntos en `detalles`.

**Reglas** (según la pareja de categorías del producto base y la categoría listada, en cualquier orden):

| Regla | Pareja | Es compatible si |
|---|---|---|
| R1 | Procesadores y Tarjetas madre | `Socket` igual |
| R2 | Memoria RAM y Tarjetas madre | `TipoRAM` igual |
| R3 | Fuentes de poder con Procesadores o Tarjetas de video | `PotenciaW` de la fuente ≥ (suma de `ConsumoW` de los procesadores y tarjetas de video considerados) × 1.3. Se compara con enteros: `PotenciaW × 10 ≥ suma × 13` |
| R4 | Gabinetes y Tarjetas madre | El `FormatoPlaca` de la placa está en `FormatosSoportados` del gabinete |
| — | Cualquier otra pareja | Siempre `compatible: true`, `regla: null`, `motivo: null` |

R1 a R4 comparan solo el producto base con cada producto listado; el carrito solo interviene en R3 (suma el base, el carrito y, si se listan procesadores o tarjetas de video, el candidato; cada id una vez). Si el producto base está en la categoría listada, también aparece en la lista (sin regla); el frontend lo oculta. El orden es: primero los compatibles y después los incompatibles, cada grupo por `id_producto`.

**Orden de los errores:** `categoria_id` que no existe → `400`; luego `id_producto_base` que no existe → `404`; luego el primer id de `ids_carrito` que no exista → `404`. Si a algún producto le falta una especificación que la regla necesita (o no es numérica), responde `500` y el detalle queda solo en la terminal.

Ejemplo en PowerShell (guarda el JSON en `caso.json`, UTF-8 sin BOM):

```powershell
curl.exe -i -X POST http://localhost:3000/api/compatibilidad -H "Content-Type: application/json" -d "@caso.json"
```

Casos rápidos con los datos del script: base 1 y categoría 2 → compatibles 3 y 14; base 11, categoría 6 y carrito `[24]` → compatibles 26 y 27, incompatibles 9 y 25 con `Requiere 741 W; la fuente ofrece ...`.

### Formato de error

Todos los errores tienen la misma forma:

```json
{ "error": { "codigo": "PRODUCTO_NO_ENCONTRADO", "mensaje": "No existe un producto con el id indicado.", "detalles": { "id_producto": 999 } } }
```

| Código | HTTP | Cuándo |
|---|---|---|
| `DATOS_INVALIDOS` | 400 | `categoria_id` o `:id` no es un entero (solo dígitos, hasta 2147483647); o el body de `POST /api/pedidos` o de `POST /api/compatibilidad` es inválido o es un JSON mal formado (en la compatibilidad también si `categoria_id` no existe o `ids_carrito` trae más de 100 ids distintos) |
| `PRODUCTO_NO_ENCONTRADO` | 404 | El id es válido pero ese producto no existe (en un pedido, algún `id_producto` no existe y no se guarda nada; en la compatibilidad, el base o algún id de `ids_carrito`) |
| `STOCK_INSUFICIENTE` | 409 | Una línea del pedido pide más piezas de las que hay; el detalle dice qué producto, cuántas hay y cuántas se pidieron |
| `ERROR_INTERNO` | 500 | Falla inesperada. Mensaje genérico; el detalle técnico solo aparece en la terminal del servidor |

## 7. Errores comunes y solución

| Lo que ves | Causa probable | Solución |
|---|---|---|
| `Faltan variables en el archivo .env: ...` | No existe `.env` o le faltan líneas | `copy .env.example .env` y llénalo. El archivo debe llamarse exactamente `.env` y estar dentro de `backend/` |
| `Failed to connect to localhost:1433 - Could not connect` (`ESOCKET`) | TCP/IP deshabilitado, servicio sin reiniciar, servicio detenido o puerto equivocado | Repite los pasos 2 y 5; revisa con `Test-NetConnection localhost -Port 1433`; verifica `DB_PORT` |
| `Failed to connect ... in 15000ms` (`ETIMEOUT`) | Host o puerto incorrectos, o instancia con puerto dinámico | Fija el puerto (paso 2) y usa `DB_PORT` |
| `Login failed for user 'nexus_app'` (`ELOGIN`) | Contraseña incorrecta, el login no existe o la autenticación mixta no está activa (o falta reiniciar) | Revisa `DB_USER`/`DB_PASSWORD`; repite los pasos 3, 4 y 5. Si la contraseña tiene `#`, quítalo o ponla entre comillas dobles en `.env` |
| `Cannot open database "NexusPC" requested by the login` | La base no existe, `DB_NAME` está mal escrito o el usuario no se creó en esa base | Ejecuta `NexusPC.sql` completo; revisa `DB_NAME`; vuelve a ejecutar `Crear_Usuario_API.sql` (paso 4) |
| `The SELECT permission was denied on the object 'Productos'` | Al usuario le falta el rol de lectura | `USE NexusPC; ALTER ROLE db_datareader ADD MEMBER nexus_app;` |
| `Invalid object name 'dbo.Productos'` | Estás conectado a otra base o no se ejecutó el script | Revisa `DB_NAME` y ejecuta `NexusPC.sql` |
| `Failed to lookup instance on localhost - Instance name not found` (`EINSTLOOKUP`) | El servicio SQL Server Browser no está iniciado, o el nombre de la instancia está mal | Paso 6, o mejor fija el puerto y usa `DB_PORT` |
| `self-signed certificate` | Se quitó `trustServerCertificate` | Dejar `trustServerCertificate: true` en `db/conexion.js` |
| `EADDRINUSE: address already in use :::3000` | Otro programa (o otra copia del servidor) ya usa el puerto | Cierra la otra terminal o cambia `PORT` en `.env` |
| `Cannot find module 'express'` | Falta instalar dependencias | `npm install` dentro de `backend/` |
| `'node' no se reconoce como un comando` | Node.js no está instalado o la terminal se abrió antes de instalarlo | Instala Node LTS y abre una terminal nueva |
| PowerShell: `la ejecución de scripts está deshabilitada` | Política de PowerShell | Usa el CMD, o ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Los acentos se ven como símbolos raros en la terminal | Codificación de la consola | Usa la terminal de VS Code / Windows Terminal, o ejecuta `chcp 65001` |
| La API responde `500 ERROR_INTERNO` | Falla en el servidor | Mira la terminal donde corre `npm start`: ahí está el detalle técnico (la respuesta no lo muestra a propósito) |
| `Cannot GET /` en el navegador | No se encuentra `../frontend/index.html` | Revisa que la carpeta `frontend` esté junto a `backend` dentro de `01_Codigo_Fuente`. La API sigue funcionando en `/api/...` |

Tras corregir un problema de conexión **no hace falta reiniciar `npm start`**: el servidor vuelve a intentar conectarse en la siguiente petición. Si cambias el archivo `.env`, sí hay que reiniciarlo (`Ctrl + C` y `npm start`).

## 8. Seguridad (RNF-03)

- Todas las consultas son **parametrizadas** (`request.input(...)`): ningún dato del navegador se pega dentro del texto SQL. En `POST /api/compatibilidad` cada id de `ids_carrito` va en su propio parámetro; el texto de la consulta solo lleva `@id0`, `@id1`..., nunca los valores.
- Hay **una sola conexión reutilizable** (pool) para todo el servidor.
- Los precios nunca vienen del navegador: el pedido usa el precio de la base y el stock se descuenta con una sola instrucción atómica dentro de una transacción.
- Los datos de conexión viven solo en `.env` y `.env` está en `.gitignore`. Antes de cada commit revisa con `git status` que `.env` **no** aparezca.
- El error 500 devuelve un mensaje genérico y nunca revela nombres de tablas, consultas ni texto de errores de SQL Server.
- El usuario de la base (`nexus_app`) no es administrador: solo tiene los roles `db_datareader` y `db_datawriter` sobre `NexusPC` y no puede borrar tablas.