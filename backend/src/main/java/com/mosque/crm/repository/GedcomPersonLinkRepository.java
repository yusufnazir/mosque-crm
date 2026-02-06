package com.mosque.crm.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GedcomPersonLink;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.gedcom.Individual;


@Repository
public interface GedcomPersonLinkRepository extends JpaRepository<GedcomPersonLink, Long> {

    Optional<GedcomPersonLink> findByPerson(Person person);

    Optional<GedcomPersonLink> findByGedcomIndividual(Individual gedcomIndividual);

    boolean existsByPerson(Person person);

    boolean existsByGedcomIndividual(Individual gedcomIndividual);
}
