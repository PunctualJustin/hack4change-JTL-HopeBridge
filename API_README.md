# DonationInventory API

A role-based REST API for managing charitable donations, inventory, and inter-organisation coordination — built for the Hack4Change hackathon.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Database Connection — db.ts](#4-database-connection--dbts)
5. [Key Features](#5-key-features)
6. [API Endpoints](#6-api-endpoints)
7. [Database Schema](#7-database-schema)
8. [Security Considerations](#8-security-considerations)
9. [Design Decisions](#9-design-decisions)

---

## 1. Project Overview

Charitable organisations often struggle to coordinate donations, track perishable inventory, and communicate needs to donors in real time. DonationInventory solves this by providing a centralised API that connects three distinct user roles:

- **Donors** submit donations and track whether their goods have been received.
- **Coordinators** confirm incoming goods, manage inventory, post surplus items, raise item requests, and record usage.
- **Organisation Administrators** do everything a coordinator can do, and additionally manage users and configure organisation-level settings.

The system enforces a clear **confirmation gate**: donation submissions never automatically update stock levels. Inventory only increases once a coordinator or administrator physically confirms receipt, ensuring that counts reflect real-world availability rather than unverified pledges.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Language | TypeScript 5 |
| Database | Microsoft SQL Server 2016+ / Azure SQL |
| DB Client | `mssql` (connection pool, parameterised queries) |
| Authentication | JSON Web Tokens (`jsonwebtoken`) |
| Password hashing | `bcrypt` (cost factor 10) |
| Process config | Environment variables via `.env` |

---

## 3. Architecture

```
Client (HTTP)
     │
     ▼
┌─────────────────────────────────┐
│         Express API             │
│  server.ts                      │
│  ─ JWT auth middleware          │
│  ─ Role enforcement middleware  │
│  ─ Route handlers               │
│  ─ Row-mapper functions         │
└────────────┬────────────────────┘
             │  mssql connection pool
             ▼
┌─────────────────────────────────┐
│   db.ts — Connection Pool       │
│  Reads config from env vars     │
│  Exports shared pool + sql types│
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   Microsoft SQL Server          │
│   DonationInventoryDB           │
│   10 tables, FK constraints,    │
│   CHECK constraints for enums   │
└─────────────────────────────────┘
```

The API layer handles all HTTP concerns — auth, validation, response shaping. The database handles all persistence, constraint enforcement, and auto-increment identity generation. There is no in-memory state; every read and write goes through the pool.

---

## 4. Database Connection — `db.ts`

All database connectivity is centralised in a single `db.ts` module. Nothing in `server.ts` manages connection state directly — it simply imports the shared pool and fires queries against it.

```typescript
import sql from "mssql";

const dbConfig: sql.config = {
  server:   process.env.DB_SERVER   ?? "localhost",
  database: process.env.DB_NAME     ?? "DonationInventoryDB",
  port:     Number(process.env.DB_PORT ?? 1433),

  authentication: {
    type: "default",
    options: {
      userName: process.env.DB_USER     ?? "",
      password: process.env.DB_PASSWORD ?? "",
    },
  },

  options: {
    // Required for Azure SQL; harmless for on-prem SQL Server
    encrypt: process.env.DB_ENCRYPT !== "false",
    // Set to true only when using a self-signed cert in development
    trustServerCertificate: process.env.DB_TRUST_CERT === "true",
  },

  pool: {
    max: 10,
    min:  2,
    idleTimeoutMillis: 30_000,
  },

  // Abort a connection attempt after 15 s instead of hanging forever
  connectionTimeout: 15_000,
};

export const pool = new sql.ConnectionPool(dbConfig);
export const poolConnect = pool.connect();

poolConnect.catch((err: Error) => {
  console.error("❌  SQL Server connection failed:", err.message);
  process.exit(1);
});

// Re-export sql so callers can use sql.NVarChar etc. without a second import
export { sql };
```

### How it works

**Lazy connection pool.** `new sql.ConnectionPool(dbConfig)` constructs the pool object but does not open any connections. Connections are created on first use and kept alive up to the `max` limit of 10. The `min: 2` setting ensures two warm connections are always ready, reducing cold-start latency on the first request after idle periods.

**Single shared promise.** `poolConnect = pool.connect()` kicks off the initial handshake and returns a promise. Every route handler awaits `poolConnect` implicitly (via `pool.request()`) rather than opening its own connection. This guarantees the entire application shares one pool rather than each request competing to establish its own.

**Fail-fast on startup.** The `.catch()` handler calls `process.exit(1)` if the initial connection fails. This surfaces misconfigured credentials or an unreachable server immediately — before the Express server starts accepting requests — rather than letting the process start and fail silently on the first query.

**Re-exported `sql` namespace.** Exporting `sql` alongside `pool` means route handlers only need one import (`import { pool, poolConnect, sql } from "./db.js"`) to access both the pool and all type constants like `sql.NVarChar`, `sql.Int`, and `sql.DateTime2`.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DB_SERVER` | `localhost` | SQL Server hostname or Azure SQL FQDN |
| `DB_NAME` | `DonationInventoryDB` | Target database name |
| `DB_USER` | _(empty)_ | SQL Server login username |
| `DB_PASSWORD` | _(empty)_ | SQL Server login password |
| `DB_PORT` | `1433` | SQL Server port |
| `DB_ENCRYPT` | `true` | Set to `"false"` to disable TLS (local dev only) |
| `DB_TRUST_CERT` | `false` | Set to `"true"` to accept self-signed certificates |
| `JWT_SECRET` | `dev_secret_change_me` | JWT signing secret — must be overridden in production |

> **Never commit real credentials.** Copy `.env.example` to `.env` and fill in your values. The `.env` file is excluded from source control.

---

## 5. Key Features

### Role-Based Access Control

Three roles with clear capability hierarchies:

| Capability | Donor | Coordinator | Org Admin |
|---|:---:|:---:|:---:|
| Submit donations | ✓ | ✓ | ✓ |
| View own donation history | ✓ | ✓ | ✓ |
| View public item requests | ✓ | ✓ | ✓ |
| View available surpluses | ✓ | ✓ | ✓ |
| Confirm donation receipt | | ✓ | ✓ |
| Manage inventory items | | ✓ | ✓ |
| Post item requests | | ✓ | ✓ |
| Post surplus items | | ✓ | ✓ |
| Record item usage | | ✓ | ✓ |
| View activity log | | ✓ | ✓ |
| View usage report | | ✓ | ✓ |
| View near-expiry alerts | | ✓ | ✓ |
| Look up donor contact details | | ✓ | ✓ |
| Manage users in organisation | | | ✓ |
| Configure expiry threshold | | | ✓ |
| Delete inventory items | | | ✓ |

### JWT Authentication

Every protected endpoint requires a `Bearer` token in the `Authorization` header. Tokens are signed with HS256 and carry the user's `id`, `role`, and `organisationId`. Role and identity are always read from the verified token — never from the request body.

### Donation Submission and Confirmation Flow

```
Donor submits POST /donate
         │
         ▼
  Donation created  ──────────────────────────────────────────────┐
  status = "pending"                                              │
  ConfirmedAt = NULL                                              │
  Inventory UNCHANGED                                             │
         │                                                        │
  Coordinator / Admin calls                                       │
  PATCH /donations/:id/confirm                                    │
         │                                                        │
         ▼                                                        │
  status = "received"                                             │
  ConfirmedAt = NOW()                                             │
  Inventory quantity INCREMENTED  ◄───────────────────────────────┘
  Donor receives confirmation notification
```

### Inventory Management

- Full CRUD on inventory items (coordinators and above)
- **Low-stock alerts**: `GET /organisations/:id/low-stock` returns every item whose quantity falls below its configured `minStock` threshold
- **Near-expiry alerts**: `GET /organisations/:id/near-expiry` returns items expiring within the organisation's configured warning window (default 7 days, configurable per org by admins)
- Usage recording decrements stock in real time and writes a usage record for audit purposes

### Surplus Sharing

Coordinators can post excess stock as a surplus visible to all authenticated users. Another organisation's coordinator can then claim it, which creates a pending donation to that organisation. The receiving coordinator confirms it in the usual way, updating their inventory upon physical receipt.

### Item Requests

Coordinators post requests specifying an item name, quantity, and urgency level (`low`, `medium`, or `high`). Requests can be posted publicly (visible to all authenticated users including donors) or kept private to the organisation.

### Activity Logging and Notifications

Every significant action — donation confirmations, usage records, item requests, surplus postings, inventory changes — writes an entry to `ActivityLogs` scoped to the performing organisation. Coordinators and admins can retrieve their organisation's full log at any time.

Notifications are delivered asynchronously (fire-and-forget writes) and never block the main response. Donors receive a notification when their donation is confirmed. Low-stock and near-expiry notifications are written programmatically when the relevant conditions are detected.

### Donor Contact Lookup

Coordinators and admins can retrieve a donor's name, email, and phone number (if provided at registration) to follow up about a donation. This information is never exposed to donors themselves.

---

## 6. API Endpoints

### Authentication

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new user with an optional role, organisation, and phone number |
| `POST` | `/auth/login` | Public | Validate credentials and receive a signed JWT |

### Inventory

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/items` | Any | Retrieve all inventory items |
| `GET` | `/items/search?name=` | Any | Search inventory by name; returns a hint if not found |
| `GET` | `/items/:id` | Any | Retrieve a single inventory item by ID |
| `POST` | `/items` | Coordinator, Admin | Add a new inventory item |
| `PUT` | `/items/:id` | Coordinator, Admin | Update an existing inventory item |
| `DELETE` | `/items/:id` | Admin | Remove an inventory item |

### Donations

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/donate` | Any | Submit a donation; optionally target an organisation or donate to the general pool |
| `POST` | `/donate/:organisationId` | Any | Legacy route — submit a donation to a specific organisation by URL param |
| `GET` | `/donations/history` | Any | Donors see their own history; coordinators/admins see their org's incoming donations |
| `GET` | `/donations/history/:donorId` | Any | Retrieve a donor's history; donors can only view their own |
| `PATCH` | `/donations/:donationId/confirm` | Coordinator, Admin | Confirm physical receipt; triggers inventory update and donor notification |

### Organisations

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/organisations/:id/low-stock` | Any | List inventory items below their minimum stock threshold |
| `GET` | `/organisations/:id/requirements` | Any | List the items an organisation is currently requesting |
| `GET` | `/organisations/:id/near-expiry` | Coordinator, Admin | List items expiring within the organisation's configured threshold window |
| `PATCH` | `/organisations/:id/expiry-threshold` | Admin | Update the number of days before expiry that triggers a near-expiry alert |

### Coordinator Operations

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/activity-log` | Coordinator, Admin | View all logged activity for the caller's organisation |
| `GET` | `/usage-report` | Coordinator, Admin | View a summary of items consumed, quantities, and dates |
| `POST` | `/usage` | Coordinator, Admin | Record item consumption; decrements the inventory count |
| `POST` | `/requests` | Coordinator, Admin | Post an item request with urgency level and optional public visibility |
| `GET` | `/requests/public` | Any | Browse all publicly posted, open item requests across all organisations |
| `POST` | `/surplus` | Coordinator, Admin | Post a surplus item available for other organisations to claim |
| `GET` | `/surplus` | Any | Browse all currently available surplus items |
| `POST` | `/surplus/:surplusId/donate` | Coordinator, Admin | Donate a surplus item to another organisation, creating a pending donation |

### Administration

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/admin/users` | Admin | List all users within the admin's organisation (passwords excluded) |
| `DELETE` | `/admin/users/:userId` | Admin | Remove a user from the organisation |

### Notifications

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/notifications` | Any | Retrieve the caller's notifications; `?unreadOnly=true` filters to unread |
| `PATCH` | `/notifications/:notificationId/read` | Any | Mark a notification as read |

### Donor Contact Lookup

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/donors` | Coordinator, Admin | List all donors with name, email, and phone |
| `GET` | `/donors/:donorId/contact` | Coordinator, Admin | Retrieve a single donor's contact details |

---

## 7. Database Schema

All tables live in the `dbo` schema of `DonationInventoryDB`.

| Table | Primary Key | Purpose |
|---|---|---|
| `ResourceTypes` | `ResourceTypeID` (IDENTITY) | Defines item categories (perishable food, clothing, etc.) with unit types and expiry tracking flags |
| `Organisations` | `OrganisationID` (IDENTITY) | Stores each organisation, its location, comma-separated requirements list, and the configurable near-expiry threshold |
| `Users` | `UserID` (NVARCHAR, app-generated) | All users across all roles; stores bcrypt password hash and optional phone; foreign key to `Organisations` |
| `InventoryItems` | `InventoryItemID` (IDENTITY) | Current stock for each item per organisation, with quantity, expiry date, minimum stock threshold, and resource type |
| `Donations` | `DonationID` (IDENTITY) | Donation records in `pending` or `received` state; `ConfirmedAt` and inventory update only populate on confirmation |
| `ItemRequests` | `ItemRequestID` (IDENTITY) | Item requests from coordinators with urgency level, public/private flag, and open/fulfilled status |
| `ActivityLogs` | `ActivityLogID` (IDENTITY) | Append-only audit log of all significant actions within an organisation |
| `Notifications` | `NotificationID` (IDENTITY) | In-app notifications per user with read/unread state |
| `Surpluses` | `SurplusID` (IDENTITY) | Surplus items posted by organisations for others to claim; `Available` flag tracks claimed status |
| `UsageRecords` | `UsageRecordID` (IDENTITY) | Records of item consumption with quantity used, timestamp, and the coordinator who recorded it |

### Constraints

- **CHECK constraints** enforce all enum-like columns: `Users.Role`, `Donations.Status`, `ItemRequests.Urgency`, `ItemRequests.Status`
- A cross-column CHECK on `Donations` ensures `ConfirmedAt IS NOT NULL` if and only if `Status = 'received'`
- **Foreign keys** link every table to its parent with appropriate `ON DELETE` rules (`CASCADE` for operational data, `SET NULL` for user-org links, `NO ACTION` for audit records)
- `Users.Email` carries a `UNIQUE` constraint enforced at the database level

---

## 8. Security Considerations

### JWT Authentication

All protected endpoints require a valid `Bearer` token. The middleware verifies the token's signature against `JWT_SECRET` (from environment variables) and attaches the decoded payload to `req.user`. Any request with a missing, malformed, or expired token receives a `401` response before reaching the route handler. Tokens expire after 8 hours.

### Password Hashing

Passwords are hashed with `bcrypt` at a cost factor of 10 before storage. Plaintext passwords are never written to the database, logged, or returned in any API response. The `PasswordHash` column is never selected in any endpoint response — user objects are always destructured to exclude it before serialisation.

### Parameterised Queries

Every database interaction uses the `mssql` `.input()` API with explicit type declarations (`sql.NVarChar`, `sql.Int`, `sql.DateTime2`, etc.). No SQL is constructed through string concatenation anywhere in the codebase, eliminating the SQL injection attack surface entirely.

### Role Enforcement

The `requireRole()` middleware factory intercepts requests before they reach handler logic and compares the role in the verified JWT payload against the set of roles permitted for that route. Role is never read from the request body, query string, or headers — only from the signed token. A coordinator cannot act as an admin by sending a different role value in the request.

### Organisation Scoping

Coordinators and admins are scoped to their own organisation. All writes (confirm donation, post request, manage users, configure expiry threshold) include a check that the resource's `OrganisationID` matches `req.user.organisationId`. Cross-organisation operations return `403` without exposing the existence or contents of other organisations' data.

---

## 9. Design Decisions

### Inventory only updates on confirmation

When a donor submits a donation, the system records it as `pending` and leaves inventory counts unchanged. Stock only increases when a coordinator or admin calls `PATCH /donations/:id/confirm`. This reflects real-world practice: a pledge is not the same as a delivery. Counting unconfirmed donations as stock would produce inflated numbers, leading organisations to turn away donors or fail to request items they actually need.

### Donor identity is resolved from the JWT, not the request body

Any endpoint that records who performed an action reads the actor's identity from `req.user`, which is populated by the verified JWT. Accepting `donorId`, `userId`, or `role` from the request body would allow any authenticated user to impersonate another user simply by supplying a different ID. Because the JWT is cryptographically signed, it cannot be tampered with without invalidating the signature.

### `pushNotification` and `logActivity` are fire-and-forget

Both helpers are `async` functions that write to the database, but they are wrapped in their own `try/catch` and errors are only logged — they are never re-thrown. A notification write failure or log write failure must never cause the main operation (confirming a donation, recording usage) to return a `500` to the client. These are supplementary records; the core transaction should always complete independently.

### Requirements stored as comma-separated strings

`Organisation.requirements` is stored as a single `NVARCHAR` column containing a comma-separated list (e.g., `"canned goods,rice,pasta"`). The `mapOrg()` function splits and trims this on every read. A normalised junction table would be preferable for production, but this approach minimises schema complexity while preserving the array interface that all existing route handlers and response shapes expect.

### `Users.UserID` is an app-generated string, not a database IDENTITY

All other tables use SQL Server `IDENTITY(1,1)` integer keys. Users are the exception because the original in-memory implementation generated IDs as `"u<timestamp>"` strings. Preserving this pattern means existing JWTs and client references remain valid without a migration. In a production system, this would be standardised to a `UNIQUEIDENTIFIER` (UUID).
