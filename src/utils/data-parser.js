export function cleanSpecString(str) {
    if (!str) return '';
    // Remove the leading "- \n\t\t\t\t" junk
    let clean = str.replace(/^- \s+[\n\t]*/, '').trim();
    return clean;
}

export function parseRAM(str) {
    const clean = cleanSpecString(str);
    // Split by 'GB' but keep 'GB'
    // Regex: Match text ending in GB followed by immediate text or end
    // Actually simple approach: replace 'GB' with 'GB|' then split by |
    return clean.replace(/(GB)(?=\d)/g, '$1|').split('|').map(s => s.trim()).filter(Boolean);
}

export function parseStorage(str) {
    const clean = cleanSpecString(str);
    // Handle GB and TB
    return clean.replace(/(GB|TB)(?=\d)/g, '$1|').split('|').map(s => s.trim()).filter(Boolean);
}

export function parseDisplay(str) {
    const clean = cleanSpecString(str);
    if (!clean.includes('x')) {
        return [clean];
    }

    // Split by resolution pattern to handle concatenated resolutions like "1920 x 12003200 x 2000"
    // This approach captures resolution patterns and uses them as delimiters
    const parts = clean.split(/(\d{3,4}\s*x\s*\d{3,4})/).filter(p => p.trim());

    return parts.map(s => s.trim()).filter(Boolean);
}

export function parseCPU(str) {
    const clean = cleanSpecString(str);
    // Delimiters: Intel, AMD, Apple, Qualcomm, Snapdragon
    // Regex lookahead
    return clean.split(/(?<!^)(?=(?:Intel|AMD|Apple|Qualcomm|Snapdragon))/).map(s => s.trim()).filter(Boolean);
}

export function parseGPU(str) {
    const clean = cleanSpecString(str);
    // Delimiters: GeForce, Radeon, Intel, Apple, Nvidia, Adreno
    // Also sometimes just "RTX" or "GTX"? Usually full name.
    return clean.split(/(?<!^)(?=(?:GeForce|Radeon|Intel|Apple|Nvidia|Adreno|Qualcomm))/).map(s => s.trim()).filter(Boolean);
}

export function parseDimensions(str) {
    const clean = cleanSpecString(str);
    // Sometimes metric and imperial are smashed: "300 x 200 mm 11 x 8 inches"
    // Split by "mm " or similar?
    // Actually, usually `mm` is the separator.
    if (clean.includes('mm') && clean.includes('inches')) {
        return clean.replace('nm', 'nm|').replace('mm', 'mm|').replace('inches', 'inches|').split('|').map(s => s.trim()).filter(Boolean); // typo fix nm->mm just in case
    }
    return [clean];
}

export function parseMemoryTypes(str) {
    const clean = cleanSpecString(str);
    // Memory types are often separated by " - " like "- LPDDR5-8400 - LPDDR5x-8400 - DDR5-6400"
    if (clean.includes(' - ')) {
        return clean.split(' - ').map(s => s.trim()).filter(Boolean);
    }
    return [clean];
}

export function parseTGPVersion(str) {
    const clean = cleanSpecString(str);
    // Handle TGP values that are concatenated without spaces like "140W130W115W110W100W95W85W75W50W35W"
    // Split on 'W' followed by a digit
    return clean.replace(/W(?=\d)/g, 'W\n').split('\n').map(s => s.trim()).filter(Boolean);
}

