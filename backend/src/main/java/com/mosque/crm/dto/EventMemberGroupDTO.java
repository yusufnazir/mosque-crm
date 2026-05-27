package com.mosque.crm.dto;

public class EventMemberGroupDTO {
    private Long id;
    private String eventKind;
    private Long eventId;
    private String name;
    private String description;
    private Long memberCount;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEventKind() { return eventKind; }
    public void setEventKind(String eventKind) { this.eventKind = eventKind; }
    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getMemberCount() { return memberCount; }
    public void setMemberCount(Long memberCount) { this.memberCount = memberCount; }
}
