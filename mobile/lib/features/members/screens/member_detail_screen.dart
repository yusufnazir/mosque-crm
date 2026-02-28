import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../models/member_models.dart';
import '../services/member_service.dart';
import '../../contributions/services/contribution_service.dart';
import '../../contributions/models/contribution_models.dart';
import '../../contributions/widgets/add_finance_sheets.dart';

class MemberDetailScreen extends ConsumerStatefulWidget {
  final int memberId;

  const MemberDetailScreen({super.key, required this.memberId});

  @override
  ConsumerState<MemberDetailScreen> createState() =>
      _MemberDetailScreenState();
}

class _MemberDetailScreenState extends ConsumerState<MemberDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Person? _person;
  List<MemberPayment> _payments = [];
  List<ContributionAssignment> _assignments = [];
  List<ContributionExemption> _exemptions = [];
  int _familyMemberCount = 0;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final memberService = ref.read(memberServiceProvider);
      final contributionService = ref.read(contributionServiceProvider);

      final results = await Future.wait([
        memberService.getPerson(widget.memberId),
        contributionService.getPaymentsByPerson(widget.memberId),
        contributionService.getActiveAssignmentsByPerson(widget.memberId),
        contributionService.getExemptions(),
      ]);

      if (mounted) {
        final allExemptions = results[3] as List<ContributionExemption>;
        setState(() {
          _person = results[0] as Person;
          _payments = results[1] as List<MemberPayment>;
          _assignments = results[2] as List<ContributionAssignment>;
          _exemptions = allExemptions
              .where((e) => e.personId == widget.memberId)
              .toList();
          _isLoading = false;
        });
        // Load family count in background
        _loadFamilyCount();
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

  Future<void> _loadFamilyCount() async {
    try {
      final memberService = ref.read(memberServiceProvider);
      final count =
          await memberService.getFamilyMemberCount(widget.memberId);
      if (mounted) {
        setState(() => _familyMemberCount = count);
      }
    } catch (_) {
      // silently ignore — just show 0
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: Text(_person?.fullName ?? 'Member Detail'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            tooltip: 'Edit Member',
            onPressed: () async {
              final result = await context.push<bool>(
                '/members/${widget.memberId}/edit',
              );
              if (result == true) _loadData();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.gold,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Family'),
            Tab(text: 'Finance'),
          ],
        ),
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
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(),
                    _buildFamilyTab(),
                    _buildFinanceTab(),
                  ],
                ),
    );
  }

  // ═══════════════════════════════════════════
  //  Overview Tab
  // ═══════════════════════════════════════════
  Widget _buildOverviewTab() {
    if (_person == null) return const SizedBox.shrink();
    final p = _person!;

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppColors.emerald,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Profile header ──
          _buildProfileHeader(p),
          const SizedBox(height: 12),

          // ── Stat cards ──
          _buildStatCards(),
          const SizedBox(height: 12),

          // ── Personal Information ──
          _buildPersonalInfo(p),
          const SizedBox(height: 12),

          // ── Address ──
          if (p.address != null || p.city != null || p.country != null)
            _buildAddressCard(p),
        ],
      ),
    );
  }

  Widget _buildProfileHeader(Person p) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 32,
              backgroundColor: AppColors.emerald,
              child: Text(
                '${p.firstName.isNotEmpty ? p.firstName[0] : ''}${p.lastName.isNotEmpty ? p.lastName[0] : ''}',
                style: const TextStyle(
                  fontSize: 22,
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.fullName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _buildStatusBadge(p.status),
                      if (p.gender != null) ...[
                        const SizedBox(width: 8),
                        Icon(
                          p.gender == 'M' ? Icons.man : Icons.woman,
                          size: 18,
                          color: AppColors.stone400,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCards() {
    final activeAssignments =
        _assignments.where((a) => a.isActive).length;
    final activeExemptions =
        _exemptions.where((e) => e.isActive).length;

    return Row(
      children: [
        Expanded(
          child: _MiniStatCard(
            label: 'Total Payments',
            value: '${_payments.length}',
            color: AppColors.emerald,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _MiniStatCard(
            label: 'Assignments',
            value: '$activeAssignments',
            color: AppColors.emerald,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _MiniStatCard(
            label: 'Exemptions',
            value: '$activeExemptions',
            color: AppColors.emerald,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _MiniStatCard(
            label: 'Family',
            value: '$_familyMemberCount',
            color: AppColors.emerald,
          ),
        ),
      ],
    );
  }

  Widget _buildPersonalInfo(Person p) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Personal Information',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            _buildFieldRow(
              'Email',
              p.email ?? 'Not provided',
              'Phone',
              p.phone ?? 'Not provided',
            ),
            const SizedBox(height: 12),
            _buildFieldRow(
              'Date of Birth',
              p.dateOfBirth != null ? _formatDate(p.dateOfBirth!) : 'Not provided',
              'Gender',
              _genderLabel(p.gender),
            ),
            if (p.dateOfDeath != null) ...[
              const SizedBox(height: 12),
              _buildFieldRow(
                'Date of Death',
                _formatDate(p.dateOfDeath!),
                '',
                '',
              ),
            ],
            const SizedBox(height: 12),
            _buildFieldRow(
              'Member Since',
              p.createdAt != null ? _formatDate(p.createdAt!) : 'Not provided',
              'Username',
              p.username ?? 'No account',
            ),
            const SizedBox(height: 12),
            // Status
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Status',
                    style: TextStyle(
                        fontSize: 12,
                        color: AppColors.emerald,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                _buildStatusBadge(p.status),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFieldRow(
      String label1, String value1, String label2, String value2) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label1,
                  style: TextStyle(
                      fontSize: 12,
                      color: AppColors.emerald,
                      fontWeight: FontWeight.w500)),
              const SizedBox(height: 2),
              Text(value1,
                  style:
                      const TextStyle(fontSize: 14, color: AppColors.charcoal)),
            ],
          ),
        ),
        if (label2.isNotEmpty)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label2,
                    style: TextStyle(
                        fontSize: 12,
                        color: AppColors.emerald,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(value2,
                    style: const TextStyle(
                        fontSize: 14, color: AppColors.charcoal)),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildAddressCard(Person p) {
    final parts = <String>[];
    if (p.address != null && p.address!.isNotEmpty) parts.add(p.address!);
    if (p.city != null && p.city!.isNotEmpty) parts.add(p.city!);
    if (p.country != null && p.country!.isNotEmpty) parts.add(p.country!);
    if (p.postalCode != null && p.postalCode!.isNotEmpty) {
      parts.add(p.postalCode!);
    }
    if (parts.isEmpty) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Address',
                style: TextStyle(
                    fontSize: 12,
                    color: AppColors.emerald,
                    fontWeight: FontWeight.w500)),
            const SizedBox(height: 4),
            Text(parts.join('\n'),
                style:
                    const TextStyle(fontSize: 14, color: AppColors.charcoal)),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  Family Tab
  // ═══════════════════════════════════════════
  Widget _buildFamilyTab() {
    // Placeholder — family relationships require genealogy API
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.family_restroom,
                size: 64, color: AppColors.stone300),
            const SizedBox(height: 12),
            Text(
              'Family information',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              'Family relationships are shown here when available.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.stone500),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  Finance Tab (Payments + Assignments + Exemptions)
  // ═══════════════════════════════════════════
  Widget _buildFinanceTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Payments Section ──
        _buildSectionHeader('Payments', Icons.payment, _payments.length,
            onAdd: () async {
          final result = await showAddPaymentSheet(context, ref,
              personId: widget.memberId);
          if (result == true) _loadData();
        }),
        if (_payments.isEmpty)
          _buildEmptyState('No payments found', Icons.payments_outlined)
        else
          ..._payments.map(_buildPaymentItem),

        const SizedBox(height: 20),

        // ── Assignments Section ──
        _buildSectionHeader(
            'Active Assignments',
            Icons.assignment,
            _assignments.where((a) => a.isActive).length,
            onAdd: () async {
          final result = await showAddAssignmentSheet(context, ref,
              personId: widget.memberId);
          if (result == true) _loadData();
        }),
        if (_assignments.isEmpty)
          _buildEmptyState(
              'No assignments found', Icons.assignment_outlined)
        else
          ..._assignments.map(_buildAssignmentItem),

        const SizedBox(height: 20),

        // ── Exemptions Section ──
        _buildSectionHeader(
            'Active Exemptions',
            Icons.shield_outlined,
            _exemptions.where((e) => e.isActive).length,
            onAdd: () async {
          final result = await showAddExemptionSheet(context, ref,
              personId: widget.memberId);
          if (result == true) _loadData();
        }),
        if (_exemptions.isEmpty)
          _buildEmptyState(
              'No exemptions found', Icons.shield_outlined)
        else
          ..._exemptions.map(_buildExemptionItem),

        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, int count,
      {VoidCallback? onAdd}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.emerald),
          const SizedBox(width: 8),
          Text(title,
              style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.w600)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.emerald.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text('$count',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.emerald)),
          ),
          if (onAdd != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onAdd,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppColors.emerald,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.add, size: 16, color: Colors.white),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyState(String message, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(icon, size: 36, color: AppColors.stone300),
            const SizedBox(height: 6),
            Text(message, style: TextStyle(color: AppColors.stone500)),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentItem(MemberPayment payment) {
    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        dense: true,
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: payment.isReversal
              ? AppColors.error.withOpacity(0.1)
              : AppColors.emerald.withOpacity(0.1),
          child: Icon(
            payment.isReversal ? Icons.undo : Icons.payment,
            color: payment.isReversal ? AppColors.error : AppColors.emerald,
            size: 18,
          ),
        ),
        title: Text(
          '${payment.currencySymbol ?? ''} ${payment.amount.toStringAsFixed(2)}',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: payment.isReversal ? AppColors.error : null,
            decoration:
                payment.isReversal ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: Text(
          '${payment.contributionTypeCode ?? ''} · ${payment.paymentDate ?? ''}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: payment.reference != null
            ? Text(payment.reference!,
                style: TextStyle(fontSize: 11, color: AppColors.stone400))
            : null,
      ),
    );
  }

  Widget _buildAssignmentItem(ContributionAssignment a) {
    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        dense: true,
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: a.isActive
              ? AppColors.success.withOpacity(0.1)
              : AppColors.stone200,
          child: Icon(
            Icons.assignment,
            color: a.isActive ? AppColors.success : AppColors.stone400,
            size: 18,
          ),
        ),
        title: Text(
          a.contributionTypeCode ?? 'Unknown',
          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        ),
        subtitle: Text(
          '${a.startDate ?? ''} ${a.endDate != null ? '→ ${a.endDate}' : '(ongoing)'}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: _buildActiveBadge(a.isActive),
      ),
    );
  }

  Widget _buildExemptionItem(ContributionExemption e) {
    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        dense: true,
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: e.isActive
              ? AppColors.gold.withOpacity(0.15)
              : AppColors.stone200,
          child: Icon(
            Icons.shield_outlined,
            color: e.isActive ? AppColors.gold : AppColors.stone400,
            size: 18,
          ),
        ),
        title: Text(
          e.contributionTypeCode ?? 'Unknown',
          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        ),
        subtitle: Text(
          '${e.exemptionType ?? ''} · ${e.reason ?? ''}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: _buildActiveBadge(e.isActive),
      ),
    );
  }

  Widget _buildActiveBadge(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.success.withOpacity(0.1)
            : AppColors.stone200,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        isActive ? 'Active' : 'Ended',
        style: TextStyle(
          fontSize: 11,
          color: isActive ? AppColors.success : AppColors.stone500,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════
  Widget _buildStatusBadge(String? status) {
    Color color;
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        color = AppColors.success;
        break;
      case 'INACTIVE':
        color = AppColors.stone400;
        break;
      case 'DECEASED':
        color = AppColors.stone600;
        break;
      default:
        color = AppColors.stone400;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status ?? 'Unknown',
        style: TextStyle(
          fontSize: 12,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  String _genderLabel(String? gender) {
    switch (gender) {
      case 'M':
        return 'Male';
      case 'F':
      case 'V':
        return 'Female';
      default:
        return gender ?? 'Not specified';
    }
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final months = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return '${months[date.month]} ${date.day}, ${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}

class _MiniStatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MiniStatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.stone200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 10,
                  color: AppColors.stone500,
                  fontWeight: FontWeight.w400)),
          const SizedBox(height: 4),
          Text(value,
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: color)),
        ],
      ),
    );
  }
}
