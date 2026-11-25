package com.mosque.crm.dto;

import java.util.List;

/** Body for re-ordering a business gallery: the first id becomes the cover image. */
public class BusinessImageOrderDTO {

    private List<Long> imageIds;

    public BusinessImageOrderDTO() {
    }

    public BusinessImageOrderDTO(List<Long> imageIds) {
        this.imageIds = imageIds;
    }

    public List<Long> getImageIds() { return imageIds; }
    public void setImageIds(List<Long> imageIds) { this.imageIds = imageIds; }
}
