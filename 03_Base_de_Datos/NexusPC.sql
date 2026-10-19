/* =====================================================================
   Nexus PC - Script de base de datos (SQL Server)
   Version: v0.2  |  Responsable: Daniel
   Historial:
     v0.1 - Version inicial (5 tablas y 10 productos de ejemplo)
     v0.2 - CAM-001 y CAM-002
              CAM-001: Correo obligatorio en Pedidos y validacion de formato
              CAM-002: claves de especificaciones unificadas y catalogo de 30 productos
   Ejecutar completo en SSMS. Se puede correr varias veces: borra y
   recrea las tablas (solo para desarrollo, no usar con datos reales).
   Los precios son de referencia (MXN) con fines academicos.
   ===================================================================== */

IF DB_ID('NexusPC') IS NULL
    CREATE DATABASE NexusPC;
GO

USE NexusPC;
GO

/* ---------- Limpieza (orden inverso a las dependencias) ---------- */
IF OBJECT_ID('dbo.DetallePedido', 'U')            IS NOT NULL DROP TABLE dbo.DetallePedido;
IF OBJECT_ID('dbo.EspecificacionesProducto', 'U') IS NOT NULL DROP TABLE dbo.EspecificacionesProducto;
IF OBJECT_ID('dbo.Pedidos', 'U')                  IS NOT NULL DROP TABLE dbo.Pedidos;
IF OBJECT_ID('dbo.Productos', 'U')                IS NOT NULL DROP TABLE dbo.Productos;
IF OBJECT_ID('dbo.Categorias', 'U')               IS NOT NULL DROP TABLE dbo.Categorias;
GO

/* ---------- Tablas ---------- */
CREATE TABLE dbo.Categorias (
    IdCategoria INT IDENTITY(1,1) NOT NULL,
    Nombre      NVARCHAR(50)      NOT NULL,
    CONSTRAINT PK_Categorias        PRIMARY KEY (IdCategoria),
    CONSTRAINT UQ_Categorias_Nombre UNIQUE (Nombre)
);

CREATE TABLE dbo.Productos (
    IdProducto  INT IDENTITY(1,1) NOT NULL,
    IdCategoria INT               NOT NULL,
    Nombre      NVARCHAR(120)     NOT NULL,
    Marca       NVARCHAR(50)      NOT NULL,
    Descripcion NVARCHAR(500)     NULL,
    Precio      DECIMAL(10,2)     NOT NULL,
    Stock       INT               NOT NULL,
    ImagenUrl   NVARCHAR(255)     NULL,
    CONSTRAINT PK_Productos           PRIMARY KEY (IdProducto),
    CONSTRAINT FK_Productos_Categoria FOREIGN KEY (IdCategoria)
        REFERENCES dbo.Categorias (IdCategoria),
    CONSTRAINT CK_Productos_Precio    CHECK (Precio >= 0),
    CONSTRAINT CK_Productos_Stock     CHECK (Stock  >= 0)
);

-- CAM-001: Correo pasa a NOT NULL; Telefono sigue opcional.
--          Se elimina CK_Pedidos_Contacto y se agrega CK_Pedidos_Correo.
CREATE TABLE dbo.Pedidos (
    IdPedido        INT IDENTITY(1,1) NOT NULL,
    NombreComprador NVARCHAR(100)     NOT NULL,
    Correo          NVARCHAR(120)     NOT NULL,
    Telefono        NVARCHAR(20)      NULL,
    Fecha           DATETIME2(0)      NOT NULL CONSTRAINT DF_Pedidos_Fecha DEFAULT SYSDATETIME(),
    Total           DECIMAL(12,2)     NOT NULL,
    CONSTRAINT PK_Pedidos        PRIMARY KEY (IdPedido),
    CONSTRAINT CK_Pedidos_Total  CHECK (Total >= 0),
    -- Formato sencillo: algo + @ + algo + punto + algo (ej. a@b.com)
    CONSTRAINT CK_Pedidos_Correo CHECK (Correo LIKE '%_@_%._%')
);

CREATE TABLE dbo.DetallePedido (
    IdDetalle      INT IDENTITY(1,1) NOT NULL,
    IdPedido       INT               NOT NULL,
    IdProducto     INT               NOT NULL,
    Cantidad       INT               NOT NULL,
    PrecioUnitario DECIMAL(10,2)     NOT NULL,  -- precio al momento de la compra
    CONSTRAINT PK_DetallePedido          PRIMARY KEY (IdDetalle),
    CONSTRAINT FK_Detalle_Pedido         FOREIGN KEY (IdPedido)
        REFERENCES dbo.Pedidos (IdPedido) ON DELETE CASCADE,
    CONSTRAINT FK_Detalle_Producto       FOREIGN KEY (IdProducto)
        REFERENCES dbo.Productos (IdProducto),
    CONSTRAINT CK_Detalle_Cantidad       CHECK (Cantidad > 0),
    CONSTRAINT CK_Detalle_PrecioUnitario CHECK (PrecioUnitario >= 0),
    CONSTRAINT UQ_Detalle_PedidoProducto UNIQUE (IdPedido, IdProducto)
);

/* Especificaciones tecnicas (clave-valor) para las reglas de compatibilidad */
CREATE TABLE dbo.EspecificacionesProducto (
    IdProducto INT           NOT NULL,
    Clave      NVARCHAR(40)  NOT NULL,
    Valor      NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_Especificaciones          PRIMARY KEY (IdProducto, Clave),
    CONSTRAINT FK_Especificaciones_Producto FOREIGN KEY (IdProducto)
        REFERENCES dbo.Productos (IdProducto) ON DELETE CASCADE
);
GO

/* ---------- Datos de ejemplo ---------- */
-- Categorias (IDs 1 a 7)
INSERT INTO dbo.Categorias (Nombre) VALUES
(N'Procesadores'),      -- 1
(N'Tarjetas madre'),    -- 2
(N'Memoria RAM'),       -- 3
(N'Almacenamiento'),    -- 4
(N'Tarjetas de video'), -- 5
(N'Fuentes de poder'),  -- 6
(N'Gabinetes');         -- 7

/* Productos: IDs 1 a 10 (v0.1) e IDs 11 a 30 (CAM-002), en este orden.
   Distribucion: Procesadores 5, Tarjetas madre 5, Memoria RAM 4,
   Almacenamiento 4, Tarjetas de video 4, Fuentes de poder 4, Gabinetes 4.

   Casos de prueba que cubre el catalogo:
   - Agotado (Stock = 0): ID 20.  Pocas piezas (Stock 1 a 3): IDs 13, 16, 24.
   - Ecosistemas: AM5 con DDR5 y LGA1700 con DDR4 (hay pares no compatibles).
   - Tarjetas madre ATX: IDs 14 y 16. Gabinetes que NO aceptan ATX: IDs 10 y 29.
   - Fuentes de 450 W, 650 W, 750 W y 1000 W: hay combinaciones que fallan y que cumplen
     la regla de potencia (ej. 7800X3D + RTX 4090 requiere 741 W). */
INSERT INTO dbo.Productos (IdCategoria, Nombre, Marca, Descripcion, Precio, Stock, ImagenUrl) VALUES
(1, N'Ryzen 5 7600',                 N'AMD',          N'Procesador de 6 nucleos y 12 hilos, socket AM5.',            4500.00, 15, N'img/ryzen5-7600.jpg'),   -- 1
(1, N'Core i5-12400F',               N'Intel',        N'Procesador de 6 nucleos y 12 hilos, socket LGA1700.',        3200.00, 12, N'img/i5-12400f.jpg'),     -- 2
(2, N'PRO B650M-P',                  N'MSI',          N'Tarjeta madre micro-ATX para AM5 con memoria DDR5.',         3300.00, 10, N'img/msi-b650m-p.jpg'),   -- 3
(2, N'PRO B660M-A DDR4',             N'MSI',          N'Tarjeta madre micro-ATX para LGA1700 con memoria DDR4.',     2800.00,  8, N'img/msi-b660m-a.jpg'),   -- 4
(3, N'FURY Beast 16GB DDR5-5600',    N'Kingston',     N'Modulo de memoria DDR5 de 16 GB a 5600 MHz.',                1200.00, 25, N'img/fury-ddr5.jpg'),     -- 5
(3, N'Vengeance LPX 16GB DDR4-3200', N'Corsair',      N'Modulo de memoria DDR4 de 16 GB a 3200 MHz.',                 950.00, 30, N'img/vengeance-ddr4.jpg'),-- 6
(4, N'NV2 1TB NVMe',                 N'Kingston',     N'SSD NVMe PCIe de 1 TB.',                                     1100.00, 20, N'img/nv2-1tb.jpg'),       -- 7
(5, N'GeForce RTX 4060 8GB',         N'ASUS',         N'Tarjeta de video con 8 GB GDDR6.',                           7500.00,  6, N'img/rtx4060.jpg'),       -- 8
(6, N'CV650 650W 80 Plus Bronze',    N'Corsair',      N'Fuente de poder de 650 W.',                                  1300.00, 14, N'img/cv650.jpg'),         -- 9
(7, N'MasterBox Q300L',              N'Cooler Master',N'Gabinete micro-ATX compacto.',                               1100.00,  9, N'img/q300l.jpg'),         -- 10
-- CAM-002: productos nuevos (IDs 11 a 30)
(1, N'Ryzen 7 7800X3D',              N'AMD',          N'Procesador de 8 nucleos y 16 hilos con tecnologia 3D V-Cache, socket AM5.', 9200.00,  4, N'img/ryzen7-7800x3d.jpg'),      -- 11
(1, N'Core i5-13400F',               N'Intel',        N'Procesador de 10 nucleos y 16 hilos, socket LGA1700.',       4300.00, 10, N'img/i5-13400f.jpg'),            -- 12
(1, N'Core i7-13700K',               N'Intel',        N'Procesador de 16 nucleos y 24 hilos con multiplicador desbloqueado, socket LGA1700.', 7800.00, 3, N'img/i7-13700k.jpg'), -- 13
(2, N'TUF GAMING B650-PLUS',         N'ASUS',         N'Tarjeta madre ATX para AM5 con memoria DDR5.',               4300.00,  7, N'img/tuf-b650-plus.jpg'),        -- 14
(2, N'B760M DS3H DDR4',              N'Gigabyte',     N'Tarjeta madre micro-ATX para LGA1700 con memoria DDR4.',     2300.00, 12, N'img/gigabyte-b760m-ds3h.jpg'),  -- 15
(2, N'PRIME B760-PLUS D4',           N'ASUS',         N'Tarjeta madre ATX para LGA1700 con memoria DDR4.',           3400.00,  2, N'img/prime-b760-plus-d4.jpg'),   -- 16
(3, N'Vengeance 32GB (2x16GB) DDR5-6000', N'Corsair', N'Kit de memoria DDR5 de 32 GB (2 x 16 GB) a 6000 MHz.',       2700.00, 18, N'img/vengeance-ddr5-32gb.jpg'),  -- 17
(3, N'FURY Beast 32GB (2x16GB) DDR4-3200', N'Kingston', N'Kit de memoria DDR4 de 32 GB (2 x 16 GB) a 3200 MHz.',     1700.00, 20, N'img/fury-ddr4-32gb.jpg'),       -- 18
(4, N'870 EVO 500GB SATA',           N'Samsung',      N'SSD SATA de 500 GB.',                                        1200.00, 16, N'img/870-evo-500gb.jpg'),        -- 19
(4, N'Blue SN580 2TB NVMe',          N'Western Digital', N'SSD NVMe PCIe de 2 TB.',                              2400.00,  0, N'img/sn580-2tb.jpg'),            -- 20
(4, N'BarraCuda 2TB 7200 RPM',       N'Seagate',      N'Disco duro mecanico de 2 TB.',                               1150.00, 22, N'img/barracuda-2tb.jpg'),        -- 21
(5, N'PULSE Radeon RX 6600 8GB',     N'Sapphire',     N'Tarjeta de video con 8 GB GDDR6.',                           4200.00,  8, N'img/rx6600-pulse.jpg'),         -- 22
(5, N'GeForce RTX 4070 SUPER 12G VENTUS 2X', N'MSI',  N'Tarjeta de video con 12 GB GDDR6X.',                        14500.00,  5, N'img/rtx4070-super.jpg'),       -- 23
(5, N'GeForce RTX 4090 WINDFORCE 24G', N'Gigabyte',   N'Tarjeta de video de gama alta con 24 GB GDDR6X.',           42000.00,  1, N'img/rtx4090.jpg'),             -- 24
(6, N'CV450 450W 80 Plus Bronze',    N'Corsair',      N'Fuente de poder de 450 W.',                                   950.00, 17, N'img/cv450.jpg'),                -- 25
(6, N'RM1000x 1000W 80 Plus Gold',   N'Corsair',      N'Fuente de poder de 1000 W, certificacion 80 Plus Gold.',     4300.00,  4, N'img/rm1000x.jpg'),              -- 26
(6, N'RM750e 750W 80 Plus Gold',     N'Corsair',      N'Fuente de poder de 750 W, certificacion 80 Plus Gold.',      2500.00,  9, N'img/rm750e.jpg'),               -- 27
(7, N'4000D Airflow',                N'Corsair',      N'Gabinete ATX de media torre con buen flujo de aire.',        2100.00, 11, N'img/4000d.jpg'),                -- 28
(7, N'NR200',                        N'Cooler Master',N'Gabinete compacto para tarjetas madre Mini-ITX.',            2600.00,  6, N'img/nr200.jpg'),                -- 29
(7, N'H5 Flow',                      N'NZXT',         N'Gabinete ATX de media torre con panel frontal de malla.',    2300.00,  8, N'img/h5-flow.jpg');              -- 30

/* Diccionario de claves de especificaciones (CAM-002). Usar exactamente estas
   claves, con estas mayusculas y sin variantes:
     Procesadores      : Socket, ConsumoW, Nucleos
     Tarjetas madre    : Socket, TipoRAM, FormatoPlaca
     Memoria RAM       : TipoRAM, CapacidadGB, VelocidadMHz
     Almacenamiento    : Tipo, CapacidadGB
     Tarjetas de video : ConsumoW, MemoriaGB, FuenteRecomendadaW
     Fuentes de poder  : PotenciaW
     Gabinetes         : FormatosSoportados
   Formato de valores:
     Socket              AM5, LGA1700, etc.
     TipoRAM             DDR4 o DDR5
     FormatoPlaca        mATX, ATX o Mini-ITX
     FormatosSoportados  lista separada por comas SIN espacios (ej. ATX,mATX,Mini-ITX)
     Valores numericos   sin unidad (65, 16, 650) */
INSERT INTO dbo.EspecificacionesProducto (IdProducto, Clave, Valor) VALUES
-- 1 Ryzen 5 7600
(1, N'Socket', N'AM5'), (1, N'ConsumoW', N'65'), (1, N'Nucleos', N'6'),
-- 2 Core i5-12400F
(2, N'Socket', N'LGA1700'), (2, N'ConsumoW', N'65'), (2, N'Nucleos', N'6'),
-- 3 MSI B650M-P
(3, N'Socket', N'AM5'), (3, N'TipoRAM', N'DDR5'), (3, N'FormatoPlaca', N'mATX'),
-- 4 MSI B660M-A DDR4
(4, N'Socket', N'LGA1700'), (4, N'TipoRAM', N'DDR4'), (4, N'FormatoPlaca', N'mATX'),
-- 5 RAM DDR5 16GB
(5, N'TipoRAM', N'DDR5'), (5, N'CapacidadGB', N'16'), (5, N'VelocidadMHz', N'5600'),
-- 6 RAM DDR4 16GB
(6, N'TipoRAM', N'DDR4'), (6, N'CapacidadGB', N'16'), (6, N'VelocidadMHz', N'3200'),
-- 7 SSD NV2 1TB
(7, N'Tipo', N'NVMe'), (7, N'CapacidadGB', N'1000'),
-- 8 RTX 4060
(8, N'ConsumoW', N'115'), (8, N'MemoriaGB', N'8'), (8, N'FuenteRecomendadaW', N'550'),
-- 9 Fuente 650 W
(9, N'PotenciaW', N'650'),
-- 10 Gabinete Q300L
(10, N'FormatosSoportados', N'mATX,Mini-ITX'),
-- 11 Ryzen 7 7800X3D
(11, N'Socket', N'AM5'), (11, N'ConsumoW', N'120'), (11, N'Nucleos', N'8'),
-- 12 Core i5-13400F
(12, N'Socket', N'LGA1700'), (12, N'ConsumoW', N'65'), (12, N'Nucleos', N'10'),
-- 13 Core i7-13700K
(13, N'Socket', N'LGA1700'),
(13, N'ConsumoW', N'125'), -- VERIFICAR: es la potencia base (PBP); en turbo llega a 253 W
(13, N'Nucleos', N'16'),
-- 14 ASUS TUF GAMING B650-PLUS
(14, N'Socket', N'AM5'), (14, N'TipoRAM', N'DDR5'), (14, N'FormatoPlaca', N'ATX'),
-- 15 Gigabyte B760M DS3H DDR4
(15, N'Socket', N'LGA1700'), (15, N'TipoRAM', N'DDR4'), (15, N'FormatoPlaca', N'mATX'),
-- 16 ASUS PRIME B760-PLUS D4
(16, N'Socket', N'LGA1700'), (16, N'TipoRAM', N'DDR4'), (16, N'FormatoPlaca', N'ATX'),
-- 17 Corsair Vengeance DDR5 32GB
(17, N'TipoRAM', N'DDR5'), (17, N'CapacidadGB', N'32'), (17, N'VelocidadMHz', N'6000'),
-- 18 Kingston FURY Beast DDR4 32GB
(18, N'TipoRAM', N'DDR4'), (18, N'CapacidadGB', N'32'), (18, N'VelocidadMHz', N'3200'),
-- 19 Samsung 870 EVO 500GB
(19, N'Tipo', N'SSD SATA'), (19, N'CapacidadGB', N'500'),
-- 20 WD Blue SN580 2TB
(20, N'Tipo', N'NVMe'), (20, N'CapacidadGB', N'2000'),
-- 21 Seagate BarraCuda 2TB
(21, N'Tipo', N'HDD'), (21, N'CapacidadGB', N'2000'),
-- 22 Sapphire PULSE RX 6600
(22, N'ConsumoW', N'132'), (22, N'MemoriaGB', N'8'), (22, N'FuenteRecomendadaW', N'450'),
-- 23 MSI RTX 4070 SUPER
(23, N'ConsumoW', N'220'), (23, N'MemoriaGB', N'12'), (23, N'FuenteRecomendadaW', N'650'),
-- 24 Gigabyte RTX 4090
(24, N'ConsumoW', N'450'), (24, N'MemoriaGB', N'24'), (24, N'FuenteRecomendadaW', N'850'),
-- 25 Fuente 450 W
(25, N'PotenciaW', N'450'),
-- 26 Fuente 1000 W
(26, N'PotenciaW', N'1000'),
-- 27 Fuente 750 W
(27, N'PotenciaW', N'750'),
-- 28 Corsair 4000D Airflow
(28, N'FormatosSoportados', N'ATX,mATX,Mini-ITX'),
-- 29 Cooler Master NR200
(29, N'FormatosSoportados', N'Mini-ITX'),
-- 30 NZXT H5 Flow
(30, N'FormatosSoportados', N'ATX,mATX,Mini-ITX');
GO

/* ====================== Consultas de verificacion ====================== */

-- 1) Productos por categoria
SELECT c.Nombre AS Categoria, p.IdProducto, p.Nombre, p.Marca, p.Precio, p.Stock
FROM dbo.Productos p
JOIN dbo.Categorias c ON c.IdCategoria = p.IdCategoria
ORDER BY c.IdCategoria, p.IdProducto;

-- 2) Conteo de productos por categoria y total (el total debe ser 30)
SELECT CASE WHEN GROUPING(c.Nombre) = 1 THEN N'TOTAL' ELSE c.Nombre END AS Categoria,
       COUNT(*) AS Productos
FROM dbo.Productos p
JOIN dbo.Categorias c ON c.IdCategoria = p.IdCategoria
GROUP BY ROLLUP (c.Nombre)
ORDER BY GROUPING(c.Nombre), c.Nombre;

-- 3) Disponibilidad: Agotado (0), Pocas piezas (1 a 3), Disponible (mas de 3)
SELECT IdProducto, Nombre, Stock,
       CASE WHEN Stock = 0 THEN 'Agotado'
            WHEN Stock BETWEEN 1 AND 3 THEN 'Pocas piezas'
            ELSE 'Disponible' END AS Disponibilidad
FROM dbo.Productos
ORDER BY IdProducto;

-- 4) Productos a los que les falta alguna clave obligatoria (debe devolver 0 filas)
;WITH ClavesObligatorias (IdCategoria, Clave) AS (
    SELECT IdCategoria, Clave
    FROM (VALUES
        (1, N'Socket'), (1, N'ConsumoW'), (1, N'Nucleos'),
        (2, N'Socket'), (2, N'TipoRAM'), (2, N'FormatoPlaca'),
        (3, N'TipoRAM'), (3, N'CapacidadGB'), (3, N'VelocidadMHz'),
        (4, N'Tipo'), (4, N'CapacidadGB'),
        (5, N'ConsumoW'), (5, N'MemoriaGB'), (5, N'FuenteRecomendadaW'),
        (6, N'PotenciaW'),
        (7, N'FormatosSoportados')
    ) AS v (IdCategoria, Clave)
)
SELECT p.IdProducto, p.Nombre, k.Clave AS ClaveFaltante
FROM dbo.Productos p
JOIN ClavesObligatorias k ON k.IdCategoria = p.IdCategoria
LEFT JOIN dbo.EspecificacionesProducto e
       ON e.IdProducto = p.IdProducto AND e.Clave = k.Clave
WHERE e.IdProducto IS NULL;

-- 5) Regla procesador-tarjeta madre por Socket (todas las combinaciones)
SELECT cpu.IdProducto AS IdProcesador, cpu.Nombre AS Procesador,
       mb.IdProducto  AS IdTarjetaMadre, mb.Nombre AS TarjetaMadre,
       sCpu.Valor AS SocketProcesador, sMb.Valor AS SocketTarjeta,
       CASE WHEN sCpu.Valor = sMb.Valor THEN 'Compatible' ELSE 'No compatible' END AS Resultado
FROM dbo.Productos cpu
JOIN dbo.EspecificacionesProducto sCpu
       ON sCpu.IdProducto = cpu.IdProducto AND sCpu.Clave = N'Socket'
CROSS JOIN dbo.Productos mb
JOIN dbo.EspecificacionesProducto sMb
       ON sMb.IdProducto = mb.IdProducto AND sMb.Clave = N'Socket'
WHERE cpu.IdCategoria = 1
  AND mb.IdCategoria  = 2
ORDER BY cpu.IdProducto, mb.IdProducto;

-- 6) Regla de la fuente: (ConsumoW procesador + ConsumoW tarjeta de video) x 1.3
--    La fuente alcanza si PotenciaW >= potencia requerida.
--    Debe haber filas "Alcanza" y filas "No alcanza".
SELECT cpu.Nombre AS Procesador, gpu.Nombre AS TarjetaVideo, ps.Nombre AS Fuente,
       CAST((CAST(eCpu.Valor AS INT) + CAST(eGpu.Valor AS INT)) * 1.3 AS DECIMAL(10,1)) AS PotenciaRequeridaW,
       CAST(ePs.Valor AS INT) AS PotenciaFuenteW,
       CASE WHEN CAST(ePs.Valor AS INT) >= (CAST(eCpu.Valor AS INT) + CAST(eGpu.Valor AS INT)) * 1.3
            THEN 'Alcanza' ELSE 'No alcanza' END AS Resultado
FROM dbo.Productos cpu
JOIN dbo.EspecificacionesProducto eCpu
       ON eCpu.IdProducto = cpu.IdProducto AND eCpu.Clave = N'ConsumoW'
CROSS JOIN dbo.Productos gpu
JOIN dbo.EspecificacionesProducto eGpu
       ON eGpu.IdProducto = gpu.IdProducto AND eGpu.Clave = N'ConsumoW'
CROSS JOIN dbo.Productos ps
JOIN dbo.EspecificacionesProducto ePs
       ON ePs.IdProducto = ps.IdProducto AND ePs.Clave = N'PotenciaW'
WHERE cpu.IdCategoria = 1
  AND gpu.IdCategoria = 5
  AND ps.IdCategoria  = 6
ORDER BY cpu.IdProducto, gpu.IdProducto, ps.IdProducto;

-- 7) Pruebas de Pedidos (CAM-001). Todo se deshace con ROLLBACK: no deja datos.
--    7a) Un pedido SIN correo debe ser rechazado.
BEGIN TRY
    BEGIN TRAN;
        INSERT INTO dbo.Pedidos (NombreComprador, Correo, Telefono, Total)
        VALUES (N'Prueba Sin Correo', NULL, N'6641234567', 100.00);
    ROLLBACK;
    SELECT 'FALLO LA PRUEBA: se acepto un pedido sin correo' AS Resultado7a;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    SELECT 'OK: pedido sin correo rechazado' AS Resultado7a, ERROR_MESSAGE() AS Mensaje;
END CATCH;

--    7b) Un correo con formato invalido (sin @ ni punto) debe ser rechazado.
BEGIN TRY
    BEGIN TRAN;
        INSERT INTO dbo.Pedidos (NombreComprador, Correo, Total)
        VALUES (N'Prueba Correo Invalido', N'correo-sin-arroba', 100.00);
    ROLLBACK;
    SELECT 'FALLO LA PRUEBA: se acepto un correo invalido' AS Resultado7b;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    SELECT 'OK: correo invalido rechazado' AS Resultado7b, ERROR_MESSAGE() AS Mensaje;
END CATCH;

--    7c) Un pedido valido (con correo, sin telefono) debe ser aceptado.
BEGIN TRY
    BEGIN TRAN;
        INSERT INTO dbo.Pedidos (NombreComprador, Correo, Total)
        VALUES (N'Prueba Valida', N'prueba@correo.com', 100.00);
    ROLLBACK;
    SELECT 'OK: pedido valido aceptado' AS Resultado7c;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    SELECT 'FALLO LA PRUEBA: se rechazo un pedido valido' AS Resultado7c, ERROR_MESSAGE() AS Mensaje;
END CATCH;
GO