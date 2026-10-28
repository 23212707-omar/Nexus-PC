// db/probarConexion.js
// ---------------------------------------------------------------------
// Se ejecuta con:  npm run probar-conexion
// Se conecta a SQL Server, cuenta los productos y muestra el resultado.
// Debe mostrar 30 productos. Sirve como evidencia de que la API puede
// hablar con la base de datos.
// ---------------------------------------------------------------------

const { obtenerPool, cerrarPool, leerConfiguracion } = require('./conexion');

const PRODUCTOS_ESPERADOS = 30;

// Da una pista según el tipo de error (el detalle completo se imprime aparte).
function sugerencia(error) {
  switch (error.code) {
    case 'ELOGIN':
      return 'Revisa DB_USER y DB_PASSWORD, que la autenticación mixta esté activa y que el usuario tenga acceso a la base NexusPC.';
    case 'ESOCKET':
    case 'ETIMEOUT':
      return 'No se alcanzó SQL Server: revisa que el servicio esté iniciado, que TCP/IP esté habilitado (y reiniciado) y que el puerto o la instancia sean correctos.';
    case 'EINSTLOOKUP':
      return 'No se encontró la instancia: inicia el servicio "SQL Server Browser" o usa DB_PORT con el puerto fijo.';
    default:
      return 'Revisa la sección "Errores comunes" del README.';
  }
}

async function main() {
  console.log('=== Nexus PC: prueba de conexión a SQL Server ===');

  try {
    // Mostrar a dónde nos vamos a conectar (sin mostrar la contraseña).
    const config = leerConfiguracion();
    const destino = config.port
      ? `${config.server}:${config.port}`
      : config.options.instanceName
        ? `${config.server}\\${config.options.instanceName}`
        : `${config.server} (puerto 1433)`;
    console.log(`Servidor : ${destino}`);
    console.log(`Base     : ${config.database}`);
    console.log(`Usuario  : ${config.user}`);
    console.log('Conectando...');

    const pool = await obtenerPool();
    console.log('[OK] Conexión establecida.');

    const resultado = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.Productos');
    const total = resultado.recordset[0].total;
    console.log(`Productos en la base de datos: ${total}`);

    if (total === PRODUCTOS_ESPERADOS) {
      console.log(`[OK] Coincide con lo esperado (${PRODUCTOS_ESPERADOS}).`);
    } else {
      console.log(`[AVISO] Se esperaban ${PRODUCTOS_ESPERADOS} productos. Vuelve a ejecutar NexusPC.sql completo.`);
    }
  } catch (error) {
    console.error('[ERROR] No se pudo conectar o consultar la base de datos.');
    console.error('Detalle técnico:', error.message);
    console.error('Sugerencia:', sugerencia(error));
    process.exitCode = 1; // marca que hubo un fallo
  } finally {
    await cerrarPool().catch(() => {});
  }
}

main();
