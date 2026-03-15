/*
	NAME: TEAM JTL
	DATE: 2025-03-15
	PURPOSE:HACKATHON CHALLENGE
*/
USE master;
GO

IF NOT EXISTS (
    SELECT name FROM sys.databases WHERE name = N'DonationInventoryDB'
)
BEGIN
    CREATE DATABASE DonationInventoryDB
    PRINT 'Database DonationInventoryDB created.';
END
ELSE
BEGIN
    PRINT 'Database DonationInventoryDB already exists — skipping CREATE.';
END
GO

USE DonationInventoryDB;
GO

BEGIN TRY

IF OBJECT_ID(N'dbo.ResourceTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ResourceTypes
    (
        ResourceTypeID		INT				NOT NULL IDENTITY(1,1),
        [Name]				NVARCHAR(255)	NOT NULL,
        HasExpDate			BIT				NOT NULL DEFAULT 0,
        [Description]		NVARCHAR(255)	NOT NULL,
        UnitType			NVARCHAR(100)	NOT NULL,

        CONSTRAINT PK_ResourceTypes PRIMARY KEY (ResourceTypeID)
    );
    PRINT 'Table ResourceTypes created.';
END
ELSE 
	PRINT 'Table ResourceTypes already exists — skipping.';

IF OBJECT_ID(N'dbo.Organisations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Organisations
    (
        OrganisationID          INT             NOT NULL IDENTITY(1,1),
        [Name]                  NVARCHAR(255)   NOT NULL,
        [Location]              NVARCHAR(255)   NULL,
        Requirements            NVARCHAR(255)	NULL,
        ExpiryThresholdDays     INT             NOT NULL DEFAULT 7,

        CONSTRAINT PK_Organisations PRIMARY KEY (OrganisationID),
        CONSTRAINT CK_Organisations_ExpiryThreshold
            CHECK (ExpiryThresholdDays >= 1)
    );
    PRINT 'Table Organisations created.';
END
ELSE 
	PRINT 'Table Organisations already exists — skipping.';

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        UserID			NVARCHAR(50)    NOT NULL,
        [Name]          NVARCHAR(300)   NOT NULL,
        [Email]         NVARCHAR(320)   NOT NULL,  
        PasswordHash    NVARCHAR(100)   NOT NULL,
        [Role]          NVARCHAR(20)    NOT NULL,
        OrganisationID  INT             NULL,
        Phone           NVARCHAR(50)    NULL,

        CONSTRAINT PK_Users PRIMARY KEY (UserID),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT CK_Users_Role
            CHECK (Role IN ('donor', 'coordinator', 'org_admin')),

        CONSTRAINT FK_Users_Organisations
            FOREIGN KEY (OrganisationID)
            REFERENCES dbo.Organisations (OrganisationID)
            ON DELETE SET NULL 
    );
    PRINT 'Table Users created.';
END
ELSE 
	PRINT 'Table Users already exists — skipping.';

IF OBJECT_ID(N'dbo.InventoryItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InventoryItems
    (
        InventoryItemID		INT             NOT NULL IDENTITY(1,1),
        [Name]				NVARCHAR(300)   NOT NULL,
        Category			NVARCHAR(200)   NOT NULL,
        Quantity			INT             NOT NULL DEFAULT 0,
        BroughtInDate		DATETIME2(0)    NOT NULL DEFAULT SYSUTCDATETIME(),
        OrganisationName	NVARCHAR(300)   NULL,
        OrganisationID		INT             NULL,
        ExpiryDate			DATETIME2(0)    NULL,
        CreatedByUserID		NVARCHAR(50)    NOT NULL,
        ResourceTypeID		INT             NOT NULL DEFAULT 0,
        MinStock			INT             NULL DEFAULT 5,

        CONSTRAINT PK_InventoryItems PRIMARY KEY (InventoryItemID),
        CONSTRAINT CK_InventoryItems_Quantity
            CHECK (Quantity >= 0),
        CONSTRAINT CK_InventoryItems_MinStock
            CHECK (MinStock IS NULL OR MinStock >= 0),
        CONSTRAINT FK_InventoryItems_Organisations
            FOREIGN KEY (OrganisationID)
            REFERENCES dbo.Organisations (OrganisationID)
            ON DELETE SET NULL,
        CONSTRAINT FK_InventoryItems_Users
            FOREIGN KEY (CreatedByUserID)
            REFERENCES dbo.Users (UserID)
            ON DELETE NO ACTION,
        CONSTRAINT FK_InventoryItems_ResourceTypes
            FOREIGN KEY (ResourceTypeID)
            REFERENCES dbo.ResourceTypes (ResourceTypeID)
            ON DELETE NO ACTION
    );
    PRINT 'Table InventoryItems created.';
END
ELSE 
	PRINT 'Table InventoryItems already exists — skipping.';

IF OBJECT_ID(N'dbo.Donations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Donations
    (
        DonationID       INT             NOT NULL IDENTITY(1,1),
        DonorID          NVARCHAR(50)    NOT NULL,
        DonorName        NVARCHAR(300)   NOT NULL,
        OrganisationID   INT             NULL,
        ItemName         NVARCHAR(300)   NOT NULL,
        ItemDescription  NVARCHAR(1000)  NULL,
        Quantity         INT             NOT NULL,
        DonatedAt        DATETIME2(0)    NOT NULL DEFAULT SYSUTCDATETIME(),
        Status           NVARCHAR(20)    NOT NULL DEFAULT 'pending',
        ConfirmedAt      DATETIME2(0)    NULL,
        
		CONSTRAINT PK_Donations PRIMARY KEY (DonationID),
        CONSTRAINT CK_Donations_Quantity
            CHECK (Quantity > 0),
        CONSTRAINT CK_Donations_Status
            CHECK (Status IN ('pending', 'received')),
        CONSTRAINT CK_Donations_ConfirmedAt
            CHECK (
                (Status = 'received' AND ConfirmedAt IS NOT NULL)
                OR
                (Status = 'pending'  AND ConfirmedAt IS NULL)
            ),
        CONSTRAINT FK_Donations_Donors
            FOREIGN KEY (DonorID)
            REFERENCES dbo.Users (UserID)
            ON DELETE NO ACTION,
        CONSTRAINT FK_Donations_Organisations
            FOREIGN KEY (OrganisationID)
            REFERENCES dbo.Organisations (OrganisationID)
            ON DELETE SET NULL
    );
    PRINT 'Table Donations created.';
END
ELSE 
	PRINT 'Table Donations already exists — skipping.';

IF OBJECT_ID(N'dbo.ItemRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ItemRequests
    (
        ItemRequestID    INT             NOT NULL IDENTITY(1,1),
        OrganisationID   INT             NOT NULL,
        ItemName         NVARCHAR(300)   NOT NULL,
        Quantity         INT             NOT NULL,
        Urgency          NVARCHAR(10)    NOT NULL DEFAULT 'medium',
        [Status]         NVARCHAR(20)    NOT NULL DEFAULT 'open',
        CreatedAt        DATETIME2(0)    NOT NULL DEFAULT SYSUTCDATETIME(),
        PostedPublicly   BIT             NOT NULL DEFAULT 0,

        CONSTRAINT PK_ItemRequests PRIMARY KEY (ItemRequestID),
        CONSTRAINT CK_ItemRequests_Quantity
            CHECK (Quantity > 0),
        CONSTRAINT CK_ItemRequests_Urgency
            CHECK (Urgency IN ('low', 'medium', 'high')),
        CONSTRAINT CK_ItemRequests_Status
            CHECK (Status IN ('open', 'fulfilled')),

        CONSTRAINT FK_ItemRequests_Organisations
            FOREIGN KEY (OrganisationID)
            REFERENCES dbo.Organisations (OrganisationID)
            ON DELETE CASCADE 
    );
    PRINT 'Table ItemRequests created.';
END
ELSE 
	PRINT 'Table ItemRequests already exists — skipping.';

IF OBJECT_ID(N'dbo.ActivityLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ActivityLogs
    (
        ActivityLogID    INT             NOT NULL IDENTITY(1,1),
        OrganisationID   INT             NOT NULL,
        [Action]         NVARCHAR(1000)  NOT NULL,
        PerformedBy      NVARCHAR(50)    NOT NULL,
        [Timestamp]      DATETIME2(0)    NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_ActivityLogs PRIMARY KEY (ActivityLogID),
        CONSTRAINT FK_ActivityLogs_Organisations
            FOREIGN KEY (OrganisationID)
            REFERENCES dbo.Organisations (OrganisationID)
            ON DELETE CASCADE,

        CONSTRAINT FK_ActivityLogs_Users
            FOREIGN KEY (PerformedBy)
            REFERENCES dbo.Users (UserID)
            ON DELETE NO ACTION
    );
    PRINT 'Table ActivityLogs created.';
END
ELSE 
	PRINT 'Table ActivityLogs already exists — skipping.';

IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications
    (
        NotificationID   INT             NOT NULL IDENTITY(1,1),
        UserID           NVARCHAR(50)    NOT NULL,
        [Message]        NVARCHAR(2000)  NOT NULL,
        IsRead           BIT             NOT NULL DEFAULT 0,
        CreatedAt        DATETIME2(0)    NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_Notifications PRIMARY KEY (NotificationID),
        CONSTRAINT FK_Notifications_Users
            FOREIGN KEY (UserID)
            REFERENCES dbo.Users (UserID)
            ON DELETE CASCADE   
    );
    PRINT 'Table Notifications created.';
END
ELSE 
	PRINT 'Table Notifications already exists — skipping.';

IF OBJECT_ID(N'dbo.Surpluses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Surpluses
    (
        SurplusID        INT             NOT NULL IDENTITY(1,1),
        OrganisationID   INT             NOT NULL,
        ItemName         NVARCHAR(300)   NOT NULL,
        Quantity         INT             NOT NULL,
        ExpiryDate       DATETIME2(0)    NULL,
        Available        BIT             NOT NULL DEFAULT 1,

        CONSTRAINT PK_Surpluses PRIMARY KEY (SurplusID),
        CONSTRAINT CK_Surpluses_Quantity
            CHECK (Quantity > 0),
        CONSTRAINT FK_Surpluses_Organisations
            FOREIGN KEY (OrganisationID)
            REFERENCES dbo.Organisations (OrganisationID)
            ON DELETE CASCADE
    );
    PRINT 'Table Surpluses created.';
END
ELSE PRINT 'Table Surpluses already exists — skipping.';

IF OBJECT_ID(N'dbo.UsageRecords', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UsageRecords
    (
        UsageRecordID    INT             NOT NULL IDENTITY(1,1),
        OrganisationID   INT             NOT NULL,
        ItemName         NVARCHAR(300)   NOT NULL,
        QuantityUsed     INT             NOT NULL,
        UsedAt           DATETIME2(0)    NOT NULL DEFAULT SYSUTCDATETIME(),
        RecordedBy       NVARCHAR(50)    NOT NULL,

        CONSTRAINT PK_UsageRecords PRIMARY KEY (UsageRecordID),
        CONSTRAINT CK_UsageRecords_QuantityUsed
            CHECK (QuantityUsed > 0),
        CONSTRAINT FK_UsageRecords_Organisations
            FOREIGN KEY (OrganisationID)
            REFERENCES dbo.Organisations (OrganisationID)
            ON DELETE CASCADE,
        CONSTRAINT FK_UsageRecords_Users
            FOREIGN KEY (RecordedBy)
            REFERENCES dbo.Users (UserID)
            ON DELETE NO ACTION
    );
    PRINT 'Table UsageRecords created.';
END
ELSE 
	PRINT 'Table UsageRecords already exists — skipping.';

IF NOT EXISTS (SELECT 1 FROM dbo.Organisations WHERE OrganisationID = 1)
BEGIN
    SET IDENTITY_INSERT dbo.Organisations ON;

    INSERT INTO dbo.Organisations
        (OrganisationID, Name, Location, Requirements, ExpiryThresholdDays)
    VALUES
        (1, N'Food Bank A', N'123 Main St', N'canned goods,rice,pasta',    7),
        (2, N'Shelter B',   N'456 Oak Ave', N'blankets,toiletries,clothing', 14);

    SET IDENTITY_INSERT dbo.Organisations OFF;

    PRINT 'Organisations seed data inserted.';
END
ELSE
BEGIN
    PRINT 'Organisations seed data already present — skipping INSERT.';
END

PRINT 'DonationInventoryDB setup completed successfully.';

END TRY
BEGIN CATCH
    DECLARE @ErrMsg  NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrLine INT            = ERROR_LINE();
    DECLARE @ErrNum  INT            = ERROR_NUMBER();

	PRINT 'There was Error';
END CATCH;
GO