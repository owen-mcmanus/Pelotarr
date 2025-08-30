import { useEffect, useState } from "react";
import MonitorCheckbox from "./Main/MonitorCheckbox.tsx";
import TableRow from "./Main/TableRow.tsx";
import type {Race, RaceStatus} from "../types.ts";


const YELLOW = "#FFCC00";

const startKey = (dm: string) => {
    // "21.01" -> 1*100 + 21 = 121 (month*100 + day)
    const [d, m] = dm.split(".").map((n) => parseInt(n, 10));
    return (m || 0) * 100 + (d || 0);
};

export default function MainPanel() {
    const [data, setData] = useState<Race[] | null>(null);
    const [activeId, setActiveId] = useState<Set<string>>(new Set());
    const [raceStatus, setRaceStatus] = useState<RaceStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const ac = new AbortController();

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch("/api/races.json", {
                    signal: ac.signal,
                    headers: { Accept: "application/json" },
                });

                if (!res.ok) {
                    let msg = `${res.status} ${res.statusText}`;
                    try {
                        const j = await res.json();
                        if (j?.error) msg = j.error;
                    } catch {}
                    throw new Error(msg);
                }

                const json = (await res.json())["races"];
                if (!Array.isArray(json)) throw new Error("Unexpected JSON shape");
                const sorted = [...(json as Race[])].sort(
                    (a, b) => startKey(a.start) - startKey(b.start)
                );
                setData(sorted);
            } catch (e: any) {
                if (e?.name !== "AbortError") setError(e?.message ?? String(e));
            } finally {
                setLoading(false);
            }
        })();

        (async () => {
            try {
                const res = await fetch("/api/monitor", { headers: { Accept: "application/json" } });
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                const json = await res.json();
                const ids = Array.isArray(json?.ids) ? json.ids : [];
                setActiveId(new Set(ids));
            } catch (e: any) {
            } finally {
            }
        })();

        (async () => {
            try {
                const res = await fetch("/api/status", { headers: { Accept: "application/json" } });
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                const json = await res.json();
                const status: RaceStatus[] = Array.isArray(json?.races) ? json.races : [];
                setRaceStatus(status);
                console.log(status);
            } catch (e: any) {
            } finally {
            }
        })();

        return () => ac.abort();
    }, []);

    return (
        <div
            style={{
                backgroundColor: "#202020",
                display: "flex",
                alignItems: "center",
            }}
        >
            <div style={{ padding: 16, color: "#eaeaea", width: "100%", overflow: "auto" }}>
                {loading && <div>Loading races…</div>}
                {error && <div style={{ color: "#ff6b6b" }}>Failed to load: {error}</div>}
                {!loading && !error && data && (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                        <tr style={{ textAlign: "left", color: YELLOW }}>
                            <th style={{ padding: "8px 6px" }}><img src={"https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Generic_Feed-icon.svg/256px-Generic_Feed-icon.svg.png?20120905025810"} alt={"rss"} style={{width:"20px", marginLeft:"2px", marginTop:"5px"}}/></th>
                            <th style={{ padding: "8px 6px" }}>Date</th>
                            <th style={{ padding: "8px 6px" }}>Race</th>
                            <th style={{ padding: "8px 6px" }}>Country</th>
                            <th style={{ padding: "8px 6px" }}>Type</th>
                            <th style={{ padding: "8px 6px" }}>Level</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((r, i) => (
                            <TableRow key={r.id} race={r} activeList={activeId} raceStatus={raceStatus}/>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}