package com.mosque.crm.service;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
public class MinioStorageService {

    private static final Logger log = LoggerFactory.getLogger(MinioStorageService.class);

    private final ConfigurationService configurationService;

    public MinioStorageService(ConfigurationService configurationService) {
        this.configurationService = configurationService;
    }

    public String getEndpoint() {
        return configurationService.getValue("MINIO_ENDPOINT").orElse("");
    }

    public String getAccessKey() {
        return configurationService.getValue("MINIO_ACCESS_KEY").orElse("");
    }

    public String getSecretKey() {
        return configurationService.getValue("MINIO_SECRET_KEY").orElse("");
    }

    public String getBucket() {
        return configurationService.getValue("MINIO_BUCKET").orElse("");
    }

    public String getRegion() {
        return configurationService.getValue("MINIO_REGION").orElse("us-east-1");
    }

    public boolean isUseSsl() {
        return configurationService.getValue("MINIO_USE_SSL")
                .map(Boolean::parseBoolean)
                .orElse(false);
    }

    /**
     * Build an S3Client from the stored configuration.
     * The caller is responsible for closing the client.
     */
    public S3Client buildClient() {
        String endpoint = getEndpoint();
        String accessKey = getAccessKey();
        String secretKey = getSecretKey();
        String region = getRegion();

        if (endpoint == null || endpoint.isBlank()) {
            throw new IllegalStateException("MinIO endpoint is not configured");
        }
        if (accessKey == null || accessKey.isBlank()) {
            throw new IllegalStateException("MinIO access key is not configured");
        }
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("MinIO secret key is not configured");
        }

        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .region(Region.of(region))
                .forcePathStyle(true)
                .build();
    }

    /**
     * Test connection to MinIO by issuing a HeadBucket request.
     * Returns a status message.
     */
    public String testConnection() {
        String bucket = getBucket();
        if (bucket == null || bucket.isBlank()) {
            return "Bucket name is not configured";
        }

        try (S3Client client = buildClient()) {
            client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            log.info("MinIO connection test successful for bucket: {}", bucket);
            return null; // success
        } catch (NoSuchBucketException e) {
            log.warn("MinIO bucket does not exist: {}", bucket);
            return "Bucket '" + bucket + "' does not exist. Please create it first.";
        } catch (S3Exception e) {
            log.error("MinIO S3 error: {}", e.awsErrorDetails().errorMessage());
            return "S3 error: " + e.awsErrorDetails().errorMessage();
        } catch (Exception e) {
            log.error("MinIO connection failed: {}", e.getMessage());
            return "Connection failed: " + e.getMessage();
        }
    }
}
