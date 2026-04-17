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
     * Note: ORDER BY is in the JPQL because Sort cannot be combined with JOIN FETCH.
     * The Pageable must be passed with Sort.unsorted().
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "ORDER BY mp.person.firstName ASC, mp.periodFrom ASC, mp.contributionType.code ASC",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp")
    Page<MemberPayment> findAllWithDetails(Pageable pageable);

    /**
     * Paginated: all payments filtered by year (based on periodFrom, falling back to paymentDate).
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year " +
           "ORDER BY mp.person.firstName ASC, mp.periodFrom ASC, mp.contributionType.code ASC",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp " +
           "WHERE YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year")
    Page<MemberPayment> findAllByYear(@Param("year") int year, Pageable pageable);

    /**
     * Paginated: payments for a specific person with eager-loaded details.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId " +
           "ORDER BY mp.periodFrom ASC, mp.contributionType.code ASC",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp WHERE mp.person.id = :personId")
    Page<MemberPayment> findByPersonIdWithDetails(@Param("personId") Long personId, Pageable pageable);

    /**
     * Paginated: payments for a specific person filtered by year.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year " +
           "ORDER BY mp.periodFrom ASC, mp.contributionType.code ASC",
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
           "WHERE mp.contributionType.id = :typeId " +
           "ORDER BY mp.person.firstName ASC, mp.periodFrom ASC",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp WHERE mp.contributionType.id = :typeId")
    Page<MemberPayment> findByContributionTypeIdWithDetails(@Param("typeId") Long typeId, Pageable pageable);

    /**
     * Paginated: all payments filtered by contribution type and year.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.contributionType.id = :typeId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year " +
           "ORDER BY mp.person.firstName ASC, mp.periodFrom ASC",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp " +
           "WHERE mp.contributionType.id = :typeId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year")
    Page<MemberPayment> findByContributionTypeIdAndYear(@Param("typeId") Long typeId, @Param("year") int year, Pageable pageable);

    /**
     * Paginated: payments for a specific person and contribution type.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId AND mp.contributionType.id = :typeId " +
           "ORDER BY mp.periodFrom ASC",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp " +
           "WHERE mp.person.id = :personId AND mp.contributionType.id = :typeId")
    Page<MemberPayment> findByPersonIdAndContributionTypeId(@Param("personId") Long personId, @Param("typeId") Long typeId, Pageable pageable);

    /**
     * Paginated: payments for a specific person, contribution type, and year.
     */
    @Query(value = "SELECT mp FROM MemberPayment mp JOIN FETCH mp.person JOIN FETCH mp.contributionType " +
           "WHERE mp.person.id = :personId AND mp.contributionType.id = :typeId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year " +
           "ORDER BY mp.periodFrom ASC",
           countQuery = "SELECT COUNT(mp) FROM MemberPayment mp " +
           "WHERE mp.person.id = :personId AND mp.contributionType.id = :typeId AND YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year")
    Page<MemberPayment> findByPersonIdAndContributionTypeIdAndYear(@Param("personId") Long personId, @Param("typeId") Long typeId, @Param("year") int year, Pageable pageable);

    @Query("SELECT COALESCE(SUM(mp.amount), 0) FROM MemberPayment mp " +
           "WHERE mp.contributionType.id = :typeId " +
           "AND mp.paymentDate BETWEEN :startDate AND :endDate")
    java.math.BigDecimal sumAmountByTypeAndDateRange(@Param("typeId") Long typeId,
                                                      @Param("startDate") LocalDate startDate,
                                                      @Param("endDate") LocalDate endDate);

    /**
     * Check if a reversal already exists for a given original payment.
     */
    @Query("SELECT CASE WHEN COUNT(mp) > 0 THEN true ELSE false END FROM MemberPayment mp WHERE mp.reversedPayment.id = :paymentId")
    boolean existsByReversedPaymentId(@Param("paymentId") Long paymentId);

    /**
     * Sum payment amounts grouped by contribution type for a given year.
     * Uses periodFrom (falling back to paymentDate) to determine the year.
     * Excludes reversal payments so the total reflects net income.
     */
    @Query("SELECT mp.contributionType.code, COALESCE(SUM(mp.amount), 0) " +
           "FROM MemberPayment mp " +
           "WHERE YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year " +
           "AND mp.isReversal = false " +
           "GROUP BY mp.contributionType.code " +
           "ORDER BY mp.contributionType.code")
    List<Object[]> sumAmountByContributionTypeForYear(@Param("year") int year);

    /**
     * Get distinct years that have payments (for the year selector).
     */
    @Query("SELECT DISTINCT YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) " +
           "FROM MemberPayment mp " +
           "ORDER BY YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) DESC")
    List<Integer> findDistinctPaymentYears();

    /**
     * Fetch all non-reversal payments for a given year with person, type, and currency eagerly loaded.
     * Used for the payment summary report.
     */
    @Query("SELECT mp FROM MemberPayment mp " +
           "JOIN FETCH mp.person " +
           "JOIN FETCH mp.contributionType " +
           "LEFT JOIN FETCH mp.currency " +
           "WHERE YEAR(COALESCE(mp.periodFrom, mp.paymentDate)) = :year " +
           "AND mp.isReversal = false " +
           "ORDER BY mp.person.lastName, mp.person.firstName")
    List<MemberPayment> findPaymentsForReport(@Param("year") int year);

    /**
     * Fetch ALL payments (including reversals) with person, type, and currency eagerly loaded.
     * Used for the data export module.
     */
    @Query("SELECT mp FROM MemberPayment mp " +
           "JOIN FETCH mp.person " +
           "JOIN FETCH mp.contributionType " +
           "LEFT JOIN FETCH mp.currency " +
           "ORDER BY mp.person.lastName, mp.person.firstName, mp.paymentDate")
    List<MemberPayment> findAllForExport();
}
