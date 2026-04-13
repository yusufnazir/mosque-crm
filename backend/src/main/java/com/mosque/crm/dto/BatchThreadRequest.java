package com.mosque.crm.dto;

import java.util.List;

public class BatchThreadRequest {

    private List<ThreadKey> threads;

    public BatchThreadRequest() {}

    public List<ThreadKey> getThreads() { return threads; }
    public void setThreads(List<ThreadKey> threads) { this.threads = threads; }

    public static class ThreadKey {

        private Long otherUserId;
        private String baseSubject;

        public ThreadKey() {}

        public Long getOtherUserId() { return otherUserId; }
        public void setOtherUserId(Long otherUserId) { this.otherUserId = otherUserId; }

        public String getBaseSubject() { return baseSubject; }
        public void setBaseSubject(String baseSubject) { this.baseSubject = baseSubject; }
    }
}
