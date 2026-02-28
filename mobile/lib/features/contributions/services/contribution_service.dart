import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../models/contribution_models.dart';

/// API service for contribution-related endpoints.
class ContributionService {
  final Dio _dio;

  ContributionService(this._dio);

  // ── Contribution Types ──

  /// GET /contributions/types
  Future<List<ContributionType>> getTypes() async {
    final response = await _dio.get('/contributions/types');
    return (response.data as List<dynamic>)
        .map((e) => ContributionType.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /contributions/types/active
  Future<List<ContributionType>> getActiveTypes() async {
    final response = await _dio.get('/contributions/types/active');
    return (response.data as List<dynamic>)
        .map((e) => ContributionType.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /contributions/types
  Future<ContributionType> createType(Map<String, dynamic> data) async {
    final response = await _dio.post('/contributions/types', data: data);
    return ContributionType.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /contributions/types/{id}
  Future<ContributionType> updateType(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/contributions/types/$id', data: data);
    return ContributionType.fromJson(response.data as Map<String, dynamic>);
  }

  /// DELETE /contributions/types/{id}
  Future<void> deleteType(int id) async {
    await _dio.delete('/contributions/types/$id');
  }

  // ── Obligations ──

  /// GET /contributions/obligations
  Future<List<ContributionObligation>> getObligations() async {
    final response = await _dio.get('/contributions/obligations');
    return (response.data as List<dynamic>)
        .map((e) =>
            ContributionObligation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /contributions/obligations/by-type/{typeId}
  Future<List<ContributionObligation>> getObligationsByType(int typeId) async {
    final response =
        await _dio.get('/contributions/obligations/by-type/$typeId');
    return (response.data as List<dynamic>)
        .map((e) =>
            ContributionObligation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /contributions/obligations
  Future<ContributionObligation> createObligation(Map<String, dynamic> data) async {
    final response = await _dio.post('/contributions/obligations', data: data);
    return ContributionObligation.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /contributions/obligations/{id}
  Future<ContributionObligation> updateObligation(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/contributions/obligations/$id', data: data);
    return ContributionObligation.fromJson(response.data as Map<String, dynamic>);
  }

  /// DELETE /contributions/obligations/{id}
  Future<void> deleteObligation(int id) async {
    await _dio.delete('/contributions/obligations/$id');
  }

  // ── Payments ──

  /// GET /contributions/payments — paginated, with filters.
  Future<PageResponse<MemberPayment>> getPayments({
    int page = 0,
    int size = 20,
    int? personId,
    int? contributionTypeId,
    String? startDate,
    String? endDate,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'size': size,
    };
    if (personId != null) queryParams['personId'] = personId;
    if (contributionTypeId != null) {
      queryParams['contributionTypeId'] = contributionTypeId;
    }
    if (startDate != null) queryParams['startDate'] = startDate;
    if (endDate != null) queryParams['endDate'] = endDate;

    final response =
        await _dio.get('/contributions/payments', queryParameters: queryParams);
    return PageResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => MemberPayment.fromJson(json as Map<String, dynamic>),
    );
  }

  /// GET /contributions/payments/by-person/{personId}
  Future<List<MemberPayment>> getPaymentsByPerson(int personId) async {
    final response =
        await _dio.get('/contributions/payments/by-person/$personId');
    return (response.data as List<dynamic>)
        .map((e) => MemberPayment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /contributions/payments
  Future<MemberPayment> createPayment(Map<String, dynamic> data) async {
    final response = await _dio.post('/contributions/payments', data: data);
    return MemberPayment.fromJson(response.data as Map<String, dynamic>);
  }

  /// POST /contributions/payments/{id}/reverse
  Future<void> reversePayment(int id) async {
    await _dio.post('/contributions/payments/$id/reverse');
  }

  /// PUT /contributions/payments/{id}
  Future<MemberPayment> updatePayment(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/contributions/payments/$id', data: data);
    return MemberPayment.fromJson(response.data as Map<String, dynamic>);
  }

  /// DELETE /contributions/payments/{id}
  Future<void> deletePayment(int id) async {
    await _dio.delete('/contributions/payments/$id');
  }

  // ── Exemptions ──

  /// GET /contributions/exemptions
  Future<List<ContributionExemption>> getExemptions() async {
    final response = await _dio.get('/contributions/exemptions');
    return (response.data as List<dynamic>)
        .map((e) =>
            ContributionExemption.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /contributions/exemptions
  Future<ContributionExemption> createExemption(
      Map<String, dynamic> data) async {
    final response =
        await _dio.post('/contributions/exemptions', data: data);
    return ContributionExemption.fromJson(
        response.data as Map<String, dynamic>);
  }

  /// PUT /contributions/exemptions/{id}
  Future<ContributionExemption> updateExemption(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/contributions/exemptions/$id', data: data);
    return ContributionExemption.fromJson(response.data as Map<String, dynamic>);
  }

  /// DELETE /contributions/exemptions/{id}
  Future<void> deleteExemption(int id) async {
    await _dio.delete('/contributions/exemptions/$id');
  }

  // ── Assignments ──

  /// GET /contributions/assignments
  Future<List<ContributionAssignment>> getAssignments() async {
    final response = await _dio.get('/contributions/assignments');
    return (response.data as List<dynamic>)
        .map((e) =>
            ContributionAssignment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /contributions/assignments
  Future<ContributionAssignment> createAssignment(
      Map<String, dynamic> data) async {
    final response =
        await _dio.post('/contributions/assignments', data: data);
    return ContributionAssignment.fromJson(
        response.data as Map<String, dynamic>);
  }

  /// PUT /contributions/assignments/{id}
  Future<ContributionAssignment> updateAssignment(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/contributions/assignments/$id', data: data);
    return ContributionAssignment.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /contributions/assignments/{id}/toggle
  Future<void> toggleAssignment(int id) async {
    await _dio.put('/contributions/assignments/$id/toggle');
  }

  /// DELETE /contributions/assignments/{id}
  Future<void> deleteAssignment(int id) async {
    await _dio.delete('/contributions/assignments/$id');
  }

  /// GET /contributions/assignments/by-person/{personId}/active
  Future<List<ContributionAssignment>> getActiveAssignmentsByPerson(
      int personId) async {
    final response = await _dio
        .get('/contributions/assignments/by-person/$personId/active');
    return (response.data as List<dynamic>)
        .map((e) =>
            ContributionAssignment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ── Stats ──

  /// GET /contributions/payments/stats/income-by-type
  Future<List<Map<String, dynamic>>> getIncomeByType({int? year}) async {
    final queryParams = <String, dynamic>{};
    if (year != null) queryParams['year'] = year;
    final response = await _dio.get('/contributions/payments/stats/income-by-type',
        queryParameters: queryParams);
    return (response.data as List<dynamic>).cast<Map<String, dynamic>>();
  }

  /// GET /contributions/payments/stats/years
  Future<List<int>> getPaymentYears() async {
    final response =
        await _dio.get('/contributions/payments/stats/years');
    return (response.data as List<dynamic>).cast<int>();
  }
}

final contributionServiceProvider = Provider<ContributionService>((ref) {
  return ContributionService(ref.watch(dioProvider));
});
