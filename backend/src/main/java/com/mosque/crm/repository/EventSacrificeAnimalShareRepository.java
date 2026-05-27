package com.mosque.crm.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mosque.crm.entity.EventSacrificeAnimalShare;
import com.mosque.crm.enums.EventKind;

public interface EventSacrificeAnimalShareRepository extends JpaRepository<EventSacrificeAnimalShare, Long> {

    List<EventSacrificeAnimalShare> findByAnimalIdOrderByPersonNameAsc(Long animalId);

    void deleteByAnimalId(Long animalId);

    @Query("SELECT COALESCE(SUM(s.shareCount), 0) FROM EventSacrificeAnimalShare s WHERE s.animal.id = :animalId")
    int sumShareCountByAnimalId(@Param("animalId") Long animalId);

    @Query("SELECT COALESCE(SUM(s.shareCount), 0) FROM EventSacrificeAnimalShare s "
            + "WHERE s.animal.id = :animalId AND s.id <> :excludeShareId")
    int sumShareCountByAnimalIdExcluding(@Param("animalId") Long animalId, @Param("excludeShareId") Long excludeShareId);

    @Query("SELECT COALESCE(SUM(s.meatEntitlementKg), 0) FROM EventSacrificeAnimalShare s WHERE s.animal.id = :animalId")
    BigDecimal sumMeatEntitlementKgByAnimalId(@Param("animalId") Long animalId);

    @Query("SELECT COALESCE(SUM(s.meatEntitlementKg), 0) FROM EventSacrificeAnimalShare s "
            + "WHERE s.animal.eventKind = :eventKind AND s.animal.eventId = :eventId")
    BigDecimal sumMeatEntitlementKgByEvent(
            @Param("eventKind") EventKind eventKind, @Param("eventId") Long eventId);

    @Query("SELECT COALESCE(SUM(s.meatEntitlementKg), 0) FROM EventSacrificeAnimalShare s "
            + "WHERE s.animal.eventKind = :eventKind AND s.animal.eventId = :eventId AND s.entitlementReceived = true")
    BigDecimal sumReceivedMeatEntitlementKgByEvent(
            @Param("eventKind") EventKind eventKind, @Param("eventId") Long eventId);
}
