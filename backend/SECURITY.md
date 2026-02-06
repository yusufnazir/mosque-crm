# Security Module Documentation

## Overview

The Mosque CRM uses a **separated security architecture** where authentication/authorization is completely decoupled from member management. This allows:

- **Users can exist independently** - No member profile required (e.g., admin users, staff accounts)
- Members can exist without user accounts (e.g., children, inactive members)
- Optional user-member linking through `user_member_link` table
- Flexible role-based access control (RBAC)
- Clear separation of concerns between security and business logic

## Key Principle: Users ≠ Members

**Users are authentication entities** that can log in to the system. They have:
- Username and password
- Roles (ADMIN, MEMBER, TREASURER, IMAM)
- Account status flags (enabled, locked, etc.)

**Members are business entities** that represent mosque members. They have:
- Contact information (email, phone, address)
- Membership status and fees
- Family relationships via GEDCOM individuals

**Linking is optional:** A user MAY be linked to a member via `user_member_link`, but this is not required. Admin users typically don't have member profiles.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│     users       │         │ user_member_link │         │    members      │
├─────────────────┤         ├──────────────────┤         ├─────────────────┤
│ id              │◄────────│ user_id          │         │ id              │
│ username        │         │ member_id        │────────►│ individualId    │
│ password        │         │ linked_at        │         │ email           │
│ email           │         └──────────────────┘         │ phone           │
│ account_enabled │                                      │ address         │
│ account_locked  │                                      │ membership_     │
│ ...             │                                      │   status        │
└─────────────────┘                                      │ ...             │
        │                                                └─────────────────┘
        │ M:N
        ▼
┌─────────────────┐         ┌──────────────────┐
│   user_roles    │────────►│     roles        │
├─────────────────┤         ├──────────────────┤
│ user_id         │         │ id               │
│ role_id         │         │ name             │
└─────────────────┘         │ description      │
                            └──────────────────┘
```

## Database Schema

### `users` Table
Stores user authentication credentials and account status.

| Column               | Type         | Description                           |
|---------------------|--------------|---------------------------------------|
| id                  | BIGINT       | Primary key                           |
| username            | VARCHAR(50)  | Unique login identifier               |
| password            | VARCHAR(255) | BCrypt hashed password                |
| email               | VARCHAR(100) | User email (optional)                 |
| account_enabled     | BOOLEAN      | Whether account is active             |
| account_locked      | BOOLEAN      | Whether account is locked             |
| credentials_expired | BOOLEAN      | Whether password needs reset          |
| created_at          | TIMESTAMP    | Account creation timestamp            |
| updated_at          | TIMESTAMP    | Last modification timestamp           |
| last_login          | TIMESTAMP    | Last successful login                 |

### `roles` Table
Defines available roles in the system.

| Column      | Type         | Description                    |
|-------------|--------------|--------------------------------|
| id          | BIGINT       | Primary key                    |
| name        | VARCHAR(50)  | Role name (e.g., ADMIN, MEMBER)|
| description | VARCHAR(255) | Role description               |
| created_at  | TIMESTAMP    | Role creation timestamp        |

**Predefined Roles:**
- `ADMIN` - Full system access
- `MEMBER` - Member portal access (view own data)
- `TREASURER` - Financial management access
- `IMAM` - Member viewing access (future use)

### `user_roles` Table
Many-to-many relationship between users and roles.

| Column  | Type   | Description           |
|---------|--------|-----------------------|
| user_id | BIGINT | Foreign key to users  |
| role_id | BIGINT | Foreign key to roles  |

**Composite Primary Key:** (user_id, role_id)

### `user_member_link` Table
**Optional** linking between user accounts and member profiles (one-to-one).

| Column    | Type      | Description                   |
|-----------|-----------|-------------------------------|
| id        | BIGINT    | Primary key                   |
| user_id   | BIGINT    | Foreign key to users (unique) |
| member_id | BIGINT    | Foreign key to members (unique)|
| linked_at | TIMESTAMP | Link creation timestamp       |

**Important:** This table is OPTIONAL. Users can exist without being linked to members. The link is only created when:
- A member needs portal access to view their own data
- An admin wants to associate a staff member with their member profile
- Member registration creates both user account and member profile simultaneously

## Entity Classes

### `User` Entity
```java
@Entity
@Table(name = "users")
public class User {
    private Long id;
    private String username;
    private String password;
    private String email;
    private boolean accountEnabled;
    private boolean accountLocked;
    private boolean credentialsExpired;
    private Set<Role> roles;          // Many-to-many
    private UserMemberLink memberLink; // One-to-one
    
    // Helper method
    public Member getMember() {
        return memberLink != null ? memberLink.getMember() : null;
    }
}
```

### `Role` Entity
```java
@Entity
@Table(name = "roles")
public class Role {
    private Long id;
    private String name;
    private String description;
    private Set<User> users; // Many-to-many (mapped by)
}
```

### `UserMemberLink` Entity
```java
@Entity
@Table(name = "user_member_link")
public class UserMemberLink {
    private Long id;
    private User user;     // One-to-one
    private Member member; // One-to-one
    private LocalDateTime linkedAt;
}
```

### `Member` Entity (Security Fields Removed)
```java
@Entity
@Table(name = "members")
public class Member {
    private Long id;
    private String individualId; // Link to GEDCOM
    private String email;
    private String phone;
    // ... other member fields
    private UserMemberLink userLink; // One-to-one
    
    // Helper methods
    public User getUser() {
        return userLink != null ? userLink.getUser() : null;
    }
    
    public boolean hasPortalAccess() {
        return userLink != null && userLink.getUser() != null;
    }
}
```

## Authentication Flow

### 1. Login Request
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### 2. Authentication Process
1. `AuthController` receives credentials
2. Spring Security `AuthenticationManager` validates credentials
3. `CustomUserDetailsService.loadUserByUsername()` queries `users` table
4. Retrieves user with roles via `UserRepository`
5. Spring Security validates password (BCrypt)
6. `JwtUtil.generateToken()` creates JWT with roles in claims
7. Returns token + user info to client

### 3. Login Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "admin",
  "role": "ADMIN",
  "memberId": null  // null for users without member link (e.g., admin)
}
```

**Note:** `memberId` will be:
- `null` for users not linked to a member (e.g., admin, staff accounts)
- A number (e.g., `1`) for users linked to a member profile
- Frontend should handle both cases gracefully

### 4. Authenticated Requests
Client sends token in header:
```http
GET /admin/members
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

## Authorization

### Security Configuration
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/admin/**").hasAuthority("ADMIN")
                .requestMatchers("/member/**").hasAnyAuthority("ADMIN", "MEMBER")
                .anyRequest().authenticated()
            );
    }
}
```

### Endpoint Protection

| Endpoint Pattern | Required Role(s)  | Description                    |
|------------------|-------------------|--------------------------------|
| `/auth/**`       | None (public)     | Login, registration            |
| `/admin/**`      | `ADMIN`           | Full member/fee management     |
| `/member/**`     | `ADMIN`, `MEMBER` | Member portal (own data only)  |

### JWT Token Filter
`JwtRequestFilter` intercepts every request:
1. Extracts JWT from `Authorization` header
2. Validates token signature and expiration
3. Extracts username and roles from token
4. Loads `UserDetails` and sets authentication in `SecurityContext`
5. Spring Security enforces role-based access on endpoints

## User Management

### Creating a User Account
```java
User user = User.builder()
    .username("john")
    .password(passwordEncoder.encode("password123"))
    .email("john@example.com")
    .accountEnabled(true)
    .accountLocked(false)
    .credentialsExpired(false)
    .roles(Set.of(memberRole))  // Get from RoleRepository
    .build();
userRepository.save(user);
```

### Linking User to Member (Optional)
```java
// Only needed when member requires portal access
// After creating both user and member
UserMemberLink link = UserMemberLink.builder()
    .user(user)
    .member(member)
    .build();
userMemberLinkRepository.save(link);

// Now user.getMember() returns the member
// And member.getUser() returns the user
```

### Assigning Roles
```java
// Fetch role from database
Role adminRole = roleRepository.findByName("ADMIN")
    .orElseThrow(() -> new RuntimeException("Role not found"));

// Add to user's roles
user.getRoles().add(adminRole);
userRepository.save(user);
```

## Member Portal Access (Optional Feature)

### How Members Access Their Data

**Note:** Member portal access requires a user-member link. Users without member links (e.g., admin) cannot access member portal endpoints.

When a member logs in (e.g., `ahmed` / `password123`):

1. Login succeeds, JWT token issued with `MEMBER` role
2. Member accesses `/member/profile`
3. `MemberPortalController.getMyProfile()` executes:
   ```java
   @GetMapping("/profile")
   public ResponseEntity<MemberDTO> getMyProfile(Authentication authentication) {
       String username = authentication.getName(); // "ahmed"
       User user = userRepository.findByUsername(username);
       Member member = user.getMember(); // Via UserMemberLink (may be null!)
       
       if (member == null) {
           return ResponseEntity.status(403).body("No member profile linked");
       }
       
       return ResponseEntity.ok(memberService.getMemberById(member.getId()));
   }
   ```
4. Returns only the logged-in user's member data

### Access Control Rules
- `MEMBER` role can only access their own data (via token username lookup)
- `ADMIN` role can access all data
- Endpoints enforce authorization via `@PreAuthorize` annotations
- Users without member links receive 403 if trying to access member portal

## Password Management

### Password Encoding
All passwords are BCrypt hashed with strength 10:
```java
BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
String hashedPassword = encoder.encode("plaintext");
```

### Initial Users
Created via Liquibase migration files in `dml/` folder:

| Username | Password    | Role   | Linked Member | Purpose                    |
|----------|-------------|--------|---------------|----------------------------|
| admin    | admin123    | ADMIN  | None          | System administrator       |
| ahmed    | password123 | MEMBER | None (future) | Test member account        |

**Current State:** No user-member links exist. Users can log in and access role-based features, but member portal features requiring a member link will return 403.

## Common Operations

### Check if Member Has User Account
```java
Member member = memberRepository.findById(id);
boolean hasAccount = member.hasPortalAccess();
if (hasAccount) {
    User user = member.getUser();
    System.out.println("Username: " + user.getUsername());
}
```

### Get Member from Authenticated User
```java
@GetMapping("/my-data")
public ResponseEntity<?> getMyData(Authentication authentication) {
    String username = authentication.getName();
    User user = userRepository.findByUsername(username)
        .orElseThrow(() -> new RuntimeException("User not found"));
    
    if (user.getMember() == null) {
        return ResponseEntity.badRequest()
            .body("No member profile linked");
    }
    
    return ResponseEntity.ok(user.getMember());
}
```

### Create User for Existing Member
```java
public void createUserForMember(Long memberId, String username, String password) {
    Member member = memberRepository.findById(memberId)
        .orElseThrow(() -> new RuntimeException("Member not found"));
    
    if (member.hasPortalAccess()) {
        throw new RuntimeException("Member already has a user account");
    }
    
    // Create user
    Role memberRole = roleRepository.findByName("MEMBER")
        .orElseThrow(() -> new RuntimeException("MEMBER role not found"));
    
    User user = User.builder()
        .username(username)
        .password(passwordEncoder.encode(password))
        .accountEnabled(true)
        .accountLocked(false)
        .credentialsExpired(false)
        .roles(Set.of(memberRole))
        .build();
    user = userRepository.save(user);
    
    // Create link
    UserMemberLink link = UserMemberLink.builder()
        .user(user)
        .member(member)
        .build();
    userMemberLinkRepository.save(link);
}
```

## Migration Files

The security module is implemented through these Liquibase changesets:

### DDL (Schema)
- `010-create-users-table.xml` - Creates `users` table
- `011-create-roles-table.xml` - Creates `roles` table
- `012-create-user-roles-table.xml` - Creates `user_roles` junction table
- `013-create-user-member-link-table.xml` - Creates `user_member_link` table
- `014-remove-security-from-members-table.xml` - Removes old security columns from `members`

### DML (Data)
- `020-insert-initial-security-data.xml` - Inserts default roles and users

## Security Best Practices

1. **Never store plain-text passwords** - Always use BCrypt
2. **Validate token on every request** - JwtRequestFilter handles this
3. **Use HTTPS in production** - Encrypt token transmission
4. **Rotate JWT secrets regularly** - Update `jwt.secret` in `application.yml`
5. **Implement token expiration** - Current setting: 24 hours (`jwt.expiration`)
6. **Lock accounts after failed attempts** - Consider implementing this
7. **Audit security events** - Log logins, role changes, etc.

## Troubleshooting

### User can't login
1. Check `account_enabled = true` in `users` table
2. Check `account_locked = false`
3. Verify password hash is correct (use BCrypt encoder to test)
4. Check user has at least one role assigned

### 403 Forbidden Error
1. Verify user has correct role for endpoint
2. Check JWT token contains role in claims
3. Verify SecurityConfig has correct role mappings

### Member data not loading in portal
1. Verify `user_member_link` row exists linking user to member
2. Check `member_id` is valid and member exists
3. Ensure `@Transactional` is used where needed to load relationships

## Future Enhancements

- [ ] Password reset functionality
- [ ] Email verification for new accounts
- [ ] Two-factor authentication (2FA)
- [ ] Account lockout after failed login attempts
- [ ] Password complexity requirements
- [ ] Session management (logout, remember me)
- [ ] Audit logging for security events
- [ ] Role hierarchy (e.g., ADMIN inherits MEMBER permissions)
- [ ] Fine-grained permissions (beyond role-based)
- [ ] OAuth2/SSO integration

## References

- **Entities**: `backend/src/main/java/com/mosque/crm/entity/`
- **Repositories**: `backend/src/main/java/com/mosque/crm/repository/`
- **Security Config**: `backend/src/main/java/com/mosque/crm/config/SecurityConfig.java`
- **JWT Utilities**: `backend/src/main/java/com/mosque/crm/security/`
- **Auth Controller**: `backend/src/main/java/com/mosque/crm/controller/AuthController.java`
- **Migrations**: `backend/src/main/resources/db/changelog/changes/ddl/010-014` and `dml/020`
