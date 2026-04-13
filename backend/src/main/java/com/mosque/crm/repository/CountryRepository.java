package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Country;

@Repository
public interface CountryRepository extends JpaRepository<Country, Long> {

    @EntityGraph(attributePaths = "translations")
    List<Country> findAllByOrderBySortOrderAsc();

    @EntityGraph(attributePaths = "translations")
    Optional<Country> findByIsoCode(String isoCode);
}
