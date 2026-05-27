package com.mosque.crm.exception;

public class ActiveResourceAssignmentsException extends RuntimeException {

    private final long activeCount;

    public ActiveResourceAssignmentsException(long activeCount) {
        super("Cannot close event: " + activeCount + " resource assignment(s) are still active");
        this.activeCount = activeCount;
    }

    public long getActiveCount() {
        return activeCount;
    }
}
