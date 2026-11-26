# Pruebas

Plan de pruebas, casos de prueba y resultados de **Nexus PC**.
Responsable de confirmar las pruebas: Andrés.

Esta carpeta se irá llenando conforme avance el proyecto. Cada Pull Request lo revisa otro integrante y lo confirma el responsable de pruebas y calidad antes de cerrar su issue.

## Qué se prueba

| Parte | Qué se verifica | Dónde está hoy |
|---|---|---|
| Base de datos | 30 productos, claves obligatorias, reglas de compatibilidad y validaciones de `Pedidos` | Consultas de verificación al final de `../03_Base_de_Datos/NexusPC.sql` |
| API | Respuestas correctas y errores `400`, `404`, `409` y `500` con el formato único de error | `../04_Documentacion/Artefactos/API_Especificacion.md` y capturas `01` a `07` en `../08_Capturas_de_Pantalla` |
| Página web | Catálogo, detalle, carrito, compra, compatibilidad, vista móvil y accesibilidad | Capturas en `../08_Capturas_de_Pantalla` |
| Conexión | `npm run probar-conexion` debe mostrar 30 productos | `../01_Codigo_Fuente/backend/README.md` |

## Formato de un caso de prueba

| Campo | Contenido |
|---|---|
| ID | Identificador del caso |
| Requerimiento | Función que se prueba (por ejemplo, RF-08 compatibilidad) |
| Pasos | Qué se hace, en orden |
| Resultado esperado | Qué debe pasar |
| Resultado obtenido | Qué pasó realmente y si aprobó |
| Responsable y fecha | Quién lo probó y cuándo |

## Archivos previstos

- Plan de pruebas.
- Casos de prueba.
- Resultados y errores encontrados, enlazados a su issue en GitHub.
