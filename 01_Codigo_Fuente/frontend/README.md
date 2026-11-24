# Frontend (página web)

HTML, CSS y JavaScript del catálogo, el detalle de producto, el carrito, la vista rápida del carrito, la confirmación de compra y la compatibilidad de componentes.
Responsable principal: Omar.

La página no usa librerías ni frameworks. La sirve el mismo servidor Express de la API, así que comparten
origen y no hay problemas de CORS.

## Cómo verla

1. Encender la API: `npm start` dentro de `01_Codigo_Fuente/backend`.
2. Abrir `http://localhost:3000` en el navegador.

## Pantallas

| Pantalla | Dirección | Estado |
|---|---|---|
| 1. Catálogo por categorías | `#/` (o sin nada después de la dirección) | Lista |
| 2. Detalle de producto | `#/producto/ID`, por ejemplo `#/producto/13` | Lista (UI3) |
| 3. Carrito completo | `#/carrito` | Lista (UI4) |
| 4. Vista rápida del carrito | Panel bajo el botón "Carrito" del encabezado | Lista (solo consulta; su botón "Ver carrito" lleva a `#/carrito`) |
| 5. Confirmación de compra | `#/compra` | Lista (UI5) |
| 6. Compatibilidad (función deseable) | `#/compatibilidad/ID`, por ejemplo `#/compatibilidad/1` | Lista (UI6) |

Las direcciones con `#` permiten usar el botón "atrás" del navegador y abrir una pantalla directo.

En la pantalla del carrito se cambia la cantidad (de 1 hasta el stock), se quita un producto y se vacía el
carrito con una confirmación. La vista rápida no tiene esos controles. Cada línea del carrito tiene el enlace
"Ver compatibles con este", que abre la Pantalla 6 con ese producto como componente elegido.

### Compatibilidad (`#/compatibilidad/ID`)

`ID` es el producto elegido (el que se compara). Las migas son `Carrito › Compatibilidad`. También se puede abrir
directo por la dirección: el producto se pide con `GET /api/productos/:id`.

- **Componente elegido:** imagen, marca, nombre y sus datos clave, tomados de las `especificaciones` que existan
  (por ejemplo "Socket AM5 · 120 W · 8 núcleos"), y el enlace "Volver al carrito".
- **Categorías:** siete botones, con la activa resaltada. La pantalla abre con la primera categoría que tiene regla
  con el producto elegido y la persona puede cambiarla:

| Producto elegido | Categoría con la que abre |
|---|---|
| Procesador, RAM o gabinete | Tarjetas madre |
| Tarjeta madre | Procesadores |
| Tarjeta de video | Fuentes de poder |
| Fuente de poder | Procesadores |
| Almacenamiento (no tiene reglas) | Procesadores |

- **Lista:** al elegir una categoría se llama a `POST /api/compatibilidad` con `id_producto_base`, `categoria_id` e
  `ids_carrito` (los productos del carrito; `[]` si está vacío). Se dibuja en el orden que devuelve la API: primero
  los compatibles (✔), después un separador punteado "No compatibles con [producto]" y los incompatibles (✘) con su
  motivo debajo del nombre. Cada fila lleva "Compatible" o "No compatible" como texto para lectores de pantalla.
  La API incluye al producto elegido si es de la categoría listada (D-13): se filtra y no se pinta.
- **Sin regla:** si no hay regla entre las dos categorías (`regla` es `null`), se muestra un aviso ("No hay una regla
  de compatibilidad entre X y Y") y no se pinta ✔ ni ✘.
- **Agregar:** en los compatibles agrega directo. En los incompatibles el botón es más suave pero activo y abre una
  ventana modal ("Este producto no es compatible", con el motivo) con **Cancelar** y **Agregar de todas formas**: no
  bloquea, la persona decide. La ventana se cierra con Escape y devuelve el foco al botón. Antes de abrirla se
  revisa el stock: si ya no hay piezas, solo se avisa cuántas hay. Usa `Carrito.agregar` y actualiza el contador y la
  vista rápida. En fuentes de poder (regla R3) la lista se vuelve a pedir después de agregar, porque el resultado
  depende del carrito. Los agotados tienen el botón deshabilitado, como en el catálogo.
- **Estados y errores:**

| Situación | Qué se ve |
|---|---|
| Cargando | "Cargando..." |
| Dirección con un id que no es número, o `404` / `400` al pedir el producto | "No encontramos este producto..." y el botón "Volver al carrito" |
| Sin conexión (el error no trae `estado`) | "No hay conexión con el servidor..." con "Reintentar" |
| `500` u otro error de la API | "No se pudo cargar la compatibilidad." con "Reintentar" |
| `404` de la lista por un producto del carrito que ya no existe | "Un producto de tu carrito ya no existe en la tienda..." y "Volver al carrito" |
| Categoría sin productos | "Esta categoría no tiene productos." |

Es una función deseable (RF-08): los bordes punteados naranjas la distinguen de lo esencial.

### Confirmación de compra (`#/compra`)

- Con el carrito vacío no hay formulario: se muestra "Aún no agregaste productos." y el botón "Explorar catálogo".
- El formulario pide nombre y correo (obligatorios) y teléfono (opcional). Se valida en el navegador con las
  mismas reglas de la API (sección 5.4): nombre de 1 a 100 caracteres; correo de hasta 120, sin espacios, con un
  solo `@`, algo antes del `@` y después un dominio con punto; teléfono de hasta 20. Nombre y correo se envían sin
  espacios en los extremos; un teléfono vacío se envía como `null`.
- Solo se mandan `nombre_comprador`, `correo`, `telefono` e `items` (`id_producto` y `cantidad`). Nunca precios ni totales.
- Mientras se envía, el botón dice "Enviando..." y se ignora un segundo clic o Enter.
- Respuestas de la API:

| Respuesta | Qué se ve |
|---|---|
| 201 | Pantalla "¡Pedido registrado!" con el número, las líneas y el total tal como los devolvió la API. **Solo aquí** se vacía el carrito y se actualiza el contador |
| 400 | Cada mensaje de `detalles` junto a su campo; lo de `items` se muestra en un aviso arriba del formulario. Los datos escritos se conservan |
| 409 `STOCK_INSUFICIENTE` | Aviso con el producto, las piezas disponibles y las pedidas; la línea se marca con borde punteado y el botón "Ajustar al stock disponible" baja la cantidad (o quita la línea si el stock es 0). El carrito no se vacía. La API informa solo la primera línea que falla, así que después de ajustar puede salir otro aviso |
| 404 `PRODUCTO_NO_ENCONTRADO` | Aviso claro y enlace "Volver al carrito". El carrito se conserva |
| 500 o sin conexión | Aviso claro (el de "Sin conexión" es distinto al del 500) y botón "Reintentar". El carrito se conserva |

Después de un pedido guardado, o de un aviso de stock (409), el catálogo vuelve a pedir la categoría al regresar a él, para mostrar el stock al día.

Si se recarga la página después de comprar, el carrito ya está vacío y se ve el aviso de carrito vacío (la pantalla de éxito no se guarda).

## Valor de `USAR_DATOS_EJEMPLO` (en `js/api.js`)

| Valor | Para qué sirve |
|---|---|
| `false` | **Es el valor que debe quedar al subir el código.** Pide todo a la API real. |
| `true` | Solo para trabajar el catálogo sin la API. El detalle **no** muestra descripción ni especificaciones, porque el archivo de ejemplo no las trae. La compatibilidad no funciona (necesita la API real). |

El detalle de producto necesita la API real (`GET /api/productos/:id`) y la compatibilidad también (`POST /api/compatibilidad`).

## Valor de `SIMULAR_PEDIDO` (en `js/api.js`)

| Valor | Para qué sirve |
|---|---|
| `false` | **Es el valor que debe quedar al subir el código.** El pedido se manda a `POST /api/pedidos`. |
| `true` | Solo para probar la pantalla de compra sin tocar la base: no se llama a la API, se responde con ejemplos con la forma exacta de la sección 5.4 (tarda unos 0,8 segundos). |

Con `SIMULAR_PEDIDO = true`, lo que responde depende del **nombre del comprador** (el carrito debe tener productos y el formulario debe pasar la validación):

| Nombre que se escribe | Respuesta simulada |
|---|---|
| Empieza con `400` (por ejemplo `400 prueba`) | 400: mensajes en el correo y el teléfono, y un aviso general de `items` |
| Empieza con `409` (por ejemplo `409 prueba`) | 409: al primer producto del carrito le falta 1 pieza (si pides 1, queda en 0) |
| Cualquier otro (por ejemplo `Ana López`) | 201: pedido `NX-0001`, `NX-0002`... con los precios y el total del carrito |

Los errores 404, 500 y de conexión no se simulan: se prueban con la API real (para el 404, un id inexistente guardado en `localStorage`; para la falla de conexión, la API apagada).

## Estructura

```
frontend/
├── index.html            Estructura de la página: encabezado, catálogo, detalle, carrito, confirmación de compra y compatibilidad
├── css/
│   └── estilos.css       Estilos (azul marino y gris; naranja punteado para lo deseable; responsivo desde 360 px)
└── js/
    ├── api.js            Llamadas a la API (o al archivo de ejemplo)
    ├── carrito.js        Objeto Carrito: lista en memoria, copia en localStorage
    ├── detalle.js        Pantalla de detalle de producto
    ├── carrito-vista.js  Pantalla del carrito completo (con el enlace "Ver compatibles con este")
    ├── compra.js         Pantalla de confirmación de compra (formulario, validación y envío del pedido)
    ├── compatibilidad.js Pantalla de compatibilidad (componente elegido, categorías, lista con ✔/✘ y aviso de incompatibles)
    ├── app.js            Menú, tarjetas, vista rápida, contador y cambio de pantalla
    └── datos-ejemplo.json  Datos de muestra (solo catálogo)
```

Los scripts se cargan en este orden: `api.js`, `carrito.js`, `detalle.js`, `carrito-vista.js`, `compra.js`, `compatibilidad.js`, `app.js`.

Todos los scripts comparten el mismo ámbito global. Por eso los nombres nuevos de `compatibilidad.js` empiezan con `compat`: declarar de nuevo una constante o función de otra pantalla rompería la página.

## Datos de la API que usa

- `GET /api/categorias`
- `GET /api/productos?categoria_id=N`
- `GET /api/productos/:id` (detalle: incluye `descripcion`, que puede ser `null`, y `especificaciones`)
- `POST /api/pedidos` (confirmación de compra; devuelve 201 con el pedido guardado)
- `POST /api/compatibilidad` (compatibilidad; recibe `id_producto_base`, `categoria_id` e `ids_carrito` y devuelve `productos` con `compatible`, `regla` y `motivo`)

Los errores de la API llegan con la forma `{ error: { codigo, mensaje, detalles } }`. `api.js` los convierte en un
error de JavaScript que también trae `estado` (número HTTP), `codigo` y `detalles` (en un 400 es una lista de
`{ campo, mensaje }`; en un 404 o 409 es un objeto; si no hay, `null`). Si no hay respuesta del servidor (API
apagada o sin red) el error **no** trae `estado`: así la pantalla distingue "sin conexión" de un 500.
`crearPedido(datos)` manda `POST /api/pedidos` y `obtenerCompatibilidad(idBase, idCategoria, idsCarrito)` manda
`POST /api/compatibilidad`, los dos con `Content-Type: application/json`.

## El carrito

- Se guarda en `localStorage` con la clave `nexuspc_carrito`.
- Al abrir la página se validan los datos guardados; lo que no cumpla (cantidad mayor al stock, por ejemplo) se descarta.
- Sin `localStorage` sigue funcionando, pero solo en memoria.
- Cada línea guarda `id_producto`, `nombre`, `marca`, `imagen_url`, `precio`, `stock` y `cantidad`.
  `marca` e `imagen_url` son opcionales (un carrito guardado antes de UI4 sigue funcionando).
- Métodos del objeto `Carrito`:

| Método | Qué hace |
|---|---|
| `agregar(producto)` | Suma 1 pieza. Usa el stock y el precio del producto recibido y actualiza la línea. Devuelve `{ ok: true }` o `{ ok: false, stock }` |
| `cambiarCantidad(id, cantidad)` | Pone una cantidad exacta, de 1 hasta el stock. Devuelve `{ ok: true }` o `{ ok: false, motivo }` (`no_existe`, `minimo` o `stock`) |
| `quitar(id)` | Quita el producto completo. Devuelve `true` si estaba |
| `actualizarStock(id, stock)` | Guarda el stock real de la línea (por ejemplo el que informó un 409). Si la cantidad era mayor, la baja al stock; si el stock es 0, quita la línea. Devuelve `{ ok: true, cantidad, quitada }` o `{ ok: false }` si el producto no está o el stock no es válido |
| `vaciar()` | Deja el carrito vacío |
| `obtener()`, `totalArticulos()`, `totalPrecio()` | Consultas: copia de la lista, unidades y total |

## Reglas del código

- Comentarios sencillos en español y funciones cortas.
- Los datos que vienen del servidor se escriben con `textContent` o con elementos creados desde JavaScript, nunca con `innerHTML`.
- Los precios se muestran en pesos mexicanos sin decimales (`$4,500`).
- Foco visible, botones con texto claro y `aria-live` en los mensajes.
