// DownloadManager.ts
import path from "node:path";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import { Readable } from "node:stream";
import * as cheerio from "cheerio";

import { listRaces, type RaceFields, removeRace, updateRace } from "./Database.js";
import { CacheType, updateTizCache } from "./RssCache.js";
import { searchForRace } from "./TitleMatch.js";
import { downloadFile } from "./Downloader.js";
import { writeEpisodeNfo } from "./MetadataManager";
import {ensureSubpath, isoDateOnly, seasonFromDate, safeFilename, ensureDir, moveAtomic, urlOk} from "./Utils";

// ---------- Config ----------
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR ?? "/downloads";
const SHOWS_DIR    = process.env.MEDIA_DIR    ?? process.env.SHOWS_DIR ?? "/Shows";
const USER_AGENT   = process.env.USER_AGENT   ?? "Pelotarr/1.0 (+https://localhost)";


// Encode a display title like "Brussels Cycling Classic 2025 [FULL RACE]"
// into candidates under: /{year}/{Encoded Title}/{File}.mp4 and /{year}/{File}.mp4
// function buildUrlCandidates(displayTitle: string): string[] {
//     // Extract year & base title
//     const yearMatch = displayTitle.match(/\b(20\d{2})\b/);
//     if (!yearMatch) return [];
//     const year = yearMatch[1];
//
//     const suffixMatch = displayTitle.match(/\[(.+?)\]/);
//     const suffix = suffixMatch ? suffixMatch[1].trim() : "FULL RACE";
//
//     const withoutBracket = displayTitle.replace(/\s*\[.+?\]\s*$/, "").trim();
//     const baseTitle = withoutBracket.replace(new RegExp(`\\s*${year}\\s*$`), "").trim();
//
//     // Build encoded pieces (use encodeURIComponent but keep + for spaces like the CDN)
//     const folderHuman = `${baseTitle} ${year}`;             // e.g., "Tro-Bro Leon 2025"
//     const encodedBase = folderHuman.replace(/ /g, "+");     // "Tro-Bro+Leon+2025"
//     const encodedSuffix = `%5B${suffix.replace(/ /g, "+")}%5D`;
//     const fileName = `${encodedBase}+${encodedSuffix}.mp4`;
//
//     return [
//         `https://video.tiz-cycling.io/file/Tiz-Cycling/${year}/${encodedBase}/${fileName}`,
//         `https://video.tiz-cycling.io/file/Tiz-Cycling/${year}/${fileName}`
//     ];
// }

// function buildUrlCandidates(displayTitle: string): string[] {
//     // 1) pull year & suffix
//     const yearMatch = displayTitle.match(/\b(20\d{2})\b/);
//     if (!yearMatch) return [];
//     const year = yearMatch[1];
//
//     let suffixMatch = displayTitle.match(/\[(.+?)\]/);
//     if(suffixMatch) suffixMatch[1] = suffixMatch[1].replace("–", "-")
//     const suffix = (suffixMatch ? suffixMatch[1] : "FULL RACE").trim();
//
//     // 2) strip trailing [ ... ]
//     const withoutBracket = displayTitle.replace(/\s*\[.+?\]\s*$/, "").trim();
//
//     // 3) remove a trailing year (only if it's literally at the end)
//     const baseTitle = withoutBracket.replace(new RegExp(`\\s*${year}\\s*$`), "").trim();
//
//     // 4) detect trailing "– Stage N" (or Prologue)
//     const stageMatch = baseTitle.match(/\s*[–-]\s*Stage\s+(Prologue|\d+)\s*$/i);
//     const stageLabel = stageMatch ? ` – Stage ${stageMatch[1]}` : "";
//
//     // 5) series = base title without the stage label
//     const seriesBase = stageMatch ? baseTitle.slice(0, stageMatch.index).trim() : baseTitle;
//
//     // Helper: does a string already end with the year?
//     const endsWithYear = (s: string) => new RegExp(`(?:^|\\s)${year}$`).test(s.trim());
//
//     // Folders
//     const folderWithStageHuman = `${baseTitle} ${year}`; // keep as-is (your original OK)
//     const folderSeriesHuman = endsWithYear(seriesBase) ? seriesBase : `${seriesBase} ${year}`;
//
//     // Filenames
//     const fileWithStageHuman = `${baseTitle} ${year} [${suffix}].mp4`; // original
//     const seriesFileBase = endsWithYear(seriesBase) ? seriesBase : `${seriesBase} ${year}`;
//     const fileSeriesWithStageHuman = `${seriesFileBase}${stageLabel} [${suffix}].mp4`;
//
//     // encoder: spaces -> '+', everything else percent-encoded (so '–' => %E2%80%93)
//     const plusEnc = (s: string) => encodeURIComponent(s).replace(/%20/g, "+");
//
//     const yearBase = `https://video.tiz-cycling.io/file/Tiz-Cycling/${year}`;
//
//     return Array.from(
//         new Set([
//             // 1) /{year}/{folder-with-stage}/{file-with-stage}
//             `${yearBase}/${plusEnc(folderWithStageHuman)}/${plusEnc(fileWithStageHuman)}`,
//             // 2) /{year}/{file-with-stage}
//             `${yearBase}/${plusEnc(fileWithStageHuman)}`,
//             // 3) /{year}/{series-folder}/{series-file-with-stage}
//             `${yearBase}/${plusEnc(folderSeriesHuman)}/${plusEnc(fileSeriesWithStageHuman)}`,
//         ])
//     );
// }

function buildUrlCandidates(displayTitle: string): string[] {
    // 0) peel off a trailing "(ladies)" marker (case-insensitive), remember it for the filename
    const ladiesMatch = displayTitle.match(/\s*\((ladies)\)\s*$/i);
    const ladiesSuffixHuman = ladiesMatch ? " (ladies)" : "";
    const titleNoLadies = ladiesMatch
        ? displayTitle.slice(0, ladiesMatch.index).trim()
        : displayTitle;

    // 1) pull year & suffix
    const yearMatch = titleNoLadies.match(/\b(20\d{2})\b/);
    if (!yearMatch) return [];
    const year = yearMatch[1];

    const suff = titleNoLadies.match(/\[(.+?)\]\s*$/);
    if(suff) suff[1] = suff[1].replace("–", "-")
    const suffix = (suff ? suff[1] : "FULL RACE").trim();

    // 2) strip trailing [ ... ]
    const withoutBracket = titleNoLadies.replace(/\s*\[.+?\]\s*$/, "").trim();

    // 3) remove a trailing year (only if it's literally at the end)
    const baseTitle = withoutBracket.replace(new RegExp(`\\s*${year}\\s*$`), "").trim();

    // 4) detect trailing "– Stage N" (or Prologue)
    const stageMatch = baseTitle.match(/\s*[–-]\s*Stage\s+(Prologue|\d+)\s*$/i);
    const stageLabel = stageMatch ? ` – Stage ${stageMatch[1]}` : "";

    // 5) series = base title without the stage label
    const seriesBase = stageMatch ? baseTitle.slice(0, stageMatch.index).trim() : baseTitle;

    // Helper: does a string already end with the year?
    const endsWithYear = (s: string) => new RegExp(`(?:^|\\s)${year}$`).test(s.trim());

    // Folders
    const folderWithStageHuman = `${baseTitle} ${year}`;
    const folderSeriesHuman = endsWithYear(seriesBase) ? seriesBase : `${seriesBase} ${year}`;

    // Filenames
    const fileWithStageHuman = `${baseTitle} ${year} [${suffix}]${ladiesSuffixHuman}.mp4`;
    const seriesFileBase = endsWithYear(seriesBase) ? seriesBase : `${seriesBase} ${year}`;
    const fileSeriesWithStageHuman = `${seriesFileBase}${stageLabel} [${suffix}]${ladiesSuffixHuman}.mp4`;

    // Encoder: percent-encode, turn spaces into '+', but KEEP parentheses literal for "(ladies)"
    const plusEnc = (s: string) =>
        encodeURIComponent(s)
            .replace(/%20/g, "+")
            .replace(/%28/g, "(")
            .replace(/%29/g, ")");

    const yearBase = `https://video.tiz-cycling.io/file/Tiz-Cycling/${year}`;

    return Array.from(
        new Set([
            // 1) /{year}/{folder-with-stage}/{file-with-stage}
            `${yearBase}/${plusEnc(folderWithStageHuman)}/${plusEnc(fileWithStageHuman)}`,
            // 2) /{year}/{file-with-stage}
            `${yearBase}/${plusEnc(fileWithStageHuman)}`,
            // 3) /{year}/{series-folder}/{series-file-with-stage}
            `${yearBase}/${plusEnc(folderSeriesHuman)}/${plusEnc(fileSeriesWithStageHuman)}`
        ])
    );
}

export async function getDownloadURLFromName(name: string): Promise<string> {
    for (const u of buildUrlCandidates(name)) {
        if (await urlOk(u)) return u;
    }
    return "";
}

function buildEpisodeMetadata(race: RaceFields, videoPath: string, plot: string) {
    const episode = race.type === 1 ? (race.start_date.getMonth())*100 + race.start_date.getDate() : Number(race.id.split("::")[1]);
    return writeEpisodeNfo({
        videoPath,
        episode,
        title: `${race.name}`,
        showtitle: `${race.name}`,
        plot,
        aired: isoDateOnly(race.start_date),
        genres: ["Cycling", "Sports"],
        tags: ["UCI", "One-day"],
    });
}

export async function refreshAllLibraries(baseUrl: string, apiKey: string) {
    const res = await fetch(`${baseUrl}/Library/Refresh`, {
        method: "POST",
        headers: { "X-Emby-Token": apiKey }
    });
    if (!res.ok) throw new Error(`Jellyfin refresh failed: HTTP ${res.status}`);
}

function pickPlot(paras: string[], maxLen = 1200): string {
    const p1 = paras[0]?.trim();
    const p2 = paras[1]?.trim();
    const p3 = paras[2]?.trim();

    // If both p2 and p3 exist, join them (skip duplicates)
    const joined = [p2, p3].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join("\n\n");
    if (joined) {
        return joined.length <= maxLen ? joined : (joined.slice(0, maxLen) + "…");
    }

    // Otherwise fall back: p2 -> p3 -> p1
    const single = [p2, p3, p1].find(s => s && s.length) ?? "";
    return single.length <= maxLen ? single : (single.slice(0, maxLen) + "…");
}

export function sanitizeDirName(input: string, replacement = " "): string {
    // Keep case & spaces; remove accents (é → e)
    let s = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

    // Replace any char not A–Z, a–z, 0–9, or space
    s = s.replace(/[^A-Za-z0-9 ]+/g, replacement);

    // Collapse repeated replacement chars (but don't touch spaces)
    const repEsc = replacement.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    s = s.replace(new RegExp(`${repEsc}{2,}`, "g"), replacement);

    // Disallow trailing spaces/dots (Windows)
    s = s.replace(/[ .]+$/g, "");

    // Avoid Windows reserved names (case-insensitive)
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(s.trim())) {
        s = `${s}-dir`;
    }

    // Ensure non-empty and reasonable length
    if (!s.trim()) s = "untitled";
    if (s.length > 240) s = s.slice(0, 240);

    return s;
}

// ---------- Main scan ----------
export async function HandleScan(): Promise<void> {
    console.log("Updating Cache...");
    // try {
    //     const result = await updateTizCache(CacheType.CLASSICS, { maxPages: 1});
    //     console.log(result);
    // } catch (e) {
    //     console.error("Classics cache update failed:", e);
    // }
    //
    // try {
    //     const result = await updateTizCache(CacheType.STAGES, { maxPages: 1});
    //     console.log(result);
    // } catch (e) {
    //     console.error("Stages cache update failed:", e);
    // }
    //
    // try {
    //     const result = await updateTizCache(CacheType.LADIES, { maxPages: 1});
    //     console.log(result);
    // } catch (e) {
    //     console.error("Ladies cache update failed:", e);
    // }
    // try {
    //     const result = await updateTizCache(CacheType.CX, { maxPages: 1});
    //     console.log(result);
    // } catch (e) {
    //     console.error("CX cache update failed:", e);
    // }

    console.log("Running Scan...");
    const races: RaceFields[] = listRaces();

    for (const race of races) {
        if (race.acquired) continue;

        console.log("Searching for:", race.name);

        // if (race.type !== 1) {
        //     console.log("Sorry, stage races are not yet supported.\n");
        //     continue;
        // }

        console.log("Race took place at:", race.start_date.toISOString());
        const now = new Date();
        if (race.start_date > now) {
            console.log("Race in future, subscribing to RSS feed...\n");
            continue;
        }

        console.log("Race completed, searching now...");
        const { title, content } = searchForRace(race) as { title: string; content?: string };

        if (!title) {
            console.log("No match found.\n");
            continue;
        }

        console.log("Best match title:", title);
        const downloadUrl = await getDownloadURLFromName(title);
        if (!downloadUrl) {
            console.log("Unable to find file.\n");
            continue;
        }

        console.log("Download URL:", downloadUrl);

        // Build final names/paths
        const year = seasonFromDate(race.start_date);
        const videoFile = safeFilename(`${race.name} ${year}.mp4`);
        const srcVideoPath = path.join(DOWNLOAD_DIR, videoFile);
        const destVideoPath = race.type === 1 ? path.join(SHOWS_DIR, "Cycling Classics", "2025", videoFile) : path.join(SHOWS_DIR, "Cycling Stage Races", sanitizeDirName(race.name.split(" Stage")[0] + " 2025"), videoFile);

        // Extract a short plot from HTML (2nd paragraph preferred)
        let plot = "";
        if (content) {
            const $ = cheerio.load(content);
            const paras = $("p")
                .toArray()
                .map((el) => $(el).text().replace(/\s+/g, " ").trim())
                .filter(Boolean);
            plot = pickPlot(paras);
        }

        try {
            // Download to /downloads
            // await downloadFile(downloadUrl, srcVideoPath, {
            //     overwrite: false,
            //     timeoutMs: 120_000,
            //     allowedDir: DOWNLOAD_DIR,
            //     userAgent: USER_AGENT
            // });

            // Write NFO next to the video (in downloads first)
            const { nfoPath } = await buildEpisodeMetadata(race, srcVideoPath, plot);

            // Ensure destination is under SHOWS_DIR
            ensureSubpath(destVideoPath, SHOWS_DIR);
            ensureSubpath(nfoPath, path.dirname(nfoPath)); // sanity for writer
            const destNfoPath = path.join(path.dirname(destVideoPath), path.basename(nfoPath));
            ensureSubpath(destNfoPath, SHOWS_DIR);

            // Create destination dir and copy/move files
            await ensureDir(path.dirname(destVideoPath));

            // Move/copy video & NFO
            // (copy is safer if your NFO references absolute path in /downloads; otherwise rename+fix)
            await fsp.copyFile(srcVideoPath, destVideoPath);
            await fsp.copyFile(nfoPath, destNfoPath);

            // Update DB AFTER success
            const stats = await fsp.stat(destVideoPath);
            await updateRace(race.id, {
                acquired: true,
                file_name: videoFile,
                file_path: destVideoPath,
                file_size_gb: Number((stats.size / (1024 ** 3)).toFixed(3))
            });

            await fsp.unlink(srcVideoPath);
            await fsp.unlink(nfoPath);

            console.log("Moved:", srcVideoPath, "→", destVideoPath);
            console.log("Moved:", nfoPath, "→", destNfoPath);

            // Optional: ping Jellyfin (only if creds provided)
            if (process.env.JELLYFIN_URL && process.env.JELLYFIN_API_KEY) {
                try {
                    await refreshAllLibraries(process.env.JELLYFIN_URL, process.env.JELLYFIN_API_KEY);
                } catch (e) {
                    console.warn("Jellyfin refresh failed:", (e as Error).message);
                }
            }
        } catch (err) {
            console.error("Download or post-processing failed:", err);
            // optional: rollback DB state if you changed it earlier
            // await updateRace(race.id, { acquired: false, file_name: null, file_path: null, file_size_gb: null });
        }

        console.log("");
    }
    console.log("Scan Complete.");
}
