const translationCache: Record<string, string> = {};

function cleanTextString(str: string): string {
    if (!str) return '';
    let result = str;
    // Decode URI components if encoded
    if (result.includes('%')) {
        try {
            result = decodeURIComponent(result);
        } catch {
            try {
                result = decodeURI(result);
            } catch {}
        }
    }
    // Clean remaining %20 or weird artifacts
    result = result.replace(/%20/g, ' ');
    return result.trim();
}

/**
 * Translates text automatically using Google Translate API (gtx endpoint).
 * Results are cached in memory for zero-latency repeated views.
 */
export async function translateText(text: string, targetLang: string = 'en'): Promise<string> {
    if (!text || !text.trim()) return text;
    const cleanInput = text.trim();
    const cacheKey = `${targetLang}:${cleanInput}`;
    if (translationCache[cacheKey]) {
        return translationCache[cacheKey];
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanInput)}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && Array.isArray(data[0])) {
                const translated = data[0].map((item: any) => (item && item[0]) || '').join('');
                if (translated) {
                    const cleaned = cleanTextString(translated);
                    translationCache[cacheKey] = cleaned;
                    return cleaned;
                }
            }
        }
    } catch (e) {
        console.warn('Google Translate error:', e);
    }

    return text;
}
