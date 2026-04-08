package com.mosque.crm.multitenancy;

import org.hibernate.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import jakarta.persistence.EntityManagerFactory;

/**
 * Custom JPA transaction manager that enables the Hibernate "organizationFilter"
 * at the start of every transaction.
 *
 * This is necessary because the TenantInterceptor (which runs at MVC level)
 * enables the filter on the OpenEntityManagerInView session, but
 * {@code @Transactional} service methods may use a DIFFERENT Hibernate Session.
 * By enabling the filter in {@code doBegin()}, we guarantee the filter is
 * active on the exact session used by the transactional code.
 */
public class TenantAwareJpaTransactionManager extends JpaTransactionManager {

    private static final Logger log = LoggerFactory.getLogger(TenantAwareJpaTransactionManager.class);

    public TenantAwareJpaTransactionManager(EntityManagerFactory emf) {
        super(emf);
    }

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
        super.doBegin(transaction, definition);

        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId != null) {
            EntityManagerHolder emHolder = (EntityManagerHolder)
                    TransactionSynchronizationManager.getResource(obtainEntityManagerFactory());
            if (emHolder != null) {
                try {
                    Session session = emHolder.getEntityManager().unwrap(Session.class);
                    session.enableFilter("organizationFilter").setParameter("organizationId", organizationId);
                    log.debug("Enabled organizationFilter for organization_id={} on transactional session", organizationId);
                } catch (Exception e) {
                    log.error("CRITICAL: Failed to enable organizationFilter on transactional session for organization_id={}: {}",
                            organizationId, e.getMessage(), e);
                    throw new RuntimeException("Tenant isolation failure: unable to enable data filter", e);
                }
            }
        }
    }
}
