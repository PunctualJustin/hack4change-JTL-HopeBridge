CREATE DATABASE HackathonMoncton
GO

CREATE TABLE Organizations (
    OrganizationID		INT			 NOT NULL		IDENTITY(1,1)	PRIMARY KEY,
    [Name]	VARCHAR(255) NOT NULL
);
GO

CREATE TABLE UserTypes (
    UserTypeID		INT			 NOT NULL		IDENTITY(1,1)	PRIMARY KEY,
    [Name]	VARCHAR(255) NOT NULL
);
GO

CREATE TABLE Users (
	UserID		INT			 NOT NULL		IDENTITY(1,1)	PRIMARY KEY,
    Useremail	VARCHAR(255) NOT NULL		UNIQUE,
    [Password]	VARCHAR(255) NOT NULL,
    [Disabled]	BIT			 NOT NULL ,
    OrganizationID INT NULL,
    UserTypeID INT NOT NULL,

    FOREIGN KEY (OrganizationID) REFERENCES Organizations(OrganizationID),
    FOREIGN KEY (UserTypeID) REFERENCES UserTypes(UserTypeID)
);
GO

CREATE TABLE ResourceTypes (
    ResourceTypeID		INT			 NOT NULL	IDENTITY(1,1)	 PRIMARY KEY ,
    [Name]				VARCHAR(255) NOT NULL,
    [description]		VARCHAR(225) NULL,
    UnitType			VARCHAR(50)	NOT NULL,       
    Has_Exp_Date		BIT			NULL	DEFAULT 0

);
GO

CREATE TABLE Items (
    ItemsID				INT NOT NULL IDENTITY(1,1)	PRIMARY KEY,
    ResourceTypeID	INT NOT NULL,
    Qty					INT NOT NULL,
    [Expiry_Date]		DATE NULL,
    UserID				INT NOT	NULL,
    OrganizationID		INT	NOT NULL,

    FOREIGN KEY (ResourceTypeID) REFERENCES ResourceTypes(ResourceTypeID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (OrganizationID) REFERENCES Organizations(OrganizationID)
);
GO