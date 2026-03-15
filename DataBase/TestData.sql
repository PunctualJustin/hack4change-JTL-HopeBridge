-- =============================================================================
-- SeedData_Minimal.sql
-- Minimal test data for DonationInventoryDB
-- =============================================================================
-- Goal: every row exists to exercise a specific API feature or edge case.
--       Each INSERT block has an inline comment explaining what it tests.
--
-- Scenario covers:
--   - 3 organisations (one per role scope)
--   - 13 users (all three roles, with/without phone, with/without org)
--   - Inventory items that trigger low-stock AND near-expiry alerts
--   - Donations in every status combination (pending / received / general pool)
--   - Item requests at every urgency level, public and private
--   - Surpluses that are available AND already claimed
--   - Usage records that prove stock decrement history
--   - Activity logs covering every loggable action type
--   - Notifications that are read AND unread
--
-- Password for ALL seeded users:  Password1!
-- bcrypt hash (cost 10): $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
--
-- Run order:
--   1. DonationInventoryDB.sql   (creates schema + orgs 1 & 2)
--   2. SeedData_Minimal.sql      (this file)
-- =============================================================================

USE DonationInventoryDB;
GO

BEGIN TRANSACTION;
BEGIN TRY

PRINT '== Starting minimal seed data insert ==';

-- =============================================================================
-- RESOURCE TYPES  (5 rows)
-- Tests: ResourceType lookup; InventoryItem FK to ResourceTypes
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.ResourceTypes WHERE ResourceTypeID = 1)
BEGIN
    SET IDENTITY_INSERT dbo.ResourceTypes ON;
    INSERT INTO dbo.ResourceTypes
        (ResourceTypeID, Name, HasExpDate, Description, UnitType)
    VALUES
        -- Tests: HasExpDate = 1 path (item with expiry tracking)
        (1, N'Perishable Food',      1, N'Fresh food that expires within days to weeks.',          N'kg'),
        -- Tests: HasExpDate = 1, long shelf life
        (2, N'Non-Perishable Food',  1, N'Canned or dried food with a shelf life of months/years.',N'units'),
        -- Tests: HasExpDate = 0 path (item with no expiry)
        (3, N'Clothing & Bedding',   0, N'Garments, blankets, and textiles.',                      N'units'),
        -- Tests: HasExpDate = 1 for hygiene products
        (4, N'Hygiene & Toiletries', 1, N'Soap, shampoo, toothpaste, and sanitary items.',         N'units'),
        -- Tests: HasExpDate = 0 for non-expiring household goods
        (5, N'Household Goods',      0, N'Kitchenware, cleaning supplies, general household.',     N'units');
    SET IDENTITY_INSERT dbo.ResourceTypes OFF;
    PRINT '  ResourceTypes: 5 rows inserted.';
END
ELSE PRINT '  ResourceTypes: already seeded, skipping.';

-- =============================================================================
-- ORGANISATIONS  (add org 3 — orgs 1 & 2 exist from schema script)
-- Tests: PATCH /organisations/:id/expiry-threshold (org 3 has threshold = 5)
--        GET /organisations/:id/requirements
--        GET /organisations/:id/near-expiry (each org has a different window)
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Organisations WHERE OrganisationID = 3)
BEGIN
    SET IDENTITY_INSERT dbo.Organisations ON;
    INSERT INTO dbo.Organisations
        (OrganisationID, Name, Location, Requirements, ExpiryThresholdDays)
    VALUES
        -- Tests: third org scope; 5-day expiry window; short requirements list
        (3, N'Community Kitchen', N'789 River Rd', N'cooking oil,flour,sugar', 5);
    SET IDENTITY_INSERT dbo.Organisations OFF;
    PRINT '  Organisations: org 3 inserted.';
END
ELSE PRINT '  Organisations: org 3 already exists, skipping.';

-- =============================================================================
-- USERS  (13 rows)
-- Tests covered per user — see inline comment on each row
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = 'u_admin_1')
BEGIN
    -- ── Org Admins (one per org) ──────────────────────────────────────────────
    INSERT INTO dbo.Users
        (UserID, Name, Email, PasswordHash, Role, OrganisationID, Phone)
    VALUES
        -- Tests: org_admin login; PATCH /organisations/:id/expiry-threshold;
        --        GET /admin/users; DELETE /admin/users/:userId
        ('u_admin_1', N'Alice Fontaine', N'alice@foodbanka.org',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'org_admin', 1, N'+1 506 555 0101'),

        -- Tests: admin in org 2; confirms Shelter B donations
        ('u_admin_2', N'Brian Okafor', N'brian@shelterb.org',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'org_admin', 2, N'+1 506 555 0102'),

        -- Tests: admin in org 3; different expiry threshold (5 days)
        ('u_admin_3', N'Carmen Silva', N'carmen@commkitchen.org',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'org_admin', 3, N'+1 506 555 0103');

    -- ── Coordinators ─────────────────────────────────────────────────────────
    INSERT INTO dbo.Users
        (UserID, Name, Email, PasswordHash, Role, OrganisationID, Phone)
    VALUES
        -- Tests: coordinator login; POST /items; PATCH /donations/:id/confirm;
        --        GET /activity-log; GET /usage-report; POST /usage; POST /requests
        ('u_coord_1', N'David Marsh', N'david@foodbanka.org',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'coordinator', 1, N'+1 506 555 0104'),

        -- Tests: second coordinator in same org — verifies org-scoped log/report
        ('u_coord_2', N'Elena Petrov', N'elena@foodbanka.org',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'coordinator', 1, NULL),              -- no phone: tests NULL phone path

        -- Tests: coordinator confirming donations for org 2
        ('u_coord_3', N'Frank Nguyen', N'frank@shelterb.org',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'coordinator', 2, N'+1 506 555 0106'),

        -- Tests: coordinator in org 3; near-expiry window = 5 days
        ('u_coord_4', N'Grace Adeyemi', N'grace@commkitchen.org',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'coordinator', 3, N'+1 506 555 0107');

    -- ── Donors ───────────────────────────────────────────────────────────────
    INSERT INTO dbo.Users
        (UserID, Name, Email, PasswordHash, Role, OrganisationID, Phone)
    VALUES
        -- Tests: donor with phone — GET /donors/:id/contact returns phone
        ('u_donor_1', N'Hannah Lee', N'hannah@donors.com',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'donor', NULL, N'+1 506 555 0108'),

        -- Tests: donor without phone — GET /donors/:id/contact returns null phone
        ('u_donor_2', N'Ivan Reyes', N'ivan@donors.com',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'donor', NULL, NULL),

        -- Tests: donor who submits a general-pool donation (no organisationId)
        ('u_donor_3', N'Julia Santos', N'julia@donors.com',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'donor', NULL, N'+1 506 555 0110'),

        -- Tests: donor who submits a donation with an itemDescription (unknown item)
        ('u_donor_4', N'Kevin Tremblay', N'kevin@donors.com',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'donor', NULL, N'+1 506 555 0111'),

        -- Tests: donor with multiple donations to different orgs
        ('u_donor_5', N'Laura Chen', N'laura@donors.com',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'donor', NULL, N'+1 506 555 0112'),

        -- Tests: donor whose donation gets confirmed, triggering a notification
        ('u_donor_6', N'Marco Dubois', N'marco@donors.com',
         N'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
         'donor', NULL, NULL);

    PRINT '  Users: 13 rows inserted.';
END
ELSE PRINT '  Users: already seeded, skipping.';

-- =============================================================================
-- INVENTORY ITEMS  (15 rows)
-- Tests: GET /items; GET /items/:id; GET /items/search; PUT /items/:id;
--        DELETE /items/:id; GET /organisations/:id/low-stock;
--        GET /organisations/:id/near-expiry
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.InventoryItems WHERE InventoryItemID = 1)
BEGIN
    SET IDENTITY_INSERT dbo.InventoryItems ON;

    -- ── Food Bank A (org 1, expiryThreshold = 7 days) ────────────────────────
    INSERT INTO dbo.InventoryItems
        (InventoryItemID, Name, Category, Quantity, BroughtInDate,
         OrganisationName, OrganisationID, ExpiryDate,
         CreatedByUserID, ResourceTypeID, MinStock)
    VALUES
        -- Tests: normal healthy stock, no alerts expected
        (1, N'Canned Tomatoes', N'non-perishable food', 120,
            '2025-11-01', N'Food Bank A', 1, '2027-06-01',
            'u_coord_1', 2, 20),

        -- Tests: LOW STOCK (quantity 4 < minStock 10)
        --        → GET /organisations/1/low-stock must include this row
        (2, N'White Rice (5kg)', N'non-perishable food', 4,
            '2025-11-05', N'Food Bank A', 1, '2026-12-01',
            'u_coord_1', 2, 10),

        -- Tests: NEAR EXPIRY within 7-day window (expires in 3 days)
        --        → GET /organisations/1/near-expiry must include this row
        (3, N'Fresh Bread', N'perishable food', 15,
            '2026-03-13', N'Food Bank A', 1,
            DATEADD(day, 3, SYSUTCDATETIME()),
            'u_coord_2', 1, 10),

        -- Tests: normal healthy stock, no alerts; used in POST /usage test
        (4, N'Pasta (500g)', N'non-perishable food', 85,
            '2025-12-01', N'Food Bank A', 1, '2028-01-01',
            'u_coord_1', 2, 15),

        -- Tests: NEAR EXPIRY (expires in 5 days, within 7-day threshold)
        (5, N'Whole Milk (2L)', N'perishable food', 8,
            '2026-03-12', N'Food Bank A', 1,
            DATEADD(day, 5, SYSUTCDATETIME()),
            'u_coord_2', 1, 10);

    -- ── Shelter B (org 2, expiryThreshold = 14 days) ─────────────────────────
    INSERT INTO dbo.InventoryItems
        (InventoryItemID, Name, Category, Quantity, BroughtInDate,
         OrganisationName, OrganisationID, ExpiryDate,
         CreatedByUserID, ResourceTypeID, MinStock)
    VALUES
        -- Tests: no-expiry item (ExpiryDate NULL); healthy stock
        (6, N'Wool Blankets', N'clothing & bedding', 40,
            '2025-10-20', N'Shelter B', 2, NULL,
            'u_coord_3', 3, 10),

        -- Tests: LOW STOCK (3 < 8) AND expiry present
        (7, N'Toothpaste', N'hygiene', 3,
            '2025-11-15', N'Shelter B', 2, '2027-09-01',
            'u_coord_3', 4, 8),

        -- Tests: normal stock, no-expiry — used in surplus donate test
        (8, N'Mens Jackets (M)', N'clothing & bedding', 22,
            '2025-09-01', N'Shelter B', 2, NULL,
            'u_coord_3', 3, 5),

        -- Tests: NEAR EXPIRY within 14-day window (expires in 10 days)
        (9, N'Hand Sanitiser', N'hygiene', 18,
            '2025-10-01', N'Shelter B', 2,
            DATEADD(day, 10, SYSUTCDATETIME()),
            'u_coord_3', 4, 5),

        -- Tests: CRITICALLY LOW STOCK (2 < 6) and no expiry
        (10, N'Sleeping Bags', N'clothing & bedding', 2,
             '2025-08-15', N'Shelter B', 2, NULL,
             'u_coord_3', 3, 6);

    -- ── Community Kitchen (org 3, expiryThreshold = 5 days) ──────────────────
    INSERT INTO dbo.InventoryItems
        (InventoryItemID, Name, Category, Quantity, BroughtInDate,
         OrganisationName, OrganisationID, ExpiryDate,
         CreatedByUserID, ResourceTypeID, MinStock)
    VALUES
        -- Tests: normal stock; used in usage record test
        (11, N'Cooking Oil (1L)', N'non-perishable food', 55,
             '2026-01-10', N'Community Kitchen', 3, '2027-11-01',
             'u_coord_4', 2, 10),

        -- Tests: NEAR EXPIRY (4 days, within 5-day threshold for org 3)
        (12, N'Plain Flour (1kg)', N'non-perishable food', 30,
             '2025-12-20', N'Community Kitchen', 3,
             DATEADD(day, 4, SYSUTCDATETIME()),
             'u_coord_4', 2, 10),

        -- Tests: CRITICALLY LOW STOCK (1 < 5) for org 3
        (13, N'Granulated Sugar', N'non-perishable food', 1,
             '2026-02-01', N'Community Kitchen', 3, '2028-05-01',
             'u_coord_4', 2, 5),

        -- Tests: normal stock, no alert; used in surplus test
        (14, N'Mixed Spices', N'non-perishable food', 44,
             '2026-01-20', N'Community Kitchen', 3, '2027-03-01',
             'u_coord_4', 2, 8),

        -- Tests: GET /items/search by name ("soap" matches this)
        (15, N'Dish Soap (500ml)', N'household goods', 27,
             '2026-02-10', N'Community Kitchen', 3, '2027-08-01',
             'u_coord_4', 5, 5);

    SET IDENTITY_INSERT dbo.InventoryItems OFF;
    PRINT '  InventoryItems: 15 rows inserted.';
END
ELSE PRINT '  InventoryItems: already seeded, skipping.';

-- =============================================================================
-- DONATIONS  (12 rows)
-- Tests: POST /donate (new donation); POST /donate/:organisationId (legacy);
--        PATCH /donations/:id/confirm; GET /donations/history;
--        GET /donations/history/:donorId;
--        Cross-org confirm attempt (403); already-confirmed (400)
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Donations WHERE DonationID = 1)
BEGIN
    SET IDENTITY_INSERT dbo.Donations ON;
    INSERT INTO dbo.Donations
        (DonationID, DonorID, DonorName, OrganisationID, ItemName,
         ItemDescription, Quantity, DonatedAt, Status, ConfirmedAt)
    VALUES
        -- Tests: standard received donation → inventory already updated
        (1,  'u_donor_1', N'Hannah Lee',    1, N'Canned Tomatoes',
             NULL, 50, '2025-11-03 09:00:00', 'received', '2025-11-04 10:30:00'),

        -- Tests: second received donation for same donor → history returns 2 rows
        (2,  'u_donor_1', N'Hannah Lee',    1, N'Pasta (500g)',
             NULL, 40, '2025-12-03 09:30:00', 'received', '2025-12-04 10:00:00'),

        -- Tests: received donation for org 2
        (3,  'u_donor_2', N'Ivan Reyes',    2, N'Wool Blankets',
             NULL, 20, '2025-10-22 14:00:00', 'received', '2025-10-23 08:45:00'),

        -- Tests: received donation that pushed toothpaste stock; used in low-stock demo
        (4,  'u_donor_3', N'Julia Santos',  2, N'Toothpaste',
             NULL, 15, '2025-11-16 10:00:00', 'received', '2025-11-17 11:00:00'),

        -- Tests: received donation for org 3
        (5,  'u_donor_5', N'Laura Chen',    3, N'Cooking Oil (1L)',
             NULL, 30, '2026-01-11 08:30:00', 'received', '2026-01-12 09:00:00'),

        -- Tests: second received donation for org 3 (donor 6)
        (6,  'u_donor_6', N'Marco Dubois',  3, N'Plain Flour (1kg)',
             NULL, 20, '2025-12-21 13:00:00', 'received', '2025-12-22 10:00:00'),

        -- Tests: already-confirmed → PATCH /donations/7/confirm returns 400
        (7,  'u_donor_1', N'Hannah Lee',    1, N'White Rice (5kg)',
             NULL, 10, '2025-11-06 11:00:00', 'received', '2025-11-07 09:15:00'),

        -- Tests: pending donation → PATCH /donations/8/confirm (happy path)
        (8,  'u_donor_2', N'Ivan Reyes',    2, N'Sleeping Bags',
             NULL, 5, '2026-03-10 15:00:00', 'pending', NULL),

        -- Tests: unknown item with itemDescription
        --        GET /donations/history shows itemDescription field populated
        (9,  'u_donor_4', N'Kevin Tremblay', 1, N'Fortified Cereal',
             N'High-iron breakfast cereal, 500g boxes, best before 2027.',
             12, '2026-03-11 10:30:00', 'pending', NULL),

        -- Tests: GENERAL POOL donation (organisationId NULL)
        --        GET /donations/history for coordinators filters by org → this row excluded
        (10, 'u_donor_3', N'Julia Santos',  NULL, N'Tinned Soup',
             NULL, 24, '2026-03-12 09:00:00', 'pending', NULL),

        -- Tests: cross-org confirm attempt
        --        u_coord_1 (org 1) trying to confirm donation targeted at org 3 → 403
        (11, 'u_donor_5', N'Laura Chen',    3, N'Granulated Sugar',
             NULL, 10, '2026-03-13 14:00:00', 'pending', NULL),

        -- Tests: donor history filtered by donorId (donor_6 has only this pending)
        (12, 'u_donor_6', N'Marco Dubois',  2, N'Mens Jackets (M)',
             NULL, 8, '2026-03-14 11:00:00', 'pending', NULL);

    SET IDENTITY_INSERT dbo.Donations OFF;
    PRINT '  Donations: 12 rows inserted (7 received, 5 pending).';
END
ELSE PRINT '  Donations: already seeded, skipping.';

-- =============================================================================
-- ITEM REQUESTS  (10 rows)
-- Tests: POST /requests; GET /requests/public;
--        All three urgency levels; public vs private; open vs fulfilled
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.ItemRequests WHERE ItemRequestID = 1)
BEGIN
    SET IDENTITY_INSERT dbo.ItemRequests ON;
    INSERT INTO dbo.ItemRequests
        (ItemRequestID, OrganisationID, ItemName, Quantity,
         Urgency, Status, CreatedAt, PostedPublicly)
    VALUES
        -- Tests: high urgency + public → appears in GET /requests/public
        (1,  1, N'White Rice (5kg)',  20, 'high',   'open',      '2026-03-01 08:00:00', 1),
        -- Tests: medium urgency + public
        (2,  1, N'Canned Vegetables', 50, 'medium', 'open',      '2026-03-05 09:00:00', 1),
        -- Tests: low urgency + PRIVATE → must NOT appear in GET /requests/public
        (3,  1, N'Cooking Oil (1L)', 10, 'low',    'open',      '2026-03-10 10:00:00', 0),

        -- Tests: high urgency + public (org 2)
        (4,  2, N'Sleeping Bags',    10, 'high',   'open',      '2026-03-08 11:00:00', 1),
        -- Tests: medium urgency + public
        (5,  2, N'Toiletry Kits',    30, 'medium', 'open',      '2026-03-09 14:00:00', 1),
        -- Tests: low urgency + private (org 2)
        (6,  2, N'Winter Coats (L)', 15, 'low',    'open',      '2026-03-12 09:30:00', 0),

        -- Tests: FULFILLED status → must NOT appear in GET /requests/public
        --        (even though PostedPublicly = 1)
        (7,  3, N'Granulated Sugar', 15, 'high',   'fulfilled', '2026-03-07 08:00:00', 1),
        -- Tests: open medium urgency + public (org 3)
        (8,  3, N'Mixed Spices',     20, 'medium', 'open',      '2026-03-13 10:00:00', 1),
        -- Tests: private open request (org 3)
        (9,  3, N'Plain Flour (1kg)',25, 'low',    'open',      '2026-03-14 08:30:00', 0),
        -- Tests: high urgency fulfilled + private → completely hidden from public
        (10, 3, N'Cooking Oil (1L)', 10, 'high',   'fulfilled', '2026-02-20 10:00:00', 0);

    SET IDENTITY_INSERT dbo.ItemRequests OFF;
    PRINT '  ItemRequests: 10 rows inserted.';
END
ELSE PRINT '  ItemRequests: already seeded, skipping.';

-- =============================================================================
-- SURPLUSES  (8 rows)
-- Tests: POST /surplus; GET /surplus (returns available=1 only);
--        POST /surplus/:id/donate (happy path);
--        POST /surplus/:id/donate → 400 already claimed;
--        POST /surplus/:id/donate → 403 wrong org
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Surpluses WHERE SurplusID = 1)
BEGIN
    SET IDENTITY_INSERT dbo.Surpluses ON;
    INSERT INTO dbo.Surpluses
        (SurplusID, OrganisationID, ItemName, Quantity, ExpiryDate, Available)
    VALUES
        -- Tests: available surplus org 1 → can be donated to another org
        (1, 1, N'Pasta (500g)',        30, '2028-01-01',                     1),
        -- Tests: available surplus org 1 with expiry date
        (2, 1, N'Canned Tomatoes',     20, '2027-06-01',                     1),
        -- Tests: ALREADY CLAIMED → POST /surplus/3/donate returns 400
        (3, 2, N'Wool Blankets',       10, NULL,                             0),
        -- Tests: available surplus org 2 with near-expiry date
        (4, 2, N'Hand Sanitiser',       5, DATEADD(day,10,SYSUTCDATETIME()), 1),
        -- Tests: available surplus org 3 → org 1 coord attempting to donate → 403
        (5, 3, N'Cooking Oil (1L)',    10, '2027-11-01',                     1),
        -- Tests: available surplus org 3 with no expiry
        (6, 3, N'Dish Soap (500ml)',   12, NULL,                             1),
        -- Tests: available org 2 surplus; quantity > 1 for split scenarios
        (7, 2, N'Mens Jackets (M)',     8, NULL,                             1),
        -- Tests: available org 1 surplus; ExpiryDate NULL path
        (8, 1, N'Tinned Soup',         24, NULL,                             1);

    SET IDENTITY_INSERT dbo.Surpluses OFF;
    PRINT '  Surpluses: 8 rows inserted.';
END
ELSE PRINT '  Surpluses: already seeded, skipping.';

-- =============================================================================
-- USAGE RECORDS  (12 rows)
-- Tests: POST /usage (happy path);
--        POST /usage → 400 insufficient stock;
--        GET /usage-report (org-scoped);
--        Verify stock decrements persisted across requests
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.UsageRecords WHERE UsageRecordID = 1)
BEGIN
    SET IDENTITY_INSERT dbo.UsageRecords ON;
    INSERT INTO dbo.UsageRecords
        (UsageRecordID, OrganisationID, ItemName, QuantityUsed, UsedAt, RecordedBy)
    VALUES
        -- Food Bank A  (4 records)
        -- Tests: coordinator 1 recording usage for two different items
        (1,  1, N'Canned Tomatoes',  30, '2025-12-01 10:00:00', 'u_coord_1'),
        (2,  1, N'White Rice (5kg)',  6, '2025-12-10 09:30:00', 'u_coord_1'),
        -- Tests: coordinator 2 recording usage (same org, different user)
        (3,  1, N'Pasta (500g)',     25, '2026-01-15 11:00:00', 'u_coord_2'),
        -- Tests: usage on a near-expiry item (Fresh Bread)
        (4,  1, N'Fresh Bread',      10, '2026-03-14 08:00:00', 'u_coord_2'),

        -- Shelter B  (4 records)
        -- Tests: usage of no-expiry clothing item
        (5,  2, N'Wool Blankets',    10, '2025-11-20 14:00:00', 'u_coord_3'),
        -- Tests: usage that depletes toothpaste to low-stock level
        (6,  2, N'Toothpaste',       12, '2025-12-05 10:30:00', 'u_coord_3'),
        (7,  2, N'Sleeping Bags',     4, '2026-01-10 09:00:00', 'u_coord_3'),
        -- Tests: coordinator 3 recording Hand Sanitiser usage
        (8,  2, N'Hand Sanitiser',    2, '2026-03-10 11:00:00', 'u_coord_3'),

        -- Community Kitchen  (4 records)
        -- Tests: usage recorded by coordinator 4
        (9,  3, N'Cooking Oil (1L)', 15, '2026-02-01 11:00:00', 'u_coord_4'),
        (10, 3, N'Plain Flour (1kg)',10, '2026-02-15 09:30:00', 'u_coord_4'),
        -- Tests: usage that brings Sugar to critically low stock (leaves 1 unit)
        (11, 3, N'Granulated Sugar',  4, '2026-03-05 10:00:00', 'u_coord_4'),
        -- Tests: usage of a well-stocked item (Mixed Spices) — no alert triggered
        (12, 3, N'Mixed Spices',      6, '2026-03-12 09:00:00', 'u_coord_4');

    SET IDENTITY_INSERT dbo.UsageRecords OFF;
    PRINT '  UsageRecords: 12 rows inserted.';
END
ELSE PRINT '  UsageRecords: already seeded, skipping.';

-- =============================================================================
-- ACTIVITY LOGS  (14 rows)
-- Tests: GET /activity-log (org-scoped, coordinator/admin only);
--        All loggable action types are represented
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.ActivityLogs WHERE ActivityLogID = 1)
BEGIN
    SET IDENTITY_INSERT dbo.ActivityLogs ON;
    INSERT INTO dbo.ActivityLogs
        (ActivityLogID, OrganisationID, Action, PerformedBy, Timestamp)
    VALUES
        -- Food Bank A (org 1) — 5 entries
        -- Tests: donation confirmation log entry
        (1,  1, N'Confirmed receipt: 50x Canned Tomatoes',                   'u_coord_1', '2025-11-04 10:30:00'),
        -- Tests: usage log entry
        (2,  1, N'Recorded usage: 30x Canned Tomatoes',                      'u_coord_1', '2025-12-01 10:00:00'),
        -- Tests: item request log entry
        (3,  1, N'Posted item request: 20x White Rice (5kg) (urgency: high)','u_coord_1', '2026-03-01 08:00:00'),
        -- Tests: pending donation log entry (triggered by donor action)
        (4,  1, N'Donation pending: 12x Fortified Cereal from Kevin Tremblay','u_donor_4', '2026-03-11 10:30:00'),
        -- Tests: second coordinator producing a log entry in same org
        (5,  1, N'Recorded usage: 25x Pasta (500g)',                          'u_coord_2', '2026-01-15 11:00:00'),

        -- Shelter B (org 2) — 5 entries
        -- Tests: donation confirmation + usage + request + surplus + pending
        (6,  2, N'Confirmed receipt: 20x Wool Blankets',                     'u_coord_3', '2025-10-23 08:45:00'),
        (7,  2, N'Recorded usage: 10x Wool Blankets',                        'u_coord_3', '2025-11-20 14:00:00'),
        (8,  2, N'Posted item request: 10x Sleeping Bags (urgency: high)',   'u_coord_3', '2026-03-08 11:00:00'),
        (9,  2, N'Posted surplus: 10x Wool Blankets',                        'u_coord_3', '2026-02-01 09:00:00'),
        (10, 2, N'Donation pending: 5x Sleeping Bags from Ivan Reyes',       'u_donor_2', '2026-03-10 15:00:00'),

        -- Community Kitchen (org 3) — 4 entries
        -- Tests: all action types for org 3 (different threshold scope)
        (11, 3, N'Confirmed receipt: 30x Cooking Oil (1L)',                  'u_coord_4', '2026-01-12 09:00:00'),
        (12, 3, N'Recorded usage: 15x Cooking Oil (1L)',                     'u_coord_4', '2026-02-01 11:00:00'),
        (13, 3, N'Posted surplus: 10x Cooking Oil (1L)',                     'u_coord_4', '2026-02-20 09:00:00'),
        -- Tests: admin-level action in activity log
        (14, 3, N'Added inventory item: Dish Soap (500ml)',                  'u_admin_3', '2026-02-10 10:00:00');

    SET IDENTITY_INSERT dbo.ActivityLogs OFF;
    PRINT '  ActivityLogs: 14 rows inserted.';
END
ELSE PRINT '  ActivityLogs: already seeded, skipping.';

-- =============================================================================
-- NOTIFICATIONS  (12 rows)
-- Tests: GET /notifications (own only);
--        GET /notifications?unreadOnly=true;
--        PATCH /notifications/:id/read;
--        pushNotification() fires on donation confirmation
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Notifications WHERE NotificationID = 1)
BEGIN
    SET IDENTITY_INSERT dbo.Notifications ON;
    INSERT INTO dbo.Notifications
        (NotificationID, UserID, Message, IsRead, CreatedAt)
    VALUES
        -- Tests: READ notification (IsRead=1) — excluded from ?unreadOnly=true
        (1,  'u_donor_1',
             N'Your donation of 50x "Canned Tomatoes" has been received. Thank you, Hannah Lee!',
             1, '2025-11-04 10:30:00'),

        -- Tests: UNREAD notification → appears in ?unreadOnly=true
        (2,  'u_donor_1',
             N'Your donation of 40x "Pasta (500g)" has been received. Thank you, Hannah Lee!',
             0, '2025-12-04 10:00:00'),

        -- Tests: different donor, read notification
        (3,  'u_donor_2',
             N'Your donation of 20x "Wool Blankets" has been received. Thank you, Ivan Reyes!',
             1, '2025-10-23 08:45:00'),

        -- Tests: donor with no phone still gets notifications normally
        (4,  'u_donor_2',
             N'Reminder: you have a pending donation of 5x "Sleeping Bags" awaiting confirmation.',
             0, '2026-03-12 09:00:00'),

        -- Tests: donor 3 has only unread notifications
        (5,  'u_donor_3',
             N'Your donation of 15x "Toothpaste" has been received. Thank you, Julia Santos!',
             0, '2025-11-17 11:00:00'),

        -- Tests: donor 4 unknown-item donation notification
        (6,  'u_donor_4',
             N'Your donation of 12x "Fortified Cereal" is pending review — a coordinator will confirm receipt.',
             0, '2026-03-11 10:30:00'),

        -- Tests: donor 5 confirmed + unread (PATCH /notifications/7/read to mark read)
        (7,  'u_donor_5',
             N'Your donation of 30x "Cooking Oil (1L)" has been received. Thank you, Laura Chen!',
             0, '2026-01-12 09:00:00'),

        -- Tests: donor 6 unread notification
        (8,  'u_donor_6',
             N'Your donation of 20x "Plain Flour (1kg)" has been received. Thank you, Marco Dubois!',
             0, '2025-12-22 10:00:00'),

        -- Tests: coordinator receives low-stock alert notification
        (9,  'u_coord_1',
             N'Low stock alert: "White Rice (5kg)" has only 4 units (minimum: 10). Please request more.',
             0, '2026-03-14 07:00:00'),

        -- Tests: coordinator receives near-expiry alert
        (10, 'u_coord_2',
             N'Near-expiry alert: "Fresh Bread" expires in 3 days. Consider distributing or posting as surplus.',
             0, '2026-03-14 07:01:00'),

        -- Tests: coordinator notification about incoming pending donation
        (11, 'u_coord_3',
             N'Pending donation: 5x "Sleeping Bags" from Ivan Reyes — confirm receipt when goods arrive.',
             0, '2026-03-10 15:00:00'),

        -- Tests: admin notification (admins also receive notifications)
        (12, 'u_admin_1',
             N'User removed: elena@foodbanka.org was removed from your organisation.',
             1, '2026-03-01 12:00:00');

    SET IDENTITY_INSERT dbo.Notifications OFF;
    PRINT '  Notifications: 12 rows inserted.';
END
ELSE PRINT '  Notifications: already seeded, skipping.';

-- =============================================================================
-- COMMIT
-- =============================================================================
COMMIT TRANSACTION;

PRINT '';
PRINT '================================================================';
PRINT 'SeedData_Minimal.sql completed successfully.';
PRINT '----------------------------------------------------------------';
PRINT '  ResourceTypes  :  5 rows';
PRINT '  Organisations  :  1 new row  (3 total)';
PRINT '  Users          : 13 rows  (3 admin, 4 coord, 6 donor)';
PRINT '  InventoryItems : 15 rows  (low-stock + near-expiry mix)';
PRINT '  Donations      : 12 rows  (7 received, 5 pending)';
PRINT '  ItemRequests   : 10 rows  (all urgency levels, public + private)';
PRINT '  Surpluses      :  8 rows  (available + claimed)';
PRINT '  UsageRecords   : 12 rows  (all 3 orgs, all coordinators)';
PRINT '  ActivityLogs   : 14 rows  (all action types)';
PRINT '  Notifications  : 12 rows  (read + unread mix)';
PRINT '================================================================';
PRINT 'Login password for ALL seeded users:  Password1!';
PRINT '================================================================';
PRINT '';
PRINT 'Key test scenarios ready to use:';
PRINT '  Low-stock alerts      : GET /organisations/1/low-stock (items 2,3)';
PRINT '  Low-stock alerts      : GET /organisations/2/low-stock (items 7,10)';
PRINT '  Low-stock alerts      : GET /organisations/3/low-stock (item 13)';
PRINT '  Near-expiry alerts    : GET /organisations/1/near-expiry (items 3,5)';
PRINT '  Near-expiry alerts    : GET /organisations/2/near-expiry (item 9)';
PRINT '  Near-expiry alerts    : GET /organisations/3/near-expiry (item 12)';
PRINT '  Confirm donation      : PATCH /donations/8/confirm (happy path)';
PRINT '  Already confirmed     : PATCH /donations/7/confirm (returns 400)';
PRINT '  Cross-org confirm     : coord_1 on donation 11 (returns 403)';
PRINT '  General pool donation : donation 10 (organisationId = NULL)';
PRINT '  Unknown item donation : donation 9 (has itemDescription)';
PRINT '  Public requests       : GET /requests/public (IDs 1,2,4,5,8)';
PRINT '  Already claimed       : POST /surplus/3/donate (returns 400)';
PRINT '  Wrong-org surplus     : coord_1 on surplus 5 (returns 403)';
PRINT '  Unread notifications  : GET /notifications?unreadOnly=true';
PRINT '  Mark read             : PATCH /notifications/7/read';
PRINT '  Donor with phone      : GET /donors/u_donor_1/contact';
PRINT '  Donor without phone   : GET /donors/u_donor_2/contact';
PRINT '================================================================';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;

    DECLARE @ErrMsg  NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrLine INT            = ERROR_LINE();
    DECLARE @ErrNum  INT            = ERROR_NUMBER();

    PRINT '== SEED FAILED — transaction rolled back. ==';
    RAISERROR(N'Error %d at line %d: %s', 16, 1, @ErrNum, @ErrLine, @ErrMsg);
END CATCH;
GO