package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.ParcelDistribution;
import com.mosque.crm.enums.RecipientType;

@Repository
public interface ParcelDistributionRepository extends JpaRepository<ParcelDistribution, Long> {

    List<ParcelDistribution> findByDistributionEventIdOrderByDistributedAtDesc(Long distributionEventId);

    List<ParcelDistribution> findByDistributionEventIdAndRecipientType(Long distributionEventId, RecipientType recipientType);

    List<ParcelDistribution> findByDistributionEventIdAndRecipientTypeAndRecipientId(Long distributionEventId, RecipientType recipientType, Long recipientId);

    void deleteByDistributionEventId(Long distributionEventId);
}
