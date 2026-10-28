// rutas/productos.js
// ---------------------------------------------------------------------
// GET /api/productos
// GET /api/productos?categoria_id=1
// Lista los productos (los 30, o solo los de una categoría).
// Pantalla 1 del sistema: catálogo por categorías.
// ---------------------------------------------------------------------

const express = require('express');
const { sql, obtenerPool } = require('../db/conexion');
const { esEnteroValido } = require('../utilidades/validaciones');
const { datosInvalidos } = require('../utilidades/errores');
const { formatearProducto } = require('../utilidades/formato');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    // 1) Validar el filtro opcional ANTES de tocar la base de datos.
    //    Si no viene, categoriaId queda en null y se devuelven todos.
    let categoriaId = null;
    const categoria_id = req.query.categoria_id;

    if (categoria_id !== undefined) {
      if (!esEnteroValido(categoria_id)) {
        return datosInvalidos(res, 'El parámetro categoria_id debe ser un número entero.', [
          { campo: 'categoria_id', mensaje: 'Debe ser un número entero.' }
        ]);
      }
      categoriaId = Number(categoria_id);
    }

    // 2) Consulta PARAMETRIZADA: el valor nunca se pega dentro del texto SQL,
    //    se envía aparte con request.input. Así nadie puede "inyectar" SQL.
    //    "@categoriaId IS NULL OR ..." significa: si no hay filtro, trae todos.
    const pool = await obtenerPool();
    const request = pool.request();
    request.input('categoriaId', sql.Int, categoriaId);

    const resultado = await request.query(`
      SELECT p.IdProducto,
             p.Nombre,
             p.Marca,
             p.Precio,
             p.Stock,
             c.Nombre AS Categoria,
             p.ImagenUrl
      FROM dbo.Productos AS p
      INNER JOIN dbo.Categorias AS c ON c.IdCategoria = p.IdCategoria
      WHERE @categoriaId IS NULL OR p.IdCategoria = @categoriaId
      ORDER BY p.IdProducto ASC
    `);

    // 3) Convertir cada fila al formato de la API (incluye el campo "estado").
    //    Si la categoría no existe, la lista queda vacía: [] (duda D-8).
    res.json(resultado.recordset.map((fila) => formatearProducto(fila)));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
