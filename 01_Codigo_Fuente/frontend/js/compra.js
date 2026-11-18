/* compra.js – Pantalla 5: confirmación de compra (#/compra).
   Formulario del comprador, validación en el navegador, resumen del pedido, envío a la API
   (crearPedido, en api.js) y los resultados: pedido guardado, datos inválidos, falta de stock,
   producto inexistente, error del servidor o sin conexión. */

// Atajos a los elementos de la pantalla
const compraAviso = document.getElementById('compra-aviso');
const compraEstado = document.getElementById('compra-estado');
const compraVacio = document.getElementById('compra-vacio');
const compraFormulario = document.getElementById('compra-formulario');
const compraExito = document.getElementById('compra-exito');
const compraExitoTitulo = document.getElementById('compra-exito-titulo');
const compraBoton = document.getElementById('compra-confirmar');
const compraResumenArticulos = document.getElementById('compra-resumen-articulos');
const compraResumenLineas = document.getElementById('compra-resumen-lineas');
const compraResumenTotal = document.getElementById('compra-resumen-total');

// Los tres campos del formulario: nombre del dato en la API, caja de texto y párrafo del mensaje de error
const CAMPOS_COMPRA = [
  { nombre: 'nombre_comprador', input: document.getElementById('compra-nombre'), error: document.getElementById('compra-nombre-error') },
  { nombre: 'correo', input: document.getElementById('compra-correo'), error: document.getElementById('compra-correo-error') },
  { nombre: 'telefono', input: document.getElementById('compra-telefono'), error: document.getElementById('compra-telefono-error') }
];

let enviandoPedido = false;   // true mientras se espera la respuesta (evita enviar dos veces)
let problemaStock = null;     // { id_producto, disponible } de la línea que la API dijo que no alcanza

/* ---------- Validación (mismas reglas que la API, sección 5.4) ---------- */
function validarNombre(nombre) {
  if (nombre.length < 1) return 'Escribe tu nombre completo.';
  if (nombre.length > 100) return 'El nombre puede tener máximo 100 caracteres.';
  return '';
}

function validarCorreo(correo) {
  if (correo === '') return 'Escribe tu correo electrónico.';
  if (correo.length > 120) return 'El correo puede tener máximo 120 caracteres.';
  if (/\s/.test(correo)) return 'El correo no puede tener espacios.';
  if (correo.split('@').length !== 2) return 'El correo debe tener un solo @, por ejemplo ana@correo.com.';
  const partes = correo.split('@');
  if (partes[0].length < 1) return 'Falta lo que va antes del @, por ejemplo ana@correo.com.';
  if (!/^.+\..+$/.test(partes[1])) return 'Después del @ escribe un dominio con punto, por ejemplo correo.com.';
  return '';
}

function validarTelefono(telefono) {
  if (telefono !== null && telefono.length > 20) return 'El teléfono puede tener máximo 20 caracteres.';
  return '';
}

// Devuelve un objeto con un mensaje por cada campo que está mal (vacío si todo está bien)
function validarDatosCompra(datos) {
  const mensajes = {
    nombre_comprador: validarNombre(datos.nombre_comprador),
    correo: validarCorreo(datos.correo),
    telefono: validarTelefono(datos.telefono)
  };
  const errores = {};
  Object.keys(mensajes).forEach(campo => { if (mensajes[campo]) errores[campo] = mensajes[campo]; });
  return errores;
}

// Lee el formulario: nombre y correo sin espacios en los extremos; teléfono vacío = null
function leerDatosCompra() {
  const telefono = CAMPOS_COMPRA[2].input.value.trim();
  return {
    nombre_comprador: CAMPOS_COMPRA[0].input.value.trim(),
    correo: CAMPOS_COMPRA[1].input.value.trim(),
    telefono: telefono === '' ? null : telefono
  };
}

/* ---------- Mensajes de error junto a cada campo ---------- */
function ponerErrorCampo(campo, texto) {
  campo.error.textContent = texto;
  campo.error.hidden = false;
  campo.input.setAttribute('aria-invalid', 'true');
  campo.input.setAttribute('aria-describedby', campo.error.id);
}

function quitarErrorCampo(campo) {
  campo.error.textContent = '';
  campo.error.hidden = true;
  campo.input.removeAttribute('aria-invalid');
  campo.input.removeAttribute('aria-describedby');
}

function quitarErroresCampos() { CAMPOS_COMPRA.forEach(quitarErrorCampo); }

// Muestra el mensaje de cada campo con error y quita el de los demás
function mostrarErroresCampos(errores) {
  CAMPOS_COMPRA.forEach(campo => {
    if (errores[campo.nombre]) ponerErrorCampo(campo, errores[campo.nombre]);
    else quitarErrorCampo(campo);
  });
}

// Lleva el foco al primer campo con error (en el orden del formulario). Devuelve true si había alguno
function enfocarPrimerErrorCampo(errores) {
  const primero = CAMPOS_COMPRA.find(campo => errores[campo.nombre]);
  if (primero) primero.input.focus();
  return Boolean(primero);
}

/* ---------- Avisos arriba del formulario ---------- */
function limpiarAvisoCompra() { compraAviso.textContent = ''; }

function crearBotonAccion(texto, claseBoton, alHacerClic) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = claseBoton;
  boton.textContent = texto;
  boton.addEventListener('click', alHacerClic);
  return boton;
}

function crearEnlaceAccion(texto, direccion) {
  const enlace = document.createElement('a');
  enlace.className = 'boton-secundario';
  enlace.href = direccion;
  enlace.textContent = texto;
  return enlace;
}

// Dibuja un aviso. opciones: { titulo, textos: [..], acciones: [botones o enlaces], informativo, enfocar }
// El contenedor compraAviso es una región aria-live: los lectores de pantalla leen el aviso nuevo.
function mostrarAvisoCompra(opciones) {
  limpiarAvisoCompra();
  const caja = document.createElement('div');
  caja.className = 'compra-alerta' + (opciones.informativo ? ' compra-alerta--info' : '');
  caja.tabIndex = -1;
  const titulo = document.createElement('strong');
  titulo.textContent = opciones.titulo;
  caja.appendChild(titulo);
  opciones.textos.forEach(texto => {
    const parrafo = document.createElement('p');
    parrafo.textContent = texto;
    caja.appendChild(parrafo);
  });
  if (opciones.acciones && opciones.acciones.length > 0) {
    const acciones = document.createElement('div');
    acciones.className = 'compra-acciones';
    opciones.acciones.forEach(accion => acciones.appendChild(accion));
    caja.appendChild(acciones);
  }
  compraAviso.appendChild(caja);
  if (opciones.enfocar !== false) caja.focus();
}

/* ---------- Resumen del pedido (lado derecho; en celular, abajo) ---------- */
// Una línea del resumen: texto a la izquierda e importe a la derecha
function crearLineaImporte(texto, importe) {
  const item = document.createElement('li');
  item.className = 'compra-linea';
  const fila = document.createElement('div');
  fila.className = 'compra-linea-fila';
  const nombre = document.createElement('span');
  nombre.textContent = texto;
  const precio = document.createElement('span');
  precio.className = 'compra-linea-precio';
  precio.textContent = importe;
  fila.append(nombre, precio);
  item.appendChild(fila);
  return item;
}

function textoSoloDisponibles(disponible) {
  if (disponible === 0) return 'Sin piezas disponibles';
  return 'Solo ' + textoPiezas(disponible) + (disponible === 1 ? ' disponible' : ' disponibles');
}

function crearLineaResumenCompra(linea) {
  const item = crearLineaImporte(linea.nombre + ' × ' + linea.cantidad, formatoPesos.format(linea.precio * linea.cantidad));
  // La línea que la API dijo que no alcanza se marca con borde punteado y una nota
  if (problemaStock && problemaStock.id_producto === linea.id_producto) {
    item.classList.add('compra-linea--problema');
    const nota = document.createElement('p');
    nota.className = 'compra-linea-nota';
    nota.textContent = textoSoloDisponibles(problemaStock.disponible);
    item.appendChild(nota);
  }
  return item;
}

function dibujarResumenCompra() {
  const productos = Carrito.obtener();
  compraResumenLineas.textContent = '';
  productos.forEach(linea => compraResumenLineas.appendChild(crearLineaResumenCompra(linea)));
  compraResumenArticulos.textContent = Carrito.totalArticulos();
  compraResumenTotal.textContent = formatoPesos.format(Carrito.totalPrecio());
}

/* ---------- Qué parte de la pantalla se ve: formulario, carrito vacío o pedido guardado ---------- */
function mostrarPantallaCompra(estado) {
  compraFormulario.hidden = estado !== 'formulario';
  compraVacio.hidden = estado !== 'vacio';
  compraExito.hidden = estado !== 'exito';
  compraTitulo.hidden = estado === 'exito';   // en el éxito el título es "¡Pedido registrado!"
}

// Entrada a la pantalla (la llama app.js al abrir #/compra)
function mostrarCompra() {
  document.title = 'Confirmación de compra – Nexus PC';
  window.scrollTo(0, 0);
  cargarCategorias();   // llena el menú del encabezado
  limpiarAvisoCompra();
  quitarErroresCampos();
  problemaStock = null;
  if (Carrito.obtener().length === 0) {
    mostrarPantallaCompra('vacio');
  } else {
    dibujarResumenCompra();
    mostrarPantallaCompra('formulario');
    ponerEnviando(enviandoPedido);   // por si se salió de la pantalla mientras se enviaba
  }
  compraTitulo.focus({ preventScroll: true });
}

/* ---------- Botón "Confirmar pedido" mientras se envía ---------- */
function ponerEnviando(enviando) {
  ponerInactivo(compraBoton, enviando);
  compraBoton.textContent = enviando ? 'Enviando...' : 'Confirmar pedido';
  compraEstado.textContent = enviando ? 'Enviando tu pedido...' : '';
}

/* ---------- Pedido guardado (201) ---------- */
function dibujarExito(pedido) {
  document.getElementById('compra-numero').textContent = pedido.numero_pedido;
  const lineas = document.getElementById('compra-exito-lineas');
  lineas.textContent = '';
  // Se muestra tal como lo devolvió la API: no se recalcula nada
  pedido.items.forEach(item => {
    lineas.appendChild(crearLineaImporte(item.nombre + ' × ' + item.cantidad, formatoPesos.format(item.subtotal)));
  });
  document.getElementById('compra-exito-total').textContent = formatoPesos.format(pedido.total);
  document.getElementById('compra-exito-nombre').textContent = 'Guardamos tu pedido a nombre de ' + pedido.nombre_comprador + '.';
}

function terminarCompra(pedido) {
  Carrito.vaciar();   // el carrito se vacía solo aquí, cuando la API confirmó el pedido
  catalogoDesactualizado = true;   // el pedido descontó stock: el catálogo se vuelve a pedir al volver
  actualizarVistaCarrito();
  compraFormulario.reset();
  quitarErroresCampos();
  problemaStock = null;
  limpiarAvisoCompra();
  if (vistaCompra.hidden) return;   // si la persona ya salió de la pantalla, el carrito igual queda vacío
  dibujarExito(pedido);
  mostrarPantallaCompra('exito');
  window.scrollTo(0, 0);
  compraExitoTitulo.focus({ preventScroll: true });
}

/* ---------- Errores que devuelve la API ---------- */
// 400: cada detalle con campo conocido va junto a su campo; lo demás (items, body) va en un aviso arriba
function manejarDatosInvalidos(error) {
  const detalles = Array.isArray(error.detalles) ? error.detalles : [];
  const errores = {};
  const generales = [];
  detalles.forEach(detalle => {
    if (CAMPOS_COMPRA.some(campo => campo.nombre === detalle.campo)) {
      if (!errores[detalle.campo]) errores[detalle.campo] = detalle.mensaje;
    } else {
      generales.push(detalle.mensaje);
    }
  });
  mostrarErroresCampos(errores);
  const hayCampos = Object.keys(errores).length > 0;
  if (generales.length > 0 || !hayCampos) {
    mostrarAvisoCompra({
      titulo: 'No se pudo enviar el pedido',
      textos: generales.length > 0 ? generales : [error.message],
      enfocar: !hayCampos
    });
  }
  if (hayCampos) enfocarPrimerErrorCampo(errores);
}

function textoStockInsuficiente(detalles) {
  const nombre = detalles.nombre || 'un producto';
  if (detalles.disponible === 0) return nombre + ' ya no tiene piezas disponibles y pediste ' + detalles.solicitado + '.';
  const quedan = (detalles.disponible === 1 ? 'Queda ' : 'Quedan ') + textoPiezas(detalles.disponible);
  return quedan + ' de ' + nombre + ' y pediste ' + detalles.solicitado + '.';
}

// 409: dice qué producto falla y ofrece ajustar la cantidad. El carrito NO se vacía.
// La API solo informa la primera línea que falla: después de ajustar puede aparecer otro aviso.
function manejarStockInsuficiente(error) {
  const detalles = error.detalles;
  if (!detalles || !Number.isInteger(detalles.disponible) || !Number.isInteger(detalles.solicitado)) {
    mostrarAvisoCompra({ titulo: 'No se pudo confirmar el pedido', textos: [error.message] });
    return;
  }
  problemaStock = { id_producto: detalles.id_producto, disponible: detalles.disponible };
  catalogoDesactualizado = true;   // el stock real cambió: el catálogo se vuelve a pedir al volver
  dibujarResumenCompra();
  const acciones = [];
  const estaEnCarrito = Carrito.obtener().some(linea => linea.id_producto === detalles.id_producto);
  if (estaEnCarrito) acciones.push(crearBotonAccion('Ajustar al stock disponible', 'boton-principal', ajustarAlStock));
  acciones.push(crearEnlaceAccion('Volver al carrito', '#/carrito'));
  mostrarAvisoCompra({
    titulo: 'No se pudo confirmar el pedido',
    textos: [textoStockInsuficiente(detalles) + ' No se guardó ningún cambio.', 'Tus datos se conservan. Ajusta la cantidad e intenta de nuevo.'],
    acciones: acciones
  });
}

// Botón "Ajustar al stock disponible": baja la cantidad al stock (o quita la línea si es 0)
function ajustarAlStock() {
  const problema = problemaStock;
  if (!problema) return;
  const linea = Carrito.obtener().find(l => l.id_producto === problema.id_producto);
  const nombre = linea ? linea.nombre : 'El producto';
  const resultado = Carrito.actualizarStock(problema.id_producto, problema.disponible);
  problemaStock = null;
  actualizarVistaCarrito();   // contador y vista rápida del encabezado
  if (!resultado.ok) {
    mostrarAvisoCompra({ titulo: 'No se pudo ajustar', textos: ['Revisa las cantidades en el carrito.'], acciones: [crearEnlaceAccion('Volver al carrito', '#/carrito')] });
    return;
  }
  if (Carrito.obtener().length === 0) {
    mostrarPantallaCompra('vacio');
    mostrarAvisoCompra({ titulo: 'Quitamos ' + nombre + ' del carrito', textos: ['Ya no tiene piezas disponibles y tu carrito quedó vacío.'], informativo: true });
    return;
  }
  dibujarResumenCompra();
  const que = resultado.quitada
    ? 'Quitamos ' + nombre + ' del carrito porque ya no tiene piezas disponibles.'
    : 'Ajustamos ' + nombre + ' a ' + textoPiezas(resultado.cantidad) + ', las que hay disponibles.';
  mostrarAvisoCompra({
    titulo: 'Carrito ajustado',
    textos: [que + ' Revisa el resumen e intenta confirmar de nuevo.', 'Si otro producto tampoco alcanza, te lo avisaremos al confirmar.'],
    informativo: true
  });
}

// 404: un producto del carrito ya no existe. El carrito se conserva.
function manejarProductoInexistente(error) {
  const id = error.detalles ? error.detalles.id_producto : null;
  const linea = Carrito.obtener().find(l => l.id_producto === id);
  const que = linea ? linea.nombre + ' ya no existe en la tienda.' : 'Uno de los productos de tu carrito ya no existe en la tienda.';
  mostrarAvisoCompra({
    titulo: 'No se pudo confirmar el pedido',
    textos: [que + ' No se guardó ningún pedido y tu carrito se conserva.'],
    acciones: [crearEnlaceAccion('Volver al carrito', '#/carrito')]
  });
}

// 500 o cualquier otro error del servidor, y falla de conexión (el error no trae "estado")
function manejarFallaServidor(error) {
  const sinConexion = error.estado === undefined;
  const texto = sinConexion
    ? 'No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo.'
    : 'La tienda tuvo un problema y no pudo registrar el pedido.';
  mostrarAvisoCompra({
    titulo: sinConexion ? 'Sin conexión' : 'No se pudo confirmar el pedido',
    textos: [texto + ' No se guardó ningún pedido y tu carrito se conserva.'],
    acciones: [crearBotonAccion('Reintentar', 'boton-principal', () => { compraBoton.focus(); enviarPedido(); })]
  });
}

function manejarErrorPedido(error) {
  if (error.estado === 400) manejarDatosInvalidos(error);
  else if (error.estado === 409) manejarStockInsuficiente(error);
  else if (error.estado === 404) manejarProductoInexistente(error);
  else manejarFallaServidor(error);
}

/* ---------- Enviar el pedido ---------- */
// Solo se mandan los datos del comprador y, por cada producto, id y cantidad (nunca precios ni totales)
function armarPedido(datos) {
  return {
    nombre_comprador: datos.nombre_comprador,
    correo: datos.correo,
    telefono: datos.telefono,
    items: Carrito.obtener().map(linea => ({ id_producto: linea.id_producto, cantidad: linea.cantidad }))
  };
}

async function enviarPedido(evento) {
  if (evento) evento.preventDefault();
  if (enviandoPedido) return;   // ya hay un envío en curso: se ignora el segundo clic o Enter
  limpiarAvisoCompra();
  if (Carrito.obtener().length === 0) { mostrarPantallaCompra('vacio'); return; }

  const datos = leerDatosCompra();
  const errores = validarDatosCompra(datos);
  mostrarErroresCampos(errores);
  if (enfocarPrimerErrorCampo(errores)) return;

  if (problemaStock) { problemaStock = null; dibujarResumenCompra(); }   // se quita la marca del intento anterior
  enviandoPedido = true;
  ponerEnviando(true);
  let pedido = null;
  try {
    pedido = await crearPedido(armarPedido(datos));
  } catch (error) {
    enviandoPedido = false;
    ponerEnviando(false);
    if (!vistaCompra.hidden) manejarErrorPedido(error);
    return;
  }
  enviandoPedido = false;
  ponerEnviando(false);
  terminarCompra(pedido);
}

/* ---------- Eventos ---------- */
compraFormulario.addEventListener('submit', enviarPedido);
// Al corregir un campo se quita su mensaje de error
CAMPOS_COMPRA.forEach(campo => campo.input.addEventListener('input', () => quitarErrorCampo(campo)));