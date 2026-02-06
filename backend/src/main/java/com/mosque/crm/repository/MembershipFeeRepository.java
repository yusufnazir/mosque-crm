package com.mosque.crm.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.MembershipFee;

@Repository
public interface MembershipFeeRepository extends JpaRepository<MembershipFee, Long> {

    List<MembershipFee> findByMemberId(Long memberId);

    List<MembershipFee> findByMemberIdAndStatus(Long memberId, MembershipFee.PaymentStatus status);

    List<MembershipFee> findByStatus(MembershipFee.PaymentStatus status);

    List<MembershipFee> findByDueDateBetween(LocalDate startDate, LocalDate endDate);

    @Query("SELECT SUM(f.amount) FROM MembershipFee f WHERE f.status = 'PAID' AND f.paidDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalCollectedBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT f FROM MembershipFee f WHERE f.status = 'OVERDUE' OR (f.status = 'PENDING' AND f.dueDate < CURRENT_DATE)")
    List<MembershipFee> findOverdueFees();

    /**
     * Returns realized income (sum of PAID fees) per month for the given year.
     * Result: Object[]{Integer month, BigDecimal sum}
     */
    @Query("SELECT MONTH(f.paidDate) as month, SUM(f.amount) as realized " +
           "FROM MembershipFee f " +
           "WHERE f.status = 'PAID' AND YEAR(f.paidDate) = :year " +
           "GROUP BY MONTH(f.paidDate) ORDER BY month")
    List<Object[]> getMonthlyRealizedIncome(@Param("year") int year);
}
