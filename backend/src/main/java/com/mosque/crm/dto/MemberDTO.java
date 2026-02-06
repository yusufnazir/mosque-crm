package com.mosque.crm.dto;

import java.time.LocalDate;
import java.util.List;

public class MemberDTO {
    private String id; // Person UUID
        private String password;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private String gender;
    private String address;
    private String city;
    private String country;
    private String postalCode;
    private String membershipStatus;
    private LocalDate memberSince;
    private String partnerId; // Kept for backward compatibility with frontend
    private String partnerName;
    private String parentId; // Kept for backward compatibility with frontend
    private List<MemberDTO> children; // Kept for backward compatibility with frontend
    private String username;
    private String role;
    private boolean accountEnabled;
    public MemberDTO() {}

    public MemberDTO(String id, String firstName, String lastName, String email, String phone, LocalDate dateOfBirth, String gender, String address, String city, String country, String postalCode, String membershipStatus, LocalDate memberSince, String partnerId, String partnerName, String parentId, List<MemberDTO> children, String username, String role, boolean accountEnabled) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.dateOfBirth = dateOfBirth;
        this.gender = gender;
        this.address = address;
        this.city = city;
        this.country = country;
        this.postalCode = postalCode;
        this.membershipStatus = membershipStatus;
        this.memberSince = memberSince;
        this.partnerId = partnerId;
        this.partnerName = partnerName;
        this.parentId = parentId;
        this.children = children;
        this.username = username;
        this.role = role;
        this.accountEnabled = accountEnabled;
    }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }
    public String getMembershipStatus() { return membershipStatus; }
    public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }
    public LocalDate getMemberSince() { return memberSince; }
    public void setMemberSince(LocalDate memberSince) { this.memberSince = memberSince; }
    public String getPartnerId() { return partnerId; }
    public void setPartnerId(String partnerId) { this.partnerId = partnerId; }
    public String getPartnerName() { return partnerName; }
    public void setPartnerName(String partnerName) { this.partnerName = partnerName; }
    public String getParentId() { return parentId; }
    public void setParentId(String parentId) { this.parentId = parentId; }
    public List<MemberDTO> getChildren() { return children; }
    public void setChildren(List<MemberDTO> children) { this.children = children; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public boolean isAccountEnabled() { return accountEnabled; }
    public void setAccountEnabled(boolean accountEnabled) { this.accountEnabled = accountEnabled; }
}
