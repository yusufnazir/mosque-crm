package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.enums.AttendanceStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "org_general_event_attendance")
public class GeneralEventAttendance {

    @Id
    @TableGenerator(name = "gen_event_attendance_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "gen_event_attendance_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "gen_event_attendance_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "general_event_id", nullable = false)
    private GeneralEvent generalEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private GeneralEventSession session;

    // Nullable — null means walk-in (no prior registration)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registration_id")
    private GeneralEventRegistration registration;

    // Nullable — null means anonymous walk-in
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id")
    private Person person;

    @Column(name = "walk_in_name", length = 255)
    private String walkInName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AttendanceStatus status = AttendanceStatus.ABSENT;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "checked_in_by_user_id")
    private Long checkedInByUserId;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public GeneralEventAttendance() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public GeneralEvent getGeneralEvent() { return generalEvent; }
    public void setGeneralEvent(GeneralEvent generalEvent) { this.generalEvent = generalEvent; }

    public GeneralEventSession getSession() { return session; }
    public void setSession(GeneralEventSession session) { this.session = session; }

    public GeneralEventRegistration getRegistration() { return registration; }
    public void setRegistration(GeneralEventRegistration registration) { this.registration = registration; }

    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }

    public String getWalkInName() { return walkInName; }
    public void setWalkInName(String walkInName) { this.walkInName = walkInName; }

    public AttendanceStatus getStatus() { return status; }
    public void setStatus(AttendanceStatus status) { this.status = status; }

    public LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }

    public Long getCheckedInByUserId() { return checkedInByUserId; }
    public void setCheckedInByUserId(Long checkedInByUserId) { this.checkedInByUserId = checkedInByUserId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
