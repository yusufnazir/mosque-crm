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
import java.io.InputStream;

/**
 * Service for S3-compatible object storage (MinIO).
 * Handles bucket initialisation, upload, download and delete.
 */
@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final S3Client s3Client;
    private final StorageProperties storageProperties;

    public StorageService(S3Client s3Client, StorageProperties storageProperties) {
        this.s3Client = s3Client;
        this.storageProperties = storageProperties;
    }

    /**
     * Ensure the configured bucket exists on startup.
     */
    @PostConstruct
    public void ensureBucketExists() {
        String bucket = storageProperties.getS3().getBucket();
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            log.info("S3 bucket '{}' already exists", bucket);
        } catch (NoSuchBucketException e) {
            log.info("Creating S3 bucket '{}'", bucket);
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
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
        String bucket = storageProperties.getS3().getBucket();
        s3Client.putObject(
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
        String bucket = storageProperties.getS3().getBucket();
        return s3Client.getObject(
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
        String bucket = storageProperties.getS3().getBucket();
        s3Client.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build());
        log.debug("Deleted object '{}' from bucket '{}'", key, bucket);
    }
}
