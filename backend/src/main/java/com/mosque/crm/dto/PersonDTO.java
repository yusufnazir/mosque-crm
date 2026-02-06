package com.mosque.crm.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.mosque.crm.enums.PersonStatus;

public class PersonDTO {
        private String username;
        private String role;
        private boolean accountEnabled;
    private Long id;
    private String firstName;
    private String lastName;
    private String gender;
    private LocalDate dateOfBirth;
    private LocalDate dateOfDeath;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String country;
    private String postalCode;
    private PersonStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Portal access indicator
    private boolean hasPortalAccess;

    // GEDCOM link indicator
    private boolean hasGedcomData;
    private String gedcomIndividualId;

    // Active membership indicator
    private boolean hasActiveMembership;

    public PersonDTO() {
    }

    public PersonDTO(Long id, String firstName, String lastName, String email, PersonStatus status) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public LocalDate getDateOfDeath() {
        return dateOfDeath;
    }

    public void setDateOfDeath(LocalDate dateOfDeath) {
        this.dateOfDeath = dateOfDeath;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public boolean isAccountEnabled() {
        return accountEnabled;
    }

    public void setAccountEnabled(boolean accountEnabled) {
        this.accountEnabled = accountEnabled;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public PersonStatus getStatus() {
        return status;
    }

    public void setStatus(PersonStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isHasPortalAccess() {
        return hasPortalAccess;
    }

    public void setHasPortalAccess(boolean hasPortalAccess) {
        this.hasPortalAccess = hasPortalAccess;
    }

    public boolean isHasGedcomData() {
        return hasGedcomData;
    }

    public void setHasGedcomData(boolean hasGedcomData) {
        this.hasGedcomData = hasGedcomData;
    }

    public String getGedcomIndividualId() {
        return gedcomIndividualId;
    }

    public void setGedcomIndividualId(String gedcomIndividualId) {
        this.gedcomIndividualId = gedcomIndividualId;
    }

    public boolean isHasActiveMembership() {
        return hasActiveMembership;
    }

    public void setHasActiveMembership(boolean hasActiveMembership) {
        this.hasActiveMembership = hasActiveMembership;
    }

    public String getFullName() {
        if (lastName != null && !lastName.isEmpty()) {
            return firstName + " " + lastName;
        }
        return firstName;
    }
}
