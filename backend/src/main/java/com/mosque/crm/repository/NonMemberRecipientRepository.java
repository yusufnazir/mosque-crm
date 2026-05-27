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

    /**
     * Highest N-### sequence for the event (survives deletions; avoids duplicate numbers).
     * Implemented in Java for portability across MariaDB and PostgreSQL.
     */
    default int findMaxDistributionSequence(Long eventId) {
        return findByDistributionEventIdOrderByDistributionNumberAsc(eventId).stream()
                .map(NonMemberRecipient::getDistributionNumber)
                .filter(num -> num != null && num.matches("^N-\\d+$"))
                .mapToInt(num -> Integer.parseInt(num.substring(2)))
                .max()
                .orElse(0);
    }
}
