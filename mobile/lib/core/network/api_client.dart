import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:memberflow/core/config/api_config.dart';
import 'package:memberflow/core/providers/locale_provider.dart';

/// Provides the configured Dio HTTP client.
final dioProvider = Provider<Dio>((ref) {
  ref.keepAlive();
  
  final dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: const Duration(milliseconds: ApiConfig.connectTimeout),
    receiveTimeout: const Duration(milliseconds: ApiConfig.receiveTimeout),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ));

  dio.interceptors.add(AuthInterceptor(ref));
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
  ));

  return dio;
});

/// Provides secure storage for sensitive data (JWT).
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  ref.keepAlive();
  
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
});

/// Provides shared preferences for non-sensitive data.
final sharedPreferencesProvider = FutureProvider<SharedPreferences>((ref) async {
  return SharedPreferences.getInstance();
});

/// Dio interceptor that attaches JWT and X-Mosque-Id headers.
class AuthInterceptor extends Interceptor {
  final Ref _ref;

  AuthInterceptor(this._ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final storage = _ref.read(secureStorageProvider);

    // Attach JWT
    final token = await storage.read(key: ApiConfig.tokenKey);
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    // Attach mosque ID
    final prefs = await SharedPreferences.getInstance();
    final mosqueId = prefs.getInt(ApiConfig.mosqueIdKey);
    if (mosqueId != null) {
      options.headers['X-Mosque-Id'] = mosqueId.toString();
    }

    // Attach Accept-Language header based on user's locale
    try {
      final locale = _ref.read(localeProvider);
      options.headers['Accept-Language'] = locale.languageCode;
    } catch (_) {
      // If locale provider is not available (during initialization), default to 'en'
      options.headers['Accept-Language'] = 'en';
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expired — handled by auth provider
      _ref.read(secureStorageProvider).delete(key: ApiConfig.tokenKey);
    }
    handler.next(err);
  }
}
