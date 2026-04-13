package com.mosque.crm.dto;

import java.time.LocalDate;

public class JoinRequestCreateDTO {

    private String orgHandle;
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
    private String idNumber;
    private Long acceptedTermsVersionId;

    public JoinRequestCreateDTO() {}

    public String getOrgHandle() { return orgHandle; }
    public void setOrgHandle(String orgHandle) { this.orgHandle = orgHandle; }

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

    public String getIdNumber() { return idNumber; }
    public void setIdNumber(String idNumber) { this.idNumber = idNumber; }

    public Long getAcceptedTermsVersionId() { return acceptedTermsVersionId; }
    public void setAcceptedTermsVersionId(Long acceptedTermsVersionId) { this.acceptedTermsVersionId = acceptedTermsVersionId; }
}
