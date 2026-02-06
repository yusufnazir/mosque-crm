package com.mosque.crm.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.PersonStatus;

@Repository
public interface PersonRepository extends JpaRepository<Person, Long> {

	Optional<Person> findByEmail(String email);

	/**
	 * Returns a list of gender and count of persons for each gender.
	 */
	@Query("SELECT p.gender, COUNT(p) FROM Person p GROUP BY p.gender")
	List<Object[]> countByGender();

	/**
	 * Returns a list of age bucket label and count of persons in each bucket.
	 * Buckets: 0-12, 13-18, 19-35, 36-60, 60+
	 */
	@Query("SELECT " + "CASE " + " WHEN p.dateOfBirth IS NULL THEN 'Unknown' "
			+ " WHEN TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURRENT_DATE) BETWEEN 0 AND 12 THEN '0-12' "
			+ " WHEN TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURRENT_DATE) BETWEEN 13 AND 18 THEN '13-18' "
			+ " WHEN TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURRENT_DATE) BETWEEN 19 AND 35 THEN '19-35' "
			+ " WHEN TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURRENT_DATE) BETWEEN 36 AND 60 THEN '36-60' "
			+ " ELSE '60+' END, " + "COUNT(p) " + "FROM Person p " + "GROUP BY 1")
	List<Object[]> countByAgeBucket();

	boolean existsByEmail(String email);

	List<Person> findByStatus(PersonStatus status);

	Optional<Person> findByFirstNameAndLastName(@Param("firstName") String firstName,
			@Param("lastName") String lastName);

	@Query("SELECT p FROM Person p WHERE " + "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
			+ "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
			+ "LOWER(p.email) LIKE LOWER(CONCAT('%', :keyword, '%'))")
	List<Person> searchPersons(@Param("keyword") String keyword);

	Optional<Person> findByFirstNameAndLastNameAndDateOfBirth(@Param("firstName") String firstName,
			@Param("lastName") String lastName, @Param("dateOfBirth") LocalDate dateOfBirth);

	@Query("SELECT p FROM Person p WHERE p.status = 'ACTIVE'")
	List<Person> findAllActivePersons();

	@Query("SELECT p FROM Person p " + "LEFT JOIN FETCH p.memberships m " + "WHERE m.status = 'ACTIVE' OR m IS NULL")
	List<Person> findAllWithActiveMemberships();


	/**
	 * Returns a list of age bucket, gender, and count of persons in each bucket by gender.
	 * Buckets: 0-12, 13-18, 19-35, 36-60, 60+
	 */
	@Query("SELECT "
		+ "CASE "
		+ " WHEN p.dateOfBirth IS NULL THEN 'Unknown' "
		+ " WHEN TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURRENT_DATE) BETWEEN 0 AND 12 THEN '0-12' "
		+ " WHEN TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURRENT_DATE) BETWEEN 13 AND 18 THEN '13-18' "
		+ " WHEN TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURRENT_DATE) BETWEEN 19 AND 35 THEN '19-35' "
		+ " WHEN TIMESTAMPDIFF(YEAR, p.dateOfBirth, CURRENT_DATE) BETWEEN 36 AND 60 THEN '36-60' "
		+ " ELSE '60+' END, "
		+ "p.gender, "
		+ "COUNT(p) "
		+ "FROM Person p "
		+ "GROUP BY 1, 2")
	List<Object[]> countByAgeBucketAndGender();

	boolean existsByHash(String hash);

	Optional<Person> findByHash(String hash);

}
