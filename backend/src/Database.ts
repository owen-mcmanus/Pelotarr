// Database.ts
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import {isUuidV4} from "./Utils";

const DB_PATH = process.env.DB_PATH ?? "/data/pelotarr.db";

// Ensure parent dir exists so SQLite can create the fil
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Open DB (creates file if missing)
const db = new Database(DB_PATH, { fileMustExist: false, timeout: 3000 });

// Pragmas: reliable defaults for server apps
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

export type RaceFields = {
    id: string;
    name: string;
    type: number;   // 1 or 2
    level: string;  // "UWT" / "Pro" / etc.
    start_date: Date;  // "DD.MM"
    end_date: Date | null;    // "DD.MM" or null
    acquired: boolean;
    date_acquired: Date | null;
    file_name: string | null;
    file_path: string | null;
    file_size_gb: number | null;
};

// --- Schema bootstrap (once) ---
let schemaReady = false;
function ensureSchema(): void {
    if (schemaReady) return;
    db.exec(`
    CREATE TABLE IF NOT EXISTS races (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" INTEGER NOT NULL,
      "level" TEXT NOT NULL,
      "start_date" TEXT NOT NULL,  -- ISO 8601
      "end_date" TEXT,
      "acquired" INTEGER NOT NULL DEFAULT 0, -- 0/1
      "date_acquired" TEXT,
      "file_name" TEXT,
      "file_path" TEXT,
      "file_size_gb" REAL
    );
    CREATE INDEX IF NOT EXISTS idx_races_name ON races("name");
  `);
    schemaReady = true;
}

type SqlValue = number | string | bigint | Buffer | null;
function toSql(v: unknown): SqlValue {
    if (v === undefined || v === null) return null;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (v instanceof Date) return v.toISOString(); // store text ISO
    if (typeof v === "number" || typeof v === "string" || typeof v === "bigint") return v;
    if (Buffer.isBuffer(v)) return v;
    throw new TypeError(`Unsupported value for SQL bind: ${Object.prototype.toString.call(v)}`);
}

/** Convert a DB row (with TEXT dates, 0/1 bools) to typed RaceFields. */
function rowToRace(row: any): RaceFields {
    return {
        id: String(row.id),
        name: String(row.name),
        type: Number(row.type),
        level: String(row.level),
        start_date: new Date(row.start_date),
        end_date: row.end_date ? new Date(row.end_date) : null,
        acquired: !!row.acquired,
        date_acquired: row.date_acquired ? new Date(row.date_acquired) : null,
        file_name: row.file_name ?? null,
        file_path: row.file_path ?? null,
        file_size_gb: row.file_size_gb != null ? Number(row.file_size_gb) : null,
    };
}

const MUTABLE_COLS = [
    "name",
    "type",
    "level",
    "start_date",
    "end_date",
    "acquired",
    "date_acquired",
    "file_name",
    "file_path",
    "file_size_gb",
] as const;
type MutableCol = (typeof MUTABLE_COLS)[number];

function pickMutableFields(fields: Partial<RaceFields>): Array<[MutableCol, SqlValue]> {
    const out: Array<[MutableCol, SqlValue]> = [];
    for (const k of MUTABLE_COLS) {
        const v = (fields as any)[k];
        if (v !== undefined) out.push([k, toSql(v)]);
    }
    return out;
}

// --- CRUD ---
/**
 * Insert a race by UUID. Does not throw if the row already exists.
 * Only columns present in `fields` are included.
 */
export function addRace(id: string, fields: Partial<RaceFields> = {}) {
    ensureSchema();
    if (!isUuidV4(id)) throw new Error("Invalid UUID");

    const pairs = pickMutableFields(fields);             // Array<[col, val]>
    const cols = ["id", ...pairs.map(([k]) => k)];
    const placeholders = cols.map(() => "?");
    const vals: SqlValue[] = [id, ...pairs.map(([, v]) => v)];

    // If we have fields, update them on conflict; otherwise do nothing.
    const conflictClause =
        pairs.length > 0
            ? `ON CONFLICT("id") DO UPDATE SET ${pairs
                .map(([k]) => `"${k}" = excluded."${k}"`)
                .join(", ")}`
            : `ON CONFLICT("id") DO NOTHING`;

    const sql =
        `INSERT INTO races (${cols.map((c) => `"${c}"`).join(",")}) ` +
        `VALUES (${placeholders.join(",")}) ` +
        conflictClause;

    const info = db.prepare(sql).run(...(vals as unknown[]));
    // info.changes:
    //  - 1 if inserted or updated
    //  - 0 if row already existed and DO NOTHING path
    return info;
}

/** Remove a race by UUID. Returns number of rows deleted (0 or 1). */
export function removeRace(id: string): number {
    ensureSchema();
    if (!isUuidV4(id)) throw new Error("Invalid UUID");
    const stmt = db.prepare(`DELETE FROM races WHERE "id" = ?`);
    const info = stmt.run(id);
    return info.changes;
}

/** Update selected fields by UUID. Returns number of rows updated (0 or 1). */
export function updateRace(id: string, fields: Partial<RaceFields> = {}): number {
    ensureSchema();
    if (!isUuidV4(id)) throw new Error("Invalid UUID");

    const pairs = pickMutableFields(fields);
    if (pairs.length === 0) throw new Error("No valid fields provided to update");

    const setSql = pairs.map(([k]) => `"${k}" = ?`).join(", ");
    const params = pairs.map(([, v]) => v);

    const sql = `UPDATE races SET ${setSql} WHERE "id" = ?`;
    const info = db.prepare(sql).run(...params, id);
    return info.changes;
}

/** Get a race by UUID (typed), or null if not found. */
export function getRace(id: string): RaceFields | null {
    ensureSchema();
    if (!isUuidV4(id)) throw new Error("Invalid UUID");
    const row = db.prepare(`SELECT * FROM races WHERE "id" = ?`).get(id);
    return row ? rowToRace(row) : null;
}


/** List races (typed), ordered by name. */
export function listRaces(limit = 100, offset = 0): RaceFields[] {
    ensureSchema();
    const stmt = db.prepare(
        `SELECT * FROM races ORDER BY "name" LIMIT ? OFFSET ?`
    );
    const rows = stmt.all(Math.max(0, limit), Math.max(0, offset));
    return rows.map(rowToRace);
}

process.on("SIGTERM", () => { db.close(); process.exit(0); });
process.on("SIGINT",  () => { db.close(); process.exit(0); });