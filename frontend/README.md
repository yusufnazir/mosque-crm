# Mosque CRM Frontend

Modern Next.js frontend for the Mosque Member Management System with elegant, Islamic-inspired design.

## Features

- **Authentication**: Login with role-based access (Admin/Member)
- **Admin Dashboard**: Overview of members, families, and fee collections
- **Member Management**: View all members with search functionality
- **Family Structure**: Display family relationships using GEDCOM-based genealogy system
- **Membership Fees**: Track payments and payment history
- **Member Portal**: Members can view their profile and fee status
- **Elegant Design**: Islamic geometric patterns, deep emerald green, warm gold accents
- **JWT Authentication**: Secure login with role-based access control

## Technologies

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- React Server Components and Client Components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Login Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Member Account:**
- Username: `ahmed`
- Password: `password123`

## Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/          # Login page
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── dashboard/      # Admin dashboard
│   │   ├── members/        # Member management
│   │   ├── fees/           # Fee management
│   │   └── profile/        # Member profile
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects)
│   └── globals.css         # Global styles
├── components/
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── Card.tsx            # Card components
│   └── Button.tsx          # Button component
├── lib/
│   ├── api.ts              # API client and endpoints
│   └── utils.ts            # Utility functions
└── types/
    └── index.ts            # TypeScript types
```

## Design System

### Colors
- **Emerald Green**: `#047857` - Primary color, navigation
- **Warm Gold**: `#D4AF37` - Accents and highlights
- **Soft Cream**: `#FAFAF9` - Background
- **Charcoal**: `#1C1917` - Text

### Typography
- Clean, generous white space
- Geist Sans font family
- Responsive design for all screen sizes

## API Integration

The frontend connects to the Spring Boot backend API:

- Authentication: `/auth/login`
- Members: `/admin/members`, `/member/profile`
- Fees: `/admin/fees`, `/member/fees`

## Building for Production

```bash
npm run build
npm start
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Features by Role

### Admin Features
- Dashboard with statistics
- View and manage all members
- Search members
- View and manage membership fees
- Track overdue payments

### Member Features
- View personal profile
- View partner and children
- View payment history
- Track pending fees

## License

MIT License
