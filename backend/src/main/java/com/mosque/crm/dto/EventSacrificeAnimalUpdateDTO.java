package com.mosque.crm.dto;

import java.math.BigDecimal;

import com.mosque.crm.enums.SacrificeAnimalSize;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public class EventSacrificeAnimalUpdateDTO {

    @NotBlank
    @Size(max = 50)
    private String animalNumber;

    @NotNull
    private SacrificeAnimalSize size;

    @PositiveOrZero
    private BigDecimal weightKg;

    @PositiveOrZero
    private BigDecimal meatKg;

    public String getAnimalNumber() { return animalNumber; }
    public void setAnimalNumber(String animalNumber) { this.animalNumber = animalNumber; }

    public SacrificeAnimalSize getSize() { return size; }
    public void setSize(SacrificeAnimalSize size) { this.size = size; }

    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }

    public BigDecimal getMeatKg() { return meatKg; }
    public void setMeatKg(BigDecimal meatKg) { this.meatKg = meatKg; }
}
