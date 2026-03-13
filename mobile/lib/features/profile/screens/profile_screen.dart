import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/config/api_config.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_shell.dart';
import '../../../core/services/profile_image_service.dart';
import '../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _hasImage = false;
  bool _uploadingImage = false;
  int _imageCacheBuster = 0;

  @override
  void initState() {
    super.initState();
    _checkHasImage();
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
            content: Text('Failed to upload image: $e'),
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
            content: Text('Failed to delete image: $e'),
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

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final service = ref.read(profileImageServiceProvider);

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => appShellScaffoldKey.currentState?.openDrawer(),
        ),
        title: const Text('Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  GestureDetector(
                    onTap: _uploadingImage ? null : _pickAndUploadImage,
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
                                      backgroundColor:
                                          AppColors.emerald.withOpacity(0.1),
                                      child: const CircularProgressIndicator(
                                          strokeWidth: 2),
                                    );
                                  }
                                  return CircleAvatar(
                                    radius: 40,
                                    backgroundColor:
                                        AppColors.emerald.withOpacity(0.1),
                                    backgroundImage: CachedNetworkImageProvider(
                                      '${service.getMyImageUrl()}?t=$_imageCacheBuster',
                                      headers: snapshot.data!,
                                    ),
                                  );
                                },
                              )
                            : CircleAvatar(
                                radius: 40,
                                backgroundColor:
                                    AppColors.emerald.withOpacity(0.1),
                                child: Text(
                                  user?.username.isNotEmpty == true
                                      ? user!.username[0].toUpperCase()
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
                  if (_hasImage) ...[
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: _deleteImage,
                      icon: const Icon(Icons.delete_outline, size: 16),
                      label: const Text('Remove photo'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Text(
                    user?.username ?? 'Unknown',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.roles.join(', ') ?? '',
                    style: TextStyle(
                      color: AppColors.stone500,
                      fontSize: 14,
                    ),
                  ),
                  if (user?.mosques.isNotEmpty == true) ...[
                    const SizedBox(height: 4),
                    Text(
                      user!.mosques
                          .map((m) => m.name)
                          .join(', '),
                      style: TextStyle(
                        color: AppColors.emerald,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Permissions overview
          if (user != null && user.permissions.isNotEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Permissions',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const Divider(),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: user.permissions.map((p) {
                        return Chip(
                          label: Text(p, style: const TextStyle(fontSize: 12)),
                          backgroundColor: AppColors.emerald.withOpacity(0.08),
                          side: BorderSide.none,
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 16),

          // Menu items
          Card(
            child: Column(
              children: [
                _buildMenuItem(
                  context,
                  icon: Icons.settings,
                  title: 'Settings',
                  onTap: () => context.push('/settings'),
                ),
                const Divider(height: 1),
                _buildMenuItem(
                  context,
                  icon: Icons.lock_outline,
                  title: 'Change Password',
                  onTap: () {
                    _showChangePasswordDialog(context);
                  },
                ),
                const Divider(height: 1),
                _buildMenuItem(
                  context,
                  icon: Icons.logout,
                  title: 'Sign Out',
                  color: AppColors.error,
                  onTap: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Sign Out'),
                        content: const Text(
                            'Are you sure you want to sign out?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Cancel'),
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.error,
                            ),
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Sign Out'),
                          ),
                        ],
                      ),
                    );

                    if (confirmed == true) {
                      await ref.read(authProvider.notifier).logout();
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? color,
  }) {
    return ListTile(
      leading: Icon(icon, color: color ?? AppColors.stone600),
      title: Text(
        title,
        style: TextStyle(color: color ?? AppColors.charcoal),
      ),
      trailing: Icon(Icons.chevron_right,
          color: color?.withOpacity(0.5) ?? AppColors.stone400),
      onTap: onTap,
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final currentController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Password'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: currentController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Current Password',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'New Password',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Confirm New Password',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              // TODO: Implement change password API call
              Navigator.pop(ctx);
            },
            child: const Text('Change'),
          ),
        ],
      ),
    );
  }
}
