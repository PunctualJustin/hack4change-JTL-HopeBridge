import express, { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { pool, poolConnect, sql } from "./index.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

const JWT_SECRET  = process.env.JWT_SECRET ?? "dev_secret_change_me";
const SALT_ROUNDS = 10;

app.use(express.json());

interface ResourceType {
  id: number;
  name: string;
  HasExpDate: boolean;
  Description: string;
  UnitType: string;
}

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  BroughtInDate: Date;
  Organisation: string;
  ExpiryDate?: Date;
  User: string;
  ResourceTypeID: number;
  minStock?: number;
}

interface Organisation {
  id: number;
  name: string;
  location?: string;
  requirements: string[];          
  expiryThresholdDays: number;
}

interface Donation {
  id: number;
  donorId: string;
  donorName: string;
  organisationId: number | null;
  itemName: string;
  itemDescription?: string;
  quantity: number;
  donatedAt: Date;
  status: "pending" | "received";
  confirmedAt: Date | null;
}

type UserRole = "donor" | "coordinator" | "org_admin";

interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organisationId: number | null;
  phone?: string;
}

interface ItemRequest {
  id: number;
  organisationId: number;
  itemName: string;
  quantity: number;
  urgency: "low" | "medium" | "high";
  status: "open" | "fulfilled";
  createdAt: Date;
  postedPublicly: boolean;
}

interface ActivityLog {
  id: number;
  organisationId: number;
  action: string;
  performedBy: string;
  timestamp: Date;
}

interface Notification {
  id: number;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface Surplus {
  id: number;
  organisationId: number;
  itemName: string;
  quantity: number;
  expiryDate?: Date;
  available: boolean;
}

interface UsageRecord {
  id: number;
  organisationId: number;
  itemName: string;
  quantityUsed: number;
  usedAt: Date;
  recordedBy: string;
}

interface JwtPayload {
  id: string;
  role: UserRole;
  organisationId: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}


function req() {
  return pool.request();
}

function validateItemInput(data: any): string | null {
  if (!data.name     || typeof data.name     !== "string") return "Item name is required and must be a string.";
  if (!data.category || typeof data.category !== "string") return "Item category is required and must be a string.";
  if (typeof data.quantity !== "number" || data.quantity < 0) return "Quantity must be a non-negative number.";
  return null;
}

async function pushNotification(userId: string, message: string): Promise<void> {
  try {
    await req()
      .input("userId",  sql.NVarChar(50),   userId)
      .input("message", sql.NVarChar(2000),  message)
      .query(`
        INSERT INTO dbo.Notifications (UserID, Message, IsRead, CreatedAt)
        VALUES (@userId, @message, 0, SYSUTCDATETIME())
      `);
  } catch (err) {
    console.error("pushNotification error:", (err as Error).message);
  }
}

async function logActivity(
  organisationId: number,
  action: string,
  performedBy: string
): Promise<void> {
  try {
    await req()
      .input("orgId",       sql.Int,          organisationId)
      .input("action",      sql.NVarChar(1000), action)
      .input("performedBy", sql.NVarChar(50),   performedBy)
      .query(`
        INSERT INTO dbo.ActivityLogs (OrganisationID, Action, PerformedBy, Timestamp)
        VALUES (@orgId, @action, @performedBy, SYSUTCDATETIME())
      `);
  } catch (err) {
    console.error("logActivity error:", (err as Error).message);
  }
}

function mapOrg(row: any): Organisation {
  return {
    id:                  row.OrganisationID,
    name:                row.Name,
    location:            row.Location ?? undefined,
    requirements:        row.Requirements ? (row.Requirements as string).split(",").map((s: string) => s.trim()) : [],
    expiryThresholdDays: row.ExpiryThresholdDays,
  };
}

function mapInventoryItem(row: any): InventoryItem {
  return {
    id:             row.InventoryItemID,
    name:           row.Name,
    category:       row.Category,
    quantity:       row.Quantity,
    BroughtInDate:  row.BroughtInDate,
    Organisation:   row.OrganisationName ?? "",
    ExpiryDate:     row.ExpiryDate ?? undefined,
    User:           row.CreatedByUserID,
    ResourceTypeID: row.ResourceTypeID,
    minStock:       row.MinStock ?? undefined,
  };
}

function mapDonation(row: any): Donation {
  return {
    id:              row.DonationID,
    donorId:         row.DonorID,
    donorName:       row.DonorName,
    organisationId:  row.OrganisationID ?? null,
    itemName:        row.ItemName,
    itemDescription: row.ItemDescription ?? undefined,
    quantity:        row.Quantity,
    donatedAt:       row.DonatedAt,
    status:          row.Status as "pending" | "received",
    confirmedAt:     row.ConfirmedAt ?? null,
  };
}

function mapItemRequest(row: any): ItemRequest {
  return {
    id:             row.ItemRequestID,
    organisationId: row.OrganisationID,
    itemName:       row.ItemName,
    quantity:       row.Quantity,
    urgency:        row.Urgency as "low" | "medium" | "high",
    status:         row.Status  as "open" | "fulfilled",
    createdAt:      row.CreatedAt,
    postedPublicly: row.PostedPublicly === true || row.PostedPublicly === 1,
  };
}

function mapSurplus(row: any): Surplus {
  return {
    id:             row.SurplusID,
    organisationId: row.OrganisationID,
    itemName:       row.ItemName,
    quantity:       row.Quantity,
    expiryDate:     row.ExpiryDate ?? undefined,
    available:      row.Available === true || row.Available === 1,
  };
}

function mapUsageRecord(row: any): UsageRecord {
  return {
    id:             row.UsageRecordID,
    organisationId: row.OrganisationID,
    itemName:       row.ItemName,
    quantityUsed:   row.QuantityUsed,
    usedAt:         row.UsedAt,
    recordedBy:     row.RecordedBy,
  };
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header." });
    return;
  }
  const token = header.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Token missing." });
    return;
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: "Unauthenticated." }); return; }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Required role(s): ${roles.join(", ")}.` });
      return;
    }
    next();
  };
}

/**
 * POST /auth/register
 * Hashes the password, inserts into dbo.Users, returns the new user (no hash).
 * Body: { name, email, password, role?, organisationId?, phone? }
 */
app.post("/auth/register", async (request: Request, res: Response) => {
  try {
    const { name, email, password, role, organisationId, phone } = request.body;

    if (!name     || typeof name     !== "string") return res.status(400).json({ error: "name is required." });
    if (!email    || typeof email    !== "string") return res.status(400).json({ error: "email is required." });
    if (!password || typeof password !== "string") return res.status(400).json({ error: "password is required." });
    if (phone !== undefined && (typeof phone !== "string" || phone.trim() === "")) {
      return res.status(400).json({ error: "phone must be a non-empty string when provided." });
    }

    const dupCheck = await req()
      .input("email", sql.NVarChar(320), email)
      .query("SELECT 1 FROM dbo.Users WHERE Email = @email");
    if (dupCheck.recordset.length > 0) {
      return res.status(400).json({ error: "A user with that email already exists." });
    }

    const validRoles: UserRole[] = ["donor", "coordinator", "org_admin"];
    const assignedRole: UserRole = validRoles.includes(role) ? role : "donor";
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = `u${Date.now()}`;

    await req()
      .input("userId",       sql.NVarChar(50),  userId)
      .input("name",         sql.NVarChar(300),  name)
      .input("email",        sql.NVarChar(320),  email)
      .input("passwordHash", sql.NVarChar(100),  passwordHash)
      .input("role",         sql.NVarChar(20),   assignedRole)
      .input("orgId",        sql.Int,            organisationId ?? null)
      .input("phone",        sql.NVarChar(50),   phone?.trim() ?? null)
      .query(`
        INSERT INTO dbo.Users (UserID, Name, Email, PasswordHash, Role, OrganisationID, Phone)
        VALUES (@userId, @name, @email, @passwordHash, @role, @orgId, @phone)
      `);

    res.status(201).json({
      message: "User registered successfully.",
      user: { id: userId, name, email, role: assignedRole, organisationId: organisationId ?? null, phone: phone?.trim() ?? null },
    });
  } catch (err) {
    console.error("POST /auth/register:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /auth/login
 * Looks up the user by email, verifies bcrypt hash, returns signed JWT.
 * Body: { email, password }
 */
app.post("/auth/login", async (request: Request, res: Response) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required." });

    const result = await req()
      .input("email", sql.NVarChar(320), email)
      .query("SELECT UserID, PasswordHash, Role, OrganisationID FROM dbo.Users WHERE Email = @email");

    if (result.recordset.length === 0) return res.status(401).json({ error: "Invalid credentials." });

    const row = result.recordset[0];
    const match = await bcrypt.compare(password, row.PasswordHash);
    if (!match) return res.status(401).json({ error: "Invalid credentials." });

    const token = jwt.sign(
      { id: row.UserID, role: row.Role, organisationId: row.OrganisationID } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ message: "Login successful.", token });
  } catch (err) {
    console.error("POST /auth/login:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** GET /items — any authenticated user; returns all inventory rows. */
app.get("/items", requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await req().query("SELECT * FROM dbo.InventoryItems ORDER BY InventoryItemID");
    res.json(result.recordset.map(mapInventoryItem));
  } catch (err) {
    console.error("GET /items:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /items/search?name=...
 * Any authenticated user; returns matching inventory rows or a 404 hint.
 * NOTE: this route must be declared BEFORE /items/:id or Express will match
 * "search" as the :id segment.
 */
app.get("/items/search", requireAuth, async (request: Request, res: Response) => {
  try {
    const name = request.query.name as string;
    if (!name) return res.status(400).json({ error: "Query param 'name' is required." });

    const result = await req()
      .input("name", sql.NVarChar(300), `%${name}%`)
      .query("SELECT * FROM dbo.InventoryItems WHERE Name LIKE @name ORDER BY InventoryItemID");

    if (result.recordset.length === 0) {
      return res.status(404).json({
        error: "No items found.",
        hint: "Item does not exist. You can add it via POST /items with a name and description.",
      });
    }
    res.json(result.recordset.map(mapInventoryItem));
  } catch (err) {
    console.error("GET /items/search:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** GET /items/:id — any authenticated user. */
app.get("/items/:id", requireAuth, async (request: Request, res: Response) => {
  try {
    const id = Number(request.params.id);
    const result = await req()
      .input("id", sql.Int, id)
      .query("SELECT * FROM dbo.InventoryItems WHERE InventoryItemID = @id");

    if (result.recordset.length === 0) return res.status(404).json({ error: "Item not found." });
    res.json(mapInventoryItem(result.recordset[0]));
  } catch (err) {
    console.error("GET /items/:id:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** POST /items — coordinator or admin only. Inserts and returns the new item. */
app.post("/items", requireAuth, requireRole("coordinator", "org_admin"), async (request: Request, res: Response) => {
  try {
    const error = validateItemInput(request.body);
    if (error) return res.status(400).json({ error });

    const { name, category, quantity, Organisation, ResourceTypeID, minStock, ExpiryDate } = request.body;
    const userId = request.user!.id;

    let orgId: number | null = null;
    if (Organisation) {
      const orgRow = await req()
        .input("orgName", sql.NVarChar(300), Organisation)
        .query("SELECT OrganisationID FROM dbo.Organisations WHERE Name = @orgName");
      orgId = orgRow.recordset[0]?.OrganisationID ?? null;
    }

    const result = await req()
      .input("name",         sql.NVarChar(300), name)
      .input("category",     sql.NVarChar(200), category)
      .input("quantity",     sql.Int,           quantity)
      .input("orgName",      sql.NVarChar(300), Organisation ?? null)
      .input("orgId",        sql.Int,           orgId)
      .input("expiryDate",   sql.DateTime2,     ExpiryDate ? new Date(ExpiryDate) : null)
      .input("userId",       sql.NVarChar(50),  userId)
      .input("resourceType", sql.Int,           ResourceTypeID ?? 0)
      .input("minStock",     sql.Int,           minStock ?? 5)
      .query(`
        INSERT INTO dbo.InventoryItems
          (Name, Category, Quantity, BroughtInDate, OrganisationName, OrganisationID,
           ExpiryDate, CreatedByUserID, ResourceTypeID, MinStock)
        VALUES
          (@name, @category, @quantity, SYSUTCDATETIME(), @orgName, @orgId,
           @expiryDate, @userId, @resourceType, @minStock);

        SELECT * FROM dbo.InventoryItems WHERE InventoryItemID = SCOPE_IDENTITY();
      `);

    const newItem = mapInventoryItem(result.recordset[0]);
    if (request.user!.organisationId) {
      await logActivity(request.user!.organisationId, `Added inventory item: ${newItem.name}`, userId);
    }
    res.status(201).json(newItem);
  } catch (err) {
    console.error("POST /items:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** PUT /items/:id — coordinator or admin only. Updates and returns the item. */
app.put("/items/:id", requireAuth, requireRole("coordinator", "org_admin"), async (request: Request, res: Response) => {
  try {
    const id = Number(request.params.id);
    const error = validateItemInput(request.body);
    if (error) return res.status(400).json({ error });

    const { name, category, quantity } = request.body;

    const result = await req()
      .input("id",       sql.Int,          id)
      .input("name",     sql.NVarChar(300), name)
      .input("category", sql.NVarChar(200), category)
      .input("quantity", sql.Int,           quantity)
      .query(`
        UPDATE dbo.InventoryItems
        SET Name = @name, Category = @category, Quantity = @quantity
        WHERE InventoryItemID = @id;

        SELECT * FROM dbo.InventoryItems WHERE InventoryItemID = @id;
      `);

    if (result.recordset.length === 0) return res.status(404).json({ error: "Item not found." });

    const updated = mapInventoryItem(result.recordset[0]);
    if (request.user!.organisationId) {
      await logActivity(request.user!.organisationId, `Updated inventory item: ${updated.name}`, request.user!.id);
    }
    res.json(updated);
  } catch (err) {
    console.error("PUT /items/:id:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** DELETE /items/:id — admin only. */
app.delete("/items/:id", requireAuth, requireRole("org_admin"), async (request: Request, res: Response) => {
  try {
    const id = Number(request.params.id);

    // Fetch before deleting so we can return it in the response
    const fetchResult = await req()
      .input("id", sql.Int, id)
      .query("SELECT * FROM dbo.InventoryItems WHERE InventoryItemID = @id");

    if (fetchResult.recordset.length === 0) return res.status(404).json({ error: "Item not found." });

    const deleted = mapInventoryItem(fetchResult.recordset[0]);

    await req()
      .input("id", sql.Int, id)
      .query("DELETE FROM dbo.InventoryItems WHERE InventoryItemID = @id");

    if (request.user!.organisationId) {
      await logActivity(request.user!.organisationId, `Deleted inventory item: ${deleted.name}`, request.user!.id);
    }
    res.json({ message: "Item deleted successfully.", item: deleted });
  } catch (err) {
    console.error("DELETE /items/:id:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /donate
 * Inserts a pending donation. Inventory does NOT change here — only on confirm.
 * Body: { itemName, quantity, organisationId?, itemDescription? }
 */
app.post("/donate", requireAuth, async (request: Request, res: Response) => {
  try {
    const { itemName, quantity, organisationId, itemDescription } = request.body;

    if (!itemName || typeof itemName !== "string") {
      return res.status(400).json({ error: "itemName is required and must be a string." });
    }
    if (typeof quantity !== "number" || quantity <= 0) {
      return res.status(400).json({ error: "quantity must be a positive number." });
    }

    let orgId: number | null = null;
    if (organisationId != null) {
      const orgCheck = await req()
        .input("orgId", sql.Int, Number(organisationId))
        .query("SELECT OrganisationID FROM dbo.Organisations WHERE OrganisationID = @orgId");
      if (orgCheck.recordset.length === 0) return res.status(404).json({ error: "Organisation not found." });
      orgId = Number(organisationId);
    }

    const userRow = await req()
      .input("userId", sql.NVarChar(50), request.user!.id)
      .query("SELECT Name FROM dbo.Users WHERE UserID = @userId");
    const donorName: string = userRow.recordset[0]?.Name ?? request.user!.id;

    const result = await req()
      .input("donorId",         sql.NVarChar(50),   request.user!.id)
      .input("donorName",       sql.NVarChar(300),  donorName)
      .input("orgId",           sql.Int,            orgId)
      .input("itemName",        sql.NVarChar(300),  itemName)
      .input("itemDescription", sql.NVarChar(1000), itemDescription ?? null)
      .input("quantity",        sql.Int,            quantity)
      .query(`
        INSERT INTO dbo.Donations
          (DonorID, DonorName, OrganisationID, ItemName, ItemDescription, Quantity,
           DonatedAt, Status, ConfirmedAt)
        VALUES
          (@donorId, @donorName, @orgId, @itemName, @itemDescription, @quantity,
           SYSUTCDATETIME(), 'pending', NULL);

        SELECT * FROM dbo.Donations WHERE DonationID = SCOPE_IDENTITY();
      `);

    const newDonation = mapDonation(result.recordset[0]);

    if (orgId) {
      await logActivity(orgId, `Donation pending: ${quantity}x ${itemName} from ${donorName}`, request.user!.id);
    }

    res.status(201).json({ message: "Donation submitted. Awaiting coordinator confirmation.", donation: newDonation });
  } catch (err) {
    console.error("POST /donate:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /donate/:organisationId — legacy route kept for backwards compatibility.
 * Reuses the same INSERT logic as POST /donate.
 */
app.post("/donate/:organisationId", requireAuth, async (request: Request, res: Response) => {
  try {
    const { itemName, quantity, itemDescription } = request.body;
    const organisationId = Number(request.params.organisationId);

    if (!itemName || typeof itemName !== "string") {
      return res.status(400).json({ error: "itemName is required and must be a string." });
    }
    if (typeof quantity !== "number" || quantity <= 0) {
      return res.status(400).json({ error: "quantity must be a positive number." });
    }

    const orgCheck = await req()
      .input("orgId", sql.Int, organisationId)
      .query("SELECT OrganisationID FROM dbo.Organisations WHERE OrganisationID = @orgId");
    if (orgCheck.recordset.length === 0) return res.status(404).json({ error: "Organisation not found." });

    const userRow = await req()
      .input("userId", sql.NVarChar(50), request.user!.id)
      .query("SELECT Name FROM dbo.Users WHERE UserID = @userId");
    const donorName: string = userRow.recordset[0]?.Name ?? request.user!.id;

    const result = await req()
      .input("donorId",         sql.NVarChar(50),   request.user!.id)
      .input("donorName",       sql.NVarChar(300),  donorName)
      .input("orgId",           sql.Int,            organisationId)
      .input("itemName",        sql.NVarChar(300),  itemName)
      .input("itemDescription", sql.NVarChar(1000), itemDescription ?? null)
      .input("quantity",        sql.Int,            quantity)
      .query(`
        INSERT INTO dbo.Donations
          (DonorID, DonorName, OrganisationID, ItemName, ItemDescription, Quantity,
           DonatedAt, Status, ConfirmedAt)
        VALUES
          (@donorId, @donorName, @orgId, @itemName, @itemDescription, @quantity,
           SYSUTCDATETIME(), 'pending', NULL);

        SELECT * FROM dbo.Donations WHERE DonationID = SCOPE_IDENTITY();
      `);

    const newDonation = mapDonation(result.recordset[0]);
    await logActivity(organisationId, `Donation pending: ${quantity}x ${itemName} from ${donorName}`, request.user!.id);

    res.status(201).json({ message: "Donation submitted. Awaiting coordinator confirmation.", donation: newDonation });
  } catch (err) {
    console.error("POST /donate/:organisationId:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /donations/history
 * Donors see only their own rows; coordinators/admins see their org's rows.
 */
app.get("/donations/history", requireAuth, async (request: Request, res: Response) => {
  try {
    const { id, role, organisationId } = request.user!;

    let result;
    if (role === "donor") {
      result = await req()
        .input("donorId", sql.NVarChar(50), id)
        .query("SELECT * FROM dbo.Donations WHERE DonorID = @donorId ORDER BY DonationID");
    } else {
      result = await req()
        .input("orgId", sql.Int, organisationId)
        .query("SELECT * FROM dbo.Donations WHERE OrganisationID = @orgId ORDER BY DonationID");
    }

    if (result.recordset.length === 0) return res.status(404).json({ error: "No donation history found." });
    res.json(result.recordset.map(mapDonation));
  } catch (err) {
    console.error("GET /donations/history:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** GET /donations/history/:donorId — legacy; donors can only see their own. */
app.get("/donations/history/:donorId", requireAuth, async (request: Request, res: Response) => {
  try {
    const { donorId } = request.params;

    if (request.user!.role === "donor" && request.user!.id !== donorId) {
      return res.status(403).json({ error: "Donors can only view their own donation history." });
    }

    const result = await req()
      .input("donorId", sql.NVarChar(50), donorId)
      .query("SELECT * FROM dbo.Donations WHERE DonorID = @donorId ORDER BY DonationID");

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "No donation history found for this donor." });
    }
    res.json(result.recordset.map(mapDonation));
  } catch (err) {
    console.error("GET /donations/history/:donorId:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * PATCH /donations/:donationId/confirm
 * Coordinator / admin only.
 * Marks the donation received, updates inventory, and notifies the donor.
 * Inventory count ONLY increases here — not on donation submission.
 */
app.patch(
  "/donations/:donationId/confirm",
  requireAuth,
  requireRole("coordinator", "org_admin"),
  async (request: Request, res: Response) => {
    try {
      const donationId = Number(request.params.donationId);

      const donationResult = await req()
        .input("donationId", sql.Int, donationId)
        .query("SELECT * FROM dbo.Donations WHERE DonationID = @donationId");

      if (donationResult.recordset.length === 0) {
        return res.status(404).json({ error: "Donation not found." });
      }

      const donation = mapDonation(donationResult.recordset[0]);

      if (donation.status === "received") {
        return res.status(400).json({
          error: "This donation has already been marked as received.",
          confirmedAt: donation.confirmedAt,
        });
      }

      if (donation.organisationId != null && donation.organisationId !== request.user!.organisationId) {
        return res.status(403).json({ error: "You can only confirm donations for your own organisation." });
      }

      await req()
        .input("donationId",  sql.Int,      donationId)
        .input("confirmedAt", sql.DateTime2, new Date())
        .query(`
          UPDATE dbo.Donations
          SET Status = 'received', ConfirmedAt = @confirmedAt
          WHERE DonationID = @donationId
        `);

      const orgRow = await req()
        .input("orgId", sql.Int, donation.organisationId)
        .query("SELECT Name FROM dbo.Organisations WHERE OrganisationID = @orgId");
      const orgName: string = orgRow.recordset[0]?.Name ?? "";

      const existingRow = await req()
        .input("itemName", sql.NVarChar(300), donation.itemName)
        .input("orgName",  sql.NVarChar(300), orgName)
        .query(`
          SELECT InventoryItemID, Quantity
          FROM dbo.InventoryItems
          WHERE LOWER(Name) = LOWER(@itemName) AND OrganisationName = @orgName
        `);

      if (existingRow.recordset.length > 0) {
        // Increment existing row
        await req()
          .input("qty", sql.Int, donation.quantity)
          .input("id",  sql.Int, existingRow.recordset[0].InventoryItemID)
          .query("UPDATE dbo.InventoryItems SET Quantity = Quantity + @qty WHERE InventoryItemID = @id");
      } else {
        // Insert a new inventory row for the donated item
        await req()
          .input("name",     sql.NVarChar(300), donation.itemName)
          .input("orgName",  sql.NVarChar(300), orgName)
          .input("orgId",    sql.Int,           donation.organisationId)
          .input("quantity", sql.Int,           donation.quantity)
          .input("donorId",  sql.NVarChar(50),  donation.donorId)
          .query(`
            INSERT INTO dbo.InventoryItems
              (Name, Category, Quantity, BroughtInDate, OrganisationName, OrganisationID,
               CreatedByUserID, ResourceTypeID, MinStock)
            VALUES
              (@name, 'donation', @quantity, SYSUTCDATETIME(), @orgName, @orgId,
               @donorId, 0, 5)
          `);
      }

      if (donation.organisationId) {
        await logActivity(
          donation.organisationId,
          `Confirmed receipt: ${donation.quantity}x ${donation.itemName}`,
          request.user!.id
        );
      }

      await pushNotification(
        donation.donorId,
        `Your donation of ${donation.quantity}x "${donation.itemName}" has been received and confirmed. Thank you, ${donation.donorName}!`
      );

      const updated = await req()
        .input("donationId", sql.Int, donationId)
        .query("SELECT * FROM dbo.Donations WHERE DonationID = @donationId");

      res.json({
        message: `Donation #${donationId} confirmed as received.`,
        donation: mapDonation(updated.recordset[0]),
      });
    } catch (err) {
      console.error("PATCH /donations/:donationId/confirm:", err);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

/** GET /organisations/:id/low-stock — any authenticated user. */
app.get("/organisations/:id/low-stock", requireAuth, async (request: Request, res: Response) => {
  try {
    const orgId = Number(request.params.id);

    const orgResult = await req()
      .input("orgId", sql.Int, orgId)
      .query("SELECT * FROM dbo.Organisations WHERE OrganisationID = @orgId");

    if (orgResult.recordset.length === 0) return res.status(404).json({ error: "Organisation not found." });
    const org = mapOrg(orgResult.recordset[0]);

    // Items whose Quantity is below their MinStock threshold
    const lowResult = await req()
      .input("orgName", sql.NVarChar(300), org.name)
      .query(`
        SELECT InventoryItemID, Name, Quantity, MinStock
        FROM dbo.InventoryItems
        WHERE OrganisationName = @orgName
          AND MinStock IS NOT NULL
          AND Quantity < MinStock
        ORDER BY InventoryItemID
      `);

    if (lowResult.recordset.length === 0) {
      return res.json({ message: "All items are sufficiently stocked.", lowStockItems: [] });
    }

    res.json({
      message: `${lowResult.recordset.length} item(s) are below minimum stock for ${org.name}.`,
      lowStockItems: lowResult.recordset.map((r: any) => ({
        id:              r.InventoryItemID,
        name:            r.Name,
        currentQuantity: r.Quantity,
        minStock:        r.MinStock,
      })),
    });
  } catch (err) {
    console.error("GET /organisations/:id/low-stock:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** GET /organisations/:id/requirements — any authenticated user. */
app.get("/organisations/:id/requirements", requireAuth, async (request: Request, res: Response) => {
  try {
    const orgId = Number(request.params.id);

    const result = await req()
      .input("orgId", sql.Int, orgId)
      .query("SELECT * FROM dbo.Organisations WHERE OrganisationID = @orgId");

    if (result.recordset.length === 0) return res.status(404).json({ error: "Organisation not found." });

    const org = mapOrg(result.recordset[0]);
    res.json({ organisationId: org.id, organisationName: org.name, requirements: org.requirements });
  } catch (err) {
    console.error("GET /organisations/:id/requirements:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /organisations/:id/near-expiry
 * Coordinator / admin: lists items expiring within the org's threshold window.
 */
app.get(
  "/organisations/:id/near-expiry",
  requireAuth,
  requireRole("coordinator", "org_admin"),
  async (request: Request, res: Response) => {
    try {
      const orgId = Number(request.params.id);

      const orgResult = await req()
        .input("orgId", sql.Int, orgId)
        .query("SELECT * FROM dbo.Organisations WHERE OrganisationID = @orgId");

      if (orgResult.recordset.length === 0) return res.status(404).json({ error: "Organisation not found." });
      if (request.user!.organisationId !== orgId) {
        return res.status(403).json({ error: "You can only view near-expiry alerts for your own organisation." });
      }

      const org = mapOrg(orgResult.recordset[0]);

      // DATEADD computes the threshold window entirely in SQL
      const nearResult = await req()
        .input("orgName",          sql.NVarChar(300), org.name)
        .input("thresholdDays",    sql.Int,           org.expiryThresholdDays)
        .query(`
          SELECT InventoryItemID, Name, Quantity, ExpiryDate,
                 DATEDIFF(day, SYSUTCDATETIME(), ExpiryDate) AS DaysLeft
          FROM dbo.InventoryItems
          WHERE OrganisationName = @orgName
            AND ExpiryDate IS NOT NULL
            AND ExpiryDate > SYSUTCDATETIME()
            AND ExpiryDate <= DATEADD(day, @thresholdDays, SYSUTCDATETIME())
          ORDER BY ExpiryDate
        `);

      res.json({
        thresholdDays:  org.expiryThresholdDays,
        nearExpiryItems: nearResult.recordset.map((r: any) => ({
          id:         r.InventoryItemID,
          name:       r.Name,
          quantity:   r.Quantity,
          expiryDate: r.ExpiryDate,
          daysLeft:   r.DaysLeft,
        })),
      });
    } catch (err) {
      console.error("GET /organisations/:id/near-expiry:", err);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

/**
 * PATCH /organisations/:id/expiry-threshold
 * Admin only: update the org's near-expiry warning window.
 * Body: { days: number }
 */
app.patch(
  "/organisations/:id/expiry-threshold",
  requireAuth,
  requireRole("org_admin"),
  async (request: Request, res: Response) => {
    try {
      const orgId = Number(request.params.id);

      const orgResult = await req()
        .input("orgId", sql.Int, orgId)
        .query("SELECT * FROM dbo.Organisations WHERE OrganisationID = @orgId");

      if (orgResult.recordset.length === 0) return res.status(404).json({ error: "Organisation not found." });
      if (request.user!.organisationId !== orgId) {
        return res.status(403).json({ error: "You can only configure your own organisation." });
      }

      const { days } = request.body;
      if (typeof days !== "number" || days < 1) {
        return res.status(400).json({ error: "days must be a positive number." });
      }

      await req()
        .input("days",  sql.Int, days)
        .input("orgId", sql.Int, orgId)
        .query("UPDATE dbo.Organisations SET ExpiryThresholdDays = @days WHERE OrganisationID = @orgId");

      const updated = await req()
        .input("orgId", sql.Int, orgId)
        .query("SELECT * FROM dbo.Organisations WHERE OrganisationID = @orgId");

      const org = mapOrg(updated.recordset[0]);
      res.json({ message: `Expiry threshold updated to ${days} days for ${org.name}.`, organisation: org });
    } catch (err) {
      console.error("PATCH /organisations/:id/expiry-threshold:", err);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

/** GET /activity-log — coordinator / admin: their org's activity. */
app.get("/activity-log", requireAuth, requireRole("coordinator", "org_admin"), async (request: Request, res: Response) => {
  try {
    const result = await req()
      .input("orgId", sql.Int, request.user!.organisationId)
      .query("SELECT * FROM dbo.ActivityLogs WHERE OrganisationID = @orgId ORDER BY Timestamp DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /activity-log:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** GET /usage-report — coordinator / admin: their org's usage records. */
app.get("/usage-report", requireAuth, requireRole("coordinator", "org_admin"), async (request: Request, res: Response) => {
  try {
    const result = await req()
      .input("orgId", sql.Int, request.user!.organisationId)
      .query("SELECT * FROM dbo.UsageRecords WHERE OrganisationID = @orgId ORDER BY UsedAt DESC");
    res.json(result.recordset.map(mapUsageRecord));
  } catch (err) {
    console.error("GET /usage-report:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /usage — record items consumed. Decrements the inventory count.
 * Body: { itemName, quantityUsed }
 */
app.post("/usage", requireAuth, requireRole("coordinator", "org_admin"), async (request: Request, res: Response) => {
  try {
    const { itemName, quantityUsed } = request.body;

    if (!itemName || typeof itemName !== "string") return res.status(400).json({ error: "itemName is required." });
    if (typeof quantityUsed !== "number" || quantityUsed <= 0) {
      return res.status(400).json({ error: "quantityUsed must be a positive number." });
    }

    const orgResult = await req()
      .input("orgId", sql.Int, request.user!.organisationId)
      .query("SELECT Name FROM dbo.Organisations WHERE OrganisationID = @orgId");
    if (orgResult.recordset.length === 0) {
      return res.status(404).json({ error: "Organisation not found for this user." });
    }
    const orgName: string = orgResult.recordset[0].Name;

    const itemResult = await req()
      .input("itemName", sql.NVarChar(300), itemName)
      .input("orgName",  sql.NVarChar(300), orgName)
      .query(`
        SELECT InventoryItemID, Quantity
        FROM dbo.InventoryItems
        WHERE LOWER(Name) = LOWER(@itemName) AND OrganisationName = @orgName
      `);

    if (itemResult.recordset.length === 0) {
      return res.status(404).json({ error: `Item "${itemName}" not found in your inventory.` });
    }

    const item = itemResult.recordset[0];
    if (item.Quantity < quantityUsed) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${item.Quantity}.` });
    }

    // Decrement stock
    await req()
      .input("qty", sql.Int, quantityUsed)
      .input("id",  sql.Int, item.InventoryItemID)
      .query("UPDATE dbo.InventoryItems SET Quantity = Quantity - @qty WHERE InventoryItemID = @id");

    const usageResult = await req()
      .input("orgId",      sql.Int,          request.user!.organisationId)
      .input("itemName",   sql.NVarChar(300), itemName)
      .input("qty",        sql.Int,           quantityUsed)
      .input("recordedBy", sql.NVarChar(50),  request.user!.id)
      .query(`
        INSERT INTO dbo.UsageRecords (OrganisationID, ItemName, QuantityUsed, UsedAt, RecordedBy)
        VALUES (@orgId, @itemName, @qty, SYSUTCDATETIME(), @recordedBy);

        SELECT * FROM dbo.UsageRecords WHERE UsageRecordID = SCOPE_IDENTITY();
      `);

    await logActivity(request.user!.organisationId!, `Recorded usage: ${quantityUsed}x ${itemName}`, request.user!.id);

    const record = mapUsageRecord(usageResult.recordset[0]);
    res.status(201).json({
      message: "Usage recorded.",
      record,
      updatedQuantity: item.Quantity - quantityUsed,
    });
  } catch (err) {
    console.error("POST /usage:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /requests — post an item request with urgency.
 * Body: { itemName, quantity, urgency, postPublicly? }
 */
app.post("/requests", requireAuth, requireRole("coordinator", "org_admin"), async (request: Request, res: Response) => {
  try {
    const { itemName, quantity, urgency, postPublicly } = request.body;

    if (!itemName || typeof itemName !== "string") return res.status(400).json({ error: "itemName is required." });
    if (typeof quantity !== "number" || quantity <= 0) return res.status(400).json({ error: "quantity must be positive." });
    if (!["low", "medium", "high"].includes(urgency)) {
      return res.status(400).json({ error: "urgency must be 'low', 'medium', or 'high'." });
    }

    const result = await req()
      .input("orgId",         sql.Int,          request.user!.organisationId)
      .input("itemName",      sql.NVarChar(300), itemName)
      .input("quantity",      sql.Int,           quantity)
      .input("urgency",       sql.NVarChar(10),  urgency)
      .input("postPublicly",  sql.Bit,           postPublicly === true ? 1 : 0)
      .query(`
        INSERT INTO dbo.ItemRequests
          (OrganisationID, ItemName, Quantity, Urgency, Status, CreatedAt, PostedPublicly)
        VALUES
          (@orgId, @itemName, @quantity, @urgency, 'open', SYSUTCDATETIME(), @postPublicly);

        SELECT * FROM dbo.ItemRequests WHERE ItemRequestID = SCOPE_IDENTITY();
      `);

    const newRequest = mapItemRequest(result.recordset[0]);
    await logActivity(
      request.user!.organisationId!,
      `Posted item request: ${quantity}x ${itemName} (urgency: ${urgency})`,
      request.user!.id
    );

    res.status(201).json({ message: "Request posted.", request: newRequest });
  } catch (err) {
    console.error("POST /requests:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** GET /requests/public — any authenticated user: open public item requests. */
app.get("/requests/public", requireAuth, async (_request: Request, res: Response) => {
  try {
    const result = await req().query(`
      SELECT * FROM dbo.ItemRequests
      WHERE PostedPublicly = 1 AND Status = 'open'
      ORDER BY CreatedAt DESC
    `);
    res.json(result.recordset.map(mapItemRequest));
  } catch (err) {
    console.error("GET /requests/public:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /surplus — post a surplus item for other orgs to claim.
 * Body: { itemName, quantity, expiryDate? }
 */
app.post("/surplus", requireAuth, requireRole("coordinator", "org_admin"), async (request: Request, res: Response) => {
  try {
    const { itemName, quantity, expiryDate } = request.body;

    if (!itemName || typeof itemName !== "string") return res.status(400).json({ error: "itemName is required." });
    if (typeof quantity !== "number" || quantity <= 0) return res.status(400).json({ error: "quantity must be positive." });

    const orgCheck = await req()
      .input("orgId", sql.Int, request.user!.organisationId)
      .query("SELECT OrganisationID FROM dbo.Organisations WHERE OrganisationID = @orgId");
    if (orgCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Organisation not found for this user." });
    }

    const result = await req()
      .input("orgId",      sql.Int,          request.user!.organisationId)
      .input("itemName",   sql.NVarChar(300), itemName)
      .input("quantity",   sql.Int,           quantity)
      .input("expiryDate", sql.DateTime2,     expiryDate ? new Date(expiryDate) : null)
      .query(`
        INSERT INTO dbo.Surpluses (OrganisationID, ItemName, Quantity, ExpiryDate, Available)
        VALUES (@orgId, @itemName, @quantity, @expiryDate, 1);

        SELECT * FROM dbo.Surpluses WHERE SurplusID = SCOPE_IDENTITY();
      `);

    const newSurplus = mapSurplus(result.recordset[0]);
    await logActivity(request.user!.organisationId!, `Posted surplus: ${quantity}x ${itemName}`, request.user!.id);

    res.status(201).json({ message: "Surplus posted.", surplus: newSurplus });
  } catch (err) {
    console.error("POST /surplus:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** GET /surplus — any authenticated user: all available surplus items. */
app.get("/surplus", requireAuth, async (_request: Request, res: Response) => {
  try {
    const result = await req().query(
      "SELECT * FROM dbo.Surpluses WHERE Available = 1 ORDER BY SurplusID"
    );
    res.json(result.recordset.map(mapSurplus));
  } catch (err) {
    console.error("GET /surplus:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /surplus/:surplusId/donate
 * Marks a surplus as claimed and creates a pending donation to the target org.
 * Body: { targetOrganisationId }
 */
app.post(
  "/surplus/:surplusId/donate",
  requireAuth,
  requireRole("coordinator", "org_admin"),
  async (request: Request, res: Response) => {
    try {
      const surplusId = Number(request.params.surplusId);

      const surplusResult = await req()
        .input("surplusId", sql.Int, surplusId)
        .query("SELECT * FROM dbo.Surpluses WHERE SurplusID = @surplusId");

      if (surplusResult.recordset.length === 0) {
        return res.status(404).json({ error: "Surplus item not found." });
      }

      const surplus = mapSurplus(surplusResult.recordset[0]);

      if (!surplus.available) return res.status(400).json({ error: "This surplus has already been claimed." });
      if (surplus.organisationId !== request.user!.organisationId) {
        return res.status(403).json({ error: "You can only donate surplus from your own organisation." });
      }

      const { targetOrganisationId } = request.body;
      if (!targetOrganisationId) return res.status(400).json({ error: "targetOrganisationId is required." });

      const targetOrgResult = await req()
        .input("orgId", sql.Int, Number(targetOrganisationId))
        .query("SELECT Name FROM dbo.Organisations WHERE OrganisationID = @orgId");
      if (targetOrgResult.recordset.length === 0) {
        return res.status(404).json({ error: "Target organisation not found." });
      }
      const targetOrgName: string = targetOrgResult.recordset[0].Name;

      await req()
        .input("surplusId", sql.Int, surplusId)
        .query("UPDATE dbo.Surpluses SET Available = 0 WHERE SurplusID = @surplusId");

      const userRow = await req()
        .input("userId", sql.NVarChar(50), request.user!.id)
        .query("SELECT Name FROM dbo.Users WHERE UserID = @userId");
      const donorName: string = userRow.recordset[0]?.Name ?? request.user!.id;

      const donationResult = await req()
        .input("donorId",   sql.NVarChar(50),  request.user!.id)
        .input("donorName", sql.NVarChar(300),  donorName)
        .input("orgId",     sql.Int,            Number(targetOrganisationId))
        .input("itemName",  sql.NVarChar(300),  surplus.itemName)
        .input("quantity",  sql.Int,            surplus.quantity)
        .query(`
          INSERT INTO dbo.Donations
            (DonorID, DonorName, OrganisationID, ItemName, Quantity,
             DonatedAt, Status, ConfirmedAt)
          VALUES
            (@donorId, @donorName, @orgId, @itemName, @quantity,
             SYSUTCDATETIME(), 'pending', NULL);

          SELECT * FROM dbo.Donations WHERE DonationID = SCOPE_IDENTITY();
        `);

      const newDonation = mapDonation(donationResult.recordset[0]);

      await logActivity(
        surplus.organisationId,
        `Donated surplus ${surplus.quantity}x ${surplus.itemName} to ${targetOrgName}`,
        request.user!.id
      );
      await logActivity(
        Number(targetOrganisationId),
        `Incoming surplus donation: ${surplus.quantity}x ${surplus.itemName}`,
        request.user!.id
      );

      res.status(201).json({ message: "Surplus donated. Awaiting target org confirmation.", donation: newDonation });
    } catch (err) {
      console.error("POST /surplus/:surplusId/donate:", err);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

/** GET /admin/users — admin only: all users in their org (no password hashes). */
app.get("/admin/users", requireAuth, requireRole("org_admin"), async (request: Request, res: Response) => {
  try {
    const result = await req()
      .input("orgId", sql.Int, request.user!.organisationId)
      .query(`
        SELECT UserID, Name, Email, Role, OrganisationID, Phone
        FROM dbo.Users
        WHERE OrganisationID = @orgId
        ORDER BY Name
      `);

    res.json(result.recordset.map((r: any) => ({
      id:             r.UserID,
      name:           r.Name,
      email:          r.Email,
      role:           r.Role,
      organisationId: r.OrganisationID,
      phone:          r.Phone ?? null,
    })));
  } catch (err) {
    console.error("GET /admin/users:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** DELETE /admin/users/:userId — admin only: remove a user from their org. */
app.delete("/admin/users/:userId", requireAuth, requireRole("org_admin"), async (request: Request, res: Response) => {
  try {
    const { userId } = request.params;

    if (userId === request.user!.id) {
      return res.status(400).json({ error: "You cannot remove yourself." });
    }

    const fetchResult = await req()
      .input("userId", sql.NVarChar(50), userId)
      .input("orgId",  sql.Int,          request.user!.organisationId)
      .query(`
        SELECT UserID, Name, Email, Role, OrganisationID, Phone
        FROM dbo.Users
        WHERE UserID = @userId AND OrganisationID = @orgId
      `);

    if (fetchResult.recordset.length === 0) {
      return res.status(404).json({ error: "User not found in your organisation." });
    }

    await req()
      .input("userId", sql.NVarChar(50), userId)
      .input("orgId",  sql.Int,          request.user!.organisationId)
      .query("DELETE FROM dbo.Users WHERE UserID = @userId AND OrganisationID = @orgId");

    const removed = fetchResult.recordset[0];
    await logActivity(request.user!.organisationId!, `Removed user: ${removed.Email}`, request.user!.id);

    res.json({
      message: "User removed.",
      user: {
        id:             removed.UserID,
        name:           removed.Name,
        email:          removed.Email,
        role:           removed.Role,
        organisationId: removed.OrganisationID,
        phone:          removed.Phone ?? null,
      },
    });
  } catch (err) {
    console.error("DELETE /admin/users/:userId:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /notifications — current user's notifications.
 * Query param ?unreadOnly=true to filter to unread only.
 */
app.get("/notifications", requireAuth, async (request: Request, res: Response) => {
  try {
    const unreadOnly = request.query.unreadOnly === "true";

    const query = unreadOnly
      ? `SELECT * FROM dbo.Notifications WHERE UserID = @userId AND IsRead = 0 ORDER BY CreatedAt DESC`
      : `SELECT * FROM dbo.Notifications WHERE UserID = @userId ORDER BY CreatedAt DESC`;

    const result = await req()
      .input("userId", sql.NVarChar(50), request.user!.id)
      .query(query);

    res.json(result.recordset.map((r: any) => ({
      id:        r.NotificationID,
      userId:    r.UserID,
      message:   r.Message,
      read:      r.IsRead === true || r.IsRead === 1,
      createdAt: r.CreatedAt,
    })));
  } catch (err) {
    console.error("GET /notifications:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** PATCH /notifications/:notificationId/read — mark a notification as read. */
app.patch("/notifications/:notificationId/read", requireAuth, async (request: Request, res: Response) => {
  try {
    const notifId = Number(request.params.notificationId);

    const fetchResult = await req()
      .input("notifId", sql.Int,          notifId)
      .input("userId",  sql.NVarChar(50), request.user!.id)
      .query(`
        SELECT * FROM dbo.Notifications
        WHERE NotificationID = @notifId AND UserID = @userId
      `);

    if (fetchResult.recordset.length === 0) {
      return res.status(404).json({ error: "Notification not found." });
    }

    await req()
      .input("notifId", sql.Int,          notifId)
      .input("userId",  sql.NVarChar(50), request.user!.id)
      .query(`
        UPDATE dbo.Notifications SET IsRead = 1
        WHERE NotificationID = @notifId AND UserID = @userId
      `);

    const r = fetchResult.recordset[0];
    res.json({
      message: "Notification marked as read.",
      notification: {
        id:        r.NotificationID,
        userId:    r.UserID,
        message:   r.Message,
        read:      true,
        createdAt: r.CreatedAt,
      },
    });
  } catch (err) {
    console.error("PATCH /notifications/:notificationId/read:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /donors/:donorId/contact
 * Coordinator / admin: retrieve a donor's contact details.
 */
app.get(
  "/donors/:donorId/contact",
  requireAuth,
  requireRole("coordinator", "org_admin"),
  async (request: Request, res: Response) => {
    try {
      const { donorId } = request.params;

      const result = await req()
        .input("donorId", sql.NVarChar(50), donorId)
        .query(`
          SELECT UserID, Name, Email, Phone
          FROM dbo.Users
          WHERE UserID = @donorId AND Role = 'donor'
        `);

      if (result.recordset.length === 0) return res.status(404).json({ error: "Donor not found." });

      const donor = result.recordset[0];
      res.json({
        id:          donor.UserID,
        name:        donor.Name,
        email:       donor.Email,
        phone:       donor.Phone ?? null,
        contactNote: donor.Phone
          ? "Phone number available."
          : "No phone number on file — contact via email only.",
      });
    } catch (err) {
      console.error("GET /donors/:donorId/contact:", err);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

/**
 * GET /donors
 * Coordinator / admin: list all donors with contact details.
 */
app.get(
  "/donors",
  requireAuth,
  requireRole("coordinator", "org_admin"),
  async (_request: Request, res: Response) => {
    try {
      const result = await req().query(`
        SELECT UserID, Name, Email, Phone
        FROM dbo.Users
        WHERE Role = 'donor'
        ORDER BY Name
      `);

      res.json(result.recordset.map((r: any) => ({
        id:    r.UserID,
        name:  r.Name,
        email: r.Email,
        phone: r.Phone ?? null,
      })));
    } catch (err) {
      console.error("GET /donors:", err);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

poolConnect.then(() => {
  app.listen(PORT, () => {
    console.log(`Connected to SQL Server.`);
    console.log(`Inventory API running at http://localhost:${PORT}`);
  });
}).catch((err: Error) => {
  console.error("Failed to connect to database. Server not started.", err.message);
  process.exit(1);
});