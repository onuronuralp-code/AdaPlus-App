package app.adaplus.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.io.InputStream;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class ScheduleConfig {

    @Bean
    public Map<String, IslandSchedule> schedulesByOrigin() throws Exception {
        ObjectMapper yaml = new ObjectMapper(new YAMLFactory());

        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:schedules/*.yml");

        Map<String, IslandSchedule> map = new HashMap<>();

        for (Resource r : resources) {
            try (InputStream is = r.getInputStream()) {
                IslandSchedule schedule = yaml.readValue(is, IslandSchedule.class);

                if (schedule.origin() == null || schedule.origin().isBlank()) {
                    throw new IllegalStateException("Missing 'origin' in schedule file: " + r.getFilename());
                }

                // Key by origin, normalized (lowercase, Turkish-safe).
                String key = normalize(schedule.origin());

                if (map.containsKey(key)) {
                    throw new IllegalStateException("Duplicate origin '" + schedule.origin()
                            + "' found in: " + r.getFilename());
                }

                map.put(key, schedule);
            }
        }

        if (map.isEmpty()) {
            throw new IllegalStateException("No schedules found under classpath:schedules/*.yml");
        }

        return Map.copyOf(map);
    }

    private static String normalize(String s) {
        // minimal normalization; keep it consistent with how you read "from" in controller/service
        return s.trim().toLowerCase();
    }
}