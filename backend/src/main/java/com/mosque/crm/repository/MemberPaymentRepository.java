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

    /**
     * Paginated: all payments with eager-loaded person + type.
     * Sorting is delegated to the Pageable parameter.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp")
    Page<MemberPayment> findAllWithDetails(Pageable pageable);

    /**
     * Paginated: all payments filtered by year (based on periodFrom, falling back to paymentDate).
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp " +
           "WHERE YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year")
    Page<MemberPayment> findAllByYear(@Param("year") int year, Pageable pageable);

    /**
     * Paginated: payments for a specific person with eager-loaded details.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp WHERE mp.person.id = :personId")
    Page<MemberPayment> findByPersonIdWithDetails(@Param("personId") Long personId, Pageable pageable);

    /**
     * Paginated: payments for a specific person filtered by year.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp " +
           "WHERE mp.person.id = :personId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year")
    Page<MemberPayment> findByPersonIdAndYear(@Param("personId") Long personId, @Param("year") int year, Pageable pageable);

    @Query("SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId ORDER BY mp.paymentDate DESC")
    List<MemberPayment> findByPersonIdWithDetailsList(@Param("personId") Long personId);

    /**
     * Paginated: all payments filtered by contribution type.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.contributionType.id = :typeId",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp WHERE mp.contributionType.id = :typeId")
    Page<MemberPayment> findByContributionTypeIdWithDetails(@Param("typeId") Long typeId, Pageable pageable);

    /**
     * Paginated: all payments filtered by contribution type and year.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.contributionType.id = :typeId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp " +
           "WHERE mp.contributionType.id = :typeId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year")
    Page<MemberPayment> findByContributionTypeIdAndYear(@Param("typeId") Long typeId, @Param("year") int year, Pageable pageable);

    /**
     * Paginated: payments for a specific person and contribution type.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId AND mp.contributionType.id = :typeId",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp " +
           "WHERE mp.person.id = :personId AND mp.contributionType.id = :typeId")
    Page<MemberPayment> findByPersonIdAndContributionTypeId(@Param("personId") Long personId, @Param("typeId") Long typeId, Pageable pageable);

    /**
     * Paginated: payments for a specific person, contribution type, and year.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId AND mp.contributionType.id = :typeId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp " +
           "WHERE mp.person.id = :personId AND mp.contributionType.id = :typeId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year")
    Page<MemberPayment> findByPersonIdAndContributionTypeIdAndYear(@Param("personId") Long personId, @Param("typeId") Long typeId, @Param("year") int year, Pageable pageable);

    @Query("SELECT COALESCE(SUM(mp.amount), 0) FROM MemberPayment mp " +
           "WHERE mp.contributionType.id = :typeId " +
           "AND mp.paymentDate BETWEEN :startDate AND :endDate")
    java.math.BigDecimal sumAmountByTypeAndDateRange(@Param("typeId") Long typeId,
                                                      @Param("startDate") LocalDate startDate,
                                                      @Param("endDate") LocalDate endDate);
}
