// db/conexion.js
// ---------------------------------------------------------------------
// Aquí se crea la conexión a SQL Server. Se hace UNA sola vez y se
// reutiliza en todas las rutas (a eso se le llama "pool de conexiones").
// Así no abrimos y cerramos una conexión nueva en cada petición.
// ---------------------------------------------------------------------

// Lee el archivo .env y deja sus valores en process.env
// ("quiet" evita que dotenv imprima un mensaje cada vez que arranca).
require('dotenv').config({ quiet: true });

const sql = require('mssql');

// Aquí se guarda la conexión una vez creada.
let poolPromise = null;

// Arma la configuración usando SOLO datos del .env (nada de contraseñas en el código).
function leerConfiguracion() {
  // 1) Revisar que no falte ninguna variable obligatoria.
  const obligatorias = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_NAME'];
  const faltan = obligatorias.filter((nombre) => !process.env[nombre]);
  if (faltan.length > 0) {
    throw new Error(
      'Faltan variables en el archivo .env: ' + faltan.join(', ') +
      '. Copia .env.example como .env y escribe tus datos.'
    );
  }

  // 2) Separar servidor e instancia. Se aceptan las dos formas:
  //    DB_SERVER=localhost  +  DB_INSTANCE=SQLEXPRESS
  //    DB_SERVER=localhost\SQLEXPRESS
  let servidor = process.env.DB_SERVER.trim();
  let instancia = (process.env.DB_INSTANCE || '').trim();
  const partes = servidor.split('\\');
  if (partes.length === 2) {
    servidor = partes[0];
    if (!instancia) instancia = partes[1];
  }

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: servidor,
    database: process.env.DB_NAME,

    options: {
      // encrypt: la comunicación con SQL Server viaja cifrada.
      encrypt: true,

      // trustServerCertificate: SQL Server en tu PC crea un certificado
      // "autofirmado" (lo hizo él mismo, no una entidad oficial). Sin esta
      // opción Node lo rechaza con el error "self-signed certificate".
      // Es correcto para desarrollo local; en un servidor real se usaría
      // un certificado válido y esto se pondría en false.
      trustServerCertificate: true
    },

    // Pool: como máximo 10 conexiones abiertas al mismo tiempo; las que no
    // se usan durante 30 segundos se cierran.
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  };

  // 3) Cómo encontrar SQL Server: por puerto o por nombre de instancia.
  //    (No se pueden usar los dos a la vez, así que el puerto manda.)
  const puerto = (process.env.DB_PORT || '').trim();
  if (puerto) {
    config.port = Number(puerto);
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      throw new Error('DB_PORT debe ser un número de puerto válido (por ejemplo 1433).');
    }
  } else if (instancia) {
    // La instancia con nombre se localiza con el servicio "SQL Server Browser".
    config.options.instanceName = instancia;
  }
  // Si no hay puerto ni instancia, mssql usa el puerto 1433 por defecto.

  return config;
}

// Devuelve la conexión (pool). La primera vez la crea; las siguientes
// veces devuelve la misma. Si la conexión falla, se borra para poder
// reintentar en la siguiente petición sin reiniciar el servidor.
async function obtenerPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(leerConfiguracion());

    // Si SQL Server se cae más tarde, avisamos en consola en vez de cerrar el programa.
    pool.on('error', (error) => {
      console.error('[ERROR] Problema en la conexión a la base de datos:', error.message);
    });

    poolPromise = pool.connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

// Cierra la conexión (la usa el script probar-conexion al terminar).
async function cerrarPool() {
  if (poolPromise) {
    const pool = await poolPromise;
    poolPromise = null;
    await pool.close();
  }
}

// "sql" se exporta para que las rutas usen los tipos de datos (sql.Int, etc.).
module.exports = { sql, obtenerPool, cerrarPool, leerConfiguracion };
