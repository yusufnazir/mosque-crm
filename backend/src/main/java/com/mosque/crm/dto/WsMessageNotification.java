package com.mosque.crm.dto;

public class WsMessageNotification {

    private MessageDTO message;
    private long unreadCount;

    public WsMessageNotification() {
    }

    public WsMessageNotification(MessageDTO message, long unreadCount) {
        this.message = message;
        this.unreadCount = unreadCount;
    }

    public MessageDTO getMessage() {
        return message;
    }

    public void setMessage(MessageDTO message) {
        this.message = message;
    }

    public long getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(long unreadCount) {
        this.unreadCount = unreadCount;
    }
}
