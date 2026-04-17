package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.enums.VolunteerStatus;
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
@Table(name = "org_general_event_volunteers")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class GeneralEventVolunteer implements OrganizationAware {

    @Id
    @TableGenerator(name = "general_event_vol_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "general_event_vol_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "general_event_vol_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "general_event_id", nullable = false)
    private GeneralEvent generalEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @Column(name = "role", nullable = false, length = 100)
    private String role;

    @Column(name = "role_description", length = 255)
    private String roleDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private VolunteerStatus status = VolunteerStatus.INVITED;

    @Column(name = "checked_in", nullable = false)
    private boolean checkedIn = false;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public GeneralEventVolunteer() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public GeneralEvent getGeneralEvent() { return generalEvent; }
    public void setGeneralEvent(GeneralEvent generalEvent) { this.generalEvent = generalEvent; }

    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getRoleDescription() { return roleDescription; }
    public void setRoleDescription(String roleDescription) { this.roleDescription = roleDescription; }

    public VolunteerStatus getStatus() { return status; }
    public void setStatus(VolunteerStatus status) { this.status = status; }

    public boolean isCheckedIn() { return checkedIn; }
    public void setCheckedIn(boolean checkedIn) { this.checkedIn = checkedIn; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
