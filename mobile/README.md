# MemberFlow Mobile

Flutter mobile app for the MemberFlow mosque management system.

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) >= 3.2.0
- Android Studio or Xcode for device emulators
- Backend running on http://localhost:8080/api

## Getting Started

```bash
cd mobile

# Install dependencies
flutter pub get

# Generate localization files
flutter gen-l10n

# Run on Android emulator
flutter run
```

## Architecture

```
lib/
├── main.dart                      # Entry point
├── app.dart                       # MaterialApp.router with theme/localization
├── core/
│   ├── config/api_config.dart     # API base URL, timeouts, storage keys
│   ├── network/
│   │   ├── api_client.dart        # Dio provider + AuthInterceptor
│   │   └── api_exceptions.dart    # ApiException, PageResponse<T>
│   ├── providers/
│   │   └── locale_provider.dart   # EN/NL language switching
│   ├── router/app_router.dart     # GoRouter with auth redirect
│   ├── theme/app_theme.dart       # Material 3 theme (emerald/gold/cream)
│   ├── models/currency.dart       # Currency DTO
│   └── widgets/app_shell.dart     # Bottom navigation shell
├── features/
│   ├── auth/
│   │   ├── models/auth_models.dart
│   │   ├── providers/auth_provider.dart
│   │   └── screens/login_screen.dart
│   ├── dashboard/
│   │   ├── models/dashboard_models.dart
│   │   ├── services/dashboard_service.dart
│   │   └── screens/dashboard_screen.dart
│   ├── members/
│   │   ├── models/member_models.dart
│   │   ├── services/member_service.dart
│   │   └── screens/
│   │       ├── members_screen.dart
│   │       └── member_detail_screen.dart
│   ├── groups/
│   │   ├── models/group_models.dart
│   │   ├── services/group_service.dart
│   │   └── screens/
│   │       ├── groups_screen.dart
│   │       └── group_detail_screen.dart
│   ├── contributions/
│   │   ├── models/contribution_models.dart
│   │   ├── services/contribution_service.dart
│   │   └── screens/contributions_screen.dart
│   ├── profile/
│   │   └── screens/profile_screen.dart
│   └── settings/
│       └── screens/settings_screen.dart
└── l10n/
    ├── app_en.arb                 # English translations
    └── app_nl.arb                 # Dutch translations
```

## Key Libraries

| Package | Purpose |
|---------|---------|
| flutter_riverpod | State management |
| dio | HTTP client |
| go_router | Declarative routing with auth redirect |
| flutter_secure_storage | JWT token storage |
| fl_chart | Dashboard charts |
| shared_preferences | Locale & mosque ID persistence |

## API Connection

- **Android Emulator**: `http://10.0.2.2:8080/api` (maps to host localhost)
- **iOS Simulator**: `http://localhost:8080/api`
- **Physical Device**: Replace with your machine's LAN IP

The API client automatically attaches:
- `Authorization: Bearer <jwt-token>` header
- `X-Mosque-Id: <id>` header for multi-tenancy

## Screens

1. **Login** - Username/password authentication
2. **Dashboard** - Stats cards + contribution chart (fl_chart)
3. **Members** - Paginated list with search, detail view with tabs (Overview, Payments, Assignments)
4. **Groups** - List with member counts, detail view with member roster
5. **Contributions** - Types tab + Payments tab with pagination
6. **Profile** - User info, permissions, change password, sign out
7. **Settings** - Language toggle (EN/NL), app info

## Color Palette

Matches the web frontend:
- **Emerald** `#047857` - Primary color
- **Gold** `#D4AF37` - Accent color
- **Cream** `#FAFAF9` - Background
- **Charcoal** `#1C1917` - Text color
