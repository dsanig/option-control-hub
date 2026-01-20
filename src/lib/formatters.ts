// Formatting utilities for financial data

export const formatCurrency = (value: number, compact = false): string => {
  if (compact) {
    if (Math.abs(value) >= 1000000000) {
      return `€${(value / 1000000000).toFixed(2)}B`;
    }
    if (Math.abs(value) >= 1000000) {
      return `€${(value / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `€${(value / 1000).toFixed(1)}K`;
    }
  }
  
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number, decimals = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number, decimals = 2): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value).toFixed(decimals)}%`;
};

export const formatDelta = (value: number): string => {
  return value.toFixed(3);
};

export const formatGreek = (value: number, decimals = 2): string => {
  if (Math.abs(value) >= 1000) {
    return formatNumber(value, 0);
  }
  return value.toFixed(decimals);
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatExpiry = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).toUpperCase();
};

export const getDTELabel = (dte: number): string => {
  if (dte <= 0) return 'Expired';
  if (dte === 1) return '1 day';
  if (dte <= 7) return `${dte} days`;
  if (dte <= 30) return `${Math.ceil(dte / 7)} weeks`;
  return `${Math.ceil(dte / 30)} months`;
};

export const getExpiryBucket = (dte: number): string => {
  if (dte <= 7) return '0-7d';
  if (dte <= 30) return '8-30d';
  if (dte <= 60) return '31-60d';
  return '60d+';
};

export const getValueClass = (value: number): string => {
  if (value > 0) return 'text-gain';
  if (value < 0) return 'text-loss';
  return '';
};
