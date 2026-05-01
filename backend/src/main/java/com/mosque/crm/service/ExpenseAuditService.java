package com.mosque.crm.service;

import com.mosque.crm.dto.ExpenseAuditEventDTO;
import com.mosque.crm.entity.ExpenseAuditEvent;
import com.mosque.crm.entity.User;
import com.mosque.crm.enums.ExpenseAuditEventType;
import com.mosque.crm.repository.ExpenseAuditEventRepository;
import com.mosque.crm.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ExpenseAuditService {

    private static final Logger log = LoggerFactory.getLogger(ExpenseAuditService.class);

    private final ExpenseAuditEventRepository auditEventRepository;
    private final UserRepository userRepository;

    public ExpenseAuditService(ExpenseAuditEventRepository auditEventRepository,
                               UserRepository userRepository) {
        this.auditEventRepository = auditEventRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void record(Long expenseId, Long organizationId, ExpenseAuditEventType eventType, Long userId, String detail) {
        ExpenseAuditEvent event = new ExpenseAuditEvent();
        event.setExpenseId(expenseId);
        event.setOrganizationId(organizationId);
        event.setEventType(eventType);
        event.setUserId(userId);
        event.setDetail(detail);
        auditEventRepository.save(event);
        log.debug("Audit event {} recorded for expense {}", eventType, expenseId);
    }

    @Transactional(readOnly = true)
    public Page<ExpenseAuditEventDTO> getAuditLog(Long expenseId, Pageable pageable) {
        Page<ExpenseAuditEvent> eventsPage = auditEventRepository.findByExpenseIdOrderByOccurredAtDesc(expenseId, pageable);
        List<ExpenseAuditEvent> events = eventsPage.getContent();

        Set<Long> userIds = events.stream()
            .map(ExpenseAuditEvent::getUserId)
            .filter(id -> id != null)
            .collect(Collectors.toSet());

        Map<Long, String> userNamesById = userRepository.findAllById(userIds).stream()
            .collect(Collectors.toMap(User::getId, User::getUsername, (left, right) -> left, java.util.HashMap::new));

        List<ExpenseAuditEventDTO> content = events
            .stream()
            .map(event -> toDTO(event, userNamesById))
            .collect(Collectors.toList());

        return new org.springframework.data.domain.PageImpl<>(content, pageable, eventsPage.getTotalElements());
    }

        private ExpenseAuditEventDTO toDTO(ExpenseAuditEvent e, Map<Long, String> userNamesById) {
        ExpenseAuditEventDTO dto = new ExpenseAuditEventDTO();
        dto.setId(e.getId());
        dto.setExpenseId(e.getExpenseId());
        dto.setEventType(e.getEventType() != null ? e.getEventType().name() : null);
        dto.setUserId(e.getUserId());
        dto.setActorName(e.getUserId() != null ? userNamesById.get(e.getUserId()) : null);
        dto.setDetail(e.getDetail());
        dto.setOccurredAt(e.getOccurredAt() != null ? e.getOccurredAt().toString() : null);
        return dto;
    }
}
