package com.mosque.crm.dto;

import java.util.ArrayList;
import java.util.List;

public class PublicBusinessDirectoryResponse {

    private boolean enabled;
    private String organizationName;
    private boolean includesFederationListings;
    private List<PublicBusinessDTO> businesses = new ArrayList<>();
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first = true;
    private boolean last = true;
    private List<String> availableCategories = new ArrayList<>();

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }

    public boolean isIncludesFederationListings() { return includesFederationListings; }
    public void setIncludesFederationListings(boolean includesFederationListings) {
        this.includesFederationListings = includesFederationListings;
    }

    public List<PublicBusinessDTO> getBusinesses() { return businesses; }
    public void setBusinesses(List<PublicBusinessDTO> businesses) { this.businesses = businesses; }

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

    public void applyPageMeta(int page, int size, long totalElements) {
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = size > 0 ? (int) Math.ceil((double) totalElements / size) : 0;
        this.first = page == 0;
        this.last = totalPages == 0 || page >= totalPages - 1;
    }
}
