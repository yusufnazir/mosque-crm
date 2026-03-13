import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../models/user_models.dart';
import '../services/user_service.dart';
import '../../auth/providers/auth_provider.dart';

/// Admin users management screen.
class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});

  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  List<AppUser> _users = [];
  List<AppRole> _roles = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final service = ref.read(userServiceProvider);
      final results = await Future.wait([
        service.getUsers(),
        service.getRoles(),
      ]);
      if (mounted) {
        setState(() {
          _users = results[0] as List<AppUser>;
          _roles = results[1] as List<AppRole>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  List<AppUser> get _filteredUsers {
    if (_searchQuery.isEmpty) return _users;
    final q = _searchQuery.toLowerCase();
    return _users.where((u) {
      return u.username.toLowerCase().contains(q) ||
          (u.email?.toLowerCase().contains(q) ?? false) ||
          u.roles.any((r) => r.toLowerCase().contains(q));
    }).toList();
  }

  void _showUserForm({AppUser? user}) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    final usernameCtrl = TextEditingController(text: user?.username ?? '');
    final passwordCtrl = TextEditingController();
    final emailCtrl = TextEditingController(text: user?.email ?? '');
    final selectedRoles = <String>{...?user?.roles};
    bool enabled = user?.enabled ?? true;
    bool isEdit = user != null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(ctx).size.height * 0.85,
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius:
                BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.stone300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  isEdit ? (isDutch ? 'Gebruiker bewerken' : 'Edit User') : (isDutch ? 'Gebruiker aanmaken' : 'Create User'),
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                // Username
                TextFormField(
                  controller: usernameCtrl,
                  decoration:
                      InputDecoration(labelText: isDutch ? 'Gebruikersnaam *' : 'Username *'),
                  readOnly: isEdit,
                  enabled: !isEdit,
                ),
                const SizedBox(height: 12),
                // Password
                TextFormField(
                  controller: passwordCtrl,
                  decoration: InputDecoration(
                    labelText: isEdit
                        ? (isDutch ? 'Wachtwoord (leeg laten om te behouden)' : 'Password (leave blank to keep)')
                        : (isDutch ? 'Wachtwoord *' : 'Password *'),
                  ),
                  obscureText: true,
                ),
                const SizedBox(height: 12),
                // Email
                TextFormField(
                  controller: emailCtrl,
                  decoration: InputDecoration(labelText: isDutch ? 'E-mail' : 'Email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                // Roles
                Text(isDutch ? 'Rollen' : 'Roles',
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                ..._roles
                    .where((r) => r.name != 'SUPER_ADMIN')
                    .map((role) => CheckboxListTile(
                          value: selectedRoles.contains(role.name),
                          title: Text(role.name),
                          subtitle: role.description != null
                              ? Text(role.description!,
                                  style: const TextStyle(fontSize: 12))
                              : null,
                          onChanged: (v) {
                            setSheetState(() {
                              if (v == true) {
                                selectedRoles.add(role.name);
                              } else {
                                selectedRoles.remove(role.name);
                              }
                            });
                          },
                          dense: true,
                          controlAffinity:
                              ListTileControlAffinity.leading,
                          activeColor: AppColors.emerald,
                        )),
                if (isEdit)
                  ...[
                  const SizedBox(height: 8),
                  SwitchListTile(
                    value: enabled,
                    title: Text(isDutch ? 'Account ingeschakeld' : 'Account Enabled'),
                    activeColor: AppColors.emerald,
                    onChanged: (v) =>
                        setSheetState(() => enabled = v),
                  ),
                ],
                const SizedBox(height: 20),
                // Save button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (usernameCtrl.text.trim().isEmpty) return;
                      if (!isEdit && passwordCtrl.text.isEmpty) return;
                      try {
                        final service = ref.read(userServiceProvider);
                        final data = <String, dynamic>{
                          'username': usernameCtrl.text.trim(),
                          'email': emailCtrl.text.trim().isEmpty
                              ? null
                              : emailCtrl.text.trim(),
                          'roles': selectedRoles.toList(),
                        };
                        if (passwordCtrl.text.isNotEmpty) {
                          data['password'] = passwordCtrl.text;
                        }
                        if (isEdit) {
                          data['enabled'] = enabled;
                          await service.updateUser(user!.id!, data);
                        } else {
                          await service.createUser(data);
                        }
                        if (mounted) {
                          Navigator.of(ctx).pop();
                          _loadData();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(isEdit
                                  ? 'User updated'
                                  : 'User created'),
                              backgroundColor: AppColors.emerald,
                            ),
                          );
                        }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text('Error: $e'),
                              backgroundColor: AppColors.error),
                        );
                      }
                    },
                    child: Text(isEdit ? (isDutch ? 'Wijzigingen opslaan' : 'Save Changes') : (isDutch ? 'Gebruiker aanmaken' : 'Create User')),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmDelete(AppUser user) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isDutch ? 'Gebruiker verwijderen' : 'Delete User'),
        content: Text(isDutch ? 'Gebruiker "${user.username}" verwijderen? Dit kan niet ongedaan gemaakt worden.' : 'Delete user "${user.username}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(isDutch ? 'Annuleren' : 'Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error),
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                await ref.read(userServiceProvider).deleteUser(user.id!);
                _loadData();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(isDutch ? 'Gebruiker verwijderd' : 'User deleted'),
                      backgroundColor: AppColors.emerald,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text('Error: $e'),
                        backgroundColor: AppColors.error),
                  );
                }
              }
            },
            child: Text(isDutch ? 'Verwijderen' : 'Delete'),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleEnabled(AppUser user) async {
    try {
      await ref.read(userServiceProvider).toggleEnabled(user.id!);
      _loadData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUsername = ref.watch(authProvider).user?.username;
    final filtered = _filteredUsers;
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');

    return Scaffold(
      appBar: AppBar(
        title: Text(isDutch ? 'Gebruikers' : 'Users'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showUserForm(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: InputDecoration(
                hintText: isDutch ? 'Zoek gebruikers...' : 'Search users...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () =>
                            setState(() => _searchQuery = ''),
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          // List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _loadData,
                    child: filtered.isEmpty
                        ? Center(child: Text(isDutch ? 'Geen gebruikers gevonden' : 'No users found'))
                        : ListView.builder(
                            itemCount: filtered.length,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12),
                            itemBuilder: (ctx, i) {
                              final user = filtered[i];
                              final isSelf =
                                  user.username == currentUsername;
                              return Card(
                                margin:
                                    const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: user.enabled
                                        ? AppColors.emerald
                                        : AppColors.stone400,
                                    child: Text(
                                      user.username.isNotEmpty
                                          ? user.username[0]
                                              .toUpperCase()
                                          : '?',
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight:
                                              FontWeight.w600),
                                    ),
                                  ),
                                  title: Row(
                                    children: [
                                      Flexible(
                                          child: Text(user.username,
                                              style: const TextStyle(
                                                  fontWeight:
                                                      FontWeight
                                                          .w500))),
                                      if (!user.enabled)
                                        Container(
                                          margin:
                                              const EdgeInsets.only(
                                                  left: 6),
                                          padding: const EdgeInsets
                                              .symmetric(
                                              horizontal: 6,
                                              vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.error
                                                .withOpacity(0.1),
                                            borderRadius:
                                                BorderRadius.circular(
                                                    4),
                                          ),
                                          child: Text(
                                              isDutch ? 'Uitgeschakeld' : 'Disabled',
                                              style: const TextStyle(
                                                  fontSize: 10,
                                                  color: AppColors
                                                      .error)),
                                        ),
                                    ],
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      if (user.email != null)
                                        Text(user.email!,
                                            style: const TextStyle(
                                                fontSize: 12)),
                                      if (user.roles.isNotEmpty)
                                        Wrap(
                                          spacing: 4,
                                          children: user.roles
                                              .map((r) => Chip(
                                                    label: Text(r,
                                                        style: const TextStyle(
                                                            fontSize:
                                                                10)),
                                                    padding:
                                                        EdgeInsets
                                                            .zero,
                                                    materialTapTargetSize:
                                                        MaterialTapTargetSize
                                                            .shrinkWrap,
                                                    visualDensity:
                                                        VisualDensity
                                                            .compact,
                                                  ))
                                              .toList(),
                                        ),
                                    ],
                                  ),
                                  trailing: PopupMenuButton(
                                    itemBuilder: (ctx) => [
                                      PopupMenuItem(
                                        value: 'edit',
                                        child: Row(
                                          children: [
                                            const Icon(Icons.edit,
                                                size: 18),
                                            const SizedBox(width: 8),
                                            Text(isDutch ? 'Bewerken' : 'Edit'),
                                          ],
                                        ),
                                      ),
                                      if (!isSelf)
                                        PopupMenuItem(
                                          value: 'toggle',
                                          child: Row(
                                            children: [
                                              Icon(
                                                  user.enabled
                                                      ? Icons.block
                                                      : Icons.check,
                                                  size: 18),
                                              const SizedBox(
                                                  width: 8),
                                              Text(user.enabled
                                                  ? (isDutch ? 'Uitschakelen' : 'Disable')
                                                  : (isDutch ? 'Inschakelen' : 'Enable')),
                                            ],
                                          ),
                                        ),
                                      if (!isSelf)
                                        PopupMenuItem(
                                          value: 'delete',
                                          child: Row(
                                            children: [
                                              const Icon(Icons.delete,
                                                  size: 18,
                                                  color: AppColors
                                                      .error),
                                              const SizedBox(width: 8),
                                              Text(isDutch ? 'Verwijderen' : 'Delete',
                                                  style: const TextStyle(
                                                      color:
                                                          AppColors
                                                              .error)),
                                            ],
                                          ),
                                        ),
                                    ],
                                    onSelected: (value) {
                                      switch (value) {
                                        case 'edit':
                                          _showUserForm(user: user);
                                          break;
                                        case 'toggle':
                                          _toggleEnabled(user);
                                          break;
                                        case 'delete':
                                          _confirmDelete(user);
                                          break;
                                      }
                                    },
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}
