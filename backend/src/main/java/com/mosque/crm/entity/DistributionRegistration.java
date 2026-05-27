package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.enums.RegistrationStatus;
import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

@Entity
@Table(name = "org_distribution_registrations")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class DistributionRegistration implements OrganizationAware {

    @Id
    @TableGenerator(name = "distribution_registrations_seq", table = "sequences_",
            pkColumnName = "PK_NAME", pkColumnValue = "distribution_registrations_seq",
            valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "distribution_registrations_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private DistributionEvent distributionEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registration_type_id", nullable = false)
    private DistributionRegistrationType registrationType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id")
    private Person person;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(name = "is_member", nullable = false)
    private boolean member;

    @Column(name = "distribution_number", length = 20)
    private String distributionNumber;

    @Column(name = "planned_parcel_count", nullable = false)
    private int plannedParcelCount = 1;

    @Column(name = "distributed_parcel_count", nullable = false)
    private int distributedParcelCount;

    @Column(name = "id_number", length = 50)
    private String idNumber;

    @Column(name = "phone_number", length = 100)
    private String phoneNumber;

    @Column(name = "ad_hoc", nullable = false)
    private boolean adHoc;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RegistrationStatus status = RegistrationStatus.REGISTERED;

    @Column(name = "registered_at")
    private LocalDateTime registeredAt;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public DistributionEvent getDistributionEvent() { return distributionEvent; }
    public void setDistributionEvent(DistributionEvent distributionEvent) { this.distributionEvent = distributionEvent; }

    public DistributionRegistrationType getRegistrationType() { return registrationType; }
    public void setRegistrationType(DistributionRegistrationType registrationType) {
        this.registrationType = registrationType;
    }

    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public boolean isMember() { return member; }
    public void setMember(boolean member) { this.member = member; }

    public String getDistributionNumber() { return distributionNumber; }
    public void setDistributionNumber(String distributionNumber) { this.distributionNumber = distributionNumber; }

    public int getPlannedParcelCount() { return plannedParcelCount; }
    public void setPlannedParcelCount(int plannedParcelCount) { this.plannedParcelCount = plannedParcelCount; }

    public int getDistributedParcelCount() { return distributedParcelCount; }
    public void setDistributedParcelCount(int distributedParcelCount) { this.distributedParcelCount = distributedParcelCount; }

    public String getIdNumber() { return idNumber; }
    public void setIdNumber(String idNumber) { this.idNumber = idNumber; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public boolean isAdHoc() { return adHoc; }
    public void setAdHoc(boolean adHoc) { this.adHoc = adHoc; }

    public RegistrationStatus getStatus() { return status; }
    public void setStatus(RegistrationStatus status) { this.status = status; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
