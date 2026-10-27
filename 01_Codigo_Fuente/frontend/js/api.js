/* api.js – Aquí viven las llamadas a los datos. La pantalla (app.js) no sabe de dónde vienen. */

// true  = lee el archivo js/datos-ejemplo.json (mientras Angel termina la API)
// false = pide los datos a la API real (GET /api/categorias y GET /api/productos)
const USAR_DATOS_EJEMPLO = true;

const ARCHIVO_EJEMPLO = 'js/datos-ejemplo.json';

// Pide una dirección y devuelve el JSON. Si algo falla, lanza un error con un mensaje claro.
async function pedirJSON(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    // La API devuelve errores con la forma { error: { codigo, mensaje } }
    let mensaje = 'Error ' + respuesta.status;
    try { mensaje = (await respuesta.json()).error.mensaje; } catch (e) { /* se queda el texto simple */ }
    throw new Error(mensaje);
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
