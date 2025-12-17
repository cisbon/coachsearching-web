/**
 * Formatting Utilities
 * @fileoverview Date, currency, and text formatting helpers
 */

import { CURRENCIES, DEFAULT_CURRENCY, STORAGE_KEYS } from './constants.js';

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Get current currency from localStorage
 * @returns {string}
 */
export function getCurrentCurrency() {
  return localStorage.getItem(STORAGE_KEYS.CURRENCY) || DEFAULT_CURRENCY;
}

/**
 * Set current currency
 * @param {string} code - Currency code
 */
export function setCurrency(code) {
  if (CURRENCIES[code]) {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, code);
    window.dispatchEvent(new CustomEvent('currencyChange', { detail: code }));
  }
}

/**
 * Format price in specified currency
 * @param {number} amountInEur - Amount in EUR
 * @param {string} [currencyCode] - Target currency code
 * @param {Object} [options] - Formatting options
 * @param {boolean} [options.showSymbol=true] - Show currency symbol
 * @param {number} [options.decimals=0] - Number of decimal places
 * @returns {string}
 */
export function formatPrice(amountInEur, currencyCode = null, options = {}) {
  const currency = currencyCode || getCurrentCurrency();
  const { showSymbol = true, decimals = 0 } = options;

  const config = CURRENCIES[currency] || CURRENCIES[DEFAULT_CURRENCY];
  const converted = amountInEur * config.rate;
  const formatted = converted.toFixed(decimals);

  return showSymbol ? `${config.symbol}${formatted}` : formatted;
}

/**
 * Parse price string to number
 * @param {string} priceString - Price string to parse
 * @returns {number}
 */
export function parsePrice(priceString) {
  if (typeof priceString === 'number') {
    return priceString;
  }
  // Remove currency symbols and parse
  const cleaned = String(priceString).replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format date for display
 * @param {Date|string|number} date - Date to format
 * @param {Object} [options] - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  try {
    return new Intl.DateTimeFormat(getLocale(), defaultOptions).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * Format date with time
 * @param {Date|string|number} date - Date to format
 * @returns {string}
 */
export function formatDateTime(date) {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format time only
 * @param {Date|string|number} date - Date to format
 * @returns {string}
 */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(getLocale(), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date|string|number} date - Date to format
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  try {
    const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });

    if (diffSecs < 60) {
      return rtf.format(-diffSecs, 'second');
    }
    if (diffMins < 60) {
      return rtf.format(-diffMins, 'minute');
    }
    if (diffHours < 24) {
      return rtf.format(-diffHours, 'hour');
    }
    if (diffDays < 7) {
      return rtf.format(-diffDays, 'day');
    }
    if (diffWeeks < 4) {
      return rtf.format(-diffWeeks, 'week');
    }
    if (diffMonths < 12) {
      return rtf.format(-diffMonths, 'month');
    }
    return rtf.format(-diffYears, 'year');
  } catch {
    // Fallback for browsers without RelativeTimeFormat
    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(d);
  }
}

/**
 * Format duration in minutes to human readable
 * @param {number} minutes - Duration in minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Get the current locale
 * @returns {string}
 */
function getLocale() {
  const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en';
  const localeMap = {
    en: 'en-US',
    de: 'de-DE',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
  };
  return localeMap[lang] || 'en-US';
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format number with locale-aware separators
 * @param {number} num - Number to format
 * @param {Object} [options] - Intl.NumberFormat options
 * @returns {string}
 */
export function formatNumber(num, options = {}) {
  try {
    return new Intl.NumberFormat(getLocale(), options).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Format percentage
 * @param {number} value - Value between 0 and 1
 * @param {number} [decimals=0] - Decimal places
 * @returns {string}
 */
export function formatPercent(value, decimals = 0) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============================================================================
// Text Formatting
// ============================================================================

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} [suffix='...'] - Suffix to add
 * @returns {string}
 */
export function truncate(text, maxLength, suffix = '...') {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  return text.slice(0, maxLength - suffix.length).trim() + suffix;
}

/**
 * Capitalize first letter
 * @param {string} text - Text to capitalize
 * @returns {string}
 */
export function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert to title case
 * @param {string} text - Text to convert
 * @returns {string}
 */
export function titleCase(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Pluralize a word
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} [plural] - Plural form (defaults to singular + 's')
 * @returns {string}
 */
export function pluralize(count, singular, plural) {
  const p = plural || `${singular}s`;
  return count === 1 ? singular : p;
}

/**
 * Format count with word
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} [plural] - Plural form
 * @returns {string}
 */
export function formatCount(count, singular, plural) {
  return `${formatNumber(count)} ${pluralize(count, singular, plural)}`;
}

// ============================================================================
// Rating Formatting
// ============================================================================

/**
 * Format rating as stars
 * @param {number} rating - Rating value (0-5)
 * @param {boolean} [showEmpty=true] - Show empty stars
 * @returns {string}
 */
export function formatStars(rating, showEmpty = true) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = showEmpty ? 5 - fullStars - (hasHalf ? 1 : 0) : 0;

  return '★'.repeat(fullStars) + (hasHalf ? '½' : '') + '☆'.repeat(emptyStars);
}

/**
 * Format rating as number with decimal
 * @param {number} rating - Rating value
 * @returns {string}
 */
export function formatRating(rating) {
  if (rating === null || rating === undefined) {
    return 'No ratings';
  }
  return rating.toFixed(1);
}

// ============================================================================
// Name Formatting
// ============================================================================

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Format name to first name + last initial
 * @param {string} name - Full name
 * @returns {string}
 */
export function formatNameShort(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

// ============================================================================
// Markdown Conversion
// ============================================================================

/**
 * Convert markdown to HTML
 * @param {string} md - Markdown string
 * @returns {string} - HTML string
 */
export function markdownToHTML(md) {
  if (!md) return '';

  let html = md;

  // Convert headings (must be done line by line)
  html = html.replace(/^### (.*)$/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gim, '<h1>$1</h1>');

  // Convert links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Convert bold and italic
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

  // Convert bullet lists
  const bulletRegex = /^- (.*)$/gm;
  if (bulletRegex.test(html)) {
    html = html.replace(/(^- .*$(\n|$))+/gm, function(match) {
      const items = match.trim().split('\n').map(line =>
        '<li>' + line.replace(/^- /, '') + '</li>'
      ).join('');
      return '<ul>' + items + '</ul>';
    });
  }

  // Convert numbered lists
  const numberRegex = /^\d+\. (.*)$/gm;
  if (numberRegex.test(md)) {
    html = html.replace(/(^\d+\. .*$(\n|$))+/gm, function(match) {
      const items = match.trim().split('\n').map(line =>
        '<li>' + line.replace(/^\d+\. /, '') + '</li>'
      ).join('');
      return '<ol>' + items + '</ol>';
    });
  }

  // Convert line breaks to paragraphs
  html = html.split('\n\n').map(para => {
    // Don't wrap headings, lists in p tags
    if (para.match(/^<(h[123]|ul|ol)/)) {
      return para;
    }
    return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
  }).join('');

  return html;
}

export default {
  getCurrentCurrency,
  setCurrency,
  formatPrice,
  parsePrice,
  markdownToHTML,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatDuration,
  formatNumber,
  formatPercent,
  formatFileSize,
  truncate,
  capitalize,
  titleCase,
  pluralize,
  formatCount,
  formatStars,
  formatRating,
  getInitials,
  formatNameShort,
};
