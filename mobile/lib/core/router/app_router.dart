import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/members/screens/member_detail_screen.dart';
import '../../features/members/screens/member_edit_screen.dart';
import '../../features/members/screens/member_add_screen.dart';
import '../../features/members/screens/members_screen.dart';
import '../../features/groups/screens/groups_screen.dart';
import '../../features/groups/screens/group_detail_screen.dart';
import '../../features/contributions/screens/contributions_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/account/screens/account_screen.dart';
import '../../features/admin/screens/users_screen.dart';
import '../../features/admin/screens/roles_screen.dart';
import '../../features/admin/screens/privileges_screen.dart';
import '../../features/currencies/screens/currencies_screen.dart';
import '../../features/reports/screens/reports_screen.dart';
import '../../features/mosques/screens/mosques_screen.dart';
import '../../features/import/screens/import_screen.dart';
import '../widgets/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  final rootNavigatorKey = GlobalKey<NavigatorState>();
  final shellNavigatorKey = GlobalKey<NavigatorState>();

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/dashboard',
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      final isLoginRoute = state.matchedLocation == '/login';

      // While loading, don't redirect
      if (isLoading) return null;

      // Not authenticated → go to login
      if (!isAuthenticated && !isLoginRoute) return '/login';

      // Authenticated but on login → go to dashboard
      if (isAuthenticated && isLoginRoute) return '/dashboard';

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        navigatorKey: shellNavigatorKey,
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: DashboardScreen(),
            ),
          ),
          GoRoute(
            path: '/members',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: MembersScreen(),
            ),
            routes: [
              GoRoute(
                path: 'add',
                builder: (context, state) => const MemberAddScreen(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = int.parse(state.pathParameters['id']!);
                  return MemberDetailScreen(memberId: id);
                },
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) {
                      final id = int.parse(state.pathParameters['id']!);
                      return MemberEditScreen(memberId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: '/groups',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: GroupsScreen(),
            ),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = int.parse(state.pathParameters['id']!);
                  return GroupDetailScreen(groupId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/contributions',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ContributionsScreen(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
          GoRoute(
            path: '/settings',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SettingsScreen(),
            ),
          ),
          GoRoute(
            path: '/account',
            builder: (context, state) => const AccountScreen(),
          ),
          GoRoute(
            path: '/users',
            builder: (context, state) => const UsersScreen(),
          ),
          GoRoute(
            path: '/roles',
            builder: (context, state) => const RolesScreen(),
          ),
          GoRoute(
            path: '/privileges',
            builder: (context, state) => const PrivilegesScreen(),
          ),
          GoRoute(
            path: '/currencies',
            builder: (context, state) => const CurrenciesScreen(),
          ),
          GoRoute(
            path: '/reports',
            builder: (context, state) => const ReportsScreen(),
          ),
          GoRoute(
            path: '/mosques',
            builder: (context, state) => const MosquesScreen(),
          ),
          GoRoute(
            path: '/import',
            builder: (context, state) => const ImportScreen(),
          ),
        ],
      ),
    ],
  );
});
