import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../models/user_models.dart';
import '../services/user_service.dart';

/// Admin roles & permissions management screen.
class RolesScreen extends ConsumerStatefulWidget {
  const RolesScreen({super.key});

  @override
  ConsumerState<RolesScreen> createState() => _RolesScreenState();
}

class _RolesScreenState extends ConsumerState<RolesScreen> {
  List<AppRole> _roles = [];
  List<Permission> _permissions = [];
  AppRole? _selectedRole;
  bool _isLoading = true;
  bool _isSaving = false;
  Set<String> _selectedPermCodes = {};

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
        service.getRoles(),
        service.getPermissions(),
      ]);
      if (mounted) {
        setState(() {
          _roles = results[0] as List<AppRole>;
          _permissions = results[1] as List<Permission>;
          _isLoading = false;
          if (_selectedRole != null) {
            // Re‑select updated role
            final updated = _roles.where((r) => r.id == _selectedRole!.id);
            if (updated.isNotEmpty) {
              _selectRole(updated.first);
            }
          }
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

  void _selectRole(AppRole role) {
    setState(() {
      _selectedRole = role;
      _selectedPermCodes = Set<String>.from(role.permissions);
    });
  }

  Map<String, List<Permission>> get _groupedPermissions {
    final map = <String, List<Permission>>{};
    for (final p in _permissions) {
      final category = p.category ?? 'other';
      map.putIfAbsent(category, () => []).add(p);
    }
    return map;
  }

  Future<void> _savePermissions() async {
    if (_selectedRole == null) return;
    setState(() => _isSaving = true);
    try {
      await ref
          .read(userServiceProvider)
          .updateRolePermissions(_selectedRole!.id!, _selectedPermCodes.toList());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Permissions saved'), backgroundColor: AppColors.emerald),
        );
      }
      _loadData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _showRoleForm({AppRole? role}) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    final nameCtrl = TextEditingController(text: role?.name ?? '');
    final descCtrl = TextEditingController(text: role?.description ?? '');
    bool isEdit = role != null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: 20 + MediaQuery.of(ctx).viewInsets.bottom,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
            Text(isEdit ? (isDutch ? 'Rol bewerken' : 'Edit Role') : (isDutch ? 'Rol aanmaken' : 'Create Role'),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            TextFormField(
              controller: nameCtrl,
              decoration: InputDecoration(labelText: isDutch ? 'Relnaam *' : 'Role Name *'),
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: descCtrl,
              decoration: InputDecoration(labelText: isDutch ? 'Beschrijving' : 'Description'),
              maxLines: 2,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  if (nameCtrl.text.trim().isEmpty) return;
                  try {
                    final service = ref.read(userServiceProvider);
                    final data = {
                      'name': nameCtrl.text.trim().toUpperCase(),
                      'description': descCtrl.text.trim(),
                    };
                    if (isEdit) {
                      await service.updateRole(role!.id!, data);
                    } else {
                      await service.createRole(data);
                    }
                    if (mounted) {
                      Navigator.of(ctx).pop();
                      _loadData();
                    }
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text('Error: $e'),
                          backgroundColor: AppColors.error),
                    );
                  }
                },
                  child: Text(isEdit ? (isDutch ? 'Wijzigingen opslaan' : 'Save Changes') : (isDutch ? 'Rol aanmaken' : 'Create Role')),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteRole(AppRole role) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isDutch ? 'Rol verwijderen' : 'Delete Role'),
        content: Text(isDutch ? 'Rol "${role.name}" verwijderen? Dit kan niet ongedaan gemaakt worden.' : 'Delete role "${role.name}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(isDutch ? 'Annuleren' : 'Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                await ref.read(userServiceProvider).deleteRole(role.id!);
                if (_selectedRole?.id == role.id) {
                  _selectedRole = null;
                }
                _loadData();
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

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(isDutch ? 'Rollen en machtigingen' : 'Roles & Permissions')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(isDutch ? 'Rollen en machtigingen' : 'Roles & Permissions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showRoleForm(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Role chips row
          SizedBox(
            height: 56,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: _roles.length,
              itemBuilder: (ctx, i) {
                final role = _roles[i];
                final isSelected = _selectedRole?.id == role.id;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onLongPress: () => _confirmDeleteRole(role),
                    child: ChoiceChip(
                      label: Text(role.name),
                      selected: isSelected,
                      selectedColor: AppColors.emerald.withOpacity(0.2),
                      onSelected: (_) => _selectRole(role),
                    ),
                  ),
                );
              },
            ),
          ),
          const Divider(height: 1),
          // Permission matrix
          if (_selectedRole == null)
            Expanded(
              child: Center(
                child: Text(isDutch ? 'Selecteer een rol om machtigingen te beheren' : 'Select a role to manage permissions',
                    style: const TextStyle(color: AppColors.stone500)),
              ),
            )
          else
            Expanded(
              child: Column(
                children: [
                  // Role header
                  Container(
                    padding: const EdgeInsets.all(12),
                    color: AppColors.emerald.withOpacity(0.05),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_selectedRole!.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 16)),
                              if (_selectedRole!.description != null)
                                Text(_selectedRole!.description!,
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.stone500)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit, size: 20),
                          onPressed: () =>
                              _showRoleForm(role: _selectedRole),
                        ),
                      ],
                    ),
                  ),
                  // Permission groups
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(12),
                      children: _groupedPermissions.entries.map((entry) {
                        final category = entry.key;
                        final perms = entry.value;
                        final allSelected = perms
                            .every((p) => _selectedPermCodes.contains(p.code));
                        final someSelected = perms
                            .any((p) => _selectedPermCodes.contains(p.code));
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ExpansionTile(
                            leading: Checkbox(
                              value: allSelected
                                  ? true
                                  : someSelected
                                      ? null
                                      : false,
                              tristate: true,
                              activeColor: AppColors.emerald,
                              onChanged: (v) {
                                setState(() {
                                  if (allSelected) {
                                    for (final p in perms) {
                                      _selectedPermCodes.remove(p.code);
                                    }
                                  } else {
                                    for (final p in perms) {
                                      _selectedPermCodes.add(p.code);
                                    }
                                  }
                                });
                              },
                            ),
                            title: Text(
                              _categoryLabel(category),
                              style: const TextStyle(fontWeight: FontWeight.w500),
                            ),
                            subtitle: Text(
                              isDutch
                                  ? '${perms.where((p) => _selectedPermCodes.contains(p.code)).length}/${perms.length} ingeschakeld'
                                  : '${perms.where((p) => _selectedPermCodes.contains(p.code)).length}/${perms.length} enabled',
                              style: const TextStyle(fontSize: 12),
                            ),
                            children: perms
                                .map((p) => CheckboxListTile(
                                      value:
                                          _selectedPermCodes.contains(p.code),
                                      title: Text(p.code,
                                          style:
                                              const TextStyle(fontSize: 14)),
                                      subtitle: p.description != null
                                          ? Text(p.description!,
                                              style: const TextStyle(
                                                  fontSize: 12))
                                          : null,
                                      dense: true,
                                      activeColor: AppColors.emerald,
                                      controlAffinity:
                                          ListTileControlAffinity.leading,
                                      onChanged: (v) {
                                        setState(() {
                                          if (v == true) {
                                            _selectedPermCodes.add(p.code);
                                          } else {
                                            _selectedPermCodes.remove(p.code);
                                          }
                                        });
                                      },
                                    ))
                                .toList(),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  // Save button
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _savePermissions,
                        child: _isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : Text(isDutch ? 'Machtigingen opslaan' : 'Save Permissions'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  String _categoryLabel(String category) {
    return category
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty
            ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}'
            : '')
        .join(' ');
  }
}
