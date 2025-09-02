import FilterBar from "../Components/FilterBar.tsx";
import {MainPanel, Category} from "../Components/MainPanel.tsx";
import { useLocation } from "react-router-dom";
import {useCallback, useEffect, useMemo, useState} from "react";
import type {RaceStatus} from "../types.ts";

export default function Main() {
    const [raceStatus, setRaceStatus] = useState<RaceStatus[]>([]);

    const { pathname } = useLocation();

    const category = useMemo(() => {
        const seg = pathname.split("/")[1]?.toLowerCase() || "";
        if (seg === "women") return Category.WOMEN;
        if (seg === "cx") return Category.CX;
        if (seg === "search") return Category.SEARCH;
        return Category.MEN; // default
    }, [pathname]);

    const onSyncStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/status", { headers: { Accept: "application/json" } });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const json = await res.json();
            const status: RaceStatus[] = Array.isArray(json?.races) ? json.races : [];
            setRaceStatus(status);
            console.log(status);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        onSyncStatus();
    }, [onSyncStatus]);

    return <div style={{ display:'flex', flexDirection:"column", flexGrow: 1 }}>
        <FilterBar onSyncStatus={onSyncStatus}/>
        <MainPanel category={category} raceStatus={raceStatus}/>
        </div>;
}
