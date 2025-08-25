import {listRaces, RaceFields, removeRace, updateRace} from "./Database";
const { updateTizClassicsCache, CACHE_FILE } = require('./RssCache');
import {searchForRace} from "./TitleMatch";
import {downloadFile} from "./Downloader";
import { writeEpisodeNfo} from "./MetadatManager";
import * as cheerio from "cheerio";
import fs from "fs";

function titleToUrlType1(title: string):string {
    return "https://video.tiz-cycling.io/file/Tiz-Cycling/2025/" + title.replaceAll(" ", "+") + "+2025+%5BFULL+RACE%5D.mp4";
}

function titleToUrlType2(title: string):string {
    return "https://video.tiz-cycling.io/file/Tiz-Cycling/2025/" + title.replaceAll(" ", "+") + "+2025/"+ title.replaceAll(" ", "+") + "+2025+%5BFULL+RACE%5D.mp4";
}

function parseName(input: string) {
    // e.g. "Tro-Bro Leon 2025 [FULL RACE]"
    const yearMatch = input.match(/\b(20\d{2})\b/);
    if (!yearMatch) return null;
    const year = yearMatch[1];

    // bracketed suffix, e.g. [FULL RACE], [HIGHLIGHTS], etc.
    const suffixMatch = input.match(/\[(.+?)\]/);
    const suffixContent = suffixMatch ? suffixMatch[1].trim() : "FULL RACE";

    // remove bracket part and trim
    const withoutBracket = input.replace(/\s*\[.+?\]\s*$/, "").trim();

    // remove trailing year from the base title
    const baseTitle = withoutBracket.replace(new RegExp(`\\s*${year}\\s*$`), "").trim();

    return { year, baseTitle, suffixContent };
}

function encodeFolderAndFile(baseTitle: string, year: string, suffixContent: string) {
    // Keep dashes, only spaces -> '+'
    const folderHuman = `${baseTitle} ${year}`;           // e.g. "Tro-Bro Leon 2025"
    const encodedBase = folderHuman.replace(/ /g, "+");   // "Tro-Bro+Leon+2025"

    // Suffix: [FULL RACE] -> +%5BFULL+RACE%5D
    const encodedSuffix = `%5B${suffixContent.replace(/ /g, "+")}%5D`;

    // File name: "<encodedBase>+%5B...%5D.mp4"
    const fileName = `${encodedBase}+${encodedSuffix}.mp4`;

    return { encodedBase, fileName };
}

async function urlOk(url: string): Promise<boolean> {
    try {
        const res = await fetch(url, { method: "HEAD" });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Convert a display name like:
 *  "Brussels Cycling Classic 2025 [FULL RACE]"
 * to a working mp4 URL, testing both folder shapes.
 */
export async function getDownloadURLFromName(name: string): Promise<string> {
    const parsed = parseName(name);
    if (!parsed) return "";

    const { year, baseTitle, suffixContent } = parsed;
    const { encodedBase, fileName } = encodeFolderAndFile(baseTitle, year, suffixContent);

    // Try with subfolder first:
    const withFolder = `https://video.tiz-cycling.io/file/Tiz-Cycling/${year}/${encodedBase}/${fileName}`;
    if (await urlOk(withFolder)) return withFolder;

    // Fallback: flat path (no subfolder)
    const flat = `https://video.tiz-cycling.io/file/Tiz-Cycling/${year}/${fileName}`;
    if (await urlOk(flat)) return flat;

    // No luck
    return "";
}

function generateMetadata(race:RaceFields, videoPath:string, plot:string){
    const result = writeEpisodeNfo({
        videoPath,
        title:race.name + " - 2025",
        showtitle:race.name + " - 2025",
        plot,
        aired:race.start_date.split("T", 1)[0],
        season:2025,
    });
}

export async function HandleScan(): Promise<void>{
    fs.mkdirSync("../downloads", { recursive: true })

    console.log("Updating Cache...");
    try {
        const result = await updateTizClassicsCache({ maxPages: 1 });
        console.log(result);
    } catch (e) {
        console.error("Cache update failed:", e);
    }

    console.log("Running Scan...");
    const races:RaceFields[] = listRaces();
    for (let race of races) {
        if(race.acquired) continue;
        console.log("Searching for: ", race.name);
        if(race.type == 1){
            console.log("This race is a classic.");
        }else{
            console.log("Sorry, stage races are not yet supported.\n");
            continue;
        }

        console.log("Race took place at: ", race.start_date);
        const start = new Date(race.start_date);
        const now = new Date();
        if(start < now){
            console.log("Race completed, searching now...");
            const{title, content} = searchForRace(race);
            console.log("Best match title:", title);
            const downloadUrl = await getDownloadURLFromName(title);
            if(downloadUrl){
                console.log("Download URL:", downloadUrl);
                try {
                    const videoName = race.name+"2025.mp4";
                    updateRace(race.id, {acquired:true});
                    await downloadFile(
                        downloadUrl,
                        "../downloads/"+videoName
                    );
                    console.log("Editing metadata for: ", videoName);
                    const stats = fs.statSync("../downloads/"+videoName);
                    updateRace(race.id, {acquired:true, file_name:videoName, file_path:"../downloads/"+videoName,file_size_gb:(stats.size / (1024 ** 3))});
                    const $ = cheerio.load(content);
                    const paras = $("p")
                        .toArray()
                        .map(el => $(el).text().replace(/\s+/g, " ").trim())
                        .filter(Boolean);
                    generateMetadata(race, "../downloads/"+videoName, paras[1] + "\n\n" + paras[2]);

                } catch (err) {
                    console.error("Download failed:", err);
                }
            }else{
                console.log("Unable to find file.");
            }
        }else{
            console.log("Race in future, subscribing to RSS feed...");
        }
        console.log("");
    }
}