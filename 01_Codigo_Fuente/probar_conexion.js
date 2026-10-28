// Nexus PC - Prueba de conexion Node.js con SQL Server
// Uso: npm install mssql dotenv   y despues   node probar_conexion.js
// Lee los datos del archivo .env (que NO se sube al repositorio).
require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'NexusPC',
  connectionTimeout: 10000,
  options: {
    encrypt: true,
    // true solo en desarrollo local (certificado propio de SQL Server)
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  }
};

// Opcional: conectar por nombre de instancia (requiere SQL Server Browser)
if (process.env.DB_INSTANCE) {
  config.options.instanceName = process.env.DB_INSTANCE;
  delete config.port;
}

async function main() {
  let pool;
  try {
    pool = await sql.connect(config);
    const quien = await pool.request().query('SELECT SUSER_SNAME() AS usuario, DB_NAME() AS base');
    console.log('Conectado como:', quien.recordset[0].usuario, '| Base:', quien.recordset[0].base);
    const total = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.Productos');
    console.log('Conexion correcta. Productos en la base:', total.recordset[0].total);
  } catch (err) {
    console.error('No se pudo conectar:', err.code, '-', err.message);
    process.exitCode = 1;
  } finally {
    if (pool) await pool.close();
  }
}

main();
