package com.mosque.crm.repository;

import com.mosque.crm.entity.ExpenseTag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExpenseTagRepository extends JpaRepository<ExpenseTag, Long> {

    List<ExpenseTag> findByOrganizationIdOrderByNameAsc(Long organizationId);

    Optional<ExpenseTag> findByOrganizationIdAndName(Long organizationId, String name);
}
