# Registro de cambios – Nexus PC

Este archivo registra todos los cambios al alcance, los requerimientos o el diseño del proyecto,
según el mecanismo de control de cambios del Plan de Calidad (sección 14).
Cada cambio tiene su issue en GitHub con la etiqueta "solicitud de cambio".

## Resumen de versiones

| Versión | Fecha | ID | Descripción breve | Solicitó | Aprobó | Estado | Issue |
|---|---|---|---|---|---|---|---|
| 0.1 | 3 oct 2026 | – | Línea base: Plan de Calidad inicial con alcance clasificado por prioridad | Equipo | Equipo | Cerrado | – |
| 0.2 | 17 oct 2026 | CAM-001 | Datos del comprador: nombre y correo obligatorios, teléfono opcional | Omar | Daniel, con acuerdo de Omar | En desarrollo | #7 |
| 0.2 | 17 oct 2026 | CAM-002 | Alinear base de datos y API con wireframes y catálogo (30 productos, claves unificadas, 6 rutas) | Angel | Daniel, con acuerdo de Andres | En desarrollo | #8 |

## Detalle de cada cambio

### CAM-001 – Datos del comprador en el pedido
- **Motivo:** el script SQL, la API y el wireframe de la Pantalla 5 pedían datos distintos del comprador.
- **Cambio:** nombre y correo obligatorios, teléfono opcional.
- **Partes afectadas:** base de datos (script SQL), API (POST /api/pedidos), pruebas.
- **Decisión:** aprobado el sábado 17 de octubre de 2026 por Daniel, con acuerdo de Omar.
- **Implementación:** enlace
- **Verificación:** probado por Daniel; confirmado por Andrés el sábado 17 de octubre de 2026.
- **Cierre:** sábado 17 de octubre de 2026.

### CAM-002 – Alinear base de datos y API con wireframes y catálogo
- **Motivo:** inconsistencias entre el script, la especificación de la API y los wireframes.
- **Cambio:** claves de especificaciones unificadas, catálogo ampliado de 10 a 30 productos, el servidor calcula precios y total, nueva ruta de categorías, compatibilidad rediseñada, errores separados, pedidos protegidos con clave.
- **Partes afectadas:** base de datos (script v0.2), API (especificación v0.2), documentos.
- **Decisión:** aprobado el sábado 17 de octubre de 2026 por Daniel, con acuerdo de Andres.
- **Implementación:** enlace
- **Verificación:** probado por Daniel; confirmado por Andrés el sábado 17 de octubre de 2026.
- **Cierre:** sábado 17 de octubre de 2026.

## Cómo actualizar este registro
1. Cuando se abre una solicitud de cambio, agregar una fila al resumen con estado "Pendiente".
2. Cuando Daniel decide, anotar quién aprobó, la fecha y el motivo. Si se rechaza o se pospone, también se registra.
3. Cuando el pull request se integra y Andrés confirma, completar implementación y verificación, y cambiar el estado a "Cerrado".
4. Todo cambio nuevo lleva un ID consecutivo (CAM-003, CAM-004...) y se menciona en los commits.

## Convenciones
- **Versiones:** 0.x durante el desarrollo y 1.0 en la entrega final. Los cambios aprobados juntos comparten versión.
- **Estados:** Pendiente, En desarrollo, Cerrado, Rechazado, Pospuesto.
- **Congelamiento de funciones:** después del 11 de noviembre solo se corrigen errores.
