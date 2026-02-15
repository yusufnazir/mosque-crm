package com.mosque.crm.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.MemberPayment;

@Repository
public interface MemberPaymentRepository extends JpaRepository<MemberPayment, Long> {

    List<MemberPayment> findByPersonId(Long personId);

    List<MemberPayment> findByContributionTypeId(Long contributionTypeId);

    Page<MemberPayment> findByPersonId(Long personId, Pageable pageable);

    Page<MemberPayment> findByContributionTypeId(Long contributionTypeId, Pageable pageable);

    @Query("SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.paymentDate BETWEEN :startDate AND :endDate ORDER BY mp.paymentDate DESC")
    List<MemberPayment> findByPaymentDateBetween(@Param("startDate") LocalDate startDate,
                                                  @Param("endDate") LocalDate endDate);

    @Query("SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "ORDER BY mp.paymentDate DESC")
    Page<MemberPayment> findAllWithDetails(Pageable pageable);

    @Query("SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId ORDER BY mp.paymentDate DESC")
    List<MemberPayment> findByPersonIdWithDetails(@Param("personId") Long personId);

    @Query("SELECT COALESCE(SUM(mp.amount), 0) FROM MemberPayment mp " +
           "WHERE mp.contributionType.id = :typeId " +
           "AND mp.paymentDate BETWEEN :startDate AND :endDate")
    java.math.BigDecimal sumAmountByTypeAndDateRange(@Param("typeId") Long typeId,
                                                      @Param("startDate") LocalDate startDate,
                                                      @Param("endDate") LocalDate endDate);
}
