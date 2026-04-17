// ============================================================
// Export API — triggers file downloads from /admin/export/*
// ============================================================

/**
 * Download a file from a blob response.
 * Creates a temporary anchor element to trigger the browser download dialog.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Fetch a binary export from the backend and trigger a browser download.
 * Auth is handled via the httpOnly session cookie (same as all other ApiClient calls).
 */
async function downloadExport(path: string, filename: string): Promise<void> {
  const organizationId = typeof window !== 'undefined'
    ? localStorage.getItem('selectedOrganizationId')
    : null;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
  };

  const response = await fetch(`/api${path}`, { method: 'GET', headers });

  if (response.status === 403) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'You do not have permission to export data.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(text || `Export failed: ${response.status}`);
  }

  const blob = await response.blob();
  triggerDownload(blob, filename);
}

export const ExportApi = {
  /**
   * Download the full export: Members + Memberships + Payments + ContributionTypes.
   */
  downloadFull(): Promise<void> {
    return downloadExport('/admin/export/full', 'full-export.xlsx');
  },

  /**
   * Download the members export: Members + Memberships sheets.
   */
  downloadMembers(): Promise<void> {
    return downloadExport('/admin/export/members', 'members-export.xlsx');
  },

  /**
   * Download the payments export: Payments + ContributionTypes sheets.
   */
  downloadPayments(): Promise<void> {
    return downloadExport('/admin/export/payments', 'payments-export.xlsx');
  },
};
