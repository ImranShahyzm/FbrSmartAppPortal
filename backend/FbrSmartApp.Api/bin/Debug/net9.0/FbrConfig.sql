
/****** Object:  Table [dbo].[Fbr_Configurations]    Script Date: 3/31/2026 3:16:56 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Fbr_Configurations]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Fbr_Configurations](
	[ConfID] [int] IDENTITY(1,1) NOT NULL,
	[POSID] [int] NULL,
	[SaleTypeCode] [nvarchar](50) NULL,
	[PurchaseTypeCode] [nvarchar](50) NULL,
	[SROCode] [nvarchar](50) NULL,
	[CompanyID] [int] NULL,
	[AccessToken] [nvarchar](max) NULL,
	[IstaxExcludingDiscount] [bit] NULL,
	[ProductionToken] [nvarchar](max) NULL,
 CONSTRAINT [PK_Fbr_Configurations] PRIMARY KEY CLUSTERED 
(
	[ConfID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
END
GO
/****** Object:  Table [dbo].[Fbr_DigitalInvoicing]    Script Date: 3/31/2026 3:16:56 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Fbr_DigitalInvoicing]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Fbr_DigitalInvoicing](
	[MasterID] [int] IDENTITY(1,1) NOT NULL,
	[bposId] [varchar](100) NULL,
	[invoiceType] [int] NOT NULL,
	[invoiceDate] [datetime] NOT NULL,
	[ntN_CNIC] [varchar](20) NOT NULL,
	[buyerSellerName] [varchar](255) NOT NULL,
	[destinationAddress] [varchar](255) NOT NULL,
	[saleType] [varchar](50) NOT NULL,
	[totalSalesTaxApplicable] [decimal](18, 2) NOT NULL,
	[totalRetailPrice] [decimal](18, 2) NOT NULL,
	[totalSTWithheldAtSource] [decimal](18, 2) NULL,
	[totalExtraTax] [decimal](18, 2) NULL,
	[totalFEDPayable] [decimal](18, 2) NULL,
	[totalWithheldIncomeTax] [decimal](18, 2) NULL,
	[totalCVT] [decimal](18, 2) NULL,
	[distributor_NTN_CNIC] [varchar](20) NULL,
	[distributorName] [varchar](255) NULL,
	[FbrInvoiceNumber] [varchar](100) NULL,
	[imagePath] [nvarchar](max) NULL,
	[totalDiscount] [numeric](18, 2) NULL,
 CONSTRAINT [PK_Fbr_DigitalInvoicing] PRIMARY KEY CLUSTERED 
(
	[MasterID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
END
GO
/****** Object:  Table [dbo].[Fbr_DigitalInvoicingDetail]    Script Date: 3/31/2026 3:16:56 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Fbr_DigitalInvoicingDetail]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Fbr_DigitalInvoicingDetail](
	[DetailID] [int] IDENTITY(1,1) NOT NULL,
	[MasterID] [int] NULL,
	[hsCode] [varchar](10) NULL,
	[productCode] [varchar](50) NOT NULL,
	[productDescription] [varchar](255) NOT NULL,
	[rate] [decimal](18, 2) NOT NULL,
	[uoM] [varchar](50) NOT NULL,
	[quantity] [decimal](18, 2) NOT NULL,
	[valueSalesExcludingST] [decimal](18, 2) NOT NULL,
	[salesTaxApplicable] [decimal](18, 2) NOT NULL,
	[retailPrice] [decimal](18, 2) NOT NULL,
	[stWithheldAtSource] [decimal](18, 2) NULL,
	[extraTax] [decimal](18, 2) NULL,
	[furtherTax] [decimal](18, 2) NULL,
	[sroScheduleNo] [varchar](100) NULL,
	[fedPayable] [decimal](18, 2) NULL,
	[cvt] [decimal](18, 2) NOT NULL,
	[whiT_1] [decimal](18, 2) NULL,
	[whiT_2] [decimal](18, 2) NULL,
	[whiT_Section_1] [varchar](100) NULL,
	[whiT_Section_2] [varchar](100) NULL,
	[totalValues] [decimal](18, 2) NOT NULL,
	[Discount] [numeric](18, 2) NULL,
 CONSTRAINT [PK_Fbr_DigitalInvoicingDetail] PRIMARY KEY CLUSTERED 
(
	[DetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
END
GO
/****** Object:  Table [dbo].[Fbr_ProvinceData]    Script Date: 3/31/2026 3:16:56 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Fbr_ProvinceData]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Fbr_ProvinceData](
	[ProvinceID] [int] IDENTITY(1,1) NOT NULL,
	[Provincename] [nvarchar](350) NULL,
	[CompanyID] [int] NULL,
 CONSTRAINT [PK_Fbr_ProvinceData] PRIMARY KEY CLUSTERED 
(
	[ProvinceID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
END
GO
/****** Object:  Table [dbo].[Fbr_SaleTypesCodesList]    Script Date: 3/31/2026 3:16:56 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Fbr_SaleTypesCodesList]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Fbr_SaleTypesCodesList](
	[SaleTypeID] [int] IDENTITY(1,1) NOT NULL,
	[TRANSACTION_Code] [nvarchar](250) NULL,
	[Description] [nvarchar](max) NULL,
 CONSTRAINT [PK_Fbr_SaleTypesCodesList] PRIMARY KEY CLUSTERED 
(
	[SaleTypeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
END
GO
/****** Object:  Table [dbo].[Fbr_UomCodes]    Script Date: 3/31/2026 3:16:56 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Fbr_UomCodes]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Fbr_UomCodes](
	[ID] [int] IDENTITY(1,1) NOT NULL,
	[UOM_Code] [nvarchar](250) NULL,
	[UOM_Name] [nvarchar](250) NULL,
 CONSTRAINT [PK_Fbr_UomCodes] PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
END
GO
SET IDENTITY_INSERT [dbo].[Fbr_ProvinceData] ON 
GO
INSERT [dbo].[Fbr_ProvinceData] ([ProvinceID], [Provincename], [CompanyID]) VALUES (1, N'Punjab', 1)
GO
INSERT [dbo].[Fbr_ProvinceData] ([ProvinceID], [Provincename], [CompanyID]) VALUES (3, N'Balochistan', 1)
GO
INSERT [dbo].[Fbr_ProvinceData] ([ProvinceID], [Provincename], [CompanyID]) VALUES (4, N'Sindh', 1)
GO
INSERT [dbo].[Fbr_ProvinceData] ([ProvinceID], [Provincename], [CompanyID]) VALUES (5, N'AZAD JAMMU AND KASHMIR', 0)
GO
INSERT [dbo].[Fbr_ProvinceData] ([ProvinceID], [Provincename], [CompanyID]) VALUES (6, N'CAPITAL TERRITORY', 0)
GO
INSERT [dbo].[Fbr_ProvinceData] ([ProvinceID], [Provincename], [CompanyID]) VALUES (7, N'KHYBER PAKHTUNKHWA', 0)
GO
INSERT [dbo].[Fbr_ProvinceData] ([ProvinceID], [Provincename], [CompanyID]) VALUES (8, N'GILGIT BALTISTAN', 0)
GO
SET IDENTITY_INSERT [dbo].[Fbr_ProvinceData] OFF
GO
SET IDENTITY_INSERT [dbo].[Fbr_SaleTypesCodesList] ON 
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (50, N'75', N'Goods at standard rate (default)')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (51, N'24', N'Goods at Reduced Rate')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (52, N'80', N'Goods at zero-rate')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (53, N'85', N'Petroleum Products')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (54, N'62', N'Electricity Supply to Retailers')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (55, N'129', N'SIM')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (56, N'77', N'Gas to CNG stations')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (57, N'122', N'Mobile Phones')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (58, N'25', N'Processing/Conversion of Goods')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (59, N'23', N' 3rd Schedule Goods ')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (60, N'21', N'Goods (FED in ST Mode)')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (61, N'22', N' Services (FED in ST Mode) ')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (62, N'18', N' Services ')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (63, N'81', N'Exempt goods')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (64, N'82', N'DTRE goods')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (65, N'130', N'Cotton ginners')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (66, N'132', N'Electric Vehicle')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (67, N'134', N'Cement /Concrete Block')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (68, N'84', N'Telecommunication services')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (69, N'123', N'Steel melting and re-rolling')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (70, N'125', N'Ship breaking')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (71, N'115', N'Potassium Chlorate')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (72, N'178', N'CNG Sales')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (73, N'181', N'Toll Manufacturing')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (74, N'138', N'Non-Adjustable Supplies')
GO
INSERT [dbo].[Fbr_SaleTypesCodesList] ([SaleTypeID], [TRANSACTION_Code], [Description]) VALUES (75, N'139', N'Goods as per SRO.297(|)/2023')
GO
SET IDENTITY_INSERT [dbo].[Fbr_SaleTypesCodesList] OFF
GO
SET IDENTITY_INSERT [dbo].[Fbr_UomCodes] ON 
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (1, N'U1000003', N'MT')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (2, N'U1000005', N'SET')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (3, N'U1000006', N'KWH')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (4, N'U1000008', N'40KG')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (5, N'U1000009', N'Liter')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (6, N'U1000011', N'Sq Yard')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (7, N'U1000012', N'Bag')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (8, N'U1000013', N'KG')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (9, N'U1000046', N'MMBTU')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (10, N'U1000048', N'Meter')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (11, N'U1000053', N'Carat')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (12, N'U1000055', N'Cubic Metre')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (13, N'U1000057', N'Dozen')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (14, N'U1000059', N'Gram')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (15, N'U1000061', N'Gallon')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (16, N'U1000063', N'Kilogram')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (17, N'U1000065', N'Pound')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (18, N'U1000067', N'Timber Logs')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (19, N'U1000069', N'Pieces')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (20, N'U1000071', N'Packs')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (21, N'U1000073', N'Pair')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (22, N'U1000075', N'Square Foot')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (23, N'U1000077', N'Square Metre')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (24, N'U1000079', N'Thousand Unit')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (25, N'U1000081', N'Mega Watt')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (26, N'U1000083', N'Foot')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (27, N'U1000085', N'Barrels')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (28, N'U1000087', N'Number')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (29, N'U1000004', N'Bill of lading')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (30, N'U1000088', N'Others')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (31, N'3', N'MT')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (32, N'4', N'Bill of lading')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (33, N'5', N'SET')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (34, N'6', N'KWH')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (35, N'8', N'40KG')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (36, N'9', N'Liter')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (37, N'11', N'SqY')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (38, N'12', N'Bag')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (39, N'13', N'KG')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (40, N'46', N'MMBTU')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (41, N'48', N'Meter')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (42, N'50', N'Pcs')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (43, N'53', N'Carat')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (44, N'55', N'Cubic Metre')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (45, N'57', N'Dozen')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (46, N'59', N'Gram')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (47, N'61', N'Gallon')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (48, N'63', N'Kilogram')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (49, N'65', N'Pound')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (50, N'67', N'Timber Logs')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (51, N'69', N'Numbers, pieces, units')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (52, N'71', N'Packs')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (53, N'73', N'Pair')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (54, N'75', N'Square Foot')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (55, N'77', N'Square Metre')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (56, N'79', N'Thousand Unit')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (57, N'81', N'Mega Watt')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (58, N'83', N'Foot')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (59, N'85', N'Barrels')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (60, N'87', N'NO')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (61, N'118', N'Meter')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (62, N'110', N'KWH')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (63, N'112', N'Packs')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (64, N'114', N'Meter')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (65, N'116', N'Liter')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (66, N'117', N'Bag')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (67, N'98', N'MMBTU')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (68, N'99', N'Numbers, pieces, units')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (69, N'100', N'Square Foot')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (70, N'101', N'Thousand Unit')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (71, N'102', N'Barrels')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (72, N'88', N'Others')
GO
INSERT [dbo].[Fbr_UomCodes] ([ID], [UOM_Code], [UOM_Name]) VALUES (73, N'96', N'1000 kWh')
GO
SET IDENTITY_INSERT [dbo].[Fbr_UomCodes] OFF
GO
