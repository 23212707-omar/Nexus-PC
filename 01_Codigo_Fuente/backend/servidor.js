// servidor.js
// ---------------------------------------------------------------------
// Punto de entrada de la API de Nexus PC. Aquí se:
//   1) lee el .env,
//   2) crea el servidor Express,
//   3) conecta las 3 rutas,
//   4) sirve la página (carpeta ../frontend) desde la MISMA dirección,
//   5) arranca y prueba la conexión con SQL Server.
// Se ejecuta con:  npm start
// ---------------------------------------------------------------------

require('dotenv').config({ quiet: true }); // lo primero: leer el .env

const fs = require('fs');
const path = require('path');
const express = require('express');

const { obtenerPool } = require('./db/conexion');
const rutaCategorias = require('./rutas/categorias');
const rutaProductos = require('./rutas/productos');
const rutaProductoPorId = require('./rutas/productoPorId');
const { manejadorErrores } = require('./utilidades/errores');

const app = express();
const PUERTO = process.env.PORT || 3000;

app.disable('x-powered-by'); // no avisar a cualquiera que usamos Express
app.set('json spaces', 2);   // JSON con sangría: se lee bien en el navegador

// ----- Rutas de la API -----
app.use('/api/categorias', rutaCategorias);   // GET /api/categorias
app.use('/api/productos', rutaProductos);     // GET /api/productos
app.use('/api/productos', rutaProductoPorId); // GET /api/productos/:id

// ----- La página (HTML, CSS, JS e imágenes) -----
// Como la página y la API salen del mismo servidor y del mismo puerto,
// el navegador no bloquea nada y no hace falta configurar CORS.
// Las imágenes de la subcarpeta img se sirven solas: /img/ryzen5-7600.jpg
const carpetaFrontend = path.join(__dirname, '..', 'frontend');
app.use(express.static(carpetaFrontend));

// ----- Errores inesperados (siempre al final) -----
app.use(manejadorErrores);

// ----- Arrancar -----
app.listen(PUERTO, (error) => {
  // En Express 5, si el puerto está ocupado el error llega aquí.
  if (error) {
    console.error(`[ERROR] No se pudo iniciar en el puerto ${PUERTO}: ${error.message}`);
    console.error('Cierra el programa que lo usa o cambia PORT en el archivo .env.');
    process.exit(1);
  }

  console.log(`[OK] Servidor corriendo en http://localhost:${PUERTO}`);

  if (fs.existsSync(carpetaFrontend)) {
    console.log(`[OK] Página servida desde ${carpetaFrontend}`);
  } else {
    console.log('[AVISO] No existe la carpeta ../frontend todavía; la API funciona igual.');
  }

  // Probar la conexión a SQL Server al arrancar.
  // Si falla, el servidor sigue encendido y reintenta en la siguiente petición.
  obtenerPool()
    .then(() => {
      console.log(`[OK] Conectado a SQL Server (base ${process.env.DB_NAME})`);
    })
    .catch((errorConexion) => {
      console.error('[ERROR] No se pudo conectar a SQL Server:', errorConexion.message);
      console.error('Revisa tu .env y la sección "Errores comunes" del README.');
    });
});
