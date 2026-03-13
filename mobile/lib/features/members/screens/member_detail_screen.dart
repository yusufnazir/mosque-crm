import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

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
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: Text(_person?.fullName ?? t.memberDetail),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            tooltip: isDutch ? 'Lid bewerken' : 'Edit Member',
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
          tabs: [
            Tab(text: t.overview),
            Tab(text: isDutch ? 'Familie' : 'Family'),
            Tab(text: t.finance),
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
                        child: Text(t.retry),
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
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    final activeAssignments =
        _assignments.where((a) => a.isActive).length;
    final activeExemptions =
        _exemptions.where((e) => e.isActive).length;

    return Row(
      children: [
        Expanded(
          child: _MiniStatCard(
            label: isDutch ? 'Betalingen totaal' : 'Total Payments',
            value: '${_payments.length}',
            color: AppColors.emerald,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _MiniStatCard(
            label: AppLocalizations.of(context)!.assignments,
            value: '$activeAssignments',
            color: AppColors.emerald,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _MiniStatCard(
            label: isDutch ? 'Vrijstellingen' : 'Exemptions',
            value: '$activeExemptions',
            color: AppColors.emerald,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _MiniStatCard(
            label: isDutch ? 'Familie' : 'Family',
            value: '$_familyMemberCount',
            color: AppColors.emerald,
          ),
        ),
      ],
    );
  }

  Widget _buildPersonalInfo(Person p) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isDutch ? 'Persoonlijke informatie' : 'Personal Information',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            _buildFieldRow(
              isDutch ? 'E-mail' : 'Email',
              p.email ?? (isDutch ? 'Niet opgegeven' : 'Not provided'),
              isDutch ? 'Telefoon' : 'Phone',
              p.phone ?? (isDutch ? 'Niet opgegeven' : 'Not provided'),
            ),
            const SizedBox(height: 12),
            _buildFieldRow(
              isDutch ? 'Geboortedatum' : 'Date of Birth',
              p.dateOfBirth != null ? _formatDate(p.dateOfBirth!) : (isDutch ? 'Niet opgegeven' : 'Not provided'),
              isDutch ? 'Geslacht' : 'Gender',
              _genderLabel(p.gender),
            ),
            if (p.dateOfDeath != null) ...[
              const SizedBox(height: 12),
              _buildFieldRow(
                isDutch ? 'Overlijdensdatum' : 'Date of Death',
                _formatDate(p.dateOfDeath!),
                '',
                '',
              ),
            ],
            const SizedBox(height: 12),
            _buildFieldRow(
              t.username,
              p.username ?? (isDutch ? 'Geen account' : 'No account'),
              isDutch ? 'ID-nummer' : 'ID Number',
              p.idNumber ?? (isDutch ? 'Niet opgegeven' : 'Not provided'),
            ),
            const SizedBox(height: 12),
            _buildFieldRow(
              isDutch ? 'Lid sinds' : 'Member Since',
              p.createdAt != null ? _formatDate(p.createdAt!) : (isDutch ? 'Niet opgegeven' : 'Not provided'),
              '',
              '',
            ),
            const SizedBox(height: 12),
            // Status
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(isDutch ? 'Status' : 'Status',
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
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
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
            Text(isDutch ? 'Adres' : 'Address',
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
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
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
              isDutch ? 'Familie-informatie' : 'Family information',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              isDutch
                  ? 'Familierelaties worden hier getoond wanneer beschikbaar.'
                  : 'Family relationships are shown here when available.',
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
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Payments Section ──
        _buildSectionHeader(AppLocalizations.of(context)!.payments, Icons.payment, _payments.length,
            onAdd: () async {
          final result = await showAddPaymentSheet(context, ref,
              personId: widget.memberId);
          if (result == true) _loadData();
        }),
        if (_payments.isEmpty)
          _buildEmptyState(AppLocalizations.of(context)!.noPaymentsFound, Icons.payments_outlined)
        else
          ..._payments.map(_buildPaymentItem),

        const SizedBox(height: 20),

        // ── Assignments Section ──
        _buildSectionHeader(
          isDutch ? 'Actieve toewijzingen' : 'Active Assignments',
            Icons.assignment,
            _assignments.where((a) => a.isActive).length,
            onAdd: () async {
          final result = await showAddAssignmentSheet(context, ref,
              personId: widget.memberId);
          if (result == true) _loadData();
        }),
        if (_assignments.isEmpty)
          _buildEmptyState(
              AppLocalizations.of(context)!.noAssignments, Icons.assignment_outlined)
        else
          ..._assignments.map(_buildAssignmentItem),

        const SizedBox(height: 20),

        // ── Exemptions Section ──
        _buildSectionHeader(
          isDutch ? 'Actieve vrijstellingen' : 'Active Exemptions',
            Icons.shield_outlined,
            _exemptions.where((e) => e.isActive).length,
            onAdd: () async {
          final result = await showAddExemptionSheet(context, ref,
              personId: widget.memberId);
          if (result == true) _loadData();
        }),
        if (_exemptions.isEmpty)
          _buildEmptyState(
              isDutch ? 'Geen vrijstellingen gevonden' : 'No exemptions found', Icons.shield_outlined)
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
        title: Row(
          children: [
            Text(
              '${payment.currencySymbol ?? ''} ${payment.amount.toStringAsFixed(2)}',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: payment.isReversal ? AppColors.error : null,
                decoration:
                    payment.isReversal ? TextDecoration.lineThrough : null,
              ),
            ),
            if (payment.periodFrom != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Text(
                  _formatPeriod(payment.periodFrom!, payment.periodTo),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: Colors.orange.shade700,
                  ),
                ),
              ),
            ],
          ],
        ),
        subtitle: Text(
          '${payment.contributionTypeCode ?? ''} · ${payment.paymentDate ?? ''}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: IconButton(
          icon: const Icon(Icons.more_vert, size: 18),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          onPressed: () => _showPaymentActions(payment),
        ),
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
          a.contributionTypeCode ?? (AppLocalizations.of(context)!.localeName.startsWith('nl') ? 'Onbekend' : 'Unknown'),
          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        ),
        subtitle: Text(
          '${a.startDate ?? ''} ${a.endDate != null ? '→ ${a.endDate}' : (AppLocalizations.of(context)!.localeName.startsWith('nl') ? '(doorlopend)' : '(ongoing)')}',
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
          e.contributionTypeCode ?? (AppLocalizations.of(context)!.localeName.startsWith('nl') ? 'Onbekend' : 'Unknown'),
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

  // ═══════════════════════════════════════════
  //  Payment Actions
  // ═══════════════════════════════════════════
  void _showPaymentActions(MemberPayment payment) {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.visibility),
              title: Text(isDutch ? 'Details bekijken' : 'View Details'),
              onTap: () {
                Navigator.pop(ctx);
                _showPaymentDetails(payment);
              },
            ),
            if (!payment.isReversal)
              ListTile(
                leading: const Icon(Icons.edit),
                title: Text(isDutch ? 'Betaling bewerken' : 'Edit Payment'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showEditPaymentForm(payment);
                },
              ),
            ListTile(
              leading: const Icon(Icons.undo, color: Colors.orange),
              title: Text(isDutch ? 'Betaling terugdraaien' : 'Reverse Payment'),
              onTap: () {
                Navigator.pop(ctx);
                _reversePayment(payment);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: Text(isDutch ? 'Betaling verwijderen' : 'Delete Payment'),
              onTap: () {
                Navigator.pop(ctx);
                _deletePayment(payment);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showPaymentDetails(MemberPayment payment) {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isDutch ? 'Betalingsdetails' : 'Payment Details'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _detailRow(isDutch ? 'Lid' : 'Member', payment.personName ?? (isDutch ? 'Onbekend' : 'Unknown')),
              _detailRow(isDutch ? 'Type' : 'Type', payment.contributionTypeCode ?? ''),
              _detailRow(isDutch ? 'Bedrag' : 'Amount', '${payment.currencySymbol ?? ''} ${payment.amount.toStringAsFixed(2)}'),
              _detailRow(isDutch ? 'Betaaldatum' : 'Payment Date', payment.paymentDate ?? ''),
              if (payment.periodFrom != null)
                _detailRow(isDutch ? 'Periode vanaf' : 'Period From', payment.periodFrom!),
              if (payment.periodTo != null)
                _detailRow(isDutch ? 'Periode t/m' : 'Period To', payment.periodTo!),
              if (payment.reference != null)
                _detailRow(isDutch ? 'Referentie' : 'Reference', payment.reference!),
              if (payment.notes != null && payment.notes!.isNotEmpty)
                _detailRow(isDutch ? 'Notities' : 'Notes', payment.notes!),
              if (payment.isReversal)
                _detailRow(isDutch ? 'Status' : 'Status', isDutch ? 'TERUGGEDRAAID' : 'REVERSAL',
                    textColor: AppColors.error),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(isDutch ? 'Sluiten' : 'Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _showEditPaymentForm(MemberPayment payment) async {
    final result = await showEditPaymentSheet(context, ref, payment: payment);
    if (result == true) {
      _loadData();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payment updated successfully')),
      );
    }
  }

  Future<void> _reversePayment(MemberPayment payment) async {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reverse Payment?'),
        content: Text(
            'Are you sure you want to reverse this payment of ${payment.currencySymbol ?? ''} ${payment.amount.toStringAsFixed(2)}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final messenger = ScaffoldMessenger.of(context);
              try {
                final contributionService =
                    ref.read(contributionServiceProvider);
                await contributionService.reversePayment(payment.id!);
                _loadData();
                messenger.showSnackBar(
                  const SnackBar(
                      content: Text('Payment reversed successfully')),
                );
              } catch (e) {
                messenger.showSnackBar(
                  SnackBar(content: Text('Error: $e')),
                );
              }
            },
            child: const Text('Reverse',
                style: TextStyle(color: Colors.orange)),
          ),
        ],
      ),
    );
  }

  Future<void> _deletePayment(MemberPayment payment) async {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Payment?'),
        content: Text(
            'Are you sure you want to delete this payment of ${payment.currencySymbol ?? ''} ${payment.amount.toStringAsFixed(2)}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final messenger = ScaffoldMessenger.of(context);
              try {
                final contributionService =
                    ref.read(contributionServiceProvider);
                await contributionService.deletePayment(payment.id!);
                _loadData();
                messenger.showSnackBar(
                  const SnackBar(content: Text('Payment deleted')),
                );
              } catch (e) {
                messenger.showSnackBar(
                  SnackBar(content: Text('Error: $e')),
                );
              }
            },
            child: const Text('Delete',
                style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value,
      {Color? textColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(label,
                style: const TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 13)),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                color: textColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatPeriod(String periodFrom, String? periodTo) {
    try {
      final from = DateTime.parse(periodFrom);
      final to = periodTo != null ? DateTime.parse(periodTo) : null;
      
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      if (to != null && (from.year != to.year || from.month != to.month)) {
        return '${months[from.month - 1]} ${from.year} - ${months[to.month - 1]} ${to.year}';
      }
      return '${months[from.month - 1]} ${from.year}';
    } catch (e) {
      return periodFrom;
    }
  }

  Widget _buildActiveBadge(bool isActive) {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.success.withOpacity(0.1)
            : AppColors.stone200,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        isActive ? (isDutch ? 'Actief' : 'Active') : (isDutch ? 'Beëindigd' : 'Ended'),
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
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
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
        _statusLabel(status, isDutch),
        style: TextStyle(
          fontSize: 12,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  String _genderLabel(String? gender) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    switch (gender) {
      case 'M':
        return t.male;
      case 'F':
      case 'V':
        return t.female;
      default:
        return gender ?? (isDutch ? 'Niet opgegeven' : 'Not specified');
    }
  }

  String _formatDate(String dateStr) {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    try {
      final date = DateTime.parse(dateStr);
      final monthsEn = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      final monthsNl = [
        '', 'januari', 'februari', 'maart', 'april', 'mei', 'juni',
        'juli', 'augustus', 'september', 'oktober', 'november', 'december'
      ];
      if (isDutch) {
        return '${date.day} ${monthsNl[date.month]} ${date.year}';
      }
      return '${monthsEn[date.month]} ${date.day}, ${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  String _statusLabel(String? status, bool isDutch) {
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
