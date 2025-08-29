// import MonitorCheckbox from "./MonitorCheckbox.tsx";
// import {useState} from "react";
//
// const americanizeDate = (date: string) => {
//     const [dayStr, monthStr] = date.split(".");
//     return `${monthStr}/${dayStr}`
// }
//
// const calulateStageDay = (date:string, stage:number):string => {
//     if (typeof date !== "string" || !date.includes(".")) return date;
//
//     const [dayStr, monthStr] = date.split(".");
//     const day = parseInt(dayStr, 10);
//     const month = parseInt(monthStr, 10);
//
//     if (!Number.isFinite(day) || !Number.isFinite(month)) return date;
//
//     const offset = Math.max(0, (stage ?? 1) - 1); // stage is 1-based
//     const year = new Date().getFullYear();        // pick a sensible current year
//
//     const d = new Date(year, (month - 1), day);
//     d.setDate(d.getDate() + offset);
//
//     const dd = String(d.getDate()).padStart(2, "0");
//     const mm = String(d.getMonth() + 1).padStart(2, "0");
//
//     return `${mm}/${dd}`;
// }
//
//
//
// export default function TableRow({ race, isActive }: { race: Race; isActive: boolean }) {
//     const [expanded, setExpanded] = useState(false);
//     const toggleExpand = () => setExpanded(p => !p);
//     const isStageRace = race.type !== 1;
//
//     // Visual accents
//     const YELLOW = "#FFCC00";
//     const STAGE_BG = "rgba(255, 204, 0, 0.06)"; // subtle yellow tint for stage rows
//     const stageBadgeStyle: React.CSSProperties = {
//         fontSize: 11,
//         lineHeight: "16px",
//         padding: "1px 6px",
//         borderRadius: 999,
//         background: "rgba(255,204,0,0.12)",
//         color: "#ffe185",
//         border: "1px solid rgba(255,204,0,0.25)",
//         marginRight: 8,
//         display: "inline-block",
//         verticalAlign: "middle",
//         userSelect: "none",
//     };
//
//     return (
//         <>
//             {/* Main race row */}
//             <tr style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
//                 <td style={{ padding: "8px 6px" }}>
//                     <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//                         {isStageRace ? (
//                             <img
//                                 src="right-thin-chevron.svg"
//                                 alt="expand"
//                                 onClick={toggleExpand}
//                                 style={{
//                                     width: 12,
//                                     cursor: "pointer",
//                                     transition: "transform 180ms ease",
//                                     transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
//                                 }}
//                             />
//                         ) : (
//                             <div style={{ width: 12 }} />
//                         )}
//                         <MonitorCheckbox uuid={race.id} isActive={isActive} />
//                     </div>
//                 </td>
//
//                 <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
//                     {race.end
//                         ? `${americanizeDate(race.start)} – ${americanizeDate(race.end)}`
//                         : americanizeDate(race.start)}
//                 </td>
//                 <td style={{ padding: "8px 6px" }}>{race.name}</td>
//                 <td style={{ padding: "8px 6px" }}>{race.country}</td>
//                 <td style={{ padding: "8px 6px" }}>{isStageRace ? "Stage Race" : "Classic"}</td>
//                 <td style={{ padding: "8px 6px" }}>{race.level}</td>
//             </tr>
//
//             {/* Stage rows: distinct look, still animate inner content only */}
//             {isStageRace && expanded &&
//                 Array.from({ length: race.stages }, (_, i) => {
//                     const contentStyle: React.CSSProperties = {
//                         maxHeight: expanded ? 40 : 0,
//                         opacity: expanded ? 1 : 0,
//                         overflow: "hidden",
//                         transition: "max-height 240ms ease, opacity 180ms ease, padding 240ms ease",
//                         padding: expanded ? "8px 6px" : "0px 6px",
//                     };
//
//                     return (
//                         <tr key={`${race.id}-stage-${i + 1}`} aria-hidden={!expanded}>
//                             {/* 1st column: stripe + indent + checkbox */}
//                             <td
//                                 style={{
//                                     padding: 0,
//                                     borderTop: "1px solid rgba(255,255,255,0.06)",
//                                     background: STAGE_BG,                 // tint entire stage row
//                                 }}
//                             >
//                                 <div
//                                     style={{
//                                         ...contentStyle,
//                                         display: "flex",
//                                         alignItems: "center",
//                                         gap: 8,
//                                     }}
//                                 >
//                                     {/* Left accent stripe */}
//                                     <div
//                                         style={{
//                                             width: 3,
//                                             height: "100%",
//                                             background: YELLOW,
//                                             borderRadius: 2,
//                                             opacity: 0.7,
//                                         }}
//                                     />
//                                     {/* keep chevron slot width aligned with main row */}
//                                     <div style={{ width: 0 }} />
//                                     {/* Use per-stage uuid if available */}
//                                     <MonitorCheckbox uuid={race.id} isActive={isActive} />
//                                 </div>
//                             </td>
//
//                             {/* 2nd column: stage date */}
//                             <td
//                                 style={{
//                                     padding: 0,
//                                     borderTop: "1px solid rgba(255,255,255,0.06)",
//                                     background: STAGE_BG,
//                                 }}
//                             >
//                                 <div style={contentStyle}>{calulateStageDay(race.start, i + 1)}</div>
//                             </td>
//
//                             {/* 3rd column: stage label + badge */}
//                             <td
//                                 style={{
//                                     padding: 0,
//                                     borderTop: "1px solid rgba(255,255,255,0.06)",
//                                     background: STAGE_BG,
//                                 }}
//                             >
//                                 <div style={{ ...contentStyle, display: "flex", alignItems: "center" }}>
//                                     <span style={stageBadgeStyle}>STAGE</span> {i + 1}
//                                 </div>
//                             </td>
//
//                             {/* Fill to match 6 columns */}
//                             <td style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.06)", background: STAGE_BG }}>
//                                 <div style={contentStyle} />
//                             </td>
//                             <td style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.06)", background: STAGE_BG }}>
//                                 <div style={contentStyle} />
//                             </td>
//                             <td style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.06)", background: STAGE_BG }}>
//                                 <div style={contentStyle} />
//                             </td>
//                         </tr>
//                     );
//                 })}
//         </>
//     );
// };
