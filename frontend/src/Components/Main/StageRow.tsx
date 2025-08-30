import { memo } from "react";
import MonitorCheckbox from "./MonitorCheckbox.tsx";
import { STAGE_BG, YELLOW, CHEVRON_SLOT } from "../../Utils/Constants";
import { calulateStageDay } from "../../Utils/Dates";
import type {RaceStatus} from "../../types.ts";

type Props = {
    raceId: string;
    startDate: string;        // "DD.MM"
    index: number;            // 0-based stage index
    expanded: boolean;
    isActive: boolean;
    raceStatus: RaceStatus[];
};

function StageRowBase({ raceId, startDate, index, expanded, isActive, raceStatus }: Props) {
    const contentStyle: React.CSSProperties = {
        maxHeight: expanded ? 40 : 0,
        opacity: expanded ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 240ms ease, opacity 180ms ease, padding 240ms ease",
        padding: expanded ? "8px 6px" : "0px 6px",
    };

    const status:RaceStatus = raceStatus.find(e => e.id === raceId + "::" + String(index+1));

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
        <tr aria-hidden={!expanded}>
            {/* 1st col: left stripe + chevron slot + checkbox */}
            <td style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.06)", background: STAGE_BG, borderLeft: "5px solid " + statusColor }}>
                <div style={{ ...contentStyle, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12}} />
                    <MonitorCheckbox uuid={raceId} isActive={isActive} stage={index + 1}/>
                </div>
            </td>

            {/* 2nd col: date */}
            <td style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.06)", background: STAGE_BG }}>
                <div style={contentStyle}>{calulateStageDay(startDate, index + 1)}</div>
            </td>

            {/* 3rd col: label */}
            <td style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.06)", background: STAGE_BG }}>
                <div style={contentStyle}>Stage {index + 1}</div>
            </td>

            {/* filler cols to keep 6 total */}
            <td style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.06)", background: STAGE_BG }}>
                <div style={contentStyle} />
            </td>
            <td style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.06)", background: STAGE_BG }}>
                <div style={contentStyle} />
            </td>
            <td style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.06)", background: STAGE_BG }}>
                <div style={contentStyle} />
            </td>
        </tr>
    );
}

export const StageRow = memo(StageRowBase);
