package com.mosque.crm.service;

import org.springframework.stereotype.Service;

import com.mosque.crm.enums.EventKind;
import com.mosque.crm.repository.DistributionEventRepository;
import com.mosque.crm.repository.GeneralEventRepository;

@Service
public class EventReferenceService {

    private final GeneralEventRepository generalEventRepository;
    private final DistributionEventRepository distributionEventRepository;

    public EventReferenceService(
            GeneralEventRepository generalEventRepository,
            DistributionEventRepository distributionEventRepository) {
        this.generalEventRepository = generalEventRepository;
        this.distributionEventRepository = distributionEventRepository;
    }

    public void validateEventExists(EventKind eventKind, Long eventId) {
        if (eventKind == EventKind.GENERAL) {
            generalEventRepository.findById(eventId)
                    .orElseThrow(() -> new RuntimeException("General event not found: " + eventId));
        } else if (eventKind == EventKind.DISTRIBUTION) {
            distributionEventRepository.findById(eventId)
                    .orElseThrow(() -> new RuntimeException("Distribution event not found: " + eventId));
        } else {
            throw new IllegalArgumentException("Unknown event kind: " + eventKind);
        }
    }

    public EventKind parseEventKind(String eventKindStr) {
        try {
            return EventKind.valueOf(eventKindStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid event kind: " + eventKindStr);
        }
    }
}
