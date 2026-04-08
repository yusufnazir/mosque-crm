package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.OrganizationSubscription;
import com.mosque.crm.enums.OrganizationSubscriptionStatus;

@Repository
public interface OrganizationSubscriptionRepository extends JpaRepository<OrganizationSubscription, Long> {

    List<OrganizationSubscription> findByOrganizationIdOrderByStartsAtDesc(Long organizationId);

    Optional<OrganizationSubscription> findFirstByOrganizationIdAndStatusInOrderByStartsAtDesc(
            Long organizationId, List<OrganizationSubscriptionStatus> statuses);

        Optional<OrganizationSubscription> findFirstByOrganizationIdAndStatusInAndStartsAtLessThanEqualOrderByStartsAtDesc(
            Long organizationId, List<OrganizationSubscriptionStatus> statuses, LocalDateTime startsAt);

        List<OrganizationSubscription> findByOrganizationIdAndStatusInAndStartsAtGreaterThanOrderByStartsAtAsc(
            Long organizationId, List<OrganizationSubscriptionStatus> statuses, LocalDateTime startsAt);

    List<OrganizationSubscription> findByStatus(OrganizationSubscriptionStatus status);

    List<OrganizationSubscription> findByStatusIn(List<OrganizationSubscriptionStatus> statuses);

    List<OrganizationSubscription> findByOrganizationIdAndStatusIn(
            Long organizationId, List<OrganizationSubscriptionStatus> statuses);
}
