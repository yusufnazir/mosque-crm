import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';
import '../../features/auth/providers/auth_provider.dart';

/// Global key to access the AppShell scaffold (for opening drawer from child screens).
final appShellScaffoldKey = GlobalKey<ScaffoldState>();

/// Main app shell with bottom navigation bar and admin drawer.
class AppShell extends ConsumerWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/members')) return 1;
    if (location.startsWith('/groups')) return 2;
    if (location.startsWith('/contributions')) return 3;
    if (location.startsWith('/profile') || location.startsWith('/settings')) {
      return 4;
    }
    return 0;
  }

  void _onTap(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/members');
        break;
      case 2:
        context.go('/groups');
        break;
      case 3:
        context.go('/contributions');
        break;
      case 4:
        context.go('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final isAdmin = user?.isAdmin ?? false;

    return Scaffold(
      key: appShellScaffoldKey,
      drawer: _buildDrawer(context, ref, user, isAdmin),
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex(context),
        onTap: (index) => _onTap(context, index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.emerald,
        unselectedItemColor: AppColors.stone400,
        backgroundColor: Colors.white,
        selectedFontSize: 12,
        unselectedFontSize: 12,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outlined),
            activeIcon: Icon(Icons.people),
            label: 'Members',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.groups_outlined),
            activeIcon: Icon(Icons.groups),
            label: 'Groups',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.payments_outlined),
            activeIcon: Icon(Icons.payments),
            label: 'Finance',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outlined),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, WidgetRef ref, dynamic user, bool isAdmin) {
    bool _hasPermission(String perm) {
      return user?.hasPermission(perm) ?? false;
    }

    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.emerald,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    child: Text(
                      user?.username.isNotEmpty == true
                          ? user.username[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                        fontSize: 24,
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.username ?? 'User',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    user?.roles.join(', ') ?? '',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // Navigation items
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  // Core navigation
                  _DrawerItem(
                    icon: Icons.dashboard,
                    title: 'Dashboard',
                    onTap: () {
                      Navigator.pop(context);
                      context.go('/dashboard');
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.people,
                    title: 'Members',
                    onTap: () {
                      Navigator.pop(context);
                      context.go('/members');
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.groups,
                    title: 'Groups',
                    onTap: () {
                      Navigator.pop(context);
                      context.go('/groups');
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.payments,
                    title: 'Contributions',
                    onTap: () {
                      Navigator.pop(context);
                      context.go('/contributions');
                    },
                  ),

                  const Divider(),
                  const _SectionHeader('Reports & Data'),

                  if (_hasPermission('finance.view') || isAdmin)
                    _DrawerItem(
                      icon: Icons.bar_chart,
                      title: 'Reports',
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/reports');
                      },
                    ),

                  if (_hasPermission('import.manage') || isAdmin)
                    _DrawerItem(
                      icon: Icons.upload_file,
                      title: 'Import',
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/import');
                      },
                    ),

                  if (isAdmin) ...[
                    const Divider(),
                    const _SectionHeader('Administration'),

                    _DrawerItem(
                      icon: Icons.manage_accounts,
                      title: 'Users',
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/users');
                      },
                    ),
                    _DrawerItem(
                      icon: Icons.security,
                      title: 'Roles & Permissions',
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/roles');
                      },
                    ),
                    _DrawerItem(
                      icon: Icons.currency_exchange,
                      title: 'Currencies',
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/currencies');
                      },
                    ),
                    _DrawerItem(
                      icon: Icons.mosque,
                      title: 'Mosques',
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/mosques');
                      },
                    ),
                  ],

                  const Divider(),

                  _DrawerItem(
                    icon: Icons.account_circle,
                    title: 'Account',
                    onTap: () {
                      Navigator.pop(context);
                      context.push('/account');
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.settings,
                    title: 'Settings',
                    onTap: () {
                      Navigator.pop(context);
                      context.push('/settings');
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: 22, color: AppColors.stone600),
      title: Text(title, style: const TextStyle(fontSize: 14)),
      dense: true,
      onTap: onTap,
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.stone400,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
