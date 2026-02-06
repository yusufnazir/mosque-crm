package com.mosque.crm.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.gedcom.Individual;

@Repository
public interface IndividualRepository extends JpaRepository<Individual, String> {
}
