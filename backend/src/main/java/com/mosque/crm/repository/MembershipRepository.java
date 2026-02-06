package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Membership;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.MembershipStatus;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, Long> {

    List<Membership> findByPerson(Person person);

    List<Membership> findByStatus(MembershipStatus status);

    @Query("SELECT m FROM Membership m WHERE m.person = :person AND m.status = 'ACTIVE'")
    Optional<Membership> findActiveMembershipByPerson(Person person);

    @Query("SELECT m FROM Membership m JOIN FETCH m.person p WHERE m.status = 'ACTIVE'")
    List<Membership> findAllActiveWithPerson();

    @Query("SELECT m FROM Membership m JOIN FETCH m.person p WHERE p.id = :personId")
    Optional<Membership> findByPersonId(Long personId);
}
