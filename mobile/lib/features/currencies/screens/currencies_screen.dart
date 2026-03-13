import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../services/currency_service.dart';

/// Currencies management screen with 3 tabs:
/// Mosque Currencies, Exchange Rates, All Currencies.
class CurrenciesScreen extends ConsumerStatefulWidget {
  const CurrenciesScreen({super.key});

  @override
  ConsumerState<CurrenciesScreen> createState() => _CurrenciesScreenState();
}

class _CurrenciesScreenState extends ConsumerState<CurrenciesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    return Scaffold(
      appBar: AppBar(
        title: Text(isDutch ? 'Valuta' : 'Currencies'),
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: AppColors.emerald,
          unselectedLabelColor: AppColors.stone500,
          indicatorColor: AppColors.emerald,
          tabs: [
            Tab(text: isDutch ? 'Moskee' : 'Mosque'),
            Tab(text: isDutch ? 'Koersen' : 'Rates'),
            Tab(text: isDutch ? 'Alle' : 'All'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: const [
          _MosqueCurrenciesTab(),
          _ExchangeRatesTab(),
          _AllCurrenciesTab(),
        ],
      ),
    );
  }
}

// ─── Mosque Currencies Tab ──────────────────────────────────────────────────

class _MosqueCurrenciesTab extends ConsumerStatefulWidget {
  const _MosqueCurrenciesTab();

  @override
  ConsumerState<_MosqueCurrenciesTab> createState() =>
      _MosqueCurrenciesTabState();
}

class _MosqueCurrenciesTabState extends ConsumerState<_MosqueCurrenciesTab>
    with AutomaticKeepAliveClientMixin {
  List<MosqueCurrency> _items = [];
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
      _items = await ref.read(currencyServiceProvider).getMosqueCurrencies();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _setPrimary(MosqueCurrency mc) async {
    try {
      await ref.read(currencyServiceProvider).setPrimary(mc.id!);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _remove(MosqueCurrency mc) async {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isDutch ? 'Valuta verwijderen' : 'Remove Currency'),
        content: Text('${isDutch ? 'Verwijder' : 'Remove'} ${mc.currencyCode}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(isDutch ? 'Annuleren' : 'Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(isDutch ? 'Verwijderen' : 'Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(currencyServiceProvider).removeMosqueCurrency(mc.id!);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  void _showAddSheet() async {
    List<Currency> allCurrencies = [];
    try {
      allCurrencies = await ref.read(currencyServiceProvider).getAllCurrencies();
    } catch (_) {}

    if (!mounted) return;

    final existing = _items.map((m) => m.currencyCode).toSet();
    final available =
        allCurrencies.where((c) => !existing.contains(c.code)).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        String search = '';
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final filtered = available.where((c) {
              if (search.isEmpty) return true;
              return c.code.toLowerCase().contains(search.toLowerCase()) ||
                  (c.name ?? '').toLowerCase().contains(search.toLowerCase());
            }).toList();

            return Container(
              constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(ctx).size.height * 0.7),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius:
                    BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.stone300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: TextField(
                      decoration: const InputDecoration(
                        hintText: 'Search currencies...',
                        prefixIcon: Icon(Icons.search),
                      ),
                      onChanged: (v) => setSheetState(() => search = v),
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (ctx, i) {
                        final c = filtered[i];
                        return ListTile(
                          title: Text('${c.code} — ${c.name}'),
                          subtitle: Text('Symbol: ${c.symbol}'),
                          trailing: IconButton(
                            icon: const Icon(Icons.add_circle,
                                color: AppColors.emerald),
                            onPressed: () async {
                              Navigator.of(ctx).pop();
                              try {
                                await ref
                                    .read(currencyServiceProvider)
                                    .addMosqueCurrency({
                                  'currencyCode': c.code,
                                  'active': true,
                                });
                                _load();
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
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Text('${_items.length} ${isDutch ? 'valuta geconfigureerd' : 'currencies configured'}',
                  style:
                      const TextStyle(fontSize: 13, color: AppColors.stone500)),
              const Spacer(),
              TextButton.icon(
                icon: const Icon(Icons.add, size: 18),
                label: Text(isDutch ? 'Toevoegen' : 'Add'),
                onPressed: _showAddSheet,
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView.builder(
              itemCount: _items.length,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemBuilder: (ctx, i) {
                final mc = _items[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: mc.isPrimary
                          ? AppColors.gold.withOpacity(0.2)
                          : AppColors.stone200,
                      child: Text(mc.currencySymbol ?? (mc.currencyCode ?? '?')[0],
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: mc.isPrimary
                                ? AppColors.gold
                                : AppColors.stone600,
                          )),
                    ),
                    title: Row(
                      children: [
                        Text(mc.currencyCode ?? '',
                            style:
                                const TextStyle(fontWeight: FontWeight.w500)),
                        if (mc.isPrimary)
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(isDutch ? 'Primair' : 'Primary',
                              style: const TextStyle(
                                fontSize: 10, color: AppColors.gold)),
                          ),
                      ],
                    ),
                    subtitle: Text(mc.currencyName ?? '',
                        style: const TextStyle(fontSize: 12)),
                    trailing: PopupMenuButton(
                      itemBuilder: (_) => [
                        if (!mc.isPrimary)
                          PopupMenuItem(
                              value: 'primary',
                              child: Text(isDutch ? 'Als primair instellen' : 'Set as Primary')),
                        PopupMenuItem(
                          value: 'remove',
                          child: Text(isDutch ? 'Verwijderen' : 'Remove',
                              style: TextStyle(color: AppColors.error)),
                        ),
                      ],
                      onSelected: (v) {
                        if (v == 'primary') _setPrimary(mc);
                        if (v == 'remove') _remove(mc);
                      },
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Exchange Rates Tab ─────────────────────────────────────────────────────

class _ExchangeRatesTab extends ConsumerStatefulWidget {
  const _ExchangeRatesTab();

  @override
  ConsumerState<_ExchangeRatesTab> createState() => _ExchangeRatesTabState();
}

class _ExchangeRatesTabState extends ConsumerState<_ExchangeRatesTab>
    with AutomaticKeepAliveClientMixin {
  List<ExchangeRate> _rates = [];
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
      _rates = await ref.read(currencyServiceProvider).getExchangeRates();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  void _showRateForm({ExchangeRate? rate}) {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    final fromCtrl = TextEditingController(text: rate?.fromCurrencyCode ?? '');
    final toCtrl = TextEditingController(text: rate?.toCurrencyCode ?? '');
    final rateCtrl =
        TextEditingController(text: rate?.rate?.toString() ?? '');
    bool isEdit = rate != null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: 20 + MediaQuery.of(ctx).viewInsets.bottom,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: AppColors.stone300,
                borderRadius: BorderRadius.circular(2),
              ),
            )),
            const SizedBox(height: 16),
            Text(isEdit ? (isDutch ? 'Koers bewerken' : 'Edit Rate') : (isDutch ? 'Koers toevoegen' : 'Add Rate'),
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: fromCtrl,
                    decoration: InputDecoration(labelText: isDutch ? 'Van *' : 'From *'),
                    textCapitalization: TextCapitalization.characters,
                    readOnly: isEdit,
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.arrow_forward, size: 20),
                ),
                Expanded(
                  child: TextFormField(
                    controller: toCtrl,
                    decoration: InputDecoration(labelText: isDutch ? 'Naar *' : 'To *'),
                    textCapitalization: TextCapitalization.characters,
                    readOnly: isEdit,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: rateCtrl,
              decoration: InputDecoration(labelText: isDutch ? 'Koers *' : 'Rate *'),
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  if (fromCtrl.text.isEmpty ||
                      toCtrl.text.isEmpty ||
                      rateCtrl.text.isEmpty) return;
                  try {
                    final service = ref.read(currencyServiceProvider);
                    final data = {
                      'fromCurrency': fromCtrl.text.trim().toUpperCase(),
                      'toCurrency': toCtrl.text.trim().toUpperCase(),
                      'rate': double.parse(rateCtrl.text.trim()),
                    };
                    if (isEdit) {
                      await service.updateExchangeRate(rate!.id!, data);
                    } else {
                      await service.createExchangeRate(data);
                    }
                    if (mounted) {
                      Navigator.of(ctx).pop();
                      _load();
                    }
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text('Error: $e'),
                          backgroundColor: AppColors.error),
                    );
                  }
                },
                child: Text(isEdit ? (isDutch ? 'Opslaan' : 'Save') : (isDutch ? 'Koers toevoegen' : 'Add Rate')),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteRate(ExchangeRate rate) async {
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isDutch ? 'Koers verwijderen' : 'Delete Rate'),
        content: Text(
            '${isDutch ? 'Verwijder' : 'Delete'} ${rate.fromCurrencyCode} → ${rate.toCurrencyCode}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(isDutch ? 'Annuleren' : 'Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(isDutch ? 'Verwijderen' : 'Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(currencyServiceProvider).deleteExchangeRate(rate.id!);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Text('${_rates.length} ${isDutch ? 'wisselkoersen' : 'exchange rates'}',
                  style:
                      const TextStyle(fontSize: 13, color: AppColors.stone500)),
              const Spacer(),
              TextButton.icon(
                icon: const Icon(Icons.add, size: 18),
                label: Text(isDutch ? 'Toevoegen' : 'Add'),
                onPressed: () => _showRateForm(),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView.builder(
              itemCount: _rates.length,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemBuilder: (ctx, i) {
                final r = _rates[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(
                        '${r.fromCurrencyCode} → ${r.toCurrencyCode}',
                        style:
                            const TextStyle(fontWeight: FontWeight.w500)),
                    subtitle: Text('${isDutch ? 'Koers' : 'Rate'}: ${r.rate}',
                        style: const TextStyle(fontSize: 13)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit, size: 18),
                          onPressed: () => _showRateForm(rate: r),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete,
                              size: 18, color: AppColors.error),
                          onPressed: () => _deleteRate(r),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

// ─── All Currencies Tab ─────────────────────────────────────────────────────

class _AllCurrenciesTab extends ConsumerStatefulWidget {
  const _AllCurrenciesTab();

  @override
  ConsumerState<_AllCurrenciesTab> createState() => _AllCurrenciesTabState();
}

class _AllCurrenciesTabState extends ConsumerState<_AllCurrenciesTab>
    with AutomaticKeepAliveClientMixin {
  List<Currency> _all = [];
  bool _isLoading = true;
  String _search = '';

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
      _all = await ref.read(currencyServiceProvider).getAllCurrencies();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  List<Currency> get _filtered {
    if (_search.isEmpty) return _all;
    final q = _search.toLowerCase();
    return _all
        .where((c) =>
            c.code.toLowerCase().contains(q) ||
            (c.name ?? '').toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final isDutch = AppLocalizations.of(context)!.localeName.startsWith('nl');
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    final filtered = _filtered;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            decoration: InputDecoration(
              hintText: isDutch ? 'Zoek valuta...' : 'Search currencies...',
              prefixIcon: Icon(Icons.search),
              filled: true,
              fillColor: Colors.white,
            ),
            onChanged: (v) => setState(() => _search = v),
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: filtered.length,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemBuilder: (ctx, i) {
              final c = filtered[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 4),
                child: ListTile(
                  dense: true,
                  leading: CircleAvatar(
                    radius: 16,
                    backgroundColor: AppColors.stone200,
                    child: Text(c.symbol ?? c.code[0],
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                  title:
                      Text(c.code, style: const TextStyle(fontWeight: FontWeight.w500)),
                  subtitle: Text(c.name ?? '', style: const TextStyle(fontSize: 12)),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
