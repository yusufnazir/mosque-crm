package com.mosque.crm.dto;

import java.math.BigDecimal;

public class MonthlyFeeStatsDTO {
    private int month; // 1-12
    private BigDecimal expected;
    private BigDecimal realized;

    public MonthlyFeeStatsDTO() {}

    public MonthlyFeeStatsDTO(int month, BigDecimal expected, BigDecimal realized) {
        this.month = month;
        this.expected = expected;
        this.realized = realized;
    }

    public int getMonth() {
        return month;
    }

    public void setMonth(int month) {
        this.month = month;
    }

    public BigDecimal getExpected() {
        return expected;
    }

    public void setExpected(BigDecimal expected) {
        this.expected = expected;
    }

    public BigDecimal getRealized() {
        return realized;
    }

    public void setRealized(BigDecimal realized) {
        this.realized = realized;
    }
}