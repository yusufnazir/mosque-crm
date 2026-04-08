package com.mosque.crm.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.SubscriptionInvoice;
import com.mosque.crm.enums.InvoiceStatus;

@Repository
public interface SubscriptionInvoiceRepository extends JpaRepository<SubscriptionInvoice, Long> {

    List<SubscriptionInvoice> findByOrganizationIdOrderByIssueDateDesc(Long organizationId);

    List<SubscriptionInvoice> findBySubscriptionIdOrderByIssueDateDesc(Long subscriptionId);

    Optional<SubscriptionInvoice> findBySubscriptionIdAndPeriodStartAndPeriodEnd(
            Long subscriptionId, LocalDate periodStart, LocalDate periodEnd);

    List<SubscriptionInvoice> findByStatus(InvoiceStatus status);

    List<SubscriptionInvoice> findByStatusAndDueDateBefore(InvoiceStatus status, LocalDate date);
}
