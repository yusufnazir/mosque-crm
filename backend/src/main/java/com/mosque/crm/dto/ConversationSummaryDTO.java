package com.mosque.crm.dto;

public class ConversationSummaryDTO {

    private Long otherUserId;
    private String otherUserName;
    private String baseSubject;
    private MessageDTO lastMessage;
    private long unreadCount;

    public ConversationSummaryDTO() {}

    public Long getOtherUserId() { return otherUserId; }
    public void setOtherUserId(Long otherUserId) { this.otherUserId = otherUserId; }

    public String getOtherUserName() { return otherUserName; }
    public void setOtherUserName(String otherUserName) { this.otherUserName = otherUserName; }

    public String getBaseSubject() { return baseSubject; }
    public void setBaseSubject(String baseSubject) { this.baseSubject = baseSubject; }

    public MessageDTO getLastMessage() { return lastMessage; }
    public void setLastMessage(MessageDTO lastMessage) { this.lastMessage = lastMessage; }

    public long getUnreadCount() { return unreadCount; }
    public void setUnreadCount(long unreadCount) { this.unreadCount = unreadCount; }
}
