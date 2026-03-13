import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/config/api_config.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/profile_image_service.dart';
import '../../admin/services/user_service.dart';
import '../../auth/providers/auth_provider.dart';

/// Account management screen — email edit, password change, linked profile.
class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen> {
  final _emailCtrl = TextEditingController();
  Map<String, dynamic>? _userData;
  bool _isLoading = true;
  bool _isSavingEmail = false;
  String? _error;
  bool _hasImage = false;
  bool _uploadingImage = false;
  int _imageCacheBuster = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
    _checkHasImage();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _checkHasImage() async {
    final service = ref.read(profileImageServiceProvider);
    final hasImage = await service.hasMyImage();
    if (mounted) {
      setState(() => _hasImage = hasImage);
    }
  }

  Future<void> _pickAndUploadImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (pickedFile == null) return;

    setState(() => _uploadingImage = true);
    try {
      final service = ref.read(profileImageServiceProvider);
      await service.uploadMyImage(pickedFile.path);
      if (mounted) {
        setState(() {
          _hasImage = true;
          _imageCacheBuster++;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile image updated'),
            backgroundColor: AppColors.emerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to upload: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingImage = false);
    }
  }

  Future<void> _deleteImage() async {
    try {
      final service = ref.read(profileImageServiceProvider);
      await service.deleteMyImage();
      if (mounted) {
        setState(() {
          _hasImage = false;
          _imageCacheBuster++;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile image removed'),
            backgroundColor: AppColors.emerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<Map<String, String>> _getAuthHeaders() async {
    final storage = const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    );
    final token = await storage.read(key: ApiConfig.tokenKey);
    final prefs = await SharedPreferences.getInstance();
    final mosqueId = prefs.getInt(ApiConfig.mosqueIdKey);
    final headers = <String, String>{};
    if (token != null) headers['Authorization'] = 'Bearer $token';
    if (mosqueId != null) headers['X-Mosque-Id'] = mosqueId.toString();
    return headers;
  }

  Future<void> _loadData() async {
    try {
      final service = ref.read(userServiceProvider);
      final data = await service.getCurrentUser();
      if (mounted) {
        setState(() {
          _userData = data;
          _emailCtrl.text = data['email'] as String? ?? '';
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

  Future<void> _saveEmail() async {
    if (_emailCtrl.text.trim().isEmpty) return;
    setState(() => _isSavingEmail = true);
    try {
      final service = ref.read(userServiceProvider);
      await service.updateEmail(_emailCtrl.text.trim());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Email updated'),
            backgroundColor: AppColors.emerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSavingEmail = false);
    }
  }

  void _showChangePasswordDialog() {
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isDutch ? 'Wachtwoord wijzigen' : 'Change Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentCtrl,
              obscureText: true,
              decoration:
                  InputDecoration(labelText: isDutch ? 'Huiedig wachtwoord' : 'Current Password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: newCtrl,
              obscureText: true,
              decoration: InputDecoration(labelText: isDutch ? 'Nieuw wachtwoord' : 'New Password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: confirmCtrl,
              obscureText: true,
              decoration:
                  InputDecoration(
                      labelText: isDutch ? 'Wachtwoord bevestigen' : 'Confirm Password'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(isDutch ? 'Annuleren' : 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (newCtrl.text.isEmpty || newCtrl.text.length < 6) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                      content:
                          Text(isDutch ? 'Wachtwoord moet minstens 6 tekens zijn' : 'Password must be at least 6 characters')),
                );
                return;
              }
              if (newCtrl.text != confirmCtrl.text) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(isDutch ? 'Wachtwoorden komen niet overeen' : 'Passwords do not match')),
                );
                return;
              }
              try {
                final service = ref.read(userServiceProvider);
                await service.changePassword(
                    currentCtrl.text, newCtrl.text);
                if (mounted) {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(isDutch ? 'Wachtwoord succesvol gewijzigd' : 'Password changed successfully'),
                      backgroundColor: AppColors.emerald,
                    ),
                  );
                }
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
            child: Text(isDutch ? 'Wijzigen' : 'Change'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final t = AppLocalizations.of(context)!;
    final isDutch = t.localeName.startsWith('nl');

    return Scaffold(
      appBar: AppBar(title: Text(isDutch ? 'Account' : 'Account')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Error: $_error'))
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // ── Profile Image ──
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.stone200),
                        ),
                        child: Column(
                          children: [
                            GestureDetector(
                              onTap: _uploadingImage
                                  ? null
                                  : _pickAndUploadImage,
                              child: Stack(
                                alignment: Alignment.bottomRight,
                                children: [
                                  _hasImage
                                      ? FutureBuilder<Map<String, String>>(
                                          future: _getAuthHeaders(),
                                          builder: (context, snapshot) {
                                            if (!snapshot.hasData) {
                                              return CircleAvatar(
                                                radius: 40,
                                                backgroundColor: AppColors
                                                    .emerald
                                                    .withOpacity(0.1),
                                                child:
                                                    const CircularProgressIndicator(
                                                        strokeWidth: 2),
                                              );
                                            }
                                            final service = ref.read(
                                                profileImageServiceProvider);
                                            return CircleAvatar(
                                              radius: 40,
                                              backgroundColor: AppColors
                                                  .emerald
                                                  .withOpacity(0.1),
                                              backgroundImage:
                                                  CachedNetworkImageProvider(
                                                '${service.getMyImageUrl()}?t=$_imageCacheBuster',
                                                headers: snapshot.data!,
                                              ),
                                            );
                                          },
                                        )
                                      : CircleAvatar(
                                          radius: 40,
                                          backgroundColor: AppColors.emerald
                                              .withOpacity(0.1),
                                          child: Text(
                                            authState.user?.username
                                                        .isNotEmpty ==
                                                    true
                                                ? authState
                                                    .user!.username[0]
                                                    .toUpperCase()
                                                : '?',
                                            style: TextStyle(
                                              fontSize: 32,
                                              color: AppColors.emerald,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                  if (_uploadingImage)
                                    const Positioned.fill(
                                      child: CircleAvatar(
                                        radius: 40,
                                        backgroundColor: Colors.black26,
                                        child: CircularProgressIndicator(
                                          color: Colors.white,
                                          strokeWidth: 2,
                                        ),
                                      ),
                                    ),
                                  Positioned(
                                    bottom: 0,
                                    right: 0,
                                    child: Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: BoxDecoration(
                                        color: AppColors.emerald,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                            color: Colors.white, width: 2),
                                      ),
                                      child: const Icon(Icons.camera_alt,
                                          size: 16, color: Colors.white),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              isDutch ? 'Profielfoto' : 'Profile Photo',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              isDutch
                                  ? 'JPG, PNG of WebP. Max 5MB.'
                                  : 'JPG, PNG or WebP. Max 5MB.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.stone500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                ElevatedButton.icon(
                                  onPressed: _uploadingImage
                                      ? null
                                      : _pickAndUploadImage,
                                  icon: const Icon(Icons.upload, size: 16),
                                  label: Text(isDutch
                                      ? 'Uploaden'
                                      : 'Upload'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.emerald,
                                    foregroundColor: Colors.white,
                                  ),
                                ),
                                if (_hasImage) ...[
                                  const SizedBox(width: 8),
                                  OutlinedButton.icon(
                                    onPressed: _deleteImage,
                                    icon: const Icon(Icons.delete_outline,
                                        size: 16),
                                    label: Text(isDutch
                                        ? 'Verwijderen'
                                        : 'Remove'),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.error,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      // ── Account Settings ──
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.stone200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(isDutch ? 'Accountinstellingen' : 'Account Settings',
                                style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600)),
                            const SizedBox(height: 16),
                            // Username (read-only)
                            TextFormField(
                              initialValue:
                                  _userData?['username'] as String? ?? '',
                              decoration: InputDecoration(
                                  labelText: isDutch ? 'Gebruikersnaam' : 'Username'),
                              readOnly: true,
                              enabled: false,
                            ),
                            const SizedBox(height: 12),
                            // Email (editable)
                            TextFormField(
                              controller: _emailCtrl,
                              decoration: InputDecoration(
                                labelText: isDutch ? 'E-mail' : 'Email',
                                suffixIcon: _isSavingEmail
                                    ? const Padding(
                                        padding: EdgeInsets.all(12),
                                        child: SizedBox(
                                            width: 16,
                                            height: 16,
                                            child:
                                                CircularProgressIndicator(
                                                    strokeWidth: 2)))
                                    : IconButton(
                                        icon: const Icon(Icons.save,
                                            color: AppColors.emerald),
                                        onPressed: _saveEmail,
                                      ),
                              ),
                              keyboardType: TextInputType.emailAddress,
                            ),
                            const SizedBox(height: 12),
                            // Role (read-only)
                            TextFormField(
                              initialValue:
                                  authState.user?.roles.join(', ') ?? '',
                              decoration:
                                  InputDecoration(labelText: isDutch ? 'Rol' : 'Role'),
                              readOnly: true,
                              enabled: false,
                            ),
                            const SizedBox(height: 16),
                            // Change password button
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: _showChangePasswordDialog,
                                icon: const Icon(Icons.lock_outline),
                                label: Text(isDutch ? 'Wachtwoord wijzigen' : 'Change Password'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}
