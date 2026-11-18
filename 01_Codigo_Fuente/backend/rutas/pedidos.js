// rutas/pedidos.js
// ---------------------------------------------------------------------
// POST /api/pedidos
// Registra un pedido, descuenta el stock y devuelve el pedido guardado.
// Pantalla 5 del sistema: confirmación de compra.
// Flujo completo: sección 5.4 y sección 7 de la especificación.
//
// Idea central: todo ocurre en UNA transacción. Si cualquier línea falla
// (producto inexistente, stock insuficiente o un error inesperado) se hace
// rollback y la base queda exactamente como estaba.
// ---------------------------------------------------------------------

const express = require('express');
const { sql, obtenerPool } = require('../db/conexion');
const { validarPedido } = require('../utilidades/validaciones');
const {
  MENSAJE_SIN_CAMBIOS,
  datosInvalidos,
  productoNoEncontrado,
  stockInsuficiente
} = require('../utilidades/errores');
const { numeroPedido } = require('../utilidades/formato');

const router = express.Router();

// Cancela la transacción SIN lanzar un segundo error. Si la transacción ya
// se cerró (SQL Server la canceló solo, por ejemplo por un deadlock, o ya
// se había hecho commit), mssql lanza un error al pedir otro rollback;
// aquí solo se avisa en consola para no tapar el error original.
async function revertir(transaccion) {
  try {
    await transaccion.rollback();
  } catch (errorRollback) {
    console.error('[AVISO] No se pudo hacer rollback (¿la transacción ya estaba cerrada?):', errorRollback.message);
  }
}

router.post('/', async (req, res, next) => {
  // Solo se llena cuando la transacción ya empezó y todavía está abierta.
  // Así el catch final sabe si hay algo que cancelar.
  let transaccion = null;

  try {
    // 1) Validar TODO antes de abrir la transacción (no se toca la base).
    //    Ya devuelve las líneas repetidas sumadas y ordenadas por id_producto.
    const { errores, pedido } = validarPedido(req.body);
    if (errores.length > 0) {
      return datosInvalidos(res, 'Los datos enviados no son válidos.', errores);
    }

    // 2) Abrir la transacción.
    const pool = await obtenerPool();
    const nueva = new sql.Transaction(pool);
    await nueva.begin();
    transaccion = nueva;

    // 3) Descuento atómico, línea por línea (en orden de id_producto).
    //    Una sola instrucción resta el stock SOLO si alcanza y devuelve el
    //    nombre y el precio vigentes. Como es una operación indivisible, dos
    //    compras simultáneas no pueden llevarse la última pieza.
    //    Los importes se calculan en centavos (enteros) para evitar errores
    //    de redondeo con decimales.
    const lineas = [];
    let totalCentavos = 0;

    for (const linea of pedido.items) {
      const descuento = new sql.Request(transaccion);
      descuento.input('idProducto', sql.Int, linea.idProducto);
      descuento.input('cantidad', sql.Int, linea.cantidad);
      const resultadoDescuento = await descuento.query(`
        UPDATE dbo.Productos
        SET Stock = Stock - @cantidad
        OUTPUT INSERTED.Nombre, INSERTED.Precio
        WHERE IdProducto = @idProducto AND Stock >= @cantidad
      `);

      const filas = resultadoDescuento.recordset || [];

      if (filas.length === 0) {
        // No se descontó nada: ¿el producto no existe o no alcanza el stock?
        // Se consulta DENTRO de la misma transacción.
        const consulta = new sql.Request(transaccion);
        consulta.input('idProducto', sql.Int, linea.idProducto);
        const producto = await consulta.query(`
          SELECT Nombre, Stock
          FROM dbo.Productos
          WHERE IdProducto = @idProducto
        `);

        // Se cancela todo lo descontado en las líneas anteriores.
        await revertir(transaccion);
        transaccion = null;

        if (producto.recordset.length === 0) {
          return productoNoEncontrado(res, linea.idProducto, MENSAJE_SIN_CAMBIOS);
        }
        return stockInsuficiente(res, {
          idProducto: linea.idProducto,
          nombre: producto.recordset[0].Nombre,
          disponible: producto.recordset[0].Stock,
          solicitado: linea.cantidad
        });
      }

      // El precio sale SIEMPRE de la base, nunca del navegador.
      const precioCentavos = Math.round(filas[0].Precio * 100);
      const subtotalCentavos = linea.cantidad * precioCentavos;
      totalCentavos += subtotalCentavos;

      lineas.push({
        idProducto: linea.idProducto,
        nombre: filas[0].Nombre,
        cantidad: linea.cantidad,
        precioCentavos,
        subtotalCentavos
      });
    }

    // 4) Todas las líneas se descontaron: guardar el encabezado del pedido.
    //    No se manda Fecha: la base pone la hora con su valor por defecto.
    //    La fecha se pide ya convertida a texto ISO ("2026-10-19T10:15:30")
    //    para no depender de la zona horaria del servidor Node.
    const encabezado = new sql.Request(transaccion);
    encabezado.input('nombreComprador', sql.NVarChar(100), pedido.nombreComprador);
    encabezado.input('correo', sql.NVarChar(120), pedido.correo);
    encabezado.input('telefono', sql.NVarChar(20), pedido.telefono); // null -> NULL
    encabezado.input('total', sql.Decimal(12, 2), totalCentavos / 100);
    const resultadoEncabezado = await encabezado.query(`
      INSERT INTO dbo.Pedidos (NombreComprador, Correo, Telefono, Total)
      OUTPUT INSERTED.IdPedido, CONVERT(VARCHAR(19), INSERTED.Fecha, 126) AS Fecha
      VALUES (@nombreComprador, @correo, @telefono, @total)
    `);
    const { IdPedido: idPedido, Fecha: fecha } = resultadoEncabezado.recordset[0];

    // 5) Guardar cada línea con el precio de la base como PrecioUnitario.
    for (const linea of lineas) {
      const detalle = new sql.Request(transaccion);
      detalle.input('idPedido', sql.Int, idPedido);
      detalle.input('idProducto', sql.Int, linea.idProducto);
      detalle.input('cantidad', sql.Int, linea.cantidad);
      detalle.input('precioUnitario', sql.Decimal(10, 2), linea.precioCentavos / 100);
      await detalle.query(`
        INSERT INTO dbo.DetallePedido (IdPedido, IdProducto, Cantidad, PrecioUnitario)
        VALUES (@idPedido, @idProducto, @cantidad, @precioUnitario)
      `);
    }

    // 6) Confirmar. Desde aquí el pedido ya quedó guardado.
    await transaccion.commit();
    transaccion = null;

    // 7) Responder 201 con el pedido completo (importes como números).
    res.status(201).json({
      id_pedido: idPedido,
      numero_pedido: numeroPedido(idPedido),
      fecha,
      nombre_comprador: pedido.nombreComprador,
      correo: pedido.correo,
      telefono: pedido.telefono,
      items: lineas.map((linea) => ({
        id_producto: linea.idProducto,
        nombre: linea.nombre,
        cantidad: linea.cantidad,
        precio_unitario: linea.precioCentavos / 100,
        subtotal: linea.subtotalCentavos / 100
      })),
      total: totalCentavos / 100
    });
  } catch (error) {
    // Falla inesperada: se cancela todo y el manejador de errores responde
    // 500 con un mensaje genérico (el detalle técnico queda solo en la consola).
    if (transaccion) {
      await revertir(transaccion);
    }
    next(error);
  }
});

module.exports = router;
