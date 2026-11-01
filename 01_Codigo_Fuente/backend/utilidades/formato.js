// utilidades/formato.js
// ---------------------------------------------------------------------
// Convierte lo que devuelve la base de datos (columnas en PascalCase como
// "IdProducto") al formato JSON de la API (snake_case como "id_producto").
// ---------------------------------------------------------------------

// Estado de disponibilidad, calculado por la API a partir del stock:
//   Stock = 0       -> "Agotado"
//   Stock de 1 a 3  -> "Pocas piezas"
//   Stock mayor a 3 -> "Disponible"
function calcularEstado(stock) {
  if (stock <= 0) return 'Agotado'; // (el stock nunca es negativo; <= es solo precaución)
  if (stock <= 3) return 'Pocas piezas';
  return 'Disponible';
}

// Campos que comparten el listado y el detalle de un producto.
function formatearProducto(fila) {
  return {
    id_producto: fila.IdProducto,
    nombre: fila.Nombre,
    marca: fila.Marca,
    precio: fila.Precio,
    stock: fila.Stock,
    estado: calcularEstado(fila.Stock),
    categoria: fila.Categoria,
    imagen_url: fila.ImagenUrl // puede ser null
  };
}

// Tabla 3.1 de la especificación: cómo se llama cada clave de la base
// (columna "Clave") en el JSON, y de qué tipo es su valor.
// El orden de esta lista es el orden en que salen en la respuesta.
const ESPECIFICACIONES = [
  { clave: 'Socket',             propiedad: 'socket',               tipo: 'texto'  },
  { clave: 'ConsumoW',           propiedad: 'consumo_w',            tipo: 'numero' },
  { clave: 'Nucleos',            propiedad: 'nucleos',              tipo: 'numero' },
  { clave: 'TipoRAM',            propiedad: 'tipo_ram',             tipo: 'texto'  },
  { clave: 'FormatoPlaca',       propiedad: 'formato_placa',        tipo: 'texto'  },
  { clave: 'CapacidadGB',        propiedad: 'capacidad_gb',         tipo: 'numero' },
  { clave: 'VelocidadMHz',       propiedad: 'velocidad_mhz',        tipo: 'numero' },
  { clave: 'Tipo',               propiedad: 'tipo',                 tipo: 'texto'  },
  { clave: 'MemoriaGB',          propiedad: 'memoria_gb',           tipo: 'numero' },
  { clave: 'FuenteRecomendadaW', propiedad: 'fuente_recomendada_w', tipo: 'numero' },
  { clave: 'PotenciaW',          propiedad: 'potencia_w',           tipo: 'numero' },
  { clave: 'FormatosSoportados', propiedad: 'formatos_soportados',  tipo: 'lista'  }
];

// Recibe las filas { Clave, Valor } de un producto y arma el objeto
// "especificaciones". Un producto sin filas devuelve {}.
function construirEspecificaciones(filas) {
  // Primero guardamos "clave -> valor" para buscar fácilmente.
  const valores = new Map();
  for (const fila of filas) {
    valores.set(fila.Clave, fila.Valor);
  }

  const resultado = {};
  for (const especificacion of ESPECIFICACIONES) {
    if (!valores.has(especificacion.clave)) continue; // este producto no tiene esa clave

    const texto = valores.get(especificacion.clave); // en la base todo es texto

    if (especificacion.tipo === 'numero') {
      // "65" -> 65 (si por error no fuera un número, se deja como texto)
      const numero = Number(texto);
      resultado[especificacion.propiedad] = Number.isNaN(numero) ? texto : numero;
    } else if (especificacion.tipo === 'lista') {
      // "ATX,mATX,Mini-ITX" -> ["ATX", "mATX", "Mini-ITX"]
      resultado[especificacion.propiedad] = texto
        .split(',')
        .map((parte) => parte.trim())
        .filter((parte) => parte !== '');
    } else {
      resultado[especificacion.propiedad] = texto;
    }
  }
  // Las claves que no estén en la tabla 3.1 se ignoran (no se inventan nombres).
  return resultado;
}

module.exports = { calcularEstado, formatearProducto, construirEspecificaciones };
