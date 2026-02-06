package com.mosque.crm;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.mosque.crm.entity.Role;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.RoleRepository;
import com.mosque.crm.repository.UserRepository;

@SpringBootTest
public class RoleDebugTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Test
    public void debugRoles() {
        System.out.println("\n========== DEBUG: Users and Roles ==========");

        // Check all roles
        List<Role> roles = roleRepository.findAll();
        System.out.println("\n--- All Roles in Database ---");
        roles.forEach(role -> {
            System.out.println("ID: " + role.getId() + ", Name: " + role.getName());
        });

        // Check all users
        List<User> users = userRepository.findAll();
        System.out.println("\n--- All Users in Database ---");
        users.forEach(user -> {
            System.out.println("ID: " + user.getId() + ", Username: " + user.getUsername() + ", Roles: " + user.getRoles().size());
            user.getRoles().forEach(role -> {
                System.out.println("  -> Role: " + role.getName());
            });
        });

        // Check admin user specifically
        System.out.println("\n--- Admin User Details ---");
        userRepository.findByUsername("admin").ifPresent(admin -> {
            System.out.println("Admin User ID: " + admin.getId());
            System.out.println("Admin Roles Count: " + admin.getRoles().size());
            if (admin.getRoles().isEmpty()) {
                System.out.println("❌ ERROR: Admin user has NO ROLES!");
            } else {
                admin.getRoles().forEach(role -> {
                    System.out.println("✅ Admin has role: " + role.getName());
                });
            }
        });

        System.out.println("\n========================================\n");
    }
}
