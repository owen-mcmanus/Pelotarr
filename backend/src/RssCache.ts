// tizClassicsRssCache.js
// Node 18+ (built-in fetch). For Node <18: `yarn add node-fetch` and import it.
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser'); // yarn add rss-parser

const FEED_URL = 'https://tiz-cycling.tv/categories/classics/feed/';
const CACHE_FILE = path.join(__dirname, 'tiz_classics_cache.json');

// include content:encoded from RSS items
const parser = new Parser({ customFields: { item: ['content:encoded'] } });

/**
 * Normalize RSS item to the fields you want.
 */
function pickFields(item) {
    return {
        title: item.title ?? '',
        pubDate: item.pubDate ?? '',
        link: item.link ?? '',
        'content:encoded': item['content:encoded'] ?? '',
    };
}

/**
 * Load the local cache (array of items). If missing, return empty array.
 */
function loadCache() {
    try {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

/**
 * Save cache to disk.
 */
function saveCache(items) {
    // sort newest first by pubDate if available
    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

/**
 * Fetch a single feed page. page=1 → base feed; page>=2 → ?paged=page
 */
async function fetchFeedPage(page = 1) {
    const url = page === 1 ? FEED_URL : `${FEED_URL}?paged=${page}`;
    const feed = await parser.parseURL(url);
    return feed.items?.map(pickFields) ?? [];
}

/**
 * Update cache by crawling up to `maxPages` pages (stop early if a page is empty).
 * De-duplicates by `link`. Returns { added, total }.
 */
async function updateTizClassicsCache({ maxPages = 5 } = {}) {
    const cache = loadCache();
    const seen = new Set(cache.map((i) => i.link));

    let added = 0;
    for (let page = 1; page <= maxPages; page++) {
        let items;
        try {
            items = await fetchFeedPage(page);
        } catch (e) {
            // Stop if a later page 404s or fails (common for pagination past the end)
            if (page === 1) throw e; // first page failing is a real error
            break;
        }
        if (!items.length) break;

        for (const it of items) {
            if (!it.link || seen.has(it.link)) continue;
            seen.add(it.link);
            cache.push(it);
            added++;
        }
    }

    if (added > 0) saveCache(cache);
    return { added, total: cache.length };
}

module.exports = { updateTizClassicsCache, CACHE_FILE };
