import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../models/user_models.dart';
import '../services/user_service.dart';

/// Admin privilege / permission pool management screen.
class PrivilegesScreen extends ConsumerStatefulWidget {
  const PrivilegesScreen({super.key});

  @override
  ConsumerState<PrivilegesScreen> createState() => _PrivilegesScreenState();
}

class _PrivilegesScreenState extends ConsumerState<PrivilegesScreen> {
  List<String> _pool = [];
  bool _isLoading = true;
  bool _isSaving = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final pool = await ref.read(userServiceProvider).getPermissionPool();
      if (mounted) {
        setState(() {
          _pool = pool;
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

  /// Group permission codes by category (part before the dot).
  Map<String, List<String>> get _grouped {
    final map = <String, List<String>>{};
    for (final code in _pool) {
      if (_searchQuery.isNotEmpty &&
          !code.toLowerCase().contains(_searchQuery.toLowerCase())) {
        continue;
      }
      final category = code.contains('.') ? code.split('.').first : 'other';
      map.putIfAbsent(category, () => []).add(code);
    }
    return map;
  }

  Future<void> _savePool() async {
    setState(() => _isSaving = true);
    try {
      await ref.read(userServiceProvider).updatePermissionPool(_pool);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Permissions saved'),
              backgroundColor: AppColors.emerald),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Privileges')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final grouped = _grouped;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Privileges'),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.save, size: 18),
            label: const Text('Save'),
            onPressed: _isSaving ? null : _savePool,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search permissions...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () => setState(() => _searchQuery = ''),
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          // Summary
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.emerald.withOpacity(0.05),
            child: Row(
              children: [
                const Icon(Icons.security, size: 18, color: AppColors.emerald),
                const SizedBox(width: 8),
                Text('${_pool.length} permissions in ${grouped.length} categories',
                    style: const TextStyle(fontSize: 13, color: AppColors.stone600)),
              ],
            ),
          ),
          Expanded(
            child: grouped.isEmpty
                ? const Center(child: Text('No permissions found'))
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: grouped.length,
                    itemBuilder: (ctx, i) {
                      final entry = grouped.entries.elementAt(i);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ExpansionTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.emerald.withOpacity(0.1),
                            radius: 16,
                            child: Text(
                              entry.value.length.toString(),
                              style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.emerald),
                            ),
                          ),
                          title: Text(
                            _categoryLabel(entry.key),
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                          subtitle: Text(
                            '${entry.value.length} permissions',
                            style: const TextStyle(fontSize: 12),
                          ),
                          children: entry.value
                              .map((code) => ListTile(
                                    title: Text(code,
                                        style: const TextStyle(
                                            fontSize: 14,
                                            fontFamily: 'monospace')),
                                    dense: true,
                                    leading: const Icon(Icons.vpn_key,
                                        size: 16, color: AppColors.stone400),
                                  ))
                              .toList(),
                        ),
                      );
                    },
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
