package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Mosque;

@Repository
public interface MosqueRepository extends JpaRepository<Mosque, Long> {

    Optional<Mosque> findByName(String name);

    List<Mosque> findByActiveTrue();

    boolean existsByName(String name);
}
