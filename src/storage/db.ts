import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ThreadzeroConfig } from "../types";
import { runMigrations } from "./migrations";

let dbInstance: DatabaseSync | null = null;

export function getDb(config: ThreadzeroConfig): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(config.storage.path);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");

  runMigrations(db);
  dbInstance = db;
  return db;
}
