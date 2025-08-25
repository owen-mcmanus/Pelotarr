// episodeNfoService.js
import { create } from "xmlbuilder2";
import fs from "fs";
import path from "path";

/**
 * Build the episodedetails XML as a string.
 * Required: season, episode, title, showtitle, plot, aired (YYYY-MM-DD)
 * Optional: status, studio, country, language, genres[], tags[], uniqueid{tmdb,tvdb,imdb}, thumbs[]
 */
export function buildEpisodeNfoXml({
                                       season,
                                       title,
                                       showtitle,
                                       plot,
                                       aired,                 // "YYYY-MM-DD"
                                       status = "Ended",
                                       studio,
                                       country,
                                       language,
                                       genres = [],
                                       tags = [],
                                   }) {
    if (season == null) throw new Error("season and episode are required");
    if (!title)     throw new Error("title is required");
    if (!showtitle) throw new Error("showtitle is required");
    if (!plot)      throw new Error("plot is required");
    if (!aired)     throw new Error("aired (YYYY-MM-DD) is required");

    // xmlbuilder2: arrays -> repeated elements
    const root = {
        episode: {
            title,
            showtitle,
            season: String(season),
            plot,
            aired,
            ...(status ? { status } : {}),
            ...(genres.length ? { genre: genres } : {}),
            ...(tags.length ? { tag: tags } : {}),
            ...(studio ? { studio } : {}),
            ...(country ? { country } : {}),
            ...(language ? { language } : {}),
        }
    };

    return create(root).end({ prettyPrint: true, newline: "\n" });
}

/**
 * Write <basename>.nfo next to the video file.
 * Returns { nfoPath, xml }
 */
export function writeEpisodeNfo({ videoPath, ...meta }) {
    if (!videoPath) throw new Error("videoPath is required");
    const dir = path.dirname(videoPath);
    const base = path.basename(videoPath, path.extname(videoPath));
    const xml = buildEpisodeNfoXml(meta);
    const nfoPath = path.join(dir, `${base}.nfo`);
    fs.writeFileSync(nfoPath, xml, "utf8");
    return { nfoPath, xml };
}
