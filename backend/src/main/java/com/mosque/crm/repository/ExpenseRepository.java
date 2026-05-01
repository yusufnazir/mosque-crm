package com.mosque.crm.repository;

import com.mosque.crm.dto.ExpenseMonthlySummaryDTO;
import com.mosque.crm.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    /**
     * Returns expense totals grouped by calendar month and currency for the given year.
     * Excludes soft-deleted records. Multi-tenancy is enforced via the organizationFilter.
     */
    @Query("SELECT new com.mosque.crm.dto.ExpenseMonthlySummaryDTO(" +
           "  FUNCTION('DATE_FORMAT', e.expenseDate, '%Y-%m')," +
           "  e.currency.code," +
           "  SUM(e.amount)" +
           ") FROM Expense e " +
           "WHERE YEAR(e.expenseDate) = :year AND e.deleted = false " +
           "GROUP BY FUNCTION('DATE_FORMAT', e.expenseDate, '%Y-%m'), e.currency.code " +
           "ORDER BY FUNCTION('DATE_FORMAT', e.expenseDate, '%Y-%m')")
    List<ExpenseMonthlySummaryDTO> findMonthlySummaryByYear(@Param("year") int year);

    @Query("SELECT DISTINCT e FROM Expense e LEFT JOIN e.tags t WHERE " +
           "(:dateFrom IS NULL OR e.expenseDate >= :dateFrom) AND " +
           "(:dateTo IS NULL OR e.expenseDate <= :dateTo) AND " +
           "(:includeDeleted = true OR e.deleted = false) AND " +
           "(:#{#tagIds == null || #tagIds.isEmpty()} = true OR t.id IN :tagIds) " +
           "ORDER BY e.expenseDate DESC, e.createdAt DESC")
    List<Expense> findFiltered(
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo,
            @Param("tagIds") List<Long> tagIds,
            @Param("includeDeleted") boolean includeDeleted
    );
}
