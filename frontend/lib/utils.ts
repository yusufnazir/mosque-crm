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
