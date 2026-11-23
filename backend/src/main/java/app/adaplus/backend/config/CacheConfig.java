package app.adaplus.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Cache configuration with per-cache TTL policies.
 *
 * "departures" cache: short TTL (60s) because minutesUntil changes every minute.
 * "scheduleVerification" cache: long TTL (6h) to avoid redundant scraping.
 */
@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(60, TimeUnit.SECONDS));
        manager.setCacheNames(java.util.List.of("ferryDepartures", "busDepartures"));

        return manager;
    }
}
