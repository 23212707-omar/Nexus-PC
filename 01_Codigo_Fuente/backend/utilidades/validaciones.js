// utilidades/validaciones.js
// ---------------------------------------------------------------------
// Validación de identificadores. La especificación (sección 5) dice:
// "solo dígitos, hasta 2147483647 (el máximo de INT)". Todo lo demás
// ("abc", "-1", "1.5", "") es DATOS_INVALIDOS (400).
// ---------------------------------------------------------------------

const MAXIMO_INT = 2147483647;

// Devuelve true si el texto recibido es un entero válido.
function esEnteroValido(valor) {
  // Debe ser texto y contener solo dígitos del 0 al 9.
  if (typeof valor !== 'string' || !/^[0-9]+$/.test(valor)) {
    return false;
  }
  // Y no pasar del máximo que acepta la columna INT de SQL Server.
  return Number(valor) <= MAXIMO_INT;
}

module.exports = { esEnteroValido };
