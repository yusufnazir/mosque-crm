package com.mosque.crm.dto;



import java.time.LocalDate;

public class MembershipListDTO {
    private String personId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String gender;
    private LocalDate dateOfBirth;
    private String address;
    private String city;
    private String country;
    private String postalCode;
    private String status; // membership status string
    private String membershipType;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate dateOfDeath; // Added for deceased members

    // Account fields
    private String username;
    private String role;
    private boolean needsAccount;


    public MembershipListDTO() {}

    // Original constructor without dateOfDeath
    public MembershipListDTO(String personId, String firstName, String lastName, String email, String phone, String gender, LocalDate dateOfBirth, String address, String city, String country, String postalCode, String status, String membershipType, LocalDate startDate, LocalDate endDate, String username, String role, boolean needsAccount) {
        this.personId = personId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.gender = gender;
        this.dateOfBirth = dateOfBirth;
        this.address = address;
        this.city = city;
        this.country = country;
        this.postalCode = postalCode;
        this.status = status;
        this.membershipType = membershipType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.username = username;
        this.role = role;
        this.needsAccount = needsAccount;
    }

    // New constructor with dateOfDeath
    public MembershipListDTO(String personId, String firstName, String lastName, String email, String phone, String gender, LocalDate dateOfBirth, String address, String city, String country, String postalCode, String status, String membershipType, LocalDate startDate, LocalDate endDate, String username, String role, boolean needsAccount, LocalDate dateOfDeath) {
        this.personId = personId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.gender = gender;
        this.dateOfBirth = dateOfBirth;
        this.address = address;
        this.city = city;
        this.country = country;
        this.postalCode = postalCode;
        this.status = status;
        this.membershipType = membershipType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.username = username;
        this.role = role;
        this.needsAccount = needsAccount;
        this.dateOfDeath = dateOfDeath;
    }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public boolean isNeedsAccount() { return needsAccount; }
    public void setNeedsAccount(boolean needsAccount) { this.needsAccount = needsAccount; }

    public String getPersonId() { return personId; }
    public void setPersonId(String personId) { this.personId = personId; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMembershipType() { return membershipType; }
    public void setMembershipType(String membershipType) { this.membershipType = membershipType; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    // Getter and setter for dateOfDeath
    public LocalDate getDateOfDeath() { return dateOfDeath; }
    public void setDateOfDeath(LocalDate dateOfDeath) { this.dateOfDeath = dateOfDeath; }
}
