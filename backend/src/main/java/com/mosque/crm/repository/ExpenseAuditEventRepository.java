package com.mosque.crm.repository;

import com.mosque.crm.entity.ExpenseAuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseAuditEventRepository extends JpaRepository<ExpenseAuditEvent, Long> {

    Page<ExpenseAuditEvent> findByExpenseIdOrderByOccurredAtDesc(Long expenseId, Pageable pageable);
}
