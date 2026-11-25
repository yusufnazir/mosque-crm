package com.mosque.crm.exception;

/**
 * Business-rule failure for business directory media (gallery images / logo).
 *
 * <p>Carries a stable {@code code} so the frontend can show a message in the user's
 * own language instead of the English text produced here. The message is still a
 * sensible English fallback for API clients and logs.</p>
 */
public class BusinessImageException extends RuntimeException {

    /** No file was sent, or the file was empty. */
    public static final String EMPTY_FILE = "EMPTY_FILE";
    /** MIME type is not an accepted image type. */
    public static final String UNSUPPORTED_TYPE = "UNSUPPORTED_TYPE";
    /** Uploaded file is larger than the allowed maximum. */
    public static final String FILE_TOO_LARGE = "FILE_TOO_LARGE";
    /** The business already has the maximum number of gallery images. */
    public static final String IMAGE_LIMIT_REACHED = "IMAGE_LIMIT_REACHED";
    /** The file could not be decoded/re-encoded as an image. */
    public static final String PROCESSING_FAILED = "PROCESSING_FAILED";
    /** The object store (S3/MinIO) is unreachable. */
    public static final String STORAGE_UNAVAILABLE = "STORAGE_UNAVAILABLE";
    /** Any other failure while saving the file. */
    public static final String SAVE_FAILED = "SAVE_FAILED";
    /** The image does not belong to this business (or was removed). */
    public static final String IMAGE_NOT_FOUND = "IMAGE_NOT_FOUND";
    /** The requested display order does not match the business's images. */
    public static final String INVALID_ORDER = "INVALID_ORDER";

    private final String code;

    public BusinessImageException(String code, String message) {
        super(message);
        this.code = code;
    }

    public BusinessImageException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
