/* app.js – Lo que se ve en pantalla: menú, tarjetas, contador, mensajes y cambio entre pantallas. */

// El carrito vive en js/carrito.js (objeto Carrito) y el detalle de producto en js/detalle.js
let categoriaActiva = null;   // La categoría que se está mostrando
let categorias = [];          // Todas las categorías (se llenan al cargar el menú)
let promesaCategorias = null; // La petición de categorías (para no pedirlas dos veces)
let posicionCatalogo = 0;     // Hasta dónde estaba desplazado el catálogo al abrir un detalle

// Atajos a los elementos del HTML
const vistaCatalogo = document.getElementById('vista-catalogo');
const vistaDetalle = document.getElementById('vista-detalle');
const menu = document.getElementById('menu-categorias');
const botonMenu = document.getElementById('btn-menu');
const titulo = document.getElementById('titulo-categoria');
const subtitulo = document.getElementById('subtitulo-categoria');
const mensaje = document.getElementById('mensaje');
const lista = document.getElementById('lista-productos');
const contador = document.getElementById('contador-carrito');

const TITULO_CATALOGO = 'Nexus PC – Catálogo';

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
      irAlCatalogo();   // si se estaba viendo un detalle, vuelve al catálogo
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

/* ---------- Piezas reutilizadas por el catálogo y por el detalle ---------- */
// Recuadro gris con la palabra "imagen". Si la foto existe y carga, la reemplaza.
function crearImagen(producto) {
  const caja = document.createElement('div');
  caja.className = 'imagen';
  const marcador = document.createElement('span');
  marcador.setAttribute('aria-hidden', 'true');
  marcador.textContent = 'imagen';
  caja.appendChild(marcador);
  if (producto.imagen_url) {
    const foto = new Image();
    foto.alt = producto.nombre;
    foto.onload = () => { caja.textContent = ''; caja.appendChild(foto); };
    foto.src = producto.imagen_url;   // si falla, no pasa nada: queda el recuadro
  }
  return caja;
}

// Etiqueta según el campo "estado": Disponible, Pocas piezas o Agotado
function crearEtiqueta(estado) {
  const etiqueta = document.createElement('span');
  etiqueta.className = 'etiqueta';
  if (estado === 'Pocas piezas') etiqueta.classList.add('etiqueta--pocas');
  if (estado === 'Agotado') etiqueta.classList.add('etiqueta--agotado');
  etiqueta.textContent = estado;
  return etiqueta;
}

/* ---------- Tarjeta de producto ---------- */
function crearTarjeta(producto) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta';

  const caja = crearImagen(producto);

  const marca = document.createElement('div');
  marca.className = 'marca';
  marca.textContent = producto.marca;

  // El nombre es un enlace al detalle (#/producto/ID); con CSS toda la tarjeta es clicable
  const nombre = document.createElement('h2');
  nombre.className = 'nombre';
  const enlace = document.createElement('a');
  enlace.href = '#/producto/' + producto.id_producto;
  enlace.textContent = producto.nombre;
  nombre.appendChild(enlace);

  const precio = document.createElement('span');
  precio.className = 'precio';
  precio.textContent = formatoPesos.format(producto.precio);

  const agotado = producto.estado === 'Agotado';
  const etiqueta = crearEtiqueta(producto.estado);

  const fila = document.createElement('div');
  fila.className = 'fila';
  fila.append(precio, etiqueta);

  // Mensaje breve que aparece junto al botón si ya no hay más piezas
  const aviso = document.createElement('p');
  aviso.className = 'aviso-stock';
  aviso.setAttribute('role', 'status');
  aviso.hidden = true;

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
    boton.addEventListener('click', () => agregarAlCarrito(producto, aviso));
  }

  tarjeta.append(caja, marca, nombre, fila, boton, aviso);
  return tarjeta;
}

/* ---------- Agregar al carrito ---------- */
function agregarAlCarrito(producto, aviso) {
  const resultado = Carrito.agregar(producto);
  if (resultado.ok) {
    actualizarVistaCarrito();
  } else {
    // No se agrega: se avisa cuántas piezas hay y el mensaje se quita solo a los 3 segundos
    aviso.textContent = resultado.stock === 1 ? 'Solo hay 1 pieza disponible'
                                              : 'Solo hay ' + resultado.stock + ' piezas disponibles';
    aviso.hidden = false;
    clearTimeout(aviso.temporizador);
    aviso.temporizador = setTimeout(() => { aviso.hidden = true; }, 3000);
  }
}

/* ---------- Vista rápida del carrito (panel bajo el botón "Carrito") ---------- */
const caja = document.getElementById('carrito-caja');
const botonCarrito = document.getElementById('btn-carrito');
const panel = document.getElementById('panel-carrito');
const panelTitulo = document.getElementById('panel-titulo');
const panelLista = document.getElementById('panel-lista');
const panelVacio = document.getElementById('panel-vacio');
const panelTotal = document.getElementById('panel-total');
const panelTotalValor = document.getElementById('panel-total-valor');
const panelVer = document.getElementById('panel-ver');
const panelExplorar = document.getElementById('panel-explorar');

// true si la pantalla es táctil (celular o tableta); con ratón vale false
const consultaTactil = window.matchMedia('(hover: none) and (pointer: coarse)');
let fijado = false;        // true si la persona abrió el panel con clic o Enter (no se cierra al salir el cursor)
let temporizadorCierre = null;

function abrirPanel() {
  clearTimeout(temporizadorCierre);
  panel.hidden = false;
  botonCarrito.setAttribute('aria-expanded', 'true');
}
function cerrarPanel() {
  clearTimeout(temporizadorCierre);
  panel.hidden = true;
  fijado = false;
  botonCarrito.setAttribute('aria-expanded', 'false');
}

// Con ratón: al pasar el cursor se abre; al salir se cierra tras 200 ms (evita parpadeos)
caja.addEventListener('mouseenter', () => { if (!consultaTactil.matches) abrirPanel(); });
caja.addEventListener('mouseleave', () => {
  if (consultaTactil.matches || fijado) return;
  temporizadorCierre = setTimeout(cerrarPanel, 200);
});

// Clic o Enter en el botón. En pantalla táctil: un toque abre y otro cierra.
// Con ratón: el primer clic deja el panel fijo; el siguiente lo cierra.
botonCarrito.addEventListener('click', () => {
  if (consultaTactil.matches) {
    if (panel.hidden) abrirPanel(); else cerrarPanel();
  } else if (panel.hidden || !fijado) {
    abrirPanel();
    fijado = true;
  } else {
    cerrarPanel();
  }
});

// Un toque o clic fuera del panel lo cierra; Escape también
document.addEventListener('click', evento => { if (!caja.contains(evento.target)) cerrarPanel(); });
document.addEventListener('keydown', evento => {
  if (evento.key === 'Escape' && !panel.hidden) { cerrarPanel(); botonCarrito.focus(); }
});
// "Explorar catálogo" cierra el panel y, si se estaba viendo un detalle, vuelve al catálogo
panelExplorar.addEventListener('click', () => { cerrarPanel(); irAlCatalogo(); });

// Redibuja el contador y el panel con lo que haya en el carrito
function actualizarVistaCarrito() {
  const productos = Carrito.obtener();
  const n = Carrito.totalArticulos();
  const textoArticulos = n + (n === 1 ? ' artículo' : ' artículos');

  contador.textContent = n;
  contador.setAttribute('aria-label', textoArticulos);
  panelTitulo.textContent = 'Tu carrito (' + textoArticulos + ')';

  // Una fila por producto: nombre (con "..." si es largo), cantidad y precio de la línea
  panelLista.textContent = '';
  productos.forEach(p => {
    const fila = document.createElement('li');
    fila.className = 'panel-fila';
    const datos = document.createElement('div');
    datos.className = 'panel-datos';
    const nombre = document.createElement('div');
    nombre.className = 'panel-nombre';
    nombre.textContent = p.nombre;
    nombre.title = p.nombre;
    const cantidad = document.createElement('div');
    cantidad.className = 'panel-cantidad';
    cantidad.textContent = 'Cantidad: ' + p.cantidad;
    datos.append(nombre, cantidad);
    const precio = document.createElement('span');
    precio.className = 'panel-precio';
    precio.textContent = formatoPesos.format(p.precio * p.cantidad);
    fila.append(datos, precio);
    panelLista.appendChild(fila);
  });
  panelTotalValor.textContent = formatoPesos.format(Carrito.totalPrecio());

  // Carrito vacío: mensaje y botón "Explorar catálogo"; con productos: lista, total y "Ver carrito"
  const vacio = n === 0;
  panelLista.hidden = vacio;
  panelTotal.hidden = vacio;
  panelVer.hidden = vacio;
  panelVacio.hidden = !vacio;
  panelExplorar.hidden = !vacio;
}

/* ---------- Cargar y mostrar una categoría ---------- */
async function seleccionarCategoria(categoria) {
  categoriaActiva = categoria;
  posicionCatalogo = 0;
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

/* ---------- Pantallas: catálogo (#/ o sin nada) y detalle (#/producto/ID) ---------- */
// Pide las categorías una sola vez y dibuja el menú. Devuelve true si salió bien.
function cargarCategorias() {
  if (!promesaCategorias) {
    promesaCategorias = obtenerCategorias()
      .then(datos => { categorias = datos; dibujarMenu(datos); return true; })
      .catch(() => { promesaCategorias = null; return false; });   // se podrá reintentar
  }
  return promesaCategorias;
}

// Lee la dirección de la página y dice qué pantalla toca
function leerRuta() {
  const coincide = /^#\/producto\/([^/]*)$/.exec(location.hash);
  return coincide ? { vista: 'detalle', id: coincide[1] } : { vista: 'catalogo' };
}

// Lleva al catálogo si se estaba en otra pantalla
function irAlCatalogo() {
  if (leerRuta().vista !== 'catalogo') location.hash = '#/';
}

// Muestra el catálogo. Si ya había una categoría abierta, la conserva (y el desplazamiento).
async function mostrarCatalogo(veniaDeDetalle) {
  if (categorias.length === 0) mostrarCargando();
  const listo = await cargarCategorias();
  if (leerRuta().vista !== 'catalogo') return;   // la persona ya se fue a otro lado
  if (!listo || categorias.length === 0) {
    mostrarError(() => mostrarCatalogo(false));
    return;
  }
  if (categoriaActiva) {
    if (veniaDeDetalle) window.scrollTo(0, posicionCatalogo);
    return;
  }
  // Primera vez: la categoría del producto que se estaba viendo, o la primera de la lista
  const delProducto = categorias.find(c => c.nombre === categoriaDelDetalle);
  seleccionarCategoria(delProducto || categorias[0]);
}

// Cambia de pantalla según la dirección
function mostrarRuta() {
  const ruta = leerRuta();
  if (ruta.vista === 'detalle') {
    if (!vistaCatalogo.hidden) posicionCatalogo = window.scrollY;
    vistaCatalogo.hidden = true;
    vistaDetalle.hidden = false;
    mostrarDetalle(ruta.id);
  } else {
    const veniaDeDetalle = vistaCatalogo.hidden;
    cancelarDetalle();
    vistaDetalle.hidden = true;
    vistaCatalogo.hidden = false;
    document.title = TITULO_CATALOGO;
    mostrarCatalogo(veniaDeDetalle);
  }
}

// El botón "atrás" del navegador y los enlaces cambian la dirección; aquí se reacciona
window.addEventListener('hashchange', mostrarRuta);

/* ---------- Inicio: dibujar el menú y mostrar la pantalla que pida la dirección ---------- */
function iniciar() {
  mostrarRuta();   // cada pantalla pide las categorías para llenar el menú
}

actualizarVistaCarrito();   // muestra el carrito guardado (si lo había)
iniciar();