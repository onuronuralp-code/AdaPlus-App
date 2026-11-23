package app.adaplus.backend.config.schedule;

import app.adaplus.backend.util.RouteNorm;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class BusScheduleConfig {

    @Bean
    public Map<String, BusSchedule> busSchedulesByRoute() throws Exception {
        ObjectMapper yaml = new ObjectMapper(new YAMLFactory());

        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:schedules/buses/*.yml");

        Map<String, BusSchedule> map = new HashMap<>();

        for (Resource r : resources) {
            try (InputStream is = r.getInputStream()) {
                BusSchedule schedule = yaml.readValue(is, BusSchedule.class);

                if (schedule.routeCode() == null || schedule.routeCode().isBlank()) {
                    throw new IllegalStateException("Missing 'routeCode' in bus schedule: " + r.getFilename());
                }

                String key = RouteNorm.normalize(schedule.routeCode());

                if (map.containsKey(key)) {
                    throw new IllegalStateException("Duplicate bus routeCode '" + schedule.routeCode()
                            + "' found in: " + r.getFilename());
                }

                map.put(key, schedule);
            }
        }

        if (map.isEmpty()) {
            throw new IllegalStateException("No bus schedules found under classpath:schedules/buses/*.yml");
        }

        return Map.copyOf(map);
    }
}
