package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Member;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByEmail(String email);

    Optional<Member> findByIndividualId(String individualId);

    boolean existsByEmail(String email);

    List<Member> findByMembershipStatus(Member.MembershipStatus status);

    // Note: Cannot search by firstName/lastName as they're now in Individual entity
    // Search only by Member-specific fields
    @Query("SELECT m FROM Member m WHERE " +
           "LOWER(m.email) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Member> searchMembers(@Param("keyword") String keyword);
}
