import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';

/// Currency model.
class Currency {
  final int? id;
  final String code;
  final String? name;
  final String? symbol;
  final bool? isActive;

  Currency({
    this.id,
    required this.code,
    this.name,
    this.symbol,
    this.isActive,
  });

  factory Currency.fromJson(Map<String, dynamic> json) {
    return Currency(
      id: json['id'] as int?,
      code: json['code'] as String? ?? '',
      name: json['name'] as String?,
      symbol: json['symbol'] as String?,
      isActive: json['isActive'] as bool?,
    );
  }
}

/// Mosque currency model.
class MosqueCurrency {
  final int? id;
  final int? currencyId;
  final String? currencyCode;
  final String? currencyName;
  final String? currencySymbol;
  final bool isPrimary;
  final bool isActive;

  MosqueCurrency({
    this.id,
    this.currencyId,
    this.currencyCode,
    this.currencyName,
    this.currencySymbol,
    this.isPrimary = false,
    this.isActive = true,
  });

  factory MosqueCurrency.fromJson(Map<String, dynamic> json) {
    return MosqueCurrency(
      id: json['id'] as int?,
      currencyId: json['currencyId'] as int?,
      currencyCode: json['currencyCode'] as String? ?? json['code'] as String?,
      currencyName: json['currencyName'] as String? ?? json['name'] as String?,
      currencySymbol:
          json['currencySymbol'] as String? ?? json['symbol'] as String?,
      isPrimary: json['isPrimary'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

/// Exchange rate model.
class ExchangeRate {
  final int? id;
  final int? fromCurrencyId;
  final String? fromCurrencyCode;
  final int? toCurrencyId;
  final String? toCurrencyCode;
  final double rate;
  final String? effectiveDate;

  ExchangeRate({
    this.id,
    this.fromCurrencyId,
    this.fromCurrencyCode,
    this.toCurrencyId,
    this.toCurrencyCode,
    this.rate = 0,
    this.effectiveDate,
  });

  factory ExchangeRate.fromJson(Map<String, dynamic> json) {
    return ExchangeRate(
      id: json['id'] as int?,
      fromCurrencyId: json['fromCurrencyId'] as int?,
      fromCurrencyCode: json['fromCurrencyCode'] as String?,
      toCurrencyId: json['toCurrencyId'] as int?,
      toCurrencyCode: json['toCurrencyCode'] as String?,
      rate: (json['rate'] as num?)?.toDouble() ?? 0,
      effectiveDate: json['effectiveDate'] as String?,
    );
  }
}

/// Service for currency management.
class CurrencyService {
  final Dio _dio;

  CurrencyService(this._dio);

  /// GET /currencies — all global currencies.
  Future<List<Currency>> getAllCurrencies() async {
    final response = await _dio.get('/currencies');
    return (response.data as List<dynamic>)
        .map((e) => Currency.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /mosque-currencies
  Future<List<MosqueCurrency>> getMosqueCurrencies() async {
    final response = await _dio.get('/mosque-currencies');
    return (response.data as List<dynamic>)
        .map((e) => MosqueCurrency.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /mosque-currencies/active
  Future<List<MosqueCurrency>> getActiveMosqueCurrencies() async {
    final response = await _dio.get('/mosque-currencies/active');
    return (response.data as List<dynamic>)
        .map((e) => MosqueCurrency.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /mosque-currencies — add currency to mosque.
  Future<void> addMosqueCurrency(Map<String, dynamic> data) async {
    await _dio.post('/mosque-currencies', data: data);
  }

  /// PUT /mosque-currencies/{id} — update mosque currency.
  Future<void> updateMosqueCurrency(
      int id, Map<String, dynamic> data) async {
    await _dio.put('/mosque-currencies/$id', data: data);
  }

  /// PUT /mosque-currencies/{id}/primary — set as primary.
  Future<void> setPrimary(int id) async {
    await _dio.put('/mosque-currencies/$id/primary');
  }

  /// DELETE /mosque-currencies/{id}
  Future<void> removeMosqueCurrency(int id) async {
    await _dio.delete('/mosque-currencies/$id');
  }

  /// GET /exchange-rates
  Future<List<ExchangeRate>> getExchangeRates() async {
    final response = await _dio.get('/exchange-rates');
    return (response.data as List<dynamic>)
        .map((e) => ExchangeRate.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /exchange-rates
  Future<void> createExchangeRate(Map<String, dynamic> data) async {
    await _dio.post('/exchange-rates', data: data);
  }

  /// PUT /exchange-rates/{id}
  Future<void> updateExchangeRate(
      int id, Map<String, dynamic> data) async {
    await _dio.put('/exchange-rates/$id', data: data);
  }

  /// DELETE /exchange-rates/{id}
  Future<void> deleteExchangeRate(int id) async {
    await _dio.delete('/exchange-rates/$id');
  }
}

final currencyServiceProvider = Provider<CurrencyService>((ref) {
  return CurrencyService(ref.watch(dioProvider));
});
