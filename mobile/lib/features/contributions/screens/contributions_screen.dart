import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_shell.dart';
import '../models/contribution_models.dart';
import '../services/contribution_service.dart';

class ContributionsScreen extends ConsumerStatefulWidget {
  const ContributionsScreen({super.key});

  @override
  ConsumerState<ContributionsScreen> createState() =>
      _ContributionsScreenState();
}

class _ContributionsScreenState extends ConsumerState<ContributionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => appShellScaffoldKey.currentState?.openDrawer(),
        ),
        title: const Text('Contributions'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.gold,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Types'),
            Tab(text: 'Obligations'),
            Tab(text: 'Payments'),
            Tab(text: 'Exemptions'),
            Tab(text: 'Assignments'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _TypesTab(),
          _ObligationsTab(),
          _PaymentsTab(),
          _ExemptionsTab(),
          _AssignmentsTab(),
        ],
      ),
    );
  }
}

// ─── Types Tab ──────────────────────────────────────────────────────────────

class _TypesTab extends ConsumerStatefulWidget {
  const _TypesTab();
  @override
  ConsumerState<_TypesTab> createState() => _TypesTabState();
}

class _TypesTabState extends ConsumerState<_TypesTab>
    with AutomaticKeepAliveClientMixin {
  List<ContributionType> _types = [];
  bool _isLoading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      _types = await ref.read(contributionServiceProvider).getTypes();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  void _showTypeForm({ContributionType? type}) {
    final codeCtrl = TextEditingController(text: type?.code ?? '');
    bool isRequired = type?.isRequired ?? false;
    bool isActive = type?.isActive ?? true;
    final enNameCtrl = TextEditingController();
    final nlNameCtrl = TextEditingController();
    if (type != null) {
      for (final t in type.translations) {
        if (t.locale == 'en') enNameCtrl.text = t.name;
        if (t.locale == 'nl') nlNameCtrl.text = t.name;
      }
    }
    bool isEdit = type != null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: 20 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(child: Container(width: 40, height: 4,
                  decoration: BoxDecoration(color: AppColors.stone300,
                    borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 16),
                Text(isEdit ? 'Edit Type' : 'Create Type',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                TextFormField(controller: codeCtrl,
                  decoration: const InputDecoration(labelText: 'Code *'),
                  textCapitalization: TextCapitalization.characters),
                const SizedBox(height: 12),
                TextFormField(controller: enNameCtrl,
                  decoration: const InputDecoration(labelText: 'Name (EN)')),
                const SizedBox(height: 12),
                TextFormField(controller: nlNameCtrl,
                  decoration: const InputDecoration(labelText: 'Name (NL)')),
                const SizedBox(height: 8),
                SwitchListTile(value: isRequired, title: const Text('Required'),
                    activeColor: AppColors.emerald, contentPadding: EdgeInsets.zero,
                    onChanged: (v) => setSheetState(() => isRequired = v)),
                SwitchListTile(value: isActive, title: const Text('Active'),
                    activeColor: AppColors.emerald, contentPadding: EdgeInsets.zero,
                    onChanged: (v) => setSheetState(() => isActive = v)),
                const SizedBox(height: 12),
                SizedBox(width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (codeCtrl.text.trim().isEmpty) return;
                      try {
                        final service = ref.read(contributionServiceProvider);
                        final translations = <Map<String, dynamic>>[];
                        if (enNameCtrl.text.trim().isNotEmpty) {
                          translations.add({'locale': 'en', 'name': enNameCtrl.text.trim()});
                        }
                        if (nlNameCtrl.text.trim().isNotEmpty) {
                          translations.add({'locale': 'nl', 'name': nlNameCtrl.text.trim()});
                        }
                        final data = {
                          'code': codeCtrl.text.trim().toUpperCase(),
                          'isRequired': isRequired,
                          'isActive': isActive,
                          'translations': translations,
                        };
                        if (isEdit) {
                          await service.updateType(type!.id!, data);
                        } else {
                          await service.createType(data);
                        }
                        if (mounted) { Navigator.of(ctx).pop(); _load(); }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error));
                      }
                    },
                    child: Text(isEdit ? 'Save Changes' : 'Create Type'),
                  )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        mini: true,
        backgroundColor: AppColors.emerald,
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: () => _showTypeForm(),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _types.isEmpty
            ? const Center(child: Text('No contribution types'))
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: _types.length,
                itemBuilder: (ctx, i) {
                  final type = _types[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(type.code,
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Row(
                        children: [
                          if (type.isRequired)
                            _Badge('Required', AppColors.gold),
                          _Badge(type.isActive ? 'Active' : 'Inactive',
                              type.isActive ? AppColors.success : AppColors.stone400),
                          if (type.obligations.isNotEmpty)
                            Text(' · ${type.obligations.length} obligations',
                                style: const TextStyle(fontSize: 12, color: AppColors.stone500)),
                        ],
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit, size: 18),
                        onPressed: () => _showTypeForm(type: type),
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

// ─── Obligations Tab ────────────────────────────────────────────────────────

class _ObligationsTab extends ConsumerStatefulWidget {
  const _ObligationsTab();
  @override
  ConsumerState<_ObligationsTab> createState() => _ObligationsTabState();
}

class _ObligationsTabState extends ConsumerState<_ObligationsTab>
    with AutomaticKeepAliveClientMixin {
  List<ContributionObligation> _obligations = [];
  List<ContributionType> _types = [];
  bool _isLoading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final service = ref.read(contributionServiceProvider);
      final results = await Future.wait([
        service.getObligations(),
        service.getTypes(),
      ]);
      _obligations = results[0] as List<ContributionObligation>;
      _types = results[1] as List<ContributionType>;
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  void _showObligationForm({ContributionObligation? obligation}) {
    int? selectedTypeId = obligation?.contributionTypeId;
    final amountCtrl = TextEditingController(
        text: obligation?.amount.toStringAsFixed(2) ?? '');
    String frequency = obligation?.frequency ?? 'MONTHLY';
    final startDateCtrl = TextEditingController(text: obligation?.startDate ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: 20 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(child: Container(width: 40, height: 4,
                  decoration: BoxDecoration(color: AppColors.stone300,
                    borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 16),
                Text(obligation != null ? 'Edit Obligation' : 'Create Obligation',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                DropdownButtonFormField<int>(
                  value: selectedTypeId,
                  decoration: const InputDecoration(labelText: 'Contribution Type *'),
                  items: _types.map((t) => DropdownMenuItem(
                    value: t.id, child: Text(t.code))).toList(),
                  onChanged: (v) => setSheetState(() => selectedTypeId = v),
                ),
                const SizedBox(height: 12),
                TextFormField(controller: amountCtrl,
                  decoration: const InputDecoration(labelText: 'Amount *'),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true)),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: frequency,
                  decoration: const InputDecoration(labelText: 'Frequency'),
                  items: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME']
                      .map((f) => DropdownMenuItem(value: f, child: Text(f)))
                      .toList(),
                  onChanged: (v) => setSheetState(() => frequency = v ?? frequency),
                ),
                const SizedBox(height: 12),
                TextFormField(controller: startDateCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Start Date', hintText: 'YYYY-MM-DD'),
                  readOnly: true,
                  onTap: () async {
                    final date = await showDatePicker(
                      context: ctx,
                      initialDate: DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2035),
                    );
                    if (date != null) {
                      startDateCtrl.text =
                          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                    }
                  }),
                const SizedBox(height: 20),
                SizedBox(width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (selectedTypeId == null || amountCtrl.text.isEmpty) return;
                      try {
                        final service = ref.read(contributionServiceProvider);
                        final data = {
                          'contributionTypeId': selectedTypeId,
                          'amount': double.parse(amountCtrl.text.trim()),
                          'frequency': frequency,
                          if (startDateCtrl.text.isNotEmpty)
                            'startDate': startDateCtrl.text.trim(),
                        };
                        if (obligation != null) {
                          await service.updateObligation(obligation.id!, data);
                        } else {
                          await service.createObligation(data);
                        }
                        if (mounted) { Navigator.of(ctx).pop(); _load(); }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Error: $e'),
                              backgroundColor: AppColors.error));
                      }
                    },
                    child: Text(obligation != null ? 'Save' : 'Create'),
                  )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        mini: true, backgroundColor: AppColors.emerald,
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: () => _showObligationForm(),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _obligations.isEmpty
            ? const Center(child: Text('No obligations'))
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: _obligations.length,
                itemBuilder: (ctx, i) {
                  final o = _obligations[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.emerald.withOpacity(0.1),
                        child: Text(o.currencySymbol ?? '\$',
                            style: const TextStyle(color: AppColors.emerald, fontWeight: FontWeight.w600)),
                      ),
                      title: Text('${o.contributionTypeCode ?? ''} — ${o.amount.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w500)),
                      subtitle: Text('${o.frequency ?? ''} · ${o.currencyCode ?? ''}',
                          style: const TextStyle(fontSize: 12)),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit, size: 18),
                        onPressed: () => _showObligationForm(obligation: o),
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

// ─── Payments Tab ───────────────────────────────────────────────────────────

class _PaymentsTab extends ConsumerStatefulWidget {
  const _PaymentsTab();
  @override
  ConsumerState<_PaymentsTab> createState() => _PaymentsTabState();
}

class _PaymentsTabState extends ConsumerState<_PaymentsTab>
    with AutomaticKeepAliveClientMixin {
  List<MemberPayment> _payments = [];
  bool _isLoading = true;
  int _page = 0;
  int _totalPages = 0;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({int page = 0}) async {
    setState(() => _isLoading = true);
    try {
      final result = await ref
          .read(contributionServiceProvider)
          .getPayments(page: page, size: 20);
      _payments = result.content;
      _page = result.number;
      _totalPages = result.totalPages;
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  void _showPaymentActions(MemberPayment p) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            if (!p.isReversal)
              ListTile(
                leading: const Icon(Icons.undo, color: AppColors.warning),
                title: const Text('Reverse Payment'),
                onTap: () async {
                  Navigator.of(ctx).pop();
                  try {
                    await ref.read(contributionServiceProvider).reversePayment(p.id!);
                    _load(page: _page);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Payment reversed'), backgroundColor: AppColors.emerald));
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error));
                    }
                  }
                },
              ),
            ListTile(
              leading: const Icon(Icons.delete, color: AppColors.error),
              title: const Text('Delete Payment', style: TextStyle(color: AppColors.error)),
              onTap: () async {
                Navigator.of(ctx).pop();
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Delete Payment'),
                    content: const Text('Are you sure?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                        onPressed: () => Navigator.of(ctx).pop(true),
                        child: const Text('Delete')),
                    ],
                  ),
                );
                if (confirmed == true) {
                  try {
                    await ref.read(contributionServiceProvider).deletePayment(p.id!);
                    _load(page: _page);
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error));
                    }
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: () => _load(page: _page),
      child: _payments.isEmpty
          ? const Center(child: Text('No payments found'))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _payments.length + (_totalPages > 1 ? 1 : 0),
              itemBuilder: (ctx, i) {
                if (i == _payments.length) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(icon: const Icon(Icons.chevron_left),
                          onPressed: _page > 0 ? () => _load(page: _page - 1) : null),
                        Text('${_page + 1} / $_totalPages'),
                        IconButton(icon: const Icon(Icons.chevron_right),
                          onPressed: _page < _totalPages - 1 ? () => _load(page: _page + 1) : null),
                      ],
                    ),
                  );
                }
                final p = _payments[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    onLongPress: () => _showPaymentActions(p),
                    leading: CircleAvatar(
                      backgroundColor: p.isReversal
                          ? AppColors.error.withOpacity(0.1)
                          : AppColors.emerald.withOpacity(0.1),
                      child: Icon(
                        p.isReversal ? Icons.undo : Icons.payment,
                        color: p.isReversal ? AppColors.error : AppColors.emerald,
                        size: 20),
                    ),
                    title: Text(
                      '${p.currencySymbol ?? ''} ${p.amount.toStringAsFixed(2)}',
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: p.isReversal ? AppColors.error : null)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (p.personName != null)
                          Text(p.personName!, style: const TextStyle(fontSize: 13)),
                        Text('${p.contributionTypeCode ?? ''} · ${p.paymentDate ?? ''}',
                            style: const TextStyle(fontSize: 12, color: AppColors.stone500)),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// ─── Exemptions Tab ─────────────────────────────────────────────────────────

class _ExemptionsTab extends ConsumerStatefulWidget {
  const _ExemptionsTab();
  @override
  ConsumerState<_ExemptionsTab> createState() => _ExemptionsTabState();
}

class _ExemptionsTabState extends ConsumerState<_ExemptionsTab>
    with AutomaticKeepAliveClientMixin {
  List<ContributionExemption> _exemptions = [];
  bool _isLoading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      _exemptions = await ref.read(contributionServiceProvider).getExemptions();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _delete(ContributionExemption ex) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Exemption'),
        content: Text('Remove exemption for ${ex.personName ?? 'member'}?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        await ref.read(contributionServiceProvider).deleteExemption(ex.id!);
        _load();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: _exemptions.isEmpty
          ? const Center(child: Text('No exemptions'))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _exemptions.length,
              itemBuilder: (ctx, i) {
                final ex = _exemptions[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppColors.warning.withOpacity(0.1),
                      child: const Icon(Icons.remove_circle_outline,
                          color: AppColors.warning, size: 20),
                    ),
                    title: Text(ex.personName ?? 'Unknown',
                        style: const TextStyle(fontWeight: FontWeight.w500)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${ex.contributionTypeCode ?? ''} · ${ex.exemptionType ?? ''}',
                            style: const TextStyle(fontSize: 12)),
                        if (ex.reason != null && ex.reason!.isNotEmpty)
                          Text(ex.reason!, style: const TextStyle(fontSize: 12, color: AppColors.stone500)),
                        Text('${ex.startDate ?? ''} — ${ex.endDate ?? 'ongoing'}',
                            style: const TextStyle(fontSize: 12, color: AppColors.stone500)),
                      ],
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete, size: 18, color: AppColors.error),
                      onPressed: () => _delete(ex),
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// ─── Assignments Tab ────────────────────────────────────────────────────────

class _AssignmentsTab extends ConsumerStatefulWidget {
  const _AssignmentsTab();
  @override
  ConsumerState<_AssignmentsTab> createState() => _AssignmentsTabState();
}

class _AssignmentsTabState extends ConsumerState<_AssignmentsTab>
    with AutomaticKeepAliveClientMixin {
  List<ContributionAssignment> _assignments = [];
  bool _isLoading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      _assignments = await ref.read(contributionServiceProvider).getAssignments();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _toggle(ContributionAssignment a) async {
    try {
      await ref.read(contributionServiceProvider).toggleAssignment(a.id!);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error));
      }
    }
  }

  Future<void> _delete(ContributionAssignment a) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Assignment'),
        content: Text('Remove assignment for ${a.personName ?? 'member'}?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        await ref.read(contributionServiceProvider).deleteAssignment(a.id!);
        _load();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: _assignments.isEmpty
          ? const Center(child: Text('No assignments'))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _assignments.length,
              itemBuilder: (ctx, i) {
                final a = _assignments[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: a.isActive
                          ? AppColors.emerald.withOpacity(0.1)
                          : AppColors.stone200,
                      child: Icon(Icons.assignment,
                          color: a.isActive ? AppColors.emerald : AppColors.stone400,
                          size: 20),
                    ),
                    title: Text(a.personName ?? 'Unknown',
                        style: const TextStyle(fontWeight: FontWeight.w500)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(a.contributionTypeCode ?? '',
                            style: const TextStyle(fontSize: 12)),
                        Text('${a.startDate ?? ''} — ${a.endDate ?? 'ongoing'}',
                            style: const TextStyle(fontSize: 12, color: AppColors.stone500)),
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Switch(
                          value: a.isActive,
                          activeColor: AppColors.emerald,
                          onChanged: (_) => _toggle(a),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, size: 18, color: AppColors.error),
                          onPressed: () => _delete(a),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// ─── Shared Widgets ─────────────────────────────────────────────────────────

class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  const _Badge(this.text, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(text,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: color)),
    );
  }
}
