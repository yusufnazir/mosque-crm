package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mosque.crm.dto.ExcelImportResult;
import com.mosque.crm.dto.PersonCreateDTO;
import com.mosque.crm.dto.PersonDTO;
import com.mosque.crm.entity.Membership;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.gedcom.Individual;
import com.mosque.crm.enums.GenderEnum;
import com.mosque.crm.models.PersonAndAge;
import com.mosque.crm.models.RowData;
import com.mosque.crm.repository.FamilyChildRepository;
import com.mosque.crm.repository.FamilyRepository;
import com.mosque.crm.repository.GedcomPersonLinkRepository;
import com.mosque.crm.repository.IndividualRepository;
import com.mosque.crm.repository.MembershipRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.util.HashUtil;
import com.mosque.crm.util.ImportMembersExcelParser;

@Service
public class ExcelImportService {

	private final PersonService personService;
	private final IndividualRepository individualRepository;
	private final FamilyRepository familyRepository;
	private final GedcomPersonLinkRepository gedcomPersonLinkRepository;
	private final FamilyChildRepository familyChildRepository;
	private final MembershipRepository membershipRepository;
	// Add PersonRepository as a dependency
	private final PersonRepository personRepository;

	public ExcelImportService(PersonService personService, IndividualRepository individualRepository,
			FamilyRepository familyRepository, GedcomPersonLinkRepository gedcomPersonLinkRepository,
			FamilyChildRepository familyChildRepository, MembershipRepository membershipRepository,
			PersonRepository personRepository) {
		this.personService = personService;
		this.individualRepository = individualRepository;
		this.familyRepository = familyRepository;
		this.gedcomPersonLinkRepository = gedcomPersonLinkRepository;
		this.familyChildRepository = familyChildRepository;
		this.membershipRepository = membershipRepository;
		this.personRepository = personRepository;
	}

	@Transactional
	public ExcelImportResult importFromExcel(MultipartFile file) {
		int successfullyProcessed = 0;
		int skipped = 0;

		ImportMembersExcelParser parser = new ImportMembersExcelParser();
		ExcelImportResult excelImportResult = parser.parseExcel(file);

		System.out.println("Total records to process: " + excelImportResult.getRows().size());
		// Second pass: process each person and create/update them
		for (RowData rowData : excelImportResult.getRows()) {
			System.out.println("Processing row " + (rowData.getRowNumber() + 1));
			try {
				PersonCreateDTO personDto = rowData.getPersonDto();

				// Check if person already exists by email first, then by name and date of birth
				// if no email
				Optional<Person> existingPersonOpt = Optional.empty();

//					if (personDto.getEmail() != null && !personDto.getEmail().trim().isEmpty()) {
//						// Try to find by email first
//						Optional<PersonDTO> existingPersonDtoOpt = personService.getPersonByEmail(personDto.getEmail());
//						if (existingPersonDtoOpt.isPresent()) {
//							existingPersonOpt = personService.getPersonEntityById(existingPersonDtoOpt.get().getId());
//						}
//					}

				// If not found by email (or no email provided), try to find by name and date of
				// birth
				if (!existingPersonOpt.isPresent() && personDto.getFirstName() != null
						&& !personDto.getFirstName().trim().isEmpty()) {
					// Try to find by exact name and date of birth combination
					Optional<PersonDTO> exactMatchOpt = personService.findPersonByNameAndDateOfBirth(
							personDto.getFirstName(), personDto.getLastName(), personDto.getDateOfBirth());

					if (exactMatchOpt.isPresent()) {
						existingPersonOpt = personService.getPersonEntityById(exactMatchOpt.get().getId());
					}
				}

				Person processedPerson;
				if (existingPersonOpt.isPresent()) {
					// Update existing person
					Person existingPerson = existingPersonOpt.get();
					updateExistingPerson(existingPerson, personDto);
					processedPerson = existingPerson;
					successfullyProcessed++;
				} else {
					// Create new person
					com.mosque.crm.dto.PersonDTO createdPerson = personService.createPerson(personDto);
					// We need to fetch the Person entity to work with it
					Optional<Person> newlyCreatedPerson = personService.getPersonEntityById(createdPerson.getId());
					if (newlyCreatedPerson.isPresent()) {
						processedPerson = newlyCreatedPerson.get();
						successfullyProcessed++;
					} else {
						skipped++;
						continue; // Skip this record if we couldn't get the created person
					}
				}

				// Calculate hash for this person
				String hash = HashUtil.generateHash(personDto);
				// Check for duplicate by hash
				if (personRepository.existsByHash(hash)) {
					excelImportResult.getWarnings().add("Duplicate person skipped (hash): " + hash + " row: " + (rowData.getRowNumber() + 1));
					skipped++;
					continue;
				}

				// Set hash on the person so future imports can detect duplicates
				processedPerson.setHash(hash);

				// Always create a GEDCOM Individual for every imported person
				createOrUpdateGedcomIndividual(processedPerson);

				// Handle family relationships (grouping into families) only when gezinnenId is present
				if (StringUtils.isNotBlank(rowData.getGezinnenId())) {
					// Family creation and role assignment happens in assignFamilyRolesForAllGezinnen
				}

				// Handle membership creation/update based on data in the Excel file
				handleMembershipForImportedPerson(processedPerson, rowData.getPersonDto());
			} catch (Exception e) {
				excelImportResult.getErrors().add(
						"Error processing person from row " + (rowData.getRowNumber() + 1) + ": " + e.getMessage());
				skipped++;
				e.printStackTrace();
			}
		}

		// Third pass: assign family roles based on age and gender within each gezinnen
		assignFamilyRolesForAllGezinnen(excelImportResult.getRows());

		excelImportResult.setSuccessfullyProcessed(successfullyProcessed);
		excelImportResult.setSkipped(skipped);

		return excelImportResult;
	}

	private void updateExistingPerson(Person existingPerson, PersonCreateDTO updatedData) {
		// Update fields from the DTO
		if (updatedData.getFirstName() != null) {
			existingPerson.setFirstName(updatedData.getFirstName());
		}
		if (updatedData.getLastName() != null) {
			existingPerson.setLastName(updatedData.getLastName());
		}
		if (updatedData.getGender() != null) {
			existingPerson.setGender(updatedData.getGender());
		}
		if (updatedData.getDateOfBirth() != null) {
			existingPerson.setDateOfBirth(updatedData.getDateOfBirth());
		}
		if (updatedData.getDateOfDeath() != null) {
			existingPerson.setDateOfDeath(updatedData.getDateOfDeath());
		}
		if (updatedData.getEmail() != null) {
			existingPerson.setEmail(updatedData.getEmail());
		}
		if (updatedData.getPhone() != null) {
			// Extract phone number from formats like "8407043/ +31616255904" to get just
			// the phone part
//			String phoneValue = extractPhoneNumber(updatedData.getPhone());
//			if (phoneValue != null && phoneValue.length() > 20) {
//				phoneValue = phoneValue.substring(0, 20);
//			}
			existingPerson.setPhone(updatedData.getPhone());
		}
		if (updatedData.getAddress() != null) {
			existingPerson.setAddress(updatedData.getAddress());
		}
		if (updatedData.getCity() != null) {
			existingPerson.setCity(updatedData.getCity());
		}
		if (updatedData.getCountry() != null) {
			existingPerson.setCountry(updatedData.getCountry());
		}
		if (updatedData.getPostalCode() != null) {
			existingPerson.setPostalCode(updatedData.getPostalCode());
		}
		if (updatedData.getStatus() != null) {
			existingPerson.setStatus(updatedData.getStatus());
		}

		// Save the updated person
		// Note: We're not calling personRepository.save() here because the transaction
		// will handle persistence automatically due to @Transactional annotation
	}

	private void createOrUpdateFamilyRelationship(Person person, String gezinnenId) {
		// This method handles creating family relationships based on the gezinnenId
		// 1. Check if a GEDCOM Individual exists for this person
		// 2. Create or update the GEDCOM Individual
		// 3. Group all people with the same gezinnenId to determine family structure
		// 4. Assign roles (parent/child) based on age and gender

		if (person != null && gezinnenId != null) {
			// Create or update GEDCOM Individual for this person
			Individual individual = createOrUpdateGedcomIndividual(person);
		}
	}

	private Individual createOrUpdateGedcomIndividual(Person person) {
		// Check if a GEDCOM Individual already exists for this person
		Optional<com.mosque.crm.entity.GedcomPersonLink> existingLink = gedcomPersonLinkRepository.findByPerson(person);

		Individual individual;
		if (existingLink.isPresent()) {
			// Update existing individual
			individual = existingLink.get().getGedcomIndividual();
			individual.setGivenName(person.getFirstName());
			individual.setSurname(person.getLastName());
			individual.setSex(GenderEnum.mapToSexEnum(person.getGender()));
			individual.setBirthDate(person.getDateOfBirth());
			individual = individualRepository.save(individual);
		} else {
			// Check if an Individual already exists with the generated ID (could happen
			// during import)
			String candidateId = generateGedcomId(person.getId());

			// Check if individual already exists in database with this ID
			Optional<Individual> existingIndividual = individualRepository.findById(candidateId);
			if (existingIndividual.isPresent()) {
				// Update the existing individual with new person data
				individual = existingIndividual.get();
				individual.setGivenName(person.getFirstName());
				individual.setSurname(person.getLastName());
				individual.setSex(GenderEnum.mapToSexEnum(person.getGender()));
				individual.setBirthDate(person.getDateOfBirth());
				individual = individualRepository.save(individual);

				// Create the link between Person and Individual
				com.mosque.crm.entity.GedcomPersonLink link = new com.mosque.crm.entity.GedcomPersonLink();
				link.setPerson(person);
				link.setGedcomIndividual(individual);

				gedcomPersonLinkRepository.save(link);
			} else {
				// Create a new GEDCOM Individual for this person
				individual = new Individual();
				individual.setId(candidateId);
				individual.setGivenName(person.getFirstName());
				individual.setSurname(person.getLastName());
				individual.setSex(GenderEnum.mapToSexEnum(person.getGender()));
				individual.setBirthDate(person.getDateOfBirth());

				// Save the individual
				individual = individualRepository.save(individual);

				// Create the link between Person and Individual
				com.mosque.crm.entity.GedcomPersonLink link = new com.mosque.crm.entity.GedcomPersonLink();
				link.setPerson(person);
				link.setGedcomIndividual(individual);

				gedcomPersonLinkRepository.save(link);
			}
		}

		return individual;
	}

	private String generateGedcomId(Long personId) {
		// Generate a GEDCOM ID in the format @Ix@ where x is based on the person ID
		// Use the person ID itself to create a predictable ID
		String idSuffix = personId.toString();
		// Ensure the ID fits within the 20 character limit for the database column
		if (idSuffix.length() > 17) { // Leave room for "@I" and "@" (2 chars) = 18 chars max
			idSuffix = idSuffix.substring(0, 17);
		}
		return "@I" + idSuffix + "@";
	}

	private void handleMembershipForImportedPerson(Person person, PersonCreateDTO personDto) {
		// Check if this person should have a membership based on the imported data
		// Look for membership-related fields in the Excel data (like "Lid vanaf" -
		// member since)

		// For now, we'll create a basic membership if the person doesn't already have
		// one
		List<Membership> existingMemberships = membershipRepository.findByPerson(person);
		if (existingMemberships.isEmpty()) {
			// Create a new membership for this person
			Membership membership = new Membership();
			membership.setPerson(person);
			membership.setMembershipType(com.mosque.crm.enums.MembershipType.FULL); // Default type
			membership.setStartDate(java.time.LocalDate.now()); // Default to current date
			membership.setStatus(com.mosque.crm.enums.MembershipStatus.ACTIVE); // Default to active

			// If there's specific membership data in the personDto, use that instead
			// This would require checking if the DTO has membership-specific fields
			// For now, we'll just create a basic active membership

			membershipRepository.save(membership);
		}
	}

	// Method to assign family roles based on age and gender for all gezinnen
	private void assignFamilyRolesForAllGezinnen(List<RowData> allRows) {
		// Group all rows by gezinnenId
		Map<String, List<RowData>> gezinnenGroups = new HashMap<>();
		for (RowData rowData : allRows) {
			if (StringUtils.isNotBlank(rowData.getGezinnenId())) {
				gezinnenGroups.computeIfAbsent(rowData.getGezinnenId(), k -> new ArrayList<>()).add(rowData);
			}
		}

		// Process each gezinnen group to assign family roles
		for (Map.Entry<String, List<RowData>> entry : gezinnenGroups.entrySet()) {
			String gezinnenId = entry.getKey();
			List<RowData> groupRows = entry.getValue();

			try {
				assignFamilyRolesForGezinnen(gezinnenId, groupRows);
			} catch (Exception e) {
				// Catch any exceptions during family assignment to prevent rollback of the
				// entire import
				System.err.println(
						"Error processing family assignment for gezinnen " + gezinnenId + ": " + e.getMessage());
				e.printStackTrace();
			}
		}
	}

	// Method to assign family roles within a specific gezinnen
	private void assignFamilyRolesForGezinnen(String gezinnenId, List<RowData> groupRows) {
		inferFamilyRelationships(gezinnenId, groupRows);
	}

	// Implements the full inference logic as per copilot-instructions
	private void inferFamilyRelationships(String gezinnenId, List<RowData> groupRows) {
		try {
			// 1. Collect all persons and calculate ages
			List<PersonAndAge> peopleWithAges = new ArrayList<>();
			for (RowData rowData : groupRows) {
				Optional<Person> personOpt = Optional.empty();
				if (StringUtils.isNotBlank(rowData.getPersonDto().getEmail())) {
					Optional<PersonDTO> personDtoOpt = personService
							.getPersonByEmail(rowData.getPersonDto().getEmail());
					if (personDtoOpt.isPresent()) {
						personOpt = personService.getPersonEntityById(personDtoOpt.get().getId());
					}
				}
				if (!personOpt.isPresent() && StringUtils.isNotBlank(rowData.getPersonDto().getFirstName())) {
					Optional<PersonDTO> personDtoOpt = personService.findPersonByNameAndDateOfBirth(
							rowData.getPersonDto().getFirstName(), rowData.getPersonDto().getLastName(),
							rowData.getPersonDto().getDateOfBirth());
					if (personDtoOpt.isPresent()) {
						personOpt = personService.getPersonEntityById(personDtoOpt.get().getId());
					}
				}
				if (personOpt.isPresent()) {
					Person person = personOpt.get();
					Integer age = null;
					if (person.getDateOfBirth() != null) {
						age = java.time.Period.between(person.getDateOfBirth(), java.time.LocalDate.now()).getYears();
					}
					peopleWithAges.add(new PersonAndAge(person, age));
				}
			}
			if (peopleWithAges.size() < 2) {
				System.err.println("[FAMILY INFERENCE] Skipped gezinnenId=" + gezinnenId + ": less than 2 adults");
				return;
			}
			// 2. Sort by age descending
			peopleWithAges.sort((a, b) -> {
				if (a.getAge() == null && b.getAge() == null)
					return 0;
				if (a.getAge() == null)
					return 1;
				if (b.getAge() == null)
					return -1;
				return b.getAge() - a.getAge();
			});
			// 3. Identify parents
			PersonAndAge parent1 = peopleWithAges.get(0);
			PersonAndAge parent2 = peopleWithAges.size() > 1 ? peopleWithAges.get(1) : null;
			final PersonAndAge[] father = { null };
			final PersonAndAge[] mother = { null };
			if (parent1 != null && parent2 != null) {
				String g1 = parent1.getPerson().getGender();
				String g2 = parent2.getPerson().getGender();
				if (isMale(g1) && isFemale(g2)) {
					father[0] = parent1;
					mother[0] = parent2;
				} else if (isFemale(g1) && isMale(g2)) {
					mother[0] = parent1;
					father[0] = parent2;
				} else {
					// Pick eldest male and eldest female
					for (PersonAndAge p : peopleWithAges) {
						if (father[0] == null && isMale(p.getPerson().getGender()))
							father[0] = p;
						if (mother[0] == null && isFemale(p.getPerson().getGender()))
							mother[0] = p;
					}
				}
			}
			if (father[0] == null || mother[0] == null) {
				System.err.println(
						"[FAMILY INFERENCE] Skipped gezinnenId=" + gezinnenId + ": no valid male-female parent pair");
				return;
			}
			// 4. Identify children
			int youngestParentAge = Math.min(father[0].getAge() != null ? father[0].getAge() : Integer.MAX_VALUE,
					mother[0].getAge() != null ? mother[0].getAge() : Integer.MAX_VALUE);
			List<PersonAndAge> children = new ArrayList<>();
			List<PersonAndAge> otherAdults = new ArrayList<>();
			for (PersonAndAge p : peopleWithAges) {
				if (p == father[0] || p == mother[0])
					continue;
				if (p.getAge() != null && (youngestParentAge - p.getAge()) >= 16) {
					children.add(p);
				} else {
					otherAdults.add(p);
				}
			}
			// 5. Create or update family
			String familyId = "@F" + gezinnenId + "@";
			com.mosque.crm.entity.gedcom.Family family;
			Optional<com.mosque.crm.entity.gedcom.Family> existingFamily = familyRepository.findById(familyId);
			if (existingFamily.isPresent()) {
				family = existingFamily.get();
			} else {
				com.mosque.crm.entity.gedcom.Family fam = new com.mosque.crm.entity.gedcom.Family();
				fam.setId(familyId);
				fam.setMarriageDate(java.time.LocalDate.now());
				// Set husband/wife IDs
				Optional<com.mosque.crm.entity.GedcomPersonLink> fLink = gedcomPersonLinkRepository
						.findByPerson(father[0].getPerson());
				Optional<com.mosque.crm.entity.GedcomPersonLink> mLink = gedcomPersonLinkRepository
						.findByPerson(mother[0].getPerson());
				if (fLink.isPresent()) {
					fam.setHusbandId(fLink.get().getGedcomIndividual().getId());
				}
				if (mLink.isPresent()) {
					fam.setWifeId(mLink.get().getGedcomIndividual().getId());
				}
				family = familyRepository.saveAndFlush(fam);
			}
			// 6. Link children to both parents
			for (PersonAndAge child : children) {
				addPersonToFamilyAsChildInferred(child.getPerson(), family);
			}
			// 7. Link other adults as siblings-in-law
			for (PersonAndAge adult : otherAdults) {
				String lastName = adult.getPerson().getLastName();
				boolean matchesMother = lastName != null && mother[0].getPerson().getLastName() != null
						&& lastName.equalsIgnoreCase(mother[0].getPerson().getLastName());
				boolean matchesFather = lastName != null && father[0].getPerson().getLastName() != null
						&& lastName.equalsIgnoreCase(father[0].getPerson().getLastName());
				PersonAndAge linkTo = matchesMother ? mother[0] : (matchesFather ? father[0] : father[0]);
				System.out.println("[FAMILY INFERENCE] Inferred sibling-in-law: " + adult.getPerson().getFirstName()
						+ " linked to " + linkTo.getPerson().getFirstName());
			}
			// 8. Link parents as partners (if not already linked)
			// (Assume handled by Family.husbandId/wifeId)
		} catch (Exception e) {
			System.err.println("[FAMILY INFERENCE] Error gezinnenId=" + gezinnenId + ": " + e.getMessage());
			e.printStackTrace();
		}
	}

	private boolean isMale(String gender) {
		if (gender == null)
			return false;
		String g = gender.trim().toUpperCase();
		return g.equals("M");
	}

	private boolean isFemale(String gender) {
		if (gender == null)
			return false;
		String g = gender.trim().toUpperCase();
		return g.equals("V");
	}

	// Helper method to add a person to a family as a child, with inferred flag
	private void addPersonToFamilyAsChildInferred(Person person, com.mosque.crm.entity.gedcom.Family family) {
		Optional<com.mosque.crm.entity.GedcomPersonLink> personLink = gedcomPersonLinkRepository.findByPerson(person);
		if (personLink.isPresent()) {
			String individualId = personLink.get().getGedcomIndividual().getId();
			boolean alreadyExists = familyChildRepository.existsByFamilyIdAndChildId(family.getId(), individualId);
			if (!alreadyExists) {
				com.mosque.crm.entity.gedcom.FamilyChild familyChild = new com.mosque.crm.entity.gedcom.FamilyChild();
				familyChild.setFamilyId(family.getId());
				familyChild.setChildId(individualId);
				familyChild.setRelationshipType(com.mosque.crm.enums.RelationshipType.BIOLOGICAL);
				familyChildRepository.save(familyChild);
			}
		}
	}

}