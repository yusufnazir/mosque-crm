package com.mosque.crm.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.ScheduledJobConfig;

@Repository
public interface ScheduledJobConfigRepository extends JpaRepository<ScheduledJobConfig, Long> {

    Optional<ScheduledJobConfig> findByJobKey(String jobKey);
}
