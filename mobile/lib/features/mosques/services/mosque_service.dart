import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';

/// Mosque model.
class Mosque {
  final int? id;
  final String name;
  final String? shortName;
  final String? city;
  final String? country;
  final String? address;
  final String? postalCode;
  final String? phone;
  final String? email;
  final String? website;
  final bool isActive;

  Mosque({
    this.id,
    required this.name,
    this.shortName,
    this.city,
    this.country,
    this.address,
    this.postalCode,
    this.phone,
    this.email,
    this.website,
    this.isActive = true,
  });

  factory Mosque.fromJson(Map<String, dynamic> json) {
    return Mosque(
      id: json['id'] as int?,
      name: json['name'] as String? ?? '',
      shortName: json['shortName'] as String?,
      city: json['city'] as String?,
      country: json['country'] as String?,
      address: json['address'] as String?,
      postalCode: json['postalCode'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      website: json['website'] as String?,
      isActive: json['active'] as bool? ?? json['isActive'] as bool? ?? true,
    );
  }
}

/// Service for mosque management.
class MosqueService {
  final Dio _dio;

  MosqueService(this._dio);

  /// GET /mosques
  Future<List<Mosque>> getMosques() async {
    final response = await _dio.get('/mosques');
    return (response.data as List<dynamic>)
        .map((e) => Mosque.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /mosques
  Future<Mosque> createMosque(Map<String, dynamic> data) async {
    final response = await _dio.post('/mosques', data: data);
    return Mosque.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /mosques/{id}
  Future<Mosque> updateMosque(int id, Map<String, dynamic> data) async {
    final response = await _dio.put('/mosques/$id', data: data);
    return Mosque.fromJson(response.data as Map<String, dynamic>);
  }
}

final mosqueServiceProvider = Provider<MosqueService>((ref) {
  return MosqueService(ref.watch(dioProvider));
});
