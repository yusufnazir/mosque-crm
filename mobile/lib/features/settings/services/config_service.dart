import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';

/// Service for system configuration.
class ConfigService {
  final Dio _dio;

  ConfigService(this._dio);

  /// GET /configurations/APP_BASE_URL
  Future<String?> getAppBaseUrl() async {
    try {
      final response = await _dio.get('/configurations/APP_BASE_URL');
      if (response.data is Map<String, dynamic>) {
        return response.data['value'] as String?;
      }
      return response.data?.toString();
    } catch (_) {
      return null;
    }
  }

  /// POST /configurations — save a key/value pair.
  Future<void> saveConfiguration(String name, String value) async {
    await _dio.post('/configurations', data: {'name': name, 'value': value});
  }

  /// GET /configurations/mail-server
  Future<Map<String, dynamic>> getMailServerConfig() async {
    final response = await _dio.get('/configurations/mail-server');
    return response.data as Map<String, dynamic>;
  }

  /// POST /configurations/mail-server
  Future<void> saveMailServerConfig(Map<String, dynamic> data) async {
    await _dio.post('/configurations/mail-server', data: data);
  }

  /// POST /configurations/mail-server/test
  Future<Map<String, dynamic>> testMailServer() async {
    final response = await _dio.post('/configurations/mail-server/test');
    return response.data as Map<String, dynamic>;
  }
}

final configServiceProvider = Provider<ConfigService>((ref) {
  return ConfigService(ref.watch(dioProvider));
});
