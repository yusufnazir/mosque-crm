package com.mosque.crm.service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Iterator;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;

import org.springframework.stereotype.Component;

/**
 * Turns an uploaded photo into the two bandwidth-friendly variants the
 * business directory serves.
 *
 * <ul>
 *   <li><b>full</b> — longest side capped at {@value #FULL_MAX_DIMENSION} px, JPEG quality 0.82
 *       (used by the detail page lightbox)</li>
 *   <li><b>thumb</b> — longest side capped at {@value #THUMB_MAX_DIMENSION} px, JPEG quality 0.75
 *       (used by directory cards, the gallery grid and the detail dialog)</li>
 * </ul>
 *
 * Images are never upscaled, transparency is flattened onto white, and re-encoding
 * drops EXIF/GPS metadata. Decoding uses {@link ImageIO} only (no native deps), so
 * JPEG, PNG, GIF and BMP are supported; WebP is not decodable without a plugin and
 * is rejected with a clear message.
 */
@Component
public class BusinessImageProcessor {

    /** Longest side of the "full" variant served on the detail page. */
    public static final int FULL_MAX_DIMENSION = 1600;
    /** Longest side of the "thumb" variant used by cards and grids. */
    public static final int THUMB_MAX_DIMENSION = 480;

    private static final float FULL_QUALITY = 0.82f;
    private static final float THUMB_QUALITY = 0.75f;

    /** Guard against decompression bombs: 40 MP is far beyond any shop photo. */
    private static final long MAX_PIXELS = 40_000_000L;

    public static final String OUTPUT_CONTENT_TYPE = "image/jpeg";

    public record Variant(byte[] bytes, int width, int height) {
    }

    public record ProcessedImage(Variant full, Variant thumb) {
    }

    public ProcessedImage process(byte[] source) {
        if (source == null || source.length == 0) {
            throw new IllegalArgumentException("File is empty");
        }

        BufferedImage original;
        try {
            original = ImageIO.read(new ByteArrayInputStream(source));
        } catch (Exception ex) {
            throw new IllegalArgumentException(
                    "This image could not be read. Please upload a JPEG, PNG, GIF or BMP file.");
        }
        if (original == null) {
            throw new IllegalArgumentException(
                    "This image format is not supported. Please upload a JPEG, PNG, GIF or BMP file.");
        }
        long pixels = (long) original.getWidth() * original.getHeight();
        if (pixels > MAX_PIXELS) {
            throw new IllegalArgumentException("Image dimensions are too large. Please upload a smaller photo.");
        }

        Variant full = encode(original, FULL_MAX_DIMENSION, FULL_QUALITY);
        Variant thumb = encode(original, THUMB_MAX_DIMENSION, THUMB_QUALITY);
        return new ProcessedImage(full, thumb);
    }

    private Variant encode(BufferedImage original, int maxDimension, float quality) {
        int sourceWidth = original.getWidth();
        int sourceHeight = original.getHeight();
        int longest = Math.max(sourceWidth, sourceHeight);
        double ratio = longest > maxDimension ? (double) maxDimension / longest : 1d;
        int targetWidth = Math.max(1, (int) Math.round(sourceWidth * ratio));
        int targetHeight = Math.max(1, (int) Math.round(sourceHeight * ratio));

        BufferedImage scaled = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = scaled.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            // JPEG has no alpha channel — flatten transparency onto white instead of black.
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, targetWidth, targetHeight);
            graphics.drawImage(original, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }

        return new Variant(writeJpeg(scaled, quality), targetWidth, targetHeight);
    }

    private byte[] writeJpeg(BufferedImage image, float quality) {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IllegalStateException("No JPEG encoder available on this runtime");
        }
        ImageWriter writer = writers.next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(quality);
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
        } catch (Exception ex) {
            throw new IllegalStateException("Image encoding failed: " + ex.getMessage(), ex);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
