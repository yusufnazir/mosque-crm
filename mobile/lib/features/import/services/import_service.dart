import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';

/// Service for Excel import.
class ImportService {
  final Dio _dio;

  ImportService(this._dio);

  /// POST /admin/import/excel — upload Excel file for member import.
  Future<Map<String, dynamic>> importExcel(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath,
          filename: filePath.split('/').last),
    });
    final response = await _dio.post(
      '/admin/import/excel',
      data: formData,
      options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
      ),
    );
    return response.data as Map<String, dynamic>;
  }
}

final importServiceProvider = Provider<ImportService>((ref) {
  return ImportService(ref.watch(dioProvider));
});
