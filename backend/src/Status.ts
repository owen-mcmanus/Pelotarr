import {listRaces, RaceFields} from "./Database";
import fs from "fs/promises";
import {safeFilename} from "./Utils";

export type RaceStatus = {
    id: string;
    status: string;
};


export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath); // checks readability/existence
        const st = await fs.stat(filePath);
        return st.isFile();
    } catch {
        return false;
    }
}

export async function checkServerStatus(): RaceStatus[] {
    let out: RaceStatus[] = [];

    const races: RaceFields[] = listRaces();
    for (const race of races) {
        if (race.acquired) {
            if(await fileExists(race.file_path)) {
                out.push({id:race.id, status:"good"});
            }
            continue;
        }

        if(await fileExists('/downloads/' + safeFilename(`${race.name} ${2025}.mp4.part`))){
            out.push({id:race.id, status:"downloading"});
            continue;
        }

        const now = new Date();
        if (race.start_date > now) {
            out.push({id:race.id, status:"future"})
            continue;
        }

        out.push({id:race.id, status:"bad"});
    }

    return out;
}