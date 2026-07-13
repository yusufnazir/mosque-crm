package com.mosque.crm.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Paginated business-directory browse response with category chips for the current scope.
 */
public class BusinessDirectoryPageResponse<T> {

    private List<T> content = new ArrayList<>();
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
    private List<String> availableCategories = new ArrayList<>();

    public BusinessDirectoryPageResponse() {
    }

    public BusinessDirectoryPageResponse(List<T> content, int page, int size, long totalElements,
            List<String> availableCategories) {
        this.content = content != null ? content : new ArrayList<>();
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = size > 0 ? (int) Math.ceil((double) totalElements / size) : 0;
        this.first = page == 0;
        this.last = totalPages == 0 || page >= totalPages - 1;
        this.availableCategories = availableCategories != null ? availableCategories : new ArrayList<>();
    }

    public List<T> getContent() { return content; }
    public void setContent(List<T> content) { this.content = content; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public boolean isFirst() { return first; }
    public void setFirst(boolean first) { this.first = first; }

    public boolean isLast() { return last; }
    public void setLast(boolean last) { this.last = last; }

    public List<String> getAvailableCategories() { return availableCategories; }
    public void setAvailableCategories(List<String> availableCategories) {
        this.availableCategories = availableCategories;
    }
}
