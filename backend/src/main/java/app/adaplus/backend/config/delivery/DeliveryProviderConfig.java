package app.adaplus.backend.config.delivery;

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
public class DeliveryProviderConfig {

    @Bean
    public Map<String, DeliveryProviderInfo> deliveryProvidersById() throws Exception {
        ObjectMapper yaml = new ObjectMapper(new YAMLFactory());

        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:delivery/providers/*.yml");

        Map<String, DeliveryProviderInfo> map = new HashMap<>();

        for (Resource r : resources) {
            try (InputStream is = r.getInputStream()) {
                DeliveryProviderInfo provider = yaml.readValue(is, DeliveryProviderInfo.class);

                if (provider.id() == null || provider.id().isBlank()) {
                    throw new IllegalStateException("Missing 'id' in delivery provider file: " + r.getFilename());
                }

                if (map.containsKey(provider.id())) {
                    throw new IllegalStateException("Duplicate delivery provider id '" + provider.id()
                            + "' found in: " + r.getFilename());
                }

                map.put(provider.id(), provider);
            }
        }

        return Map.copyOf(map);
    }
}
