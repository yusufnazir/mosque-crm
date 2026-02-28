import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../models/dashboard_models.dart';

/// API service for dashboard & report endpoints.
class DashboardService {
  final Dio _dio;

  DashboardService(this._dio);

  /// GET /persons/stats — person statistics for dashboard.
  Future<Map<String, dynamic>> getPersonStats() async {
    final response = await _dio.get('/persons/stats');
    return response.data as Map<String, dynamic>;
  }

  /// GET /genealogy/families — families list (we just need count).
  Future<int> getFamilyCount() async {
    try {
      final response = await _dio.get('/genealogy/families');
      final data = response.data;
      if (data is Map<String, dynamic> && data.containsKey('count')) {
        return (data['count'] as num?)?.toInt() ?? 0;
      }
      if (data is List) return data.length;
      return 0;
    } catch (_) {
      return 0;
    }
  }

  /// GET /genealogy/age-distribution
  Future<List<AgeBucket>> getAgeDistribution() async {
    final response = await _dio.get('/genealogy/age-distribution');
    return (response.data as List<dynamic>)
        .map((e) => AgeBucket.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /genealogy/gender-breakdown
  Future<List<GenderDatum>> getGenderDistribution() async {
    final response = await _dio.get('/genealogy/gender-breakdown');
    return (response.data as List<dynamic>)
        .map((e) => GenderDatum.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /genealogy/age-gender-distribution
  Future<List<AgeGenderBucket>> getAgeGenderDistribution() async {
    final response = await _dio.get('/genealogy/age-gender-distribution');
    return (response.data as List<dynamic>)
        .map((e) => AgeGenderBucket.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /genealogy/family-size-distribution
  Future<List<FamilySizeDatum>> getFamilySizeDistribution() async {
    final response = await _dio.get('/genealogy/family-size-distribution');
    return (response.data as List<dynamic>)
        .map((e) => FamilySizeDatum.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /reports/contribution-totals — contribution totals report.
  Future<ContributionTotalReport> getContributionTotals({int? year}) async {
    final queryParams = <String, dynamic>{};
    if (year != null) queryParams['year'] = year;
    final response = await _dio.get('/reports/contribution-totals',
        queryParameters: queryParams);
    return ContributionTotalReport.fromJson(
        response.data as Map<String, dynamic>);
  }

  /// GET /contributions/payments/stats/years — available payment years.
  Future<List<int>> getPaymentYears() async {
    final response = await _dio.get('/contributions/payments/stats/years');
    return (response.data as List<dynamic>)
        .map((e) => (e as num).toInt())
        .toList();
  }

  /// GET /reports/payment-summary — payment summary report.
  Future<Map<String, dynamic>> getPaymentSummary({int? year}) async {
    final queryParams = <String, dynamic>{};
    if (year != null) queryParams['year'] = year;
    final response =
        await _dio.get('/reports/payment-summary', queryParameters: queryParams);
    return response.data as Map<String, dynamic>;
  }
}

final dashboardServiceProvider = Provider<DashboardService>((ref) {
  return DashboardService(ref.watch(dioProvider));
});
