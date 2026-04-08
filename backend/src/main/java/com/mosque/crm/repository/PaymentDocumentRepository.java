package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.PaymentDocument;

public interface PaymentDocumentRepository extends JpaRepository<PaymentDocument, Long> {

    List<PaymentDocument> findByPaymentGroupId(String paymentGroupId);

    int countByPaymentGroupId(String paymentGroupId);
}
