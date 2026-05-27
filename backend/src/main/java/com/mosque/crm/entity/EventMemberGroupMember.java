package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "org_event_member_group_members",
       uniqueConstraints = @UniqueConstraint(name = "uq_event_member_group_person", columnNames = {"group_id", "person_id"}))
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class EventMemberGroupMember implements OrganizationAware {

    @Id
    @TableGenerator(name = "event_member_group_members_seq", table = "sequences_",
            pkColumnName = "PK_NAME", pkColumnValue = "event_member_group_members_seq", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "event_member_group_members_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private EventMemberGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_role_id", nullable = false)
    private EventRole eventRole;

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

    public EventMemberGroup getGroup() { return group; }
    public void setGroup(EventMemberGroup group) { this.group = group; }

    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }

    public EventRole getEventRole() { return eventRole; }
    public void setEventRole(EventRole eventRole) { this.eventRole = eventRole; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
