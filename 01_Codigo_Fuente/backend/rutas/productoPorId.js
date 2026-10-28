// rutas/productoPorId.js
// ---------------------------------------------------------------------
// GET /api/productos/:id
// Devuelve UN producto con su descripción, estado de disponibilidad y
// el objeto "especificaciones".
// Pantalla 2 del sistema: detalle de producto.
// ---------------------------------------------------------------------

const express = require('express');
const { sql, obtenerPool } = require('../db/conexion');
const { esEnteroValido } = require('../utilidades/validaciones');
const { datosInvalidos, productoNoEncontrado } = require('../utilidades/errores');
const { formatearProducto, construirEspecificaciones } = require('../utilidades/formato');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    // 1) Validar el id: solo dígitos y que quepa en un INT.
    //    "abc" -> 400. Un número válido que no existe (999) -> 404 más abajo.
    const id = req.params.id;
    if (!esEnteroValido(id)) {
      return datosInvalidos(res, 'El id del producto debe ser un número entero.', [
        { campo: 'id', mensaje: 'Debe ser un número entero.' }
      ]);
    }
    const idProducto = Number(id);

    const pool = await obtenerPool();

    // 2) Buscar el producto (consulta parametrizada).
    const consultaProducto = pool.request();
    consultaProducto.input('idProducto', sql.Int, idProducto);
    const productos = await consultaProducto.query(`
      SELECT p.IdProducto,
             p.Nombre,
             p.Marca,
             p.Descripcion,
             p.Precio,
             p.Stock,
             c.Nombre AS Categoria,
             p.ImagenUrl
      FROM dbo.Productos AS p
      INNER JOIN dbo.Categorias AS c ON c.IdCategoria = p.IdCategoria
      WHERE p.IdProducto = @idProducto
    `);

    // Si no hay filas, ese producto no existe -> 404.
    if (productos.recordset.length === 0) {
      return productoNoEncontrado(res, idProducto);
    }
    const fila = productos.recordset[0];

    // 3) Buscar sus especificaciones (una fila por cada clave: Socket, ConsumoW, ...).
    const consultaEspecificaciones = pool.request();
    consultaEspecificaciones.input('idProducto', sql.Int, idProducto);
    const especificaciones = await consultaEspecificaciones.query(`
      SELECT Clave, Valor
      FROM dbo.EspecificacionesProducto
      WHERE IdProducto = @idProducto
    `);

    // 4) Armar la respuesta: los campos comunes + descripcion + especificaciones.
    res.json({
      ...formatearProducto(fila),
      descripcion: fila.Descripcion, // puede ser null
      especificaciones: construirEspecificaciones(especificaciones.recordset)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
