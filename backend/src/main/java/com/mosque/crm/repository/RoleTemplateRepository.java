package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.RoleTemplate;

@Repository
public interface RoleTemplateRepository extends JpaRepository<RoleTemplate, Long> {

    Optional<RoleTemplate> findByName(String name);

    List<RoleTemplate> findByNameIn(List<String> names);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    List<RoleTemplate> findAllByOrderBySortOrderAscNameAsc();

    List<RoleTemplate> findByActiveTrueOrderBySortOrderAscNameAsc();
}
