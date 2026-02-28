import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../models/user_models.dart';

/// API service for user administration.
class UserService {
  final Dio _dio;

  UserService(this._dio);

  /// GET /admin/users
  Future<List<AppUser>> getUsers() async {
    final response = await _dio.get('/admin/users');
    return (response.data as List<dynamic>)
        .map((e) => AppUser.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /admin/users
  Future<AppUser> createUser(Map<String, dynamic> data) async {
    final response = await _dio.post('/admin/users', data: data);
    return AppUser.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /admin/users/{id}
  Future<AppUser> updateUser(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/admin/users/$id', data: data);
    return AppUser.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /admin/users/{id}/toggle-enabled
  Future<void> toggleEnabled(int id) async {
    await _dio.put('/admin/users/$id/toggle-enabled');
  }

  /// DELETE /admin/users/{id}
  Future<void> deleteUser(int id) async {
    await _dio.delete('/admin/users/$id');
  }

  /// GET /admin/roles
  Future<List<AppRole>> getRoles() async {
    final response = await _dio.get('/admin/roles');
    return (response.data as List<dynamic>)
        .map((e) => AppRole.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /admin/roles
  Future<AppRole> createRole(Map<String, dynamic> data) async {
    final response = await _dio.post('/admin/roles', data: data);
    return AppRole.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /admin/roles/{id}
  Future<AppRole> updateRole(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/admin/roles/$id', data: data);
    return AppRole.fromJson(response.data as Map<String, dynamic>);
  }

  /// DELETE /admin/roles/{id}
  Future<void> deleteRole(int id) async {
    await _dio.delete('/admin/roles/$id');
  }

  /// GET /admin/roles/permissions
  Future<List<Permission>> getPermissions() async {
    final response = await _dio.get('/admin/roles/permissions');
    return (response.data as List<dynamic>)
        .map((e) => Permission.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// PUT /admin/roles/{id}/permissions
  Future<void> updateRolePermissions(
      int roleId, List<String> permissionCodes) async {
    await _dio.put('/admin/roles/$roleId/permissions',
        data: {'permissionCodes': permissionCodes});
  }

  /// GET /admin/roles/pool
  Future<List<String>> getPermissionPool() async {
    final response = await _dio.get('/admin/roles/pool');
    return (response.data as List<dynamic>).cast<String>();
  }

  /// PUT /admin/roles/pool
  Future<void> updatePermissionPool(List<String> permissionCodes) async {
    await _dio.put('/admin/roles/pool',
        data: {'permissionCodes': permissionCodes});
  }

  /// GET /users/me
  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get('/users/me');
    return response.data as Map<String, dynamic>;
  }

  /// PUT /users/me/email
  Future<void> updateEmail(String email) async {
    await _dio.put('/users/me/email', data: {'email': email});
  }

  /// POST /auth/change-password
  Future<void> changePassword(
      String currentPassword, String newPassword) async {
    await _dio.post('/auth/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }
}

final userServiceProvider = Provider<UserService>((ref) {
  return UserService(ref.watch(dioProvider));
});
