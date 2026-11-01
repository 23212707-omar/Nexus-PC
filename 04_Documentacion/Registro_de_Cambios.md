# Registro de cambios – Nexus PC

Este archivo registra todos los cambios al alcance, los requerimientos o el diseño del proyecto,
según el mecanismo de control de cambios del Plan de Calidad (sección 14).
Cada cambio tiene su issue en GitHub con la etiqueta "solicitud de cambio".

## Resumen de versiones

| Versión | Fecha | ID | Descripción breve | Solicitó | Aprobó | Estado | Issue |
|---|---|---|---|---|---|---|---|
| 0.1 | 3 oct 2026 | – | Línea base: Plan de Calidad inicial con alcance clasificado por prioridad | Equipo | Equipo | Cerrado | – |
| 0.2 | 17 oct 2026 | CAM-001 | Datos del comprador: nombre y correo obligatorios, teléfono opcional | Omar | Daniel, con acuerdo de Omar | Cerrado | #7 |
| 0.2 | 17 oct 2026 | CAM-002 | Alinear base de datos y API con wireframes y catálogo (30 productos, claves unificadas, 6 rutas) | Angel | Daniel, con acuerdo de Andrés | Cerrado | #8 |
| 0.3 | 27 oct 2026 | CAM-003 | Ampliación del alcance: paquetes predefinidos de componentes con programas (Deseable 2) | Omar | Equipo (acuerdo de todos) | En desarrollo | #11 |
| 0.3 | 27 oct 2026 | CAM-004 | Ampliación del alcance: administrador del catálogo (Deseable 3) y cuentas de usuario con roles (Deseable 4) | Omar | Equipo (acuerdo de todos) | En desarrollo | #12 |

## Detalle de cada cambio

### CAM-001 – Datos del comprador en el pedido
- **Motivo:** el script SQL, la API y el wireframe de la Pantalla 5 pedían datos distintos del comprador.
- **Cambio:** nombre y correo obligatorios, teléfono opcional.
- **Partes afectadas:** base de datos (script SQL), API (POST /api/pedidos), pruebas.
- **Decisión:** aprobado el sábado 17 de octubre de 2026 por Daniel, con acuerdo de Omar.
- **Implementación:** [Pull Request #9](https://github.com/23212707-omar/Nexus-PC/pull/9) (script de base de datos).
- **Verificación:** probado por Daniel; confirmado por Andrés el sábado 17 de octubre de 2026.
- **Cierre:** sábado 17 de octubre de 2026.

### CAM-002 – Alinear base de datos y API con wireframes y catálogo
- **Motivo:** inconsistencias entre el script, la especificación de la API y los wireframes.
- **Cambio:** claves de especificaciones unificadas, catálogo ampliado de 10 a 30 productos, el servidor calcula precios y total, nueva ruta de categorías, compatibilidad rediseñada, errores separados, pedidos protegidos con clave.
- **Partes afectadas:** base de datos (script v0.2), API (especificación v0.2), documentos.
- **Decisión:** aprobado el sábado 17 de octubre de 2026 por Daniel, con acuerdo de Andrés.
- **Implementación:** [Pull Request #9](https://github.com/23212707-omar/Nexus-PC/pull/9) (base de datos v0.2) y [Pull Request #10](https://github.com/23212707-omar/Nexus-PC/pull/10) (especificación de la API v0.2).
- **Verificación:** probado por Daniel; confirmado por Andrés el sábado 17 de octubre de 2026.
- **Cierre:** sábado 17 de octubre de 2026.

### CAM-003 – Paquetes predefinidos de componentes con programas
- **Motivo:** ofrecer al comprador conjuntos de piezas ya validados para un uso concreto (juegos, productividad y simulación), con los programas cuyos requisitos recomendados cubren.
- **Cambio:** nueva función Deseable 2 (RF-09, que incluye el antiguo RF-10). Un paquete se agrega al carrito como un solo artículo y el servidor lo expande en sus piezas al registrar el pedido. Ningún paquete contiene piezas incompatibles según las reglas de RF-08.
- **Partes afectadas:** base de datos (script v0.3: paquetes y programas), API (rutas de paquetes e `id_paquete` en pedidos), interfaz (paquetes y carrito con paquete), pruebas, Plan del Proyecto y Plan de Calidad.
- **Prioridad:** segunda entre las funciones deseables, después de la compatibilidad. Sujeta a la revisión del 3 de noviembre de 2026.
- **Decisión:** solicitado por Omar el sábado 24 de octubre de 2026; aprobado por acuerdo de todo el equipo. Omar cerró el issue #11 el martes 27 de octubre de 2026.
- **Implementación:** pendiente (Etapa III). Se agregará el enlace al pull request cuando exista.
- **Verificación:** pendiente.
- **Cierre:** pendiente.

### CAM-004 – Administrador del catálogo y cuentas de usuario
- **Motivo:** permitir que la tienda mantenga su catálogo sin editar la base de datos a mano, y que los compradores conserven su historial.
- **Cambio:** dos capas.
  - **Deseable 3, administrador (RF-11 a RF-14):** agregar y editar productos, ajustar el stock, desactivar productos (campo `Activo`) y consultar pedidos, protegido con una clave.
  - **Deseable 4, cuentas y roles (RF-15 a RF-17 y RNF-08):** registro, inicio de sesión, historial "Mis pedidos" y datos del comprador precargados. La compra como invitado se mantiene. Las contraseñas se guardan con hash.
- **Partes afectadas:** base de datos (script v0.3: usuarios y `Activo`), API, interfaz (pantallas de administración, sesión, registro y "Mis pedidos"), pruebas, Plan del Proyecto y Plan de Calidad.
- **Prioridad:** tercera y cuarta entre las funciones deseables. Sujetas a la revisión del 3 de noviembre de 2026; lo que no alcance pasa a trabajo futuro, de abajo hacia arriba.
- **Decisión:** solicitado por Omar el sábado 24 de octubre de 2026; aprobado por acuerdo de todo el equipo. Omar cerró el issue #12 el martes 27 de octubre de 2026.
- **Implementación:** pendiente (Etapa III). Se agregará el enlace al pull request cuando exista.
- **Verificación:** pendiente.
- **Cierre:** pendiente.

## Cómo actualizar este registro
1. Cuando se abre una solicitud de cambio, agregar una fila al resumen con estado "Pendiente".
2. Cuando Daniel decide, anotar quién aprobó, la fecha y el motivo. Si se rechaza o se pospone, también se registra.
3. Cuando el pull request se integra y Andrés confirma, completar implementación y verificación, y cambiar el estado a "Cerrado".
4. Todo cambio nuevo lleva un ID consecutivo (CAM-005, CAM-006...) y se menciona en los commits.

## Convenciones
- **Versiones:** 0.x durante el desarrollo y 1.0 en la entrega final. Los cambios aprobados juntos comparten versión.
- **Estados:** Pendiente, En desarrollo, Cerrado, Rechazado, Pospuesto.
- **Congelamiento de funciones:** después del 11 de noviembre solo se corrigen errores.
