/* =====================================================================
   Nexus PC - Script de base de datos (SQL Server)
   Version: v0.1  |  Responsable: Daniel
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

CREATE TABLE dbo.Pedidos (
    IdPedido        INT IDENTITY(1,1) NOT NULL,
    NombreComprador NVARCHAR(100)     NOT NULL,
    Correo          NVARCHAR(120)     NULL,
    Telefono        NVARCHAR(20)      NULL,
    Fecha           DATETIME2(0)      NOT NULL CONSTRAINT DF_Pedidos_Fecha DEFAULT SYSDATETIME(),
    Total           DECIMAL(12,2)     NOT NULL,
    CONSTRAINT PK_Pedidos          PRIMARY KEY (IdPedido),
    CONSTRAINT CK_Pedidos_Total    CHECK (Total >= 0),
    CONSTRAINT CK_Pedidos_Contacto CHECK (Correo IS NOT NULL OR Telefono IS NOT NULL)
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

-- Productos (IDs 1 a 10, en este orden)
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
(7, N'MasterBox Q300L',              N'Cooler Master',N'Gabinete micro-ATX compacto.',                               1100.00,  9, N'img/q300l.jpg');         -- 10

-- Especificaciones tecnicas (base de las reglas de compatibilidad)
INSERT INTO dbo.EspecificacionesProducto (IdProducto, Clave, Valor) VALUES
-- Ryzen 5 7600
(1, N'Socket', N'AM5'),  (1, N'TDP_W', N'65'),  (1, N'Nucleos', N'6'),
-- Core i5-12400F
(2, N'Socket', N'LGA1700'), (2, N'TDP_W', N'65'), (2, N'Nucleos', N'6'),
-- MSI B650M-P
(3, N'Socket', N'AM5'),     (3, N'TipoRAM', N'DDR5'), (3, N'FormatoPlaca', N'mATX'),
-- MSI B660M-A DDR4
(4, N'Socket', N'LGA1700'), (4, N'TipoRAM', N'DDR4'), (4, N'FormatoPlaca', N'mATX'),
-- RAM DDR5
(5, N'TipoRAM', N'DDR5'), (5, N'CapacidadGB', N'16'), (5, N'VelocidadMHz', N'5600'),
-- RAM DDR4
(6, N'TipoRAM', N'DDR4'), (6, N'CapacidadGB', N'16'), (6, N'VelocidadMHz', N'3200'),
-- SSD
(7, N'Tipo', N'NVMe'), (7, N'CapacidadGB', N'1000'),
-- RTX 4060
(8, N'ConsumoW', N'115'), (8, N'MemoriaGB', N'8'), (8, N'FuenteRecomendadaW', N'550'),
-- Fuente
(9, N'PotenciaW', N'650'),
-- Gabinete (formatos de tarjeta madre que acepta, separados por coma)
(10, N'FormatosSoportados', N'mATX,Mini-ITX');
GO

/* ---------- Consultas de verificacion ---------- */
-- 1) Productos por categoria
SELECT c.Nombre AS Categoria, p.IdProducto, p.Nombre, p.Marca, p.Precio, p.Stock
FROM dbo.Productos p
JOIN dbo.Categorias c ON c.IdCategoria = p.IdCategoria
ORDER BY c.IdCategoria, p.IdProducto;

-- 2) Ejemplo de regla procesador-tarjeta madre (RF-08):
--    tarjetas madre compatibles con el procesador 1 (Ryzen 5 7600)
SELECT mb.IdProducto, mb.Nombre
FROM dbo.Productos mb
JOIN dbo.EspecificacionesProducto sMb  ON sMb.IdProducto  = mb.IdProducto AND sMb.Clave  = N'Socket'
JOIN dbo.EspecificacionesProducto sCpu ON sCpu.IdProducto = 1             AND sCpu.Clave = N'Socket'
WHERE mb.IdCategoria = 2
  AND sMb.Valor = sCpu.Valor;
GO
