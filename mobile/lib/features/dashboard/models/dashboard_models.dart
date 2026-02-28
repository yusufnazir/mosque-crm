/// Age distribution bucket.
class AgeBucket {
  final String bucket;
  final int count;

  AgeBucket({required this.bucket, this.count = 0});

  factory AgeBucket.fromJson(Map<String, dynamic> json) {
    return AgeBucket(
      bucket: json['bucket'] as String? ?? 'Unknown',
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Gender distribution item.
class GenderDatum {
  final String gender;
  final int count;

  GenderDatum({required this.gender, this.count = 0});

  factory GenderDatum.fromJson(Map<String, dynamic> json) {
    return GenderDatum(
      gender: json['gender'] as String? ?? 'Unknown',
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Age-gender distribution item.
class AgeGenderBucket {
  final String bucket;
  final String gender;
  final int count;

  AgeGenderBucket({required this.bucket, required this.gender, this.count = 0});

  factory AgeGenderBucket.fromJson(Map<String, dynamic> json) {
    return AgeGenderBucket(
      bucket: json['bucket'] as String? ?? 'Unknown',
      gender: json['gender'] as String? ?? 'Unknown',
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Family size distribution item.
class FamilySizeDatum {
  final int size;
  final int count;

  FamilySizeDatum({required this.size, this.count = 0});

  factory FamilySizeDatum.fromJson(Map<String, dynamic> json) {
    return FamilySizeDatum(
      size: (json['size'] as num?)?.toInt() ?? 0,
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Dashboard statistics model.
class DashboardStats {
  final int totalMembers;
  final int activeMembers;
  final int newMembersThisMonth;
  final int totalGroups;
  final Map<String, double> recentPayments; // currencyCode -> amount

  DashboardStats({
    this.totalMembers = 0,
    this.activeMembers = 0,
    this.newMembersThisMonth = 0,
    this.totalGroups = 0,
    this.recentPayments = const {},
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    final payments = <String, double>{};
    if (json['recentPayments'] is Map) {
      (json['recentPayments'] as Map<String, dynamic>).forEach((key, value) {
        payments[key] = (value as num).toDouble();
      });
    }
    return DashboardStats(
      totalMembers: json['totalMembers'] as int? ?? 0,
      activeMembers: json['activeMembers'] as int? ?? 0,
      newMembersThisMonth: json['newMembersThisMonth'] as int? ?? 0,
      totalGroups: json['totalGroups'] as int? ?? 0,
      recentPayments: payments,
    );
  }
}

/// Contribution total report DTO.
class ContributionTotalReport {
  final int year;
  final List<String> currencies;
  final List<ContributionTotalRow> rows;
  final List<CurrencyTotal> grandTotals;

  ContributionTotalReport({
    required this.year,
    this.currencies = const [],
    this.rows = const [],
    this.grandTotals = const [],
  });

  factory ContributionTotalReport.fromJson(Map<String, dynamic> json) {
    return ContributionTotalReport(
      year: json['year'] as int? ?? DateTime.now().year,
      currencies: (json['currencies'] as List<dynamic>?)?.cast<String>() ?? [],
      rows: (json['rows'] as List<dynamic>?)
              ?.map((e) =>
                  ContributionTotalRow.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      grandTotals: (json['grandTotals'] as List<dynamic>?)
              ?.map((e) => CurrencyTotal.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class ContributionTotalRow {
  final int? contributionTypeId;
  final String? contributionTypeCode;
  final String? contributionTypeName;
  final List<CurrencyTotal> totals;

  ContributionTotalRow({
    this.contributionTypeId,
    this.contributionTypeCode,
    this.contributionTypeName,
    this.totals = const [],
  });

  factory ContributionTotalRow.fromJson(Map<String, dynamic> json) {
    return ContributionTotalRow(
      contributionTypeId: json['contributionTypeId'] as int?,
      contributionTypeCode: json['contributionTypeCode'] as String?,
      contributionTypeName: json['contributionTypeName'] as String?,
      totals: (json['totals'] as List<dynamic>?)
              ?.map((e) => CurrencyTotal.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class CurrencyTotal {
  final String currencyCode;
  final double amount;

  CurrencyTotal({required this.currencyCode, this.amount = 0});

  factory CurrencyTotal.fromJson(Map<String, dynamic> json) {
    return CurrencyTotal(
      currencyCode: json['currencyCode'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
    );
  }
}
