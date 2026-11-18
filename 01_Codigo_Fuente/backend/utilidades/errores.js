// utilidades/errores.js
// ---------------------------------------------------------------------
// Todos los errores de la API tienen la MISMA forma (sección 4 de la
// especificación):
//   { "error": { "codigo": "...", "mensaje": "...", "detalles": ... } }
// "detalles" solo aparece cuando aplica.
// ---------------------------------------------------------------------

// Mensaje genérico del error 500: nunca debe revelar nada de la base de datos.
const MENSAJE_ERROR_INTERNO = 'Ocurrió un problema en el servidor. Intenta de nuevo más tarde.';

// Función base: arma y envía el error con su código HTTP.
function enviarError(res, estadoHttp, codigo, mensaje, detalles) {
  const error = { codigo, mensaje };
  if (detalles !== undefined) {
    error.detalles = detalles;
  }
  res.status(estadoHttp).json({ error });
}

// 400: el dato recibido tiene formato incorrecto.
function datosInvalidos(res, mensaje, detalles) {
  enviarError(res, 400, 'DATOS_INVALIDOS', mensaje, detalles);
}

// Frase que se agrega a los errores 404 y 409 de POST /api/pedidos, porque
// ahí la transacción se cancela y no queda nada guardado (sección 5.4).
const MENSAJE_SIN_CAMBIOS = 'No se guardó ningún cambio.';

// 404: el producto no existe.
// "sufijo" es opcional: GET /api/productos/:id no lo usa y su mensaje no cambia;
// POST /api/pedidos pasa MENSAJE_SIN_CAMBIOS.
function productoNoEncontrado(res, idProducto, sufijo) {
  const mensaje = 'No existe un producto con el id indicado.' + (sufijo ? ' ' + sufijo : '');
  enviarError(res, 404, 'PRODUCTO_NO_ENCONTRADO', mensaje, { id_producto: idProducto });
}

// 409: una línea del pedido pide más piezas de las que hay.
// Recibe { idProducto, nombre, disponible, solicitado }.
function stockInsuficiente(res, { idProducto, nombre, disponible, solicitado }) {
  enviarError(
    res,
    409,
    'STOCK_INSUFICIENTE',
    `No hay suficientes piezas de ${nombre}. Disponibles: ${disponible}; solicitadas: ${solicitado}. ${MENSAJE_SIN_CAMBIOS}`,
    { id_producto: idProducto, nombre, disponible, solicitado }
  );
}

// 400: el body de la petición no se pudo leer (JSON mal formado o demasiado grande).
// Va justo DESPUÉS de express.json() en servidor.js. Sin esto, Express
// respondería con un HTML o un 500 en lugar del formato único de error.
// Los demás errores se dejan pasar con next(error) hasta manejadorErrores.
function manejadorJsonInvalido(error, req, res, next) {
  if (error && error.type === 'entity.parse.failed') {
    return datosInvalidos(res, 'El cuerpo de la petición no es un JSON válido.', [
      { campo: 'body', mensaje: 'El JSON está mal formado.' }
    ]);
  }
  if (error && error.type === 'entity.too.large') {
    return datosInvalidos(res, 'El cuerpo de la petición es demasiado grande.', [
      { campo: 'body', mensaje: 'El JSON es demasiado grande (máximo 100 kb).' }
    ]);
  }
  next(error);
}

// 500: cualquier falla inesperada (base de datos caída, error de programación, etc.).
// Express manda aquí todo error que se pasa con next(error).
// El detalle técnico se imprime SOLO en la consola del servidor; a quien
// consulta la API se le responde un mensaje genérico.
function manejadorErrores(error, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, error);

  if (res.headersSent) {
    return next(error);
  }
  enviarError(res, 500, 'ERROR_INTERNO', MENSAJE_ERROR_INTERNO);
}

module.exports = {
  MENSAJE_SIN_CAMBIOS,
  datosInvalidos,
  productoNoEncontrado,
  stockInsuficiente,
  manejadorJsonInvalido,
  manejadorErrores
};
