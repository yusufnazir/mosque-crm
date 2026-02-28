import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../models/member_models.dart';

/// API service for person/member related endpoints.
class MemberService {
  final Dio _dio;

  MemberService(this._dio);

  /// GET /persons/page — paginated persons list.
  Future<PageResponse<Person>> getPersons({
    int page = 0,
    int size = 20,
    String? search,
    String? status,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'size': size,
    };
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (status != null) queryParams['status'] = status;

    final response = await _dio.get('/persons/page',
        queryParameters: queryParams);
    return PageResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => Person.fromJson(json as Map<String, dynamic>),
    );
  }

  /// GET /persons/active — all active persons.
  Future<List<Person>> getActivePersons() async {
    final response = await _dio.get('/persons/active');
    return (response.data as List<dynamic>)
        .map((e) => Person.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /persons/{id}
  Future<Person> getPerson(int id) async {
    final response = await _dio.get('/persons/$id');
    return Person.fromJson(response.data as Map<String, dynamic>);
  }

  /// GET /persons/stats
  Future<Map<String, dynamic>> getPersonStats() async {
    final response = await _dio.get('/persons/stats');
    return response.data as Map<String, dynamic>;
  }

  /// GET /persons/search
  Future<List<Person>> searchPersons(String query) async {
    final response =
        await _dio.get('/persons/search', queryParameters: {'q': query});
    return (response.data as List<dynamic>)
        .map((e) => Person.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /persons
  Future<Person> createPerson(Map<String, dynamic> data) async {
    final response = await _dio.post('/persons', data: data);
    return Person.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /persons/{id}
  Future<Person> updatePerson(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/persons/$id', data: data);
    return Person.fromJson(response.data as Map<String, dynamic>);
  }

  /// GET /memberships — all memberships list.
  Future<List<MembershipListItem>> getMemberships() async {
    final response = await _dio.get('/memberships');
    return (response.data as List<dynamic>)
        .map((e) => MembershipListItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /memberships — create membership.
  Future<void> createMembership(Map<String, dynamic> data) async {
    await _dio.post('/memberships', data: data);
  }

  /// PUT /memberships/{personId} — update membership.
  Future<void> updateMembership(
      String personId, Map<String, dynamic> data) async {
    await _dio.put('/memberships/$personId', data: data);
  }

  /// PUT /admin/members/{id} — update member with account management.
  Future<void> updateMember(int id, Map<String, dynamic> data) async {
    await _dio.put('/admin/members/$id', data: data);
  }

  /// GET /admin/roles — available roles for account assignment.
  Future<List<Map<String, dynamic>>> getAvailableRoles() async {
    try {
      final response = await _dio.get('/admin/roles');
      return (response.data as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// GET /genealogy/persons/{personId}/relationships — returns count of family members.
  Future<int> getFamilyMemberCount(int personId) async {
    try {
      final response =
          await _dio.get('/genealogy/persons/$personId/relationships');
      final list = response.data as List<dynamic>? ?? [];
      return list.length;
    } catch (_) {
      return 0;
    }
  }
}

final memberServiceProvider = Provider<MemberService>((ref) {
  return MemberService(ref.watch(dioProvider));
});
