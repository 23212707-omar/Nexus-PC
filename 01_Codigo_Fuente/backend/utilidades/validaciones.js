// utilidades/validaciones.js
// ---------------------------------------------------------------------
// 1) Validación de identificadores que llegan en la URL o en el query.
//    La especificación (sección 5) dice: "solo dígitos, hasta 2147483647
//    (el máximo de INT)". Todo lo demás ("abc", "-1", "1.5", "") es
//    DATOS_INVALIDOS (400).
// 2) Validación del body de POST /api/pedidos (sección 5.4).
// 3) Validación del body de POST /api/compatibilidad (sección 5.6).
// ---------------------------------------------------------------------

const MAXIMO_INT = 2147483647;

// Longitudes de las columnas de Pedidos (NVARCHAR).
const MAXIMO_NOMBRE = 100;
const MAXIMO_CORREO = 120;
const MAXIMO_TELEFONO = 20;

// POST /api/compatibilidad: máximo de ids DISTINTOS en ids_carrito.
// Cada id viaja como un parámetro de la consulta (sección 8.1) y SQL Server
// solo admite unos 2100 por consulta; con este tope nunca nos acercamos.
const MAXIMO_IDS_CARRITO = 100;

// Devuelve true si el texto recibido es un entero válido.
function esEnteroValido(valor) {
  // Debe ser texto y contener solo dígitos del 0 al 9.
  if (typeof valor !== 'string' || !/^[0-9]+$/.test(valor)) {
    return false;
  }
  // Y no pasar del máximo que acepta la columna INT de SQL Server.
  return Number(valor) <= MAXIMO_INT;
}

// ---------------------------------------------------------------------
// Body de POST /api/pedidos
// ---------------------------------------------------------------------

// Formato del correo. Es lo mismo que la restricción CK_Pedidos_Correo de la
// base (LIKE '%_@_%._%'), pero además prohíbe espacios y un segundo @:
//   - algo (sin @ ni espacios) + @ + algo + punto + algo.
// Así la API rechaza con 400 lo que la base rechazaría con un error de
// restricción, y esa restricción nunca llega al usuario como 500.
const FORMATO_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// true si el valor es un objeto JSON normal ({}), no una lista ni null.
function esObjeto(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

// En el body los números vienen como número JSON (no como texto "5").
// Se acepta solo un entero de 1 a 2147483647 (límite de INT).
function esEnteroPositivoInt(valor) {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= MAXIMO_INT;
}

// Valida TODO el body y junta todos los problemas (no se detiene en el
// primero). Devuelve:
//   { errores: [ { campo, mensaje }, ... ], pedido: null }   si algo falla
//   { errores: [], pedido: { nombreComprador, correo, telefono, items } }
// donde "items" ya viene con las líneas repetidas sumadas y ordenadas por
// idProducto (así siempre se bloquean las filas en el mismo orden y dos
// compras simultáneas no se traban entre sí).
// Cualquier campo de precio que llegue (precio, total, etc.) ni se mira.
function validarPedido(body) {
  const errores = [];

  if (!esObjeto(body)) {
    return {
      errores: [{
        campo: 'body',
        mensaje: 'El cuerpo debe ser un objeto JSON (con Content-Type: application/json).'
      }],
      pedido: null
    };
  }

  // --- nombre_comprador: obligatorio, sin espacios en los extremos, 1 a 100 ---
  const nombreComprador = typeof body.nombre_comprador === 'string' ? body.nombre_comprador.trim() : '';
  if (nombreComprador.length < 1 || nombreComprador.length > MAXIMO_NOMBRE) {
    errores.push({
      campo: 'nombre_comprador',
      mensaje: `El nombre es obligatorio y tiene máximo ${MAXIMO_NOMBRE} caracteres.`
    });
  }

  // --- correo: obligatorio, máximo 120, un solo @, sin espacios, con dominio y punto ---
  const correo = typeof body.correo === 'string' ? body.correo.trim() : '';
  if (correo === '') {
    errores.push({ campo: 'correo', mensaje: 'El correo es obligatorio.' });
  } else if (correo.length > MAXIMO_CORREO) {
    errores.push({ campo: 'correo', mensaje: `El correo tiene máximo ${MAXIMO_CORREO} caracteres.` });
  } else if (!FORMATO_CORREO.test(correo)) {
    errores.push({
      campo: 'correo',
      mensaje: 'El correo no puede tener espacios, debe tener un solo @ y un dominio con punto.'
    });
  }

  // --- telefono: opcional. Si falta, es null o viene vacío, se guarda NULL ---
  let telefono = null;
  if (body.telefono !== undefined && body.telefono !== null) {
    if (typeof body.telefono !== 'string') {
      errores.push({ campo: 'telefono', mensaje: 'El teléfono debe ser texto.' });
    } else {
      const textoTelefono = body.telefono.trim();
      if (textoTelefono.length > MAXIMO_TELEFONO) {
        errores.push({
          campo: 'telefono',
          mensaje: `El teléfono tiene máximo ${MAXIMO_TELEFONO} caracteres.`
        });
      } else if (textoTelefono !== '') {
        telefono = textoTelefono;
      }
    }
  }

  // --- items: lista no vacía; cada línea con id_producto y cantidad enteros ---
  // "sumas" agrupa las líneas repetidas: id_producto -> cantidad total.
  const sumas = new Map();
  const items = body.items;

  if (items === undefined || items === null || (Array.isArray(items) && items.length === 0)) {
    errores.push({ campo: 'items', mensaje: 'Debe incluir al menos un producto.' });
  } else if (!Array.isArray(items)) {
    errores.push({ campo: 'items', mensaje: 'Debe ser una lista de productos.' });
  } else {
    items.forEach((item, i) => {
      if (!esObjeto(item)) {
        errores.push({
          campo: `items[${i}]`,
          mensaje: 'Cada producto debe ser un objeto con id_producto y cantidad.'
        });
        return;
      }

      const idValido = esEnteroPositivoInt(item.id_producto);
      const cantidadValida = esEnteroPositivoInt(item.cantidad);

      if (!idValido) {
        errores.push({
          campo: `items[${i}].id_producto`,
          mensaje: `El id_producto debe ser un número entero mayor o igual a 1 y máximo ${MAXIMO_INT}.`
        });
      }
      if (!cantidadValida) {
        errores.push({
          campo: `items[${i}].cantidad`,
          mensaje: `La cantidad debe ser un número entero mayor o igual a 1 y máximo ${MAXIMO_INT}.`
        });
      }
      if (!idValido || !cantidadValida) return;

      // Línea repetida del mismo producto: se suman las cantidades, y la
      // suma también debe caber en un INT.
      const suma = (sumas.get(item.id_producto) || 0) + item.cantidad;
      if (suma > MAXIMO_INT) {
        errores.push({
          campo: `items[${i}].cantidad`,
          mensaje: `La cantidad total del producto ${item.id_producto} no puede pasar de ${MAXIMO_INT}.`
        });
      } else {
        sumas.set(item.id_producto, suma);
      }
    });
  }

  if (errores.length > 0) {
    return { errores, pedido: null };
  }

  // Una sola línea por producto, de menor a mayor id_producto.
  const lineas = [...sumas.entries()]
    .map(([idProducto, cantidad]) => ({ idProducto, cantidad }))
    .sort((a, b) => a.idProducto - b.idProducto);

  return {
    errores: [],
    pedido: { nombreComprador, correo, telefono, items: lineas }
  };
}

// ---------------------------------------------------------------------
// Body de POST /api/compatibilidad (sección 5.6)
// ---------------------------------------------------------------------

const MENSAJE_ID = `Es obligatorio y debe ser un número entero de 1 a ${MAXIMO_INT}.`;

// Valida TODO el body y junta todos los problemas (igual que validarPedido).
// Devuelve:
//   { errores: [ { campo, mensaje }, ... ], datos: null }   si algo falla
//   { errores: [], datos: { idProductoBase, categoriaId, idsCarrito } }
// donde "idsCarrito" no tiene repetidos (se conserva el orden en que llegaron;
// puede incluir el id del base, que la ruta cuenta una sola vez).
// Aquí solo se revisa el FORMATO; si los ids existen se revisa en la ruta.
function validarCompatibilidad(body) {
  const errores = [];

  if (!esObjeto(body)) {
    return {
      errores: [{
        campo: 'body',
        mensaje: 'El cuerpo debe ser un objeto JSON (con Content-Type: application/json).'
      }],
      datos: null
    };
  }

  // --- id_producto_base y categoria_id: enteros de 1 a 2147483647 ---
  // (en el body los números deben ser número JSON, no texto "5")
  if (!esEnteroPositivoInt(body.id_producto_base)) {
    errores.push({ campo: 'id_producto_base', mensaje: MENSAJE_ID });
  }
  if (!esEnteroPositivoInt(body.categoria_id)) {
    errores.push({ campo: 'categoria_id', mensaje: MENSAJE_ID });
  }

  // --- ids_carrito: obligatorio; lista de enteros (puede ser []) ---
  // "unicos" quita repetidos y conserva el orden de llegada.
  const unicos = new Set();
  const carrito = body.ids_carrito;

  if (carrito === undefined || carrito === null) {
    errores.push({
      campo: 'ids_carrito',
      mensaje: 'Es obligatorio y debe ser una lista de números enteros (puede ser vacía).'
    });
  } else if (!Array.isArray(carrito)) {
    errores.push({ campo: 'ids_carrito', mensaje: 'Debe ser una lista de números enteros.' });
  } else {
    carrito.forEach((id, i) => {
      if (esEnteroPositivoInt(id)) {
        unicos.add(id);
      } else {
        errores.push({
          campo: `ids_carrito[${i}]`,
          mensaje: `Debe ser un número entero de 1 a ${MAXIMO_INT}.`
        });
      }
    });

    if (unicos.size > MAXIMO_IDS_CARRITO) {
      errores.push({
        campo: 'ids_carrito',
        mensaje: `Puede tener como máximo ${MAXIMO_IDS_CARRITO} productos distintos.`
      });
    }
  }

  if (errores.length > 0) {
    return { errores, datos: null };
  }

  return {
    errores: [],
    datos: {
      idProductoBase: body.id_producto_base,
      categoriaId: body.categoria_id,
      idsCarrito: [...unicos]
    }
  };
}

module.exports = {
  MAXIMO_INT,
  MAXIMO_IDS_CARRITO,
  esEnteroValido,
  validarPedido,
  validarCompatibilidad
};