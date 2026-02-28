import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';

/// Service for reports.
class ReportService {
  final Dio _dio;

  ReportService(this._dio);

  /// GET /reports/payment-summary
  Future<Map<String, dynamic>> getPaymentSummary({
    int? year,
    String locale = 'en',
    int page = 0,
    int size = 20,
  }) async {
    final params = <String, dynamic>{
      'locale': locale,
      'page': page,
      'size': size,
    };
    if (year != null) params['year'] = year;
    final response =
        await _dio.get('/reports/payment-summary', queryParameters: params);
    return response.data as Map<String, dynamic>;
  }

  /// GET /reports/payment-summary (all rows for export)
  Future<Map<String, dynamic>> getPaymentSummaryAll({
    int? year,
    String locale = 'en',
  }) async {
    final params = <String, dynamic>{
      'locale': locale,
      'page': 0,
      'size': 0,
    };
    if (year != null) params['year'] = year;
    final response =
        await _dio.get('/reports/payment-summary', queryParameters: params);
    return response.data as Map<String, dynamic>;
  }

  /// GET /reports/contribution-totals
  Future<Map<String, dynamic>> getContributionTotals({
    int? year,
    String locale = 'en',
  }) async {
    final params = <String, dynamic>{'locale': locale};
    if (year != null) params['year'] = year;
    final response = await _dio.get('/reports/contribution-totals',
        queryParameters: params);
    return response.data as Map<String, dynamic>;
  }

  /// GET /contributions/payments/stats/years
  Future<List<int>> getPaymentYears() async {
    final response =
        await _dio.get('/contributions/payments/stats/years');
    return (response.data as List<dynamic>)
        .map((e) => (e as num).toInt())
        .toList();
  }
}

final reportServiceProvider = Provider<ReportService>((ref) {
  return ReportService(ref.watch(dioProvider));
});
