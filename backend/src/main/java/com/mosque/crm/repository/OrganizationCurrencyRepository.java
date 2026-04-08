package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.OrganizationCurrency;

@Repository
public interface OrganizationCurrencyRepository extends JpaRepository<OrganizationCurrency, Long> {

    List<OrganizationCurrency> findByIsActiveTrue();

    Optional<OrganizationCurrency> findByCurrencyId(Long currencyId);

    Optional<OrganizationCurrency> findByIsPrimaryTrue();

    boolean existsByCurrencyId(Long currencyId);
}
