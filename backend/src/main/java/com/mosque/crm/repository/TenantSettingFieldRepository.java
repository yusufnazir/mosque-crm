package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.TenantSettingField;

public interface TenantSettingFieldRepository extends JpaRepository<TenantSettingField, Long> {

    Optional<TenantSettingField> findByFieldKey(String fieldKey);

    List<TenantSettingField> findByTenantEditableTrue();

    List<TenantSettingField> findAllByOrderByDisplayOrderAsc();

    List<TenantSettingField> findByTenantEditableTrueOrderByDisplayOrderAsc();
}
