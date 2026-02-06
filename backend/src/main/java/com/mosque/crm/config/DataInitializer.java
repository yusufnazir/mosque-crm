package com.mosque.crm.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;

import com.mosque.crm.repository.MemberRepository;

// Temporarily disabled to debug shutdown issue
//@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private MemberRepository memberRepository;

    @Override
    public void run(String... args) throws Exception {
        // Sample data is now managed by Liquibase migrations
        // See: src/main/resources/db/changelog/
        System.out.println("DataInitializer.run() started");
        System.out.println("Total members in database: " + memberRepository.count());
        System.out.println("\n=== Member Details ===");
//        memberRepository.findAll().forEach(m -> {
//            System.out.println(String.format("ID: %d | Email: %s | Has User: %s",
//                m.getId(), m.getEmail(), m.hasPortalAccess() ? "Yes" : "No"));
//        });
        System.out.println("======================\n");
    }
}
