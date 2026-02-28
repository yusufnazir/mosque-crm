/// Exception thrown when an API call fails.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  @override
  String toString() => 'ApiException($statusCode): $message';

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isServerError => statusCode != null && statusCode! >= 500;

  factory ApiException.fromDioError(dynamic e) {
    if (e is Exception) {
      final response = (e as dynamic).response;
      if (response != null) {
        final data = response.data;
        String message = 'Request failed';
        if (data is Map<String, dynamic>) {
          message = (data['message'] ?? data['error'] ?? message) as String;
        } else if (data is String && data.isNotEmpty) {
          message = data;
        }
        return ApiException(
          message: message,
          statusCode: response.statusCode as int?,
          data: data,
        );
      }
    }
    return ApiException(message: e.toString());
  }
}

/// Paginated response wrapper matching Spring Boot's Page<T>.
class PageResponse<T> {
  final List<T> content;
  final int totalElements;
  final int totalPages;
  final int number; // current page (0-based)
  final int size;
  final bool first;
  final bool last;

  PageResponse({
    required this.content,
    required this.totalElements,
    required this.totalPages,
    required this.number,
    required this.size,
    required this.first,
    required this.last,
  });

  factory PageResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    return PageResponse(
      content: (json['content'] as List<dynamic>?)
              ?.map((e) => fromJsonT(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalElements: (json['totalElements'] as num?)?.toInt() ?? 0,
      totalPages: (json['totalPages'] as num?)?.toInt() ?? 0,
      number: (json['number'] as num?)?.toInt() ?? 0,
      size: (json['size'] as num?)?.toInt() ?? 20,
      first: json['first'] as bool? ?? true,
      last: json['last'] as bool? ?? true,
    );
  }
}
