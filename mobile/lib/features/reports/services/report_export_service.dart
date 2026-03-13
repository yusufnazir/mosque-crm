import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

import '../../contributions/models/contribution_models.dart';

class ReportExportService {
  static String _fmtDate(String? value) {
    if (value == null || value.isEmpty) return '-';
    final date = DateTime.tryParse(value);
    if (date == null) return '-';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  static Future<XFile> createMemberPaymentHistoryPdf({
    required String memberName,
    required int memberId,
    required String yearLabel,
    required List<MemberPayment> payments,
    String? email,
    String? organizationName,
  }) async {
    final doc = pw.Document();

    final currencyTotals = <String, Map<String, dynamic>>{};
    for (final payment in payments) {
      final code = payment.currencyCode ?? 'Unknown';
      currencyTotals.putIfAbsent(code, () {
        return {
          'amount': 0.0,
          'symbol': payment.currencySymbol ?? code,
        };
      });
      currencyTotals[code]!['amount'] =
          (currencyTotals[code]!['amount'] as double) + payment.amount;
    }

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (context) {
          return [
            pw.Text(
              'Member Payment History',
              style: pw.TextStyle(
                fontSize: 18,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.green800,
              ),
            ),
            if ((organizationName ?? '').trim().isNotEmpty) ...[
              pw.SizedBox(height: 4),
              pw.Text(
                organizationName!.trim(),
                style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
              ),
            ],
            pw.SizedBox(height: 12),
            pw.Container(
              padding: const pw.EdgeInsets.all(10),
              decoration: pw.BoxDecoration(
                color: PdfColors.green50,
                borderRadius: pw.BorderRadius.circular(4),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Name: $memberName'),
                  pw.Text('Member ID: $memberId'),
                  if ((email ?? '').trim().isNotEmpty) pw.Text('Email: ${email!.trim()}'),
                  pw.Text('Year: $yearLabel'),
                ],
              ),
            ),
            pw.SizedBox(height: 12),
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(
                fontSize: 9,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
              ),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.green700),
              cellStyle: const pw.TextStyle(fontSize: 8),
              cellAlignment: pw.Alignment.centerLeft,
              headers: const [
                'Date',
                'Type',
                'Amount',
                'Currency',
                'Period From',
                'Period To',
                'Reference',
              ],
              data: payments
                  .map(
                    (p) => [
                      _fmtDate(p.paymentDate),
                      p.contributionTypeCode ?? 'Unknown',
                      p.amount.toStringAsFixed(2),
                      p.currencyCode ?? 'N/A',
                      _fmtDate(p.periodFrom),
                      _fmtDate(p.periodTo),
                      p.reference ?? '-',
                    ],
                  )
                  .toList(),
            ),
            pw.SizedBox(height: 12),
            pw.Text(
              'Totals',
              style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 6),
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(
                fontSize: 10,
                fontWeight: pw.FontWeight.bold,
              ),
              cellStyle: const pw.TextStyle(fontSize: 10),
              headers: const ['Currency', 'Total'],
              data: currencyTotals.entries.map((entry) {
                final symbol = entry.value['symbol'] as String;
                final amount = entry.value['amount'] as double;
                return [entry.key, '$symbol${amount.toStringAsFixed(2)}'];
              }).toList(),
            ),
          ];
        },
        footer: (context) {
          return pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Text(
              'Generated on ${_fmtDate(DateTime.now().toIso8601String())}   ${context.pageNumber}/${context.pagesCount}',
              style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
            ),
          );
        },
      ),
    );

    final tempDir = await getTemporaryDirectory();
    final safeYear = yearLabel.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
    final file = File('${tempDir.path}/member_payment_history_${memberId}_$safeYear.pdf');
    await file.writeAsBytes(await doc.save());
    return XFile(file.path, name: file.uri.pathSegments.last, mimeType: 'application/pdf');
  }

  static Future<XFile> createPaymentSummaryPdf({
    required int year,
    required List<Map<String, dynamic>> rows,
    String? organizationName,
  }) async {
    final doc = pw.Document();

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (context) {
          return [
            pw.Text(
              'Payment Summary - $year',
              style: pw.TextStyle(
                fontSize: 18,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.green800,
              ),
            ),
            if ((organizationName ?? '').trim().isNotEmpty) ...[
              pw.SizedBox(height: 4),
              pw.Text(
                organizationName!.trim(),
                style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
              ),
            ],
            pw.SizedBox(height: 12),
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(
                fontSize: 9,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
              ),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.green700),
              cellStyle: const pw.TextStyle(fontSize: 8),
              headers: const ['Member', 'Total', 'Paid', 'Outstanding'],
              data: rows.map((row) {
                final name = (row['personName'] ?? row['memberName'] ?? 'Unknown').toString();
                final total = ((row['totalAmount'] ?? row['total'] ?? 0) as num).toDouble();
                final paid = ((row['paidAmount'] ?? row['paid'] ?? 0) as num).toDouble();
                final outstanding =
                    ((row['outstandingAmount'] ?? row['outstanding'] ?? 0) as num)
                        .toDouble();
                return [
                  name,
                  total.toStringAsFixed(2),
                  paid.toStringAsFixed(2),
                  outstanding.toStringAsFixed(2),
                ];
              }).toList(),
            ),
          ];
        },
      ),
    );

    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/payment_summary_$year.pdf');
    await file.writeAsBytes(await doc.save());
    return XFile(file.path, name: file.uri.pathSegments.last, mimeType: 'application/pdf');
  }

  static Future<XFile> createContributionTotalsPdf({
    required int year,
    required List<Map<String, dynamic>> rows,
    String? organizationName,
  }) async {
    final doc = pw.Document();

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (context) {
          return [
            pw.Text(
              'Contribution Totals - $year',
              style: pw.TextStyle(
                fontSize: 18,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.green800,
              ),
            ),
            if ((organizationName ?? '').trim().isNotEmpty) ...[
              pw.SizedBox(height: 4),
              pw.Text(
                organizationName!.trim(),
                style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
              ),
            ],
            pw.SizedBox(height: 12),
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(
                fontSize: 9,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
              ),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.green700),
              cellStyle: const pw.TextStyle(fontSize: 8),
              headers: const ['Type', 'Expected', 'Paid', 'Currency'],
              data: rows.map((row) {
                final type =
                    (row['contributionTypeName'] ?? row['typeName'] ?? 'Unknown').toString();
                final expected = ((row['totalExpected'] ?? row['expected'] ?? 0) as num)
                    .toDouble();
                final paid = ((row['totalPaid'] ?? row['paid'] ?? 0) as num).toDouble();
                final currency = (row['currencyCode'] ?? '').toString();
                return [
                  type,
                  expected.toStringAsFixed(2),
                  paid.toStringAsFixed(2),
                  currency,
                ];
              }).toList(),
            ),
          ];
        },
      ),
    );

    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/contribution_totals_$year.pdf');
    await file.writeAsBytes(await doc.save());
    return XFile(file.path, name: file.uri.pathSegments.last, mimeType: 'application/pdf');
  }
}
