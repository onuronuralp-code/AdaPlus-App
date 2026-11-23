package app.adaplus.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeAsyncClient;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;

/**
 * Centralizes Bedrock SDK client creation so the underlying HTTP connection pools
 * are shared across services and closed properly on context shutdown.
 *
 * Without this, each service that calls BedrockRuntimeClient.builder().build()
 * owns its own connection pool and thread pool. Those pools are never closed
 * because the clients are plain fields, not Spring-managed beans.
 */
@Configuration
public class BedrockConfig {

    @Bean(destroyMethod = "close")
    public BedrockRuntimeClient bedrockRuntimeClient(
            @Value("${app.bedrock.region:us-east-1}") String region) {
        return BedrockRuntimeClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    @Bean(destroyMethod = "close")
    public BedrockRuntimeAsyncClient bedrockRuntimeAsyncClient(
            @Value("${app.bedrock.region:us-east-1}") String region) {
        return BedrockRuntimeAsyncClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }
}
