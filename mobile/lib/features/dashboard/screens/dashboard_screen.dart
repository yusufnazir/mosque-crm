import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_shell.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/models/auth_models.dart';
import '../services/dashboard_service.dart';
import '../models/dashboard_models.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  // Stats
  int _totalFamilies = 0;
  int _activeMembers = 0;

  // Chart data
  ContributionTotalReport? _report;
  List<AgeGenderBucket> _ageGenderData = [];
  List<FamilySizeDatum> _familySizeData = [];
  List<AgeBucket> _ageData = [];
  List<GenderDatum> _genderData = [];

  // Year selector
  List<int> _years = [];
  int _selectedYear = DateTime.now().year;

  // Hidden currencies in income chart (toggled by tapping legend)
  final Set<String> _hiddenCurrencies = {};

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
      final service = ref.read(dashboardServiceProvider);

      // Load all data in parallel
      final results = await Future.wait([
        service.getPersonStats(),                // 0
        service.getFamilyCount(),                // 1
        service.getContributionTotals(year: _selectedYear), // 2
        service.getAgeGenderDistribution(),      // 3
        service.getFamilySizeDistribution(),     // 4
        service.getAgeDistribution(),            // 5
        service.getGenderDistribution(),         // 6
        service.getPaymentYears(),               // 7
      ]);

      if (mounted) {
        final stats = results[0] as Map<String, dynamic>;
        final years = results[7] as List<int>;
        setState(() {
          _activeMembers = (stats['active'] as num?)?.toInt() ?? 0;
          _totalFamilies = results[1] as int;
          _report = results[2] as ContributionTotalReport;
          _ageGenderData = results[3] as List<AgeGenderBucket>;
          _familySizeData = results[4] as List<FamilySizeDatum>;
          _ageData = results[5] as List<AgeBucket>;
          _genderData = results[6] as List<GenderDatum>;
          _years = years;
          if (years.isNotEmpty && !years.contains(_selectedYear)) {
            _selectedYear = years.first;
          }
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

  Future<void> _loadContributionData() async {
    try {
      final service = ref.read(dashboardServiceProvider);
      final report = await service.getContributionTotals(year: _selectedYear);
      if (mounted) {
        setState(() => _report = report);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => appShellScaffoldKey.currentState?.openDrawer(),
        ),
        title: Text(t.dashboard),
        actions: [
          if (user != null)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Text(
                  user.username,
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : RefreshIndicator(
                  onRefresh: _loadData,
                  color: AppColors.emerald,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildWelcomeCard(user),
                      const SizedBox(height: 16),
                      _buildStatCards(),
                      const SizedBox(height: 16),
                      _buildIncomeChart(),
                      const SizedBox(height: 16),
                      _buildTwoColumnRow(
                        _buildAgeGenderChart(),
                        _buildFamilySizeChart(),
                      ),
                      const SizedBox(height: 16),
                      _buildTwoColumnRow(
                        _buildAgeDistributionChart(),
                        _buildGenderPieChart(),
                      ),
                      const SizedBox(height: 16),
                      _buildQuickActions(user),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
    );
  }

  Widget _buildError() {
    final t = AppLocalizations.of(context)!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              t.localeName.startsWith('nl')
                ? 'Dashboard laden mislukt'
                : 'Failed to load dashboard',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(_error ?? '',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.stone500)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: Text(t.retry),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeCard(AuthUser? user) {
    final t = AppLocalizations.of(context)!;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.emerald, Color(0xFF065F46)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.dashboard,
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.8), fontSize: 14)),
                const SizedBox(height: 4),
                Text(
                  t.localeName.startsWith('nl')
                    ? 'Welkom in uw beheersysteem'
                    : 'Welcome to your management system',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.9), fontSize: 13)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.mosque, color: AppColors.gold, size: 28),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCards() {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            title: isDutch ? 'Totaal families' : 'Total Families',
            value: '$_totalFamilies',
            icon: Icons.family_restroom,
            color: AppColors.emerald,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            title: t.activeMembers,
            value: '$_activeMembers',
            icon: Icons.check_circle,
            color: AppColors.success,
          ),
        ),
      ],
    );
  }

  // --- Income by Contribution Type (stacked bar) ---
  Widget _buildIncomeChart() {
    final t = AppLocalizations.of(context)!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                    child: Text(
                      t.localeName.startsWith('nl')
                        ? 'Inkomsten per bijdrage-type'
                        : 'Income by Contribution Type',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w600)),
                ),
                // Year dropdown
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.stone300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButton<int>(
                    value: _selectedYear,
                    underline: const SizedBox(),
                    isDense: true,
                    style: TextStyle(fontSize: 13, color: AppColors.charcoal),
                    items: (_years.isEmpty ? [_selectedYear] : _years)
                        .map((y) =>
                            DropdownMenuItem(value: y, child: Text('$y')))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedYear = val);
                        _loadContributionData();
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_report == null || _report!.rows.isEmpty)
              SizedBox(
                height: 120,
                child: Center(
                    child: Text(
                        t.localeName.startsWith('nl')
                            ? 'Geen inkomensgegevens'
                            : 'No income data',
                        style: TextStyle(color: AppColors.stone400))),
              )
            else ...[
              // Tappable legend
              if (_report!.currencies.length > 1)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Wrap(
                    spacing: 12,
                    children: _report!.currencies.asMap().entries.map((e) {
                      final isHidden = _hiddenCurrencies.contains(e.value);
                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            if (isHidden) {
                              _hiddenCurrencies.remove(e.value);
                            } else {
                              _hiddenCurrencies.add(e.value);
                            }
                          });
                        },
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: isHidden
                                    ? AppColors.stone300
                                    : _currencyColor(e.key),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              e.value,
                              style: TextStyle(
                                fontSize: 11,
                                color: isHidden
                                    ? AppColors.stone400
                                    : AppColors.charcoal,
                                decoration: isHidden
                                    ? TextDecoration.lineThrough
                                    : TextDecoration.none,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              SizedBox(
                height: 200,
                child: BarChart(
                  BarChartData(
                    alignment: BarChartAlignment.spaceAround,
                    maxY: _calculateIncomeMaxY(),
                    barTouchData: BarTouchData(
                      touchTooltipData: BarTouchTooltipData(
                        getTooltipItem: (group, groupIndex, rod, rodIndex) {
                          final row = _report!.rows[groupIndex];
                          final currency = _report!.currencies.length > rodIndex
                              ? _report!.currencies[rodIndex]
                              : '';
                          return BarTooltipItem(
                            '${row.contributionTypeName ?? row.contributionTypeCode}\n$currency ${rod.toY.toStringAsFixed(2)}',
                            const TextStyle(color: Colors.white, fontSize: 11),
                          );
                        },
                      ),
                    ),
                    titlesData: FlTitlesData(
                      show: true,
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (value, meta) {
                            final idx = value.toInt();
                            if (idx >= 0 && idx < _report!.rows.length) {
                              final name =
                                  _report!.rows[idx].contributionTypeName ??
                                      _report!.rows[idx].contributionTypeCode ??
                                      '';
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  name.length > 12
                                      ? '${name.substring(0, 12)}…'
                                      : name,
                                  style: const TextStyle(fontSize: 9),
                                ),
                              );
                            }
                            return const Text('');
                          },
                        ),
                      ),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 50,
                          getTitlesWidget: (value, meta) {
                            if (value == meta.max || value == meta.min) {
                              return const SizedBox.shrink();
                            }
                            return Padding(
                              padding: const EdgeInsets.only(right: 4),
                              child: Text(_formatNumber(value),
                                  style: const TextStyle(fontSize: 10)),
                            );
                          },
                        ),
                      ),
                      topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                    ),
                    borderData: FlBorderData(show: false),
                    barGroups: _buildIncomeBarGroups(),
                    gridData: const FlGridData(
                        show: true, drawVerticalLine: false),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // --- Age Distribution by Gender (grouped bar) ---
  Widget _buildAgeGenderChart() {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    if (_ageGenderData.isEmpty) return const SizedBox.shrink();

    final buckets = ['0-12', '13-18', '19-35', '36-60', '60+', 'Unknown'];
    final foundBuckets =
        buckets.where((b) => _ageGenderData.any((d) => d.bucket == b)).toList();
    final genders = ['M', 'V', 'Unknown'];
    final foundGenders =
        genders.where((g) => _ageGenderData.any((d) => d.gender == g)).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isDutch ? 'Leeftijdsverdeling per geslacht' : 'Age Distribution by Gender',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            // Legend
            Wrap(
              spacing: 10,
              children: foundGenders.map((g) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                        width: 10,
                        height: 10,
                        color: _genderColor(g)),
                    const SizedBox(width: 4),
                    Text(_genderLabel(g),
                        style: const TextStyle(fontSize: 10)),
                  ],
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 180,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  barTouchData: BarTouchData(enabled: false),
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final idx = value.toInt();
                          if (idx >= 0 && idx < foundBuckets.length) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 4),
                                child: Text(_bucketLabel(foundBuckets[idx]),
                                  style: const TextStyle(fontSize: 9)),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 30,
                        getTitlesWidget: (value, meta) {
                          if (value == meta.max || value == meta.min) {
                            return const SizedBox.shrink();
                          }
                          return Text(value.toInt().toString(),
                              style: const TextStyle(fontSize: 9));
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(
                      show: true, drawVerticalLine: false),
                  barGroups:
                      foundBuckets.asMap().entries.map((bucketEntry) {
                    final bucketName = bucketEntry.value;
                    return BarChartGroupData(
                      x: bucketEntry.key,
                      barsSpace: 2,
                      barRods: foundGenders.map((gender) {
                        final item = _ageGenderData.firstWhere(
                          (d) =>
                              d.bucket == bucketName && d.gender == gender,
                          orElse: () => AgeGenderBucket(
                              bucket: bucketName, gender: gender, count: 0),
                        );
                        return BarChartRodData(
                          toY: item.count.toDouble(),
                          color: _genderColor(gender),
                          width: 10,
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(2)),
                        );
                      }).toList(),
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Family Size Distribution ---
  Widget _buildFamilySizeChart() {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    if (_familySizeData.isEmpty) return const SizedBox.shrink();

    final sorted = [..._familySizeData]..sort((a, b) => a.size.compareTo(b.size));
    // Ensure 0 children is present
    if (!sorted.any((d) => d.size == 0)) {
      sorted.insert(0, FamilySizeDatum(size: 0, count: 0));
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isDutch ? 'Verdeling gezinsgrootte' : 'Family Size Distribution',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  barTouchData: BarTouchData(enabled: false),
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final idx = value.toInt();
                          if (idx >= 0 && idx < sorted.length) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  isDutch
                                    ? '${sorted[idx].size} kinderen'
                                    : '${sorted[idx].size} children',
                                  style: const TextStyle(fontSize: 8)),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 30,
                        getTitlesWidget: (value, meta) {
                          if (value == meta.max || value == meta.min) {
                            return const SizedBox.shrink();
                          }
                          return Text(value.toInt().toString(),
                              style: const TextStyle(fontSize: 9));
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(
                      show: true, drawVerticalLine: false),
                  barGroups: sorted.asMap().entries.map((e) {
                    return BarChartGroupData(
                      x: e.key,
                      barRods: [
                        BarChartRodData(
                          toY: e.value.count.toDouble(),
                          color: AppColors.emerald,
                          width: 28,
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(3)),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Age Distribution ---
  Widget _buildAgeDistributionChart() {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    if (_ageData.isEmpty) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isDutch ? 'Leeftijdsverdeling' : 'Age Distribution',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  barTouchData: BarTouchData(enabled: false),
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final idx = value.toInt();
                          if (idx >= 0 && idx < _ageData.length) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 4),
                                child: Text(_bucketLabel(_ageData[idx].bucket),
                                  style: const TextStyle(fontSize: 9)),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 35,
                        getTitlesWidget: (value, meta) {
                          if (value == meta.max || value == meta.min) {
                            return const SizedBox.shrink();
                          }
                          return Text(value.toInt().toString(),
                              style: const TextStyle(fontSize: 9));
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(
                      show: true, drawVerticalLine: false),
                  barGroups: _ageData.asMap().entries.map((e) {
                    return BarChartGroupData(
                      x: e.key,
                      barRods: [
                        BarChartRodData(
                          toY: e.value.count.toDouble(),
                          color: AppColors.gold,
                          width: 28,
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(3)),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Gender Pie Chart ---
  Widget _buildGenderPieChart() {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    if (_genderData.isEmpty) return const SizedBox.shrink();

    final total =
        _genderData.fold<int>(0, (sum, d) => sum + d.count);
    if (total == 0) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isDutch ? 'Geslachtsverdeling' : 'Gender Distribution',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            // Legend
            Wrap(
              spacing: 10,
              children: _genderData.map((d) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                        width: 10,
                        height: 10,
                        color: _genderColor(d.gender)),
                    const SizedBox(width: 4),
                    Text(_genderLabel(d.gender),
                        style: const TextStyle(fontSize: 10)),
                  ],
                );
              }).toList(),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 170,
              child: PieChart(
                PieChartData(
                  sections: _genderData.map((d) {
                    final pct = (d.count / total * 100);
                    return PieChartSectionData(
                      value: d.count.toDouble(),
                      color: _genderColor(d.gender),
                      title: '${pct.toStringAsFixed(0)}%',
                      titleStyle: const TextStyle(
                          fontSize: 11,
                          color: Colors.white,
                          fontWeight: FontWeight.bold),
                      radius: 70,
                    );
                  }).toList(),
                  sectionsSpace: 2,
                  centerSpaceRadius: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Quick Actions ---
  Widget _buildQuickActions(AuthUser? user) {
    // Check if user has any relevant permissions
    final hasMembers = user?.hasPermission('member.view') ?? false;
    final hasGroups = user?.hasPermission('group.view') ?? false;
    
    // Don't show quick actions if user has no permissions
    if (!hasMembers && !hasGroups) {
      return const SizedBox.shrink();
    }
    
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    
    final actions = <Widget>[];
    
    if (hasMembers) {
      actions.add(
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => context.go('/members'),
            icon: const Icon(Icons.people_outline),
            label: Text(t.members),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      );
    }
    
    if (hasGroups) {
      if (actions.isNotEmpty) {
        actions.add(const SizedBox(width: 12));
      }
      actions.add(
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => context.go('/groups'),
            icon: const Icon(Icons.groups_outlined),
            label: Text(t.groups),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      );
    }
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isDutch ? 'Snelle acties' : 'Quick Actions',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Row(
              children: actions,
            ),
          ],
        ),
      ),
    );
  }

  // ── Helpers ──

  Widget _buildTwoColumnRow(Widget left, Widget right) {
    final screenWidth = MediaQuery.of(context).size.width;
    if (screenWidth > 600) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: left),
          const SizedBox(width: 12),
          Expanded(child: right),
        ],
      );
    }
    return Column(children: [left, const SizedBox(height: 12), right]);
  }

  String _formatNumber(double value) {
    if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(value % 1000 == 0 ? 0 : 1)}k';
    }
    return value.toInt().toString();
  }

  Color _genderColor(String gender) {
    switch (gender) {
      case 'M':
        return AppColors.emerald;
      case 'F':
      case 'V':
        return AppColors.gold;
      default:
        return AppColors.stone500;
    }
  }

  String _genderLabel(String gender) {
    final t = AppLocalizations.of(context)!;
    switch (gender) {
      case 'M':
        return t.male;
      case 'F':
      case 'V':
        return t.female;
      default:
        return t.localeName.startsWith('nl') ? 'Onbekend' : 'Unknown';
    }
  }

  String _bucketLabel(String bucket) {
    final t = AppLocalizations.of(context)!;
    if ((bucket).toLowerCase() == 'unknown') {
      return t.localeName.startsWith('nl') ? 'Onbekend' : 'Unknown';
    }
    return bucket;
  }

  static const _currencyColors = [
    AppColors.emerald,
    AppColors.gold,
    Color(0xFF0284C7),
    Color(0xFFDC2626),
    Color(0xFF7C3AED),
    Color(0xFFEA580C),
  ];

  Color _currencyColor(int index) =>
      _currencyColors[index % _currencyColors.length];

  double _calculateIncomeMaxY() {
    if (_report == null) return 100;
    double max = 0;
    for (final row in _report!.rows) {
      double rowTotal = 0;
      for (final t in row.totals) {
        if (!_hiddenCurrencies.contains(t.currencyCode)) {
          rowTotal += t.amount;
        }
      }
      if (rowTotal > max) max = rowTotal;
    }
    return max * 1.2;
  }

  List<BarChartGroupData> _buildIncomeBarGroups() {
    if (_report == null || _report!.rows.isEmpty) return [];

    final currencies = _report!.currencies;

    return _report!.rows.asMap().entries.map((entry) {
      final row = entry.value;

      // Stacked: one rod per currency stacked
      if (currencies.length > 1) {
        final visibleTotal = row.totals
            .where((t) => !_hiddenCurrencies.contains(t.currencyCode))
            .fold<double>(0, (s, t) => s + t.amount);
        return BarChartGroupData(
          x: entry.key,
          barRods: [
            BarChartRodData(
              toY: visibleTotal,
              width: 36,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(3)),
              rodStackItems: _buildStackItems(row, currencies),
              color: Colors.transparent,
            ),
          ],
        );
      }

      // Single currency
      final total = row.totals
          .where((t) => !_hiddenCurrencies.contains(t.currencyCode))
          .fold<double>(0, (s, t) => s + t.amount);
      return BarChartGroupData(
        x: entry.key,
        barRods: [
          BarChartRodData(
            toY: total,
            color: _currencyColor(0),
            width: 36,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(3)),
          ),
        ],
      );
    }).toList();
  }

  List<BarChartRodStackItem> _buildStackItems(
      ContributionTotalRow row, List<String> currencies) {
    final items = <BarChartRodStackItem>[];
    double fromY = 0;
    for (int i = 0; i < currencies.length; i++) {
      if (_hiddenCurrencies.contains(currencies[i])) continue;
      final match = row.totals
          .where((t) => t.currencyCode == currencies[i])
          .toList();
      final amount = match.isNotEmpty ? match.first.amount : 0.0;
      if (amount > 0) {
        items.add(BarChartRodStackItem(fromY, fromY + amount, _currencyColor(i)));
        fromY += amount;
      }
    }
    return items;
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: TextStyle(fontSize: 12, color: AppColors.stone500)),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(value,
                    style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppColors.charcoal)),
                const Spacer(),
                Icon(icon, color: color, size: 24),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
