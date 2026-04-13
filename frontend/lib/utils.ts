const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/** Apply a date format pattern to a date object. Supported tokens: yyyy yy MMMM MMM MM M dd d */
export const applyDateFormat = (date: Date, format: string): string => {
  const d = date.getDate();
  const m = date.getMonth();
  const y = date.getFullYear();
  return format.replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d/g, (token) => {
    switch (token) {
      case 'yyyy': return String(y);
      case 'yy':   return String(y).slice(-2);
      case 'MMMM': return MONTH_LONG[m];
      case 'MMM':  return MONTH_SHORT[m];
      case 'MM':   return String(m + 1).padStart(2, '0');
      case 'M':    return String(m + 1);
      case 'dd':   return String(d).padStart(2, '0');
      case 'd':    return String(d);
      default:     return token;
    }
  });
};

export const formatDate = (dateString?: string | null, format = 'dd MMM yyyy'): string => {
  if (!dateString) return 'N/A';
  try {
    let date: Date;
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateString);
    }
    return applyDateFormat(date, format);
  } catch {
    return 'Invalid date';
  }
};

/**
 * Parse a date string using the given format pattern and return ISO yyyy-MM-dd.
 * Returns null if the string doesn't match the format.
 * Supported tokens: yyyy, yy, MMMM, MMM, MM, M, dd, d
 */
export const parseDateWithFormat = (text: string, format: string): string | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Build a regex from the format pattern, capturing each token
  const tokens = format.match(/yyyy|yy|MMMM|MMM|MM|M|dd|d/g);
  if (!tokens) return null;

  let regexStr = '^' + escapeRegex(format) + '$';
  // Replace tokens with capturing groups (longest first to avoid partial matches)
  const tokenPatterns: Record<string, string> = {
    yyyy: '(\\d{4})',
    yy: '(\\d{2})',
    MMMM: '(' + MONTH_LONG.join('|') + ')',
    MMM: '(' + MONTH_SHORT.join('|') + ')',
    MM: '(\\d{2})',
    M: '(\\d{1,2})',
    dd: '(\\d{2})',
    d: '(\\d{1,2})',
  };

  // Replace tokens in order of appearance in the format string
  const orderedTokens: string[] = [];
  let tmpFmt = format;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let earliest = -1;
    let earliestToken = '';
    for (const tok of ['yyyy', 'yy', 'MMMM', 'MMM', 'MM', 'M', 'dd', 'd']) {
      const idx = tmpFmt.indexOf(tok);
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        earliestToken = tok;
      }
    }
    if (earliest === -1) break;
    orderedTokens.push(earliestToken);
    tmpFmt = tmpFmt.substring(0, earliest) + '\x00'.repeat(earliestToken.length) + tmpFmt.substring(earliest + earliestToken.length);
  }

  // Build the final regex
  regexStr = format;
  for (const tok of ['yyyy', 'yy', 'MMMM', 'MMM', 'MM', 'M', 'dd', 'd']) {
    regexStr = regexStr.replace(tok, tokenPatterns[tok]);
  }
  regexStr = '^' + regexStr.replace(/[/\-.\s]+/g, (sep) => escapeRegex(sep)) + '$';

  const match = trimmed.match(new RegExp(regexStr, 'i'));
  if (!match) return null;

  let year = 0, month = 0, day = 0;
  orderedTokens.forEach((tok, i) => {
    const val = match[i + 1];
    switch (tok) {
      case 'yyyy': year = parseInt(val, 10); break;
      case 'yy': year = 2000 + parseInt(val, 10); break;
      case 'MMMM': month = MONTH_LONG.findIndex(m => m.toLowerCase() === val.toLowerCase()) + 1; break;
      case 'MMM': month = MONTH_SHORT.findIndex(m => m.toLowerCase() === val.toLowerCase()) + 1; break;
      case 'MM': case 'M': month = parseInt(val, 10); break;
      case 'dd': case 'd': day = parseInt(val, 10); break;
    }
  });

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a date format pattern to a user-friendly placeholder.
 * e.g. "dd MMM yyyy" → "dd mmm yyyy", "MM/dd/yyyy" → "mm/dd/yyyy"
 */
export const dateFormatToPlaceholder = (format: string): string => {
  return format
    .replace('yyyy', 'yyyy')
    .replace('yy', 'yy')
    .replace('MMMM', 'mmmm')
    .replace('MMM', 'mmm')
    .replace('MM', 'mm')
    .replace('dd', 'dd')
    .replace(/(?<![a-z])M(?![a-z])/i, 'm')
    .replace(/(?<![a-z])d(?![a-z])/i, 'd');
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const getInitials = (firstName?: string, lastName?: string): string => {
  if (!firstName || !lastName) return '??';
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ACTIVE':
    case 'PAID':
      return 'text-emerald-600 bg-emerald-50';
    case 'PENDING':
      return 'text-yellow-600 bg-yellow-50';
    case 'OVERDUE':
    case 'SUSPENDED':
      return 'text-red-600 bg-red-50';
    case 'INACTIVE':
    case 'CANCELLED':
    case 'DECEASED':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

// Function to get the localized status text
export const getLocalizedStatus = (status: string): string => {
  // This function would normally use the i18n context
  // For now, we'll return the corresponding translation key
  switch (status) {
    case 'ACTIVE': return 'common.status_active';
    case 'INACTIVE': return 'common.status_inactive';
    case 'SUSPENDED': return 'common.status_suspended';
    case 'EXPIRED': return 'common.status_expired';
    case 'CANCELLED': return 'common.status_cancelled';
    case 'DECEASED': return 'common.status_deceased';
    case 'PAID': return 'common.status_active'; // Using active for paid status
    case 'PENDING': return 'common.status_inactive'; // Using inactive for pending
    case 'OVERDUE': return 'common.status_suspended'; // Using suspended for overdue
    default: return 'common.status_inactive';
  }
};
