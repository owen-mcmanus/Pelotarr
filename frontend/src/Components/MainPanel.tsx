import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MonitorCheckbox from "./Main/MonitorCheckbox.tsx";
import TableRow from "./Main/TableRow.tsx";
import type {Race, RaceStatus} from "../types.ts";

export enum Category {
    MEN = "races_men",
    WOMEN = "races_women",
    CX = "races_cx",
    SEARCH = "races_search"
};

const YELLOW = "#FFCC00";

const startKey = (dm: string) => {
    // "21.01" -> 1*100 + 21 = 121 (month*100 + day)
    const [d, m] = dm.split(".").map((n) => parseInt(n, 10));
    return (m || 0) * 100 + (d || 0);
};

export function MainPanel({category, raceStatus}: {category: Category, raceStatus:RaceStatus[]}) {
    const [data, setData] = useState<Race[] | null>(null);
    const [activeId, setActiveId] = useState<Set<string>>(new Set());
    // const [raceStatus, setRaceStatus] = useState<RaceStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { query } = useParams<{ query?: string }>();
    const searchTerm = decodeURIComponent(query ?? "").trim();

    useEffect(() => {
        const ac = new AbortController();

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch("/api/races.json", {
                    signal: ac.signal,
                    headers: {Accept: "application/json"},
                });

                if (!res.ok) {
                    let msg = `${res.status} ${res.statusText}`;
                    try {
                        const j = await res.json();
                        if (j?.error) msg = j.error;
                    } catch {
                    }
                    throw new Error(msg);
                }

                // const json = (await res.json())[category];
                // if (!Array.isArray(json)) throw new Error("Unexpected JSON shape");
                // const sorted = [...(json as Race[])].sort(
                //     (a, b) => startKey(a.start) - startKey(b.start)
                // );
                // setData(sorted);
                const body = await res.json();

                let arr: Race[];

                if (category === Category.SEARCH) {
                    const men = Array.isArray(body?.races_men) ? body.races_men : [];
                    const women = Array.isArray(body?.races_women) ? body.races_women : [];
                    const cx = Array.isArray(body?.races_cx) ? body.races_cx : [];

                    // merge all three
                    arr = men.concat(women, cx);

                    // filter by search term (name/country/level/date fields)
                    const q = (searchTerm ?? "").trim().toLowerCase();
                    if (q) {
                        arr = arr.filter((r) => {
                            const hay = [
                                r.name ?? "",
                                r.country ?? "",
                                r.level ?? "",
                                r.start ?? "",
                                r.end ?? ""
                            ].join(" ").toLowerCase();
                            return hay.includes(q);
                        });
                    }
                } else {
                    const json = body[category];
                    if (!Array.isArray(json)) throw new Error("Unexpected JSON shape");
                    arr = json as Race[];
                }

                const sorted = [...arr].sort((a, b) => startKey(a.start) - startKey(b.start));
                setData(sorted);
            } catch (e: any) {
                if (e?.name !== "AbortError") setError(e?.message ?? String(e));
            } finally {
                setLoading(false);
            }
        })();

        (async () => {
            try {
                const res = await fetch("/api/monitor", {headers: {Accept: "application/json"}});
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                const json = await res.json();
                const ids = Array.isArray(json?.ids) ? json.ids : [];
                setActiveId(new Set(ids));
            } catch (e: any) {
            } finally {
            }
        })();

        return () => ac.abort();
    }, [searchTerm, category]);

    return (
        <div
            style={{
                backgroundColor: "#202020",
                display: "flex",
                alignItems: "flex-start",
                flex:1
            }}
        >
            <div style={{ padding: "0px 0px", color: "#eaeaea", width: "100%", overflow: "auto" }}>
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