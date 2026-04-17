package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.SavedMemberFilter;

@Repository
public interface SavedMemberFilterRepository extends JpaRepository<SavedMemberFilter, Long> {

    List<SavedMemberFilter> findByCreatedByUserId(Long userId);

    Optional<SavedMemberFilter> findByCreatedByUserIdAndIsDefaultTrue(Long userId);
}
