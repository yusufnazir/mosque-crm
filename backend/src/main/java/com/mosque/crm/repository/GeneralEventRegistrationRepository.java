package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GeneralEventRegistration;
import com.mosque.crm.enums.RegistrantType;
import com.mosque.crm.enums.RsvpStatus;

@Repository
public interface GeneralEventRegistrationRepository extends JpaRepository<GeneralEventRegistration, Long> {

    List<GeneralEventRegistration> findByGeneralEventIdOrderByRegisteredAtDesc(Long generalEventId);

    Optional<GeneralEventRegistration> findByEditToken(String editToken);

    boolean existsByGeneralEventIdAndPersonId(Long generalEventId, Long personId);

    @Query("""
            SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
            FROM GeneralEventRegistration r
            WHERE r.generalEvent.id = :eventId
              AND r.id <> :excludeRegistrationId
              AND r.email IS NOT NULL
              AND LOWER(r.email) = LOWER(:email)
              AND r.rsvpStatus <> com.mosque.crm.enums.RsvpStatus.DECLINED
            """)
    boolean existsActiveByEventIdAndEmailExcluding(@Param("eventId") Long eventId,
            @Param("email") String email, @Param("excludeRegistrationId") Long excludeRegistrationId);

    @Query("""
            SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
            FROM GeneralEventRegistration r
            WHERE r.generalEvent.id = :eventId
              AND r.email IS NOT NULL
              AND LOWER(r.email) = LOWER(:email)
              AND r.rsvpStatus <> com.mosque.crm.enums.RsvpStatus.DECLINED
            """)
    boolean existsActiveByEventIdAndEmail(@Param("eventId") Long eventId, @Param("email") String email);

    long countByGeneralEventIdAndRegistrantTypeAndRsvpStatus(
            Long generalEventId, RegistrantType registrantType, RsvpStatus rsvpStatus);
}
