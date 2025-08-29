// download.ts
import { promises as fsp } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import cliProgress from "cli-progress";
import {isSubpath} from "./Utils";

type DownloadOpts = {
    headers?: Record<string, string>;
    timeoutMs?: number;           // abort request after N ms (default 60s)
    overwrite?: boolean;          // default false (fail if exists)
    allowedDir?: string;          // if set, assert outputPath resides under this dir
    userAgent?: string;           // optional UA
    showProgress?: boolean;       // default true when TTY
};

async function getFetch() {
    if (typeof fetch !== "undefined") return fetch;
    // Node <18 fallback
    const mod = await import("node-fetch");
    return (mod.default ?? mod) as typeof fetch;
}

export async function downloadFile(
    url: string,
    outputPath: string,
    opts: DownloadOpts = {}
): Promise<void> {
    const {
        headers = {},
        timeoutMs = 60_000,
        overwrite = false,
        allowedDir,
        userAgent,
        showProgress = process.stdout.isTTY ?? false
    } = opts;

    // Basic URL sanity
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }

    // Optional: restrict where we can write (defense-in-depth)
    const outAbs = path.resolve(outputPath);
    if (allowedDir) {
        const base = path.resolve(allowedDir);
        if (!isSubpath(outAbs, base)) {
            throw new Error(`Refusing to write outside allowedDir: ${outAbs} !⊂ ${base}`);
        }
    }

    // Ensure parent exists
    await fsp.mkdir(path.dirname(outAbs), { recursive: true });

    // Fail fast if file exists and overwrite === false
    if (!overwrite) {
        try { await fsp.access(outAbs); throw new Error(`Destination exists: ${outAbs}`); }
        catch (e: any) { if (e?.code !== "ENOENT") throw e; }
    }

    const tmpPath = outAbs + ".part";
    // Clean leftover temp file if present
    await fsp.rm(tmpPath, { force: true });

    const f = await getFetch();
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs).unref();

    const reqHeaders = {
        ...headers,
        ...(userAgent ? { "User-Agent": userAgent } : {})
    };

    const res = await f(url, { signal: ctrl.signal, headers: reqHeaders }).catch((e) => {
        throw new Error(`Request failed: ${String(e)}`);
    }).finally(() => clearTimeout(to));

    if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const totalBytes = Number(res.headers.get("content-length")) || 0;

    // Progress: TTY only (Compose logs won’t render bars nicely)
    let bar: cliProgress.SingleBar | null = null;
    let downloaded = 0;
    if (showProgress && totalBytes > 0) {
        bar = new cliProgress.SingleBar(
            { format: "Downloading |{bar}| {percentage}% | {value}/{total} MB", hideCursor: true },
            cliProgress.Presets.shades_classic
        );
        bar.start(Math.ceil(totalBytes / (1024 * 1024)), 0);
    } else if (!process.stdout.isTTY) {
        console.log(`Downloading: ${url}`);
    }

    const writeStream = fs.createWriteStream(tmpPath, {
        flags: overwrite ? "w" : "wx",
        mode: 0o600
    });

    // Track progress
    const nodeStream = Readable.fromWeb(res.body as any);
    nodeStream.on("data", (chunk: Buffer) => {
        downloaded += chunk.length;
        if (bar && totalBytes > 0) {
            bar.update(Math.ceil(downloaded / (1024 * 1024)));
        }
    });

    try {
        await pipeline(nodeStream, writeStream);
    } catch (err) {
        // Cleanup partial file on error
        writeStream.destroy();
        await fsp.rm(tmpPath, { force: true });
        throw err;
    } finally {
        if (bar) bar.stop();
    }

    // If server advertised a size, verify it
    if (totalBytes > 0 && downloaded !== totalBytes) {
        await fsp.rm(tmpPath, { force: true });
        throw new Error(`Truncated download: got ${downloaded} of ${totalBytes} bytes`);
    }

    // Atomic replace
    await fsp.rename(tmpPath, outAbs);

    console.log(`✅ Downloaded → ${outAbs}`);
}
