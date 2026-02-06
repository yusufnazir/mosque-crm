# Mosque CRM Backend

Backend API for the Mosque Member Management System built with Spring Boot.

## Features

- **Authentication & Authorization**: JWT-based authentication with separated security layer
  - See [SECURITY.md](SECURITY.md) for detailed security architecture documentation
- **Member Management**: Full CRUD operations for managing mosque members and family relationships
- **Family Structure**: Link partners and children to primary members via GEDCOM genealogy
- **Membership Fees**: Track payments, due dates, and payment history
- **Member Portal**: Members can view their own family and fee status
- **Role-Based Access Control**: ADMIN, MEMBER, TREASURER, IMAM roles
- **Separated Security Architecture**: Users exist independently of member profiles with optional linking

## Technologies

- Spring Boot 3.2.1
- Java 17
- Spring Data JPA
- Spring Security with JWT
- MariaDB Database
- Maven
- Liquibase (with custom data task changes - see [LIQUIBASE.md](LIQUIBASE.md))
- GEDCOM 5.5.1 genealogy module
- FreeMarker templates for emails

## Prerequisites

- Java 17 or higher
- Maven 3.6+

## Getting Started

### 1. Clone the repository

```bash
cd backend
```

### 2. Run the application

**Using project-local JDK and Maven (recommended):**
```powershell
$env:JAVA_HOME="D:\Workspaces\CURSOR01\mosque-crm\.jdk\jdk-17.0.16" ; d:\Workspaces\CURSOR01\mosque-crm\.maven\maven-3.9.12\bin\mvn.cmd spring-boot:run
```

**Or if you have Maven configured globally:**
```bash
mvn spring-boot:run
```

The application will start on `http://localhost:8080/api`

### 3. Database Configuration

The application uses MariaDB database configured in `src/main/resources/application.yml`:

- Host: `localhost:3307` (default)
- Database: `mcrm` (created automatically)
- Username: `mcrm`
- Password: `mcrm`
- Connection URL: `jdbc:mariadb://localhost:3307/mcrm?createDatabaseIfNotExist=true&useSSL=false&useJDBCCompliantTimezoneShift=true&useLegacyDatetimeCode=false&nullCatalogMeansCurrent=true`

## Default Accounts

After the application starts, sample data is automatically initialized:

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Member Account:**
- Username: `ahmed`
- Password: `password123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token

### Admin Endpoints (Admin Only)
- `GET /api/admin/members` - Get all members
- `GET /api/admin/members/{id}` - Get member by ID
- `GET /api/admin/members/primary` - Get primary members only
- `GET /api/admin/members/search?keyword=xxx` - Search members
- `POST /api/admin/members` - Create new member
- `PUT /api/admin/members/{id}` - Update member
- `DELETE /api/admin/members/{id}` - Delete member

### Membership Fees (Admin Only)
- `GET /api/admin/fees` - Get all fees
- `GET /api/admin/fees/{id}` - Get fee by ID
- `GET /api/admin/fees/member/{memberId}` - Get fees by member
- `GET /api/admin/fees/overdue` - Get overdue fees
- `POST /api/admin/fees` - Create new fee
- `PUT /api/admin/fees/{id}` - Update fee
- `DELETE /api/admin/fees/{id}` - Delete fee

### Member Portal (Member & Admin)
- `GET /api/member/profile` - Get logged-in member's profile
- `GET /api/member/fees` - Get logged-in member's fees

## Authentication

All API requests (except `/api/auth/login`) require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

### Security Layer (Separated from Member Management)
- **users** table: Authentication credentials (username, password, email)
- **roles** table: System roles (ADMIN, MEMBER, TREASURER, IMAM)
- **user_roles** table: Junction table linking users to roles
- **user_member_link** table: Optional linking between users and members

### Member Management
- **members** table: Personal information (email, phone, address, membership status)
- **MembershipFee** table: Amount, due date, payment status, payment method, transaction reference

### GEDCOM Genealogy Module
- **gedcom_individuals** table: Individual genealogy records (no direct relationship fields)
- **gedcom_families** table: Family units connecting individuals (husband, wife)
- **gedcom_family_children** table: Child-to-family relationships (supporting biological, adopted, foster)
- **gedcom_events** table: Life events (birth, death, marriage, etc.)
- **gedcom_event_participants** table: Event-to-individual links

## Configuration

Edit `src/main/resources/application.yml` for:
- Database connection
- JWT secret and expiration
- CORS settings
- Server port

## Building for Production

```bash
mvn clean package
```

The JAR file will be created in `target/mosque-crm-backend-1.0.0.jar`

Run the JAR:
```bash
java -jar target/mosque-crm-backend-1.0.0.jar
```

## Testing

Run tests:
```bash
mvn test
```

## License

MIT License
