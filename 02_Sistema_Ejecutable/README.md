# Sistema ejecutable

Versión de **Nexus PC** lista para ejecutarse sin tener que revisar el código fuente.
Esta carpeta todavía no contiene el paquete final: se llenará en las etapas posteriores del proyecto.

## Qué contendrá

- El backend (API en Node.js y Express) junto con la página web (HTML, CSS y JavaScript), que Express sirve desde la misma dirección.
- Un archivo `.env.example` con las variables de conexión a SQL Server (el `.env` real nunca se sube al repositorio).
- Los scripts de la base de datos necesarios para dejar el sistema funcionando.

## Mientras tanto: cómo ejecutar el sistema

Se ejecuta desde el código fuente. Los pasos completos están en el [README principal](../README.md); en resumen:

1. Crear la base de datos con `03_Base_de_Datos/NexusPC.sql` y el usuario `nexus_app` con `03_Base_de_Datos/Crear_Usuario_API.sql`.
2. En `01_Codigo_Fuente/backend`: copiar `.env.example` como `.env`, escribir los datos de conexión y ejecutar `npm install`.
3. Ejecutar `npm start` y abrir `http://localhost:3000`.

## Requisitos

| Requisito | Detalle |
|---|---|
| Node.js | 18.19 o superior |
| SQL Server | Express o Developer completo (LocalDB no sirve) |
| Navegador | Cualquiera actual (Chrome, Edge o Firefox) |
