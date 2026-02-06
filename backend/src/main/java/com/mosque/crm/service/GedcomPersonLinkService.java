package com.mosque.crm.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.GedcomPersonLink;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.gedcom.Individual;
import com.mosque.crm.repository.GedcomPersonLinkRepository;
import com.mosque.crm.repository.IndividualRepository;

@Service
public class GedcomPersonLinkService {

    private final GedcomPersonLinkRepository gedcomPersonLinkRepository;
    private final IndividualRepository individualRepository;

    public GedcomPersonLinkService(GedcomPersonLinkRepository gedcomPersonLinkRepository,
                                   IndividualRepository individualRepository) {
        this.gedcomPersonLinkRepository = gedcomPersonLinkRepository;
        this.individualRepository = individualRepository;
    }

    @Transactional
    public GedcomPersonLink createLink(Person person, Individual individual) {
        // Check if a link already exists for this person
        Optional<GedcomPersonLink> existingLink = gedcomPersonLinkRepository.findByPerson(person);
        if (existingLink.isPresent()) {
            // Update the existing link
            GedcomPersonLink link = existingLink.get();
            link.setGedcomIndividual(individual);
            return gedcomPersonLinkRepository.save(link);
        } else {
            // Create a new link
            GedcomPersonLink link = new GedcomPersonLink(person, individual);
            return gedcomPersonLinkRepository.save(link);
        }
    }

    @Transactional
    public Optional<GedcomPersonLink> findByPerson(Person person) {
        return gedcomPersonLinkRepository.findByPerson(person);
    }

    @Transactional
    public Optional<GedcomPersonLink> findByGedcomIndividual(Individual individual) {
        return gedcomPersonLinkRepository.findByGedcomIndividual(individual);
    }

    @Transactional
    public void removeLinkForPerson(Person person) {
        Optional<GedcomPersonLink> link = gedcomPersonLinkRepository.findByPerson(person);
        link.ifPresent(gedcomPersonLinkRepository::delete);
    }
}