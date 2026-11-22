// utilidades/compatibilidad.js
// ---------------------------------------------------------------------
// Reglas de compatibilidad R1 a R4 (sección 6 de la especificación).
// Son funciones puras: no tocan la base de datos ni Express, solo reciben
// productos ya leídos y devuelven un resultado. Así se pueden probar solas.
//
// Un "producto" para estas funciones es un objeto con:
//   { id, categoria, especificaciones }
// donde "categoria" es el nombre (por ejemplo "Procesadores") y
// "especificaciones" es lo que arma construirEspecificaciones() de
// formato.js (socket, consumo_w, potencia_w, formatos_soportados, ...).
// ---------------------------------------------------------------------

// Se usan los NOMBRES de las categorías (Categorias.Nombre es UNIQUE y la
// API ya los devuelve en el campo "categoria"). Los ids son IDENTITY y
// podrían cambiar si se vuelve a cargar el script; los nombres no.
const PROCESADORES = 'Procesadores';
const TARJETAS_MADRE = 'Tarjetas madre';
const MEMORIA_RAM = 'Memoria RAM';
const TARJETAS_VIDEO = 'Tarjetas de video';
const FUENTES = 'Fuentes de poder';
const GABINETES = 'Gabinetes';

// ---------------------------------------------------------------------
// Lectura de especificaciones obligatorias
// ---------------------------------------------------------------------
// Si a un producto le falta una clave que la regla necesita (o su valor no
// sirve), NO se adivina: se lanza un error. La ruta lo manda con next(error)
// y el manejador responde 500 ERROR_INTERNO; el texto de abajo solo se ve
// en la consola del servidor (sección 5.6 y decisión F).

function exigirTexto(producto, propiedad) {
  const valor = producto.especificaciones[propiedad];
  if (typeof valor !== 'string' || valor === '') {
    throw new Error(`El producto ${producto.id} no tiene la especificación de texto "${propiedad}".`);
  }
  return valor;
}

// Se pide un entero porque R3 compara con enteros (potencia x 10 >= suma x 13).
// "construirEspecificaciones" deja como texto un valor que no es número,
// por eso aquí se revisa el tipo.
function exigirEntero(producto, propiedad) {
  const valor = producto.especificaciones[propiedad];
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
    throw new Error(`El producto ${producto.id} no tiene la especificación numérica entera "${propiedad}".`);
  }
  return valor;
}

function exigirLista(producto, propiedad) {
  const valor = producto.especificaciones[propiedad];
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new Error(`El producto ${producto.id} no tiene la lista "${propiedad}".`);
  }
  return valor;
}

// ---------------------------------------------------------------------
// ¿Qué regla toca para esta pareja de categorías? (en cualquier orden)
// ---------------------------------------------------------------------
function esPareja(categoriaA, categoriaB, uno, otro) {
  return (categoriaA === uno && categoriaB === otro) || (categoriaA === otro && categoriaB === uno);
}

// Devuelve "R1" a "R4", o null si la pareja no tiene regla.
function buscarRegla(categoriaBase, categoriaListada) {
  if (esPareja(categoriaBase, categoriaListada, PROCESADORES, TARJETAS_MADRE)) return 'R1';
  if (esPareja(categoriaBase, categoriaListada, MEMORIA_RAM, TARJETAS_MADRE)) return 'R2';
  if (esPareja(categoriaBase, categoriaListada, FUENTES, PROCESADORES)) return 'R3';
  if (esPareja(categoriaBase, categoriaListada, FUENTES, TARJETAS_VIDEO)) return 'R3';
  if (esPareja(categoriaBase, categoriaListada, GABINETES, TARJETAS_MADRE)) return 'R4';
  return null;
}

// Cada evaluarRx devuelve { compatible, motivo }; el motivo es null si es compatible.
const COMPATIBLE = { compatible: true, motivo: null };

// R1: Procesadores <-> Tarjetas madre: mismo Socket.
// Motivo: "Socket <del candidato>; <la pieza base> usa <socket del base>".
function evaluarR1(base, candidato) {
  const socketBase = exigirTexto(base, 'socket');
  const socketCandidato = exigirTexto(candidato, 'socket');
  if (socketBase === socketCandidato) return COMPATIBLE;

  const piezaBase = base.categoria === PROCESADORES ? 'el procesador' : 'la tarjeta madre';
  return {
    compatible: false,
    motivo: `Socket ${socketCandidato}; ${piezaBase} usa ${socketBase}`
  };
}

// R2: Memoria RAM <-> Tarjetas madre: mismo TipoRAM.
function evaluarR2(base, candidato) {
  const tipoBase = exigirTexto(base, 'tipo_ram');
  const tipoCandidato = exigirTexto(candidato, 'tipo_ram');
  if (tipoBase === tipoCandidato) return COMPATIBLE;

  // Base tarjeta madre: "Memoria DDR4; la tarjeta madre usa DDR5"
  // Base memoria RAM:   "Tarjeta madre DDR5; la memoria RAM usa DDR4"
  const motivo = base.categoria === TARJETAS_MADRE
    ? `Memoria ${tipoCandidato}; la tarjeta madre usa ${tipoBase}`
    : `Tarjeta madre ${tipoCandidato}; la memoria RAM usa ${tipoBase}`;
  return { compatible: false, motivo };
}

// R3: Fuente de poder con Procesadores o Tarjetas de video.
//   potencia requerida = (suma de ConsumoW de los procesadores y tarjetas de
//   video considerados) x 1.3
// Considerados = el base + el carrito + el candidato (solo si lo que se lista
// son procesadores o tarjetas de video). Cada id cuenta una vez, y solo suman
// Procesadores y Tarjetas de video.
function esConsumidor(producto) {
  return producto.categoria === PROCESADORES || producto.categoria === TARJETAS_VIDEO;
}

function evaluarR3(base, candidato, carrito) {
  // La fuente evaluada es el base (si es fuente) o el candidato (si se listan fuentes).
  const fuente = base.categoria === FUENTES ? base : candidato;
  const potenciaFuente = exigirEntero(fuente, 'potencia_w');

  // Un Map por id: si el mismo producto aparece dos veces (base repetido en el
  // carrito, candidato que ya está en el carrito...) solo se cuenta una vez.
  const considerados = new Map();
  for (const producto of [base, ...carrito, candidato]) {
    if (esConsumidor(producto)) considerados.set(producto.id, producto);
  }

  let suma = 0;
  for (const producto of considerados.values()) {
    suma += exigirEntero(producto, 'consumo_w');
  }

  // Comparación con ENTEROS para evitar errores de decimales (570 x 1.3 en
  // decimales no es exactamente 741):  potencia x 10 >= suma x 13.
  if (potenciaFuente * 10 >= suma * 13) return COMPATIBLE;

  // Potencia requerida redondeada hacia arriba a vatios enteros,
  // también con enteros: techo(suma x 13 / 10).
  const requeridaW = Math.floor((suma * 13 + 9) / 10);
  return {
    compatible: false,
    motivo: `Requiere ${requeridaW} W; la fuente ofrece ${potenciaFuente} W`
  };
}

// R4: Gabinetes <-> Tarjetas madre: el FormatoPlaca de la placa debe estar en
// FormatosSoportados del gabinete (coincidencia exacta de texto).
// El motivo usa la misma frase sin importar cuál sea el base (decisión A).
function evaluarR4(base, candidato) {
  const placa = base.categoria === TARJETAS_MADRE ? base : candidato;
  const gabinete = base.categoria === GABINETES ? base : candidato;

  const formatoPlaca = exigirTexto(placa, 'formato_placa');
  const formatosSoportados = exigirLista(gabinete, 'formatos_soportados');
  if (formatosSoportados.includes(formatoPlaca)) return COMPATIBLE;

  return {
    compatible: false,
    motivo: `La placa es ${formatoPlaca}; el gabinete soporta ${formatosSoportados.join(', ')}`
  };
}

// ---------------------------------------------------------------------
// Evaluar UN candidato contra el base (y el carrito, que solo interviene en R3).
// Devuelve { compatible, regla, motivo }.
// "carrito" es la lista de productos de ids_carrito (puede estar vacía).
// ---------------------------------------------------------------------
function evaluarCompatibilidad(base, candidato, carrito) {
  const regla = buscarRegla(base.categoria, candidato.categoria);

  if (regla === null) {
    return { compatible: true, regla: null, motivo: null };
  }

  let resultado;
  if (regla === 'R1') resultado = evaluarR1(base, candidato);
  else if (regla === 'R2') resultado = evaluarR2(base, candidato);
  else if (regla === 'R3') resultado = evaluarR3(base, candidato, carrito);
  else resultado = evaluarR4(base, candidato);

  return { compatible: resultado.compatible, regla, motivo: resultado.motivo };
}

// Primero los compatibles y luego los incompatibles; dentro de cada grupo,
// por id_producto ascendente. Recibe objetos ya con "compatible" e "id_producto".
function ordenarResultados(lista) {
  return [...lista].sort((a, b) => {
    if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
    return a.id_producto - b.id_producto;
  });
}

module.exports = {
  buscarRegla,
  evaluarCompatibilidad,
  ordenarResultados
};
