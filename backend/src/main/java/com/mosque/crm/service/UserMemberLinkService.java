package com.mosque.crm.service;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserMemberLink;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.UserMemberLinkRepository;
import com.mosque.crm.repository.UserRepository;

@Service
public class UserMemberLinkService {
    private static final Logger log = LoggerFactory.getLogger(UserMemberLinkService.class);

    private final UserMemberLinkRepository userMemberLinkRepository;
    private final UserRepository userRepository;
    private final PersonRepository personRepository;

    public UserMemberLinkService(UserMemberLinkRepository userMemberLinkRepository,
                                 UserRepository userRepository,
                                 PersonRepository personRepository) {
        this.userMemberLinkRepository = userMemberLinkRepository;
        this.userRepository = userRepository;
        this.personRepository = personRepository;
    }

    @Transactional
    public void ensureUserMemberLink(Long userId, Long personId) {
        Optional<UserMemberLink> existing = userMemberLinkRepository.findByUserId(userId);
        if (existing.isPresent()) {
            UserMemberLink link = existing.get();
            if (!link.getPerson().getId().equals(personId)) {
                Person person = personRepository.findById(personId)
                        .orElseThrow(() -> new IllegalArgumentException("Person not found: " + personId));
                link.setPerson(person);
                userMemberLinkRepository.save(link);
                log.info("Updated UserMemberLink for user {} to person {}", userId, personId);
            }
        } else {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
            Person person = personRepository.findById(personId)
                    .orElseThrow(() -> new IllegalArgumentException("Person not found: " + personId));
            UserMemberLink link = new UserMemberLink();
            link.setUser(user);
            link.setPerson(person);
            userMemberLinkRepository.save(link);
            log.info("Created UserMemberLink for user {} and person {}", userId, personId);
        }
    }
}
