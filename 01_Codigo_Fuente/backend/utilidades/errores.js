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

// 404: el producto no existe.
function productoNoEncontrado(res, idProducto) {
  enviarError(
    res,
    404,
    'PRODUCTO_NO_ENCONTRADO',
    'No existe un producto con el id indicado.',
    { id_producto: idProducto }
  );
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

module.exports = { datosInvalidos, productoNoEncontrado, manejadorErrores };
