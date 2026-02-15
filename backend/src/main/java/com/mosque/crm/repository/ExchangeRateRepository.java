package com.mosque.crm.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.ExchangeRate;

@Repository
public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {

    List<ExchangeRate> findByOrderByEffectiveDateDesc();

    @Query("SELECT er FROM ExchangeRate er WHERE er.fromCurrency.id = :fromId AND er.toCurrency.id = :toId ORDER BY er.effectiveDate DESC")
    List<ExchangeRate> findByCurrencyPair(@Param("fromId") Long fromCurrencyId, @Param("toId") Long toCurrencyId);

    @Query("SELECT er FROM ExchangeRate er WHERE er.fromCurrency.id = :fromId AND er.toCurrency.id = :toId AND er.effectiveDate <= :date ORDER BY er.effectiveDate DESC")
    Optional<ExchangeRate> findLatestRate(@Param("fromId") Long fromCurrencyId, @Param("toId") Long toCurrencyId, @Param("date") LocalDate date);

    boolean existsByFromCurrencyIdAndToCurrencyIdAndEffectiveDate(Long fromCurrencyId, Long toCurrencyId, LocalDate effectiveDate);
}
