/// API configuration constants.
class ApiConfig {
  ApiConfig._();

  /// Base URL for the Spring Boot backend.
  /// 
  /// ⚠️ PRODUCTION: MUST use HTTPS (e.g., https://api.mosque.com/api)
  /// 
  /// Development options:
  /// - Android emulator: http://10.0.2.2:8080/api
  /// - iOS simulator: http://localhost:8080/api
  /// - Physical device on same network: http://<your-local-ip>:8080/api
  /// - Web: http://localhost:8080/api
  static const String baseUrl = 'http://192.168.1.105:8080/api';

  /// Connection timeout in milliseconds.
  static const int connectTimeout = 15000;

  /// Receive timeout in milliseconds.
  static const int receiveTimeout = 30000;

  /// JWT token key for secure storage.
  static const String tokenKey = 'auth_token';

  /// Selected mosque ID key for storage.
  static const String mosqueIdKey = 'selected_mosque_id';

  /// Locale key for storage.
  static const String localeKey = 'app_locale';
}
