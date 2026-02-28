import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../models/member_models.dart';
import '../services/member_service.dart';

class MemberEditScreen extends ConsumerStatefulWidget {
  final int memberId;

  const MemberEditScreen({super.key, required this.memberId});

  @override
  ConsumerState<MemberEditScreen> createState() => _MemberEditScreenState();
}

class _MemberEditScreenState extends ConsumerState<MemberEditScreen> {
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  // Form fields
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _countryCtrl = TextEditingController();
  final _postalCodeCtrl = TextEditingController();

  String _gender = 'MALE';
  String _dateOfBirth = '';
  String _membershipStatus = 'ACTIVE';

  // Account
  bool _accountEnabled = false;
  String _username = '';
  List<String> _selectedRoles = ['MEMBER'];
  List<Map<String, dynamic>> _availableRoles = [];

  Person? _person;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _cityCtrl.dispose();
    _countryCtrl.dispose();
    _postalCodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(memberServiceProvider);
      final results = await Future.wait([
        service.getPerson(widget.memberId),
        service.getAvailableRoles(),
      ]);

      final person = results[0] as Person;
      final roles = results[1] as List<Map<String, dynamic>>;

      _person = person;
      _firstNameCtrl.text = person.firstName;
      _lastNameCtrl.text = person.lastName;
      _emailCtrl.text = person.email ?? '';
      _phoneCtrl.text = person.phone ?? '';
      _addressCtrl.text = person.address ?? '';
      _cityCtrl.text = person.city ?? '';
      _countryCtrl.text = person.country ?? '';
      _postalCodeCtrl.text = person.postalCode ?? '';
      _gender = _normalizeGender(person.gender);
      _dateOfBirth = person.dateOfBirth ?? '';
      _membershipStatus = _normalizeStatus(person.status);
      _accountEnabled = person.username != null && person.username!.isNotEmpty;
      _username = person.username ?? person.email ?? '';
      _selectedRoles = person.roles.isNotEmpty ? List.from(person.roles) : ['MEMBER'];
      _availableRoles = roles.where((r) => r['name'] != 'SUPER_ADMIN').toList();

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _pickDateOfBirth() async {
    final initial = _dateOfBirth.isNotEmpty
        ? DateTime.tryParse(_dateOfBirth) ?? DateTime(2000)
        : DateTime(2000);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.emerald,
              onPrimary: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _dateOfBirth =
            '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      final service = ref.read(memberServiceProvider);

      final data = <String, dynamic>{
        'id': widget.memberId.toString(),
        'firstName': _firstNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'dateOfBirth': _dateOfBirth,
        'gender': _gender,
        'address': _addressCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'country': _countryCtrl.text.trim(),
        'postalCode': _postalCodeCtrl.text.trim(),
        'membershipStatus': _membershipStatus,
        'accountEnabled': _accountEnabled,
      };

      if (_accountEnabled) {
        data['username'] = _username.isNotEmpty ? _username : _emailCtrl.text.trim();
        data['roles'] = _selectedRoles;
      }

      // Remove empty string values (but keep booleans & lists)
      data.removeWhere((key, value) =>
          value is String && value.isEmpty && key != 'id');

      await service.updateMember(widget.memberId, data);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Member updated successfully'),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop(true); // pop with result=true to trigger refresh
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isSaving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: Text(_person != null ? 'Edit ${_person!.fullName}' : 'Edit Member'),
        actions: [
          TextButton.icon(
            onPressed: _isSaving ? null : _handleSubmit,
            icon: _isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.save, color: Colors.white),
            label: Text(
              _isSaving ? 'Saving...' : 'Save',
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildForm(),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.error.withOpacity(0.3)),
              ),
              child: Text(_error!,
                  style: TextStyle(color: AppColors.error, fontSize: 13)),
            ),

          // ── Personal Information ──
          _buildSectionCard(
            title: 'Personal Information',
            icon: Icons.person,
            children: [
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _firstNameCtrl,
                      label: 'First Name *',
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTextField(
                      controller: _lastNameCtrl,
                      label: 'Last Name *',
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _emailCtrl,
                      label: 'Email',
                      keyboardType: TextInputType.emailAddress,
                      onChanged: (val) {
                        if (_accountEnabled) {
                          setState(() => _username = val);
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTextField(
                      controller: _phoneCtrl,
                      label: 'Phone',
                      keyboardType: TextInputType.phone,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: _pickDateOfBirth,
                      child: AbsorbPointer(
                        child: TextFormField(
                          decoration: _inputDecoration('Date of Birth *'),
                          controller: TextEditingController(
                            text: _dateOfBirth.isNotEmpty
                                ? _formatDate(_dateOfBirth)
                                : '',
                          ),
                          validator: (v) => _dateOfBirth.isEmpty
                              ? 'Required'
                              : null,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _gender,
                      decoration: _inputDecoration('Gender *'),
                      items: const [
                        DropdownMenuItem(value: 'M', child: Text('Male')),
                        DropdownMenuItem(value: 'V', child: Text('Female')),
                      ],
                      onChanged: (v) => setState(() => _gender = v ?? 'M'),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Address ──
          _buildSectionCard(
            title: 'Address',
            icon: Icons.location_on,
            children: [
              _buildTextField(
                controller: _addressCtrl,
                label: 'Street Address',
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                        controller: _cityCtrl, label: 'City'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTextField(
                        controller: _countryCtrl, label: 'Country'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: _buildTextField(
                    controller: _postalCodeCtrl, label: 'Postal Code'),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Account & Membership ──
          _buildSectionCard(
            title: 'Account & Membership',
            icon: Icons.admin_panel_settings,
            children: [
              // Status dropdown
              DropdownButtonFormField<String>(
                value: _membershipStatus,
                decoration: _inputDecoration('Membership Status *'),
                items: const [
                  DropdownMenuItem(value: 'ACTIVE', child: Text('Active')),
                  DropdownMenuItem(
                      value: 'INACTIVE', child: Text('Inactive')),
                  DropdownMenuItem(
                      value: 'SUSPENDED', child: Text('Suspended')),
                  DropdownMenuItem(
                      value: 'DECEASED', child: Text('Deceased')),
                ],
                onChanged: (v) =>
                    setState(() => _membershipStatus = v ?? 'ACTIVE'),
              ),
              const SizedBox(height: 16),

              // Account toggle
              SwitchListTile(
                value: _accountEnabled,
                onChanged: (val) {
                  setState(() {
                    _accountEnabled = val;
                    if (val) {
                      _username = _emailCtrl.text.isNotEmpty
                          ? _emailCtrl.text
                          : _username;
                    }
                  });
                },
                title: const Text('Enable Portal Account',
                    style: TextStyle(fontSize: 14)),
                subtitle: Text(
                  _accountEnabled
                      ? 'User can log in to the portal'
                      : 'No portal access',
                  style: TextStyle(fontSize: 12, color: AppColors.stone500),
                ),
                activeColor: AppColors.emerald,
                contentPadding: EdgeInsets.zero,
              ),

              if (_accountEnabled) ...[
                const SizedBox(height: 8),
                // Username (read-only, derived from email)
                TextFormField(
                  decoration: _inputDecoration('Username (from email)'),
                  initialValue: _username,
                  readOnly: true,
                  style: TextStyle(color: AppColors.stone500),
                ),
                const SizedBox(height: 12),

                // Roles
                Text('Roles',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.stone600)),
                const SizedBox(height: 6),
                ..._availableRoles.map((role) {
                  final name = role['name'] as String;
                  final isSelected = _selectedRoles.contains(name);
                  return CheckboxListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(name, style: const TextStyle(fontSize: 14)),
                    value: isSelected,
                    activeColor: AppColors.emerald,
                    onChanged: (checked) {
                      setState(() {
                        if (checked == true) {
                          _selectedRoles.add(name);
                        } else {
                          _selectedRoles.remove(name);
                          if (_selectedRoles.isEmpty) {
                            _selectedRoles.add('MEMBER');
                          }
                        }
                      });
                    },
                  );
                }),
              ],

              if (!_accountEnabled)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Enable the toggle above to create a portal account for this member.',
                    style: TextStyle(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: AppColors.stone400),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 24),

          // ── Save Button ──
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.emerald,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),
              child: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Save Changes',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: AppColors.emerald),
                const SizedBox(width: 8),
                Text(title,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
    ValueChanged<String>? onChanged,
  }) {
    return TextFormField(
      controller: controller,
      decoration: _inputDecoration(label),
      keyboardType: keyboardType,
      maxLines: maxLines,
      validator: validator,
      onChanged: onChanged,
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(fontSize: 13, color: AppColors.stone500),
      filled: true,
      fillColor: Colors.white,
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

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final months = [
        '',
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ];
      return '${months[date.month]} ${date.day}, ${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  /// Normalize gender values from backend (M, V, F, MALE, FEMALE) to M/V.
  String _normalizeGender(String? gender) {
    switch (gender?.toUpperCase()) {
      case 'M':
      case 'MALE':
      case 'MAN':
        return 'M';
      case 'V':
      case 'F':
      case 'FEMALE':
      case 'WOMAN':
        return 'V';
      default:
        return 'M';
    }
  }

  /// Normalize status to a valid dropdown value.
  String _normalizeStatus(String? status) {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'ACTIVE';
      case 'INACTIVE':
        return 'INACTIVE';
      case 'SUSPENDED':
        return 'SUSPENDED';
      case 'DECEASED':
        return 'DECEASED';
      default:
        return 'ACTIVE';
    }
  }
}
