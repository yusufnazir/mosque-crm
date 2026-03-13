import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_shell.dart';
import '../models/member_models.dart';
import '../services/member_service.dart';

class MembersScreen extends ConsumerStatefulWidget {
  const MembersScreen({super.key});

  @override
  ConsumerState<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends ConsumerState<MembersScreen> {
  final _searchController = TextEditingController();
  List<Person> _persons = [];
  bool _isLoading = true;
  String? _error;
  int _page = 0;
  int _totalPages = 0;
  int _totalElements = 0;
  final int _pageSize = 20;

  @override
  void initState() {
    super.initState();
    _loadPersons();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPersons({int page = 0}) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(memberServiceProvider);
      final result = await service.getPersons(
        page: page,
        size: _pageSize,
        search: _searchController.text.trim().isNotEmpty
            ? _searchController.text.trim()
            : null,
      );

      if (mounted) {
        setState(() {
          _persons = result.content;
          _page = result.number;
          _totalPages = result.totalPages;
          _totalElements = result.totalElements;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _onSearch() {
    _loadPersons(page: 0);
  }

  Color _statusColor(String? status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return AppColors.success;
      case 'INACTIVE':
        return AppColors.stone400;
      case 'DECEASED':
        return AppColors.stone600;
      default:
        return AppColors.stone400;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => appShellScaffoldKey.currentState?.openDrawer(),
        ),
        title: Text(t.members),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.emerald,
        onPressed: () async {
          final result = await context.push('/members/add');
          if (result == true) _loadPersons();
        },
        child: const Icon(Icons.person_add),
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: t.searchMembers,
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _onSearch();
                        },
                      )
                    : null,
              ),
              onSubmitted: (_) => _onSearch(),
              textInputAction: TextInputAction.search,
            ),
          ),

          // Count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Text(
                  '$_totalElements ${isDutch ? 'leden' : 'members'}',
                  style: TextStyle(
                    color: AppColors.stone500,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_error!,
                                style: TextStyle(color: AppColors.error)),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => _loadPersons(page: _page),
                              child: Text(t.retry),
                            ),
                          ],
                        ),
                      )
                    : _persons.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.people_outline,
                                    size: 48, color: AppColors.stone300),
                                const SizedBox(height: 8),
                                Text(
                                  isDutch ? 'Geen leden gevonden' : 'No members found',
                                  style: TextStyle(color: AppColors.stone500),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => _loadPersons(page: _page),
                            color: AppColors.emerald,
                            child: ListView.builder(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: _persons.length + 1,
                              itemBuilder: (context, index) {
                                if (index == _persons.length) {
                                  return _buildPagination();
                                }
                                return _buildPersonCard(_persons[index]);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildPersonCard(Person person) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: AppColors.emerald.withOpacity(0.1),
          child: Text(
            '${person.firstName.isNotEmpty ? person.firstName[0] : ''}${person.lastName.isNotEmpty ? person.lastName[0] : ''}',
            style: TextStyle(
              color: AppColors.emerald,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        title: Text(
          person.fullName,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (person.email != null && person.email!.isNotEmpty)
              Row(
                children: [
                  Icon(Icons.email_outlined,
                      size: 13, color: AppColors.stone400),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(person.email!,
                        style: TextStyle(
                            fontSize: 12, color: AppColors.stone500),
                        overflow: TextOverflow.ellipsis),
                  ),
                ],
              ),
            if (person.phone != null && person.phone!.isNotEmpty)
              Row(
                children: [
                  Icon(Icons.phone_outlined,
                      size: 13, color: AppColors.stone400),
                  const SizedBox(width: 4),
                  Text(person.phone!,
                      style: TextStyle(
                          fontSize: 12, color: AppColors.stone500)),
                ],
              ),
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: _statusColor(person.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    _statusText(context, person.status),
                    style: TextStyle(
                      fontSize: 11,
                      color: _statusColor(person.status),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (person.gender != null) ...[
                  const SizedBox(width: 8),
                  Icon(
                    person.gender == 'M' ? Icons.man : Icons.woman,
                    size: 16,
                    color: AppColors.stone400,
                  ),
                ],
              ],
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right, color: AppColors.stone400),
        onTap: () {
          if (person.id != null) {
            context.push('/members/${person.id}');
          }
        },
      ),
    );
  }

  Widget _buildPagination() {
    final t = AppLocalizations.of(context)!;
    if (_totalPages <= 1) return const SizedBox(height: 16);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            onPressed: _page > 0 ? () => _loadPersons(page: _page - 1) : null,
            icon: const Icon(Icons.chevron_left),
          ),
          Text(
            t.page(_page + 1, _totalPages),
            style: TextStyle(color: AppColors.stone500, fontSize: 14),
          ),
          IconButton(
            onPressed: _page < _totalPages - 1
                ? () => _loadPersons(page: _page + 1)
                : null,
            icon: const Icon(Icons.chevron_right),
          ),
        ],
      ),
    );
  }

  String _statusText(BuildContext context, String? status) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return isDutch ? 'ACTIEF' : 'ACTIVE';
      case 'INACTIVE':
        return isDutch ? 'INACTIEF' : 'INACTIVE';
      case 'DECEASED':
        return isDutch ? 'OVERLEDEN' : 'DECEASED';
      default:
        return isDutch ? 'ONBEKEND' : 'UNKNOWN';
    }
  }
}
