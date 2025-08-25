import path from "path";
import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import { addRace, removeRace, listRaces } from "./Database";
import {HandleScan} from "./DownloadManager";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const PUBLIC_DIR = path.join(process.cwd(), "public");

const racesPath = path.join(PUBLIC_DIR, "races.json");
const racesFile = JSON.parse(fs.readFileSync(racesPath, "utf-8"))["races"];

function strToDate(str: string): Date {
    const [dayStr, monthStr] = str.split(".");
    const day = Number(dayStr);
    const month = Number(monthStr) - 1; // JS months are 0-based
    const now = new Date();

    // default to current year
    return new Date(now.getFullYear(), month, day);
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/monitor", (req, res) => {
    const { id } = req.query;
    if (!id || Array.isArray(id)) return res.status(400).json({ error: "Missing id" });
    try {
        const race = racesFile.find((r: any) => r.id === id);
        addRace(String(id), {
            name:race.name,
            type:race.type,
            level:race.level,
            start_date:strToDate(race.start),
            end_date:race.end ? strToDate(race.end) : null,
            acquired: false
        }); // or include fields: { name: "..." }
        console.log("Added UUID:", id);
        res.json({ ok: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
        console.error(e);
    }
});

app.delete("/monitor", (req, res) => {
    const { id } = req.query;
    if (!id || Array.isArray(id)) return res.status(400).json({ error: "Missing id" });
    try {
        const deleted = removeRace(String(id));
        console.log("Deleted UUID:", id);
        res.json({ ok: true, deleted });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.get("/monitor", (req, res) => {
    try {
        const races = listRaces();
        const ids = races.map(r => r.id);
        res.json({ ok: true, ids });
    } catch (err: any) {
        console.error("Error reading races:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

HandleScan();
const SCAN_INTERVAL_MS = 15 * 60 * 1000;
setInterval(HandleScan, SCAN_INTERVAL_MS);

// Static files
app.use(express.static(PUBLIC_DIR, {}));

// 404 for non-HTML (if it falls through)
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
    console.log(`Static server running at http://localhost:${PORT}`);
    console.log(`Serving ${PUBLIC_DIR}`);
});
