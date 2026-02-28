import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers/locale_provider.dart';
import '../../../core/config/api_config.dart';
import '../services/config_service.dart';

/// Settings screen with 3 tabs: General, Mail Server, Language.
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen>
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
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: const Text('Settings'),
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: AppColors.emerald,
          unselectedLabelColor: AppColors.stone500,
          indicatorColor: AppColors.emerald,
          tabs: const [
            Tab(text: 'General'),
            Tab(text: 'Mail'),
            Tab(text: 'Language'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: const [
          _GeneralTab(),
          _MailServerTab(),
          _LanguageTab(),
        ],
      ),
    );
  }
}

// ─── General Tab ────────────────────────────────────────────────────────────

class _GeneralTab extends ConsumerStatefulWidget {
  const _GeneralTab();

  @override
  ConsumerState<_GeneralTab> createState() => _GeneralTabState();
}

class _GeneralTabState extends ConsumerState<_GeneralTab>
    with AutomaticKeepAliveClientMixin {
  bool _isLoading = true;
  String _baseUrl = '';
  Map<String, dynamic> _config = {};

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
      _baseUrl = (await ref.read(configServiceProvider).getAppBaseUrl()) ?? '';
      _config = {'baseUrl': _baseUrl};
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Application',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
                const Divider(),
                _InfoRow('App Name', 'MemberFlow'),
                _InfoRow('Version', '1.0.0'),
                _InfoRow('API URL', ApiConfig.baseUrl),
                _InfoRow('Backend URL', _baseUrl.isEmpty ? 'N/A' : _baseUrl),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Mail Server Tab ────────────────────────────────────────────────────────

class _MailServerTab extends ConsumerStatefulWidget {
  const _MailServerTab();

  @override
  ConsumerState<_MailServerTab> createState() => _MailServerTabState();
}

class _MailServerTabState extends ConsumerState<_MailServerTab>
    with AutomaticKeepAliveClientMixin {
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isTesting = false;
  final _hostCtrl = TextEditingController();
  final _portCtrl = TextEditingController();
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _fromCtrl = TextEditingController();
  bool _useTls = true;
  String? _testResult;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _hostCtrl.dispose();
    _portCtrl.dispose();
    _userCtrl.dispose();
    _passCtrl.dispose();
    _fromCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final config = await ref.read(configServiceProvider).getMailServerConfig();
      _hostCtrl.text = config['host'] ?? '';
      _portCtrl.text = '${config['port'] ?? 587}';
      _userCtrl.text = config['username'] ?? '';
      _passCtrl.text = config['password'] ?? '';
      _fromCtrl.text = config['fromAddress'] ?? '';
      _useTls = config['useTls'] ?? true;
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      await ref.read(configServiceProvider).saveMailServerConfig({
        'host': _hostCtrl.text.trim(),
        'port': int.tryParse(_portCtrl.text.trim()) ?? 587,
        'username': _userCtrl.text.trim(),
        'password': _passCtrl.text.trim(),
        'fromAddress': _fromCtrl.text.trim(),
        'useTls': _useTls,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Mail settings saved'),
              backgroundColor: AppColors.emerald),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _test() async {
    setState(() {
      _isTesting = true;
      _testResult = null;
    });
    try {
      final result = await ref.read(configServiceProvider).testMailServer();
      setState(() {
        _testResult = result['success'] == true
            ? 'Connection successful!'
            : 'Failed: ${result['error'] ?? 'Unknown error'}';
      });
    } catch (e) {
      setState(() => _testResult = 'Error: $e');
    } finally {
      if (mounted) setState(() => _isTesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SMTP Configuration',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _hostCtrl,
                  decoration: const InputDecoration(labelText: 'SMTP Host'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _portCtrl,
                  decoration: const InputDecoration(labelText: 'Port'),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _userCtrl,
                  decoration: const InputDecoration(labelText: 'Username'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _passCtrl,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _fromCtrl,
                  decoration:
                      const InputDecoration(labelText: 'From Address'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 8),
                SwitchListTile(
                  value: _useTls,
                  title: const Text('Use TLS'),
                  activeColor: AppColors.emerald,
                  contentPadding: EdgeInsets.zero,
                  onChanged: (v) => setState(() => _useTls = v),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _save,
                        child: _isSaving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2))
                            : const Text('Save'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isTesting ? null : _test,
                        child: _isTesting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2))
                            : const Text('Test Connection'),
                      ),
                    ),
                  ],
                ),
                if (_testResult != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      _testResult!,
                      style: TextStyle(
                        color: _testResult!.startsWith('Connection')
                            ? AppColors.emerald
                            : AppColors.error,
                        fontSize: 13,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Language Tab ────────────────────────────────────────────────────────────

class _LanguageTab extends ConsumerWidget {
  const _LanguageTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Language',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _LanguageOption(
                        label: 'English',
                        flag: '🇬🇧',
                        isSelected: locale.languageCode == 'en',
                        onTap: () => ref
                            .read(localeProvider.notifier)
                            .setLocale(const Locale('en')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _LanguageOption(
                        label: 'Nederlands',
                        flag: '🇳🇱',
                        isSelected: locale.languageCode == 'nl',
                        onTap: () => ref
                            .read(localeProvider.notifier)
                            .setLocale(const Locale('nl')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('About',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
                const Divider(),
                _InfoRow('App', 'MemberFlow Mobile'),
                _InfoRow('Version', '1.0.0'),
                _InfoRow('API', ApiConfig.baseUrl),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.stone500)),
          Flexible(
            child: Text(value,
                style: const TextStyle(fontWeight: FontWeight.w500),
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}

class _LanguageOption extends StatelessWidget {
  final String label;
  final String flag;
  final bool isSelected;
  final VoidCallback onTap;

  const _LanguageOption({
    required this.label,
    required this.flag,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.emerald.withOpacity(0.08) : null,
          border: Border.all(
            color: isSelected ? AppColors.emerald : AppColors.stone300,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(flag, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: isSelected ? AppColors.emerald : AppColors.stone600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
