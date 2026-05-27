package com.mosque.crm.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mosque.crm.entity.EventSacrificeAnimal;
import com.mosque.crm.enums.EventKind;

public interface EventSacrificeAnimalRepository extends JpaRepository<EventSacrificeAnimal, Long> {

    List<EventSacrificeAnimal> findByEventKindAndEventIdOrderByAnimalNumberAsc(EventKind eventKind, Long eventId);

    Optional<EventSacrificeAnimal> findByEventKindAndEventIdAndAnimalNumber(
            EventKind eventKind, Long eventId, String animalNumber);

    void deleteByEventKindAndEventId(EventKind eventKind, Long eventId);

    @Query("SELECT COALESCE(SUM(a.meatKg), 0) FROM EventSacrificeAnimal a "
            + "WHERE a.eventKind = :eventKind AND a.eventId = :eventId")
    BigDecimal sumMeatKgByEvent(@Param("eventKind") EventKind eventKind, @Param("eventId") Long eventId);
}
