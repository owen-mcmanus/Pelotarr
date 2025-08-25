import Database from "better-sqlite3";
import {HandleScan} from "./DownloadManager";
const db = new Database("pelotarr.db");

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

function ensureSchema() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS races (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" INTEGER NOT NULL,
      "level" TEXT NOT NULL,
      "start_date" DATE NOT NULL,
      "end_date" DATE,
      "acquired" BOOLEAN DEFAULT FALSE,
      "date_acquired" DATE,
      "file_name" TEXT,
      "file_path" TEXT,
      "file_size_gb" FLOAT
    );
    CREATE INDEX IF NOT EXISTS idx_races_name ON races(name);
  `);
}

function isUuid(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function toSql(v: unknown): number|string|bigint|Buffer|null {
    if (v === undefined) return null;
    if (v === null) return null;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "number" || typeof v === "string" || typeof v === "bigint") return v;
    if (Buffer.isBuffer(v)) return v;
    throw new TypeError(`Unsupported value for SQL bind: ${Object.prototype.toString.call(v)}`);
}

/**
 * Insert a race by UUID. If it already exists, this throws.
 * Pass any subset of fields in `fields` (e.g., { name, start, end, ... }).
 */
export function addRace(id: string, fields: Partial<RaceFields> = {}) {
    ensureSchema();
    if (!isUuid(id)) {
        throw new Error("Invalid UUID");
    }

    const cols: string[] = ["id"];
    const vals: number|string|bigint|Buffer|null[] = [id];
    const placeholders: string[] = ["?"];

    // Only include provided fields
    for (const [k, v] of Object.entries(fields)) {
        if (v === undefined) continue;
        cols.push(k);
        vals.push(toSql(v));
        placeholders.push("?");
    }

    const sql = `INSERT INTO races (${cols.join(",")}) VALUES (${placeholders.join(",")})`;
    const stmt = db.prepare(sql);
    setTimeout(HandleScan, 1000);

    return stmt.run(...vals);
}

/**
 * Remove a race by UUID. Returns number of rows deleted (0 or 1).
 */
export function removeRace(id: string) {
    ensureSchema();
    if (!isUuid(id)) {
        throw new Error("Invalid UUID");
    }
    const stmt = db.prepare(`DELETE FROM races WHERE id = ?`);
    const info = stmt.run(id);
    return info.changes;
}

export function updateRace(id: string, fields: Partial<RaceFields> = {}) {
    ensureSchema();
    if (!isUuid(id)) throw new Error("Invalid UUID");

    const sets: string[] = [];
    const params: (number | string | bigint | Buffer | null)[] = [];

    for (const [k, v] of Object.entries(fields)) {
        if (v === undefined) continue;               // do not touch this column
        sets.push(`"${k}" = ?`);
        params.push(toSql(v));                       // coerce booleans/Dates
    }

    if (sets.length === 0) {
        throw new Error("No valid fields provided to update");
    }

    const sql = `UPDATE races SET ${sets.join(", ")} WHERE id = ?`;
    const info = db.prepare(sql).run(...params, id);
    return info.changes;

}

export function getRace(id: string) {
    ensureSchema();
    return db.prepare(`SELECT * FROM races WHERE id = ?`).get(id);
}
export function listRaces(limit = 100, offset = 0) {
    ensureSchema();
    return db.prepare(`SELECT * FROM races ORDER BY name LIMIT ? OFFSET ?`).all(limit, offset);
}
