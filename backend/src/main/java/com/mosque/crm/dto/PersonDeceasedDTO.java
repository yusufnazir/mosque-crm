package com.mosque.crm.dto;

import java.time.LocalDate;

public class PersonDeceasedDTO {
    private LocalDate dateOfDeath;

    public PersonDeceasedDTO() {
    }

    public LocalDate getDateOfDeath() {
        return dateOfDeath;
    }

    public void setDateOfDeath(LocalDate dateOfDeath) {
        this.dateOfDeath = dateOfDeath;
    }
}