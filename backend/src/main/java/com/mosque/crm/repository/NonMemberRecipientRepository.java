package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.NonMemberRecipient;

@Repository
public interface NonMemberRecipientRepository extends JpaRepository<NonMemberRecipient, Long> {

    List<NonMemberRecipient> findByDistributionEventIdOrderByDistributionNumberAsc(Long distributionEventId);

    Optional<NonMemberRecipient> findByDistributionEventIdAndDistributionNumber(Long distributionEventId, String distributionNumber);

    long countByDistributionEventId(Long distributionEventId);

    void deleteByDistributionEventId(Long distributionEventId);
}
