package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Business;

@Repository
public interface BusinessRepository extends JpaRepository<Business, Long> {

    List<Business> findByOrganizationIdOrderByNameAsc(Long organizationId);

    List<Business> findByOrganizationIdAndOwnerPersonIdOrderByNameAsc(Long organizationId, Long ownerPersonId);

    long countByOrganizationId(Long organizationId);
}
