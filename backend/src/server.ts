// server.ts
import path from "node:path";
import fs from "node:fs/promises";
import express from "express";
import cors from "cors";

import { addRace, removeRace, listRaces } from "./Database";
import type { RaceFields } from "./Database";
import { HandleScan } from "./DownloadManager";
import { strToDate, isUuidV4 } from "./Utils";
import {checkServerStatus, RaceStatus} from "./Status";

// ---------- Config ----------
const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC_DIR = process.env.PUBLIC_DIR
    ? path.resolve(process.env.PUBLIC_DIR)
    : path.resolve(process.cwd(), "public");
const RACES_JSON = path.join(PUBLIC_DIR, "races.json");
const SCAN_INTERVAL_MS = Number(process.env.SCAN_INTERVAL_MIN * 60 * 1000 ?? 15 * 60 * 1000);
const API_KEY = process.env.API_KEY ?? "";

// ---------- Utils ----------
async function loadRacesFile(): Promise<any[]> {
    const buf = await fs.readFile(RACES_JSON, "utf8").catch((e) => {
        console.error("Failed to read races.json:", e.message);
        throw new Error("races.json missing or unreadable");
    });
    let json: any;
    try {
        json = JSON.parse(buf);
    } catch {
        throw new Error("races.json is invalid JSON");
    }
    const men   = Array.isArray(json?.races_men)   ? json.races_men   : [];
    const women = Array.isArray(json?.races_women) ? json.races_women : [];
    return men.concat(women);
}

function apiKeyGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!API_KEY) return next();
    const key = req.header("X-API-Key");
    if (key && key === API_KEY) return next();
    return res.status(401).json({ error: "Unauthorized" });
}

let scanTimer: NodeJS.Timeout | null = null;
let running = false;
let pending = false;

function scheduleScan(delay = 1000) {
    pending = true;                 // remember that someone asked for a scan
    if (scanTimer) return;          // debounce the timer
    scanTimer = setTimeout(start, delay);
}

async function start() {
    scanTimer = null;               // timer consumed

    if (running) return;            // a run is already in progress; the loop below will catch `pending`
    running = true;

    try {
        // Drain all pending requests. If more come in during HandleScan(),
        // `pending` will be set to true and the loop runs again.
        while (pending) {
            pending = false;
            await HandleScan();
        }
    } catch (e) {
        console.error("HandleScan error:", (e as Error)?.message || e);
    } finally {
        running = false;
    }
}

// ---------- App ----------
const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());


app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/monitor", apiKeyGuard, async (req, res) => {
    const id = String(req.query.id ?? "");
    if (!id || !isUuidV4(id)) return res.status(400).json({ error: "Missing or invalid id" });

    try {
        const races = await loadRacesFile();
        const race = races.find((r: any) => r?.id === id.split("::")[0]);
        if (!race) return res.status(404).json({ error: "Race not found in races.json" });

        const start = strToDate(race.start);
        if (!start) return res.status(400).json({ error: "Invalid start date" });

        const end = race.end ? strToDate(race.end) : null;
        if (race.end && !end) return res.status(400).json({ error: "Invalid end date" });

        if(race.type == 1){
            addRace(id, {
                name: race.name,
                type: Number(race.type),
                level: String(race.level ?? ""),
                start_date: start,
                end_date: end,
                acquired: false
            });
        }else{
            if(id.split("::")[1]){
                addRace(id, {
                    name: race.name + " Stage " + id.split("::")[1],
                    type: Number(race.type),
                    level: String(race.level ?? ""),
                    start_date: start,
                    end_date: end,
                    acquired: false
                });
            }else{
                for(let i = 1; i <= race.stages; i++){
                    addRace(id + "::" + i, {
                        name: race.name + " Stage " + String(i),
                        type: Number(race.type),
                        level: String(race.level ?? ""),
                        start_date: start,
                        end_date: end,
                        acquired: false
                    });
                }
            }
        }



        console.log("Added UUID:", id);
        scheduleScan(1000);
        res.json({ ok: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message || "Failed to add race" });
    }
});

app.delete("/monitor", apiKeyGuard, async (req, res) => {
    const id = String(req.query.id ?? "");
    if (!id || !isUuidV4(id)) return res.status(400).json({ error: "Missing or invalid id" });

    try {
        const races = await loadRacesFile();
        const race = races.find((r: any) => r?.id === id.split("::")[0]);
        let deleted = "";
        if(race.type == 1 || id.split("::")[1]){deleted = removeRace(id);}
        else{
            for(let i = 1; i <= race.stages; i++){
                deleted = removeRace(id + "::" + i);
            }
        }
        console.log("Deleted UUID:", id);
        res.json({ ok: true, deleted });
    } catch (e: any) {
        res.status(400).json({ error: e.message || "Failed to delete race" });
    }
});

app.get("/monitor", (req, res) => {
    try {
        const races: RaceFields[] = listRaces();
        res.json({ ok: true, ids: races.map((r) => r.id) });
    } catch (err: any) {
        console.error("Error reading races:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.get("/status", async (req, res) => {
    try {
        const races: RaceStatus[] = await checkServerStatus();
        res.json({ ok: true, races });
    } catch (err: any) {
        console.error("Error reading races:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.use(express.static(PUBLIC_DIR));
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

if (SCAN_INTERVAL_MS > 0) {
    setInterval(() => scheduleScan(0), SCAN_INTERVAL_MS);
    console.log(`Periodic scan every ${SCAN_INTERVAL_MS / 1000 / 60} minute(s).`);
} else {
    console.log("Periodic scan disabled (SCAN_INTERVAL_MIN=0).");
}

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server http://0.0.0.0:${PORT}`);
    console.log(`Serving ${PUBLIC_DIR}`);
    scheduleScan(0);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
        console.log(`\n${sig} received, shutting down...`);
        if (scanTimer) clearTimeout(scanTimer);
        server.close(() => process.exit(0));
    });
}