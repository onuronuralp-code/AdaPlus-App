package app.adaplus.backend.controller;

import app.adaplus.backend.service.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Media", description = "Upload images for activities and listings.")
public class MediaController {

    private final MediaService mediaService;

    @Value("${app.media.local-upload-dir:./uploads}")
    private String localUploadDir;

    @PostMapping("/upload")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Upload an image",
            description = "Upload a JPEG, PNG, GIF, or WEBP image (max 10 MB). " +
                          "Returns the URL to use in the imageUrl field when creating an activity or listing. " +
                          "Requires authentication."
    )
    public Map<String, String> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        log.info("Upload request — filename: {}, contentType: {}, size: {}",
                file.getOriginalFilename(), file.getContentType(), file.getSize());
        String url = mediaService.upload(file);
        log.info("Upload succeeded — url: {}", url);
        return Map.of("url", url);
    }

    @GetMapping("/{filename:.+}")
    @Operation(summary = "Serve locally uploaded file (dev only)", description = "Returns a file saved locally when S3 is disabled.")
    public ResponseEntity<Resource> serveLocalFile(@PathVariable String filename) throws IOException {
        Path dir = Paths.get(localUploadDir).toAbsolutePath().normalize();
        Path file = dir.resolve(filename).normalize();
        if (!file.startsWith(dir)) {
            return ResponseEntity.badRequest().build();
        }
        Resource resource = new FileSystemResource(file);
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        String contentType = Files.probeContentType(file);
        if (contentType == null) contentType = "application/octet-stream";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }
}
