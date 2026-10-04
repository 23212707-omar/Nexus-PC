# Nexus PC

Sistema de venta de componentes de computadora en línea, con verificación de compatibilidad entre piezas.
Tienda ficticia desarrollada con fines académicos para la materia **Gestión de Proyectos de Software**
(Tecnológico Nacional de México – Instituto Tecnológico de Tijuana).

**Estado actual:** Etapa I – Gestión de calidad (estructura inicial del proyecto).

## Integrantes

| Integrante | Rol principal |
|---|---|
| Daniel | Líder del proyecto y base de datos |
| Angel | Backend (API) |
| Omar | Frontend y diseño |
| Andrés | Documentación y responsable de pruebas y calidad |

Profesora: Mtra. María Guadalupe Rodríguez López

## Tecnologías utilizadas

- **Lenguaje de programación:** JavaScript
- **Servidor:** Node.js y Express
- **Base de datos:** SQL Server (administrada con SQL Server Management Studio)
- **Conexión a la base de datos:** paquete `mssql`; credenciales con `dotenv`
- **Página web:** HTML y CSS
- **Control de versiones:** Git y GitHub (Issues, Pull Requests y GitHub Projects)

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `01_Codigo_Fuente` | Código del backend (API) y del frontend (página web) |
| `02_Sistema_Ejecutable` | Versión del sistema lista para ejecutar |
| `03_Base_de_Datos` | Scripts SQL (tablas y datos de prueba) y modelo entidad-relación |
| `04_Documentacion` | Plan de Calidad y demás documentos del proyecto |
| `05_Manual_de_Usuario` | Manual de usuario |
| `06_Evidencias` | Evidencias de cada etapa |
| `07_Pruebas` | Plan, casos y resultados de pruebas |
| `08_Capturas_de_Pantalla` | Capturas del sistema funcionando |

## Instrucciones de instalación

> Se completarán cuando exista la primera versión ejecutable (Etapa II en adelante).

1. Instalar Node.js y SQL Server (con SSMS).
2. Ejecutar los scripts de `03_Base_de_Datos` para crear la base de datos.
3. En `01_Codigo_Fuente/backend`, copiar `.env.example` como `.env` y llenar los datos de conexión.
4. Instalar dependencias con `npm install`.

## Instrucciones para ejecutar el sistema

> Pendiente de completar.

## Credenciales de prueba

No aplica por ahora: el sistema no incluye inicio de sesión. Los datos de conexión a la base de datos
se configuran de forma local en el archivo `.env`, que no se sube al repositorio.

## Flujo de trabajo del equipo

- Nadie trabaja directamente sobre la rama `main`: cada cambio va en una rama propia y se integra con un Pull Request.
- Quien desarrolla una función la prueba primero; después la confirma el responsable de pruebas y calidad.
- Los mensajes de commit describen qué se cambió (ejemplo: `Agrega tabla Productos`).
- Los cambios al alcance se solicitan con un Issue de tipo "solicitud de cambio" (ver Plan de Calidad).
