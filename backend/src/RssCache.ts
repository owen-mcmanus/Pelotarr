// RssCache.ts
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser'); // yarn add rss-parser

const CLASSICS_FEED_URL = 'https://tiz-cycling.tv/categories/classics/feed/';
const STAGES_FEED_URL = 'https://tiz-cycling.tv/categories/stage-races/feed/';
const GRAND_FEED_URL = 'https://tiz-cycling.tv/categories/grand-tour/feed/';
const CLASSICS_CACHE_FILE =  '/public/tiz_classics_cache.json';
const STAGES_CACHE_FILE =  '/public/tiz_stages_cache.json';

enum CacheType {STAGES, CLASSICS};

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
function loadCache(type: CacheType) {
    try {
        const raw = fs.readFileSync(type === CacheType.STAGES ? STAGES_CACHE_FILE : CLASSICS_CACHE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

/**
 * Save cache to disk.
 */
function saveCache(items, type: CacheType) {
    // sort newest first by pubDate if available
    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    fs.writeFileSync(type === CacheType.STAGES ? STAGES_CACHE_FILE : CLASSICS_CACHE_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

async function fetchFeedPageGrandTour(page = 1) {
    const urlBase = GRAND_FEED_URL;
    const url = page === 1 ? urlBase : `${urlBase}?paged=${page}`;
    return await parser.parseURL(url);
}

/**
 * Fetch a single feed page. page=1 → base feed; page>=2 → ?paged=page
 */
async function fetchFeedPage(page = 1, type: CacheType) {
    const urlBase = type === CacheType.STAGES ? STAGES_FEED_URL : CLASSICS_FEED_URL;
    const url = page === 1 ? urlBase : `${urlBase}?paged=${page}`;
    let feed = await parser.parseURL(url);
    if(type === CacheType.STAGES){
        const gt = await fetchFeedPageGrandTour(page);
        feed.items = [ ...(feed.items ?? []), ...(gt.items ?? []) ];
    }
    return feed.items?.map(pickFields) ?? [];
}

/**
 * Update cache by crawling up to `maxPages` pages (stop early if a page is empty).
 * De-duplicates by `link`. Returns { added, total }.
 */
async function updateTizCache(type: CacheType, { maxPages = 5 } = {}) {
    const cache = loadCache(type);
    const seen = new Set(cache.map((i) => i.link));

    let added = 0;
    for (let page = 1; page <= maxPages; page++) {
        let items;
        try {
            items = await fetchFeedPage(page, type);
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

    if (added > 0) saveCache(cache, type);
    return { added, total: cache.length };
}


module.exports = { updateTizCache, CLASSICS_CACHE_FILE, STAGES_CACHE_FILE, CacheType };
