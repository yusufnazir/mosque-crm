/// Translation DTO for contribution types.
class ContributionTypeTranslation {
  final int? id;
  final String locale;
  final String name;
  final String? description;

  ContributionTypeTranslation({
    this.id,
    required this.locale,
    required this.name,
    this.description,
  });

  factory ContributionTypeTranslation.fromJson(Map<String, dynamic> json) {
    return ContributionTypeTranslation(
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

/// Contribution type DTO.
class ContributionType {
  final int? id;
  final String code;
  final bool isRequired;
  final bool isActive;
  final String? createdAt;
  final List<ContributionTypeTranslation> translations;
  final List<ContributionObligation> obligations;

  ContributionType({
    this.id,
    required this.code,
    this.isRequired = false,
    this.isActive = true,
    this.createdAt,
    this.translations = const [],
    this.obligations = const [],
  });

  factory ContributionType.fromJson(Map<String, dynamic> json) {
    return ContributionType(
      id: json['id'] as int?,
      code: json['code'] as String? ?? '',
      isRequired: json['isRequired'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] as String?,
      translations: (json['translations'] as List<dynamic>?)
              ?.map((e) =>
                  ContributionTypeTranslation.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      obligations: (json['obligations'] as List<dynamic>?)
              ?.map((e) =>
                  ContributionObligation.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Contribution obligation DTO.
class ContributionObligation {
  final int? id;
  final int? contributionTypeId;
  final String? contributionTypeCode;
  final String? contributionTypeName;
  final double amount;
  final String? frequency;
  final String? startDate;
  final int? currencyId;
  final String? currencyCode;
  final String? currencySymbol;

  ContributionObligation({
    this.id,
    this.contributionTypeId,
    this.contributionTypeCode,
    this.contributionTypeName,
    this.amount = 0,
    this.frequency,
    this.startDate,
    this.currencyId,
    this.currencyCode,
    this.currencySymbol,
  });

  factory ContributionObligation.fromJson(Map<String, dynamic> json) {
    return ContributionObligation(
      id: json['id'] as int?,
      contributionTypeId: json['contributionTypeId'] as int?,
      contributionTypeCode: json['contributionTypeCode'] as String?,
      contributionTypeName: json['contributionTypeName'] as String?,
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      frequency: json['frequency'] as String?,
      startDate: json['startDate'] as String?,
      currencyId: json['currencyId'] as int?,
      currencyCode: json['currencyCode'] as String?,
      currencySymbol: json['currencySymbol'] as String?,
    );
  }
}

/// Member payment DTO.
class MemberPayment {
  final int? id;
  final int? personId;
  final String? personName;
  final int? contributionTypeId;
  final String? contributionTypeCode;
  final String? contributionTypeName;
  final double amount;
  final String? paymentDate;
  final String? periodFrom;
  final String? periodTo;
  final String? reference;
  final String? notes;
  final int? createdBy;
  final String? createdAt;
  final int? currencyId;
  final String? currencyCode;
  final String? currencySymbol;
  final bool isReversal;
  final int? reversedPaymentId;

  MemberPayment({
    this.id,
    this.personId,
    this.personName,
    this.contributionTypeId,
    this.contributionTypeCode,
    this.contributionTypeName,
    this.amount = 0,
    this.paymentDate,
    this.periodFrom,
    this.periodTo,
    this.reference,
    this.notes,
    this.createdBy,
    this.createdAt,
    this.currencyId,
    this.currencyCode,
    this.currencySymbol,
    this.isReversal = false,
    this.reversedPaymentId,
  });

  factory MemberPayment.fromJson(Map<String, dynamic> json) {
    return MemberPayment(
      id: json['id'] as int?,
      personId: json['personId'] as int?,
      personName: json['personName'] as String?,
      contributionTypeId: json['contributionTypeId'] as int?,
      contributionTypeCode: json['contributionTypeCode'] as String?,
      contributionTypeName: json['contributionTypeName'] as String?,
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      paymentDate: json['paymentDate'] as String?,
      periodFrom: json['periodFrom'] as String?,
      periodTo: json['periodTo'] as String?,
      reference: json['reference'] as String?,
      notes: json['notes'] as String?,
      createdBy: json['createdBy'] as int?,
      createdAt: json['createdAt'] as String?,
      currencyId: json['currencyId'] as int?,
      currencyCode: json['currencyCode'] as String?,
      currencySymbol: json['currencySymbol'] as String?,
      isReversal: json['isReversal'] as bool? ?? false,
      reversedPaymentId: json['reversedPaymentId'] as int?,
    );
  }
}

/// Member contribution exemption DTO.
class ContributionExemption {
  final int? id;
  final int? personId;
  final String? personName;
  final int? contributionTypeId;
  final String? contributionTypeCode;
  final String? contributionTypeName;
  final String? exemptionType;
  final double? amount;
  final String? reason;
  final String? startDate;
  final String? endDate;
  final bool isActive;

  ContributionExemption({
    this.id,
    this.personId,
    this.personName,
    this.contributionTypeId,
    this.contributionTypeCode,
    this.contributionTypeName,
    this.exemptionType,
    this.amount,
    this.reason,
    this.startDate,
    this.endDate,
    this.isActive = true,
  });

  factory ContributionExemption.fromJson(Map<String, dynamic> json) {
    return ContributionExemption(
      id: json['id'] as int?,
      personId: json['personId'] as int?,
      personName: json['personName'] as String?,
      contributionTypeId: json['contributionTypeId'] as int?,
      contributionTypeCode: json['contributionTypeCode'] as String?,
      contributionTypeName: json['contributionTypeName'] as String?,
      exemptionType: json['exemptionType'] as String?,
      amount: (json['amount'] as num?)?.toDouble(),
      reason: json['reason'] as String?,
      startDate: json['startDate'] as String?,
      endDate: json['endDate'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

/// Member contribution assignment DTO.
class ContributionAssignment {
  final int? id;
  final int? personId;
  final String? personName;
  final int? contributionTypeId;
  final String? contributionTypeCode;
  final String? contributionTypeName;
  final String? startDate;
  final String? endDate;
  final bool isActive;
  final String? notes;

  ContributionAssignment({
    this.id,
    this.personId,
    this.personName,
    this.contributionTypeId,
    this.contributionTypeCode,
    this.contributionTypeName,
    this.startDate,
    this.endDate,
    this.isActive = true,
    this.notes,
  });

  factory ContributionAssignment.fromJson(Map<String, dynamic> json) {
    return ContributionAssignment(
      id: json['id'] as int?,
      personId: json['personId'] as int?,
      personName: json['personName'] as String?,
      contributionTypeId: json['contributionTypeId'] as int?,
      contributionTypeCode: json['contributionTypeCode'] as String?,
      contributionTypeName: json['contributionTypeName'] as String?,
      startDate: json['startDate'] as String?,
      endDate: json['endDate'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      notes: json['notes'] as String?,
    );
  }
}
