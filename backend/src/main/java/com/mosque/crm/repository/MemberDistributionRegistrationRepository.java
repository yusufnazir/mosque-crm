package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.MemberDistributionRegistration;

@Repository
public interface MemberDistributionRegistrationRepository extends JpaRepository<MemberDistributionRegistration, Long> {

    List<MemberDistributionRegistration> findByDistributionEventIdOrderByRegisteredAtDesc(Long distributionEventId);

    Optional<MemberDistributionRegistration> findByDistributionEventIdAndPersonId(Long distributionEventId, Long personId);

    long countByDistributionEventId(Long distributionEventId);

    void deleteByDistributionEventId(Long distributionEventId);
}
