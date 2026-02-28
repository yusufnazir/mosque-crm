import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';

import '../../../core/theme/app_theme.dart';
import '../services/import_service.dart';

/// Import screen: pick an Excel file and upload to backend.
class ImportScreen extends ConsumerStatefulWidget {
  const ImportScreen({super.key});

  @override
  ConsumerState<ImportScreen> createState() => _ImportScreenState();
}

class _ImportScreenState extends ConsumerState<ImportScreen> {
  PlatformFile? _selectedFile;
  bool _isUploading = false;
  Map<String, dynamic>? _result;
  String? _error;

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['xlsx', 'xls'],
      );
      if (result != null && result.files.isNotEmpty) {
        setState(() {
          _selectedFile = result.files.first;
          _result = null;
          _error = null;
        });
      }
    } catch (e) {
      setState(() => _error = 'Could not pick file: $e');
    }
  }

  Future<void> _upload() async {
    if (_selectedFile == null || _selectedFile!.path == null) return;
    setState(() {
      _isUploading = true;
      _error = null;
      _result = null;
    });
    try {
      final result =
          await ref.read(importServiceProvider).importExcel(_selectedFile!.path!);
      if (mounted) {
        setState(() {
          _result = result;
          _isUploading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = '$e';
          _isUploading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Import Data')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info card
            Card(
              color: AppColors.emerald.withOpacity(0.05),
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline,
                            size: 20, color: AppColors.emerald),
                        SizedBox(width: 8),
                        Text('Excel Import',
                            style: TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 15)),
                      ],
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Upload an Excel (.xlsx) file to import member data. '
                      'The file should contain columns for first name, last name, '
                      'email, phone, date of birth, gender, and address fields.',
                      style: TextStyle(fontSize: 13, color: AppColors.stone600),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // File picker area
            InkWell(
              onTap: _pickFile,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  border: Border.all(
                      color: AppColors.stone300,
                      style: BorderStyle.solid,
                      width: 2),
                  borderRadius: BorderRadius.circular(12),
                  color: AppColors.stone100,
                ),
                child: Column(
                  children: [
                    Icon(
                      _selectedFile != null
                          ? Icons.description
                          : Icons.cloud_upload_outlined,
                      size: 48,
                      color: _selectedFile != null
                          ? AppColors.emerald
                          : AppColors.stone400,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _selectedFile != null
                          ? _selectedFile!.name
                          : 'Tap to select an Excel file',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: _selectedFile != null
                            ? FontWeight.w500
                            : FontWeight.normal,
                        color: _selectedFile != null
                            ? AppColors.stone800
                            : AppColors.stone500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (_selectedFile != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          '${(_selectedFile!.size / 1024).toStringAsFixed(1)} KB',
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.stone500),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Upload button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _selectedFile != null && !_isUploading
                    ? _upload
                    : null,
                icon: _isUploading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.upload),
                label: Text(_isUploading ? 'Uploading...' : 'Import'),
              ),
            ),
            const SizedBox(height: 16),
            // Error
            if (_error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline,
                        color: AppColors.error, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_error!,
                          style: const TextStyle(
                              color: AppColors.error, fontSize: 13)),
                    ),
                  ],
                ),
              ),
            // Success result
            if (_result != null)
              Expanded(
                child: Card(
                  color: AppColors.emerald.withOpacity(0.05),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.check_circle,
                                color: AppColors.emerald, size: 20),
                            SizedBox(width: 8),
                            Text('Import Complete',
                                style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 15,
                                    color: AppColors.emerald)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (_result!['imported'] != null)
                          _ResultRow(
                              'Imported', '${_result!['imported']}'),
                        if (_result!['skipped'] != null)
                          _ResultRow(
                              'Skipped', '${_result!['skipped']}'),
                        if (_result!['errors'] != null)
                          _ResultRow('Errors', '${_result!['errors']}'),
                        if (_result!['message'] != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text('${_result!['message']}',
                                style: const TextStyle(fontSize: 13)),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ResultRow extends StatelessWidget {
  final String label;
  final String value;
  const _ResultRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Text('$label: ',
              style: const TextStyle(
                  fontWeight: FontWeight.w500, fontSize: 14)),
          Text(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}
