package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    interface AccountContact {
        String getUsername();
        String getEmail();
        String getPhone();
    }

    @Query("SELECT u.username AS username, u.email AS email, u.phone AS phone FROM User u")
    List<AccountContact> findAccountContacts();

    @Query("SELECT u FROM User u WHERE LOWER(TRIM(u.email)) = LOWER(:email)")
    List<User> findUsersByEmail(@Param("email") String email);

    List<User> findAllByPhone(String phone);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u "
            + "WHERE (:userId IS NULL OR u.id <> :userId) AND "
            + "(LOWER(u.username) = LOWER(:contact) OR LOWER(TRIM(u.email)) = LOWER(:contact) OR u.phone = :contact)")
    boolean existsByLoginContactExcludingUser(@Param("contact") String contact, @Param("userId") Long userId);

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCaseAndOrganizationId(String email, Long organizationId);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE LOWER(u.email) = LOWER(:email) AND u.organizationId = :organizationId")
    boolean existsByEmailIgnoreCaseAndOrganizationId(@Param("email") String email, @Param("organizationId") Long organizationId);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u "
            + "WHERE LOWER(u.username) = LOWER(:username) "
            + "OR u.phone = :username OR (:email IS NOT NULL AND LOWER(TRIM(u.email)) = LOWER(:email))")
    boolean existsByAccountContact(@Param("username") String username, @Param("email") String email);

    /**
     * Users whose account phone or phone-number username ends with the national significant number,
     * e.g. {@code 612345678} matches {@code +31612345678}.
     * Used by {@link com.mosque.crm.service.LoginIdentifierResolver} for national-format logins.
     */
    @Query("SELECT u FROM User u WHERE u.username LIKE CONCAT('+%', :nationalNumber) "
            + "OR u.phone LIKE CONCAT('+%', :nationalNumber)")
    List<User> findPhoneUsersByNationalNumber(@Param("nationalNumber") String nationalNumber);

    long countByOrganizationId(Long organizationId);

    @Query("SELECT DISTINCT u FROM User u JOIN u.roles r "
            + "WHERE ((u.organizationId = :orgId AND r.name = 'ADMIN') "
            + "OR (r.name = 'SUPER_ADMIN' AND (u.selectedOrganizationId = :orgId OR u.organizationId = :orgId))) "
            + "AND u.email IS NOT NULL AND u.email <> ''")
    List<User> findAdminUsersWithEmail(@Param("orgId") Long orgId);

    @Query("SELECT DISTINCT u FROM User u JOIN u.roles r "
            + "WHERE (u.organizationId = :orgId AND r.name = 'ADMIN') "
            + "OR (r.name = 'SUPER_ADMIN' AND (u.selectedOrganizationId = :orgId OR u.organizationId = :orgId))")
    List<User> findAdminUsers(@Param("orgId") Long orgId);
}
