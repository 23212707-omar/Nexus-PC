/* carrito-vista.js – Pantalla 3: carrito completo. Se abre con la dirección #/carrito.
   Usa cosas de app.js y detalle.js: formatoPesos, crearImagen, actualizarVistaCarrito, cargarCategorias,
   crearBotonSelector, ponerInactivo y textoPiezas. */

// Atajos a los elementos del HTML (la vista del carrito está en index.html)
const carritoTitulo = document.getElementById('carrito-titulo');
const carritoAviso = document.getElementById('carrito-aviso');
const carritoVacio = document.getElementById('carrito-vacio');
const carritoContenido = document.getElementById('carrito-contenido');
const carritoLista = document.getElementById('carrito-lista');
const botonVaciar = document.getElementById('carrito-vaciar');
const confirmacionVaciar = document.getElementById('carrito-confirmacion');
const botonConfirmarVaciar = document.getElementById('carrito-confirmar-vaciar');
const botonCancelarVaciar = document.getElementById('carrito-cancelar-vaciar');
const resumenArticulos = document.getElementById('resumen-articulos');
const resumenLineas = document.getElementById('resumen-lineas');
const resumenTotal = document.getElementById('resumen-total');

/* ---------- Aviso breve (se anuncia con lector de pantalla) ---------- */
function mostrarAvisoCarrito(texto) {
  carritoAviso.textContent = texto;
  carritoAviso.hidden = false;
}

/* ---------- Una fila por producto ---------- */
function crearFilaCarrito(linea) {
  const id = linea.id_producto;
  const fila = document.createElement('li');
  fila.className = 'carrito-fila';
  fila.dataset.id = id;

  // Imagen (decorativa: el nombre ya está en el enlace, por eso el texto alternativo va vacío)
  const imagen = document.createElement('div');
  imagen.className = 'carrito-imagen';
  imagen.appendChild(crearImagen({ nombre: '', imagen_url: linea.imagen_url }));

  // Marca, nombre (enlace al detalle) y aviso de máximo
  const producto = document.createElement('div');
  producto.className = 'carrito-producto';
  if (linea.marca) {
    const marca = document.createElement('div');
    marca.className = 'marca';
    marca.textContent = linea.marca;
    producto.appendChild(marca);
  }
  const nombre = document.createElement('a');
  nombre.className = 'carrito-nombre';
  nombre.href = '#/producto/' + id;
  nombre.textContent = linea.nombre;
  const maximo = document.createElement('p');
  maximo.className = 'carrito-maximo';
  producto.append(nombre, maximo);

  // Precio de una pieza
  const precio = document.createElement('div');
  precio.className = 'carrito-precio';
  const etiquetaPrecio = document.createElement('span');
  etiquetaPrecio.className = 'solo-lectores';
  etiquetaPrecio.textContent = 'Precio: ';
  const unidad = document.createElement('span');
  unidad.className = 'unidad';
  unidad.textContent = ' c/u';
  precio.append(etiquetaPrecio, formatoPesos.format(linea.precio), unidad);

  // Selector de cantidad (− y +)
  const selector = document.createElement('div');
  selector.className = 'selector';
  selector.setAttribute('role', 'group');
  selector.setAttribute('aria-label', 'Cantidad de ' + linea.nombre);
  const menos = crearBotonSelector('−', 'Disminuir cantidad de ' + linea.nombre);
  const mas = crearBotonSelector('+', 'Aumentar cantidad de ' + linea.nombre);
  const valor = document.createElement('output');
  valor.className = 'selector-valor';
  valor.setAttribute('aria-label', 'Cantidad');
  selector.append(menos, valor, mas);

  // Subtotal (precio × cantidad)
  const subtotal = document.createElement('div');
  subtotal.className = 'carrito-subtotal';

  const quitar = document.createElement('button');
  quitar.type = 'button';
  quitar.className = 'boton-texto boton-quitar';
  quitar.textContent = 'Quitar';
  quitar.setAttribute('aria-label', 'Quitar ' + linea.nombre + ' del carrito');

  fila.append(imagen, producto, precio, selector, subtotal, quitar);

  // Pone la fila al día con lo que hay en el carrito
  function refrescar() {
    const actual = Carrito.obtener().find(p => p.id_producto === id);
    if (!actual) return;
    valor.textContent = actual.cantidad;
    ponerInactivo(menos, actual.cantidad <= 1);
    ponerInactivo(mas, actual.cantidad >= actual.stock);
    const etiqueta = document.createElement('span');
    etiqueta.className = 'solo-lectores';
    etiqueta.textContent = 'Subtotal: ';
    subtotal.textContent = '';
    subtotal.append(etiqueta, formatoPesos.format(actual.precio * actual.cantidad));
    maximo.hidden = actual.cantidad < actual.stock;
    maximo.textContent = 'Máximo disponible: ' + textoPiezas(actual.stock) + '.';
  }

  // Sube o baja la cantidad (nunca menos de 1 ni más que el stock)
  function cambiar(diferencia) {
    const actual = Carrito.obtener().find(p => p.id_producto === id);
    if (!actual) return;
    const resultado = Carrito.cambiarCantidad(id, actual.cantidad + diferencia);
    if (!resultado.ok) {
      if (resultado.motivo === 'stock') {
        mostrarAvisoCarrito(resultado.stock === 1 ? 'Solo hay 1 pieza disponible.'
                                                  : 'Solo hay ' + resultado.stock + ' piezas disponibles.');
      }
      return;
    }
    refrescar();
    actualizarResumenCarrito();
    actualizarVistaCarrito();
  }

  // Los botones inactivos no hacen nada (se usa aria-disabled para no perder el foco del teclado)
  menos.addEventListener('click', () => { if (menos.getAttribute('aria-disabled') !== 'true') cambiar(-1); });
  mas.addEventListener('click', () => { if (mas.getAttribute('aria-disabled') !== 'true') cambiar(1); });
  quitar.addEventListener('click', () => quitarDelCarrito(linea, fila));

  refrescar();
  return fila;
}

/* ---------- Quitar un producto ---------- */
function quitarDelCarrito(linea, fila) {
  const vecina = fila.nextElementSibling || fila.previousElementSibling;   // a dónde pasa el foco
  Carrito.quitar(linea.id_producto);
  fila.remove();
  actualizarResumenCarrito();
  actualizarVistaCarrito();
  mostrarAvisoCarrito('Quitaste ' + linea.nombre + ' del carrito.');
  if (vecina) vecina.querySelector('.boton-quitar').focus();
  else carritoTitulo.focus();
}

/* ---------- Resumen y total (y estado "carrito vacío") ---------- */
function actualizarResumenCarrito() {
  const lineas = Carrito.obtener();
  const vacio = lineas.length === 0;
  carritoVacio.hidden = !vacio;
  carritoContenido.hidden = vacio;

  resumenArticulos.textContent = Carrito.totalArticulos();
  resumenLineas.textContent = '';
  lineas.forEach(linea => {
    const item = document.createElement('li');
    item.className = 'resumen-linea';
    const texto = document.createElement('span');
    texto.className = 'resumen-nombre';
    texto.textContent = linea.nombre + ' × ' + linea.cantidad;
    texto.title = linea.nombre;
    const importe = document.createElement('span');
    importe.textContent = formatoPesos.format(linea.precio * linea.cantidad);
    item.append(texto, importe);
    resumenLineas.appendChild(item);
  });
  resumenTotal.textContent = formatoPesos.format(Carrito.totalPrecio());
}

/* ---------- Vaciar el carrito (con una confirmación sencilla) ---------- */
function abrirConfirmacionVaciar() {
  botonVaciar.hidden = true;
  confirmacionVaciar.hidden = false;
  botonCancelarVaciar.focus();   // la opción segura queda lista para el teclado
}

function cerrarConfirmacionVaciar() {
  confirmacionVaciar.hidden = true;
  botonVaciar.hidden = false;
}

botonVaciar.addEventListener('click', abrirConfirmacionVaciar);
botonCancelarVaciar.addEventListener('click', () => {
  cerrarConfirmacionVaciar();
  botonVaciar.focus();
});
botonConfirmarVaciar.addEventListener('click', () => {
  Carrito.vaciar();
  cerrarConfirmacionVaciar();
  carritoLista.textContent = '';
  actualizarResumenCarrito();
  actualizarVistaCarrito();
  mostrarAvisoCarrito('Vaciaste el carrito.');
  carritoTitulo.focus();
});
confirmacionVaciar.addEventListener('keydown', evento => {
  if (evento.key === 'Escape') { cerrarConfirmacionVaciar(); botonVaciar.focus(); }
});

/* ---------- Abrir la pantalla (lo llama app.js cuando la dirección es #/carrito) ---------- */
function mostrarCarrito() {
  document.title = 'Tu carrito – Nexus PC';
  window.scrollTo(0, 0);
  cargarCategorias();   // llena el menú del encabezado (si falló antes, lo vuelve a intentar)
  cerrarConfirmacionVaciar();
  carritoAviso.hidden = true;
  carritoLista.textContent = '';
  Carrito.obtener().forEach(linea => carritoLista.appendChild(crearFilaCarrito(linea)));
  actualizarResumenCarrito();
  carritoTitulo.focus({ preventScroll: true });
}
