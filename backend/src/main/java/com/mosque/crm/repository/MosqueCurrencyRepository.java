package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.MosqueCurrency;

@Repository
public interface MosqueCurrencyRepository extends JpaRepository<MosqueCurrency, Long> {

    List<MosqueCurrency> findByIsActiveTrue();

    Optional<MosqueCurrency> findByCurrencyId(Long currencyId);

    Optional<MosqueCurrency> findByIsPrimaryTrue();

    boolean existsByCurrencyId(Long currencyId);
}
