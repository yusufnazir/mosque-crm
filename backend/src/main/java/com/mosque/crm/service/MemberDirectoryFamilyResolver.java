package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.mosque.crm.entity.GedcomPersonLink;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.gedcom.Family;
import com.mosque.crm.entity.gedcom.FamilyChild;
import com.mosque.crm.repository.FamilyChildRepository;
import com.mosque.crm.repository.FamilyRepository;
import com.mosque.crm.repository.GedcomPersonLinkRepository;

/**
 * Resolves which family each person belongs to for the member directory report.
 * Uses GEDCOM families (from Excel Gezinnen import) first, then shared address.
 */
@Component
public class MemberDirectoryFamilyResolver {

    private final GedcomPersonLinkRepository gedcomPersonLinkRepository;
    private final FamilyRepository familyRepository;
    private final FamilyChildRepository familyChildRepository;

    public MemberDirectoryFamilyResolver(GedcomPersonLinkRepository gedcomPersonLinkRepository,
                                         FamilyRepository familyRepository,
                                         FamilyChildRepository familyChildRepository) {
        this.gedcomPersonLinkRepository = gedcomPersonLinkRepository;
        this.familyRepository = familyRepository;
        this.familyChildRepository = familyChildRepository;
    }

    public Map<Long, FamilyAssignment> resolveAssignments(List<Person> persons) {
        Map<Long, Person> personById = persons.stream()
                .collect(Collectors.toMap(Person::getId, p -> p, (a, b) -> a, LinkedHashMap::new));

        Map<String, Long> individualToPerson = new HashMap<>();
        Map<Long, String> personToIndividual = new HashMap<>();
        for (GedcomPersonLink link : gedcomPersonLinkRepository.findAll()) {
            if (link.getPerson() == null || link.getGedcomIndividual() == null) {
                continue;
            }
            Long personId = link.getPerson().getId();
            String individualId = link.getGedcomIndividual().getId();
            individualToPerson.put(individualId, personId);
            personToIndividual.put(personId, individualId);
        }

        Map<String, Set<Long>> gedcomFamilyMembers = buildGedcomFamilyMembers(individualToPerson);
        Map<String, Set<Long>> primaryGedcomGroups = buildPrimaryGedcomGroups(
                personById.keySet(), personToIndividual, gedcomFamilyMembers);

        Map<Long, FamilyAssignment> assignments = new LinkedHashMap<>();
        Set<Long> assigned = new HashSet<>();

        List<Map.Entry<String, Set<Long>>> sortedGedcomGroups = primaryGedcomGroups.entrySet().stream()
                .sorted(Comparator.comparing(e -> familySortKey(e.getValue(), personById)))
                .toList();

        for (Map.Entry<String, Set<Long>> entry : sortedGedcomGroups) {
            String familyId = entry.getKey();
            Set<Long> memberIds = entry.getValue();
            if (memberIds.isEmpty()) {
                continue;
            }

            String familyNumber = resolveStoredFamilyNumber(memberIds, personById);
            if (familyNumber == null) {
                familyNumber = gedcomFamilyIdToNumber(familyId);
            }

            String groupKey = "GEDCOM:" + familyId;
            String label = buildFamilyLabel(memberIds, personById, familyNumber);
            for (Long personId : memberIds) {
                assignments.put(personId, new FamilyAssignment(groupKey, familyNumber, label));
                assigned.add(personId);
            }
        }

        Map<String, List<Long>> addressGroups = groupUnassignedByAddress(personById, assigned);
        int householdCounter = 1;
        List<Map.Entry<String, List<Long>>> sortedAddressGroups = addressGroups.entrySet().stream()
                .filter(e -> e.getValue().size() >= 2)
                .sorted(Comparator.comparing(e -> familySortKey(new HashSet<>(e.getValue()), personById)))
                .toList();

        for (Map.Entry<String, List<Long>> entry : sortedAddressGroups) {
            Set<Long> memberIds = new HashSet<>(entry.getValue());
            String familyNumber = resolveStoredFamilyNumber(memberIds, personById);
            if (familyNumber == null) {
                familyNumber = "H" + householdCounter++;
            }

            String groupKey = "ADDR:" + entry.getKey();
            String label = buildFamilyLabel(memberIds, personById, familyNumber);
            for (Long personId : memberIds) {
                assignments.put(personId, new FamilyAssignment(groupKey, familyNumber, label));
                assigned.add(personId);
            }
        }

        for (Long personId : personById.keySet()) {
            if (assigned.contains(personId)) {
                continue;
            }
            Person person = personById.get(personId);
            String familyNumber = person.getFamilyNumber();
            String groupKey = "SINGLE:" + personId;
            String label = buildFamilyLabel(Set.of(personId), personById, familyNumber);
            assignments.put(personId, new FamilyAssignment(groupKey, familyNumber, label));
        }

        return assignments;
    }

    private Map<String, Set<Long>> buildGedcomFamilyMembers(Map<String, Long> individualToPerson) {
        Map<String, Set<Long>> familyMembers = new HashMap<>();

        for (Family family : familyRepository.findAll()) {
            Set<Long> members = familyMembers.computeIfAbsent(family.getId(), k -> new HashSet<>());
            addIfPresent(members, individualToPerson.get(family.getHusbandId()));
            addIfPresent(members, individualToPerson.get(family.getWifeId()));
        }

        for (FamilyChild child : familyChildRepository.findAll()) {
            Set<Long> members = familyMembers.computeIfAbsent(child.getFamilyId(), k -> new HashSet<>());
            addIfPresent(members, individualToPerson.get(child.getChildId()));
        }

        familyMembers.entrySet().removeIf(e -> e.getValue().isEmpty());
        return familyMembers;
    }

    private Map<String, Set<Long>> buildPrimaryGedcomGroups(Set<Long> personIds,
                                                             Map<Long, String> personToIndividual,
                                                             Map<String, Set<Long>> gedcomFamilyMembers) {
        Map<Long, String> personPrimaryFamily = new HashMap<>();

        for (Long personId : personIds) {
            List<String> families = gedcomFamilyMembers.entrySet().stream()
                    .filter(e -> e.getValue().contains(personId))
                    .map(Map.Entry::getKey)
                    .sorted()
                    .toList();
            if (families.isEmpty()) {
                continue;
            }
            personPrimaryFamily.put(personId, pickPrimaryFamily(personId, families, personToIndividual));
        }

        Map<String, Set<Long>> groups = new LinkedHashMap<>();
        for (Map.Entry<Long, String> entry : personPrimaryFamily.entrySet()) {
            groups.computeIfAbsent(entry.getValue(), k -> new HashSet<>()).add(entry.getKey());
        }
        return groups;
    }

    private String pickPrimaryFamily(Long personId, List<String> familyIds, Map<Long, String> personToIndividual) {
        String individualId = personToIndividual.get(personId);
        if (individualId != null) {
            for (String familyId : familyIds) {
                Family family = familyRepository.findById(familyId).orElse(null);
                if (family != null
                        && (individualId.equals(family.getHusbandId()) || individualId.equals(family.getWifeId()))) {
                    return familyId;
                }
            }
        }
        return familyIds.get(0);
    }

    private String familySortKey(Set<Long> memberIds, Map<Long, Person> personById) {
        return memberIds.stream()
                .map(personById::get)
                .filter(p -> p != null)
                .map(p -> {
                    String last = p.getLastName() != null ? p.getLastName() : "";
                    String first = p.getFirstName() != null ? p.getFirstName() : "";
                    return (last + " " + first).toLowerCase();
                })
                .sorted()
                .findFirst()
                .orElse("");
    }

    private Map<String, List<Long>> groupUnassignedByAddress(Map<Long, Person> personById, Set<Long> assigned) {
        Map<String, List<Long>> groups = new HashMap<>();
        for (Person person : personById.values()) {
            if (assigned.contains(person.getId())) {
                continue;
            }
            String addressKey = normalizeAddress(person.getAddress());
            if (addressKey == null) {
                continue;
            }
            groups.computeIfAbsent(addressKey, k -> new ArrayList<>()).add(person.getId());
        }
        return groups;
    }

    private String resolveStoredFamilyNumber(Set<Long> memberIds, Map<Long, Person> personById) {
        return memberIds.stream()
                .map(personById::get)
                .filter(p -> p != null && p.getFamilyNumber() != null && !p.getFamilyNumber().isBlank())
                .map(Person::getFamilyNumber)
                .findFirst()
                .orElse(null);
    }

    private String gedcomFamilyIdToNumber(String familyId) {
        if (familyId == null || familyId.isBlank()) {
            return null;
        }
        String stripped = familyId.replace("@", "").trim();
        if (stripped.startsWith("F") && stripped.length() > 1) {
            return stripped.substring(1);
        }
        return stripped;
    }

    private String buildFamilyLabel(Set<Long> memberIds, Map<Long, Person> personById, String familyNumber) {
        String surname = memberIds.stream()
                .map(personById::get)
                .filter(p -> p != null && p.getLastName() != null && !p.getLastName().isBlank())
                .map(Person::getLastName)
                .map(name -> name.split(" - ")[0].trim())
                .findFirst()
                .orElse("");

        String address = memberIds.stream()
                .map(personById::get)
                .filter(p -> p != null && p.getAddress() != null && !p.getAddress().isBlank())
                .map(Person::getAddress)
                .map(String::trim)
                .findFirst()
                .orElse("");

        StringBuilder label = new StringBuilder();
        if (familyNumber != null && !familyNumber.isBlank()) {
            label.append(familyNumber);
        }
        if (!surname.isBlank()) {
            if (!label.isEmpty()) {
                label.append(" — ");
            }
            label.append(surname);
        }
        if (!address.isBlank()) {
            if (!label.isEmpty()) {
                label.append(" (").append(address).append(")");
            } else {
                label.append(address);
            }
        }
        return !label.isEmpty() ? label.toString() : (familyNumber != null ? familyNumber : "");
    }

    private String normalizeAddress(String address) {
        if (address == null || address.isBlank()) {
            return null;
        }
        return address.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private void addIfPresent(Set<Long> members, Long personId) {
        if (personId != null) {
            members.add(personId);
        }
    }

    public record FamilyAssignment(String groupKey, String familyNumber, String familyLabel) {
    }
}
