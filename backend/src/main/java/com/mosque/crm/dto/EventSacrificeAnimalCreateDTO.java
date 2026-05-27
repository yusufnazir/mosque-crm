package com.mosque.crm.dto;

import com.mosque.crm.enums.SacrificeAnimalSize;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class EventSacrificeAnimalCreateDTO {

    @NotBlank
    @Size(max = 50)
    private String animalNumber;

    @NotNull
    private SacrificeAnimalSize size;

    public String getAnimalNumber() { return animalNumber; }
    public void setAnimalNumber(String animalNumber) { this.animalNumber = animalNumber; }

    public SacrificeAnimalSize getSize() { return size; }
    public void setSize(SacrificeAnimalSize size) { this.size = size; }
}
