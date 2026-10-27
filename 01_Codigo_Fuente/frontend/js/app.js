/* app.js – Lo que se ve en pantalla: menú, tarjetas, contador y mensajes. */

let contadorCarrito = 0;      // Artículos agregados (solo en memoria; el carrito completo es de la Etapa III)
let categoriaActiva = null;   // La categoría que se está mostrando

// Atajos a los elementos del HTML
const menu = document.getElementById('menu-categorias');
const botonMenu = document.getElementById('btn-menu');
const titulo = document.getElementById('titulo-categoria');
const subtitulo = document.getElementById('subtitulo-categoria');
const mensaje = document.getElementById('mensaje');
const lista = document.getElementById('lista-productos');
const contador = document.getElementById('contador-carrito');

// Precios en pesos mexicanos, sin decimales: $4,500
const formatoPesos = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0
});

/* ---------- Mensajes: "Cargando..." y error con botón para reintentar ---------- */
function mostrarCargando() {
  mensaje.className = 'mensaje';
  mensaje.textContent = 'Cargando...';
  mensaje.hidden = false;
}

function mostrarError(alReintentar) {
  mensaje.className = 'mensaje mensaje--error';
  mensaje.textContent = 'No se pudo cargar el catálogo';
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Reintentar';
  boton.addEventListener('click', alReintentar);
  mensaje.appendChild(document.createElement('br'));
  mensaje.appendChild(boton);
  mensaje.hidden = false;
}

function ocultarMensaje() { mensaje.hidden = true; }

/* ---------- Menú de categorías ---------- */
function dibujarMenu(categorias) {
  menu.textContent = '';
  categorias.forEach(categoria => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = categoria.nombre;
    boton.dataset.id = categoria.id_categoria;
    boton.addEventListener('click', () => {
      cerrarMenu();
      seleccionarCategoria(categoria);
    });
    menu.appendChild(boton);
  });
}

// Marca con aria-current (y color azul) solo el botón de la categoría activa
function resaltarCategoria(idCategoria) {
  menu.querySelectorAll('button').forEach(boton => {
    boton.setAttribute('aria-current', String(Number(boton.dataset.id) === idCategoria));
  });
}

function cerrarMenu() {
  menu.classList.remove('menu--abierto');
  botonMenu.setAttribute('aria-expanded', 'false');
}

botonMenu.addEventListener('click', () => {
  const abierto = menu.classList.toggle('menu--abierto');
  botonMenu.setAttribute('aria-expanded', String(abierto));
});
document.addEventListener('keydown', evento => { if (evento.key === 'Escape') cerrarMenu(); });

/* ---------- Tarjeta de producto ---------- */
function crearTarjeta(producto) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta';

  // Recuadro gris con la palabra "imagen". Si la foto existe y carga, la reemplaza.
  const caja = document.createElement('div');
  caja.className = 'imagen';
  caja.innerHTML = '<span aria-hidden="true">imagen</span>';
  if (producto.imagen_url) {
    const foto = new Image();
    foto.alt = producto.nombre;
    foto.onload = () => { caja.textContent = ''; caja.appendChild(foto); };
    foto.src = producto.imagen_url;   // si falla, no pasa nada: queda el recuadro
  }

  const marca = document.createElement('div');
  marca.className = 'marca';
  marca.textContent = producto.marca;

  const nombre = document.createElement('h2');
  nombre.className = 'nombre';
  nombre.textContent = producto.nombre;

  const precio = document.createElement('span');
  precio.className = 'precio';
  precio.textContent = formatoPesos.format(producto.precio);

  // Etiqueta según el campo "estado": Disponible, Pocas piezas o Agotado
  const agotado = producto.estado === 'Agotado';
  const etiqueta = document.createElement('span');
  etiqueta.className = 'etiqueta';
  if (producto.estado === 'Pocas piezas') etiqueta.classList.add('etiqueta--pocas');
  if (agotado) etiqueta.classList.add('etiqueta--agotado');
  etiqueta.textContent = producto.estado;

  const fila = document.createElement('div');
  fila.className = 'fila';
  fila.append(precio, etiqueta);

  // Botón: si está agotado queda deshabilitado
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton-agregar';
  if (agotado) {
    boton.disabled = true;
    boton.textContent = 'Agotado';
  } else {
    boton.textContent = 'Agregar al carrito';
    boton.setAttribute('aria-label', 'Agregar al carrito: ' + producto.nombre);
    boton.addEventListener('click', agregarAlCarrito);
  }

  tarjeta.append(caja, marca, nombre, fila, boton);
  return tarjeta;
}

/* ---------- Carrito: por ahora solo cuenta (sin recargar la página) ---------- */
function agregarAlCarrito() {
  contadorCarrito += 1;
  contador.textContent = contadorCarrito;
  contador.setAttribute('aria-label', contadorCarrito + (contadorCarrito === 1 ? ' artículo' : ' artículos'));
}

/* ---------- Cargar y mostrar una categoría ---------- */
async function seleccionarCategoria(categoria) {
  categoriaActiva = categoria;
  resaltarCategoria(categoria.id_categoria);
  titulo.textContent = categoria.nombre;
  subtitulo.textContent = '';
  lista.textContent = '';
  mostrarCargando();
  try {
    const productos = await obtenerProductos(categoria.id_categoria);
    if (categoriaActiva !== categoria) return;   // la persona ya eligió otra categoría
    ocultarMensaje();
    subtitulo.textContent = productos.length + (productos.length === 1 ? ' producto' : ' productos');
    productos.forEach(producto => lista.appendChild(crearTarjeta(producto)));
  } catch (error) {
    if (categoriaActiva !== categoria) return;
    mostrarError(() => seleccionarCategoria(categoria));
  }
}

/* ---------- Inicio: pedir categorías, dibujar el menú y abrir la primera ---------- */
async function iniciar() {
  mostrarCargando();
  try {
    const categorias = await obtenerCategorias();
    dibujarMenu(categorias);
    seleccionarCategoria(categorias[0]);
  } catch (error) {
    mostrarError(iniciar);
  }
}

iniciar();
