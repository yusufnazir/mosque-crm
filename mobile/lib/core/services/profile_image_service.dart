import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../config/api_config.dart';
import '../network/api_client.dart';

/// Service for profile image upload/download/delete operations.
class ProfileImageService {
  final Dio _dio;

  ProfileImageService(this._dio);

  /// Upload the current user's profile image.
  /// Returns the response containing `imageUrl`.
  Future<Map<String, dynamic>> uploadMyImage(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        filename: filePath.split('/').last,
      ),
    });
    final response = await _dio.post(
      '/profile-image/me',
      data: formData,
      options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
      ),
    );
    return response.data as Map<String, dynamic>;
  }

  /// Get the URL for the current user's profile image.
  /// Returns the full URL that can be used with CachedNetworkImage.
  String getMyImageUrl() {
    return '${ApiConfig.baseUrl}/profile-image/me';
  }

  /// Delete the current user's profile image.
  Future<void> deleteMyImage() async {
    await _dio.delete('/profile-image/me');
  }

  /// Upload an image for a specific person (admin).
  Future<Map<String, dynamic>> uploadPersonImage(
      int personId, String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        filename: filePath.split('/').last,
      ),
    });
    final response = await _dio.post(
      '/profile-image/persons/$personId',
      data: formData,
      options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
      ),
    );
    return response.data as Map<String, dynamic>;
  }

  /// Get the URL for a specific person's profile image.
  String getPersonImageUrl(int personId) {
    return '${ApiConfig.baseUrl}/profile-image/persons/$personId';
  }

  /// Delete a specific person's profile image (admin).
  Future<void> deletePersonImage(int personId) async {
    await _dio.delete('/profile-image/persons/$personId');
  }

  /// Check if the current user has a profile image.
  /// Attempts a HEAD-like request and returns true if image exists.
  Future<bool> hasMyImage() async {
    try {
      final response = await _dio.get(
        '/profile-image/me',
        options: Options(
          responseType: ResponseType.stream,
          validateStatus: (status) => status != null && status < 500,
        ),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}

final profileImageServiceProvider = Provider<ProfileImageService>((ref) {
  return ProfileImageService(ref.watch(dioProvider));
});
