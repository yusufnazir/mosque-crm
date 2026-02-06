package com.mosque.crm.dto;

public class AgeGenderBucketDTO {
    private String ageBucket;
    private String gender;
    private long count;

    public AgeGenderBucketDTO() {}

    public AgeGenderBucketDTO(String ageBucket, String gender, long count) {
        this.ageBucket = ageBucket;
        this.gender = gender;
        this.count = count;
    }

    public String getAgeBucket() {
        return ageBucket;
    }

    public void setAgeBucket(String ageBucket) {
        this.ageBucket = ageBucket;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public long getCount() {
        return count;
    }

    public void setCount(long count) {
        this.count = count;
    }
}
