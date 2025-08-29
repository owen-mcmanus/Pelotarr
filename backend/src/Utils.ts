import path from "node:path";
import { promises as fsp } from "node:fs";

export function strToDate(str: string): Date {
    const [dayStr, monthStr] = str.split(".");
    const day = Number(dayStr);
    const month = Number(monthStr) - 1;
    const now = new Date();

    return new Date(now.getFullYear(), month, day);
}

export const isUuidV4 = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:::[1-9]\d*)?$/i.test(id);


export function isSubpath(child: string, parent: string) {
    const rel = path.relative(parent, child);
    return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function ensureSubpath(child: string, parent: string) {
    const rel = path.relative(path.resolve(parent), path.resolve(child));
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error(`Refusing to write outside of ${parent}: ${child}`);
    }
}

export function isoDateOnly(d: Date) {
    return d.toISOString().slice(0, 10);
}

export function seasonFromDate(d: Date) {
    return d.getUTCFullYear();
}

export function safeFilename(name: string) {
    return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim();
}

export async function ensureDir(dir: string) {
    await fsp.mkdir(dir, { recursive: true });
}

export async function moveAtomic(src: string, dest: string, overwrite = false) {
    await ensureDir(path.dirname(dest));
    try {
        if (overwrite) await fsp.rm(dest, { force: true });
        await fsp.rename(src, dest);
    } catch (err: any) {
        if (err?.code === "EXDEV") {
            await fsp.copyFile(src, dest);
            await fsp.unlink(src);
        } else {
            throw err;
        }
    }
}

export async function urlOk(url: string, timeoutMs = 10_000): Promise<boolean> {
    const headers = {  "Accept": "*/*" };

    const withTimeout = (ms: number) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), ms);
        return { signal: ctrl.signal, clear: () => clearTimeout(t) };
    };

    // 1) Try HEAD (fast) — many origins block it; don't be strict on failures.
    {
        const { signal, clear } = withTimeout(timeoutMs);
        try {
            const res = await fetch(url, { method: "HEAD", headers, signal, redirect: "follow" });
            clear();
            if (res.ok) return true;            // any 2xx
            // HEAD rejected? continue to GET attempts
        } catch {
            // network/abort → try GET
        } finally {
            // ensure timer cleared in all paths
        }
    }

    // 2) Try GET with Range (tiny body). Accept 200 or 206. Some servers misbehave → still try step 3.
    {
        const { signal, clear } = withTimeout(timeoutMs);
        try {
            const res = await fetch(url, {
                method: "GET",
                headers: { ...headers, Range: "bytes=0-0" },
                signal,
                redirect: "follow"
            });
            clear();
            if (res.status === 206 || res.status === 200) {
                // cancel body to avoid downloading
                try { await res.body?.cancel(); } catch {}
                return true;
            }
            // Some servers incorrectly return 416 to Range 0-0; treat as inconclusive and try step 3.
            if (res.status === 416) {
                try { await res.body?.cancel(); } catch {}
                return true; // optional: set to 'true' if you want to be even more lenient
            }
        } catch {
            // continue to plain GET
        }
    }

    // 3) Last resort: plain GET; if headers are OK, consider it reachable and cancel immediately.
    {
        const { signal, clear } = withTimeout(timeoutMs);
        try {
            const res = await fetch(url, { method: "GET", headers, signal, redirect: "follow" });
            clear();
            if (res.ok) {
                try { await res.body?.cancel(); } catch {}
                return true;
            }
        } catch {
            // fall through
        }
    }

    return false;
}