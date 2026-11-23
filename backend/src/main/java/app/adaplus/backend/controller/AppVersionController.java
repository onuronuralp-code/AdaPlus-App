package app.adaplus.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/app")
@Tag(name = "App", description = "App version and compatibility")
public class AppVersionController {

    @Value("${app.version.minimum:1.0.0}")
    private String minimumVersion;

    @Value("${app.version.latest:1.0.0}")
    private String latestVersion;

    @Operation(summary = "Get minimum and latest app version requirements")
    @GetMapping("/version")
    public Map<String, String> getVersion() {
        return Map.of(
                "minimumVersion", minimumVersion,
                "latestVersion", latestVersion
        );
    }
}
