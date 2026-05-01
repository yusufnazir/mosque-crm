package com.mosque.crm.dto;

import java.util.List;

public class DocumentSearchResponseDTO {

    private List<DocumentDTO> items;
    private long totalElements;
    private int page;
    private int size;
    private boolean hasNext;

    public List<DocumentDTO> getItems() {
        return items;
    }

    public void setItems(List<DocumentDTO> items) {
        this.items = items;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public boolean isHasNext() {
        return hasNext;
    }

    public void setHasNext(boolean hasNext) {
        this.hasNext = hasNext;
    }
}