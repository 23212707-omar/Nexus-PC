/* =====================================================================
   Nexus PC - Usuario de la API (SQL Server)
   Version: v0.1  |  Responsable: Daniel
   Crea el inicio de sesion "nexus_app" con permisos minimos:
   solo leer (db_datareader) y escribir (db_datawriter) en NexusPC.
   NO es administrador y NO puede borrar tablas.

   ANTES DE EJECUTAR: cambia la contrasena en la linea DECLARE @pwd.
   Escribe la contrasena SOLO en tu copia local. NUNCA subas al
   repositorio la version con la contrasena real.
   Requisito: haber ejecutado antes NexusPC.sql (la base debe existir).
   ===================================================================== */

USE master;
GO

DECLARE @pwd NVARCHAR(128) = N'CAMBIAR_ESTA_CONTRASENA';   -- <<< AQUI VA LA CONTRASENA

IF @pwd = N'CAMBIAR_ESTA_CONTRASENA'
BEGIN
    RAISERROR('Escribe una contrasena real en @pwd antes de ejecutar (y no la subas al repositorio).', 16, 1);
    RETURN;
END;

IF DB_ID(N'NexusPC') IS NULL
BEGIN
    RAISERROR('La base NexusPC no existe. Ejecuta primero NexusPC.sql.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'nexus_app')
BEGIN
    DECLARE @sql NVARCHAR(MAX) =
        N'CREATE LOGIN nexus_app WITH PASSWORD = N''' + REPLACE(@pwd, N'''', N'''''') +
        N''', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF, DEFAULT_DATABASE = NexusPC;';
    EXEC (@sql);
    PRINT 'Inicio de sesion nexus_app creado.';
END
ELSE
    PRINT 'El inicio de sesion nexus_app ya existe (no se cambio su contrasena).';
GO

USE NexusPC;
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'nexus_app')
BEGIN
    RAISERROR('No existe el inicio de sesion nexus_app. Revisa los mensajes anteriores.', 16, 1);
    RETURN;
END;

IF DATABASE_PRINCIPAL_ID(N'nexus_app') IS NULL
    CREATE USER nexus_app FOR LOGIN nexus_app;

ALTER ROLE db_datareader ADD MEMBER nexus_app;
ALTER ROLE db_datawriter ADD MEMBER nexus_app;
PRINT 'Usuario nexus_app listo con db_datareader y db_datawriter.';
GO

-- Verificacion: deben salir dos filas (db_datareader y db_datawriter)
SELECT dp.name AS Usuario, r.name AS Rol
FROM sys.database_role_members m
JOIN sys.database_principals r  ON r.principal_id  = m.role_principal_id
JOIN sys.database_principals dp ON dp.principal_id = m.member_principal_id
WHERE dp.name = N'nexus_app';
GO

/* Para quitar el acceso (solo si lo necesitas):
   USE NexusPC;  DROP USER nexus_app;
   USE master;   DROP LOGIN nexus_app;
*/
