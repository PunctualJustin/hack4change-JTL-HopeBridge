DonationInventory API

A role-based REST API for managing charitable donations, inventory, and inter-organisation coordination — built for the Hack4Change hackathon.

Project Summary

DonationInventory is a backend API designed to help charitable organisations coordinate donations and manage inventory more effectively. Many organisations receive donations from multiple donors but struggle to track what has actually arrived, what items are running low, and which resources are close to expiring.

This API centralises those operations by allowing donors, coordinators, and organisation administrators to interact with the same system through clearly defined roles. Donors can submit donations and track their status, while coordinators confirm physical receipt of items and manage stock levels. Administrators oversee organisational settings and user management.

A key design principle of the system is inventory accuracy. Donations do not immediately affect stock levels when pledged. Instead, inventory only increases once a coordinator or administrator confirms that the donation has physically arrived. This prevents inflated inventory counts and ensures organisations make decisions based on real, available resources.

Beyond basic inventory tracking, the system also supports item requests, surplus sharing between organisations, activity logging, and notification delivery. These features help organisations communicate needs, reduce waste, and collaborate more effectively when distributing resources.

Table of Contents

Project Overview

Tech Stack

Architecture

Database Connection — db.ts

Key Features

API Endpoints

Database Schema

Security Considerations

Design Decisions

AI Usage

1. Project Overview

Charitable organisations often struggle to coordinate donations, track perishable inventory, and communicate needs to donors in real time. DonationInventory solves this by providing a centralised API that connects three distinct user roles:

Donors submit donations and track whether their goods have been received.

Coordinators confirm incoming goods, manage inventory, post surplus items, raise item requests, and record usage.

Organisation Administrators do everything a coordinator can do, and additionally manage users and configure organisation-level settings.

The system enforces a clear confirmation gate: donation submissions never automatically update stock levels. Inventory only increases once a coordinator or administrator physically confirms receipt, ensuring that counts reflect real-world availability rather than unverified pledges.

2. Tech Stack
Layer	Technology
Runtime	Node.js 20+
Framework	Express 4
Language	TypeScript 5
Database	Microsoft SQL Server 2016+ / Azure SQL
DB Client	mssql (connection pool, parameterised queries)
Authentication	JSON Web Tokens (jsonwebtoken)
Password hashing	bcrypt (cost factor 10)
Process config	Environment variables via .env
3. Architecture
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

The API layer handles all HTTP concerns — auth, validation, response shaping. The database handles all persistence, constraint enforcement, and auto-increment identity generation. There is no in-memory state; every read and write goes through the pool.

4. Database Connection — db.ts



5. Key Features

(unchanged)

6. API Endpoints

(unchanged)

7. Database Schema

(unchanged)

8. Security Considerations

(unchanged)

9. Design Decisions

(unchanged)

10. AI Usage

AI tools were used during the development of this project to assist with several aspects of implementation and documentation. The primary uses of AI included:

Boilerplate generation. AI assisted in generating initial scaffolding for parts of the Express server structure, including route handler templates and middleware structure. This helped speed up the setup phase of the project.

Debugging and troubleshooting. AI tools were used to help diagnose issues related to package installation, TypeScript configuration, and database connectivity (particularly when working with the mssql client and connection pooling).

Schema and architecture discussion. AI was used as a sounding board while designing the database schema and API structure. It helped explore possible table relationships, constraints, and approaches for handling role-based access control and inventory updates.

Documentation support. AI assisted in expanding and structuring the README documentation, including explanations of architectural decisions, database connection design, and system behaviour.

All final design decisions, implementation choices, and code integration were reviewed and adjusted manually to ensure the system behaves as intended and reflects the real-world requirements of the project.