/// Person model matching PersonDTO from the backend.
class Person {
  final int? id;
  final String firstName;
  final String lastName;
  final String? gender;
  final String? dateOfBirth;
  final String? dateOfDeath;
  final String? email;
  final String? phone;
  final String? address;
  final String? city;
  final String? country;
  final String? postalCode;
  final String? status;
  final String? createdAt;
  final String? updatedAt;
  final String? username;
  final String? role;
  final List<String> roles;
  final bool accountEnabled;
  final bool hasPortalAccess;
  final bool hasGedcomData;
  final String? gedcomIndividualId;
  final bool hasActiveMembership;

  Person({
    this.id,
    required this.firstName,
    required this.lastName,
    this.gender,
    this.dateOfBirth,
    this.dateOfDeath,
    this.email,
    this.phone,
    this.address,
    this.city,
    this.country,
    this.postalCode,
    this.status,
    this.createdAt,
    this.updatedAt,
    this.username,
    this.role,
    this.roles = const [],
    this.accountEnabled = false,
    this.hasPortalAccess = false,
    this.hasGedcomData = false,
    this.gedcomIndividualId,
    this.hasActiveMembership = false,
  });

  String get fullName => '$firstName $lastName';

  factory Person.fromJson(Map<String, dynamic> json) {
    return Person(
      id: json['id'] as int?,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      gender: json['gender'] as String?,
      dateOfBirth: json['dateOfBirth'] as String?,
      dateOfDeath: json['dateOfDeath'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      country: json['country'] as String?,
      postalCode: json['postalCode'] as String?,
      status: json['status'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
      username: json['username'] as String?,
      role: json['role'] as String?,
      roles: (json['roles'] as List<dynamic>?)?.cast<String>() ?? [],
      accountEnabled: json['accountEnabled'] as bool? ?? false,
      hasPortalAccess: json['hasPortalAccess'] as bool? ?? false,
      hasGedcomData: json['hasGedcomData'] as bool? ?? false,
      gedcomIndividualId: json['gedcomIndividualId'] as String?,
      hasActiveMembership: json['hasActiveMembership'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'firstName': firstName,
        'lastName': lastName,
        'gender': gender,
        'dateOfBirth': dateOfBirth,
        'email': email,
        'phone': phone,
        'address': address,
        'city': city,
        'country': country,
        'postalCode': postalCode,
      };
}

/// Membership list item matching MembershipListDTO.
class MembershipListItem {
  final String? personId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? gender;
  final String? dateOfBirth;
  final String? address;
  final String? city;
  final String? country;
  final String? postalCode;
  final String? status;
  final String? membershipType;
  final String? startDate;
  final String? endDate;
  final String? dateOfDeath;
  final String? username;
  final String? role;
  final bool needsAccount;

  MembershipListItem({
    this.personId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.gender,
    this.dateOfBirth,
    this.address,
    this.city,
    this.country,
    this.postalCode,
    this.status,
    this.membershipType,
    this.startDate,
    this.endDate,
    this.dateOfDeath,
    this.username,
    this.role,
    this.needsAccount = false,
  });

  String get fullName => '$firstName $lastName';

  factory MembershipListItem.fromJson(Map<String, dynamic> json) {
    return MembershipListItem(
      personId: json['personId']?.toString(),
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      gender: json['gender'] as String?,
      dateOfBirth: json['dateOfBirth'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      country: json['country'] as String?,
      postalCode: json['postalCode'] as String?,
      status: json['status'] as String?,
      membershipType: json['membershipType'] as String?,
      startDate: json['startDate'] as String?,
      endDate: json['endDate'] as String?,
      dateOfDeath: json['dateOfDeath'] as String?,
      username: json['username'] as String?,
      role: json['role'] as String?,
      needsAccount: json['needsAccount'] as bool? ?? false,
    );
  }
}
