package app.adaplus.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.*;

@Component
public class HolidayCalendar {

    private Set<MonthDay> fixedHolidays = Set.of();
    private Set<LocalDate> specificHolidays = Set.of();

    @PostConstruct
    @SuppressWarnings("unchecked")
    void load() throws Exception {
        ObjectMapper yaml = new ObjectMapper(new YAMLFactory());
        try (InputStream is = new ClassPathResource("holidays.yml").getInputStream()) {
            Map<String, Object> data = yaml.readValue(is, Map.class);

            Set<MonthDay> fixed = new HashSet<>();
            List<Map<String, Integer>> fixedList = (List<Map<String, Integer>>) data.get("fixed");
            if (fixedList != null) {
                for (Map<String, Integer> entry : fixedList) {
                    fixed.add(MonthDay.of(entry.get("month"), entry.get("day")));
                }
            }
            fixedHolidays = Set.copyOf(fixed);

            Set<LocalDate> specific = new HashSet<>();
            List<String> specificList = (List<String>) data.get("specific");
            if (specificList != null) {
                for (String dateStr : specificList) {
                    specific.add(LocalDate.parse(dateStr));
                }
            }
            specificHolidays = Set.copyOf(specific);
        }
    }

    public boolean isHoliday(LocalDate date) {
        return fixedHolidays.contains(MonthDay.from(date)) || specificHolidays.contains(date);
    }

    /**
     * Returns SUNDAY for public holidays so they use the Sunday ferry/bus schedule.
     * Otherwise returns the actual day-of-week.
     */
    public DayOfWeek effectiveDay(LocalDate date) {
        return isHoliday(date) ? DayOfWeek.SUNDAY : date.getDayOfWeek();
    }
}
