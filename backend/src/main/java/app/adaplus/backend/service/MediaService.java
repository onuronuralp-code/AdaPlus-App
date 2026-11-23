package app.adaplus.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class MediaService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"
    );
    private static final long MAX_BYTES = 10L * 1024 * 1024; // 10 MB

    // Magic byte signatures for allowed image formats — guards against Content-Type spoofing
    private static final byte[] MAGIC_JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] MAGIC_PNG  = {(byte) 0x89, 0x50, 0x4E, 0x47};
    private static final byte[] MAGIC_GIF  = {0x47, 0x49, 0x46, 0x38};
    // WEBP: "RIFF" at 0, "WEBP" at 8
    private static final byte[] MAGIC_RIFF = {0x52, 0x49, 0x46, 0x46};
    private static final byte[] MAGIC_WEBP = {0x57, 0x45, 0x42, 0x50};

    @Autowired(required = false)
    private S3Client s3Client;

    @Value("${app.s3.enabled:false}")
    private boolean s3Enabled;

    @Value("${app.s3.bucket:adaplus-media}")
    private String bucket;

    @Value("${app.s3.region:eu-central-1}")
    private String region;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${app.media.local-upload-dir:./uploads}")
    private String localUploadDir;

    public String upload(MultipartFile file) throws IOException {
        validateFile(file);

        // The extension is derived from the client-supplied filename — sanitize it so a
        // crafted "../"-laden filename can't escape the upload directory (path traversal).
        String safeExtension = sanitizeName(extension(file.getOriginalFilename()));

        if (!s3Enabled || s3Client == null) {
            Path dir = Paths.get(localUploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String filename = UUID.randomUUID() + "." + safeExtension;
            Path target = dir.resolve(filename).normalize();
            if (!target.startsWith(dir)) {
                throw new IllegalArgumentException("Invalid file name");
            }
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            log.info("[DEV] Saved file locally: {}/{}", dir, filename);
            // Store a relative path so the URL remains valid after server IP/port changes
            return "/api/v1/media/" + filename;
        }

        String key = "uploads/" + UUID.randomUUID() + "." + safeExtension;

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(file.getContentType())
                        .contentLength(file.getSize())
                        .build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );

        return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
    }

    private void validateFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("File exceeds the 10 MB size limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Unsupported file type. Allowed: JPEG, PNG, GIF, WEBP");
        }
        validateMagicBytes(file);
    }

    private void validateMagicBytes(MultipartFile file) throws IOException {
        byte[] header = new byte[12];
        try (var is = file.getInputStream()) {
            int read = is.read(header);
            if (read < 3) throw new IllegalArgumentException("File too small to be a valid image");
        }
        if (startsWith(header, MAGIC_JPEG)) return;
        if (startsWith(header, MAGIC_PNG))  return;
        if (startsWith(header, MAGIC_GIF))  return;
        // WEBP: "RIFF" at offset 0 and "WEBP" at offset 8
        if (startsWith(header, MAGIC_RIFF) && header.length >= 12 && startsWith(header, MAGIC_WEBP, 8)) return;
        // HEIC/HEIF: ISO Base Media File Format — "ftyp" box at offset 4
        if (header.length >= 8 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70) return;
        throw new IllegalArgumentException("File content does not match a supported image format");
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        return startsWith(data, prefix, 0);
    }

    private static boolean startsWith(byte[] data, byte[] prefix, int offset) {
        if (data.length < offset + prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[offset + i] != prefix[i]) return false;
        }
        return true;
    }

    private String extension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private String sanitizeName(String filename) {
        if (filename == null) return "image";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
