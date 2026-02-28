import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../models/contribution_models.dart';
import '../services/contribution_service.dart';
import '../../currencies/services/currency_service.dart';

// ═══════════════════════════════════════════════════════════════
//  Add Payment Bottom Sheet
// ═══════════════════════════════════════════════════════════════

Future<bool?> showAddPaymentSheet(
  BuildContext context,
  WidgetRef ref, {
  required int personId,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _AddPaymentSheet(ref: ref, personId: personId),
  );
}

class _AddPaymentSheet extends StatefulWidget {
  final WidgetRef ref;
  final int personId;

  const _AddPaymentSheet({required this.ref, required this.personId});

  @override
  State<_AddPaymentSheet> createState() => _AddPaymentSheetState();
}

class _AddPaymentSheetState extends State<_AddPaymentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _referenceCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  List<ContributionType> _types = [];
  ContributionType? _selectedType;
  List<dynamic> _currencies = []; // List<MosqueCurrency> or List<Currency>
  int? _selectedCurrencyId; // Store currency ID for reliable matching
  String _paymentDate = '';
  int? _periodFromMonth;
  int? _periodFromYear;
  int? _periodToMonth;
  int? _periodToYear;
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _paymentDate =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    _periodFromMonth = now.month;
    _periodFromYear = now.year;
    _periodToMonth = now.month;
    _periodToYear = now.year;
    _loadData();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _referenceCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final service = widget.ref.read(contributionServiceProvider);
      final currencyService = widget.ref.read(currencyServiceProvider);
      
      final results = await Future.wait([
        service.getActiveTypes(),
        currencyService.getMosqueCurrencies(),
      ]);
      
      if (mounted) {
        setState(() {
          _types = results[0] as List<ContributionType>;
          _currencies = results[1];
          // Set default selected currency to the first one's ID
          if (_currencies.isNotEmpty) {
            final firstCurrency = _currencies.first;
            if (firstCurrency is MosqueCurrency) {
              _selectedCurrencyId = firstCurrency.currencyId;
            } else if (firstCurrency is Map<String, dynamic>) {
              _selectedCurrencyId = firstCurrency['currencyId'] ?? firstCurrency['id'];
            }
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

  void _onTypeSelected(ContributionType? type) {
    setState(() {
      _selectedType = type;
      // Auto-fill amount from obligation if available
      if (type != null && type.obligations.isNotEmpty) {
        final obl = type.obligations.first;
        _amountCtrl.text = obl.amount.toStringAsFixed(2);
        
        // Preselect currency from obligation if available
        if (obl.currencyId != null) {
          // Find currency by ID
          for (final c in _currencies) {
            int? currencyId;
            if (c is MosqueCurrency) {
              currencyId = c.currencyId;
            } else if (c is Map<String, dynamic>) {
              currencyId = c['currencyId'] ?? c['id'] as int?;
            }
            
            if (currencyId == obl.currencyId) {
              _selectedCurrencyId = obl.currencyId;
              return;
            }
          }
        } else if (obl.currencyCode != null) {
          // Find currency by code
          for (final c in _currencies) {
            String? code;
            int? currencyId;
            
            if (c is MosqueCurrency) {
              code = c.currencyCode;
              currencyId = c.currencyId;
            } else if (c is Map<String, dynamic>) {
              code = c['currencyCode'] ?? c['code'] as String?;
              currencyId = c['currencyId'] ?? c['id'] as int?;
            }
            
            if (code == obl.currencyCode && currencyId != null) {
              _selectedCurrencyId = currencyId;
              return;
            }
          }
        }
      }
    });
  }

  Future<void> _pickDate(String label, String current,
      ValueChanged<String> onPicked) async {
    final initial = current.isNotEmpty
        ? DateTime.tryParse(current) ?? DateTime.now()
        : DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppColors.emerald,
            onPrimary: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      onPicked(
          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedType == null) {
      setState(() => _error = 'Please select a contribution type');
      return;
    }
    if (_selectedCurrencyId == null) {
      setState(() => _error = 'Please select a currency');
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      final service = widget.ref.read(contributionServiceProvider);
      final amount = double.parse(_amountCtrl.text.trim());
      final frequency = _frequency;
      final periodCount = _periodCount;

      // Fetch existing payments for overlap detection
      final existingPayments = await service.getPaymentsByPerson(widget.personId);

      // Build base payment data
      final baseData = <String, dynamic>{
        'personId': widget.personId,
        'contributionTypeId': _selectedType!.id,
        'currencyId': _selectedCurrencyId,
        'paymentDate': _paymentDate,
      };
      
      if (_referenceCtrl.text.trim().isNotEmpty) {
        baseData['reference'] = _referenceCtrl.text.trim();
      }
      if (_notesCtrl.text.trim().isNotEmpty) {
        baseData['notes'] = _notesCtrl.text.trim();
      }

      int createdCount = 0;
      int skippedCount = 0;
      final List<String> skippedPeriods = [];

      // Check if we need to create multiple periodic payments
      if (frequency == 'MONTHLY' && 
          periodCount > 1 && 
          _periodFromMonth != null && 
          _periodFromYear != null) {
        
        // Create multiple monthly payments
        int year = _periodFromYear!;
        int month = _periodFromMonth!;

        for (int i = 0; i < periodCount; i++) {
          final lastDay = DateTime(year, month + 1, 0).day;
          final periodFrom = '$year-${month.toString().padLeft(2, '0')}-01';
          final periodTo = '$year-${month.toString().padLeft(2, '0')}-${lastDay.toString().padLeft(2, '0')}';

          // Check if this period is already paid
          if (_isPeriodAlreadyPaid(periodFrom, periodTo, existingPayments)) {
            skippedCount++;
            skippedPeriods.add(_formatMonthLabel(year, month));
          } else {
            final paymentData = {
              ...baseData,
              'amount': amount,
              'periodFrom': periodFrom,
              'periodTo': periodTo,
            };

            await service.createPayment(paymentData);
            createdCount++;
          }

          // Move to next month
          month++;
          if (month > 12) {
            month = 1;
            year++;
          }
        }
      } else if (frequency == 'YEARLY' && 
                 periodCount > 1 && 
                 _periodFromYear != null && 
                 _periodToYear != null) {
        
        // Create multiple yearly payments
        for (int year = _periodFromYear!; year <= _periodToYear!; year++) {
          final periodFrom = '$year-01-01';
          final periodTo = '$year-12-31';

          // Check if this period is already paid
          if (_isPeriodAlreadyPaid(periodFrom, periodTo, existingPayments)) {
            skippedCount++;
            skippedPeriods.add(year.toString());
          } else {
            final paymentData = {
              ...baseData,
              'amount': amount,
              'periodFrom': periodFrom,
              'periodTo': periodTo,
            };

            await service.createPayment(paymentData);
            createdCount++;
          }
        }
      } else {
        // Single payment
        final data = {
          ...baseData,
          'amount': amount,
        };
        
        if (_periodFromMonth != null && _periodFromYear != null) {
          data['periodFrom'] =
              '$_periodFromYear-${_periodFromMonth.toString().padLeft(2, '0')}-01';
        }
        if (_periodToMonth != null && _periodToYear != null) {
          final lastDay =
              DateTime(_periodToYear!, _periodToMonth! + 1, 0).day;
          data['periodTo'] =
              '$_periodToYear-${_periodToMonth.toString().padLeft(2, '0')}-${lastDay.toString().padLeft(2, '0')}';
        }

        await service.createPayment(data);
        createdCount = 1;
      }

      if (mounted) {
        // Show summary if some periods were skipped
        if (skippedCount > 0) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                createdCount > 0
                    ? 'Created $createdCount payment(s), skipped $skippedCount already paid period(s)'
                    : 'All $skippedCount period(s) are already paid',
              ),
              backgroundColor: createdCount > 0 ? AppColors.emerald : Colors.orange,
              duration: const Duration(seconds: 4),
            ),
          );
        }
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isSaving = false;
      });
    }
  }

  /// Check if a period overlaps with any existing payments for the same person and contribution type.
  bool _isPeriodAlreadyPaid(String periodFrom, String periodTo, List<MemberPayment> existingPayments) {
    return existingPayments.any((p) =>
        p.contributionTypeId == _selectedType!.id &&
        p.periodFrom != null &&
        p.periodTo != null &&
        p.periodFrom!.compareTo(periodTo) <= 0 &&
        p.periodTo!.compareTo(periodFrom) >= 0);
  }

  /// Format a month label like "Jan 2026".
  String _formatMonthLabel(int year, int month) {
    final monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${monthNames[month - 1]} $year';
  }

  /// Calculate the number of periods between from and to.
  int get _periodCount {
    if (_periodFromMonth == null ||
        _periodFromYear == null ||
        _periodToMonth == null ||
        _periodToYear == null) return 0;
    final count = (_periodToYear! - _periodFromYear!) * 12 +
        (_periodToMonth! - _periodFromMonth!) +
        1;
    return count < 0 ? 0 : count;
  }

  /// Get the active obligation for the selected type.
  ContributionObligation? get _activeObligation {
    if (_selectedType == null || _selectedType!.obligations.isEmpty) {
      return null;
    }
    return _selectedType!.obligations.first;
  }

  String? get _frequency => _activeObligation?.frequency;

  @override
  Widget build(BuildContext context) {
    final obl = _activeObligation;
    final count = _periodCount;
    final amountVal = double.tryParse(_amountCtrl.text.trim());

    return _BottomSheetWrapper(
      title: 'Add Payment',
      icon: Icons.payment,
      isLoading: _isLoading,
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_error != null) _ErrorBanner(message: _error!),

            // ── Contribution Type ──
            DropdownButtonFormField<ContributionType>(
              value: _selectedType,
              decoration: _inputDecoration('Contribution Type'),
              items: _types
                  .map((t) => DropdownMenuItem(
                        value: t,
                        child: Text(t.code),
                      ))
                  .toList(),
              onChanged: _onTypeSelected,
              validator: (v) => v == null ? 'Required' : null,
            ),
            const SizedBox(height: 16),

            // ── Period Section (bordered card) ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.stone50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.stone200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header: "Period (Monthly)" + "X months"
                  Row(
                    children: [
                      Text('Period',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.stone600)),
                      if (_frequency != null) ...[
                        const SizedBox(width: 4),
                        Text(
                            '(${_frequency == 'MONTHLY' ? 'Monthly' : 'Yearly'})',
                            style: TextStyle(
                                fontSize: 12,
                                color: AppColors.stone400,
                                fontStyle: FontStyle.italic)),
                      ],
                      const Spacer(),
                      if (count > 0)
                        Text(
                            '$count ${_frequency == 'YEARLY' ? (count == 1 ? 'year' : 'years') : (count == 1 ? 'month' : 'months')}',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.emerald)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Period From / To pickers
                  Row(
                    children: [
                      Expanded(
                        child: _MonthYearPicker(
                          label: 'Period From',
                          month: _periodFromMonth,
                          year: _periodFromYear,
                          onMonthChanged: (m) =>
                              setState(() => _periodFromMonth = m),
                          onYearChanged: (y) =>
                              setState(() => _periodFromYear = y),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _MonthYearPicker(
                          label: 'Period To',
                          month: _periodToMonth,
                          year: _periodToYear,
                          onMonthChanged: (m) =>
                              setState(() => _periodToMonth = m),
                          onYearChanged: (y) =>
                              setState(() => _periodToYear = y),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Amount ──
            TextFormField(
              controller: _amountCtrl,
              decoration: _inputDecoration('Amount *'),
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (double.tryParse(v) == null) return 'Invalid number';
                if (double.parse(v) <= 0) return 'Must be > 0';
                return null;
              },
            ),
            // Batch info text
            if (count > 1 && amountVal != null && amountVal > 0)
              Padding(
                padding: const EdgeInsets.only(top: 4, left: 2),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                      'Will create $count payment records: $count × ${amountVal.toStringAsFixed(2)}',
                      style: TextStyle(
                          fontSize: 12,
                          color: AppColors.emerald,
                          fontWeight: FontWeight.w500)),
                ),
              ),
            const SizedBox(height: 12),

            // ── Currency Dropdown ──
            DropdownButtonFormField<int>(
              value: _selectedCurrencyId,
              decoration: _inputDecoration('Currency *'),
              items: _currencies
                  .map((c) {
                    int? currencyId;
                    String? code;
                    String? symbol;
                    
                    // Handle MosqueCurrency objects
                    if (c is MosqueCurrency) {
                      currencyId = c.currencyId;
                      code = c.currencyCode;
                      symbol = c.currencySymbol;
                    }
                    // Handle Map<String, dynamic> objects
                    else if (c is Map<String, dynamic>) {
                      currencyId = c['currencyId'] ?? c['id'] as int?;
                      code = c['currencyCode'] ?? c['code'] as String?;
                      symbol = c['currencySymbol'] ?? c['symbol'] as String?;
                    }
                    
                    if (currencyId != null && code != null) {
                      final displayLabel = symbol != null && symbol.isNotEmpty
                          ? '$code ($symbol)'
                          : code;
                      return DropdownMenuItem<int>(
                        value: currencyId,
                        child: Text(displayLabel),
                      );
                    }
                    return null;
                  })
                  .whereType<DropdownMenuItem<int>>()
                  .toList(),
              onChanged: (id) => setState(() => _selectedCurrencyId = id),
              validator: (v) => v == null ? 'Required' : null,
            ),
            const SizedBox(height: 12),

            // ── Payment Date ──
            _DateField(
              label: 'Payment Date *',
              value: _paymentDate,
              onTap: () => _pickDate('Payment Date', _paymentDate,
                  (v) => setState(() => _paymentDate = v)),
            ),
            const SizedBox(height: 12),

            // ── Reference ──
            TextFormField(
              controller: _referenceCtrl,
              decoration:
                  _inputDecoration('Reference').copyWith(hintText: 'e.g. bank transfer number'),
            ),
            const SizedBox(height: 12),

            // ── Notes ──
            TextFormField(
              controller: _notesCtrl,
              decoration: _inputDecoration('Notes'),
              maxLines: 2,
            ),
            const SizedBox(height: 20),

            // ── Submit ──
            _SubmitButton(
              label: count > 1 ? 'Create $count Payments' : 'Add Payment',
              isSaving: _isSaving,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Add Exemption Bottom Sheet
// ═══════════════════════════════════════════════════════════════

Future<bool?> showAddExemptionSheet(
  BuildContext context,
  WidgetRef ref, {
  required int personId,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _AddExemptionSheet(ref: ref, personId: personId),
  );
}

class _AddExemptionSheet extends StatefulWidget {
  final WidgetRef ref;
  final int personId;

  const _AddExemptionSheet({required this.ref, required this.personId});

  @override
  State<_AddExemptionSheet> createState() => _AddExemptionSheetState();
}

class _AddExemptionSheetState extends State<_AddExemptionSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();

  List<ContributionType> _types = [];
  ContributionType? _selectedType;
  String _exemptionType = 'FULL';
  String _startDate = '';
  String _endDate = '';
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  static const _exemptionTypes = [
    ('FULL', 'Full Exemption'),
    ('FIXED_AMOUNT', 'Fixed Amount'),
    ('DISCOUNT_AMOUNT', 'Discount Amount'),
    ('DISCOUNT_PERCENTAGE', 'Discount Percentage'),
  ];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startDate =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    _loadTypes();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadTypes() async {
    try {
      final service = widget.ref.read(contributionServiceProvider);
      final types = await service.getActiveTypes();
      if (mounted) setState(() { _types = types; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  Future<void> _pickDate(String current, ValueChanged<String> onPicked) async {
    final initial = current.isNotEmpty
        ? DateTime.tryParse(current) ?? DateTime.now()
        : DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppColors.emerald,
            onPrimary: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      onPicked(
          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedType == null) {
      setState(() => _error = 'Please select a contribution type');
      return;
    }

    setState(() { _isSaving = true; _error = null; });

    try {
      final service = widget.ref.read(contributionServiceProvider);
      final data = <String, dynamic>{
        'personId': widget.personId,
        'contributionTypeId': _selectedType!.id,
        'exemptionType': _exemptionType,
        'startDate': _startDate,
        'isActive': true,
      };
      if (_exemptionType != 'FULL' && _amountCtrl.text.trim().isNotEmpty) {
        data['amount'] = double.parse(_amountCtrl.text.trim());
      }
      if (_endDate.isNotEmpty) data['endDate'] = _endDate;
      if (_reasonCtrl.text.trim().isNotEmpty) {
        data['reason'] = _reasonCtrl.text.trim();
      }

      await service.createExemption(data);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() { _error = e.toString(); _isSaving = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final needsAmount = _exemptionType != 'FULL';
    final isPercentage = _exemptionType == 'DISCOUNT_PERCENTAGE';

    return _BottomSheetWrapper(
      title: 'Add Exemption',
      icon: Icons.shield_outlined,
      isLoading: _isLoading,
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_error != null) _ErrorBanner(message: _error!),

            // Contribution type
            DropdownButtonFormField<ContributionType>(
              value: _selectedType,
              decoration: _inputDecoration('Contribution Type *'),
              items: _types
                  .map((t) => DropdownMenuItem(value: t, child: Text(t.code)))
                  .toList(),
              onChanged: (v) => setState(() => _selectedType = v),
              validator: (v) => v == null ? 'Required' : null,
            ),
            const SizedBox(height: 12),

            // Exemption type
            DropdownButtonFormField<String>(
              value: _exemptionType,
              decoration: _inputDecoration('Exemption Type *'),
              items: _exemptionTypes
                  .map((t) =>
                      DropdownMenuItem(value: t.$1, child: Text(t.$2)))
                  .toList(),
              onChanged: (v) => setState(() => _exemptionType = v ?? 'FULL'),
            ),
            const SizedBox(height: 12),

            // Amount (conditional)
            if (needsAmount)
              TextFormField(
                controller: _amountCtrl,
                decoration: _inputDecoration(
                    isPercentage ? 'Percentage (%) *' : 'Amount *'),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Required';
                  final n = double.tryParse(v);
                  if (n == null) return 'Invalid number';
                  if (n <= 0) return 'Must be > 0';
                  if (isPercentage && n > 100) return 'Max 100%';
                  return null;
                },
              ),
            if (needsAmount) const SizedBox(height: 12),

            // Reason
            TextFormField(
              controller: _reasonCtrl,
              decoration: _inputDecoration('Reason'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),

            // Dates
            Row(
              children: [
                Expanded(
                  child: _DateField(
                    label: 'Start Date *',
                    value: _startDate,
                    onTap: () => _pickDate(_startDate,
                        (v) => setState(() => _startDate = v)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DateField(
                    label: 'End Date',
                    value: _endDate,
                    onTap: () => _pickDate(_endDate,
                        (v) => setState(() => _endDate = v)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            _SubmitButton(
              label: 'Add Exemption',
              isSaving: _isSaving,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Add Assignment Bottom Sheet
// ═══════════════════════════════════════════════════════════════

Future<bool?> showAddAssignmentSheet(
  BuildContext context,
  WidgetRef ref, {
  required int personId,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _AddAssignmentSheet(ref: ref, personId: personId),
  );
}

class _AddAssignmentSheet extends StatefulWidget {
  final WidgetRef ref;
  final int personId;

  const _AddAssignmentSheet({required this.ref, required this.personId});

  @override
  State<_AddAssignmentSheet> createState() => _AddAssignmentSheetState();
}

class _AddAssignmentSheetState extends State<_AddAssignmentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _notesCtrl = TextEditingController();

  List<ContributionType> _types = [];
  ContributionType? _selectedType;
  String _startDate = '';
  String _endDate = '';
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startDate =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    _loadTypes();
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadTypes() async {
    try {
      final service = widget.ref.read(contributionServiceProvider);
      final types = await service.getActiveTypes();
      if (mounted) setState(() { _types = types; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  Future<void> _pickDate(String current, ValueChanged<String> onPicked) async {
    final initial = current.isNotEmpty
        ? DateTime.tryParse(current) ?? DateTime.now()
        : DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppColors.emerald,
            onPrimary: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      onPicked(
          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedType == null) {
      setState(() => _error = 'Please select a contribution type');
      return;
    }

    setState(() { _isSaving = true; _error = null; });

    try {
      final service = widget.ref.read(contributionServiceProvider);
      final data = <String, dynamic>{
        'personId': widget.personId,
        'contributionTypeId': _selectedType!.id,
        'startDate': _startDate,
      };
      if (_endDate.isNotEmpty) data['endDate'] = _endDate;
      if (_notesCtrl.text.trim().isNotEmpty) {
        data['notes'] = _notesCtrl.text.trim();
      }

      await service.createAssignment(data);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() { _error = e.toString(); _isSaving = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return _BottomSheetWrapper(
      title: 'Add Assignment',
      icon: Icons.assignment,
      isLoading: _isLoading,
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_error != null) _ErrorBanner(message: _error!),

            // Contribution type
            DropdownButtonFormField<ContributionType>(
              value: _selectedType,
              decoration: _inputDecoration('Contribution Type *'),
              items: _types
                  .map((t) => DropdownMenuItem(value: t, child: Text(t.code)))
                  .toList(),
              onChanged: (v) => setState(() => _selectedType = v),
              validator: (v) => v == null ? 'Required' : null,
            ),
            const SizedBox(height: 12),

            // Dates
            Row(
              children: [
                Expanded(
                  child: _DateField(
                    label: 'Start Date *',
                    value: _startDate,
                    onTap: () => _pickDate(_startDate,
                        (v) => setState(() => _startDate = v)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DateField(
                    label: 'End Date',
                    value: _endDate,
                    onTap: () => _pickDate(_endDate,
                        (v) => setState(() => _endDate = v)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Notes
            TextFormField(
              controller: _notesCtrl,
              decoration: _inputDecoration('Notes'),
              maxLines: 2,
            ),
            const SizedBox(height: 20),

            _SubmitButton(
              label: 'Add Assignment',
              isSaving: _isSaving,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Shared Widgets
// ═══════════════════════════════════════════════════════════════

class _BottomSheetWrapper extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isLoading;
  final Widget child;

  const _BottomSheetWrapper({
    required this.title,
    required this.icon,
    required this.isLoading,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.stone300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            // Title row
            Row(
              children: [
                Icon(icon, color: AppColors.emerald, size: 22),
                const SizedBox(width: 10),
                Text(title,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 16),
            if (isLoading)
              const Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              )
            else
              child,
          ],
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.error.withOpacity(0.3)),
      ),
      child: Text(message,
          style: TextStyle(color: AppColors.error, fontSize: 13)),
    );
  }
}

class _MonthYearPicker extends StatelessWidget {
  final String label;
  final int? month;
  final int? year;
  final ValueChanged<int?> onMonthChanged;
  final ValueChanged<int?> onYearChanged;

  const _MonthYearPicker({
    required this.label,
    required this.month,
    required this.year,
    required this.onMonthChanged,
    required this.onYearChanged,
  });

  static const _monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(fontSize: 12, color: AppColors.stone500)),
        const SizedBox(height: 4),
        Row(
          children: [
            // Month dropdown
            Expanded(
              flex: 3,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: AppColors.stone50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.stone200),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    value: month,
                    isExpanded: true,
                    isDense: true,
                    style: const TextStyle(fontSize: 13, color: Colors.black87),
                    items: List.generate(
                      12,
                      (i) => DropdownMenuItem(
                        value: i + 1,
                        child: Text(_monthNames[i]),
                      ),
                    ),
                    onChanged: onMonthChanged,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            // Year dropdown
            Expanded(
              flex: 3,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: AppColors.stone50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.stone200),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    value: year,
                    isExpanded: true,
                    isDense: true,
                    style: const TextStyle(fontSize: 13, color: Colors.black87),
                    items: List.generate(
                      11,
                      (i) => DropdownMenuItem(
                        value: 2020 + i,
                        child: Text('${2020 + i}'),
                      ),
                    ),
                    onChanged: onYearChanged,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;

  const _DateField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AbsorbPointer(
        child: TextFormField(
          decoration: _inputDecoration(label).copyWith(
            suffixIcon:
                const Icon(Icons.calendar_today, size: 18, color: AppColors.stone400),
          ),
          controller: TextEditingController(text: value),
        ),
      ),
    );
  }
}

class _SubmitButton extends StatelessWidget {
  final String label;
  final bool isSaving;
  final VoidCallback onPressed;

  const _SubmitButton({
    required this.label,
    required this.isSaving,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        onPressed: isSaving ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.emerald,
          foregroundColor: Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        child: isSaving
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white))
            : Text(label,
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

InputDecoration _inputDecoration(String label) {
  return InputDecoration(
    labelText: label,
    labelStyle: TextStyle(fontSize: 13, color: AppColors.stone500),
    filled: true,
    fillColor: AppColors.stone50,
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: AppColors.stone200),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: AppColors.stone200),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.emerald, width: 1.5),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.error),
    ),
  );
}
