package app.adaplus.backend.util;

import java.util.Locale;

public final class RouteNorm {

    private RouteNorm() {}

    /**
     * Normalizes a route/port/origin name for map-key lookups.
     * Transliterates Turkish-specific characters to ASCII equivalents so that
     * "Kinaliada" and "Kınalıada" both resolve to the same key "kinaliada".
     */
    public static String normalize(String s) {
        if (s == null) return null;
        String trimmed = s.trim();
        if (trimmed.isEmpty()) return null;
        return transliterate(trimmed).toLowerCase(Locale.ROOT);
    }

    private static String transliterate(String s) {
        return s.replace('İ', 'I').replace('ı', 'i')
                .replace('Ü', 'U').replace('ü', 'u')
                .replace('Ö', 'O').replace('ö', 'o')
                .replace('Ş', 'S').replace('ş', 's')
                .replace('Ğ', 'G').replace('ğ', 'g')
                .replace('Ç', 'C').replace('ç', 'c');
    }
}
