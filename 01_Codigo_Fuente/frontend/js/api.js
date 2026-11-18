/* api.js – Aquí viven las llamadas a los datos. La pantalla (app.js) no sabe de dónde vienen. */

// true  = lee el archivo js/datos-ejemplo.json (solo catálogo; el detalle NO trae descripción ni especificaciones)
// false = pide los datos a la API real (GET /api/categorias, /api/productos y /api/productos/:id)
// Al subir el código debe quedar en false: el detalle de producto necesita la API real.
const USAR_DATOS_EJEMPLO = false;

const ARCHIVO_EJEMPLO = 'js/datos-ejemplo.json';

// true  = POST /api/pedidos no se llama: se devuelven respuestas de ejemplo (para probar las pantallas)
// false = el pedido se manda a la API real. Al subir el código debe quedar en false.
// Cómo provocar cada caso simulado: ver "Pedido simulado" en frontend/README.md
const SIMULAR_PEDIDO = false;

// Pide una dirección y devuelve el JSON. Si algo falla, lanza un error con un mensaje claro.
// "opciones" es opcional (método, encabezados y cuerpo, igual que en fetch).
// El error lleva también "estado" (número HTTP, ej. 404), "codigo" (ej. PRODUCTO_NO_ENCONTRADO) y
// "detalles" (en un 400 es una lista de { campo, mensaje }; en un 404 o 409 es un objeto; si no hay, null).
// Si no hay respuesta del servidor (red caída, API apagada), el error NO trae "estado".
async function pedirJSON(url, opciones) {
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch (e) {
    throw new Error('No se pudo conectar con el servidor.');   // sin "estado": así se distingue de un 500
  }
  if (!respuesta.ok) {
    // La API devuelve errores con la forma { error: { codigo, mensaje, detalles } }
    let mensaje = 'Error ' + respuesta.status;
    let codigo = null;
    let detalles = null;
    try {
      const cuerpo = await respuesta.json();
      mensaje = cuerpo.error.mensaje;
      codigo = cuerpo.error.codigo;
      detalles = cuerpo.error.detalles === undefined ? null : cuerpo.error.detalles;
    } catch (e) { /* se queda el texto simple */ }
    const error = new Error(mensaje);
    error.estado = respuesta.status;
    error.codigo = codigo;
    error.detalles = detalles;
    throw error;
  }
  return respuesta.json();
}

// Devuelve la lista de categorías: [{ id_categoria, nombre, total_productos }, ...]
async function obtenerCategorias() {
  if (USAR_DATOS_EJEMPLO) {
    return (await pedirJSON(ARCHIVO_EJEMPLO)).categorias;
  }
  return pedirJSON('/api/categorias');
}

// Devuelve los productos de una categoría:
// [{ id_producto, nombre, marca, precio, stock, estado, categoria, imagen_url }, ...]
async function obtenerProductos(idCategoria) {
  if (USAR_DATOS_EJEMPLO) {
    const datos = await pedirJSON(ARCHIVO_EJEMPLO);
    // En el archivo de ejemplo hay que filtrar a mano (la API real lo hace con categoria_id)
    const categoria = datos.categorias.find(c => c.id_categoria === idCategoria);
    return datos.productos.filter(p => categoria && p.categoria === categoria.nombre);
  }
  return pedirJSON('/api/productos?categoria_id=' + encodeURIComponent(idCategoria));
}

// Devuelve un producto con sus datos completos:
// { id_producto, nombre, marca, precio, stock, estado, categoria, imagen_url,
//   descripcion (puede ser null), especificaciones: { socket: 'AM5', consumo_w: 120, ... } }
// Si no existe, lanza un error con estado 404.
async function obtenerProducto(idProducto) {
  if (USAR_DATOS_EJEMPLO) {
    const datos = await pedirJSON(ARCHIVO_EJEMPLO);
    const producto = datos.productos.find(p => p.id_producto === idProducto);
    if (!producto) {
      const error = new Error('No existe un producto con el id indicado.');
      error.estado = 404;
      error.codigo = 'PRODUCTO_NO_ENCONTRADO';
      throw error;
    }
    // El archivo de ejemplo no trae descripción ni especificaciones
    return { ...producto, descripcion: null, especificaciones: {} };
  }
  return pedirJSON('/api/productos/' + encodeURIComponent(idProducto));
}

/* ---------- Pedidos ---------- */

// Registra un pedido. "datos" lleva SOLO: { nombre_comprador, correo, telefono (o null), items: [{ id_producto, cantidad }] }
// Nunca se mandan precios ni totales: la API los lee de la base.
// Si sale bien devuelve el pedido guardado (numero_pedido, items con subtotal, total...).
// Si falla, lanza el error de pedirJSON (400, 404, 409, 500) o uno sin "estado" si no hubo respuesta.
async function crearPedido(datos) {
  if (SIMULAR_PEDIDO) return simularPedido(datos);
  return pedirJSON('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
}

/* ---------- Pedido simulado (solo si SIMULAR_PEDIDO es true) ---------- */
let pedidosSimulados = 0;   // Cuenta los pedidos de ejemplo para dar NX-0001, NX-0002...

function esperar(milisegundos) { return new Promise(resolver => setTimeout(resolver, milisegundos)); }

// Arma un error como los que devuelve la API (mismo formato que pedirJSON)
function crearErrorSimulado(estado, codigo, mensaje, detalles) {
  const error = new Error(mensaje);
  error.estado = estado;
  error.codigo = codigo;
  error.detalles = detalles;
  return error;
}

// Responde según el nombre escrito: empieza con "400" -> error 400; empieza con "409" -> error 409;
// cualquier otro nombre -> pedido guardado (201). Las formas son las de la sección 5.4 de la especificación.
async function simularPedido(datos) {
  await esperar(800);   // se nota el "Enviando..." y se puede probar el doble clic
  const nombre = String(datos.nombre_comprador).trim();
  const lineasCarrito = Carrito.obtener();   // solo para dar nombre y precio al pedido de ejemplo
  const buscar = idProducto => lineasCarrito.find(l => l.id_producto === idProducto);

  if (nombre.startsWith('400')) {
    throw crearErrorSimulado(400, 'DATOS_INVALIDOS', 'Los datos enviados no son válidos.', [
      { campo: 'correo', mensaje: 'El correo no puede tener espacios, debe tener un solo @ y un dominio con punto.' },
      { campo: 'telefono', mensaje: 'El teléfono puede tener máximo 20 caracteres.' },
      { campo: 'items', mensaje: 'Debe incluir al menos un producto.' }
    ]);
  }

  if (nombre.startsWith('409')) {
    const primera = datos.items[0];
    const linea = buscar(primera.id_producto);
    const nombreProducto = linea ? linea.nombre : 'el producto';
    const disponible = Math.max(primera.cantidad - 1, 0);   // siempre falta una pieza
    throw crearErrorSimulado(409, 'STOCK_INSUFICIENTE',
      'No hay suficientes piezas de ' + nombreProducto + '. Disponibles: ' + disponible +
      '; solicitadas: ' + primera.cantidad + '. No se guardó ningún cambio.',
      { id_producto: primera.id_producto, nombre: nombreProducto, disponible: disponible, solicitado: primera.cantidad });
  }

  pedidosSimulados += 1;
  const items = datos.items.map(item => {
    const linea = buscar(item.id_producto);
    const precio = linea ? linea.precio : 0;
    return { id_producto: item.id_producto, nombre: linea ? linea.nombre : 'Producto ' + item.id_producto,
             cantidad: item.cantidad, precio_unitario: precio, subtotal: precio * item.cantidad };
  });
  const ahora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);   // hora local, sin zona
  return {
    id_pedido: pedidosSimulados,
    numero_pedido: 'NX-' + String(pedidosSimulados).padStart(4, '0'),
    fecha: ahora.toISOString().slice(0, 19),
    nombre_comprador: nombre,
    correo: datos.correo,
    telefono: datos.telefono === undefined ? null : datos.telefono,
    items: items,
    total: items.reduce((suma, item) => suma + item.subtotal, 0)
  };
}