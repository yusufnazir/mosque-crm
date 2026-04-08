package com.mosque.crm.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public class RecordSubscriptionPaymentRequest {

    @NotNull
    private BigDecimal amount;

    private String currency;
    private String paymentMethod;
    private String reference;

    public RecordSubscriptionPaymentRequest() {
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }
}
