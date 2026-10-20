# Nexus PC – Especificación de la API REST

| Dato | Valor |
|---|---|
| Versión | v0.2 (corrige la especificación de rutas de «Primeros artefactos del proyecto») |
| Fecha | 19 de octubre de 2026 |
| Responsable | Angel (Backend / API) |
| Fuente de verdad | `NexusPC.sql` v0.2 (Daniel) |
| Solicitudes de cambio | CAM-001 (datos del comprador) y CAM-002 (alinear la API con la base y los wireframes) |
| Estado | Pendiente de revisión por pull request |

**Orden de autoridad si algo no coincide:** script SQL, luego API, luego interfaz, luego documentos. Si algo falta en la base de datos, no se inventa: se anota en la sección 11 «Dudas para el equipo».

---

## 1. Alcance

Este documento define las 6 rutas de la API de Nexus PC (Node.js, Express y el paquete `mssql` sobre SQL Server): qué recibe cada una, qué valida, qué responde y qué errores devuelve. No contiene código. Los ejemplos usan datos reales del script v0.2.

## 2. Convenciones generales

| Tema | Regla |
|---|---|
| URL base | `http://localhost:PORT` (el puerto viene de `PORT` en `.env`). Los ejemplos usan `3000` solo como ilustración. |
| Formato | Peticiones y respuestas en JSON (`Content-Type: application/json`), codificación UTF-8. |
| Nombres de campos | `snake_case` y en español (decisión 1). |
| Precios y totales | Números con 2 decimales (`precio` y `precio_unitario` vienen de `DECIMAL(10,2)`; `total` de `DECIMAL(12,2)`). El servidor calcula en centavos (enteros) para evitar errores de redondeo. |
| Fecha | Texto ISO 8601 sin zona horaria, por ejemplo `2026-10-19T10:15:30`. Viene de `Pedidos.Fecha` (`DATETIME2(0)`, hora local del servidor SQL). |
| Precios del navegador | El servidor nunca los recibe ni los usa: lee el precio de la base y calcula el total (decisión 2). |
| Estado de disponibilidad | Lo calcula la API a partir de `Productos.Stock` (decisión 3, tabla siguiente). |
| Número de pedido | `numero_pedido` = `"NX-"` + `IdPedido` con 4 dígitos (`NX-0001`). No se guarda en la base (decisión 4). |
| Compatibilidad | Solo informativa: la API nunca bloquea agregar ni comprar productos incompatibles (decisión 10). |

**Estado de disponibilidad (campo `estado`):**

| Condición sobre `Stock` | `estado` | Ejemplos reales del script |
|---|---|---|
| `Stock = 0` | `Agotado` | ID 20 (Blue SN580 2TB NVMe) |
| `Stock` entre 1 y 3 | `Pocas piezas` | ID 13 (stock 3), ID 16 (stock 2), ID 24 (stock 1) |
| `Stock` mayor que 3 | `Disponible` | ID 11 (stock 4, caso límite), ID 1 (stock 15) |

## 3. Correspondencia entre campos JSON y columnas de la base de datos

| Campo JSON | Tabla.Columna | Notas |
|---|---|---|
| `id_categoria` | Categorias.IdCategoria | |
| `nombre` (en categorías) | Categorias.Nombre | |
| `total_productos` | Calculado | `COUNT` de Productos por categoría; 0 si no tiene |
| `id_producto` | Productos.IdProducto | |
| `nombre` (en productos) | Productos.Nombre | |
| `marca` | Productos.Marca | |
| `descripcion` | Productos.Descripcion | Puede ser `null` (la columna admite NULL) |
| `precio` | Productos.Precio | |
| `stock` | Productos.Stock | |
| `estado` | Calculado desde Productos.Stock | Ver sección 2 |
| `categoria` | Categorias.Nombre | Se obtiene por `Productos.IdCategoria` |
| `imagen_url` | Productos.ImagenUrl | Puede ser `null`; se devuelve tal como está guardada (por ejemplo `img/ryzen5-7600.jpg`) |
| `especificaciones` | EspecificacionesProducto.Clave y Valor | Una propiedad por clave (tabla 3.1) |
| `id_pedido` | Pedidos.IdPedido | |
| `numero_pedido` | Calculado desde Pedidos.IdPedido | `NX-` + 4 dígitos |
| `nombre_comprador` | Pedidos.NombreComprador | `NVARCHAR(100)`, obligatorio |
| `correo` | Pedidos.Correo | `NVARCHAR(120)`, obligatorio (CAM-001) |
| `telefono` | Pedidos.Telefono | `NVARCHAR(20)`, opcional; `null` si no se dio |
| `fecha` | Pedidos.Fecha | |
| `total` | Pedidos.Total | Calculado por el servidor |
| `items[].id_producto` | DetallePedido.IdProducto | |
| `items[].nombre` | Productos.Nombre | Se une por `IdProducto` |
| `items[].cantidad` | DetallePedido.Cantidad | |
| `items[].precio_unitario` | DetallePedido.PrecioUnitario | Precio de la base al momento de la compra |
| `items[].subtotal` | Calculado | `cantidad` × `precio_unitario` |
| `categoria_id` (entrada) | Categorias.IdCategoria / Productos.IdCategoria | Es el nombre del parámetro de entrada; equivale a `id_categoria` |
| `id_producto_base`, `ids_carrito` (entrada) | Productos.IdProducto | |
| `compatible`, `motivo`, `regla` | Calculados | Reglas R1 a R4 (sección 6) |

**3.1 Claves de `especificaciones` (EspecificacionesProducto.Clave → propiedad JSON)**

| Clave en la base | Propiedad JSON | Tipo en el JSON | Categoría |
|---|---|---|---|
| Socket | `socket` | texto | Procesadores, Tarjetas madre |
| ConsumoW | `consumo_w` | número | Procesadores, Tarjetas de video |
| Nucleos | `nucleos` | número | Procesadores |
| TipoRAM | `tipo_ram` | texto | Tarjetas madre, Memoria RAM |
| FormatoPlaca | `formato_placa` | texto | Tarjetas madre |
| CapacidadGB | `capacidad_gb` | número | Memoria RAM, Almacenamiento |
| VelocidadMHz | `velocidad_mhz` | número | Memoria RAM |
| Tipo | `tipo` | texto | Almacenamiento |
| MemoriaGB | `memoria_gb` | número | Tarjetas de video |
| FuenteRecomendadaW | `fuente_recomendada_w` | número | Tarjetas de video |
| PotenciaW | `potencia_w` | número | Fuentes de poder |
| FormatosSoportados | `formatos_soportados` | lista de textos | Gabinetes |

`Valor` es `NVARCHAR` en la base. La API convierte a número las claves numéricas (el diccionario del script indica que son valores sin unidad) y convierte `FormatosSoportados` (lista separada por comas sin espacios) en una lista JSON. Ver duda D-11.

## 4. Formato único de error

Todos los errores usan esta forma:

```json
{
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Texto legible para la persona usuaria.",
    "detalles": {}
  }
}
```

`detalles` solo aparece cuando aplica. Su contenido depende del código.

| Código | HTTP | Cuándo se usa | `detalles` |
|---|---|---|---|
| `DATOS_INVALIDOS` | 400 | Parámetro, ruta o body con formato, longitud o tipo incorrecto | Lista de objetos `{ "campo", "mensaje" }` |
| `NO_AUTORIZADO` | 401 | Falta `x-api-key` o no coincide con `API_KEY` | No lleva |
| `PRODUCTO_NO_ENCONTRADO` | 404 | El `id_producto` no existe | `{ "id_producto" }` |
| `STOCK_INSUFICIENTE` | 409 | Una línea del pedido pide más piezas de las que hay | `{ "id_producto", "nombre", "disponible", "solicitado" }` |
| `ERROR_INTERNO` | 500 | Cualquier falla inesperada (base de datos, conexión, bug) | No lleva |

**Ejemplo `DATOS_INVALIDOS` (400)**

```json
{
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Los datos enviados no son válidos.",
    "detalles": [
      { "campo": "correo", "mensaje": "El correo no puede tener espacios y debe tener un solo @." },
      { "campo": "items[0].cantidad", "mensaje": "La cantidad debe ser un número entero mayor o igual a 1." }
    ]
  }
}
```

**Ejemplo `NO_AUTORIZADO` (401)**

```json
{
  "error": {
    "codigo": "NO_AUTORIZADO",
    "mensaje": "Clave de acceso ausente o incorrecta."
  }
}
```

**Ejemplo `PRODUCTO_NO_ENCONTRADO` (404)**

```json
{
  "error": {
    "codigo": "PRODUCTO_NO_ENCONTRADO",
    "mensaje": "No existe un producto con el id indicado.",
    "detalles": { "id_producto": 999 }
  }
}
```

**Ejemplo `STOCK_INSUFICIENTE` (409)**

```json
{
  "error": {
    "codigo": "STOCK_INSUFICIENTE",
    "mensaje": "No hay suficientes piezas de Core i7-13700K. Disponibles: 3; solicitadas: 4.",
    "detalles": {
      "id_producto": 13,
      "nombre": "Core i7-13700K",
      "disponible": 3,
      "solicitado": 4
    }
  }
}
```

**Ejemplo `ERROR_INTERNO` (500)**

```json
{
  "error": {
    "codigo": "ERROR_INTERNO",
    "mensaje": "Ocurrió un problema en el servidor. Intenta de nuevo más tarde."
  }
}
```

Reglas del error 500:

- El mensaje es genérico y nunca revela nombres de tablas, consultas, rutas de archivos ni texto de errores de SQL Server.
- Es distinto al de stock, para que la interfaz no confunda una falla del servidor con un producto sin piezas.
- El detalle técnico solo se registra en la consola o el registro del servidor.

---

## 5. Rutas

Las rutas con parámetros reciben **solo dígitos** en los identificadores (hasta 2147483647, el máximo de `INT`). Cualquier otro valor responde `DATOS_INVALIDOS` (400). Toda ruta puede responder `ERROR_INTERNO` (500) con el ejemplo de la sección 4; por eso solo se repite en las tablas de errores.

### 5.1 GET /api/categorias

| Dato | Valor |
|---|---|
| Descripción | Lista las categorías con su número de productos |
| Requerimiento | RF-01 |
| Pantalla | Pantalla 1: menú de 7 categorías y texto «N productos» |
| Parámetros | Ninguno |
| Orden | `id_categoria` ascendente |
| Validaciones | No aplica |

**Petición**

```http
GET /api/categorias HTTP/1.1
Host: localhost:3000
```

**Respuesta exitosa: 200 OK** (los 7 registros del script v0.2)

```json
[
  { "id_categoria": 1, "nombre": "Procesadores", "total_productos": 5 },
  { "id_categoria": 2, "nombre": "Tarjetas madre", "total_productos": 5 },
  { "id_categoria": 3, "nombre": "Memoria RAM", "total_productos": 4 },
  { "id_categoria": 4, "nombre": "Almacenamiento", "total_productos": 4 },
  { "id_categoria": 5, "nombre": "Tarjetas de video", "total_productos": 4 },
  { "id_categoria": 6, "nombre": "Fuentes de poder", "total_productos": 4 },
  { "id_categoria": 7, "nombre": "Gabinetes", "total_productos": 4 }
]
```

**Errores posibles**

| HTTP | Código | Cuándo |
|---|---|---|
| 500 | `ERROR_INTERNO` | Falla inesperada. Ejemplo en la sección 4 |

### 5.2 GET /api/productos

| Dato | Valor |
|---|---|
| Descripción | Lista productos, con filtro opcional por categoría |
| Requerimiento | RF-01 (RNF-01: el catálogo debe cargar en 2 segundos o menos) |
| Pantalla | Pantalla 1: catálogo por categorías |
| Orden | `id_producto` ascendente |

**Parámetros**

| Parámetro | Dónde | Obligatorio | Regla |
|---|---|---|---|
| `categoria_id` | Query | No | Entero (solo dígitos). Sin el parámetro, devuelve los 30 productos. Si es un entero válido pero no existe esa categoría, devuelve lista vacía (ver D-8) |

**Campos de cada producto:** `id_producto`, `nombre`, `marca`, `precio`, `stock`, `estado`, `categoria`, `imagen_url`.

**Validaciones:** `categoria_id`, si viene, debe contener solo dígitos.

**Petición**

```http
GET /api/productos?categoria_id=1 HTTP/1.1
Host: localhost:3000
```

**Respuesta exitosa: 200 OK**

```json
[
  {
    "id_producto": 1,
    "nombre": "Ryzen 5 7600",
    "marca": "AMD",
    "precio": 4500.00,
    "stock": 15,
    "estado": "Disponible",
    "categoria": "Procesadores",
    "imagen_url": "img/ryzen5-7600.jpg"
  },
  {
    "id_producto": 2,
    "nombre": "Core i5-12400F",
    "marca": "Intel",
    "precio": 3200.00,
    "stock": 12,
    "estado": "Disponible",
    "categoria": "Procesadores",
    "imagen_url": "img/i5-12400f.jpg"
  },
  {
    "id_producto": 11,
    "nombre": "Ryzen 7 7800X3D",
    "marca": "AMD",
    "precio": 9200.00,
    "stock": 4,
    "estado": "Disponible",
    "categoria": "Procesadores",
    "imagen_url": "img/ryzen7-7800x3d.jpg"
  },
  {
    "id_producto": 12,
    "nombre": "Core i5-13400F",
    "marca": "Intel",
    "precio": 4300.00,
    "stock": 10,
    "estado": "Disponible",
    "categoria": "Procesadores",
    "imagen_url": "img/i5-13400f.jpg"
  },
  {
    "id_producto": 13,
    "nombre": "Core i7-13700K",
    "marca": "Intel",
    "precio": 7800.00,
    "stock": 3,
    "estado": "Pocas piezas",
    "categoria": "Procesadores",
    "imagen_url": "img/i7-13700k.jpg"
  }
]
```

**Errores posibles**

| HTTP | Código | Cuándo |
|---|---|---|
| 400 | `DATOS_INVALIDOS` | `categoria_id` no es un entero (por ejemplo `?categoria_id=abc`) |
| 500 | `ERROR_INTERNO` | Falla inesperada. Ejemplo en la sección 4 |

Ejemplo de petición y respuesta 400:

```http
GET /api/productos?categoria_id=abc HTTP/1.1
Host: localhost:3000
```

```json
{
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "El parámetro categoria_id debe ser un número entero.",
    "detalles": [
      { "campo": "categoria_id", "mensaje": "Debe ser un número entero." }
    ]
  }
}
```

### 5.3 GET /api/productos/:id

| Dato | Valor |
|---|---|
| Descripción | Devuelve un producto con su descripción, disponibilidad y especificaciones |
| Requerimiento | RF-02 (disponibilidad: RF-07) |
| Pantalla | Pantalla 2: detalle de producto |

**Parámetros**

| Parámetro | Dónde | Regla |
|---|---|---|
| `id` | Ruta | Obligatorio; solo dígitos. Si no es un entero: 400. Si es un entero que no existe: 404 |

**Campos:** todos los de la ruta 5.2, más `descripcion` y el objeto `especificaciones` (claves en la tabla 3.1). Un producto sin especificaciones devuelve `{}`.

**Petición**

```http
GET /api/productos/11 HTTP/1.1
Host: localhost:3000
```

**Respuesta exitosa: 200 OK**

```json
{
  "id_producto": 11,
  "nombre": "Ryzen 7 7800X3D",
  "marca": "AMD",
  "precio": 9200.00,
  "stock": 4,
  "estado": "Disponible",
  "categoria": "Procesadores",
  "imagen_url": "img/ryzen7-7800x3d.jpg",
  "descripcion": "Procesador de 8 nucleos y 16 hilos con tecnologia 3D V-Cache, socket AM5.",
  "especificaciones": {
    "socket": "AM5",
    "consumo_w": 120,
    "nucleos": 8
  }
}
```

**Errores posibles**

| HTTP | Código | Cuándo |
|---|---|---|
| 400 | `DATOS_INVALIDOS` | `:id` no es un número entero (por ejemplo `/api/productos/abc`) |
| 404 | `PRODUCTO_NO_ENCONTRADO` | El id es entero pero no existe (por ejemplo 999) |
| 500 | `ERROR_INTERNO` | Falla inesperada. Ejemplo en la sección 4 |

Ejemplo 400 (`GET /api/productos/abc`):

```json
{
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "El id del producto debe ser un número entero.",
    "detalles": [
      { "campo": "id", "mensaje": "Debe ser un número entero." }
    ]
  }
}
```

Ejemplo 404 (`GET /api/productos/999`):

```json
{
  "error": {
    "codigo": "PRODUCTO_NO_ENCONTRADO",
    "mensaje": "No existe un producto con el id indicado.",
    "detalles": { "id_producto": 999 }
  }
}
```

### 5.4 POST /api/pedidos

| Dato | Valor |
|---|---|
| Descripción | Registra un pedido, descuenta el stock y devuelve el pedido guardado |
| Requerimiento | RF-06, RF-07 (total: RF-04); RNF-03 y RNF-04 |
| Pantalla | Pantalla 5: confirmación de compra (formulario, error de stock y pantalla de éxito) |
| Solicitud de cambio | CAM-001 (datos del comprador) |

**Body**

| Campo | Obligatorio | Tipo | Regla |
|---|---|---|---|
| `nombre_comprador` | Sí | texto | Se quitan espacios de los extremos; de 1 a 100 caracteres (`Pedidos.NombreComprador`) |
| `correo` | Sí | texto | Ver validación del correo abajo; máximo 120 caracteres (`Pedidos.Correo`) |
| `telefono` | No | texto | Máximo 20 caracteres (`Pedidos.Telefono`). Si falta, es `null` o viene vacío, se guarda `NULL` |
| `items` | Sí | lista | No puede estar vacía |
| `items[].id_producto` | Sí | entero | Mayor o igual a 1 |
| `items[].cantidad` | Sí | entero | Mayor o igual a 1 y máximo 2147483647 (límite de `INT`) |

El body no lleva precios. Si llegan campos como `precio`, `precio_unitario`, `subtotal` o `total`, se ignoran por completo.

**Validación del correo** (más estricta que la base, decisión 11):

1. Se quitan los espacios de los extremos y el resultado no puede tener ningún espacio.
2. Debe tener exactamente un `@`.
3. Debe cumplir también el formato de la restricción `CK_Pedidos_Correo` de la base (`'%_@_%._%'`): al menos un carácter antes del `@` y, después del `@`, al menos un carácter, un punto y al menos un carácter. Así la API rechaza con 400 lo que la base rechazaría con un error de restricción, y esa restricción nunca llega al usuario como 500.
4. Máximo 120 caracteres.

**Reglas de las líneas repetidas** (decisión 5): si llegan varias líneas del mismo `id_producto`, el servidor suma sus cantidades antes de guardar y genera una sola línea en `DetallePedido` (la pareja `IdPedido` + `IdProducto` es única). La suma también debe ser menor o igual a 2147483647. La respuesta devuelve las líneas ya agrupadas.

**Todas las validaciones se hacen antes de abrir la transacción**, y se devuelven juntas en `detalles`. No se consulta stock ni existencia de productos en esta etapa.

**Petición** (el producto 6 llega repetido a propósito)

```http
POST /api/pedidos HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "nombre_comprador": "Ana López",
  "correo": "ana@correo.com",
  "telefono": "6641234567",
  "items": [
    { "id_producto": 1, "cantidad": 1 },
    { "id_producto": 6, "cantidad": 1 },
    { "id_producto": 6, "cantidad": 1 }
  ]
}
```

**Respuesta exitosa: 201 Created** (los precios salen de la base: Ryzen 5 7600 = 4500.00 y Vengeance LPX 16GB DDR4-3200 = 950.00; el ejemplo supone que es el primer pedido de la base)

```json
{
  "id_pedido": 1,
  "numero_pedido": "NX-0001",
  "fecha": "2026-10-19T10:15:30",
  "nombre_comprador": "Ana López",
  "correo": "ana@correo.com",
  "telefono": "6641234567",
  "items": [
    {
      "id_producto": 1,
      "nombre": "Ryzen 5 7600",
      "cantidad": 1,
      "precio_unitario": 4500.00,
      "subtotal": 4500.00
    },
    {
      "id_producto": 6,
      "nombre": "Vengeance LPX 16GB DDR4-3200",
      "cantidad": 2,
      "precio_unitario": 950.00,
      "subtotal": 1900.00
    }
  ],
  "total": 6400.00
}
```

**Errores posibles**

| HTTP | Código | Cuándo |
|---|---|---|
| 400 | `DATOS_INVALIDOS` | Falla cualquiera de las validaciones anteriores (no se abrió transacción) |
| 404 | `PRODUCTO_NO_ENCONTRADO` | Algún `id_producto` de `items` no existe; se cancela todo |
| 409 | `STOCK_INSUFICIENTE` | Alguna línea pide más piezas de las que hay; se cancela todo |
| 500 | `ERROR_INTERNO` | Falla inesperada; se cancela todo |

Ejemplo 400 (correo sin `@`, nombre vacío e `items` vacío):

```json
{
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Los datos enviados no son válidos.",
    "detalles": [
      { "campo": "nombre_comprador", "mensaje": "El nombre es obligatorio y tiene máximo 100 caracteres." },
      { "campo": "correo", "mensaje": "El correo no puede tener espacios, debe tener un solo @ y un dominio con punto." },
      { "campo": "items", "mensaje": "Debe incluir al menos un producto." }
    ]
  }
}
```

Ejemplo 404 (un item con `id_producto` 999):

```json
{
  "error": {
    "codigo": "PRODUCTO_NO_ENCONTRADO",
    "mensaje": "No existe un producto con el id indicado. No se guardó ningún cambio.",
    "detalles": { "id_producto": 999 }
  }
}
```

Ejemplo 409 (cuatro piezas del Core i7-13700K, que tiene stock 3; el id 20, Blue SN580 2TB NVMe, daría `disponible: 0`):

```json
{
  "error": {
    "codigo": "STOCK_INSUFICIENTE",
    "mensaje": "No hay suficientes piezas de Core i7-13700K. Disponibles: 3; solicitadas: 4. No se guardó ningún cambio.",
    "detalles": {
      "id_producto": 13,
      "nombre": "Core i7-13700K",
      "disponible": 3,
      "solicitado": 4
    }
  }
}
```

Ejemplo 500: el de la sección 4. Cuando ocurre, no queda nada guardado (RNF-04).

**Lógica del descuento atómico de stock** (decisión 7; se describe, no se programa)

- Todo ocurre dentro de una sola transacción.
- Las líneas ya agrupadas se procesan en orden ascendente de `id_producto`. Siempre el mismo orden evita bloqueos mutuos entre dos compras simultáneas.
- Por cada línea se hace una única instrucción de actualización que resta `cantidad` a `Stock` solo si `Stock >= cantidad`, y en la misma instrucción devuelve el nombre y el precio vigentes del producto. Es una sola operación indivisible: la base bloquea la fila mientras la ejecuta, así dos compras no pueden llevarse la última pieza.
- Si la actualización afecta 0 filas, el servidor consulta dentro de la misma transacción si el producto existe. Si no existe, cancela y responde 404. Si existe, lee el stock actual (`disponible`), cancela y responde 409.
- Si todas las líneas se descontaron, el servidor calcula el total (suma de `cantidad` × precio leído de la base), inserta el pedido en `Pedidos`, obtiene `IdPedido` y `Fecha`, inserta las líneas en `DetallePedido` con `PrecioUnitario` igual al precio leído y confirma la transacción.
- Cualquier error inesperado cancela la transacción completa y responde 500.
- La restricción `CK_Productos_Stock` de la base (stock mayor o igual a 0) queda como última barrera.

### 5.5 GET /api/pedidos (protegida)

| Dato | Valor |
|---|---|
| Descripción | Lista los pedidos registrados, del más reciente al más antiguo |
| Requerimiento | RF-06 (consulta de pedidos guardados) |
| Pantalla | Ninguna de los wireframes; la usa el caso de uso «Consulta de pedidos registrados» del personal de la tienda (ver D-4) |
| Orden | `fecha` descendente (si empatan, `id_pedido` descendente) |

**Encabezado obligatorio**

| Encabezado | Regla |
|---|---|
| `x-api-key` | El servidor lo compara con la variable `API_KEY` del `.env`. Si falta o no coincide: 401 `NO_AUTORIZADO` |

**Campos:** `id_pedido`, `numero_pedido`, `nombre_comprador`, `correo`, `telefono`, `fecha`, `total`.

**Petición**

```http
GET /api/pedidos HTTP/1.1
Host: localhost:3000
x-api-key: <valor de API_KEY>
```

**Respuesta exitosa: 200 OK** (el script no trae pedidos; estos son datos de ejemplo de dos pedidos hechos con la API)

```json
[
  {
    "id_pedido": 2,
    "numero_pedido": "NX-0002",
    "nombre_comprador": "Luis Hernández",
    "correo": "luis@correo.com",
    "telefono": null,
    "fecha": "2026-10-19T11:02:45",
    "total": 2400.00
  },
  {
    "id_pedido": 1,
    "numero_pedido": "NX-0001",
    "nombre_comprador": "Ana López",
    "correo": "ana@correo.com",
    "telefono": "6641234567",
    "fecha": "2026-10-19T10:15:30",
    "total": 6400.00
  }
]
```

Sin pedidos guardados responde `200` con `[]`.

**Errores posibles**

| HTTP | Código | Cuándo |
|---|---|---|
| 401 | `NO_AUTORIZADO` | Falta `x-api-key` o no coincide con `API_KEY` |
| 500 | `ERROR_INTERNO` | Falla inesperada. Ejemplo en la sección 4 |

Ejemplo 401: el de la sección 4. El mensaje es el mismo si falta la clave o si es incorrecta, para no dar pistas.

### 5.6 POST /api/compatibilidad (deseable, RF-08)

| Dato | Valor |
|---|---|
| Descripción | Lista los productos de una categoría indicando si son compatibles con el producto base y con el carrito |
| Requerimiento | RF-08 (Deseable 1); tiempo de respuesta de 3 segundos o menos (M-06) |
| Pantalla | Pantalla 6: compatibilidad (se abre desde «Ver compatibles con este» de la Pantalla 3) |

**Body**

| Campo | Obligatorio | Regla |
|---|---|---|
| `id_producto_base` | Sí | Entero mayor o igual a 1; debe existir (si no, 404) |
| `categoria_id` | Sí | Entero mayor o igual a 1; categoría a listar; debe existir (si no, 400) |
| `ids_carrito` | Sí | Lista de enteros mayores o igual a 1 (puede ser `[]`); cada id debe existir (si no, 404) |

Los ids repetidos (incluido el del producto base dentro de `ids_carrito`) se cuentan una sola vez.

**Campos de cada producto de la respuesta:** `id_producto`, `nombre`, `marca`, `precio`, `stock`, `estado`, `categoria`, `imagen_url`, más `compatible` (`true` o `false`), `regla` (`"R1"` a `"R4"` o `null`) y `motivo` (texto sencillo o `null`).

**Orden:** primero los compatibles y al final los incompatibles; dentro de cada grupo, por `id_producto` ascendente. Los incompatibles siguen siendo agregables al carrito (decisión 10).

**Petición** (base: Ryzen 7 7800X3D; carrito con la RTX 4090; listar fuentes de poder)

```http
POST /api/compatibilidad HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "id_producto_base": 11,
  "categoria_id": 6,
  "ids_carrito": [24]
}
```

**Respuesta exitosa: 200 OK** (potencia requerida = (120 + 450) × 1.3 = 741 W)

```json
{
  "id_producto_base": 11,
  "categoria_id": 6,
  "productos": [
    {
      "id_producto": 26,
      "nombre": "RM1000x 1000W 80 Plus Gold",
      "marca": "Corsair",
      "precio": 4300.00,
      "stock": 4,
      "estado": "Disponible",
      "categoria": "Fuentes de poder",
      "imagen_url": "img/rm1000x.jpg",
      "compatible": true,
      "regla": "R3",
      "motivo": null
    },
    {
      "id_producto": 27,
      "nombre": "RM750e 750W 80 Plus Gold",
      "marca": "Corsair",
      "precio": 2500.00,
      "stock": 9,
      "estado": "Disponible",
      "categoria": "Fuentes de poder",
      "imagen_url": "img/rm750e.jpg",
      "compatible": true,
      "regla": "R3",
      "motivo": null
    },
    {
      "id_producto": 9,
      "nombre": "CV650 650W 80 Plus Bronze",
      "marca": "Corsair",
      "precio": 1300.00,
      "stock": 14,
      "estado": "Disponible",
      "categoria": "Fuentes de poder",
      "imagen_url": "img/cv650.jpg",
      "compatible": false,
      "regla": "R3",
      "motivo": "Requiere 741 W; la fuente ofrece 650 W"
    },
    {
      "id_producto": 25,
      "nombre": "CV450 450W 80 Plus Bronze",
      "marca": "Corsair",
      "precio": 950.00,
      "stock": 17,
      "estado": "Disponible",
      "categoria": "Fuentes de poder",
      "imagen_url": "img/cv450.jpg",
      "compatible": false,
      "regla": "R3",
      "motivo": "Requiere 741 W; la fuente ofrece 450 W"
    }
  ]
}
```

**Errores posibles**

| HTTP | Código | Cuándo |
|---|---|---|
| 400 | `DATOS_INVALIDOS` | Falta un campo, un tipo es incorrecto, `ids_carrito` no es una lista de enteros o `categoria_id` no existe |
| 404 | `PRODUCTO_NO_ENCONTRADO` | `id_producto_base` o algún id de `ids_carrito` no existe |
| 500 | `ERROR_INTERNO` | Falla inesperada, o un producto no tiene una clave de especificación obligatoria que la regla necesita. Ejemplo en la sección 4 |

Ejemplo 400:

```json
{
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Los datos enviados no son válidos.",
    "detalles": [
      { "campo": "categoria_id", "mensaje": "Es obligatorio y debe ser un número entero." },
      { "campo": "ids_carrito", "mensaje": "Debe ser una lista de números enteros." }
    ]
  }
}
```

Ejemplo 404:

```json
{
  "error": {
    "codigo": "PRODUCTO_NO_ENCONTRADO",
    "mensaje": "No existe un producto con el id indicado.",
    "detalles": { "id_producto": 999 }
  }
}
```

---

## 6. Reglas de compatibilidad

Qué regla se aplica depende de la pareja **categoría del producto base × categoría listada** (en cualquier orden):

| Regla | Pareja de categorías | Condición de compatibilidad |
|---|---|---|
| R1 | Procesadores y Tarjetas madre | `Socket` igual |
| R2 | Memoria RAM y Tarjetas madre | `TipoRAM` igual |
| R3 | Fuentes de poder con Procesadores o con Tarjetas de video | `PotenciaW` de la fuente mayor o igual a la potencia requerida |
| R4 | Gabinetes y Tarjetas madre | `FormatoPlaca` de la tarjeta madre está dentro de `FormatosSoportados` del gabinete |
| Sin regla | Cualquier otra pareja | `compatible = true`, `motivo = null`, `regla = null` |

**R1 a R4 comparan solo el producto base con cada producto listado.** El carrito (`ids_carrito`) solo interviene en R3.

**R3: fuente según el consumo**

- Potencia requerida = (suma de `ConsumoW` de los procesadores y tarjetas de video considerados) × 1.3.
- Los productos considerados son el producto base, los de `ids_carrito` y, si la categoría listada es procesadores o tarjetas de video, el producto candidato de cada fila. Cada id cuenta una vez, y solo suman las categorías Procesadores y Tarjetas de video.
- La fuente evaluada es el producto base (si es una fuente) o el candidato (si se listan fuentes).
- Es compatible si `PotenciaW` de la fuente es mayor o igual a la potencia requerida. El motivo dice la potencia requerida y la de la fuente.
- Para evitar errores de decimales, la comparación se hace con enteros (potencia de la fuente × 10 mayor o igual a la suma × 13). La potencia requerida mostrada en el motivo se redondea hacia arriba a vatios enteros.

**Nota sobre ConsumoW y la estimación (decisión 12):** `ConsumoW` es el TDP o potencia base que publica el fabricante, no el consumo máximo real. Por eso **la regla R3 es una estimación con margen del 30 %** y no garantiza que la fuente aguante cualquier carga. En el script, el Core i7-13700K (ID 13) tiene `ConsumoW = 125`, su potencia base; en turbo llega a 253 W (ver D-3).

**R4:** `FormatosSoportados` se separa por comas y se compara con `FormatoPlaca` con coincidencia exacta de texto (`ATX`, `mATX`, `Mini-ITX`).

**Formato del motivo.** Cuando no es compatible, el motivo tiene la forma «dato del candidato; la pieza base usa dato del base». Cuando es compatible, el motivo es `null`.

| Regla | Ejemplo de motivo |
|---|---|
| R1 | `Socket LGA1700; el procesador usa AM5` (base procesador). Si la base es la tarjeta madre: `Socket AM5; la tarjeta madre usa LGA1700` |
| R2 | `Memoria DDR4; la tarjeta madre usa DDR5` (base tarjeta madre). Si la base es la RAM: `Tarjeta madre DDR5; la memoria RAM usa DDR4` |
| R3 | `Requiere 741 W; la fuente ofrece 650 W` |
| R4 | `La placa es ATX; el gabinete soporta mATX, Mini-ITX` |

**Ejemplos con datos reales del script**

| Base y categoría listada | Compatibles (primero) | Incompatibles (al final, con motivo) |
|---|---|---|
| R1: base ID 1 Ryzen 5 7600 (AM5), listar Tarjetas madre | ID 3 PRO B650M-P; ID 14 TUF GAMING B650-PLUS | ID 4, ID 15 y ID 16: `Socket LGA1700; el procesador usa AM5` |
| R2: base ID 3 PRO B650M-P (DDR5), listar Memoria RAM | ID 5 FURY Beast 16GB DDR5-5600; ID 17 Vengeance 32GB DDR5-6000 | ID 6 y ID 18: `Memoria DDR4; la tarjeta madre usa DDR5` |
| R3: base ID 11 + carrito ID 24, listar Fuentes (ejemplo de la ruta 5.6) | ID 26 (1000 W); ID 27 (750 W) | ID 9: `Requiere 741 W; la fuente ofrece 650 W`; ID 25: `Requiere 741 W; la fuente ofrece 450 W` |
| R4: base ID 14 TUF GAMING B650-PLUS (ATX), listar Gabinetes | ID 28 4000D Airflow; ID 30 H5 Flow | ID 10: `La placa es ATX; el gabinete soporta mATX, Mini-ITX`; ID 29: `La placa es ATX; el gabinete soporta Mini-ITX` |
| Sin regla: base ID 1, listar Memoria RAM | Los 4 productos (IDs 5, 6, 17 y 18) con `regla = null` y `motivo = null` | Ninguno |

---

## 7. Flujo de compra corregido (POST /api/pedidos)

**Descripción en pasos**

1. La persona pulsa «Confirmar pedido» en la Pantalla 5. La interfaz envía `nombre_comprador`, `correo`, `telefono` (opcional) e `items` con `id_producto` y `cantidad`, sin precios.
2. **Validación de datos, antes de abrir la transacción**: tipos, longitudes (100, 120 y 20), formato del correo, `items` no vacío y cantidades enteras mayores o iguales a 1. Si algo falla, se responde **400 `DATOS_INVALIDOS`** con todos los problemas y no se toca la base.
3. El servidor agrupa las líneas repetidas del mismo producto sumando sus cantidades y las ordena por `id_producto`.
4. Abre la transacción.
5. Por cada línea hace el **descuento atómico**: resta stock solo si todavía alcanza y lee el nombre y el precio de la base en la misma instrucción.
6. Si una línea no se pudo descontar: si el producto no existe, cancela todo y responde **404 `PRODUCTO_NO_ENCONTRADO`**; si existe pero no alcanza, cancela todo y responde **409 `STOCK_INSUFICIENTE`**, indicando qué producto falla, cuántas piezas hay y cuántas se pidieron.
7. Con todas las líneas descontadas, calcula el total con los precios leídos de la base.
8. Inserta el encabezado en `Pedidos` y obtiene `IdPedido` y `Fecha`.
9. Inserta las líneas en `DetallePedido` con el precio de la base como `PrecioUnitario`.
10. Confirma la transacción (commit) y arma `numero_pedido` (`NX-` + `IdPedido` con 4 dígitos).
11. Responde **201** con el pedido completo. La interfaz vacía el carrito y muestra la pantalla de éxito.
12. Si ocurre cualquier falla inesperada en los pasos 4 a 10, cancela la transacción (rollback), registra el detalle técnico solo en el servidor y responde **500 `ERROR_INTERNO`** con un mensaje genérico. La interfaz no vacía el carrito.

Los tres mensajes de error son distintos entre sí: datos inválidos (qué campo corregir), stock insuficiente (qué producto y cuántas piezas quedan) y falla interna (mensaje genérico).

---

## 8. Seguridad y configuración

### 8.1 Consultas parametrizadas (RNF-03)

- Todas las consultas a SQL Server usan parámetros (`request.input(...)` del paquete `mssql`). Ningún dato recibido del navegador se concatena en el texto de una consulta.
- Esto incluye `categoria_id`, `:id`, los datos del comprador, `id_producto` y `cantidad` de cada línea, y los ids de `ids_carrito`. Para listas de ids se usa un parámetro por cada id; nunca se arma el texto de la consulta con los valores.
- El servidor ignora cualquier precio enviado por el navegador y siempre usa el de la base (decisión 2).
- Los mensajes de error 500 son genéricos y no revelan detalles de la base de datos.

### 8.2 Variables de entorno (archivo `.env`)

| Variable | Uso |
|---|---|
| `DB_USER` | Usuario de SQL Server |
| `DB_PASSWORD` | Contraseña de SQL Server |
| `DB_SERVER` | Servidor o instancia de SQL Server |
| `DB_NAME` | Nombre de la base de datos |
| `PORT` | Puerto en el que escucha la API |
| `API_KEY` | Clave que se compara con el encabezado `x-api-key` de `GET /api/pedidos` |

Reglas:

- El archivo `.env` se agrega a `.gitignore` y no se sube al repositorio (RNF-03). Solo se sube `.env.example`.
- Si `API_KEY` no está definida o está vacía, el servidor no debe arrancar. Así nunca queda la ruta protegida con una clave vacía.
- La comparación de `x-api-key` con `API_KEY` debe hacerse en tiempo constante.
- La clave nunca debe escribirse en el código de la página (HTML o JavaScript), porque cualquiera podría verla. Solo se envía desde una herramienta del personal de la tienda.

**Ejemplo para `.env.example`** (sin valores reales)

```env
DB_USER=usuario_de_sql_server
DB_PASSWORD=contrasena_de_sql_server
DB_SERVER=servidor_o_instancia
DB_NAME=nombre_de_la_base
PORT=numero_de_puerto
API_KEY=clave_larga_y_aleatoria
```

---

## 9. Trazabilidad

| Ruta | Requerimientos | Pantalla | Tablas que usa |
|---|---|---|---|
| GET /api/categorias | RF-01 | Pantalla 1 (menú y contador de productos) | Categorias, Productos |
| GET /api/productos | RF-01, RNF-01 | Pantalla 1 (catálogo) | Productos, Categorias |
| GET /api/productos/:id | RF-02, RF-07 (disponibilidad) | Pantalla 2 (detalle) | Productos, Categorias, EspecificacionesProducto |
| POST /api/pedidos | RF-06, RF-07, RF-04 (total), RNF-03, RNF-04; CAM-001 | Pantalla 5 (formulario, error de stock y éxito) | Pedidos, DetallePedido, Productos |
| GET /api/pedidos | RF-06 (consulta) | Sin pantalla en los wireframes (ver D-4) | Pedidos |
| POST /api/compatibilidad | RF-08, M-06 (3 s o menos) | Pantalla 6 (se abre desde la Pantalla 3) | Productos, Categorias, EspecificacionesProducto |

Las Pantallas 3 (carrito) y 4 (vista rápida) y los requerimientos RF-03, RF-04 y RF-05 no tienen ruta propia: el carrito vive en el navegador. El servidor solo recalcula el total al registrar el pedido.

---

## 10. Cambios respecto a la versión anterior

| Problema en la versión anterior | Corrección | Solicitud |
|---|---|---|
| El body de `POST /api/pedidos` usaba un solo campo `contacto`, pero la base tiene `Correo` (obligatorio) y `Telefono` (opcional) | Se definen `nombre_comprador` (obligatorio), `correo` (obligatorio) y `telefono` (opcional), con longitudes y validación del correo | CAM-001 |
| `GET /api/pedidos` no devolvía correo ni teléfono y no tenía orden definido | Devuelve `correo` y `telefono` y se ordena por fecha descendente | CAM-001 |
| La validación del correo no existía | Sin espacios, un solo `@`, máximo 120 caracteres y el formato que exige `CK_Pedidos_Correo` de la base | CAM-001 |
| Faltaba la ruta de categorías para el menú y el contador | Se agrega `GET /api/categorias` con `total_productos` | CAM-002 |
| Los campos no coincidían con la base (`id`, `producto_id`, `imagen`, `consumo`) | Se renombran (`id_producto`, `imagen_url`, `consumo_w`, etc.) y se agrega la tabla de correspondencia con las columnas reales | CAM-002 |
| Los ejemplos usaban datos inventados (Ryzen 5 5600G, socket AM4, id 105) | Los ejemplos usan productos, precios, stock e IDs reales del script v0.2 | CAM-002 |
| `GET /api/productos` no devolvía `marca` ni estado de disponibilidad | Devuelve `marca` y `estado` (Agotado, Pocas piezas, Disponible), calculado por la API | CAM-002 |
| El detalle mostraba `"consumo": "65W"` con unidad y una clave que no existe en la base | Las especificaciones usan las claves del diccionario del script, en `snake_case`, con valores numéricos sin unidad | CAM-002 |
| El navegador enviaba `precio_unitario` en el pedido | El servidor ya no recibe precios: los lee de la base y calcula el total | CAM-002 |
| Las líneas repetidas del mismo producto chocarían con la restricción única de `DetallePedido` | El servidor suma las cantidades antes de guardar | CAM-002 |
| La respuesta del pedido solo traía `mensaje` e `id_pedido` | Devuelve `id_pedido`, `numero_pedido` (NX-0001), `fecha`, datos del comprador, `items` con subtotales y `total` | CAM-002 |
| El stock insuficiente respondía 400 sin indicar qué producto fallaba | Responde 409 `STOCK_INSUFICIENTE` con `id_producto`, `nombre`, `disponible` y `solicitado`, como pide la Pantalla 5 | CAM-002 |
| El flujo verificaba el stock y lo descontaba después, así dos compras podían llevarse la última pieza | Descuento atómico dentro de la transacción: solo descuenta si todavía alcanza; si no, se cancela todo | CAM-002 |
| El flujo no validaba los datos antes de la transacción y tenía un solo mensaje de error | Validación previa (400) y tres mensajes distintos: datos inválidos, stock insuficiente y falla interna | CAM-002 |
| No existía un formato único de error ni un 404 para pedidos con productos inexistentes | Formato único `error` con `codigo`, `mensaje` y `detalles`; códigos `DATOS_INVALIDOS`, `NO_AUTORIZADO`, `PRODUCTO_NO_ENCONTRADO`, `STOCK_INSUFICIENTE` y `ERROR_INTERNO` | CAM-002 |
| `GET /api/pedidos` estaba abierta a cualquiera | Protegida con `x-api-key` comparada con `API_KEY` del `.env` (401 si falta o no coincide) | CAM-002 |
| `GET /api/productos/:id` no definía 400 para ids que no son enteros | Se responde 400 `DATOS_INVALIDOS`; 404 si el id no existe | CAM-002 |
| La compatibilidad solo devolvía `es_compatible` y `detalles`, sin reglas ni lista por categoría | La ruta recibe `id_producto_base`, `categoria_id` e `ids_carrito` y devuelve la lista con `compatible`, `regla` y `motivo`, compatibles primero; se documentan R1 a R4 | CAM-002 |
| No se indicaba la limitación de `ConsumoW` | Se aclara que es el TDP o potencia base y que R3 es una estimación con margen del 30 % | CAM-002 |
| Las tablas usaban etiquetas HTML (`<br>`) y el JSON salía ilegible | Tablas normales de Markdown y bloques de código | CAM-002 |
| Solo se mencionaba que las credenciales iban en `.env` | Se listan las 6 variables y se incluye `.env.example` sin valores reales | CAM-002 |

---

## 11. Dudas para el equipo

| ID | Duda o diferencia detectada | Quién puede resolverla |
|---|---|---|
| D-1 | **Los wireframes no coinciden con el script v0.2.** Muestran productos y precios que no están en la base (Ryzen 5 5600 a $2,899, Ryzen 7 7700X, Core i3-12100F, i7-13700K a $8,799 en lugar de $7,800, placas B550M-A y B450M DS3H, socket AM4, memorias Kingston a $1,150). Según el orden de autoridad, la API usa los datos de la base. Hay que actualizar los wireframes o cargar esos productos en la base. | Daniel y Omar |
| D-2 | El wireframe de Procesadores dice «6 productos», pero la base tiene 5 procesadores (30 productos en total). `total_productos` devuelve 5. | Omar |
| D-3 | El Core i7-13700K (ID 13) tiene `ConsumoW = 125`, que el script marca como `VERIFICAR` (es la potencia base; en turbo llega a 253 W). Con ese valor la regla R3 queda más optimista para ese procesador. | Daniel |
| D-4 | `GET /api/pedidos` no tiene pantalla en los wireframes, y el Plan de Calidad no tiene un RF propio para que el personal consulte pedidos. Se asoció a RF-06 de forma provisional. Falta definir con qué herramienta se consumirá (y cómo guardará la clave) y si necesita una solicitud de cambio. | Andrés y Daniel |
| D-5 | La Pantalla 2 muestra «Frecuencia base / turbo» y «Núcleos / hilos», pero la base solo guarda `Nucleos` (sin hilos ni frecuencias). La API no los devuelve. | Daniel y Omar |
| D-6 | El teléfono solo se valida por longitud (máximo 20): la base no define un formato. | Equipo |
| D-7 | No hay límite de líneas por pedido ni cantidad máxima por línea más allá del límite técnico de `INT` y del stock disponible. | Equipo |
| D-8 | Si `categoria_id` es un entero válido pero la categoría no existe, `GET /api/productos` devuelve lista vacía (no hay un código de error para categorías), mientras que `POST /api/compatibilidad` responde 400. Falta confirmar si se prefiere un criterio único. | Angel y Omar |
| D-9 | `Pedidos.Fecha` no guarda zona horaria (hora local del servidor SQL). La API la devuelve sin zona. | Daniel |
| D-10 | `numero_pedido` se arma con 4 dígitos mínimo; a partir del pedido 10,000 tendría 5 dígitos (`NX-10000`). No se cambia la base (decisión 4). | Equipo |
| D-11 | La conversión de `Valor` a número y de `FormatosSoportados` a lista JSON es una decisión de diseño de esta versión (la columna guarda texto). Hay que confirmar con Omar que su código la acepta. | Omar |
| D-12 | `ImagenUrl` guarda rutas relativas (`img/ryzen5-7600.jpg`). No está definido quién sirve esas imágenes (carpeta estática de Express o carpeta de la página). | Omar y Angel |
| D-13 | La lista de compatibilidad incluye también al producto base si pertenece a la categoría listada (sin regla, `compatible = true`). Falta confirmar si debe excluirse. | Omar |
| D-14 | El Plan de Calidad (RNF-03) habla solo de «usuario y contraseña» en `.env`; ahora hay seis variables. Y el diagrama de flujo de «Primeros artefactos» debe reemplazarse por el de la sección 7. | Andrés |
| D-15 | No está definida la configuración de CORS (si la página y la API se sirven desde orígenes distintos). | Angel y Omar |
