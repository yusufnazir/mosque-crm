import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../models/group_models.dart';
import '../services/group_service.dart';

class GroupDetailScreen extends ConsumerStatefulWidget {
  final int groupId;

  const GroupDetailScreen({super.key, required this.groupId});

  @override
  ConsumerState<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends ConsumerState<GroupDetailScreen> {
  Group? _group;
  List<GroupMember> _members = [];
  List<GroupRole> _roles = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(groupServiceProvider);
      final results = await Future.wait([
        service.getGroup(widget.groupId),
        service.getGroupMembers(widget.groupId),
        service.getGroupRoles(widget.groupId),
      ]);

      if (mounted) {
        setState(() {
          _group = results[0] as Group;
          _members = results[1] as List<GroupMember>;
          _roles = results[2] as List<GroupRole>;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: Text(_group?.name ?? 'Group Detail'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: TextStyle(color: AppColors.error)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  color: AppColors.emerald,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildGroupInfo(),
                      const SizedBox(height: 16),
                      _buildMembersSection(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildGroupInfo() {
    if (_group == null) return const SizedBox.shrink();
    final g = _group!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppColors.emerald.withOpacity(0.1),
                  child: const Icon(Icons.groups,
                      color: AppColors.emerald, size: 28),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        g.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: g.isActive
                                  ? AppColors.success.withOpacity(0.1)
                                  : AppColors.stone200,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              g.isActive ? 'Active' : 'Inactive',
                              style: TextStyle(
                                fontSize: 12,
                                color: g.isActive
                                    ? AppColors.success
                                    : AppColors.stone500,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${_members.length} members',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.stone500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (g.description != null && g.description!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                g.description!,
                style: TextStyle(color: AppColors.stone600, fontSize: 14),
              ),
            ],
            if (g.startDate != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 14, color: AppColors.stone400),
                  const SizedBox(width: 6),
                  Text(
                    'Started ${g.startDate}',
                    style: TextStyle(fontSize: 13, color: AppColors.stone500),
                  ),
                  if (g.endDate != null) ...[
                    Text(
                      ' → ${g.endDate}',
                      style:
                          TextStyle(fontSize: 13, color: AppColors.stone500),
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMembersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Members',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 8),
        if (_members.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.people_outline,
                        size: 36, color: AppColors.stone300),
                    const SizedBox(height: 8),
                    Text('No members in this group',
                        style: TextStyle(color: AppColors.stone500)),
                  ],
                ),
              ),
            ),
          )
        else
          ..._members.map((member) => _buildMemberRow(member)),
      ],
    );
  }

  Widget _buildMemberRow(GroupMember member) {
    final isActive = member.endDate == null ||
        DateTime.tryParse('${member.endDate}T00:00:00')
                ?.isAfter(DateTime.now()) ==
            true;

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isActive
              ? AppColors.emerald.withOpacity(0.1)
              : AppColors.stone200,
          child: Text(
            member.personFullName.isNotEmpty
                ? member.personFullName[0]
                : '?',
            style: TextStyle(
              color: isActive ? AppColors.emerald : AppColors.stone400,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        title: Text(
          member.personFullName,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Row(
          children: [
            if (member.roleName != null && member.roleName!.isNotEmpty) ...[
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.gold.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  member.roleName!,
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.gold,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],
            Text(
              isActive ? 'Active' : 'Ended',
              style: TextStyle(
                fontSize: 12,
                color: isActive ? AppColors.success : AppColors.stone400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
