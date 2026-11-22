// rutas/compatibilidad.js
// ---------------------------------------------------------------------
// POST /api/compatibilidad
// Lista los productos de una categoría indicando si son compatibles con un
// producto base y con el carrito. Es solo informativo: la API nunca bloquea
// agregar ni comprar productos incompatibles (decisión 10).
// Pantalla 6 del sistema: compatibilidad (se abre desde la Pantalla 3).
// Reglas R1 a R4: sección 6 de la especificación (ver utilidades/compatibilidad.js).
//
// Para ser rápida (M-06: 3 segundos o menos) hace pocas consultas, sin
// importar cuántos productos haya: una para la categoría y sus candidatos, y
// otra para el producto base y el carrito. No hay una consulta por producto.
// ---------------------------------------------------------------------

const express = require('express');
const { sql, obtenerPool } = require('../db/conexion');
const { validarCompatibilidad } = require('../utilidades/validaciones');
const { datosInvalidos, productoNoEncontrado } = require('../utilidades/errores');
const { formatearProducto, construirEspecificaciones } = require('../utilidades/formato');
const { evaluarCompatibilidad, ordenarResultados } = require('../utilidades/compatibilidad');

const router = express.Router();

// Agrupa las filas { IdProducto, Clave, Valor } por producto: id -> [filas].
function agruparEspecificaciones(filas) {
  const porProducto = new Map();
  for (const fila of filas) {
    if (!porProducto.has(fila.IdProducto)) porProducto.set(fila.IdProducto, []);
    porProducto.get(fila.IdProducto).push(fila);
  }
  return porProducto;
}

// Junta la fila del producto con sus especificaciones ya convertidas.
// Es el "producto" que reciben las reglas (id, categoria, especificaciones);
// "fila" se guarda para armar después el formato de la respuesta.
function armarProducto(fila, especificacionesPorProducto) {
  return {
    id: fila.IdProducto,
    categoria: fila.Categoria,
    especificaciones: construirEspecificaciones(especificacionesPorProducto.get(fila.IdProducto) || []),
    fila
  };
}

router.post('/', async (req, res, next) => {
  try {
    // 1) Validar el FORMATO de todo el body antes de tocar la base de datos.
    //    Los problemas salen juntos en "detalles" (400 DATOS_INVALIDOS).
    const { errores, datos } = validarCompatibilidad(req.body);
    if (errores.length > 0) {
      return datosInvalidos(res, 'Los datos enviados no son válidos.', errores);
    }

    const pool = await obtenerPool();

    // 2) Consulta 1: ¿existe la categoría? y los productos de esa categoría
    //    (los "candidatos") con sus especificaciones. Son tres SELECT en un solo
    //    viaje a la base. Consulta PARAMETRIZADA: el valor va aparte.
    const consultaCategoria = pool.request();
    consultaCategoria.input('categoriaId', sql.Int, datos.categoriaId);
    const lote = await consultaCategoria.query(`
      SELECT IdCategoria
      FROM dbo.Categorias
      WHERE IdCategoria = @categoriaId;

      SELECT p.IdProducto,
             p.Nombre,
             p.Marca,
             p.Precio,
             p.Stock,
             c.Nombre AS Categoria,
             p.ImagenUrl
      FROM dbo.Productos AS p
      INNER JOIN dbo.Categorias AS c ON c.IdCategoria = p.IdCategoria
      WHERE p.IdCategoria = @categoriaId;

      SELECT e.IdProducto, e.Clave, e.Valor
      FROM dbo.EspecificacionesProducto AS e
      INNER JOIN dbo.Productos AS p ON p.IdProducto = e.IdProducto
      WHERE p.IdCategoria = @categoriaId;
    `);
    const [categorias, filasCandidatos, filasEspecificacionesCandidatos] = lote.recordsets;

    // Una categoría que no existe es 400 (no 404): así lo define la sección 5.6.
    // Se revisa ANTES que los productos (decisión D).
    if (categorias.length === 0) {
      return datosInvalidos(res, 'Los datos enviados no son válidos.', [
        { campo: 'categoria_id', mensaje: 'La categoría no existe.' }
      ]);
    }

    // 3) Consulta 2: el producto base y los del carrito, con sus especificaciones.
    //    Un id repetido (por ejemplo el base dentro del carrito) cuenta una sola vez.
    //    Hay un parámetro POR CADA id (@id0, @id1...). El texto de la consulta se
    //    arma solo con el número de ids, nunca con sus valores (sección 8.1).
    const idsConsulta = [...new Set([datos.idProductoBase, ...datos.idsCarrito])];
    const marcadores = idsConsulta.map((_, i) => `@id${i}`).join(', ');

    const consultaProductos = pool.request();
    idsConsulta.forEach((id, i) => consultaProductos.input(`id${i}`, sql.Int, id));
    const loteProductos = await consultaProductos.query(`
      SELECT p.IdProducto,
             p.Nombre,
             p.Marca,
             p.Precio,
             p.Stock,
             c.Nombre AS Categoria,
             p.ImagenUrl
      FROM dbo.Productos AS p
      INNER JOIN dbo.Categorias AS c ON c.IdCategoria = p.IdCategoria
      WHERE p.IdProducto IN (${marcadores});

      SELECT IdProducto, Clave, Valor
      FROM dbo.EspecificacionesProducto
      WHERE IdProducto IN (${marcadores});
    `);
    const [filasBaseYCarrito, filasEspecificacionesBaseYCarrito] = loteProductos.recordsets;

    const especificacionesBaseYCarrito = agruparEspecificaciones(filasEspecificacionesBaseYCarrito);
    const encontrados = new Map();
    for (const fila of filasBaseYCarrito) {
      encontrados.set(fila.IdProducto, armarProducto(fila, especificacionesBaseYCarrito));
    }

    // Si falta alguno: 404 con el PRIMERO que falte (primero el base, luego el
    // carrito en el orden en que llegó).
    for (const id of idsConsulta) {
      if (!encontrados.has(id)) {
        return productoNoEncontrado(res, id);
      }
    }

    const base = encontrados.get(datos.idProductoBase);
    const carrito = datos.idsCarrito.map((id) => encontrados.get(id));

    // 4) Evaluar cada candidato. Si a algún producto le falta una clave que la
    //    regla necesita, evaluarCompatibilidad lanza un error: cae en el catch
    //    y responde 500 (el detalle queda solo en la consola).
    const especificacionesCandidatos = agruparEspecificaciones(filasEspecificacionesCandidatos);
    const resultados = filasCandidatos.map((fila) => {
      const candidato = armarProducto(fila, especificacionesCandidatos);
      const { compatible, regla, motivo } = evaluarCompatibilidad(base, candidato, carrito);
      return { ...formatearProducto(fila), compatible, regla, motivo };
    });

    // 5) Primero los compatibles; dentro de cada grupo, por id_producto.
    res.json({
      id_producto_base: datos.idProductoBase,
      categoria_id: datos.categoriaId,
      productos: ordenarResultados(resultados)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
