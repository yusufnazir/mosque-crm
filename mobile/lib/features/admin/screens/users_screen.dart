import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
                  isEdit ? 'Edit User' : 'Create User',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                // Username
                TextFormField(
                  controller: usernameCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Username *'),
                  readOnly: isEdit,
                  enabled: !isEdit,
                ),
                const SizedBox(height: 12),
                // Password
                TextFormField(
                  controller: passwordCtrl,
                  decoration: InputDecoration(
                    labelText: isEdit
                        ? 'Password (leave blank to keep)'
                        : 'Password *',
                  ),
                  obscureText: true,
                ),
                const SizedBox(height: 12),
                // Email
                TextFormField(
                  controller: emailCtrl,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                // Roles
                const Text('Roles',
                    style: TextStyle(
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
                if (isEdit) ...[
                  const SizedBox(height: 8),
                  SwitchListTile(
                    value: enabled,
                    title: const Text('Account Enabled'),
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
                    child: Text(isEdit ? 'Save Changes' : 'Create User'),
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
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete User'),
        content: Text('Delete user "${user.username}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
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
                    const SnackBar(
                      content: Text('User deleted'),
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
            child: const Text('Delete'),
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Users'),
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
                hintText: 'Search users...',
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
                        ? const Center(child: Text('No users found'))
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
                                          child: const Text(
                                              'Disabled',
                                              style: TextStyle(
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
                                      const PopupMenuItem(
                                        value: 'edit',
                                        child: Row(
                                          children: [
                                            Icon(Icons.edit,
                                                size: 18),
                                            SizedBox(width: 8),
                                            Text('Edit'),
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
                                                  ? 'Disable'
                                                  : 'Enable'),
                                            ],
                                          ),
                                        ),
                                      if (!isSelf)
                                        const PopupMenuItem(
                                          value: 'delete',
                                          child: Row(
                                            children: [
                                              Icon(Icons.delete,
                                                  size: 18,
                                                  color: AppColors
                                                      .error),
                                              SizedBox(width: 8),
                                              Text('Delete',
                                                  style: TextStyle(
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
