/// API configuration constants.
class ApiConfig {
  ApiConfig._();

  /// Base URL for the Spring Boot backend.
  /// Change this to your server's address.
  /// - Android emulator: 10.0.2.2:8080
  /// - iOS simulator / physical device on same network: <your-ip>:8080
  /// - Web: localhost:8080 or same domain
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
