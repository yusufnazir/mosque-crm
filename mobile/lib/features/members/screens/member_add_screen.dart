import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../services/member_service.dart';

/// Screen for adding a new member.
class MemberAddScreen extends ConsumerStatefulWidget {
  const MemberAddScreen({super.key});

  @override
  ConsumerState<MemberAddScreen> createState() => _MemberAddScreenState();
}

class _MemberAddScreenState extends ConsumerState<MemberAddScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _streetCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _countryCtrl = TextEditingController();
  final _postalCodeCtrl = TextEditingController();

  String _gender = 'M';
  String _status = 'ACTIVE';
  DateTime? _dateOfBirth;
  bool _isSaving = false;

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _streetCtrl.dispose();
    _cityCtrl.dispose();
    _countryCtrl.dispose();
    _postalCodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
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
    if (picked != null) setState(() => _dateOfBirth = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_dateOfBirth == null) {
      final t = AppLocalizations.of(context)!;
      final isDutch = t.localeName.startsWith('nl');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isDutch ? 'Geboortedatum is verplicht' : 'Date of birth is required')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final service = ref.read(memberServiceProvider);
      final data = <String, dynamic>{
        'firstName': _firstNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'gender': _gender,
        'dateOfBirth':
            '${_dateOfBirth!.year}-${_dateOfBirth!.month.toString().padLeft(2, '0')}-${_dateOfBirth!.day.toString().padLeft(2, '0')}',
        'membershipStatus': _status,
      };
      if (_emailCtrl.text.trim().isNotEmpty) {
        data['email'] = _emailCtrl.text.trim();
      }
      if (_phoneCtrl.text.trim().isNotEmpty) {
        data['phone'] = _phoneCtrl.text.trim();
      }
      if (_streetCtrl.text.trim().isNotEmpty) {
        data['address'] = _streetCtrl.text.trim();
      }
      if (_cityCtrl.text.trim().isNotEmpty) {
        data['city'] = _cityCtrl.text.trim();
      }
      if (_countryCtrl.text.trim().isNotEmpty) {
        data['country'] = _countryCtrl.text.trim();
      }
      if (_postalCodeCtrl.text.trim().isNotEmpty) {
        data['postalCode'] = _postalCodeCtrl.text.trim();
      }

      await service.createPerson(data);

      if (mounted) {
        final t2 = AppLocalizations.of(context)!;
        final isDutch2 = t2.localeName.startsWith('nl');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isDutch2 ? 'Lid succesvol aangemaakt' : 'Member created successfully'),
            backgroundColor: AppColors.emerald,
          ),
        );
        context.pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    return Scaffold(
      appBar: AppBar(title: Text(isDutch ? 'Lid toevoegen' : 'Add Member')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Personal Information ──
              _sectionHeader(isDutch ? 'Persoonlijke informatie' : 'Personal Information'),
              const SizedBox(height: 8),
              _buildCard([
                TextFormField(
                  controller: _firstNameCtrl,
                  decoration: InputDecoration(labelText: isDutch ? 'Voornaam *' : 'First Name *'),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _lastNameCtrl,
                  decoration: InputDecoration(labelText: isDutch ? 'Achternaam *' : 'Last Name *'),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _emailCtrl,
                  decoration: InputDecoration(labelText: isDutch ? 'E-mail' : 'Email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneCtrl,
                  decoration: InputDecoration(labelText: isDutch ? 'Telefoon' : 'Phone'),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                // Date of birth
                GestureDetector(
                  onTap: _pickDate,
                  child: AbsorbPointer(
                    child: TextFormField(
                      decoration: InputDecoration(
                        labelText: isDutch ? 'Geboortedatum *' : 'Date of Birth *',
                        suffixIcon: const Icon(Icons.calendar_today, size: 18),
                        hintText: _dateOfBirth != null
                            ? '${_dateOfBirth!.year}-${_dateOfBirth!.month.toString().padLeft(2, '0')}-${_dateOfBirth!.day.toString().padLeft(2, '0')}'
                            : isDutch ? 'Selecteer datum' : 'Select date',
                      ),
                      controller: TextEditingController(
                        text: _dateOfBirth != null
                            ? '${_dateOfBirth!.year}-${_dateOfBirth!.month.toString().padLeft(2, '0')}-${_dateOfBirth!.day.toString().padLeft(2, '0')}'
                            : '',
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Gender
                DropdownButtonFormField<String>(
                  value: _gender,
                  decoration: InputDecoration(labelText: isDutch ? 'Geslacht *' : 'Gender *'),
                  items: [
                    DropdownMenuItem(value: 'M', child: Text(isDutch ? 'Man' : 'Male')),
                    DropdownMenuItem(value: 'V', child: Text(isDutch ? 'Vrouw' : 'Female')),
                  ],
                  onChanged: (v) => setState(() => _gender = v ?? 'M'),
                ),
              ]),

              const SizedBox(height: 20),

              // ── Address ──
              _sectionHeader(isDutch ? 'Adres' : 'Address'),
              const SizedBox(height: 8),
              _buildCard([
                TextFormField(
                  controller: _streetCtrl,
                  decoration: InputDecoration(labelText: isDutch ? 'Straat' : 'Street'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _cityCtrl,
                        decoration: InputDecoration(labelText: isDutch ? 'Plaats' : 'City'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _postalCodeCtrl,
                        decoration:
                            InputDecoration(labelText: isDutch ? 'Postcode' : 'Postal Code'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _countryCtrl,
                  decoration: InputDecoration(labelText: isDutch ? 'Land' : 'Country'),
                ),
              ]),

              const SizedBox(height: 20),

              // ── Membership ──
              _sectionHeader(isDutch ? 'Lidmaatschap' : 'Membership'),
              const SizedBox(height: 8),
              _buildCard([
                DropdownButtonFormField<String>(
                  value: _status,
                  decoration: InputDecoration(labelText: isDutch ? 'Status' : 'Status'),
                  items: [
                    DropdownMenuItem(
                        value: 'ACTIVE', child: Text(isDutch ? 'Actief' : 'Active')),
                    DropdownMenuItem(
                        value: 'INACTIVE', child: Text(isDutch ? 'Inactief' : 'Inactive')),
                    DropdownMenuItem(
                        value: 'SUSPENDED', child: Text(isDutch ? 'Opgeschort' : 'Suspended')),
                  ],
                  onChanged: (v) =>
                      setState(() => _status = v ?? 'ACTIVE'),
                ),
              ]),

              const SizedBox(height: 24),

              // ── Submit ──
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _submit,
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : Text(isDutch ? 'Lid aanmaken' : 'Create Member'),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.charcoal,
      ),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.stone200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}
