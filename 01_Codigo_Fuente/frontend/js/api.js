/* api.js – Aquí viven las llamadas a los datos. La pantalla (app.js) no sabe de dónde vienen. */

// true  = lee el archivo js/datos-ejemplo.json (solo catálogo; el detalle NO trae descripción ni especificaciones)
// false = pide los datos a la API real (GET /api/categorias, /api/productos y /api/productos/:id)
// Al subir el código debe quedar en false: el detalle de producto necesita la API real.
const USAR_DATOS_EJEMPLO = false;

const ARCHIVO_EJEMPLO = 'js/datos-ejemplo.json';

// Pide una dirección y devuelve el JSON. Si algo falla, lanza un error con un mensaje claro.
// El error lleva también "estado" (número HTTP, ej. 404) y "codigo" (ej. PRODUCTO_NO_ENCONTRADO).
async function pedirJSON(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    // La API devuelve errores con la forma { error: { codigo, mensaje } }
    let mensaje = 'Error ' + respuesta.status;
    let codigo = null;
    try {
      const cuerpo = await respuesta.json();
      mensaje = cuerpo.error.mensaje;
      codigo = cuerpo.error.codigo;
    } catch (e) { /* se queda el texto simple */ }
    const error = new Error(mensaje);
    error.estado = respuesta.status;
    error.codigo = codigo;
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