package com.mosque.crm.repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.mosque.crm.dto.MemberFilterCriteria;
import com.mosque.crm.entity.Person;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

/**
 * Factory for JPA Specifications used to filter the Person/members list dynamically.
 */
public final class PersonSpecifications {

    private PersonSpecifications() {
    }

    /**
     * Build a Specification from a MemberFilterCriteria.
     * Combines all non-null criteria with AND logic.
     */
    public static Specification<Person> fromCriteria(MemberFilterCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Status filter
            if (criteria.getStatuses() != null && !criteria.getStatuses().isEmpty()) {
                predicates.add(root.get("status").as(String.class).in(criteria.getStatuses()));
            }

            // Gender filter
            if (criteria.getGender() != null && !criteria.getGender().isBlank()) {
                predicates.add(cb.equal(
                        cb.lower(root.get("gender")),
                        criteria.getGender().toLowerCase()));
            }

            // Age range filter (derived from dateOfBirth)
            if (criteria.getMinAge() != null) {
                // dateOfBirth <= today - minAge years
                LocalDate maxBirth = LocalDate.now().minusYears(criteria.getMinAge());
                predicates.add(cb.lessThanOrEqualTo(root.get("dateOfBirth"), maxBirth));
            }
            if (criteria.getMaxAge() != null) {
                // dateOfBirth >= today - (maxAge+1) years + 1 day
                LocalDate minBirth = LocalDate.now().minusYears(criteria.getMaxAge() + 1L).plusDays(1);
                predicates.add(cb.greaterThanOrEqualTo(root.get("dateOfBirth"), minBirth));
            }

            // Has email filter
            if (Boolean.TRUE.equals(criteria.getHasEmail())) {
                predicates.add(cb.isNotNull(root.get("email")));
                predicates.add(cb.notEqual(root.get("email"), ""));
            } else if (Boolean.FALSE.equals(criteria.getHasEmail())) {
                predicates.add(cb.or(
                        cb.isNull(root.get("email")),
                        cb.equal(root.get("email"), "")));
            }

            // Has phone filter
            if (Boolean.TRUE.equals(criteria.getHasPhone())) {
                predicates.add(cb.isNotNull(root.get("phone")));
                predicates.add(cb.notEqual(root.get("phone"), ""));
            } else if (Boolean.FALSE.equals(criteria.getHasPhone())) {
                predicates.add(cb.or(
                        cb.isNull(root.get("phone")),
                        cb.equal(root.get("phone"), "")));
            }

            // Group membership filter — person must be a member of at least one of the given groups
            if (criteria.getGroupIds() != null && !criteria.getGroupIds().isEmpty()) {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<com.mosque.crm.entity.GroupMember> gmRoot = subquery.from(com.mosque.crm.entity.GroupMember.class);
                subquery.select(gmRoot.get("person").get("id"))
                        .where(
                                gmRoot.get("group").get("id").in(criteria.getGroupIds()),
                                cb.equal(gmRoot.get("person").get("id"), root.get("id")));
                predicates.add(cb.exists(subquery));
            }

            // Date joined (createdAt) range
            if (criteria.getJoinedFrom() != null && !criteria.getJoinedFrom().isBlank()) {
                LocalDate from = LocalDate.parse(criteria.getJoinedFrom());
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("createdAt").as(java.time.LocalDate.class), from));
            }
            if (criteria.getJoinedTo() != null && !criteria.getJoinedTo().isBlank()) {
                LocalDate to = LocalDate.parse(criteria.getJoinedTo());
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("createdAt").as(java.time.LocalDate.class), to));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
