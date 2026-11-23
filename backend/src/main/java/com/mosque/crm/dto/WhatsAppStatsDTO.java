package com.mosque.crm.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Everything the WhatsApp admin screen needs in one call: queue counters, live rate
 * limits, session state and the most recent replies.
 */
public class WhatsAppStatsDTO {

    private long queued;
    private long sending;
    private long sent;
    private long failed;
    private long cancelled;
    private long optOuts;

    private String sessionStatus;
    private String sessionName;

    private long sentLastHour;
    private long sentToday;
    private int hourlyCap;
    private int dailyCap;
    private int effectiveDailyCap;
    private long warmupDay;
    private boolean quietHours;
    private LocalDateTime quietHoursEnd;
    private int quietHoursStart;
    private int quietHoursEndHour;

    private String timezone;
    private int coldDelayMinSeconds;
    private int coldDelayMaxSeconds;
    private int conversationDelayMinSeconds;
    private int conversationDelayMaxSeconds;
    private boolean typingSimulationEnabled;

    private List<WhatsAppReplyDTO> recentReplies = new ArrayList<>();

    public long getQueued() { return queued; }
    public void setQueued(long queued) { this.queued = queued; }

    public long getSending() { return sending; }
    public void setSending(long sending) { this.sending = sending; }

    public long getSent() { return sent; }
    public void setSent(long sent) { this.sent = sent; }

    public long getFailed() { return failed; }
    public void setFailed(long failed) { this.failed = failed; }

    public long getCancelled() { return cancelled; }
    public void setCancelled(long cancelled) { this.cancelled = cancelled; }

    public long getOptOuts() { return optOuts; }
    public void setOptOuts(long optOuts) { this.optOuts = optOuts; }

    public String getSessionStatus() { return sessionStatus; }
    public void setSessionStatus(String sessionStatus) { this.sessionStatus = sessionStatus; }

    public String getSessionName() { return sessionName; }
    public void setSessionName(String sessionName) { this.sessionName = sessionName; }

    public long getSentLastHour() { return sentLastHour; }
    public void setSentLastHour(long sentLastHour) { this.sentLastHour = sentLastHour; }

    public long getSentToday() { return sentToday; }
    public void setSentToday(long sentToday) { this.sentToday = sentToday; }

    public int getHourlyCap() { return hourlyCap; }
    public void setHourlyCap(int hourlyCap) { this.hourlyCap = hourlyCap; }

    public int getDailyCap() { return dailyCap; }
    public void setDailyCap(int dailyCap) { this.dailyCap = dailyCap; }

    public int getEffectiveDailyCap() { return effectiveDailyCap; }
    public void setEffectiveDailyCap(int effectiveDailyCap) { this.effectiveDailyCap = effectiveDailyCap; }

    public long getWarmupDay() { return warmupDay; }
    public void setWarmupDay(long warmupDay) { this.warmupDay = warmupDay; }

    public boolean isQuietHours() { return quietHours; }
    public void setQuietHours(boolean quietHours) { this.quietHours = quietHours; }

    public LocalDateTime getQuietHoursEnd() { return quietHoursEnd; }
    public void setQuietHoursEnd(LocalDateTime quietHoursEnd) { this.quietHoursEnd = quietHoursEnd; }

    public int getQuietHoursStart() { return quietHoursStart; }
    public void setQuietHoursStart(int quietHoursStart) { this.quietHoursStart = quietHoursStart; }

    public int getQuietHoursEndHour() { return quietHoursEndHour; }
    public void setQuietHoursEndHour(int quietHoursEndHour) { this.quietHoursEndHour = quietHoursEndHour; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public int getColdDelayMinSeconds() { return coldDelayMinSeconds; }
    public void setColdDelayMinSeconds(int coldDelayMinSeconds) { this.coldDelayMinSeconds = coldDelayMinSeconds; }

    public int getColdDelayMaxSeconds() { return coldDelayMaxSeconds; }
    public void setColdDelayMaxSeconds(int coldDelayMaxSeconds) { this.coldDelayMaxSeconds = coldDelayMaxSeconds; }

    public int getConversationDelayMinSeconds() { return conversationDelayMinSeconds; }
    public void setConversationDelayMinSeconds(int conversationDelayMinSeconds) { this.conversationDelayMinSeconds = conversationDelayMinSeconds; }

    public int getConversationDelayMaxSeconds() { return conversationDelayMaxSeconds; }
    public void setConversationDelayMaxSeconds(int conversationDelayMaxSeconds) { this.conversationDelayMaxSeconds = conversationDelayMaxSeconds; }

    public boolean isTypingSimulationEnabled() { return typingSimulationEnabled; }
    public void setTypingSimulationEnabled(boolean typingSimulationEnabled) { this.typingSimulationEnabled = typingSimulationEnabled; }

    public List<WhatsAppReplyDTO> getRecentReplies() { return recentReplies; }
    public void setRecentReplies(List<WhatsAppReplyDTO> recentReplies) { this.recentReplies = recentReplies; }
}
