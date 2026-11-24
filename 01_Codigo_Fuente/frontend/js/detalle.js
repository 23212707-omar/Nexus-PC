/* detalle.js – Pantalla 2: detalle de producto. Se abre con una dirección como #/producto/13.
   Usa cosas de app.js (se cargan antes de que alguien pulse algo): crearImagen, crearEtiqueta,
   formatoPesos, actualizarVistaCarrito, seleccionarCategoria, categorias y categoriaActiva. */

// Atajos a los elementos del HTML (la vista de detalle está en index.html)
const detalleRuta = document.getElementById('ruta-detalle');
const detalleMensaje = document.getElementById('detalle-mensaje');
const detalleContenido = document.getElementById('detalle-contenido');

let peticionDetalle = 0;          // Número de la última petición (para ignorar respuestas viejas)
let categoriaDelDetalle = null;   // Nombre de la categoría del producto abierto (app.js la usa al volver)

// Nombres legibles de las especificaciones (la API las manda en snake_case)
const ETIQUETAS_ESPECIFICACION = {
  socket: 'Socket',
  consumo_w: 'Consumo (W)',
  nucleos: 'Núcleos',
  tipo_ram: 'Tipo de RAM',
  formato_placa: 'Formato de placa',
  capacidad_gb: 'Capacidad (GB)',
  velocidad_mhz: 'Velocidad (MHz)',
  tipo: 'Tipo',
  memoria_gb: 'Memoria (GB)',
  fuente_recomendada_w: 'Fuente recomendada (W)',
  potencia_w: 'Potencia (W)',
  formatos_soportados: 'Formatos soportados'
};

// "consumo_w" -> "Consumo (W)". Si la clave no está en la lista, la convierte a texto normal.
function etiquetaEspecificacion(clave) {
  if (Object.prototype.hasOwnProperty.call(ETIQUETAS_ESPECIFICACION, clave)) {
    return ETIQUETAS_ESPECIFICACION[clave];
  }
  const texto = clave.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Los valores pueden ser texto, número o lista (formatos_soportados)
function valorEspecificacion(valor) {
  if (Array.isArray(valor)) return valor.join(', ');
  if (valor === null || valor === undefined || valor === '') return '—';
  return String(valor);
}

function textoPiezas(n) { return n + (n === 1 ? ' pieza' : ' piezas'); }

function piezasEnCarrito(idProducto) {
  const linea = Carrito.obtener().find(p => p.id_producto === idProducto);
  return linea ? linea.cantidad : 0;
}

/* ---------- Mensajes: cargando, error y producto inexistente ---------- */
function crearEnlaceVolver() {
  const enlace = document.createElement('a');
  enlace.href = '#/';
  enlace.className = 'boton-volver';
  enlace.textContent = 'Volver al catálogo';
  return enlace;
}

// Muestra un mensaje; "acciones" son botones o enlaces que se ponen debajo
function mostrarMensajeDetalle(texto, conMarco, acciones) {
  detalleMensaje.className = conMarco ? 'mensaje mensaje--error' : 'mensaje';
  detalleMensaje.textContent = texto;
  if (acciones && acciones.length) {
    const fila = document.createElement('div');
    fila.className = 'mensaje-acciones';
    acciones.forEach(accion => fila.appendChild(accion));
    detalleMensaje.appendChild(fila);
  }
  detalleMensaje.hidden = false;
}

function mostrarNoEncontrado() {
  document.title = 'Producto no encontrado – Nexus PC';
  mostrarMensajeDetalle('No encontramos este producto. Puede que ya no esté a la venta o que la dirección esté mal escrita.',
                        true, [crearEnlaceVolver()]);
}

function mostrarErrorDetalle(alReintentar) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Reintentar';
  boton.addEventListener('click', alReintentar);
  mostrarMensajeDetalle('No se pudo cargar el producto', true, [boton, crearEnlaceVolver()]);
}

/* ---------- Ruta de navegación: Catálogo › Categoría › Producto ---------- */
function crearSeparador() {
  const separador = document.createElement('span');
  separador.setAttribute('aria-hidden', 'true');
  separador.textContent = '›';
  return separador;
}

function dibujarRuta(producto) {
  detalleRuta.textContent = '';
  const inicio = document.createElement('a');
  inicio.href = '#/';
  inicio.textContent = 'Catálogo';
  detalleRuta.appendChild(inicio);
  if (!producto) return;

  // La categoría lleva al catálogo, ya con esa categoría elegida
  const enlaceCategoria = document.createElement('a');
  enlaceCategoria.href = '#/';
  enlaceCategoria.textContent = producto.categoria;
  enlaceCategoria.addEventListener('click', () => {
    const categoria = categorias.find(c => c.nombre === producto.categoria);
    const yaActiva = categoriaActiva && categoria && categoriaActiva.id_categoria === categoria.id_categoria;
    if (categoria && !yaActiva) seleccionarCategoria(categoria);
  });

  const actual = document.createElement('span');
  actual.setAttribute('aria-current', 'page');
  actual.textContent = producto.nombre;
  detalleRuta.append(crearSeparador(), enlaceCategoria, crearSeparador(), actual);
}

/* ---------- Partes de la pantalla ---------- */
// Una sección con título (h2) y su contenido
function crearSeccion(titulo, id) {
  const seccion = document.createElement('section');
  seccion.className = 'detalle-seccion';
  const encabezado = document.createElement('h2');
  encabezado.id = id;
  encabezado.textContent = titulo;
  seccion.appendChild(encabezado);
  return seccion;
}

function crearTextoVacio(texto) {
  const parrafo = document.createElement('p');
  parrafo.className = 'sin-dato';
  parrafo.textContent = texto;
  return parrafo;
}

function crearDescripcion(producto) {
  const seccion = crearSeccion('Descripción', 'detalle-descripcion');
  if (producto.descripcion) {
    const parrafo = document.createElement('p');
    parrafo.textContent = producto.descripcion;
    seccion.appendChild(parrafo);
  } else {
    seccion.appendChild(crearTextoVacio('Este producto aún no tiene descripción.'));
  }
  return seccion;
}

function crearEspecificaciones(producto) {
  const seccion = crearSeccion('Especificaciones', 'detalle-especificaciones');
  const datos = Object.entries(producto.especificaciones || {});
  if (datos.length === 0) {
    seccion.appendChild(crearTextoVacio('Este producto aún no tiene especificaciones.'));
    return seccion;
  }
  const tabla = document.createElement('table');
  tabla.className = 'especificaciones';
  tabla.setAttribute('aria-labelledby', 'detalle-especificaciones');
  const cuerpo = document.createElement('tbody');
  datos.forEach(([clave, valor]) => {
    const fila = document.createElement('tr');
    const nombre = document.createElement('th');
    nombre.scope = 'row';
    nombre.textContent = etiquetaEspecificacion(clave);
    const dato = document.createElement('td');
    dato.textContent = valorEspecificacion(valor);
    fila.append(nombre, dato);
    cuerpo.appendChild(fila);
  });
  tabla.appendChild(cuerpo);
  seccion.appendChild(tabla);
  return seccion;
}

// Botón "−" o "+" del selector. Usa aria-disabled (y no disabled) para no perder el foco del teclado.
function crearBotonSelector(texto, nombreAccesible) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'selector-boton';
  boton.textContent = texto;
  boton.setAttribute('aria-label', nombreAccesible);
  return boton;
}

function ponerInactivo(boton, inactivo) {
  if (inactivo) boton.setAttribute('aria-disabled', 'true');
  else boton.removeAttribute('aria-disabled');
}

// Panel de compra: selector de cantidad y botón "Agregar al carrito"
function crearCompra(producto) {
  const compra = document.createElement('div');
  compra.className = 'compra';
  const fila = document.createElement('div');
  fila.className = 'compra-fila';
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton-agregar';
  compra.appendChild(fila);

  // Agotado: botón deshabilitado y sin selector de cantidad
  if (producto.estado === 'Agotado' || producto.stock < 1) {
    boton.disabled = true;
    boton.textContent = 'Producto agotado';
    fila.appendChild(boton);
    return compra;
  }

  let cantidad = 1;   // Lo que se agregará al pulsar el botón

  const selector = document.createElement('div');
  selector.className = 'selector';
  selector.setAttribute('role', 'group');
  selector.setAttribute('aria-label', 'Cantidad a agregar');
  const menos = crearBotonSelector('−', 'Disminuir cantidad');
  const mas = crearBotonSelector('+', 'Aumentar cantidad');
  const valor = document.createElement('output');
  valor.className = 'selector-valor';
  valor.setAttribute('aria-label', 'Cantidad');
  selector.append(menos, valor, mas);
  fila.append(selector, boton);

  const enCarrito = document.createElement('p');
  enCarrito.className = 'en-carrito';
  const aviso = document.createElement('p');
  aviso.className = 'aviso-stock';
  aviso.setAttribute('role', 'status');
  aviso.hidden = true;
  compra.append(enCarrito, aviso);

  // Piezas que todavía se pueden agregar: el stock menos lo que ya hay en el carrito
  function piezasLibres() { return producto.stock - piezasEnCarrito(producto.id_producto); }

  // Pone los controles al día (máximo del selector, botón, texto "Ya tienes...")
  function refrescar() {
    const libres = piezasLibres();
    cantidad = Math.max(1, Math.min(cantidad, libres));
    const hayPiezas = libres >= 1;
    selector.hidden = !hayPiezas;
    // Mientras el botón dice "Agregado ✓" no se le cambia el texto; al terminar, refrescar lo deja al día
    if (!boton.classList.contains('boton-agregar--ok')) {
      boton.textContent = hayPiezas ? 'Agregar al carrito' : 'Ya tienes todas las piezas en tu carrito';
    }
    if (hayPiezas) boton.setAttribute('aria-label', 'Agregar al carrito: ' + producto.nombre);
    else boton.removeAttribute('aria-label');
    ponerInactivo(boton, !hayPiezas);
    valor.textContent = cantidad;
    ponerInactivo(menos, cantidad <= 1);
    ponerInactivo(mas, cantidad >= libres);
    const tiene = piezasEnCarrito(producto.id_producto);
    enCarrito.textContent = tiene ? 'Ya tienes ' + textoPiezas(tiene) + ' de este producto en tu carrito.' : '';
    enCarrito.hidden = tiene === 0;
  }

  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(aviso.temporizador);
    aviso.temporizador = setTimeout(() => { aviso.hidden = true; }, 3000);
  }

  menos.addEventListener('click', () => {
    if (menos.getAttribute('aria-disabled') === 'true') return;
    cantidad -= 1;
    refrescar();
  });
  mas.addEventListener('click', () => {
    if (mas.getAttribute('aria-disabled') === 'true') return;
    cantidad += 1;
    refrescar();
  });

  boton.addEventListener('click', () => {
    if (boton.getAttribute('aria-disabled') === 'true') return;
    // El carrito agrega de una pieza en una pieza y respeta el stock
    let agregadas = 0;
    let resultado = { ok: true };
    while (agregadas < cantidad) {
      resultado = Carrito.agregar(producto);
      if (!resultado.ok) break;
      agregadas += 1;
    }
    actualizarVistaCarrito();
    cantidad = 1;
    refrescar();
    // Feedback visual (UI7): "Agregado ✓" en el botón y pulso del contador; después refrescar() deja el botón al día
    if (agregadas > 0) {
      pulsarContador();
      mostrarBotonAgregado(boton, refrescar);
    }

    const textoAgregado = agregadas > 0 ? 'Agregaste ' + textoPiezas(agregadas) + ' al carrito.' : '';
    const textoStock = resultado.ok ? '' : (resultado.stock === 1 ? 'Solo hay 1 pieza disponible.'
                                          : 'Solo hay ' + resultado.stock + ' piezas disponibles.');
    mostrarAviso((textoAgregado + ' ' + textoStock).trim());
  });

  refrescar();
  return compra;
}

// Marca, nombre, precio, estado, descripción, especificaciones y compra
function crearInfo(producto) {
  const info = document.createElement('div');
  info.className = 'detalle-info';

  const marca = document.createElement('div');
  marca.className = 'marca';
  marca.textContent = producto.marca;

  const nombre = document.createElement('h1');
  nombre.className = 'detalle-nombre';
  nombre.tabIndex = -1;   // para poder darle el foco al abrir la pantalla
  nombre.textContent = producto.nombre;

  const precio = document.createElement('p');
  precio.className = 'detalle-precio';
  precio.textContent = formatoPesos.format(producto.precio);

  // Disponibilidad: "Disponible · 12 piezas", "Pocas piezas · 3 piezas" o "Agotado"
  const agotado = producto.estado === 'Agotado' || producto.stock < 1;
  const estado = crearEtiqueta(agotado ? 'Agotado' : producto.estado);
  if (!agotado) estado.textContent = producto.estado + ' · ' + textoPiezas(producto.stock);
  const fila = document.createElement('p');
  fila.className = 'detalle-estado';
  fila.appendChild(estado);

  info.append(marca, nombre, precio, fila, crearDescripcion(producto),
              crearEspecificaciones(producto), crearCompra(producto), crearEnlaceVolver());
  return info;
}

function dibujarDetalle(producto) {
  categoriaDelDetalle = producto.categoria;
  document.title = producto.nombre + ' – Nexus PC';
  dibujarRuta(producto);
  detalleMensaje.hidden = true;

  const imagen = document.createElement('div');
  imagen.className = 'detalle-imagen';
  imagen.appendChild(crearImagen(producto));
  const info = crearInfo(producto);

  detalleContenido.textContent = '';
  detalleContenido.append(imagen, info);
  detalleContenido.hidden = false;
  info.querySelector('h1').focus({ preventScroll: true });
}

/* ---------- Abrir el detalle (lo llama app.js cuando la dirección es #/producto/ID) ---------- */
async function mostrarDetalle(idTexto) {
  const peticion = ++peticionDetalle;
  categoriaDelDetalle = null;
  detalleContenido.hidden = true;
  detalleContenido.textContent = '';
  dibujarRuta(null);
  document.title = 'Producto – Nexus PC';
  window.scrollTo(0, 0);
  cargarCategorias();   // llena el menú del encabezado (si falló antes, lo vuelve a intentar)

  // Una dirección como #/producto/abc ni siquiera se pregunta a la API
  if (!/^\d{1,10}$/.test(idTexto)) {
    mostrarNoEncontrado();
    return;
  }
  mostrarMensajeDetalle('Cargando...', false);
  try {
    const producto = await obtenerProducto(Number(idTexto));
    if (peticion !== peticionDetalle) return;   // la persona ya abrió otra pantalla
    dibujarDetalle(producto);
  } catch (error) {
    if (peticion !== peticionDetalle) return;
    // 404 = no existe; 400 = el id no es válido para la API. Los dos se muestran igual.
    if (error.estado === 404 || error.estado === 400) mostrarNoEncontrado();
    else mostrarErrorDetalle(() => mostrarDetalle(idTexto));
  }
}

// Al salir del detalle: se ignora cualquier respuesta que siga pendiente
function cancelarDetalle() { peticionDetalle += 1; }