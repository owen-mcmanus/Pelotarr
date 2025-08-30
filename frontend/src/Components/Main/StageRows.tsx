import { memo } from "react";
import type {Race} from "../types.ts";
import { StageRow } from "./StageRow";
import type {RaceStatus} from "../../types.ts";

type Props = {
    race: Race;
    expanded: boolean;
    isActive: boolean;
    activeList: Set<string>;
    raceStatus: RaceStatus[];
};

function StageRowsBase({ race, expanded, isActive, activeList, raceStatus }: Props) {
    const count = Math.max(0, race.stages ?? 0);
    if (count === 0) return null;

    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <StageRow
                    key={`${race.id}-stage-${i + 1}`}
                    raceId={race.id}
                    startDate={race.start}
                    index={i}
                    expanded={expanded}
                    isActive={isActive || activeList.has(`${race.id}::${i + 1}`)}
                    raceStatus={raceStatus}
                />
            ))}
        </>
    );
}

export const StageRows = memo(StageRowsBase);
