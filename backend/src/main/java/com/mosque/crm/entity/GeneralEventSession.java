package com.mosque.crm.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.multitenancy.OrganizationAware;
import com.mosque.crm.multitenancy.OrganizationEntityListener;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

@Entity
@Table(name = "org_general_event_sessions")
@Filter(name = "organizationFilter", condition = "organization_id = :organizationId")
@EntityListeners(OrganizationEntityListener.class)
public class GeneralEventSession implements OrganizationAware {

    @Id
    @TableGenerator(name = "gen_event_sessions_seq", table = "sequences_", pkColumnName = "PK_NAME", pkColumnValue = "gen_event_sessions_seq", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "gen_event_sessions_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "general_event_id", nullable = false)
    private GeneralEvent generalEvent;

    @Column(name = "session_name", nullable = false, length = 255)
    private String sessionName;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "location", length = 500)
    private String location;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "session_order", nullable = false)
    private int sessionOrder = 1;

    @Column(name = "organization_id")
    private Long organizationId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<GeneralEventAttendance> attendanceRecords = new ArrayList<>();

    public GeneralEventSession() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public GeneralEvent getGeneralEvent() { return generalEvent; }
    public void setGeneralEvent(GeneralEvent generalEvent) { this.generalEvent = generalEvent; }

    public String getSessionName() { return sessionName; }
    public void setSessionName(String sessionName) { this.sessionName = sessionName; }

    public LocalDate getSessionDate() { return sessionDate; }
    public void setSessionDate(LocalDate sessionDate) { this.sessionDate = sessionDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public int getSessionOrder() { return sessionOrder; }
    public void setSessionOrder(int sessionOrder) { this.sessionOrder = sessionOrder; }

    @Override
    public Long getOrganizationId() { return organizationId; }
    @Override
    public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<GeneralEventAttendance> getAttendanceRecords() { return attendanceRecords; }
    public void setAttendanceRecords(List<GeneralEventAttendance> attendanceRecords) { this.attendanceRecords = attendanceRecords; }
}
