package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GeneralEventRegistrationAnswer;

@Repository
public interface GeneralEventRegistrationAnswerRepository extends JpaRepository<GeneralEventRegistrationAnswer, Long> {

    List<GeneralEventRegistrationAnswer> findByRegistrationId(Long registrationId);

    List<GeneralEventRegistrationAnswer> findByQuestionId(Long questionId);

    long countByQuestionId(Long questionId);

    long countByQuestionIdAndOptionId(Long questionId, Long optionId);

    @Modifying
    @Query("delete from GeneralEventRegistrationAnswer a where a.question.id = :questionId")
    int deleteByQuestionId(@Param("questionId") Long questionId);

    @Modifying
    @Query("delete from GeneralEventRegistrationAnswer a where a.registration.generalEvent.id = :eventId")
    int deleteByEventId(@Param("eventId") Long eventId);
}
