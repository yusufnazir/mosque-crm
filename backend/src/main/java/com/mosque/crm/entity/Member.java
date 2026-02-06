package com.mosque.crm.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Member entity - represents a mosque member with membership management.
 *
 * Linked to GEDCOM Individual for genealogical/biographical data.
 * This entity focuses on:
 * - Membership management (status, fees, since date)
 * - Contact information (email, phone, address)
 *
 * Authentication is handled through separate User entity linked via UserMemberLink.
 * Family relationships are managed through GEDCOM entities (Individual, Family, FamilyChild).
 */
@Entity
@Table(name = "members")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Member {

    @Id
    @TableGenerator(name = "members_seq", table = "sequences_", pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "members_seq", strategy = GenerationType.TABLE)
    private Long id;

    // Link to GEDCOM Individual (optional)
    @Column(name = "individual_id", length = 20)
    private String individualId;  // Reference to gedcom_individuals.id (@I1@, @I2@, etc.)

    // Contact Information (member-specific, not genealogical)
    @Email(message = "Invalid email format")
    @Column(unique = true)
    private String email;

    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Invalid phone number")
    private String phone;

    @Column(length = 500)
    private String address;

    private String city;
    private String country;
    private String postalCode;

    // Membership Management
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MembershipStatus membershipStatus = MembershipStatus.ACTIVE;

    private LocalDate memberSince;

    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MembershipFee> fees = new ArrayList<>();

    // Link to User account (if member has portal access) - DEPRECATED: Use Person entity
    // Temporarily removed to allow Person migration - old userLink references should use Person
    // @OneToOne(mappedBy = "person", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // private UserMemberLink userLink;

    // Audit
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    /**
     * Helper method to get full name.
     * Returns "Unknown" as fallback if no Individual is linked.
     */
    public String getFullName() {
        // In practice, fetch from linked Individual entity
        return "Unknown";
    }

    /**
     * Helper method to get display name from linked Individual.
     * In practice, you'd fetch the Individual entity and combine givenName + surname.
     */
    public String getDisplayName() {
        return getFullName();
    }

    // DEPRECATED: Portal access now managed through Person entity
    public boolean hasPortalAccess() {
        return false; // Temporarily disabled during Person migration
    }

    // DEPRECATED: User link now managed through Person entity
    public User getUser() {
        return null; // Temporarily disabled during Person migration
    }

    public enum MembershipStatus {
        ACTIVE, INACTIVE, SUSPENDED
    }
}
