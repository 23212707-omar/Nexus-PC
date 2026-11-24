/* compatibilidad.js – Pantalla 6: compatibilidad (#/compatibilidad/ID). Función deseable (RF-08).
   Muestra el componente elegido, las categorías y la lista de productos de una categoría marcados como
   compatibles o no con ese componente y con el carrito (POST /api/compatibilidad, sección 5.6 de la especificación).
   Usa cosas de api.js, app.js, detalle.js y compra.js (se llaman cuando alguien usa la pantalla, no al cargar):
   obtenerProducto, obtenerCompatibilidad, cargarCategorias, categorias, crearImagen, crearEtiqueta, formatoPesos,
   actualizarVistaCarrito, piezasEnCarrito, crearBotonAccion y crearEnlaceAccion.
   Todos los nombres nuevos llevan el prefijo "compat" para no chocar con los de las otras pantallas. */

// Atajos a los elementos del HTML (la vista de compatibilidad está en index.html)
const compatMensaje = document.getElementById('compat-mensaje');
const compatContenido = document.getElementById('compat-contenido');
const compatTitulo = document.getElementById('compat-titulo');
const compatBaseCaja = document.getElementById('compat-base');
const compatChips = document.getElementById('compat-chips');
const compatLeyenda = document.getElementById('compat-leyenda');
const compatResumen = document.getElementById('compat-resumen');
const compatEstado = document.getElementById('compat-estado');
const compatLista = document.getElementById('compat-lista');
const compatDialogo = document.getElementById('compat-dialogo');
const compatDialogoTexto = document.getElementById('compat-dialogo-texto');
const compatDialogoCancelar = document.getElementById('compat-dialogo-cancelar');
const compatDialogoConfirmar = document.getElementById('compat-dialogo-confirmar');

let compatPeticion = 0;          // Número de la última carga de la pantalla (para ignorar respuestas viejas)
let compatListaPeticion = 0;     // Número de la última petición de la lista (para ignorar respuestas viejas)
let compatBase = null;           // El producto elegido (el que viene de GET /api/productos/:id)
let compatCategoria = null;      // La categoría que se está listando
let compatPendiente = null;      // { producto, aviso } del incompatible que espera la decisión de la persona
let compatMensajeFila = null;    // { id, texto } aviso que se muestra en una fila después de redibujar la lista

// Categoría con la que se abre la pantalla: la primera que tiene regla con el producto elegido
// (el almacenamiento no tiene ninguna regla: se abre con procesadores)
const COMPAT_CATEGORIA_INICIAL = {
  'Procesadores': 'Tarjetas madre',
  'Tarjetas madre': 'Procesadores',
  'Memoria RAM': 'Tarjetas madre',
  'Gabinetes': 'Tarjetas madre',
  'Tarjetas de video': 'Fuentes de poder',
  'Fuentes de poder': 'Procesadores',
  'Almacenamiento': 'Procesadores'
};

// Datos clave del componente elegido, en este orden: [clave de la API, cómo se escribe]
const COMPAT_DATOS_CLAVE = [
  ['socket', v => 'Socket ' + v],
  ['tipo_ram', v => 'Memoria ' + v],
  ['formato_placa', v => 'Placa ' + v],
  ['formatos_soportados', v => 'Soporta ' + v],
  ['consumo_w', v => v + ' W'],
  ['nucleos', v => v + ' núcleos'],
  ['potencia_w', v => 'Potencia ' + v + ' W'],
  ['memoria_gb', v => v + ' GB de video'],
  ['fuente_recomendada_w', v => 'Fuente recomendada ' + v + ' W'],
  ['capacidad_gb', v => v + ' GB'],
  ['velocidad_mhz', v => v + ' MHz'],
  ['tipo', v => v]
];

function compatTextoValor(valor) { return Array.isArray(valor) ? valor.join(', ') : String(valor); }

// "Socket AM5 · 120 W · 8 núcleos": solo con las claves que existan en las especificaciones
function compatDatosClave(especificaciones) {
  const datos = [];
  COMPAT_DATOS_CLAVE.forEach(([clave, formato]) => {
    const valor = especificaciones ? especificaciones[clave] : undefined;
    if (valor !== undefined && valor !== null && valor !== '') datos.push(formato(compatTextoValor(valor)));
  });
  return datos.join(' · ');
}

function compatTextoSoloHay(stock) {
  return stock === 1 ? 'Solo hay 1 pieza disponible.' : 'Solo hay ' + stock + ' piezas disponibles.';
}

/* ---------- Mensajes: cargando, error, producto inexistente ---------- */
// Escribe un mensaje en una caja (la de la pantalla o la de la lista); "acciones" son botones o enlaces
function compatEscribirMensaje(caja, texto, conMarco, acciones) {
  caja.className = conMarco ? 'mensaje mensaje--error' : 'mensaje';
  caja.textContent = texto;
  if (acciones && acciones.length) {
    const fila = document.createElement('div');
    fila.className = 'mensaje-acciones';
    acciones.forEach(accion => fila.appendChild(accion));
    caja.appendChild(fila);
  }
  caja.hidden = false;
}

// Sin "estado" en el error = no hubo respuesta del servidor (sin conexión); con "estado" = falla de la API
function compatMostrarError(caja, error, alReintentar) {
  const sinConexion = Boolean(error) && error.estado === undefined;
  const texto = sinConexion
    ? 'No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo.'
    : 'No se pudo cargar la compatibilidad.';
  compatEscribirMensaje(caja, texto, true, [
    crearBotonAccion('Reintentar', 'boton-principal', alReintentar),
    crearEnlaceAccion('Volver al carrito', '#/carrito')
  ]);
}

function compatMostrarNoEncontrado() {
  document.title = 'Producto no encontrado – Nexus PC';
  compatContenido.hidden = true;
  compatEscribirMensaje(compatMensaje,
    'No encontramos este producto. Puede que ya no esté a la venta o que la dirección esté mal escrita.',
    true, [crearEnlaceAccion('Volver al carrito', '#/carrito')]);
}

/* ---------- Componente elegido ---------- */
function compatDibujarBase(base) {
  compatBaseCaja.textContent = '';

  // Imagen decorativa: el nombre ya está escrito al lado
  const imagen = document.createElement('div');
  imagen.className = 'compat-base-imagen';
  imagen.appendChild(crearImagen({ nombre: '', imagen_url: base.imagen_url }));

  const datos = document.createElement('div');
  datos.className = 'compat-base-datos';
  const etiqueta = document.createElement('p');
  etiqueta.className = 'compat-base-etiqueta';
  etiqueta.textContent = 'Componente elegido · ' + base.marca;
  const nombre = document.createElement('h2');
  nombre.className = 'compat-base-nombre';
  nombre.textContent = base.nombre;
  const claves = compatDatosClave(base.especificaciones);
  datos.append(etiqueta, nombre);
  if (claves) {
    const detalle = document.createElement('p');
    detalle.className = 'compat-base-claves';
    detalle.textContent = claves;
    datos.appendChild(detalle);
  }

  const volver = document.createElement('a');
  volver.className = 'compat-volver';
  volver.href = '#/carrito';
  volver.textContent = 'Volver al carrito';

  compatBaseCaja.append(imagen, datos, volver);
}

/* ---------- Chips de categorías ---------- */
function compatResaltarChip(idCategoria) {
  compatChips.querySelectorAll('button').forEach(boton => {
    boton.setAttribute('aria-current', String(Number(boton.dataset.id) === idCategoria));
  });
}

function compatEnfocarChipActivo() {
  const activo = compatChips.querySelector('button[aria-current="true"]');
  if (activo) activo.focus();
}

function compatDibujarChips() {
  compatChips.textContent = '';
  categorias.forEach(categoria => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'compat-chip';
    boton.dataset.id = categoria.id_categoria;
    boton.textContent = categoria.nombre;
    boton.setAttribute('aria-current', 'false');
    boton.addEventListener('click', () => {
      if (compatCategoria && compatCategoria.id_categoria === categoria.id_categoria) return;   // ya es la activa
      compatCargarLista(categoria);
    });
    compatChips.appendChild(boton);
  });
}

/* ---------- Una fila por producto ---------- */
// Aviso breve junto al botón (se quita solo a los 3 segundos)
function compatMostrarAviso(aviso, texto) {
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => { aviso.hidden = true; }, 3000);
}

// "marcar" es false cuando no hay regla entre las dos categorías: entonces no se pinta ✔ ni ✘
function compatCrearFila(producto, marcar) {
  const incompatible = marcar && !producto.compatible;
  const agotado = producto.estado === 'Agotado' || producto.stock < 1;

  const fila = document.createElement('li');
  fila.className = 'compat-fila' + (incompatible ? ' compat-fila--no' : '') + (marcar ? '' : ' compat-fila--sin-marca');
  fila.dataset.id = producto.id_producto;

  // ✔ o ✘ (decorativo: el texto para lectores de pantalla va junto al nombre)
  if (marcar) {
    const marca = document.createElement('span');
    marca.className = 'compat-marca';
    marca.setAttribute('aria-hidden', 'true');
    marca.textContent = incompatible ? '✘' : '✔';
    fila.appendChild(marca);
  }

  // Imagen decorativa (el nombre ya está escrito al lado)
  const imagen = document.createElement('div');
  imagen.className = 'compat-imagen';
  imagen.appendChild(crearImagen({ nombre: '', imagen_url: producto.imagen_url }));

  // Marca, nombre y, si no es compatible, el motivo que dice la API
  const info = document.createElement('div');
  info.className = 'compat-info';
  const marcaProducto = document.createElement('div');
  marcaProducto.className = 'marca';
  marcaProducto.textContent = producto.marca;
  const nombre = document.createElement('div');
  nombre.className = 'compat-nombre';
  if (marcar) {
    const lector = document.createElement('span');
    lector.className = 'solo-lectores';
    lector.textContent = incompatible ? 'No compatible: ' : 'Compatible: ';
    nombre.appendChild(lector);
  }
  nombre.append(producto.nombre);
  info.append(marcaProducto, nombre);
  if (incompatible && producto.motivo) {
    const motivo = document.createElement('p');
    motivo.className = 'compat-motivo';
    const etiquetaMotivo = document.createElement('span');
    etiquetaMotivo.className = 'solo-lectores';
    etiquetaMotivo.textContent = 'Motivo: ';
    motivo.append(etiquetaMotivo, producto.motivo);
    info.appendChild(motivo);
  }

  // Precio y disponibilidad
  const importe = document.createElement('div');
  importe.className = 'compat-importe';
  const precio = document.createElement('span');
  precio.className = 'precio';
  precio.textContent = formatoPesos.format(producto.precio);
  importe.append(precio, crearEtiqueta(producto.estado));

  // Botón Agregar (más suave si no es compatible) y aviso de stock
  const accion = document.createElement('div');
  accion.className = 'compat-accion';
  const aviso = document.createElement('p');
  aviso.className = 'aviso-stock';
  aviso.setAttribute('role', 'status');
  aviso.hidden = true;
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton-agregar' + (incompatible ? ' compat-agregar--suave' : '');
  if (agotado) {
    boton.disabled = true;
    boton.textContent = 'Agotado';
  } else {
    boton.textContent = 'Agregar';
    boton.setAttribute('aria-label', 'Agregar al carrito: ' + producto.nombre + (incompatible ? ' (no compatible)' : ''));
    boton.addEventListener('click', () => compatAlPulsarAgregar(producto, incompatible, aviso));
  }
  accion.append(boton, aviso);

  fila.append(imagen, info, importe, accion);

  // Si se acaba de agregar este producto y la lista se redibujó, se vuelve a mostrar la confirmación
  if (compatMensajeFila && compatMensajeFila.id === producto.id_producto) {
    compatMostrarAviso(aviso, compatMensajeFila.texto);
    compatMensajeFila = null;
  }
  return fila;
}

/* ---------- Agregar al carrito ---------- */
function compatAlPulsarAgregar(producto, incompatible, aviso) {
  // Primero el stock: si ya no hay piezas, no tiene sentido preguntar por la compatibilidad
  if (producto.stock - piezasEnCarrito(producto.id_producto) < 1) {
    compatMostrarAviso(aviso, compatTextoSoloHay(producto.stock));
    return;
  }
  if (incompatible) compatAbrirDialogo(producto, aviso);
  else compatAgregarAlCarrito(producto, aviso);
}

function compatAgregarAlCarrito(producto, aviso) {
  const resultado = Carrito.agregar(producto);
  if (!resultado.ok) {
    compatMostrarAviso(aviso, compatTextoSoloHay(resultado.stock));
    return;
  }
  actualizarVistaCarrito();   // contador y vista rápida del encabezado
  const texto = 'Agregado al carrito.';
  // En fuentes (R3) el resultado depende del carrito: se vuelve a pedir la lista con el carrito nuevo
  if (producto.regla === 'R3') {
    compatMensajeFila = { id: producto.id_producto, texto: texto };
    compatRefrescarLista();
  } else {
    compatMostrarAviso(aviso, texto);
  }
}

/* ---------- Aviso al agregar un incompatible (ventana modal) ---------- */
function compatAbrirDialogo(producto, aviso) {
  compatPendiente = { producto: producto, aviso: aviso };
  compatDialogoTexto.textContent = '';
  const nombre = document.createElement('p');
  nombre.className = 'compat-dialogo-producto';
  nombre.textContent = producto.nombre;
  const motivo = document.createElement('p');
  motivo.textContent = producto.motivo ? 'Motivo: ' + producto.motivo + '.' : 'No es compatible con ' + compatBase.nombre + '.';
  const aclaracion = document.createElement('p');
  aclaracion.textContent = 'Puedes agregarlo, pero es posible que estas piezas no funcionen juntas.';
  compatDialogoTexto.append(nombre, motivo, aclaracion);
  compatDialogo.returnValue = '';   // si se cierra con Escape, no debe quedar la respuesta de la vez anterior
  compatDialogo.showModal();        // Escape, trampa de foco y regreso del foco al botón ya vienen incluidos
}

compatDialogoCancelar.addEventListener('click', () => compatDialogo.close('cancelar'));
compatDialogoConfirmar.addEventListener('click', () => compatDialogo.close('confirmar'));
// Un clic en el fondo oscuro (fuera de la caja) equivale a cancelar
compatDialogo.addEventListener('click', evento => { if (evento.target === compatDialogo) compatDialogo.close('cancelar'); });
compatDialogo.addEventListener('close', () => {
  const pendiente = compatPendiente;
  compatPendiente = null;
  if (pendiente && compatDialogo.returnValue === 'confirmar') {
    compatAgregarAlCarrito(pendiente.producto, pendiente.aviso);
  }
});

/* ---------- Lista de la categoría ---------- */
function compatCrearGrupo(productos, marcar, nombreGrupo) {
  const grupo = document.createElement('ul');
  grupo.className = 'compat-grupo';
  grupo.setAttribute('aria-label', nombreGrupo);
  productos.forEach(producto => grupo.appendChild(compatCrearFila(producto, marcar)));
  return grupo;
}

function compatCrearNota(texto) {
  const nota = document.createElement('p');
  nota.className = 'aviso-stock compat-nota';
  nota.textContent = texto;
  return nota;
}

function compatContar(n, singular, plural) { return n + ' ' + (n === 1 ? singular : plural); }

// Dibuja la lista tal como la devolvió la API: compatibles primero y después los incompatibles, sin reordenar
function compatDibujarLista(productos, categoria) {
  // D-13: la API incluye al producto elegido si es de la categoría listada; no se pinta
  const visibles = productos.filter(p => p.id_producto !== compatBase.id_producto);
  compatLista.textContent = '';
  compatEstado.hidden = true;
  compatResumen.textContent = '';

  if (visibles.length === 0) {
    compatLeyenda.hidden = true;
    compatEscribirMensaje(compatEstado, 'Esta categoría no tiene productos.', false);
    return;
  }

  // Sin regla entre las dos categorías la API manda regla = null: no se puede decir ✔ ni ✘
  const hayRegla = visibles.some(p => p.regla !== null);
  compatLeyenda.hidden = !hayRegla;
  const caja = document.createElement('div');
  caja.className = 'compat-caja';

  if (!hayRegla) {
    compatLista.appendChild(compatCrearNota(categoria.nombre === compatBase.categoria
      ? 'Estás viendo la misma categoría del componente elegido: no hay reglas de compatibilidad entre ellos.'
      : 'No hay una regla de compatibilidad entre ' + compatBase.categoria + ' y ' + categoria.nombre + '.'));
    compatResumen.textContent = compatContar(visibles.length, 'producto', 'productos');
    caja.appendChild(compatCrearGrupo(visibles, false, 'Productos'));
  } else {
    const compatibles = visibles.filter(p => p.compatible);
    const incompatibles = visibles.filter(p => !p.compatible);
    compatResumen.textContent = compatContar(compatibles.length, 'compatible', 'compatibles') + ' · ' +
                                compatContar(incompatibles.length, 'no compatible', 'no compatibles');
    if (compatibles.length > 0) {
      caja.appendChild(compatCrearGrupo(compatibles, true, 'Compatibles'));
    } else {
      compatLista.appendChild(compatCrearNota('Ningún producto de esta categoría es compatible con ' + compatBase.nombre + '.'));
    }
    if (incompatibles.length > 0) {
      const separador = document.createElement('h2');
      separador.className = 'compat-separador';
      separador.textContent = 'No compatibles con ' + compatBase.nombre;
      caja.append(separador, compatCrearGrupo(incompatibles, true, 'No compatibles'));
    }
  }
  compatLista.appendChild(caja);
}

// Los ids del carrito actual (puede ser una lista vacía)
function compatIdsCarrito() { return Carrito.obtener().map(linea => linea.id_producto); }

// 404: puede ser el producto elegido o algún producto del carrito que ya no existe (se distingue por detalles)
function compatManejarErrorLista(error, categoria) {
  if (error.estado === 404) {
    const id = error.detalles ? error.detalles.id_producto : null;
    if (id === compatBase.id_producto) {
      compatMostrarNoEncontrado();
    } else {
      compatLeyenda.hidden = true;
      compatEscribirMensaje(compatEstado, 'Un producto de tu carrito ya no existe en la tienda. Revisa tu carrito.',
        true, [crearEnlaceAccion('Volver al carrito', '#/carrito')]);
    }
    return;
  }
  compatLeyenda.hidden = true;
  compatMostrarError(compatEstado, error, () => { compatCargarLista(categoria); compatEnfocarChipActivo(); });
}

async function compatCargarLista(categoria) {
  const peticion = ++compatListaPeticion;
  compatCategoria = categoria;
  compatResaltarChip(categoria.id_categoria);
  compatLista.textContent = '';
  compatResumen.textContent = '';
  compatLeyenda.hidden = false;
  compatEscribirMensaje(compatEstado, 'Cargando...', false);
  try {
    const respuesta = await obtenerCompatibilidad(compatBase.id_producto, categoria.id_categoria, compatIdsCarrito());
    if (peticion !== compatListaPeticion) return;   // la persona ya eligió otra categoría o salió de la pantalla
    compatDibujarLista(respuesta.productos, categoria);
  } catch (error) {
    if (peticion !== compatListaPeticion) return;
    compatManejarErrorLista(error, categoria);
  }
}

// Vuelve a pedir la lista sin mostrar "Cargando..." (después de agregar una fuente). Si falla, se queda la lista que había.
async function compatRefrescarLista() {
  const peticion = ++compatListaPeticion;
  const categoria = compatCategoria;
  try {
    const respuesta = await obtenerCompatibilidad(compatBase.id_producto, categoria.id_categoria, compatIdsCarrito());
    if (peticion !== compatListaPeticion) return;
    // El botón que tenía el foco se vuelve a crear: el foco pasa al botón del mismo producto
    const activo = document.activeElement;
    const filaActiva = activo && activo.closest ? activo.closest('.compat-fila') : null;
    const idEnfocado = filaActiva ? filaActiva.dataset.id : null;
    compatDibujarLista(respuesta.productos, categoria);
    if (idEnfocado) {
      const nuevo = compatLista.querySelector('.compat-fila[data-id="' + idEnfocado + '"] .boton-agregar');
      if (nuevo) nuevo.focus();
    }
  } catch (error) {
    compatMensajeFila = null;
  }
}

/* ---------- Abrir la pantalla (lo llama app.js cuando la dirección es #/compatibilidad/ID) ---------- */
async function mostrarCompatibilidad(idTexto) {
  const peticion = ++compatPeticion;
  compatListaPeticion += 1;   // se ignora cualquier lista que siga pendiente
  compatBase = null;
  compatCategoria = null;
  compatMensajeFila = null;
  compatContenido.hidden = true;
  compatBaseCaja.textContent = '';
  compatChips.textContent = '';
  compatLista.textContent = '';
  document.title = 'Compatibilidad – Nexus PC';
  window.scrollTo(0, 0);
  compatTitulo.focus({ preventScroll: true });

  // Una dirección como #/compatibilidad/abc ni siquiera se pregunta a la API
  if (!/^\d{1,10}$/.test(idTexto)) {
    compatMostrarNoEncontrado();
    return;
  }
  compatEscribirMensaje(compatMensaje, 'Cargando...', false);
  try {
    // El producto elegido y las categorías (para los chips y el menú del encabezado) se piden a la vez
    const [base, categoriasListas] = await Promise.all([obtenerProducto(Number(idTexto)), cargarCategorias()]);
    if (peticion !== compatPeticion) return;   // la persona ya abrió otra pantalla
    if (!categoriasListas || categorias.length === 0) {
      compatMostrarError(compatMensaje, null, () => mostrarCompatibilidad(idTexto));
      return;
    }
    compatBase = base;
    document.title = 'Compatibilidad con ' + base.nombre + ' – Nexus PC';
    compatDibujarBase(base);
    compatDibujarChips();
    compatMensaje.hidden = true;
    compatContenido.hidden = false;
    const inicial = categorias.find(c => c.nombre === COMPAT_CATEGORIA_INICIAL[base.categoria]) || categorias[0];
    compatCargarLista(inicial);
  } catch (error) {
    if (peticion !== compatPeticion) return;
    // 404 = no existe; 400 = el id no es válido para la API. Los dos se muestran igual.
    if (error.estado === 404 || error.estado === 400) compatMostrarNoEncontrado();
    else compatMostrarError(compatMensaje, error, () => mostrarCompatibilidad(idTexto));
  }
}

// Al salir de la pantalla: se ignoran las respuestas pendientes y se cierra la ventana modal si estaba abierta
function cancelarCompatibilidad() {
  compatPeticion += 1;
  compatListaPeticion += 1;
  if (compatDialogo.open) compatDialogo.close('cancelar');
}
