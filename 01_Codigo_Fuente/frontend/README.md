# Frontend (página web)

HTML, CSS y JavaScript del catálogo, el detalle de producto, el carrito y la vista rápida del carrito.
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
| 4. Vista rápida del carrito | Panel bajo el botón "Carrito" del encabezado | Lista |
| 3. Carrito completo | `#/carrito` | Pendiente (UI4) |
| 5. Confirmación de compra | Por definir | Pendiente (UI5) |

Las direcciones con `#` permiten usar el botón "atrás" del navegador y abrir un producto directo.

## Valor de `USAR_DATOS_EJEMPLO` (en `js/api.js`)

| Valor | Para qué sirve |
|---|---|
| `false` | **Es el valor que debe quedar al subir el código.** Pide todo a la API real. |
| `true` | Solo para trabajar el catálogo sin la API. El detalle **no** muestra descripción ni especificaciones, porque el archivo de ejemplo no las trae. |

El detalle de producto necesita la API real (`GET /api/productos/:id`).

## Estructura

```
frontend/
├── index.html            Estructura de la página: encabezado, catálogo y detalle
├── css/
│   └── estilos.css       Estilos (azul marino y gris; responsivo desde 360 px)
└── js/
    ├── api.js            Llamadas a la API (o al archivo de ejemplo)
    ├── carrito.js        Objeto Carrito: lista en memoria, copia en localStorage
    ├── detalle.js        Pantalla de detalle de producto
    ├── app.js            Menú, tarjetas, vista rápida, contador y cambio de pantalla
    └── datos-ejemplo.json  Datos de muestra (solo catálogo)
```

Los scripts se cargan en este orden: `api.js`, `carrito.js`, `detalle.js`, `app.js`.

## Datos de la API que usa

- `GET /api/categorias`
- `GET /api/productos?categoria_id=N`
- `GET /api/productos/:id` (detalle: incluye `descripcion`, que puede ser `null`, y `especificaciones`)

Los errores de la API llegan con la forma `{ error: { codigo, mensaje } }`. `api.js` los convierte en un
error de JavaScript que también trae `estado` (número HTTP) y `codigo`.

## El carrito

- Se guarda en `localStorage` con la clave `nexuspc_carrito`.
- Al abrir la página se validan los datos guardados; lo que no cumpla (cantidad mayor al stock, por ejemplo) se descarta.
- Sin `localStorage` sigue funcionando, pero solo en memoria.

## Reglas del código

- Comentarios sencillos en español y funciones cortas.
- Los datos que vienen del servidor se escriben con `textContent` o con elementos creados desde JavaScript, nunca con `innerHTML`.
- Los precios se muestran en pesos mexicanos sin decimales (`$4,500`).
- Foco visible, botones con texto claro y `aria-live` en los mensajes.