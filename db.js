import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DB_FILE = process.env.DB_FILE || "./data/2fast2clean.db";

export async function getDb() {
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database
  });
  await db.exec("PRAGMA foreign_keys = ON");
  return db;
}

async function ensureDataDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function migrate() {
  await ensureDataDir();
  const db = await getDb();

  const schema = fs.readFileSync(path.join(process.cwd(), "schema.sql"), "utf8");
  await db.exec(schema);

  // Seed services (only if empty)
  const row = await db.get("SELECT COUNT(*) AS c FROM services");
  if (row.c === 0) {
    await db.run(
      `INSERT INTO services (code,name,description,price_cents,duration_mins)
       VALUES
       ('express','Express Wash','Exterior rinse & dry',8000,30),
       ('standard','Standard Wash','Exterior + vacuum',12000,45),
       ('premium','Premium Detail','Interior + exterior detail',25000,90)`
    );
  }

  console.log("Migration/seed complete.");
  await db.close();
}

// CLI usage: node db.js migrate
if (process.argv[2] === "migrate") {
  migrate()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
