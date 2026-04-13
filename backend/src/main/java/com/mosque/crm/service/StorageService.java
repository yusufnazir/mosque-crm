package com.mosque.crm.service;

import com.mosque.crm.config.StorageProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.InputStream;

/**
 * Service for S3-compatible object storage (MinIO).
 * Handles bucket initialisation, upload, download and delete.
 *
 * Prefers database-stored configuration (via MinioStorageService / Settings UI)
 * over application.properties defaults, so admins can change MinIO settings at runtime.
 */
@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final S3Client propertiesS3Client;
    private final StorageProperties storageProperties;
    private final MinioStorageService minioStorageService;

    private volatile S3Client dbS3Client;
    private volatile String lastDbEndpoint;
    private volatile String lastDbAccessKey;

    public StorageService(S3Client s3Client, StorageProperties storageProperties, MinioStorageService minioStorageService) {
        this.propertiesS3Client = s3Client;
        this.storageProperties = storageProperties;
        this.minioStorageService = minioStorageService;
    }

    /**
     * Return the effective S3 client.
     * If MINIO_ENDPOINT is configured in the database (Settings UI), build/cache a client from that.
     * Otherwise fall back to the application.properties-based client.
     */
    private S3Client getS3Client() {
        String dbEndpoint = minioStorageService.getEndpoint();
        String dbAccessKey = minioStorageService.getAccessKey();

        if (dbEndpoint != null && !dbEndpoint.isBlank()) {
            // Rebuild cached client when config changes
            if (dbS3Client == null || !dbEndpoint.equals(lastDbEndpoint) || !dbAccessKey.equals(lastDbAccessKey)) {
                synchronized (this) {
                    if (dbS3Client == null || !dbEndpoint.equals(lastDbEndpoint) || !dbAccessKey.equals(lastDbAccessKey)) {
                        if (dbS3Client != null) {
                            try { dbS3Client.close(); } catch (Exception ignored) {}
                        }
                        dbS3Client = minioStorageService.buildClient();
                        lastDbEndpoint = dbEndpoint;
                        lastDbAccessKey = dbAccessKey;
                        log.info("S3 client rebuilt from database config (endpoint: {})", dbEndpoint);
                    }
                }
            }
            return dbS3Client;
        }
        return propertiesS3Client;
    }

    /**
     * Return the effective bucket name (DB config first, then properties).
     */
    private String getBucket() {
        String dbBucket = minioStorageService.getBucket();
        if (dbBucket != null && !dbBucket.isBlank()) {
            return dbBucket;
        }
        return storageProperties.getS3().getBucket();
    }

    @PreDestroy
    public void cleanup() {
        if (dbS3Client != null) {
            try { dbS3Client.close(); } catch (Exception ignored) {}
        }
    }

    /**
     * Ensure the configured bucket exists on startup.
     */
    @PostConstruct
    public void ensureBucketExists() {
        String bucket = getBucket();
        try {
            getS3Client().headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            log.info("S3 bucket '{}' already exists", bucket);
        } catch (NoSuchBucketException e) {
            log.info("Creating S3 bucket '{}'", bucket);
            getS3Client().createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            log.info("S3 bucket '{}' created", bucket);
        } catch (Exception e) {
            log.warn("Could not verify S3 bucket '{}': {}. Storage features may be unavailable.", bucket, e.getMessage());
        }
    }

    /**
     * Upload an object.
     *
     * @param key         the object key (path inside the bucket)
     * @param inputStream data to upload
     * @param contentType MIME type
     * @param size        content length in bytes
     */
    public void upload(String key, InputStream inputStream, String contentType, long size) {
        String bucket = getBucket();
        getS3Client().putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType)
                        .contentLength(size)
                        .build(),
                RequestBody.fromInputStream(inputStream, size));
        log.debug("Uploaded object '{}' to bucket '{}'", key, bucket);
    }

    /**
     * Download an object.
     *
     * @param key the object key
     * @return response stream (caller must close)
     */
    public ResponseInputStream<GetObjectResponse> download(String key) {
        String bucket = getBucket();
        return getS3Client().getObject(
                GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build());
    }

    /**
     * Delete an object.
     *
     * @param key the object key
     */
    public void delete(String key) {
        String bucket = getBucket();
        getS3Client().deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build());
        log.debug("Deleted object '{}' from bucket '{}'", key, bucket);
    }
}
