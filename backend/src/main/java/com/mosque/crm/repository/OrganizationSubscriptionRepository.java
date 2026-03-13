package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.OrganizationSubscription;
import com.mosque.crm.enums.OrganizationSubscriptionStatus;

@Repository
public interface OrganizationSubscriptionRepository extends JpaRepository<OrganizationSubscription, Long> {

    List<OrganizationSubscription> findByMosqueIdOrderByStartsAtDesc(Long mosqueId);

    Optional<OrganizationSubscription> findFirstByMosqueIdAndStatusInOrderByStartsAtDesc(
            Long mosqueId, List<OrganizationSubscriptionStatus> statuses);

    List<OrganizationSubscription> findByStatus(OrganizationSubscriptionStatus status);
}
