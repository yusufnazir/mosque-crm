/// Translation DTO for groups.
class GroupTranslation {
  final int? id;
  final String locale;
  final String name;
  final String? description;

  GroupTranslation({
    this.id,
    required this.locale,
    required this.name,
    this.description,
  });

  factory GroupTranslation.fromJson(Map<String, dynamic> json) {
    return GroupTranslation(
      id: json['id'] as int?,
      locale: json['locale'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'locale': locale,
        'name': name,
        'description': description,
      };
}

/// Translation DTO for group roles.
class GroupRoleTranslation {
  final int? id;
  final String locale;
  final String name;

  GroupRoleTranslation({this.id, required this.locale, required this.name});

  factory GroupRoleTranslation.fromJson(Map<String, dynamic> json) {
    return GroupRoleTranslation(
      id: json['id'] as int?,
      locale: json['locale'] as String,
      name: json['name'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'locale': locale,
        'name': name,
      };
}

/// Group role DTO.
class GroupRole {
  final int? id;
  final int? groupId;
  final String name;
  final int? sortOrder;
  final int? maxMembers;
  final bool isActive;
  final int? mosqueId;
  final String? createdAt;
  final List<GroupRoleTranslation> translations;

  GroupRole({
    this.id,
    this.groupId,
    required this.name,
    this.sortOrder,
    this.maxMembers,
    this.isActive = true,
    this.mosqueId,
    this.createdAt,
    this.translations = const [],
  });

  factory GroupRole.fromJson(Map<String, dynamic> json) {
    return GroupRole(
      id: json['id'] as int?,
      groupId: json['groupId'] as int?,
      name: json['name'] as String? ?? '',
      sortOrder: json['sortOrder'] as int?,
      maxMembers: json['maxMembers'] as int?,
      isActive: json['isActive'] as bool? ?? true,
      mosqueId: json['mosqueId'] as int?,
      createdAt: json['createdAt'] as String?,
      translations: (json['translations'] as List<dynamic>?)
              ?.map(
                  (e) => GroupRoleTranslation.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Group DTO.
class Group {
  final int? id;
  final String name;
  final String? description;
  final String? startDate;
  final String? endDate;
  final bool isActive;
  final int? createdBy;
  final int? mosqueId;
  final String? createdAt;
  final List<GroupTranslation> translations;
  final int memberCount;

  Group({
    this.id,
    required this.name,
    this.description,
    this.startDate,
    this.endDate,
    this.isActive = true,
    this.createdBy,
    this.mosqueId,
    this.createdAt,
    this.translations = const [],
    this.memberCount = 0,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      id: json['id'] as int?,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      startDate: json['startDate'] as String?,
      endDate: json['endDate'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      createdBy: json['createdBy'] as int?,
      mosqueId: json['mosqueId'] as int?,
      createdAt: json['createdAt'] as String?,
      translations: (json['translations'] as List<dynamic>?)
              ?.map((e) => GroupTranslation.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      memberCount: json['memberCount'] as int? ?? 0,
    );
  }
}

/// Group member DTO.
class GroupMember {
  final int? id;
  final int? groupId;
  final int? personId;
  final String? startDate;
  final String? endDate;
  final String? roleInGroup;
  final int? groupRoleId;
  final String? roleName;
  final int? createdBy;
  final int? mosqueId;
  final String? createdAt;
  final String? personFirstName;
  final String? personLastName;

  GroupMember({
    this.id,
    this.groupId,
    this.personId,
    this.startDate,
    this.endDate,
    this.roleInGroup,
    this.groupRoleId,
    this.roleName,
    this.createdBy,
    this.mosqueId,
    this.createdAt,
    this.personFirstName,
    this.personLastName,
  });

  String get personFullName =>
      '${personFirstName ?? ''} ${personLastName ?? ''}'.trim();

  factory GroupMember.fromJson(Map<String, dynamic> json) {
    return GroupMember(
      id: json['id'] as int?,
      groupId: json['groupId'] as int?,
      personId: json['personId'] as int?,
      startDate: json['startDate'] as String?,
      endDate: json['endDate'] as String?,
      roleInGroup: json['roleInGroup'] as String?,
      groupRoleId: json['groupRoleId'] as int?,
      roleName: json['roleName'] as String?,
      createdBy: json['createdBy'] as int?,
      mosqueId: json['mosqueId'] as int?,
      createdAt: json['createdAt'] as String?,
      personFirstName: json['personFirstName'] as String?,
      personLastName: json['personLastName'] as String?,
    );
  }
}
