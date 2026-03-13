import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';

import '../../../core/config/api_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../models/auth_models.dart';

/// Auth state: loading, authenticated, or unauthenticated.
enum AuthStatus { loading, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final AuthUser? user;
  final String? error;

  const AuthState({
    this.status = AuthStatus.loading,
    this.user,
    this.error,
  });

  const AuthState.initial() : this(status: AuthStatus.loading);

  const AuthState.authenticated(AuthUser user)
      : this(status: AuthStatus.authenticated, user: user);

  const AuthState.unauthenticated([String? error])
      : this(status: AuthStatus.unauthenticated, error: error);

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Dio _dio;
  final FlutterSecureStorage _secureStorage;
  final SharedPreferences _prefs;

  AuthNotifier(this._dio, this._secureStorage, this._prefs)
      : super(const AuthState.initial()) {
    _tryRestoreSession();
  }

  static const _userDataKey = 'cached_user_data';

  Future<void> _tryRestoreSession() async {
    try {
      final token = await _secureStorage.read(key: ApiConfig.tokenKey);
      if (token == null || token.isEmpty) {
        state = const AuthState.unauthenticated();
        return;
      }

      // Restore immediately from cached user data (no network needed)
      final cachedJson = await _secureStorage.read(key: _userDataKey);
      if (cachedJson != null && cachedJson.isNotEmpty) {
        try {
          final data = jsonDecode(cachedJson) as Map<String, dynamic>;
          final user = AuthUser.fromJson(data);
          // Ensure token is current
          final restoredUser = AuthUser(
            username: user.username,
            token: token,
            role: user.role,
            memberId: user.memberId,
            roles: user.roles,
            permissions: user.permissions,
            mosques: user.mosques,
            selectedMosqueId: user.selectedMosqueId,
          );
          state = AuthState.authenticated(restoredUser);
          // Validate in background — if token expired, log out
          _validateTokenInBackground(token);
          return;
        } catch (_) {
          // Cached data corrupt, fall through to network validation
        }
      }

      // No cache — validate token via /me endpoint
      await _validateAndRestoreFromNetwork(token);
    } catch (e) {
      await _clearSession();
      state = const AuthState.unauthenticated();
    }
  }

  Future<void> _validateAndRestoreFromNetwork(String token) async {
    try {
      final response = await _dio.get(
        '/me',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final mosqueId = _prefs.getInt(ApiConfig.mosqueIdKey);

        final user = AuthUser(
          username: data['username'] as String? ?? '',
          token: token,
          role: (data['roles'] as List<dynamic>?)?.isNotEmpty == true
              ? (data['roles'] as List<dynamic>).first as String
              : null,
          memberId: (data['personId'] as num?)?.toInt(),
          roles: (data['roles'] as List<dynamic>?)?.cast<String>() ?? [],
          permissions:
              (data['permissions'] as List<dynamic>?)?.cast<String>() ?? [],
          mosques: [],
          selectedMosqueId: mosqueId,
        );

        await _cacheUserData(user);
        state = AuthState.authenticated(user);
      } else {
        await _clearSession();
        state = const AuthState.unauthenticated();
      }
    } catch (e) {
      await _clearSession();
      state = const AuthState.unauthenticated();
    }
  }

  Future<void> _validateTokenInBackground(String token) async {
    try {
      final response = await _dio.get(
        '/me',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode != 200) {
        await _clearSession();
        state = const AuthState.unauthenticated();
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        // Token expired
        await _clearSession();
        state = const AuthState.unauthenticated();
      }
      // Network errors are silently ignored — user stays logged in
    }
  }

  Future<void> _cacheUserData(AuthUser user) async {
    await _secureStorage.write(
      key: _userDataKey,
      value: jsonEncode(user.toJson()),
    );
  }

  Future<void> login(String username, String password) async {
    state = const AuthState.initial(); // loading

    try {
      final response = await _dio.post(
        '/auth/login',
        data: LoginRequest(username: username, password: password).toJson(),
      );

      final loginResponse =
          LoginResponse.fromJson(response.data as Map<String, dynamic>);

      // Store token securely
      await _secureStorage.write(
          key: ApiConfig.tokenKey, value: loginResponse.token);

      // Auto-select first mosque if available
      int? mosqueId;
      if (loginResponse.mosques.isNotEmpty) {
        mosqueId = loginResponse.mosques.first.id;
        await _prefs.setInt(ApiConfig.mosqueIdKey, mosqueId);
      }

      // Cache user data for instant restore on hot reload/restart
      final user = AuthUser(
        username: loginResponse.username,
        token: loginResponse.token,
        role: loginResponse.role,
        memberId: loginResponse.memberId,
        roles: loginResponse.roles,
        permissions: loginResponse.permissions,
        mosques: loginResponse.mosques,
        selectedMosqueId: mosqueId,
      );

      await _cacheUserData(user);
      state = AuthState.authenticated(user);
    } on DioException catch (e) {
      final error = ApiException.fromDioError(e);
      state = AuthState.unauthenticated(error.message);
    } catch (e) {
      state = AuthState.unauthenticated(e.toString());
    }
  }

  Future<void> logout() async {
    await _clearSession();
    state = const AuthState.unauthenticated();
  }

  Future<String> requestPasswordReset(String username) async {
    try {
      final response = await _dio.post(
        '/auth/forgot-password',
        data: {'username': username.trim()},
      );
      final data = response.data;
      if (data is Map<String, dynamic> && data['message'] is String) {
        return data['message'] as String;
      }
      return 'If your account exists, a reset link has been sent.';
    } on DioException catch (e) {
      final error = ApiException.fromDioError(e);
      throw Exception(error.message);
    }
  }

  Future<String> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/reset-password',
        data: {
          'token': token,
          'newPassword': newPassword,
        },
      );
      final data = response.data;
      if (data is Map<String, dynamic> && data['message'] is String) {
        return data['message'] as String;
      }
      return 'Password has been reset successfully.';
    } on DioException catch (e) {
      final error = ApiException.fromDioError(e);
      throw Exception(error.message);
    }
  }

  Future<void> selectMosque(int mosqueId) async {
    await _prefs.setInt(ApiConfig.mosqueIdKey, mosqueId);
    if (state.user != null) {
      state = AuthState.authenticated(
          state.user!.copyWith(selectedMosqueId: mosqueId));
    }
  }

  Future<void> _clearSession() async {
    await _secureStorage.delete(key: ApiConfig.tokenKey);
    await _secureStorage.delete(key: _userDataKey);
    await _prefs.remove(ApiConfig.mosqueIdKey);
  }
}

/// Provider for SharedPreferences (must be overridden at startup).
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences not initialized');
});

/// Auth state provider.
/// Note: keepAlive is enabled to prevent logout on hot reload during development.
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  // Keep state alive across hot reloads
  ref.keepAlive();
  
  final dio = ref.watch(dioProvider);
  final secureStorage = ref.watch(secureStorageProvider);
  final prefs = ref.watch(sharedPreferencesProvider);
  return AuthNotifier(dio, secureStorage, prefs);
});
