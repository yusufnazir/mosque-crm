import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import '../../../core/network/api_exceptions.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_shell.dart';
import '../models/contribution_models.dart';
import '../services/contribution_service.dart';
import '../widgets/add_finance_sheets.dart';
import '../../members/models/member_models.dart';
import '../../members/services/member_service.dart';
import '../../members/models/member_models.dart';
import '../../members/services/member_service.dart';

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
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => appShellScaffoldKey.currentState?.openDrawer(),
        ),
        title: Text(t.contributions),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.gold,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          isScrollable: true,
          tabs: [
            Tab(text: t.types),
            Tab(text: isDutch ? 'Verplichtingen' : 'Obligations'),
            Tab(text: t.payments),
            Tab(text: isDutch ? 'Vrijstellingen' : 'Exemptions'),
            Tab(text: t.assignments),
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
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
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
            ? Center(child: Text(t.noContributionTypes))
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
                            _Badge(t.required, AppColors.gold),
                          _Badge(type.isActive ? t.active : t.inactive,
                              type.isActive ? AppColors.success : AppColors.stone400),
                          if (type.obligations.isNotEmpty)
                            Text(' · ${type.obligations.length} ${isDutch ? 'verplichtingen' : 'obligations'}',
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
                      title: Text('${o.contributionTypeName ?? o.contributionTypeCode ?? ''} — ${o.amount.toStringAsFixed(2)}',
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
  List<ContributionType> _types = [];
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
      final service = ref.read(contributionServiceProvider);
      final results = await Future.wait([
        service.getPayments(page: page, size: 20),
        service.getTypes(),
      ]);
      final result = results[0] as PageResponse<MemberPayment>;
      _payments = result.content;
      _page = result.number;
      _totalPages = result.totalPages;
      _types = results[1] as List<ContributionType>;
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _showAddPaymentFlow() async {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    
    // Show member selector dialog
    final selectedPerson = await showDialog<Person>(
      context: context,
      builder: (ctx) => _MemberSelectorDialog(isDutch: isDutch),
    );

    if (selectedPerson != null && mounted) {
      // Open payment form for selected member
      final success = await showAddPaymentSheet(
        context,
        ref,
        personId: selectedPerson.id!,
      );
      
      if (success == true && mounted) {
        _load(page: _page); // Reload payments list
      }
    }
  }

  void _showPaymentDetails(MemberPayment payment) {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    final typeDisplayName = payment.contributionTypeName ?? payment.contributionTypeCode ?? '-';
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isDutch ? 'Betalingsdetails' : 'Payment Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _detailRow(isDutch ? 'Lid' : 'Member', payment.personName ?? '-'),
              _detailRow('Type', typeDisplayName),
              _detailRow(isDutch ? 'Bedrag' : 'Amount',
                  '${payment.currencySymbol ?? payment.currencyCode ?? ''} ${payment.amount.toStringAsFixed(2)}'),
              _detailRow(isDutch ? 'Betaaldatum' : 'Payment date', payment.paymentDate ?? '-'),
              _detailRow(isDutch ? 'Periode vanaf' : 'Period from', payment.periodFrom ?? '-'),
              _detailRow(isDutch ? 'Periode t/m' : 'Period to', payment.periodTo ?? '-'),
              _detailRow(isDutch ? 'Referentie' : 'Reference', payment.reference ?? '-'),
              if ((payment.notes ?? '').isNotEmpty)
                _detailRow(isDutch ? 'Notities' : 'Notes', payment.notes ?? '-'),
              if (payment.isReversal)
                Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    isDutch ? 'Dit is een teruggedraaide betaling.' : 'This is a reversal payment.',
                    style: TextStyle(
                      color: AppColors.error,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(isDutch ? 'Sluiten' : 'Close'),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(fontSize: 13, color: AppColors.stone700),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }

  Future<void> _showEditPaymentForm(MemberPayment payment) async {
    final result = await showEditPaymentSheet(context, ref, payment: payment);
    if (result == true) {
      await _load(page: _page);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Payment updated'),
          backgroundColor: AppColors.emerald,
        ),
      );
    }
  }

  void _showPaymentActions(MemberPayment p) {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.visibility_outlined, color: AppColors.info),
              title: Text(isDutch ? 'Details bekijken' : 'View Details'),
              onTap: () {
                Navigator.of(ctx).pop();
                _showPaymentDetails(p);
              },
            ),
            if (!p.isReversal)
              ListTile(
                leading: const Icon(Icons.edit, color: AppColors.emerald),
                title: Text(isDutch ? 'Betaling bewerken' : 'Edit Payment'),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _showEditPaymentForm(p);
                },
              ),
            if (!p.isReversal)
              ListTile(
                leading: const Icon(Icons.undo, color: AppColors.warning),
                title: Text(isDutch ? 'Betaling terugdraaien' : 'Reverse Payment'),
                onTap: () async {
                  Navigator.of(ctx).pop();
                  try {
                    await ref.read(contributionServiceProvider).reversePayment(p.id!);
                    _load(page: _page);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(isDutch ? 'Betaling teruggedraaid' : 'Payment reversed'), backgroundColor: AppColors.emerald));
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
              title: Text(isDutch ? 'Betaling verwijderen' : 'Delete Payment', style: const TextStyle(color: AppColors.error)),
              onTap: () async {
                Navigator.of(ctx).pop();
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text(isDutch ? 'Betaling verwijderen' : 'Delete Payment'),
                    content: Text(isDutch ? 'Weet je het zeker?' : 'Are you sure?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(isDutch ? 'Annuleren' : 'Cancel')),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                        onPressed: () => Navigator.of(ctx).pop(true),
                        child: Text(isDutch ? 'Verwijderen' : 'Delete')),
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
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        mini: true,
        backgroundColor: AppColors.emerald,
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: _showAddPaymentFlow,
      ),
      body: RefreshIndicator(
        onRefresh: () => _load(page: _page),
        child: _payments.isEmpty
            ? Center(child: Text(t.noPaymentsFound))
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
                final typeDisplayName = p.contributionTypeName ?? p.contributionTypeCode ?? '-';
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
                    title: Row(
                      children: [
                        Text(
                          '${p.currencySymbol ?? ''} ${p.amount.toStringAsFixed(2)}',
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: p.isReversal ? AppColors.error : null)),
                        if (p.periodFrom != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: Colors.orange.shade200),
                            ),
                            child: Text(
                              _formatPeriod(p.periodFrom!, p.periodTo),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.orange.shade700,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (p.personName != null)
                          Text(p.personName!, style: const TextStyle(fontSize: 13)),
                        Text('$typeDisplayName · ${p.paymentDate ?? ''}',
                            style: const TextStyle(fontSize: 12, color: AppColors.stone500)),
                      ],
                    ),
                    trailing: IconButton(
                      tooltip: isDutch ? 'Acties' : 'Actions',
                      icon: const Icon(Icons.more_vert),
                      onPressed: () => _showPaymentActions(p),
                    ),
                  ),
                );
              },
            ),
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

  Future<void> _showAddExemptionFlow() async {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    
    // Show member selector dialog
    final selectedPerson = await showDialog<Person>(
      context: context,
      builder: (ctx) => _MemberSelectorDialog(isDutch: isDutch),
    );

    if (selectedPerson != null && mounted) {
      // Open exemption form for selected member
      final success = await showAddExemptionSheet(
        context,
        ref,
        personId: selectedPerson.id!,
      );
      
      if (success == true && mounted) {
        _load(); // Reload exemptions list
      }
    }
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
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        mini: true,
        backgroundColor: AppColors.emerald,
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: _showAddExemptionFlow,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _exemptions.isEmpty
            ? Center(child: Text(isDutch ? 'Geen vrijstellingen' : 'No exemptions'))
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
                        Text('${ex.contributionTypeName ?? ex.contributionTypeCode ?? ''} · ${ex.exemptionType ?? ''}',
                            style: const TextStyle(fontSize: 12)),
                        if (ex.reason != null && ex.reason!.isNotEmpty)
                          Text(ex.reason!, style: const TextStyle(fontSize: 12, color: AppColors.stone500)),
                        Text('${ex.startDate ?? ''} — ${ex.endDate ?? (isDutch ? 'doorlopend' : 'ongoing')}',
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

  Future<void> _showAddAssignmentFlow() async {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    
    // Show member selector dialog
    final selectedPerson = await showDialog<Person>(
      context: context,
      builder: (ctx) => _MemberSelectorDialog(isDutch: isDutch),
    );

    if (selectedPerson != null && mounted) {
      // Open assignment form for selected member
      final success = await showAddAssignmentSheet(
        context,
        ref,
        personId: selectedPerson.id!,
      );
      
      if (success == true && mounted) {
        _load(); // Reload assignments list
      }
    }
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
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        mini: true,
        backgroundColor: AppColors.emerald,
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: _showAddAssignmentFlow,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _assignments.isEmpty
            ? Center(child: Text(t.noAssignments))
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
                        Text(a.contributionTypeName ?? a.contributionTypeCode ?? '',
                            style: const TextStyle(fontSize: 12)),
                        Text('${a.startDate ?? ''} — ${a.endDate ?? (isDutch ? 'doorlopend' : 'ongoing')}',
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

// ─── Member Selector Dialog ─────────────────────────────────────────────────

class _MemberSelectorDialog extends ConsumerStatefulWidget {
  final bool isDutch;

  const _MemberSelectorDialog({required this.isDutch});

  @override
  ConsumerState<_MemberSelectorDialog> createState() => _MemberSelectorDialogState();
}

class _MemberSelectorDialogState extends ConsumerState<_MemberSelectorDialog> {
  List<Person> _persons = [];
  List<Person> _filteredPersons = [];
  bool _isLoading = true;
  final _searchController = TextEditingController();

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

  Future<void> _loadPersons() async {
    try {
      final service = ref.read(memberServiceProvider);
      final result = await service.getPersons(page: 0, size: 1000);
      if (mounted) {
        setState(() {
          _persons = result.content;
          _filteredPersons = _persons;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _filterPersons(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredPersons = _persons;
      } else {
        final lowerQuery = query.toLowerCase();
        _filteredPersons = _persons.where((person) {
          final name = '${person.firstName} ${person.lastName ?? ''}'.toLowerCase();
          return name.contains(lowerQuery);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        constraints: const BoxConstraints(maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.emerald,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.isDutch ? 'Selecteer Lid' : 'Select Member',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            
            // Search bar
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _searchController,
                onChanged: _filterPersons,
                decoration: InputDecoration(
                  hintText: widget.isDutch ? 'Zoek lid...' : 'Search member...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),
            
            // Members list
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredPersons.isEmpty
                      ? Center(
                          child: Text(
                            widget.isDutch ? 'Geen leden gevonden' : 'No members found',
                            style: const TextStyle(color: AppColors.stone500),
                          ),
                        )
                      : ListView.builder(
                          itemCount: _filteredPersons.length,
                          itemBuilder: (ctx, i) {
                            final person = _filteredPersons[i];
                            return ListTile(
                              leading: CircleAvatar(
                                backgroundColor: AppColors.emerald.withOpacity(0.1),
                                child: Text(
                                  person.firstName.substring(0, 1).toUpperCase(),
                                  style: const TextStyle(
                                    color: AppColors.emerald,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              title: Text(
                                '${person.firstName} ${person.lastName ?? ''}',
                                style: const TextStyle(fontWeight: FontWeight.w500),
                              ),
                              subtitle: person.email != null
                                  ? Text(person.email!, style: const TextStyle(fontSize: 12))
                                  : null,
                              onTap: () => Navigator.of(context).pop(person),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
