// rutas/categorias.js
// ---------------------------------------------------------------------
// GET /api/categorias
// Lista las 7 categorías con el número de productos de cada una.
// Pantalla 1 del sistema: menú de categorías ("N productos").
// ---------------------------------------------------------------------

const express = require('express');
const { obtenerPool } = require('../db/conexion');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const pool = await obtenerPool();

    // LEFT JOIN: una categoría sin productos también aparece (con total 0).
    // COUNT cuenta cuántos productos tiene cada categoría.
    const resultado = await pool.request().query(`
      SELECT c.IdCategoria,
             c.Nombre,
             COUNT(p.IdProducto) AS TotalProductos
      FROM dbo.Categorias AS c
      LEFT JOIN dbo.Productos AS p ON p.IdCategoria = c.IdCategoria
      GROUP BY c.IdCategoria, c.Nombre
      ORDER BY c.IdCategoria ASC
    `);

    // Pasamos cada fila al formato de la API (snake_case).
    const categorias = resultado.recordset.map((fila) => ({
      id_categoria: fila.IdCategoria,
      nombre: fila.Nombre,
      total_productos: fila.TotalProductos
    }));

    res.json(categorias);
  } catch (error) {
    next(error); // lo atiende manejadorErrores -> 500 ERROR_INTERNO
  }
});

module.exports = router;
