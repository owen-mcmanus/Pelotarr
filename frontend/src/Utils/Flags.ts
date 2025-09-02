// utils/flags.ts
const COUNTRY_TO_ISO2: Record<string, string> = {
    "australia": "AU",
    "austria": "AT",
    "united arab emirates": "AE",
    "uae": "AE",
    "belgium": "BE",
    "italy": "IT",
    "france": "FR",
    "netherlands": "NL",
    "spain": "ES",
    "switzerland": "CH",
    "denmark": "DK",
    "norway": "NO",
    "germany": "DE",
    "poland": "PL",
    "luxembourg": "LU",
    "malaysia": "MY",
    "china": "CN",
    "japan": "JP",
    "canada": "CA",
    "united kingdom": "GB",
    "uk": "GB",
    "united states": "US",
    "usa": "US",
    "czech republic": "CZ",
    "hungary": "HU",
    "portugal": "PT",
    "oman": "OM",
    "turkey": "TR",
    "rwanda": "RW",
    "ireland": "IE",
    // add more as needed
};

function isoToFlagEmoji(iso2: string): string {
    const code = iso2.toUpperCase();
    if (code.length !== 2) return "";
    return String.fromCodePoint(
        0x1f1e6 + (code.charCodeAt(0) - 65),
        0x1f1e6 + (code.charCodeAt(1) - 65)
    );
}

export function countryToFlagEmojis(country: string): string {
    if (!country) return "";
    // support e.g. "Belgium, Netherlands" or "Austria/Italy"
    const parts = country.split(/[,/]/).map(s => s.trim()).filter(Boolean);
    const flags = parts.map(p => isoToFlagEmoji(COUNTRY_TO_ISO2[p.toLowerCase()] || ""));
    return flags.filter(Boolean).join(" ");
}
