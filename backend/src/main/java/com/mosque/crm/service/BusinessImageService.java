package com.mosque.crm.service;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mosque.crm.entity.Business;
import com.mosque.crm.entity.BusinessImage;
import com.mosque.crm.exception.BusinessImageException;
import com.mosque.crm.repository.BusinessImageRepository;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

/**
 * Storage + validation for business gallery images.
 *
 * <p>Rules (product requirements): at most {@value #MAX_IMAGES_PER_BUSINESS} images per
 * business and at most {@value #MAX_SIZE_MB} MB per uploaded file. Every upload is
 * re-encoded into a "full" and a "thumb" JPEG variant by {@link BusinessImageProcessor},
 * so the object storage already holds the bytes the browser will download — no
 * on-the-fly resizing and no full-size originals.</p>
 *
 * <p>Permission checks live in {@link BusinessDirectoryService}; this service only
 * works on a {@link Business} the caller has already been authorised for.</p>
 */
@Service
public class BusinessImageService {

    private static final Logger log = LoggerFactory.getLogger(BusinessImageService.class);

    /** Maximum number of gallery images a single business may have. */
    public static final int MAX_IMAGES_PER_BUSINESS = 5;
    /** Maximum size of one uploaded file, in megabytes. */
    public static final int MAX_SIZE_MB = 5;

    /** Shown when the S3/MinIO bucket cannot be reached (the SDK message itself is unreadable). */
    public static final String STORAGE_UNAVAILABLE_MESSAGE =
            "Photo storage is currently unavailable, so the file could not be saved. "
                    + "Please try again later or contact your administrator.";
    /** Shown for any other unexpected storage failure. */
    public static final String GENERIC_SAVE_FAILED_MESSAGE =
            "The file could not be saved. Please try again.";

    private static final long MAX_BYTES = (long) MAX_SIZE_MB * 1024 * 1024;

    private static final Set<String> ALLOWED_INPUT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/bmp");

    private final BusinessImageRepository imageRepository;
    private final StorageService storageService;
    private final BusinessImageProcessor processor;

    public BusinessImageService(
            BusinessImageRepository imageRepository,
            StorageService storageService,
            BusinessImageProcessor processor) {
        this.imageRepository = imageRepository;
        this.storageService = storageService;
        this.processor = processor;
    }

    public record StoredImage(byte[] bytes, String contentType) {
    }

    @Transactional(readOnly = true)
    public List<BusinessImage> listForBusiness(Long businessId) {
        return imageRepository.findByBusinessIdOrderBySortOrderAscIdAsc(businessId);
    }

    @Transactional(readOnly = true)
    public Optional<BusinessImage> find(Long businessId, Long imageId) {
        return imageRepository.findByIdAndBusinessId(imageId, businessId);
    }

    @Transactional
    public BusinessImage upload(Business business, MultipartFile file) {
        validateFile(file);

        List<BusinessImage> existingImages = imageRepository.findByBusinessId(business.getId());
        if (existingImages.size() >= MAX_IMAGES_PER_BUSINESS) {
            throw new BusinessImageException(BusinessImageException.IMAGE_LIMIT_REACHED,
                    "A business can have at most " + MAX_IMAGES_PER_BUSINESS + " images. Remove one first.");
        }
        // Append after the highest position so a gap left by a deletion never causes collisions.
        int nextSortOrder = existingImages.stream()
                .mapToInt(BusinessImage::getSortOrder)
                .max()
                .orElse(-1) + 1;

        BusinessImageProcessor.ProcessedImage processed;
        try {
            processed = processor.process(file.getBytes());
        } catch (IllegalArgumentException ex) {
            throw new BusinessImageException(BusinessImageException.PROCESSING_FAILED, ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("Image processing failed for business {}", business.getId(), ex);
            throw new BusinessImageException(BusinessImageException.PROCESSING_FAILED,
                    "The image could not be processed. Please try another photo.", ex);
        }

        String baseKey = "business-images/" + business.getOrganizationId() + "/" + business.getId()
                + "/" + UUID.randomUUID();
        String imageKey = baseKey + "-full.jpg";
        String thumbKey = baseKey + "-thumb.jpg";

        try {
            uploadObject(imageKey, processed.full());
            uploadObject(thumbKey, processed.thumb());
        } catch (Exception ex) {
            // Keep the bucket clean when only one of the two variants made it.
            deleteQuietly(imageKey);
            deleteQuietly(thumbKey);
            log.error("Storing business image failed for business {} ({}): {}",
                    business.getId(), file.getOriginalFilename(), ex.toString(), ex);
            throw new BusinessImageException(
                    isStorageUnavailable(ex)
                            ? BusinessImageException.STORAGE_UNAVAILABLE
                            : BusinessImageException.SAVE_FAILED,
                    friendlyStorageMessage(ex), ex);
        }

        BusinessImage image = new BusinessImage();
        image.setOrganizationId(business.getOrganizationId());
        image.setBusinessId(business.getId());
        image.setImageKey(imageKey);
        image.setThumbKey(thumbKey);
        image.setContentType(BusinessImageProcessor.OUTPUT_CONTENT_TYPE);
        image.setWidth(processed.full().width());
        image.setHeight(processed.full().height());
        image.setSizeBytes((long) processed.full().bytes().length);
        image.setThumbSizeBytes((long) processed.thumb().bytes().length);
        image.setSortOrder(nextSortOrder);
        image = imageRepository.save(image);

        log.info("Business image uploaded: business={} image={} full={}B thumb={}B (source {}B)",
                business.getId(), image.getId(), image.getSizeBytes(), image.getThumbSizeBytes(), file.getSize());
        return image;
    }

    @Transactional
    public void delete(BusinessImage image) {
        deleteQuietly(image.getImageKey());
        deleteQuietly(image.getThumbKey());
        imageRepository.delete(image);
        log.info("Business image deleted: business={} image={}", image.getBusinessId(), image.getId());
    }

    @Transactional
    public void deleteAllForBusiness(Long businessId) {
        List<BusinessImage> images = imageRepository.findByBusinessId(businessId);
        for (BusinessImage image : images) {
            deleteQuietly(image.getImageKey());
            deleteQuietly(image.getThumbKey());
        }
        if (!images.isEmpty()) {
            imageRepository.deleteAll(images);
        }
    }

    /** Persist a new display order; the first id becomes the cover image. */
    @Transactional
    public List<BusinessImage> reorder(Business business, List<Long> orderedImageIds) {
        List<BusinessImage> images = imageRepository.findByBusinessIdOrderBySortOrderAscIdAsc(business.getId());
        if (orderedImageIds == null || orderedImageIds.size() != images.size()) {
            throw new BusinessImageException(BusinessImageException.INVALID_ORDER,
                    "Provide the ids of all images of this business, in display order.");
        }
        Set<Long> existingIds = images.stream().map(BusinessImage::getId).collect(Collectors.toSet());
        Set<Long> incoming = new HashSet<>(orderedImageIds);
        if (incoming.size() != orderedImageIds.size() || !existingIds.equals(incoming)) {
            throw new BusinessImageException(BusinessImageException.INVALID_ORDER,
                    "Image order must contain every image of this business exactly once.");
        }

        List<BusinessImage> reordered = new ArrayList<>(images.size());
        for (int i = 0; i < orderedImageIds.size(); i++) {
            Long id = orderedImageIds.get(i);
            for (BusinessImage image : images) {
                if (image.getId().equals(id)) {
                    image.setSortOrder(i);
                    reordered.add(image);
                    break;
                }
            }
        }
        imageRepository.saveAll(reordered);
        return reordered;
    }

    /** Load one stored variant for serving over HTTP. */
    @Transactional(readOnly = true)
    public StoredImage load(BusinessImage image, boolean thumbnail) {
        String key = thumbnail ? image.getThumbKey() : image.getImageKey();
        try {
            ResponseInputStream<GetObjectResponse> response = storageService.download(key);
            String contentType = response.response().contentType();
            return new StoredImage(response.readAllBytes(),
                    contentType != null ? contentType : BusinessImageProcessor.OUTPUT_CONTENT_TYPE);
        } catch (Exception ex) {
            log.error("Failed to serve business image {} (key {}): {}", image.getId(), key, ex.getMessage());
            return null;
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessImageException(BusinessImageException.EMPTY_FILE, "File is empty");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessImageException(BusinessImageException.FILE_TOO_LARGE,
                    "Image exceeds the maximum size of " + MAX_SIZE_MB + " MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_INPUT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessImageException(BusinessImageException.UNSUPPORTED_TYPE,
                    "File type not allowed. Accepted: JPEG, PNG, WebP, GIF, BMP images.");
        }
    }

    private void uploadObject(String key, BusinessImageProcessor.Variant variant) {
        byte[] bytes = variant.bytes();
        storageService.upload(key, new ByteArrayInputStream(bytes),
                BusinessImageProcessor.OUTPUT_CONTENT_TYPE, bytes.length);
    }

    private void deleteQuietly(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        try {
            storageService.delete(key);
        } catch (Exception ex) {
            log.warn("Failed to delete stored image object {}: {}", key, ex.getMessage());
        }
    }

    /**
     * Map a storage failure to a message a shop owner can act on. The SDK's own text
     * ("Unable to execute HTTP request: Connect to localhost:9000 … Connection refused")
     * means nothing to a user, so it only goes to the log.
     */
    private static String friendlyStorageMessage(Throwable error) {
        return isStorageUnavailable(error) ? STORAGE_UNAVAILABLE_MESSAGE : GENERIC_SAVE_FAILED_MESSAGE;
    }

    /** True when the failure chain is a network/IO problem reaching the object store. */
    public static boolean isStorageUnavailable(Throwable error) {
        Throwable cause = error;
        while (cause != null) {
            if (cause instanceof java.io.IOException) {
                return true;
            }
            String message = cause.getMessage();
            if (message != null
                    && (message.contains("Unable to execute HTTP request")
                            || message.contains("Connection refused"))) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
