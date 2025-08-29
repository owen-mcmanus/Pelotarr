// MetadataManager.js
import { create } from "xmlbuilder2";
import { promises as fsp } from "node:fs";
import path from "node:path";

type EpisodeNfoInput = {
    season: number;                 // required
    episode: number;                // required
    title: string;                  // required
    showtitle: string;              // required
    plot: string;                   // required
    aired: string;                  // required "YYYY-MM-DD"

    status?: string;                // e.g., "Ended"
    studio?: string;
    country?: string;
    language?: string;
    genres?: string[];
    tags?: string[];
    thumbs?: string[];              // image URLs/paths
    uniqueIds?: Record<string, string>; // { tmdb: "…", tvdb: "…", imdb: "tt…" }
};

const MAX_TEXT = 4000;
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

function sanitize(s: string, limit = MAX_TEXT) {
    return s
        .replace(/[\u0000-\u001F\u007F]/g, "") // strip control chars
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limit);
}

function assertRequired(meta: EpisodeNfoInput) {
    if (meta.season == null || !Number.isFinite(meta.season)) throw new Error("season is required");
    if (meta.episode == null || !Number.isFinite(meta.episode)) throw new Error("episode is required");
    if (!meta.title) throw new Error("title is required");
    if (!meta.showtitle) throw new Error("showtitle is required");
    if (!meta.plot) throw new Error("plot is required");
    if (!meta.aired || !DATE_RX.test(meta.aired)) throw new Error('aired must be "YYYY-MM-DD"');
}

/**
 * Build <episodedetails> XML string for Jellyfin/Kodi.
 */
export function buildEpisodeNfoXml(input: EpisodeNfoInput): string {
    assertRequired(input);

    const {
        season, episode, title, showtitle, plot, aired,
        status = "Ended",
        studio, country, language,
        genres = [], tags = [], thumbs = [],
        uniqueIds = {}
    } = input;

    const uniqueidArr = Object.entries(uniqueIds).map(([type, id]) => ({
        "@type": type,
        "#": sanitize(String(id), 256)
    }));

    const root = {
        episodedetails: {
            title: sanitize(title, 512),
            showtitle: sanitize(showtitle, 512),
            season: String(season),
            episode: String(episode),
            plot: sanitize(plot),
            aired,

            ...(status ? { status: sanitize(status, 64) } : {}),
            ...(studio ? { studio: sanitize(studio, 128) } : {}),
            ...(country ? { country: sanitize(country, 128) } : {}),
            ...(language ? { language: sanitize(language, 64) } : {}),

            ...(genres.length ? { genre: genres.map(g => sanitize(g, 64)) } : {}),
            ...(tags.length ? { tag: tags.map(t => sanitize(t, 64)) } : {}),
            ...(thumbs.length ? { thumb: thumbs.map(t => sanitize(t, 1024)) } : {}),
            ...(uniqueidArr.length ? { uniqueid: uniqueidArr } : {})
        }
    };

    return create(root).end({ prettyPrint: true, newline: "\n" });
}

/**
 * Write <basename>.nfo next to a video file.
 * Returns { nfoPath, xml }.
 */
export async function writeEpisodeNfo({
                                          videoPath,
                                          ...meta
                                      }: { videoPath: string } & EpisodeNfoInput): Promise<{ nfoPath: string; xml: string }> {
    if (!videoPath) throw new Error("videoPath is required");

    const dir = path.resolve(path.dirname(videoPath));
    const base = path.basename(videoPath, path.extname(videoPath));
    const nfoPath = path.join(dir, `${base}.nfo`);
    const tmpPath = nfoPath + ".part";

    // Ensure we only write beside the video (defense-in-depth)
    const resolvedNfo = path.resolve(nfoPath);
    if (!resolvedNfo.startsWith(dir + path.sep) && resolvedNfo !== path.join(dir, path.basename(resolvedNfo))) {
        throw new Error("Refusing to write NFO outside the video directory");
    }

    await fsp.mkdir(dir, { recursive: true });

    const xml = buildEpisodeNfoXml(meta as EpisodeNfoInput);

    // Atomic write
    await fsp.writeFile(tmpPath, xml, { encoding: "utf8", mode: 0o600 });
    await fsp.rename(tmpPath, nfoPath);

    return { nfoPath, xml };
}