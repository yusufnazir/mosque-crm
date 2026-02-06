# Spring Boot Project Setup Guide

## Overview
This document provides a complete, step-by-step guide for setting up any Spring Boot project with:
1. **Independent Security Module** - Authentication & authorization layer
2. **Liquibase Database Management** - Schema (DDL) and Data (DML) patterns
3. **Project Structure** - Best practices for folder organization
4. **Entity Patterns** - Without Lombok to avoid JPA issues
5. **Testing Strategy** - Verify everything works

This guide can be used as a template for any new Spring Boot project. Simply copy the patterns and adapt entity names to your domain.

## Core Principles

### 1. Independence
- Security module operates independently of business entities (members, customers, employees, etc.)
- Users can exist WITHOUT corresponding business entity records
- Authentication works even if business profile doesn't exist
- Optional linking via junction table when business entity needs portal access

### 2. Separation of Concerns
```
┌─────────────────────────────────────┐
│   Security Layer (Authentication)  │  ← Independent
│   - users                          │
│   - roles                          │
│   - user_roles                     │
└─────────────────────────────────────┘
                ↕ (optional link)
┌─────────────────────────────────────┐
│   Business Layer                    │
│   - members / customers / employees │
│   - business-specific tables        │
└─────────────────────────────────────┘
```

### 3. Design Philosophy
- **Users ≠ Business Entities**: Authentication is separate from business profiles
- **Admin users typically have NO business profile**: Admins are for system management
- **Optional Linking**: Use junction table only when business entity needs portal access
- **Graceful Degradation**: System works even if links don't exist

## Database Schema

### 1. Users Table
```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- BCrypt hashed
    email VARCHAR(100),
    account_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    account_locked BOOLEAN NOT NULL DEFAULT FALSE,
    credentials_expired BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    last_login DATETIME,
    INDEX idx_username (username)
);
```

**Purpose**: Core authentication entity. Stores login credentials.

**Key Points**:
- `username`: Unique login identifier
- `password`: **MUST be BCrypt hashed** (use Spring Security's `BCryptPasswordEncoder`)
- Account status flags for security control
- No references to business entities

### 2. Roles Table
```sql
CREATE TABLE roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at DATETIME NOT NULL,
    INDEX idx_name (name)
);
```

**Purpose**: Authorization roles (ADMIN, USER, MANAGER, etc.)

**Standard Roles**:
- `ADMIN`: Full system access
- `USER` or `MEMBER`: Standard user access
- `MANAGER`: Mid-level permissions
- Custom roles as needed

**Important**: Role names should be simple (`ADMIN`), not prefixed (`ROLE_ADMIN`)

### 3. User_Roles Junction Table
```sql
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id)
);
```

**Purpose**: Many-to-many relationship between users and roles

**Design**: Composite primary key prevents duplicate role assignments

### 4. Optional: Business Entity Link Table
```sql
-- Example for member linking (adapt for your business entity)
CREATE TABLE user_member_link (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    member_id BIGINT NOT NULL UNIQUE,
    linked_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
```

**Purpose**: Optional 1:1 link when business entity needs authentication

**When to Use**:
- Member needs access to member portal
- Customer needs to view orders
- Employee needs to submit timesheets

**When NOT to Use**:
- Admin users (they manage, don't need business profile)
- Service accounts
- API keys

## Entity Classes

### User Entity (WITHOUT Lombok)
```java
package com.yourapp.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(length = 100)
    private String email;

    @Column(name = "account_enabled", nullable = false)
    private boolean accountEnabled = true;

    @Column(name = "account_locked", nullable = false)
    private boolean accountLocked = false;

    @Column(name = "credentials_expired", nullable = false)
    private boolean credentialsExpired = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    // Constructors
    public User() {}

    public User(String username, String password, String email) {
        this.username = username;
        this.password = password;
        this.email = email;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isAccountEnabled() { return accountEnabled; }
    public void setAccountEnabled(boolean accountEnabled) { this.accountEnabled = accountEnabled; }

    public boolean isAccountLocked() { return accountLocked; }
    public void setAccountLocked(boolean accountLocked) { this.accountLocked = accountLocked; }

    public boolean isCredentialsExpired() { return credentialsExpired; }
    public void setCredentialsExpired(boolean credentialsExpired) { this.credentialsExpired = credentialsExpired; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getLastLogin() { return lastLogin; }
    public void setLastLogin(LocalDateTime lastLogin) { this.lastLogin = lastLogin; }

    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

**CRITICAL**: Avoid Lombok's `@Builder.Default` on collections - it can interfere with JPA lazy loading

### Role Entity (WITHOUT Lombok)
```java
package com.yourapp.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToMany(mappedBy = "roles")
    private Set<User> users = new HashSet<>();

    // Constructors
    public Role() {}

    public Role(String name, String description) {
        this.name = name;
        this.description = description;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Set<User> getUsers() { return users; }
    public void setUsers(Set<User> users) { this.users = users; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Override
    public String toString() {
        return "Role{id=" + id + ", name='" + name + "'}";
    }
}
```

## Security Configuration

### 1. UserDetailsService Implementation
```java
package com.yourapp.security;

import com.yourapp.entity.User;
import com.yourapp.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .authorities(user.getRoles().stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
                        .collect(Collectors.toList()))
                .accountLocked(user.isAccountLocked())
                .disabled(!user.isAccountEnabled())
                .build();
    }
}
```

### 2. JWT Utility (Optional)
```java
package com.yourapp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret:defaultSecretKey}")
    private String secret;

    @Value("${jwt.expiration:86400000}") // 24 hours
    private Long expiration;

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(SignatureAlgorithm.HS512, secret)
                .compact();
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser().setSigningKey(secret).parseClaimsJws(token).getBody();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
}
```

### 3. Security Configuration Class
```java
package com.yourapp.config;

import com.yourapp.security.CustomUserDetailsService;
import com.yourapp.security.JwtRequestFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtRequestFilter jwtRequestFilter;

    public SecurityConfig(CustomUserDetailsService userDetailsService, JwtRequestFilter jwtRequestFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtRequestFilter = jwtRequestFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors().and()
            .csrf().disable()
            .authorizeHttpRequests()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            .and()
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## Authentication Controller

### DTOs
```java
// LoginRequest.java
package com.yourapp.dto;

public class LoginRequest {
    private String username;
    private String password;

    public LoginRequest() {}

    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

// AuthResponse.java
package com.yourapp.dto;

public class AuthResponse {
    private String token;
    private String username;
    private String role;
    private Long businessEntityId; // Optional: linked business entity ID

    public AuthResponse() {}

    public AuthResponse(String token, String username, String role, Long businessEntityId) {
        this.token = token;
        this.username = username;
        this.role = role;
        this.businessEntityId = businessEntityId;
    }

    // Getters and Setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Long getBusinessEntityId() { return businessEntityId; }
    public void setBusinessEntityId(Long businessEntityId) { this.businessEntityId = businessEntityId; }
}
```

### Controller
```java
package com.yourapp.controller;

import com.yourapp.dto.AuthResponse;
import com.yourapp.dto.LoginRequest;
import com.yourapp.entity.User;
import com.yourapp.repository.UserRepository;
import com.yourapp.security.CustomUserDetailsService;
import com.yourapp.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public AuthController(AuthenticationManager authenticationManager, 
                         CustomUserDetailsService userDetailsService,
                         JwtUtil jwtUtil,
                         UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(loginRequest.getUsername());
        final String token = jwtUtil.generateToken(userDetails);

        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get primary role - handle empty case gracefully
        String roleName = user.getRoles().isEmpty() ? "USER" : 
                         user.getRoles().iterator().next().getName();

        // Get business entity ID if linked (optional)
        Long businessEntityId = null; // Implement based on your linking strategy

        AuthResponse response = new AuthResponse(token, user.getUsername(), roleName, businessEntityId);

        return ResponseEntity.ok(response);
    }
}
```

## Initial Data Setup

### Using Liquibase (Recommended)

#### 1. Roles Data
```xml
<!-- db/changelog/changes/dml/020-data-roles.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                   http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="data_role_admin" author="your-app">
        <customChange class="com.yourapp.liquibase.DataRole">
            <param name="id">1</param>
            <param name="name">ADMIN</param>
            <param name="description">Administrator with full access</param>
        </customChange>
    </changeSet>

    <changeSet id="data_role_user" author="your-app">
        <customChange class="com.yourapp.liquibase.DataRole">
            <param name="id">2</param>
            <param name="name">USER</param>
            <param name="description">Standard user</param>
        </customChange>
    </changeSet>
</databaseChangeLog>
```

#### 2. Admin User
```xml
<!-- db/changelog/changes/dml/021-data-users.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                   http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <!-- Admin user: username=admin, password=admin123 -->
    <changeSet id="data_user_admin" author="your-app">
        <customChange class="com.yourapp.liquibase.DataUser">
            <param name="id">1</param>
            <param name="username">admin</param>
            <!-- BCrypt hash of "admin123" -->
            <param name="password">$2a$10$YourBCryptHashHere</param>
            <param name="email">admin@yourapp.com</param>
            <param name="accountEnabled">true</param>
        </customChange>
    </changeSet>
</databaseChangeLog>
```

**CRITICAL**: Always use BCrypt hashed passwords. Generate with:
```java
BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
String hashed = encoder.encode("admin123");
```

#### 3. User-Role Assignment
```xml
<!-- db/changelog/changes/dml/022-data-user-roles.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                   http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="data_user_role_admin" author="your-app">
        <customChange class="com.yourapp.liquibase.DataUserRole">
            <param name="userId">1</param>
            <param name="roleId">1</param>
        </customChange>
    </changeSet>
</databaseChangeLog>
```

## Common Pitfalls

### 1. ❌ Lombok @Builder.Default on Collections
**Problem**: Interferes with JPA lazy loading
```java
@Builder.Default
private Set<Role> roles = new HashSet<>();  // DON'T DO THIS
```

**Solution**: Use plain initialization
```java
private Set<Role> roles = new HashSet<>();  // DO THIS
```

### 2. ❌ Mixing Authentication with Business Logic
**Problem**: Coupling user authentication to business entities
```java
// DON'T DO THIS
public class Member {
    private String username;
    private String password;
    private String role;
}
```

**Solution**: Separate concerns
```java
// DO THIS - Security Layer
public class User {
    private String username;
    private String password;
    private Set<Role> roles;
}

// Business Layer
public class Member {
    private String firstName;
    private String lastName;
    private String email;
    // NO authentication fields
}
```

### 3. ❌ Storing Plain Text Passwords
**Problem**: Security vulnerability
```sql
INSERT INTO users (username, password) VALUES ('admin', 'admin123');  -- DON'T DO THIS
```

**Solution**: Always BCrypt hash
```sql
-- Use BCryptPasswordEncoder.encode() to generate
INSERT INTO users (username, password) VALUES ('admin', '$2a$10$...');  -- DO THIS
```

### 4. ❌ Requiring Business Entity for Admin
**Problem**: Admin can't login without member/customer record
```java
// DON'T DO THIS
if (user.getMember() == null) {
    throw new Exception("No member profile");
}
```

**Solution**: Make business entity optional
```java
// DO THIS
Long memberId = user.getMember() != null ? user.getMember().getId() : null;
// Frontend handles null gracefully
```

## Testing

### Test Login
```java
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testAdminLogin() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }
}
```

### PowerShell Test Script
```powershell
# test-login.ps1
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"username":"admin","password":"admin123"}'

Write-Host "Role: $($response.role)"
Write-Host "Username: $($response.username)"

if ($response.role -eq "ADMIN") {
    Write-Host "✅ SUCCESS: Admin login works" -ForegroundColor Green
} else {
    Write-Host "❌ FAILURE: Expected ADMIN, got $($response.role)" -ForegroundColor Red
}
```

## Dependencies (pom.xml)

```xml
<dependencies>
    <!-- Spring Boot Security -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- Spring Boot Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Boot JPA -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- JWT -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt</artifactId>
        <version>0.9.1</version>
    </dependency>

    <!-- BCrypt (included in spring-security-crypto) -->
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-crypto</artifactId>
    </dependency>

    <!-- Database Driver (MariaDB example) -->
    <dependency>
        <groupId>org.mariadb.jdbc</groupId>
        <artifactId>mariadb-java-client</artifactId>
    </dependency>

    <!-- Liquibase for Database Migrations -->
    <dependency>
        <groupId>org.liquibase</groupId>
        <artifactId>liquibase-core</artifactId>
    </dependency>
</dependencies>
```

## Application Properties

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:mariadb://localhost:3306/your_db
    username: your_user
    password: your_password
    driver-class-name: org.mariadb.jdbc.Driver
  
  jpa:
    hibernate:
      ddl-auto: none  # Use Liquibase for schema management
    show-sql: true
  
  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.xml
    enabled: true

jwt:
  secret: your-secret-key-change-this-in-production
  expiration: 86400000  # 24 hours in milliseconds

server:
  port: 8080
  servlet:
    context-path: /api
```

---

## Part 2: Liquibase Database Management

### Overview

This project uses **Liquibase with a custom two-tier pattern**:

1. **DDL (Data Definition Language)** - Standard Liquibase XML for schema (CREATE TABLE, ALTER TABLE)
2. **DML (Data Manipulation Language)** - Custom Java classes with UPSERT logic for data (INSERT/UPDATE)

Both patterns use **UUID-based changeset IDs** to enable updates.

### Folder Structure

```
db/changelog/
├── db.changelog-master.xml           # Master file (includes folder changelogs)
└── changes/
    ├── ddl/
    │   ├── db.changelog-ddl.xml      # Consolidates all DDL files
    │   ├── 001-create-users-table.xml
    │   ├── 002-create-roles-table.xml
    │   ├── 003-create-user-roles-table.xml
    │   └── ...
    └── dml/
        ├── db.changelog-dml.xml      # Consolidates all DML files  
        ├── 020-data-roles.xml
        ├── 021-data-users.xml
        ├── 022-data-user-roles.xml
        └── ...
```

**CRITICAL RULE**: The master changelog should ONLY reference folder consolidation files, never individual changesets.

### Master Changelog Pattern

**File**: `db/changelog/db.changelog-master.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <!-- DDL Changes (Schema) -->
    <include file="db/changelog/changes/ddl/db.changelog-ddl.xml"/>

    <!-- DML Changes (Data) -->
    <include file="db/changelog/changes/dml/db.changelog-dml.xml"/>

</databaseChangeLog>
```

### DDL Folder Consolidation

**File**: `db/changelog/changes/ddl/db.changelog-ddl.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <!-- Security Tables -->
    <include file="db/changelog/changes/ddl/001-create-users-table.xml"/>
    <include file="db/changelog/changes/ddl/002-create-roles-table.xml"/>
    <include file="db/changelog/changes/ddl/003-create-user-roles-table.xml"/>
    
    <!-- Business Tables -->
    <include file="db/changelog/changes/ddl/010-create-members-table.xml"/>
    <include file="db/changelog/changes/ddl/011-create-fees-table.xml"/>

</databaseChangeLog>
```

### DML Folder Consolidation

**File**: `db/changelog/changes/dml/db.changelog-dml.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http/www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <!-- Security Data -->
    <include file="db/changelog/changes/dml/020-data-roles.xml"/>
    <include file="db/changelog/changes/dml/021-data-users.xml"/>
    <include file="db/changelog/changes/dml/022-data-user-roles.xml"/>

</databaseChangeLog>
```

---

### DDL Pattern: Creating Tables

**Purpose**: Define database schema - tables, columns, constraints, indexes.

**File Naming**: `NNN-create-tablename-table.xml` (e.g., `001-create-users-table.xml`)

**Template**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="550e8400-e29b-41d4-a716-446655440000" author="your-app">
        <preConditions onFail="MARK_RAN">
            <not>
                <tableExists tableName="users"/>
            </not>
        </preConditions>
        
        <createTable tableName="users">
            <!-- Primary Key (Auto-increment) -->
            <column name="id" type="BIGINT" autoIncrement="true">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            
            <!-- Required Fields -->
            <column name="username" type="VARCHAR(50)">
                <constraints nullable="false" unique="true"/>
            </column>
            
            <column name="password" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            
            <!-- Optional Fields -->
            <column name="email" type="VARCHAR(100)"/>
            
            <!-- Boolean with Default -->
            <column name="account_enabled" type="BOOLEAN" defaultValueBoolean="true">
                <constraints nullable="false"/>
            </column>
            
            <!-- Timestamps -->
            <column name="created_at" type="TIMESTAMP" 
                    defaultValueComputed="CURRENT_TIMESTAMP">
                <constraints nullable="false"/>
            </column>
            
            <column name="updated_at" type="TIMESTAMP" 
                    defaultValueComputed="CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP">
                <constraints nullable="false"/>
            </column>
        </createTable>
        
        <!-- Indexes -->
        <createIndex tableName="users" indexName="idx_users_username">
            <column name="username"/>
        </createIndex>
    </changeSet>

</databaseChangeLog>
```

**DDL Key Rules**:
- ✅ Use UUID for changeset ID (generate once, never change)
- ✅ Add `<preConditions>` with `onFail="MARK_RAN"` 
- ✅ Use `autoIncrement="true"` for primary key
- ✅ Add indexes for foreign keys and frequently queried columns
- ✅ Include `created_at` and `updated_at` timestamps
- ❌ Don't change DDL after deployment to production
- ❌ Don't forget `nullable="false"` for required fields

**Data Types**:
- `BIGINT` - For IDs and large numbers
- `VARCHAR(n)` - Text with max length
- `TEXT` - Long text
- `BOOLEAN` - true/false flags
- `DATE` - Date only (YYYY-MM-DD)
- `TIMESTAMP` - Date + time
- `BLOB` - Binary data

---

### DML Pattern: Custom Java UPSERT

**Purpose**: Insert/update seed data, reference data, test data with automatic UPSERT logic.

**File Naming**: 
- `NNN-data-entityname.xml` (e.g., `020-data-roles.xml`)
- **RULE**: One file per entity/table (don't bundle multiple entities)

**Why Custom Java?**
Standard Liquibase doesn't support UPSERT. Our pattern:
1. Check if record exists (by primary key)
2. If exists → UPDATE
3. If not → INSERT
4. Use UUID changeset IDs to enable updates

#### Step 1: Create Base Class (Copy Once)

**File**: `src/main/java/com/yourapp/liquibase/CustomDataTaskChange.java`

```java
package com.yourapp.liquibase;

import liquibase.change.custom.CustomTaskChange;
import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;
import liquibase.exception.DatabaseException;
import liquibase.exception.SetupException;
import liquibase.exception.ValidationErrors;
import liquibase.resource.ResourceAccessor;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;

public abstract class CustomDataTaskChange implements CustomTaskChange {

    protected JdbcConnection connection;

    @Override
    public void execute(Database database) throws CustomChangeException {
        connection = (JdbcConnection) database.getConnection();
        try {
            handleUpdate();
            connection.commit();
        } catch (DatabaseException | SQLException e) {
            throw new CustomChangeException("Failed to execute data change", e);
        }
    }

    // Subclasses implement this
    public abstract void handleUpdate() throws DatabaseException, SQLException;

    // Null-safe parameter binding
    protected void setData(PreparedStatement ps, int index, Object value) throws SQLException {
        if (value == null) {
            ps.setNull(index, java.sql.Types.NULL);
        } else if (value instanceof String) {
            String str = (String) value;
            ps.setString(index, str.trim().isEmpty() ? null : str.trim());
        } else if (value instanceof Long) {
            ps.setLong(index, (Long) value);
        } else if (value instanceof Boolean) {
            ps.setBoolean(index, (Boolean) value);
        } else if (value instanceof LocalDate) {
            ps.setDate(index, java.sql.Date.valueOf((LocalDate) value));
        } else if (value instanceof LocalDateTime) {
            ps.setTimestamp(index, java.sql.Timestamp.valueOf((LocalDateTime) value));
        } else if (value instanceof byte[]) {
            ps.setBytes(index, (byte[]) value);
        } else {
            ps.setObject(index, value);
        }
    }

    @Override
    public String getConfirmationMessage() {
        return "Data update completed";
    }

    @Override
    public void setUp() throws SetupException {}

    @Override
    public void setFileOpener(ResourceAccessor resourceAccessor) {}

    @Override
    public ValidationErrors validate(Database database) {
        return null;
    }
}
```

#### Step 2: Create Entity Data Class

**File**: `src/main/java/com/yourapp/liquibase/DataRole.java`

```java
package com.yourapp.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import liquibase.exception.DatabaseException;

public class DataRole extends CustomDataTaskChange {
    
    // Properties for each table column
    private String id;
    private String name;
    private String description;
    
    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        // 1. Check if record exists
        String query = "SELECT id FROM roles WHERE id=?";
        boolean exists = false;
        
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, toLong(id));
            try (ResultSet rs = ps.executeQuery()) {
                exists = rs.next();
            }
        }
        
        // 2. Update if exists
        if (exists) {
            String update = "UPDATE roles SET name=?, description=? WHERE id=?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, name);
                setData(ps, 2, description);
                setData(ps, 3, toLong(id));
                ps.executeUpdate();
            }
        } 
        // 3. Insert if not exists
        else {
            String insert = "INSERT INTO roles(id, name, description, created_at) VALUES(?,?,?,NOW())";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, toLong(id));
                setData(ps, 2, name);
                setData(ps, 3, description);
                ps.executeUpdate();
            }
        }
    }
    
    // Helper: Convert String to Long
    private Long toLong(String value) {
        return (value == null || value.trim().isEmpty()) ? null : Long.parseLong(value.trim());
    }
    
    // Getters and Setters (REQUIRED for Liquibase param binding)
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
```

**Pattern for Other Helpers**:
```java
private Boolean toBoolean(String value) {
    if (value == null || value.trim().isEmpty()) return null;
    return Boolean.parseBoolean(value.trim());
}

private LocalDate toLocalDate(String value) {
    if (value == null || value.trim().isEmpty()) return null;
    return LocalDate.parse(value.trim());
}
```

#### Step 3: Create Liquibase XML

**File**: `db/changelog/changes/dml/020-data-roles.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.4.xsd">

    <changeSet id="data_role_admin" author="your-app">
        <customChange class="com.yourapp.liquibase.DataRole">
            <param name="id"><![CDATA[1]]></param>
            <param name="name"><![CDATA[ADMIN]]></param>
            <param name="description"><![CDATA[Administrator with full access]]></param>
        </customChange>
    </changeSet>

    <changeSet id="data_role_user" author="your-app">
        <customChange class="com.yourapp.liquibase.DataRole">
            <param name="id"><![CDATA[2]]></param>
            <param name="name"><![CDATA[USER]]></param>
            <param name="description"><![CDATA[Standard user access]]></param>
        </customChange>
    </changeSet>

</databaseChangeLog>
```

**XML Key Rules**:
- ✅ Use `<![CDATA[...]]>` for all param values (avoids XML escaping)
- ✅ Empty `<![CDATA[]]>` for null values
- ✅ One changeset per record
- ✅ Descriptive changeset IDs initially (`data_role_admin`, `data_role_user`)

#### Step 4: Updating Existing Data

**When you need to update data** (e.g., change role description):

1. Generate a new UUID for the changeset ID
2. Keep the same record `id` param
3. Change the data you want to update

**Example**:
```xml
<!-- Original -->
<changeSet id="data_role_admin" author="your-app">
    <customChange class="com.yourapp.liquibase.DataRole">
        <param name="id"><![CDATA[1]]></param>
        <param name="name"><![CDATA[ADMIN]]></param>
        <param name="description"><![CDATA[Admin access]]></param>
    </customChange>
</changeSet>

<!-- To update description, change changeset ID to UUID -->
<changeSet id="550e8400-e29b-41d4-a716-446655440001" author="your-app">
    <customChange class="com.yourapp.liquibase.DataRole">
        <param name="id"><![CDATA[1]]></param>
        <param name="name"><![CDATA[ADMIN]]></param>
        <param name="description"><![CDATA[Administrator with full system access]]></param>
    </customChange>
</changeSet>
```

Liquibase sees this as a new changeset, runs it, and the Java class updates the existing record because `id=1` already exists.

### Junction Table Pattern

For many-to-many relationships (e.g., user_roles), use simple UPSERT without UPDATE:

```java
public class DataUserRole extends CustomDataTaskChange {
    private String userId;
    private String roleId;

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        // Check if link exists
        String query = "SELECT user_id FROM user_roles WHERE user_id=? AND role_id=?";
        boolean exists = false;
        
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, toLong(userId));
            setData(ps, 2, toLong(roleId));
            try (ResultSet rs = ps.executeQuery()) {
                exists = rs.next();
            }
        }
        
        // Only insert if doesn't exist (no update needed for junction table)
        if (!exists) {
            String insert = "INSERT INTO user_roles(user_id, role_id) VALUES(?,?)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, toLong(userId));
                setData(ps, 2, toLong(roleId));
                ps.executeUpdate();
            }
        }
    }
    
    private Long toLong(String value) {
        return (value == null || value.trim().isEmpty()) ? null : Long.parseLong(value.trim());
    }
    
    // Getters and Setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getRoleId() { return roleId; }
    public void setRoleId(String roleId) { this.roleId = roleId; }
}
```

---

## Checklist for New Project

- [ ] Create `users`, `roles`, `user_roles` tables (DDL)
- [ ] Create User and Role entities **WITHOUT** `@Builder.Default`
- [ ] Create UserRepository and RoleRepository
- [ ] Implement CustomUserDetailsService
- [ ] Create JwtUtil (if using JWT)
- [ ] Configure SecurityConfig with BCryptPasswordEncoder
- [ ] Create AuthController with login endpoint
- [ ] Add initial roles data (ADMIN, USER) via Liquibase
- [ ] Add admin user with BCrypt hashed password via Liquibase
- [ ] Assign ADMIN role to admin user via Liquibase
- [ ] Test login endpoint (PowerShell or Postman)
- [ ] Verify role is returned correctly ("ADMIN", not "MEMBER")
- [ ] Document login credentials in README.md

## Summary

**Key Takeaways**:
1. **Security is independent**: Users ≠ Business entities
2. **Admin has no business profile**: That's normal and expected
3. **Optional linking**: Use junction table only when needed
4. **No Lombok @Builder.Default**: Causes JPA collection issues
5. **Always BCrypt passwords**: Never store plain text
6. **Simple role names**: "ADMIN", not "ROLE_ADMIN"
7. **Test early**: Verify login before building business logic

This module can be copy-pasted into any Spring Boot project and adapted by changing entity names (User → Account, Member → Customer, etc.).
