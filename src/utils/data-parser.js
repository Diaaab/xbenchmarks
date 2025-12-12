export function cleanSpecString(str) {
    if (!str) return [];
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
    // Resolutions like 1920 x 1080. 
    // Sometimes followed by text like (IPS, 120Hz).
    // Pattern: Digit x Digit.
    // Issue: "1920 x 12002560 x 1600"
    // Heuristic: Break before a number that starts a new resolution.
    // But how to distinguish "1200" part of res from next res?
    // Usually resolution widths/heights are 3-4 digits.
    // Try to inject a break before a 3-4 digit number that follows a 3-4 digit number?
    // This is tricky. 
    // Alternative: If we see `\d{3,4} x \d{3,4}`, we capture it.
    // Let's rely on the " x " pattern.
    // "1920 x 1200"
    // "2560 x 1600"
    // If we match `(\d{3,4}\s*x\s*\d{3,4})`, we can extract all matches.
    // What if there is text in parentheses? "1920 x 1200 (OLED)2560 x 1600"
    // Then `(OLED)` is stuck to `2560`.
    // Let's try splitting by lookahead for a generic resolution pattern.
    // Pattern: `(?=\d{3,4}\s*x\s*\d{3,4})`
    // Skip the first match (beginning of string).

    // Safety check: if no " x ", just return as is
    if (!clean.includes(' x ')) return [clean];

    // Split by lookahead for number x number, but only if it's NOT at the start
    return clean.split(/(?<!^)(?=\d{3,4}\s*x\s*\d{3,4})/).map(s => s.trim()).filter(Boolean);
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

