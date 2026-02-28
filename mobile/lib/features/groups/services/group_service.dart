import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../models/group_models.dart';

/// API service for group-related endpoints.
class GroupService {
  final Dio _dio;

  GroupService(this._dio);

  /// GET /groups — list all groups.
  Future<List<Group>> getGroups() async {
    final response = await _dio.get('/groups');
    return (response.data as List<dynamic>)
        .map((e) => Group.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /groups/{id}
  Future<Group> getGroup(int id) async {
    final response = await _dio.get('/groups/$id');
    return Group.fromJson(response.data as Map<String, dynamic>);
  }

  /// GET /groups/{id}/members
  Future<List<GroupMember>> getGroupMembers(int groupId) async {
    final response = await _dio.get('/groups/$groupId/members');
    return (response.data as List<dynamic>)
        .map((e) => GroupMember.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /groups/{groupId}/roles
  Future<List<GroupRole>> getGroupRoles(int groupId) async {
    final response = await _dio.get('/groups/$groupId/roles');
    return (response.data as List<dynamic>)
        .map((e) => GroupRole.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /groups
  Future<Group> createGroup(Map<String, dynamic> data) async {
    final response = await _dio.post('/groups', data: data);
    return Group.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /groups/{id}
  Future<Group> updateGroup(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/groups/$id', data: data);
    return Group.fromJson(response.data as Map<String, dynamic>);
  }

  /// POST /groups/members — add member to group.
  Future<void> addGroupMember(Map<String, dynamic> data) async {
    await _dio.post('/groups/members', data: data);
  }

  /// PUT /groups/members/{id} — update group member.
  Future<void> updateGroupMember(int id, Map<String, dynamic> data) async {
    await _dio.put('/groups/members/$id', data: data);
  }

  /// DELETE /groups/members/{id}
  Future<void> removeGroupMember(int id) async {
    await _dio.delete('/groups/members/$id');
  }

  /// DELETE /groups/{id}
  Future<void> deleteGroup(int id) async {
    await _dio.delete('/groups/$id');
  }
}

final groupServiceProvider = Provider<GroupService>((ref) {
  return GroupService(ref.watch(dioProvider));
});
