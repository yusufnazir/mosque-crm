import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/theme/app_theme.dart';
import '../services/report_service.dart';

/// Reports screen with Payment Summary and Contribution Totals tabs.
class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports'),
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: AppColors.emerald,
          unselectedLabelColor: AppColors.stone500,
          indicatorColor: AppColors.emerald,
          tabs: const [
            Tab(text: 'Payment Summary'),
            Tab(text: 'Contribution Totals'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: const [
          _PaymentSummaryTab(),
          _ContributionTotalsTab(),
        ],
      ),
    );
  }
}

// ─── Payment Summary Tab ────────────────────────────────────────────────────

class _PaymentSummaryTab extends ConsumerStatefulWidget {
  const _PaymentSummaryTab();

  @override
  ConsumerState<_PaymentSummaryTab> createState() =>
      _PaymentSummaryTabState();
}

class _PaymentSummaryTabState extends ConsumerState<_PaymentSummaryTab>
    with AutomaticKeepAliveClientMixin {
  List<Map<String, dynamic>> _data = [];
  List<int> _years = [];
  int? _selectedYear;
  bool _isLoading = true;
  int _page = 0;
  int _totalPages = 1;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadYears();
  }

  Future<void> _loadYears() async {
    try {
      _years = await ref.read(reportServiceProvider).getPaymentYears();
      if (_years.isNotEmpty) {
        _selectedYear = _years.first;
        _loadData();
      } else {
        setState(() => _isLoading = false);
      }
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadData() async {
    if (_selectedYear == null) return;
    setState(() => _isLoading = true);
    try {
      final result = await ref
          .read(reportServiceProvider)
          .getPaymentSummary(year: _selectedYear!, page: _page, size: 20);
      if (mounted) {
        setState(() {
          _data = List<Map<String, dynamic>>.from(result['content'] ?? []);
          _totalPages = result['totalPages'] ?? 1;
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

  Future<void> _export() async {
    if (_selectedYear == null) return;
    try {
      final data = await ref
          .read(reportServiceProvider)
          .getPaymentSummaryAll(year: _selectedYear!);
      // Convert to CSV string for sharing
      final content = data['content'] as List? ?? [];
      if (content.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No data to export')),
        );
        return;
      }
      final all = content.cast<Map<String, dynamic>>();
      final headers = all.first.keys.join(',');
      final rows = all.map((r) => r.values.map((v) => '"$v"').join(',')).join('\n');
      final csv = '$headers\n$rows';
      await Share.share(csv, subject: 'Payment Summary $_selectedYear');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export error: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Column(
      children: [
        // Filters
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Year selector
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _selectedYear,
                  decoration: const InputDecoration(
                    labelText: 'Year',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: _years
                      .map((y) =>
                          DropdownMenuItem(value: y, child: Text('$y')))
                      .toList(),
                  onChanged: (v) {
                    setState(() {
                      _selectedYear = v;
                      _page = 0;
                    });
                    _loadData();
                  },
                ),
              ),
              const SizedBox(width: 12),
              IconButton(
                icon: const Icon(Icons.share),
                tooltip: 'Export',
                onPressed: _export,
              ),
            ],
          ),
        ),
        if (_isLoading)
          const Expanded(child: Center(child: CircularProgressIndicator()))
        else if (_data.isEmpty)
          const Expanded(child: Center(child: Text('No data for selected year')))
        else
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _data.length,
              itemBuilder: (ctx, i) {
                final row = _data[i];
                final name = row['personName'] ?? row['memberName'] ?? 'Unknown';
                final total = row['totalAmount'] ?? row['total'] ?? 0;
                final paid = row['paidAmount'] ?? row['paid'] ?? 0;
                final outstanding =
                    row['outstandingAmount'] ?? row['outstanding'] ?? 0;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$name',
                            style: const TextStyle(
                                fontWeight: FontWeight.w500, fontSize: 15)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _StatChip('Total', '$total', AppColors.stone600),
                            const SizedBox(width: 8),
                            _StatChip('Paid', '$paid', AppColors.emerald),
                            const SizedBox(width: 8),
                            _StatChip('Outstanding', '$outstanding',
                                AppColors.error),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        // Pagination
        if (!_isLoading && _totalPages > 1)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: _page > 0
                      ? () {
                          setState(() => _page--);
                          _loadData();
                        }
                      : null,
                ),
                Text('Page ${_page + 1} of $_totalPages'),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: _page < _totalPages - 1
                      ? () {
                          setState(() => _page++);
                          _loadData();
                        }
                      : null,
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatChip(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Column(
          children: [
            Text(label,
                style: TextStyle(fontSize: 10, color: color)),
            const SizedBox(height: 2),
            Text(value,
                style: TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600, color: color)),
          ],
        ),
      ),
    );
  }
}

// ─── Contribution Totals Tab ────────────────────────────────────────────────

class _ContributionTotalsTab extends ConsumerStatefulWidget {
  const _ContributionTotalsTab();

  @override
  ConsumerState<_ContributionTotalsTab> createState() =>
      _ContributionTotalsTabState();
}

class _ContributionTotalsTabState
    extends ConsumerState<_ContributionTotalsTab>
    with AutomaticKeepAliveClientMixin {
  List<Map<String, dynamic>> _data = [];
  List<int> _years = [];
  int? _selectedYear;
  bool _isLoading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadYears();
  }

  Future<void> _loadYears() async {
    try {
      _years = await ref.read(reportServiceProvider).getPaymentYears();
      if (_years.isNotEmpty) {
        _selectedYear = _years.first;
        _loadData();
      } else {
        setState(() => _isLoading = false);
      }
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadData() async {
    if (_selectedYear == null) return;
    setState(() => _isLoading = true);
    try {
      final result = await ref
          .read(reportServiceProvider)
          .getContributionTotals(year: _selectedYear!);
      _data = (result['content'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      if (mounted) setState(() => _isLoading = false);
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: DropdownButtonFormField<int>(
            value: _selectedYear,
            decoration: const InputDecoration(
              labelText: 'Year',
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            items: _years
                .map((y) => DropdownMenuItem(value: y, child: Text('$y')))
                .toList(),
            onChanged: (v) {
              setState(() => _selectedYear = v);
              _loadData();
            },
          ),
        ),
        if (_isLoading)
          const Expanded(child: Center(child: CircularProgressIndicator()))
        else if (_data.isEmpty)
          const Expanded(child: Center(child: Text('No data for selected year')))
        else
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _data.length,
              itemBuilder: (ctx, i) {
                final row = _data[i];
                final typeName =
                    row['contributionTypeName'] ?? row['typeName'] ?? 'Unknown';
                final totalExpected =
                    row['totalExpected'] ?? row['expected'] ?? 0;
                final totalPaid = row['totalPaid'] ?? row['paid'] ?? 0;
                final currency = row['currencyCode'] ?? '';

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$typeName',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 15)),
                        if (currency.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text('Currency: $currency',
                                style: const TextStyle(
                                    fontSize: 12, color: AppColors.stone500)),
                          ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _StatChip(
                                'Expected', '$totalExpected', AppColors.stone600),
                            const SizedBox(width: 8),
                            _StatChip('Paid', '$totalPaid', AppColors.emerald),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
