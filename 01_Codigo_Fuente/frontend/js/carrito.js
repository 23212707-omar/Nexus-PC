/* carrito.js – El carrito en memoria. Guarda una lista de productos y la copia en localStorage. */

const Carrito = (function () {
  const CLAVE = 'nexuspc_carrito';   // Nombre con el que se guarda en el navegador
  let lista = [];                    // [{ id_producto, nombre, precio, stock, cantidad }, ...]

  // Al abrir la página, intenta recuperar el carrito guardado. Si falla, empieza vacío.
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (Array.isArray(guardado)) {
      lista = guardado.filter(p => p && Number.isInteger(p.id_producto) && typeof p.nombre === 'string' &&
        Number.isFinite(p.precio) && Number.isInteger(p.stock) &&
        Number.isInteger(p.cantidad) && p.cantidad >= 1 && p.cantidad <= p.stock);
    }
  } catch (error) { /* sin localStorage: el carrito sigue funcionando en memoria */ }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch (error) { /* se queda en memoria */ }
  }

  return {
    // Agrega 1 unidad. Devuelve { ok: true } o, si ya no hay piezas, { ok: false, stock: N }
    agregar(producto) {
      let linea = lista.find(p => p.id_producto === producto.id_producto);
      if (!linea) {
        linea = { id_producto: producto.id_producto, nombre: producto.nombre,
                  precio: producto.precio, stock: producto.stock, cantidad: 0 };
        if (producto.stock < 1) return { ok: false, stock: producto.stock };
        lista.push(linea);
      }
      if (linea.cantidad + 1 > linea.stock) return { ok: false, stock: linea.stock };
      linea.cantidad += 1;
      guardar();
      return { ok: true };
    },
    obtener() { return lista.map(p => ({ ...p })); },                          // copia de la lista
    totalArticulos() { return lista.reduce((suma, p) => suma + p.cantidad, 0); },   // unidades
    totalPrecio() { return lista.reduce((suma, p) => suma + p.precio * p.cantidad, 0); }
  };
})();
