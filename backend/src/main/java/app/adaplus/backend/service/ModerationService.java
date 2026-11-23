package app.adaplus.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.*;

import java.util.List;
import java.util.regex.Pattern;

@Service
@Slf4j
public class ModerationService {

    private static final String PROMPT_TEMPLATE = """
            You are a content moderator for a community forum. \
            Does the following text contain hate speech, profanity, harassment, insults, or threats? \
            Reply with only YES or NO.

            Text: %s""";

    private final BedrockRuntimeClient bedrockClient;
    private final String modelId;
    private final boolean enabled;

    private static final List<Pattern> FALLBACK_BLOCKLIST = List.of(
        Pattern.compile("\\b(amk|aq|sg|siktir|oç|orospu|pezevenk|piç|gavat|yavşak)\\b", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE)
    );

    public ModerationService(
            BedrockRuntimeClient bedrockClient,
            @Value("${app.bedrock.moderation-model-id:anthropic.claude-haiku-4-5-20251001-v1:0}") String modelId,
            @Value("${app.bedrock.moderation-enabled:true}") boolean enabled) {
        this.bedrockClient = bedrockClient;
        this.modelId = modelId;
        this.enabled = enabled;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public boolean isFlagged(String content) {
        if (!enabled) {
            log.debug("[MODERATION DISABLED] Skipping moderation check");
            return false;
        }
        try {
            ConverseRequest request = ConverseRequest.builder()
                    .modelId(modelId)
                    .messages(Message.builder()
                            .role(ConversationRole.USER)
                            .content(ContentBlock.fromText(PROMPT_TEMPLATE.formatted(content)))
                            .build())
                    .inferenceConfig(InferenceConfiguration.builder()
                            .maxTokens(10)
                            .temperature(0.0f)
                            .build())
                    .build();

            ConverseResponse response = bedrockClient.converse(request);
            String answer = response.output().message().content().get(0).text().trim();
            log.debug("[MODERATION] Response: {}", answer);
            return answer.toUpperCase().startsWith("YES");
        } catch (Exception e) {
            log.warn("Moderation API call failed, using fallback filter. Error: {}", e.getMessage());
            return isFlaggedByFallback(content);
        }
    }

    private boolean isFlaggedByFallback(String content) {
        if (content == null) return false;
        for (Pattern p : FALLBACK_BLOCKLIST) {
            if (p.matcher(content).find()) {
                return true;
            }
        }
        return false;
    }
}
