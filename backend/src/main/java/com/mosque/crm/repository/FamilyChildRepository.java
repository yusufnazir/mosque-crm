package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.gedcom.FamilyChild;

@Repository
public interface FamilyChildRepository extends JpaRepository<FamilyChild, Long> {

	/**
	 * Returns a list of familyId and count of children for each family, including families with zero children.
	 * Uses LEFT JOIN to include all families.
	 */
	@Query("SELECT f.id, COUNT(fc.childId) FROM Family f LEFT JOIN FamilyChild fc ON f.id = fc.familyId GROUP BY f.id")
	List<Object[]> countChildrenByFamilyIncludingZero();

	/**
	 * Find all families where the individual is a child
	 */
	List<FamilyChild> findByChildId(String childId);

	/**
	 * Find all children of a family
	 */
	List<FamilyChild> findByFamilyId(String familyId);

	/**
	 * Check if a child already exists in a family
	 */
	boolean existsByFamilyIdAndChildId(String familyId, String childId);

	/**
	 * Find specific family-child relationship
	 */
	Optional<FamilyChild> findByFamilyIdAndChildId(String familyId, String childId);
}
