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
    encrypt: process.env.DB_ENCRYPT !== "false",
    trustServerCertificate: process.env.DB_TRUST_CERT === "true",
  },
 
  pool: {
    max: 10,
    min:  2,
    idleTimeoutMillis: 30_000,
  },
 
  connectionTimeout: 15_000,
};
 
export const pool = new sql.ConnectionPool(dbConfig);
 
export const poolConnect = pool.connect();
 
poolConnect.catch((err: Error) => {
  console.error("❌  SQL Server connection failed:", err.message);
  process.exit(1);
});
 
export { sql };
 