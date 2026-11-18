/* carrito.js – El carrito en memoria. Guarda una lista de productos y la copia en localStorage. */

const Carrito = (function () {
  const CLAVE = 'nexuspc_carrito';   // Nombre con el que se guarda en el navegador
  let lista = [];                    // [{ id_producto, nombre, marca, imagen_url, precio, stock, cantidad }, ...]

  // Deja solo los campos que se usan. "marca" e "imagen_url" son opcionales (null si no vienen).
  function limpiarLinea(p) {
    return {
      id_producto: p.id_producto,
      nombre: p.nombre,
      marca: typeof p.marca === 'string' ? p.marca : null,
      imagen_url: typeof p.imagen_url === 'string' ? p.imagen_url : null,
      precio: p.precio,
      stock: p.stock,
      cantidad: p.cantidad
    };
  }

  // Al abrir la página, intenta recuperar el carrito guardado. Si falla, empieza vacío.
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (Array.isArray(guardado)) {
      lista = guardado.filter(p => p && Number.isInteger(p.id_producto) && typeof p.nombre === 'string' &&
        Number.isFinite(p.precio) && Number.isInteger(p.stock) &&
        Number.isInteger(p.cantidad) && p.cantidad >= 1 && p.cantidad <= p.stock).map(limpiarLinea);
    }
  } catch (error) { /* sin localStorage: el carrito sigue funcionando en memoria */ }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch (error) { /* se queda en memoria */ }
  }

  return {
    // Agrega 1 unidad. Devuelve { ok: true } o, si ya no hay piezas, { ok: false, stock: N }.
    // Usa el stock y el precio que trae el producto (son los más recientes) y actualiza la línea.
    agregar(producto) {
      let linea = lista.find(p => p.id_producto === producto.id_producto);
      const enCarrito = linea ? linea.cantidad : 0;
      if (producto.stock < 1 || enCarrito + 1 > producto.stock) return { ok: false, stock: producto.stock };
      if (!linea) {
        linea = { id_producto: producto.id_producto, cantidad: 0 };
        lista.push(linea);
      }
      linea.nombre = producto.nombre;
      linea.marca = typeof producto.marca === 'string' ? producto.marca : null;
      linea.imagen_url = typeof producto.imagen_url === 'string' ? producto.imagen_url : null;
      linea.precio = producto.precio;
      linea.stock = producto.stock;
      linea.cantidad += 1;
      guardar();
      return { ok: true };
    },

    // Pone una cantidad exacta (de 1 hasta el stock). Devuelve { ok: true } o
    // { ok: false, motivo: 'no_existe' | 'minimo' | 'stock', stock? }
    cambiarCantidad(idProducto, cantidad) {
      const linea = lista.find(p => p.id_producto === idProducto);
      if (!linea) return { ok: false, motivo: 'no_existe' };
      if (!Number.isInteger(cantidad) || cantidad < 1) return { ok: false, motivo: 'minimo' };
      if (cantidad > linea.stock) return { ok: false, motivo: 'stock', stock: linea.stock };
      linea.cantidad = cantidad;
      guardar();
      return { ok: true };
    },

    // Quita un producto completo. Devuelve true si estaba en el carrito.
    quitar(idProducto) {
      const antes = lista.length;
      lista = lista.filter(p => p.id_producto !== idProducto);
      guardar();
      return lista.length < antes;
    },

    // Deja el carrito vacío
    vaciar() {
      lista = [];
      guardar();
    },

    obtener() { return lista.map(p => ({ ...p })); },                          // copia de la lista
    totalArticulos() { return lista.reduce((suma, p) => suma + p.cantidad, 0); },   // unidades
    totalPrecio() { return lista.reduce((suma, p) => suma + p.precio * p.cantidad, 0); }
  };
})();