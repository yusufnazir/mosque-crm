package com.mosque.crm.dto;

/**
 * One gallery image of a business listing.
 *
 * <p>{@code url} serves the "full" variant (longest side ≤ 1600 px) and
 * {@code thumbUrl} the small variant (≤ 480 px) — use the thumbnail in grids,
 * cards and dialogs to keep bandwidth low.</p>
 */
public class BusinessImageDTO {

    private Long id;
    private String url;
    private String thumbUrl;
    private Integer width;
    private Integer height;

    public BusinessImageDTO() {
    }

    public BusinessImageDTO(Long id, String url, String thumbUrl, Integer width, Integer height) {
        this.id = id;
        this.url = url;
        this.thumbUrl = thumbUrl;
        this.width = width;
        this.height = height;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getThumbUrl() { return thumbUrl; }
    public void setThumbUrl(String thumbUrl) { this.thumbUrl = thumbUrl; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }
}
