package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mosque.crm.entity.DistributionRegistration;
import com.mosque.crm.enums.RegistrationFulfillmentMode;
import com.mosque.crm.enums.RegistrationStatus;

public interface DistributionRegistrationRepository extends JpaRepository<DistributionRegistration, Long> {

    List<DistributionRegistration> findByDistributionEventIdOrderByRegisteredAtDesc(Long eventId);

    List<DistributionRegistration> findByRegistrationTypeIdOrderByDisplayNameAsc(Long registrationTypeId);

    Optional<DistributionRegistration> findByDistributionEventIdAndPersonId(Long eventId, Long personId);

    boolean existsByDistributionEventIdAndPersonIdIsNullAndDisplayNameIgnoreCase(Long eventId, String displayName);

    long countByDistributionEventId(Long eventId);

    long countByRegistrationTypeId(Long registrationTypeId);

    void deleteByDistributionEventId(Long eventId);

    @Query("SELECT COALESCE(SUM(r.distributedParcelCount), 0) FROM DistributionRegistration r "
            + "WHERE r.distributionEvent.id = :eventId")
    int sumDistributedParcelCountByEventId(@Param("eventId") Long eventId);

    @Query("SELECT r FROM DistributionRegistration r JOIN r.registrationType t "
            + "WHERE r.distributionEvent.id = :eventId AND t.fulfillmentMode = :mode "
            + "AND r.status = :status ORDER BY t.sortOrder ASC, r.displayName ASC")
    List<DistributionRegistration> findQueueEligible(
            @Param("eventId") Long eventId,
            @Param("mode") RegistrationFulfillmentMode mode,
            @Param("status") RegistrationStatus status);

    default int findMaxDistributionSequence(Long eventId) {
        return findByDistributionEventIdOrderByRegisteredAtDesc(eventId).stream()
                .map(DistributionRegistration::getDistributionNumber)
                .filter(num -> num != null && num.matches("^R-\\d+$"))
                .mapToInt(num -> Integer.parseInt(num.substring(2)))
                .max()
                .orElse(0);
    }
}
