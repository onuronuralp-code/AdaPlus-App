package app.adaplus.backend.config;

import org.springframework.beans.factory.annotation.Value;
import app.adaplus.backend.entity.PostType;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private List<String> allowedOrigins;

    @Value("${cors.allowed-methods:GET,POST,PUT,DELETE,OPTIONS}")
    private List<String> allowedMethods;

    @Value("${cors.max-age-seconds:3600}")
    private long maxAgeSeconds;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Email-review is served as HTML from the API itself; the form POST origin is api.adaplus.app
        registry.addMapping("/api/v1/admin/email-review")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false);

        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods(allowedMethods.toArray(String[]::new))
                .allowedHeaders("Authorization", "Content-Type", "Accept")
                .allowCredentials(false)
                .maxAge(maxAgeSeconds);
    }

    @Override
    public void addResourceHandlers(org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }

    @Override
    public void addFormatters(FormatterRegistry registry) {
        // Accept legacy post types (DISCUSSION, COMPLAINT, INFO) in query params too
        registry.addConverter(String.class, PostType.class, PostType::fromValue);
    }
}
