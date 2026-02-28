/// Login request payload.
class LoginRequest {
  final String username;
  final String password;

  LoginRequest({required this.username, required this.password});

  Map<String, dynamic> toJson() => {
        'username': username,
        'password': password,
      };
}

/// Login response from the backend.
class LoginResponse {
  final String token;
  final String username;
  final String? role;
  final int? memberId;
  final List<String> roles;
  final List<String> permissions;
  final List<MosqueInfo> mosques;

  LoginResponse({
    required this.token,
    required this.username,
    this.role,
    this.memberId,
    this.roles = const [],
    this.permissions = const [],
    this.mosques = const [],
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      token: json['token'] as String,
      username: json['username'] as String,
      role: json['role'] as String?,
      memberId: json['memberId'] as int?,
      roles: (json['roles'] as List<dynamic>?)?.cast<String>() ?? [],
      permissions: (json['permissions'] as List<dynamic>?)?.cast<String>() ?? [],
      mosques: (json['mosques'] as List<dynamic>?)
              ?.map((e) => MosqueInfo.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Mosque info returned in login response.
class MosqueInfo {
  final int id;
  final String name;

  MosqueInfo({required this.id, required this.name});

  factory MosqueInfo.fromJson(Map<String, dynamic> json) {
    return MosqueInfo(
      id: json['id'] as int,
      name: json['name'] as String,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name};
}

/// Current authenticated user state.
class AuthUser {
  final String username;
  final String token;
  final String? role;
  final int? memberId;
  final List<String> roles;
  final List<String> permissions;
  final List<MosqueInfo> mosques;
  final int? selectedMosqueId;

  AuthUser({
    required this.username,
    required this.token,
    this.role,
    this.memberId,
    this.roles = const [],
    this.permissions = const [],
    this.mosques = const [],
    this.selectedMosqueId,
  });

  bool hasPermission(String permission) => permissions.contains(permission);
  bool get isAdmin => roles.contains('ADMIN');

  AuthUser copyWith({int? selectedMosqueId}) {
    return AuthUser(
      username: username,
      token: token,
      role: role,
      memberId: memberId,
      roles: roles,
      permissions: permissions,
      mosques: mosques,
      selectedMosqueId: selectedMosqueId ?? this.selectedMosqueId,
    );
  }

  Map<String, dynamic> toJson() => {
        'username': username,
        'token': token,
        'role': role,
        'memberId': memberId,
        'roles': roles,
        'permissions': permissions,
        'mosques': mosques.map((m) => m.toJson()).toList(),
        'selectedMosqueId': selectedMosqueId,
      };

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      username: json['username'] as String,
      token: json['token'] as String,
      role: json['role'] as String?,
      memberId: (json['memberId'] as num?)?.toInt(),
      roles: (json['roles'] as List<dynamic>?)?.cast<String>() ?? [],
      permissions:
          (json['permissions'] as List<dynamic>?)?.cast<String>() ?? [],
      mosques: (json['mosques'] as List<dynamic>?)
              ?.map((e) => MosqueInfo.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      selectedMosqueId: (json['selectedMosqueId'] as num?)?.toInt(),
    );
  }
}
