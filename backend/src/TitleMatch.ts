// npm i string-similarity
import fs from "fs";
import path from "path";
import stringSimilarity from "string-similarity";

type CachedItem = {
    title: string;
    pubDate: string;             // e.g., "Mon, 22 Mar 2025 17:00:00 +0000"
    link: string;
    ["content:encoded"]?: string;
};

type RaceFields = {
    id: string;
    name?: string | null;
    type?: number | null;        // 1 = classic
    start_date?: string | Date | null; // "YYYY-MM-DD" or "DD.MM" or Date
    end_date?: string | Date | null;
    country?: string | null;
};

const CACHE_FILE = path.join(process.cwd(), "/src/tiz_classics_cache.json"); // adjust if needed

export function searchForRace(
    race: RaceFields,
    opts?: {
        dayWindow?: number;   // how many days around start_date to allow
        threshold?: number;   // min string similarity (0..1)
    }
): {
    title: string;
    content: string;
}{
    const dayWindow = opts?.dayWindow ?? 0;
    let threshold = opts?.threshold ?? 0.60;

    if (!race.name) return "";
    const raceDate = toDate(race.end_date ?? race.start_date);
    if (!raceDate) return "";

    const cache = loadCacheSafe();
    if (cache.length === 0) return "";

    // 1) Filter by date window
    const candidates = cache.filter((it) => {
        const d = parseRssDate(it.pubDate);
        if (!d) return false;
        const diff = Math.abs(daysBetween(d, raceDate));
        return diff <= dayWindow;
    });

    if (candidates.length === 0) return "";

    // 2) Remove obvious 10k/10 km items
    const no15k = candidates.filter((it) => !is15Km(it));
    const no20k = no15k.filter((it) => !is20Km(it));
    const no10k = no20k.filter((it) => !is10Km(it));
    const filtered = no10k.filter((it) => !isLadies(it));
    // const no10k = candidates;



    // 3) Normalize titles and compare with race.name
    const target = canonicalizeName(race.name);
    let bestLink = "";
    let bestContent = "";
    let bestScore = 0;

    for (const it of filtered) {
        const canon = canonicalizeName(it.title);
        const score = stringSimilarity.compareTwoStrings(target, canon); // 0..1
        if (score > bestScore) {
            bestScore = score;
            bestLink = it.title;
            bestContent = it["content:encoded"];
        }
    }

    // if(bestScore < threshold) {
    //     console.log(filtered);
    // }

    if(filtered.length == 1) threshold -= 0.25;

    return bestScore >= threshold ? {title:bestLink, content:bestContent} : {title:"", content:""};
}

function loadCacheSafe(): CachedItem[] {
    try {
        if (!fs.existsSync(CACHE_FILE)) return [];
        const raw = fs.readFileSync(CACHE_FILE, "utf-8");
        const json = JSON.parse(raw);
        return Array.isArray(json) ? (json as CachedItem[]) : [];
    } catch {
        return [];
    }
}

function parseRssDate(s?: string): Date | null {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const a0 = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    const b0 = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
    return Math.round((a0 - b0) / msPerDay);
}

function toDate(v: string | Date | null | undefined): Date | null {
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    if (typeof v !== "string") return null;

    // ISO yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d = new Date(v + "T00:00:00Z");
        return Number.isNaN(d.getTime()) ? null : d;
    }

    // dd.mm or dd.mm.yyyy
    const m = v.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
    if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]) - 1;
        const year = m[3]
            ? m[3].length === 2
                ? 2000 + Number(m[3])
                : Number(m[3])
            : new Date().getFullYear();
        const d = new Date(Date.UTC(year, month, day));
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
}

function is10Km(item: CachedItem): boolean {
    const hay = `${item.title}`.toLowerCase();
    return /\b10\s?km\b/.test(hay) || /\b10k\b/.test(hay) || /\b10-km\b/.test(hay);
}

function is20Km(item: CachedItem): boolean {
    const hay = `${item.title}`.toLowerCase();
    return /\b20\s?km\b/.test(hay) || /\b20k\b/.test(hay) || /\b20-km\b/.test(hay);
}

function is15Km(item: CachedItem): boolean {
    const hay = `${item.title}`.toLowerCase();
    return /\b15\s?km\b/.test(hay) || /\b15k\b/.test(hay) || /\b15-km\b/.test(hay);
}

function isLadies(item: CachedItem): boolean {
    const hay = `${item.title}`.toLowerCase();
    return /\bladies?\b/.test(hay) || /\bwomen'?s\b/.test(hay);
}

const STOPWORDS = new Set([
    "men", "elite", "highlights", "full", "race", "stage", "live",
    "official", "2023", "2024", "2025", "2026" // years get stripped anyway
]);

function canonicalizeName(raw: string): string {
    // lowercase + strip accents
    let s = raw.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    // remove years
    s = s.replace(/\b20\d{2}\b/g, " ");
    // punctuation → space, collapse, trim
    s = s.replace(/[\(\)\[\],.:/\\'’"–-]/g, " ").replace(/\s+/g, " ").trim();
    // remove stopwords
    s = s
        .split(" ")
        .filter((w) => w && !STOPWORDS.has(w))
        .join(" ");
    return s;
}
