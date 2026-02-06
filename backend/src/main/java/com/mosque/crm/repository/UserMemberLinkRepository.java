package com.mosque.crm.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserMemberLink;

@Repository
public interface UserMemberLinkRepository extends JpaRepository<UserMemberLink, Long> {

    Optional<UserMemberLink> findByUser(User user);

    Optional<UserMemberLink> findByPerson(Person person);

    Optional<UserMemberLink> findByUserId(Long userId);

    Optional<UserMemberLink> findByPersonId(Long personId);
}
