package com.freight.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.IOException;
import java.io.InputStream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

@Slf4j
@Configuration
@ConditionalOnProperty(name = "fcm.enabled", havingValue = "true")
public class FirebaseConfig {

    @Value("${fcm.service-account-path:${firebase.service-account.path:}}")
    private String serviceAccountPath;

    @Bean
    public FirebaseApp firebaseApp(ResourceLoader resourceLoader) {
        if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
            throw new IllegalStateException("Missing Firebase service account path.");
        }

        try (InputStream inputStream = openCredentialStream(resourceLoader, serviceAccountPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(inputStream))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                log.info("Initialize Firebase app. path={}", serviceAccountPath);
                return FirebaseApp.initializeApp(options);
            }

            log.info("Reuse existing Firebase app.");
            return FirebaseApp.getInstance();
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to initialize Firebase app.", exception);
        }
    }

    @Bean
    public FirebaseMessaging firebaseMessaging(FirebaseApp firebaseApp) {
        return FirebaseMessaging.getInstance(firebaseApp);
    }

    private InputStream openCredentialStream(ResourceLoader resourceLoader, String path) throws IOException {
        Resource resource = resourceLoader.getResource(path);
        if (!resource.exists()) {
            throw new IOException("Firebase service account not found: " + path);
        }
        return resource.getInputStream();
    }
}
