import { useState } from "react";
import type {Race} from "../types.ts";
import MonitorCheckbox from "./MonitorCheckbox.tsx";
import { ChevronToggle } from "./ChevronToggle";
import { StageRows } from "./StageRows";
import { CHEVRON_SLOT } from "../../Utils/Constants";
import { americanizeDate } from "../../Utils/Dates";
import { countryToFlagEmojis } from "../../Utils/Flags.ts";
import type {RaceStatus} from "../../types.ts";

function determineIfActive(race:Race, activeList:string[]):boolean{
    if(race.type === 1){
        return activeList.has(race.id);
    }else{
        return [...activeList].filter(s => s.startsWith(`${race.id}::`)).length === race.stages;
    }
}

export default function TableRow({ race, activeList, raceStatus }: { race: Race; activeList: Set<string>, raceStatus:RaceStatus[] }) {
    const [expanded, setExpanded] = useState(false);
    const [isActiveState, setIsActiveState] = useState(determineIfActive(race, activeList));
    const toggleExpand = () => setExpanded(p => !p);
    const isStageRace = race.type !== 1;

    const status:RaceStatus = raceStatus.find(e => e.id === race.id);

    let statusColor = "transparent";
    if(status?.status == "good"){
        statusColor = "green";
    }else if(status?.status == "downloading"){
        statusColor = "yellow";
    }else if(status?.status == "future"){
        statusColor = "blue";
    }else if(status?.status == "bad"){
        statusColor = "red";
    }

    return (
        <>
            {/* Main race row */}
            <tr style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderLeft: "5px solid " + statusColor }}>
                <td style={{ padding: "8px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: "12px", minWidth: "12px", flex: `0 0 12px`, display: "flex", justifyContent: "center" }}>
                            {isStageRace && <ChevronToggle open={expanded} onClick={toggleExpand} />}
                        </div>
                        <MonitorCheckbox uuid={race.id} isActive={isActiveState} onToggle={(state:boolean)=>{setIsActiveState(state); console.log("TEST", state);}} />
                    </div>
                </td>

                <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                    {race.end
                        ? `${americanizeDate(race.start)} – ${americanizeDate(race.end)}`
                        : americanizeDate(race.start)}
                </td>
                <td style={{ padding: "8px 6px", color: [...activeList].filter(s => s.startsWith(`${race.id}`)).length > 0 ? "#FFCC00" : "" }}>{race.name}</td>
                <td style={{ padding: "8px 6px" }}><span style={{ fontSize: 14, marginRight: 6 }}>{countryToFlagEmojis(race.country)}</span>
                    {race.country}</td>
                <td style={{ padding: "8px 6px" }}>{isStageRace ? "Stage Race" : "Classic"}</td>
                <td style={{ padding: "8px 6px" }}>{race.level}</td>
            </tr>

            {/* Stage rows */}
            {isStageRace && expanded && (
                <StageRows race={race} expanded={expanded} isActive={isActiveState} activeList={activeList} raceStatus={raceStatus}/>
            )}
        </>
    );
}
