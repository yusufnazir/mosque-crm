'use client';

import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { MemberPayment } from '@/lib/contributionApi';
import { Mosque, mosqueApi } from '@/lib/mosqueApi';

interface PaymentReceiptModalProps {
  open: boolean;
  payment: MemberPayment | null;
  onClose: () => void;
  /** Resolved contribution type name (translated) */
  contributionTypeName: string;
  /** Format a date string for display */
  formatDate: (date: string) => string;
  /** Format period range */
  formatPeriod?: (periodFrom: string, periodTo: string) => string;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function PaymentReceiptModal({
  open,
  payment,
  onClose,
  contributionTypeName,
  formatDate,
  formatPeriod,
  t,
}: PaymentReceiptModalProps) {
  const [mosque, setMosque] = useState<Mosque | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const preRenderedImage = useRef<Blob | null>(null);

  useEffect(() => {
    if (!open) return;
    preRenderedImage.current = null;
    const loadMosque = async () => {
      try {
        const mosqueId = localStorage.getItem('selectedMosqueId');
        if (mosqueId) {
          const mosques = await mosqueApi.getActive();
          const current = mosques.find((m) => m.id === Number(mosqueId));
          if (current) setMosque(current);
        }
      } catch (err) {
        console.error('Failed to load mosque info:', err);
      }
    };
    loadMosque();
  }, [open]);

  // Pre-render receipt as image after content is painted, so share is instant
  useEffect(() => {
    if (!open || !payment || !mosque) return;
    const timer = setTimeout(async () => {
      if (!receiptRef.current) return;
      try {
        const canvas = await html2canvas(receiptRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );
        preRenderedImage.current = blob;
      } catch {
        // Non-critical; share will generate on-demand as fallback
      }
    }, 300); // small delay to ensure DOM has painted
    return () => clearTimeout(timer);
  }, [open, payment, mosque]);

  if (!open || !payment) return null;

  const receiptNumber = `PAY-${String(payment.id).padStart(6, '0')}`;
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedAmount = payment.currencySymbol
    ? `${payment.currencySymbol} ${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${payment.currencyCode || ''} ${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();

  const periodDisplay =
    payment.periodFrom && payment.periodTo
      ? formatPeriod
        ? formatPeriod(payment.periodFrom, payment.periodTo)
        : `${formatDate(payment.periodFrom)} — ${formatDate(payment.periodTo)}`
      : null;

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

    const content = receiptRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('receipt.payment_receipt')} - ${receiptNumber}</title>
          <style>
            @page {
              size: A5;
              margin: 15mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1C1917;
              background: white;
              padding: 20px;
            }
            .receipt-container {
              max-width: 500px;
              margin: 0 auto;
            }
            .receipt-header {
              text-align: center;
              padding-bottom: 16px;
              border-bottom: 2px solid #047857;
              margin-bottom: 20px;
            }
            .mosque-name {
              font-size: 20px;
              font-weight: 700;
              color: #047857;
              margin-bottom: 4px;
            }
            .mosque-details {
              font-size: 11px;
              color: #57534E;
              line-height: 1.5;
            }
            .receipt-title {
              text-align: center;
              font-size: 16px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
              color: #047857;
              margin-bottom: 4px;
            }
            .receipt-meta {
              text-align: center;
              font-size: 11px;
              color: #78716C;
              margin-bottom: 20px;
            }
            .divider {
              border: none;
              border-top: 1px dashed #D6D3D1;
              margin: 16px 0;
            }
            .section-label {
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #78716C;
              margin-bottom: 8px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 13px;
            }
            .detail-label {
              color: #78716C;
            }
            .detail-value {
              font-weight: 500;
              color: #1C1917;
              text-align: right;
            }
            .total-section {
              background: #F5F5F4;
              border-radius: 8px;
              padding: 12px 16px;
              margin-top: 16px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .total-label {
              font-size: 14px;
              font-weight: 600;
              color: #1C1917;
            }
            .total-amount {
              font-size: 18px;
              font-weight: 700;
              color: #047857;
            }
            .receipt-footer {
              text-align: center;
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #E7E5E4;
            }
            .footer-thanks {
              font-size: 12px;
              color: #78716C;
              font-style: italic;
            }
            .footer-generated {
              font-size: 10px;
              color: #A8A29E;
              margin-top: 8px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            ${content}
          </div>
          <script>
            window.onload = function() { window.print(); };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!receiptRef.current) return null;
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5',
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const availableWidth = pageWidth - margin * 2;
    const imgWidth = availableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const yOffset = Math.min(margin, (pageHeight - imgHeight) / 2);
    pdf.addImage(imgData, 'PNG', margin, Math.max(margin, yOffset), imgWidth, imgHeight);
    return pdf.output('blob');
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const blob = await generatePdfBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${receiptNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  // IMPORTANT: This must NOT be async. navigator.share() must be called
  // synchronously from the click handler to preserve the "user gesture"
  // on mobile browsers. Any await/async before navigator.share() causes
  // mobile browsers to discard the user activation and silently fail.
  const handleShare = () => {
    const shareTitle = `${t('receipt.payment_receipt')} - ${receiptNumber}`;
    const shareText = `${t('receipt.payment_receipt')} ${payment?.personName || ''}`;

    // No Web Share API available — just download
    if (!navigator.share) {
      handleDownloadPdf();
      return;
    }

    // Build share data — try with pre-rendered image file first
    const imgBlob = preRenderedImage.current;
    const shareData: ShareData = { title: shareTitle, text: shareText };

    if (imgBlob) {
      const imgFile = new File([imgBlob], `${receiptNumber}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [imgFile] })) {
        shareData.files = [imgFile];
      }
    }

    // Call navigator.share() SYNCHRONOUSLY from the click — this is critical
    setSharing(true);
    navigator.share(shareData)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fallback to download on actual error
          handleDownloadPdf();
        }
      })
      .finally(() => setSharing(false));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 gap-2">
          <h3 className="text-lg font-bold text-stone-900">
            {t('receipt.payment_receipt')}
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('receipt.share')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="hidden sm:inline">{sharing ? '...' : t('receipt.share')}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3 py-2 text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="PDF"
            >
              {downloading ? '...' : 'PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm font-medium"
              title={t('receipt.print')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="hidden sm:inline">{t('receipt.print')}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
            >
              {t('receipt.close')}
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-4 sm:p-6">
          <div ref={receiptRef}>
            {/* Header - Mosque Info */}
            <div className="receipt-header" style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '2px solid #047857', marginBottom: '20px' }}>
              <div className="mosque-name" style={{ fontSize: '20px', fontWeight: 700, color: '#047857', marginBottom: '4px' }}>
                {mosque?.name || t('receipt.organization')}
              </div>
              {mosque && (
                <div className="mosque-details" style={{ fontSize: '11px', color: '#57534E', lineHeight: 1.5 }}>
                  {mosque.address && <div>{mosque.address}</div>}
                  {(mosque.city || mosque.postalCode) && (
                    <div>
                      {[mosque.postalCode, mosque.city].filter(Boolean).join(' ')}
                      {mosque.country && `, ${mosque.country}`}
                    </div>
                  )}
                  {(mosque.phone || mosque.email) && (
                    <div>
                      {[mosque.phone && `Tel: ${mosque.phone}`, mosque.email].filter(Boolean).join(' | ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Receipt Title */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div className="receipt-title" style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#047857', marginBottom: '4px' }}>
                {t('receipt.payment_receipt')}
              </div>
              <div className="receipt-meta" style={{ fontSize: '11px', color: '#78716C' }}>
                {receiptNumber} &bull; {today}
              </div>
            </div>

            {/* Divider */}
            <hr style={{ border: 'none', borderTop: '1px dashed #D6D3D1', margin: '16px 0' }} />

            {/* Member Info */}
            <div style={{ marginBottom: '16px' }}>
              <div className="section-label" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#78716C', marginBottom: '8px' }}>
                {t('receipt.member_info')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                <span style={{ color: '#78716C' }}>{t('receipt.name')}</span>
                <span style={{ fontWeight: 500, color: '#1C1917' }}>{payment.personName}</span>
              </div>
            </div>

            {/* Divider */}
            <hr style={{ border: 'none', borderTop: '1px dashed #D6D3D1', margin: '16px 0' }} />

            {/* Payment Details */}
            <div style={{ marginBottom: '16px' }}>
              <div className="section-label" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#78716C', marginBottom: '8px' }}>
                {t('receipt.payment_details')}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                <span style={{ color: '#78716C' }}>{t('receipt.contribution_type')}</span>
                <span style={{ fontWeight: 500, color: '#1C1917' }}>{contributionTypeName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                <span style={{ color: '#78716C' }}>{t('receipt.payment_date')}</span>
                <span style={{ fontWeight: 500, color: '#1C1917' }}>{formatDate(payment.paymentDate)}</span>
              </div>

              {periodDisplay && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                  <span style={{ color: '#78716C' }}>{t('receipt.period')}</span>
                  <span style={{ fontWeight: 500, color: '#1C1917' }}>{periodDisplay}</span>
                </div>
              )}

              {payment.currencyCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                  <span style={{ color: '#78716C' }}>{t('receipt.currency')}</span>
                  <span style={{ fontWeight: 500, color: '#1C1917' }}>{payment.currencyCode}</span>
                </div>
              )}

              {payment.reference && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                  <span style={{ color: '#78716C' }}>{t('receipt.reference')}</span>
                  <span style={{ fontWeight: 500, color: '#1C1917' }}>{payment.reference}</span>
                </div>
              )}

              {payment.notes && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                  <span style={{ color: '#78716C' }}>{t('receipt.notes')}</span>
                  <span style={{ fontWeight: 500, color: '#1C1917', maxWidth: '60%', textAlign: 'right' }}>{payment.notes}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div style={{ background: '#F5F5F4', borderRadius: '8px', padding: '12px 16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1C1917' }}>{t('receipt.total_paid')}</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#047857' }}>{formattedAmount}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E7E5E4' }}>
              <div style={{ fontSize: '12px', color: '#78716C', fontStyle: 'italic' }}>
                {t('receipt.thank_you')}
              </div>
              <div style={{ fontSize: '10px', color: '#A8A29E', marginTop: '8px' }}>
                {t('receipt.generated_on', { date: today })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
