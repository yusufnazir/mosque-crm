# Mosque CRM - Member Management System

A comprehensive mosque member management system with elegant Islamic-inspired design, built with Next.js and Spring Boot.

## 🕌 Overview

This full-stack application helps mosques manage their members, track family relationships, and handle membership fee payments with an elegant, serene interface inspired by Islamic geometric patterns.

## ✨ Features

### Admin Features
- **Dashboard**: Overview of members, families, and fee collections with statistics
- **Member Management**: Add, edit, view all members with search functionality
- **Family Structure**: Link partners and children to primary members
- **Membership Fees**: Track payments, due dates, overdue fees, and payment history
- **Payment Tracking**: Mark payments as paid, view transaction references

### Member Portal Features
- **Profile View**: Members can view their own information
- **Family View**: See partner and children details
- **Fee Status**: View payment history and pending fees
- **Secure Access**: JWT-based authentication with role-based access control

## 🎨 Design Language

- **Colors**: Deep emerald green (#047857), warm gold (#D4AF37), soft cream (#FAFAF9), charcoal text (#1C1917)
- **Aesthetic**: Clean, elegant design inspired by Islamic geometric patterns
- **Typography**: Generous white space with smooth transitions
- **Responsive**: Works beautifully on desktop and mobile devices

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State**: React Client Components with local state

### Backend
- **Framework**: Spring Boot 3.2.1
- **Language**: Java 17
- **Database**: MariaDB (development), PostgreSQL (production)
- **Authentication**: JWT with Spring Security
- **API**: RESTful endpoints with role-based access
- **Security Architecture**: Separated security layer - users exist independently of member profiles
- **Genealogy Module**: GEDCOM 5.5.1 compliant family tree system with relationship-centric modeling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Java 17+
- Maven 3.6+

### Quick Start

1. **Clone the repository**
```bash
cd mosque-crm
```

2. **Start the Backend**
```bash
cd backend
mvn spring-boot:run
```
Backend will run on `http://localhost:8080/api`

3. **Start the Frontend** (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on `http://localhost:3000`

4. **Login**
- Admin: `admin` / `admin123`
- Member: `ahmed` / `password123`

## 📁 Project Structure

```
mosque-crm/
├── backend/
│   ├── src/main/java/com/mosque/crm/
│   │   ├── entity/          # JPA entities (Member, MembershipFee)
│   │   ├── repository/      # Spring Data repositories
│   │   ├── service/         # Business logic
│   │   ├── controller/      # REST API endpoints
│   │   ├── security/        # JWT and authentication
│   │   └── config/          # Configuration and initializer
│   └── pom.xml
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/    # Login page
│   │   └── (dashboard)/     # Protected routes
│   ├── components/          # Reusable UI components
│   ├── lib/                 # API client and utilities
│   └── types/               # TypeScript types
└── .github/
    └── copilot-instructions.md
```

## 🔒 Security

- JWT-based authentication
- Role-based access control (Admin, Member)
- Bcrypt password encryption
- CORS configuration
- Secure endpoints with Spring Security

## 📊 Database Schema

### Member Entity
- Personal information (name, email, phone, address)
- Date of birth and gender
- Membership status (Active, Inactive, Suspended)
- Family relationships (partner, parent, children)
- Authentication credentials (username, password, role)

### MembershipFee Entity
- Amount and currency
- Due date and paid date
- Payment status (Pending, Paid, Overdue, Cancelled)
- Payment method and transaction reference
- Associated member

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token

### Admin Endpoints
- `GET /api/admin/members` - Get all members
- `GET /api/admin/members/{id}` - Get member by ID
- `POST /api/admin/members` - Create new member
- `PUT /api/admin/members/{id}` - Update member
- `DELETE /api/admin/members/{id}` - Delete member
- `GET /api/admin/fees` - Get all fees
- `GET /api/admin/fees/overdue` - Get overdue fees
- `POST /api/admin/fees` - Create new fee

### Member Portal Endpoints
- `GET /api/member/profile` - Get logged-in member's profile
- `GET /api/member/fees` - Get logged-in member's fees

## 🧪 Sample Data

The application comes with pre-loaded sample data:
- 1 Admin user
- 1 Primary member (Ahmed Khan) with portal access
- 1 Partner (Fatima Khan)
- 2 Children (Hassan and Aisha)
- 2 Membership fees (1 paid, 1 pending)

## 🛠️ Technology Stack

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- React 18

### Backend
- Spring Boot 3.2.1
- Spring Security
- Spring Data JPA
- JWT (jsonwebtoken)
- H2 Database
- Lombok
- Maven

## 📝 Configuration

### Backend (`application.yml`)
```yaml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:h2:mem:mosquedb
jwt:
  secret: your-secret-key
  expiration: 86400000
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

## 🎯 Future Enhancements

- Event management for mosque activities
- Prayer time notifications
- Donation tracking
- Email notifications for overdue fees
- Bulk import/export of members
- Advanced reporting and analytics
- Mobile app (React Native)

## 📄 License

MIT License - feel free to use this project for your mosque or organization.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for the Muslim community
