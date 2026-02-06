package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.gedcom.Family;

@Repository
public interface FamilyRepository extends JpaRepository<Family, String> {

    /**
     * Find all families where the individual is a spouse (husband or wife)
     */
    @Query("SELECT f FROM Family f WHERE f.husbandId = :individualId OR f.wifeId = :individualId")
    List<Family> findFamiliesBySpouse(@Param("individualId") String individualId);

    /**
     * Find family where both husband and wife are specified
     */
    @Query("SELECT f FROM Family f WHERE (f.husbandId = :id1 AND f.wifeId = :id2) OR (f.husbandId = :id2 AND f.wifeId = :id1)")
    List<Family> findFamilyBySpouses(@Param("id1") String id1, @Param("id2") String id2);
}
