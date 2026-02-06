export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};
export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    // Parse the date string and ensure it's treated as local date
    // If dateString is in YYYY-MM-DD format, treat it as local date to avoid timezone conversion
    let date: Date;
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // If it's in YYYY-MM-DD format, create date object without timezone conversion
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
    } else {
      date = new Date(dateString);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
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
