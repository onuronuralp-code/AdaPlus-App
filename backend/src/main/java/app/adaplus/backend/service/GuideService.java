package app.adaplus.backend.service;

import app.adaplus.backend.entity.ChatMessage;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.exception.DailyLimitExceededException;
import app.adaplus.backend.repository.ChatMessageRepository;
import app.adaplus.backend.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeAsyncClient;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.*;

import java.io.IOException;
import java.nio.file.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class GuideService {

    private static final String SYSTEM_PROMPT = """
            Sen Ada Plus uygulamasının Türkçe konuşan, samimi ve yardımsever bir rehber asistanısın.
            İstanbul'un Prens Adaları (Kınalıada, Burgazada, Heybeliada, Büyükada) hakkında uzmanlaşmışsın.

            Görevin: Aşağıdaki bilgi tabanını kullanarak kullanıcının sorularını yanıtlamak.

            Kurallar:
            - SADECE bilgi tabanında bulunan bilgileri kullan. Tahmin yürütme.
            - Bilgi tabanında cevap yoksa "Bu konuda elimde bilgi yok, ada sakinlerine sormanızı öneririm." de.
            - Mekan, kafe veya yer açıklamalarını bilgi tabanındaki gibi aynen yaz; kısaltma, özetleme veya parafraz yapma.
            - Türkçe veya İngilizce soru gelirse aynı dilde cevap ver.
            - Asla uydurma isim, fiyat veya saat bilgisi verme.
            - FORMAT: Diyez (#), alt cizgi (_) ve tek yildiz (*) kullanma. Liste sıralıyorsan her maddeyi yeni satırda "- **Yer/Kafe Adı**: açıklama." formatında yaz. Madde listesi değilse düz metin yaz.

            BILGI TABANI:
            ---
            %s
            ---
            """;

    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final BedrockRuntimeClient bedrockClient;
    private final BedrockRuntimeAsyncClient bedrockAsyncClient;
    private final String modelId;
    private final String knowledgeBasePath;
    private final int dailyLimit;

    private final Map<String, String> knowledgeBase = new HashMap<>();

    public GuideService(
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            BedrockRuntimeClient bedrockClient,
            BedrockRuntimeAsyncClient bedrockAsyncClient,
            @Value("${app.bedrock.model-id:anthropic.claude-sonnet-4-6}") String modelId,
            @Value("${app.guide.knowledge-base-path:./knowledge-base}") String knowledgeBasePath,
            @Value("${app.guide.daily-limit:10}") int dailyLimit) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.bedrockClient = bedrockClient;
        this.bedrockAsyncClient = bedrockAsyncClient;
        this.modelId = modelId;
        this.knowledgeBasePath = knowledgeBasePath;
        this.dailyLimit = dailyLimit;
    }

    @PostConstruct
    void loadKnowledgeBase() {
        Path base = Paths.get(knowledgeBasePath).toAbsolutePath();
        if (!Files.exists(base)) {
            log.error("[GUIDE] Knowledge base directory not found: {}", base);
            log.error("[GUIDE] Set KNOWLEDGE_BASE_PATH env var. AI guide will return fallback responses until fixed.");
            return;
        }
        try (var dirs = Files.list(base)) {
            dirs.filter(Files::isDirectory).forEach(islandDir -> {
                String island = islandDir.getFileName().toString();
                try (var files = Files.walk(islandDir)) {
                    String content = files
                            .filter(p -> p.toString().endsWith(".md"))
                            .sorted()
                            .map(p -> {
                                try { return Files.readString(p); }
                                catch (IOException e) { return ""; }
                            })
                            .collect(Collectors.joining("\n\n---\n\n"));
                    knowledgeBase.put(island, content);
                    log.info("[GUIDE] Loaded knowledge base for island: {} ({} chars)", island, content.length());
                } catch (IOException e) {
                    log.warn("[GUIDE] Failed to read island dir {}: {}", island, e.getMessage());
                }
            });
        } catch (IOException e) {
            log.error("[GUIDE] Failed to list knowledge base: {}", e.getMessage());
        }
        if (knowledgeBase.isEmpty()) {
            log.error("[GUIDE] Knowledge base loaded 0 entries from {}. Check that .md files exist under island subdirectories.", base);
        } else {
            log.info("[GUIDE] Knowledge base loaded for {} islands", knowledgeBase.size());
        }
    }

    private void checkDailyLimit(app.adaplus.backend.entity.User user) {
        if (user.getUserType() == app.adaplus.backend.entity.UserType.ISLAND_RESIDENT || user.getUserType() == app.adaplus.backend.entity.UserType.ADMIN) {
            return; // Unlimited access
        }
        
        ZonedDateTime now = ZonedDateTime.now(ISTANBUL);
        Instant startOfDay = now.toLocalDate().atStartOfDay(ISTANBUL).toInstant();
        Instant startOfTomorrow = now.toLocalDate().plusDays(1).atStartOfDay(ISTANBUL).toInstant();
        long count = chatMessageRepository.countByUserIdAndCreatedAtBetween(user.getId(), startOfDay, startOfTomorrow);
        if (count >= dailyLimit) {
            log.info("[GUIDE] Daily limit ({}) reached for user {}", dailyLimit, user.getId());
            throw new DailyLimitExceededException();
        }
    }

    public String chat(String message, String island) {
        User user = getCurrentUser();
        checkDailyLimit(user);

        chatMessageRepository.save(ChatMessage.builder()
                .user(user)
                .message(message)
                .island(island)
                .build());

        String context = buildContext(island);
        String systemPrompt = SYSTEM_PROMPT.formatted(context);

        try {
            ConverseRequest request = ConverseRequest.builder()
                    .modelId(modelId)
                    .system(SystemContentBlock.builder().text(systemPrompt).build())
                    .messages(Message.builder()
                            .role(ConversationRole.USER)
                            .content(ContentBlock.fromText(message))
                            .build())
                    .inferenceConfig(InferenceConfiguration.builder()
                            .maxTokens(800)
                            .temperature(0.7f)
                            .build())
                    .build();

            ConverseResponse response = bedrockClient.converse(request);
            String reply = response.output().message().content().get(0).text().trim();
            log.info("[GUIDE] Bedrock response for user {}: {} chars", user.getId(), reply.length());
            return reply;

        } catch (Exception e) {
            log.warn("[GUIDE] Bedrock call failed: {}", e.getMessage());
            return fallbackResponse();
        }
    }

    private String buildContext(String island) {
        List<String> sections = new ArrayList<>();

        if (knowledgeBase.containsKey("genel")) {
            sections.add("## GENEL BİLGİLER\n" + knowledgeBase.get("genel"));
        }

        if (island != null && !island.isBlank() && knowledgeBase.containsKey(island)) {
            sections.add("## " + island.toUpperCase() + " BİLGİLERİ\n" + knowledgeBase.get(island));
        }
        // When no island is specified, only genel context is included to keep prompt small

        return String.join("\n\n===\n\n", sections);
    }

    public void validateChatRequest(String userId) {
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new RuntimeException("User not found"));
        checkDailyLimit(user);
    }

    public void chatStream(String userId, String message, String island, SseEmitter emitter) {
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new RuntimeException("User not found"));

        chatMessageRepository.save(ChatMessage.builder()
                .user(user)
                .message(message)
                .island(island)
                .build());

        String context = buildContext(island);
        String systemPrompt = SYSTEM_PROMPT.formatted(context);

        ConverseStreamRequest request = ConverseStreamRequest.builder()
                .modelId(modelId)
                .system(SystemContentBlock.builder().text(systemPrompt).build())
                .messages(Message.builder()
                        .role(ConversationRole.USER)
                        .content(ContentBlock.fromText(message))
                        .build())
                .inferenceConfig(InferenceConfiguration.builder()
                        .maxTokens(800)
                        .temperature(0.7f)
                        .build())
                .build();

        // Track client disconnection so we stop forwarding tokens to a dead socket.
        // Without this flag, the AWS SDK continues streaming and burning Bedrock tokens
        // even after the client has gone away.
        AtomicBoolean clientGone = new AtomicBoolean(false);
        emitter.onCompletion(() -> clientGone.set(true));
        emitter.onTimeout(() -> clientGone.set(true));
        emitter.onError(e -> clientGone.set(true));

        ConverseStreamResponseHandler.Visitor visitor = ConverseStreamResponseHandler.Visitor.builder()
                .onContentBlockDelta(event -> {
                    if (clientGone.get()) return;
                    String text = event.delta().text();
                    if (text != null && !text.isEmpty()) {
                        try {
                            emitter.send(SseEmitter.event().data(text));
                        } catch (IOException e) {
                            log.debug("[GUIDE] SSE client disconnected mid-stream for user {}", userId);
                            clientGone.set(true);
                        }
                    }
                })
                .build();

        ConverseStreamResponseHandler handler = ConverseStreamResponseHandler.builder()
                .subscriber(visitor)
                .build();

        bedrockAsyncClient.converseStream(request, handler)
                .whenComplete((response, error) -> {
                    if (clientGone.get()) return;
                    if (error != null) {
                        log.warn("[GUIDE] Stream error for user {}: {}", userId, error.getMessage());
                        emitter.completeWithError(error);
                    } else {
                        log.info("[GUIDE] Stream complete for user {}", userId);
                        emitter.complete();
                    }
                });
    }

    private String fallbackResponse() {
        return "Üzgünüm, şu an yanıt veremiyorum. Lütfen biraz sonra tekrar dene.";
    }

    private User getCurrentUser() {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
