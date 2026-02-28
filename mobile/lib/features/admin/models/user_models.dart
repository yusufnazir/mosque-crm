/// User model for admin user management.
class AppUser {
  final int? id;
  final String username;
  final String? email;
  final bool enabled;
  final bool locked;
  final List<String> roles;
  final String? mosqueName;
  final String? createdAt;

  AppUser({
    this.id,
    required this.username,
    this.email,
    this.enabled = true,
    this.locked = false,
    this.roles = const [],
    this.mosqueName,
    this.createdAt,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as int?,
      username: json['username'] as String? ?? '',
      email: json['email'] as String?,
      enabled: json['enabled'] as bool? ?? true,
      locked: json['locked'] as bool? ?? false,
      roles: (json['roles'] as List<dynamic>?)
              ?.map((e) {
                if (e is String) return e;
                if (e is Map<String, dynamic>) return e['name'] as String? ?? '';
                return '';
              })
              .where((s) => s.isNotEmpty)
              .toList() ??
          [],
      mosqueName: json['mosqueName'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}

/// Role model.
class AppRole {
  final int? id;
  final String name;
  final String? description;
  final List<String> permissions;
  final List<String>? assignablePermissionCodes;

  AppRole({
    this.id,
    required this.name,
    this.description,
    this.permissions = const [],
    this.assignablePermissionCodes,
  });

  factory AppRole.fromJson(Map<String, dynamic> json) {
    return AppRole(
      id: json['id'] as int?,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      permissions: (json['permissions'] as List<dynamic>?)
              ?.map((e) {
                if (e is String) return e;
                if (e is Map<String, dynamic>) return e['code'] as String? ?? '';
                return '';
              })
              .where((s) => s.isNotEmpty)
              .toList() ??
          [],
      assignablePermissionCodes:
          (json['assignablePermissionCodes'] as List<dynamic>?)
              ?.cast<String>(),
    );
  }
}

/// Permission model.
class Permission {
  final int? id;
  final String code;
  final String? description;
  final String? category;

  Permission({
    this.id,
    required this.code,
    this.description,
    this.category,
  });

  factory Permission.fromJson(Map<String, dynamic> json) {
    return Permission(
      id: json['id'] as int?,
      code: json['code'] as String? ?? '',
      description: json['description'] as String?,
      category: json['category'] as String?,
    );
  }
}
