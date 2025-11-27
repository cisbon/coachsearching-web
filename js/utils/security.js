/**
 * Security Utilities
 * @fileoverview XSS prevention, input sanitization, and security helpers
 */

// ============================================================================
// HTML Sanitization
// ============================================================================

/**
 * HTML entities for escaping
 * @type {Record<string, string>}
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') {
    return String(str ?? '');
  }
  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char]);
}

/**
 * Unescape HTML entities back to characters
 * @param {string} str - String to unescape
 * @returns {string} Unescaped string
 */
export function unescapeHtml(str) {
  if (typeof str !== 'string') {
    return String(str ?? '');
  }
  const doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.documentElement.textContent || '';
}

/**
 * Allowed HTML tags for sanitized markdown content
 * @type {Set<string>}
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'blockquote', 'pre', 'code',
  'hr', 'span', 'div',
]);

/**
 * Allowed attributes for HTML tags
 * @type {Record<string, Set<string>>}
 */
const ALLOWED_ATTRIBUTES = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  '*': new Set(['class', 'id']),
};

/**
 * Sanitize HTML content - removes dangerous elements and attributes
 * @param {string} html - HTML string to sanitize
 * @param {Object} options - Sanitization options
 * @param {boolean} [options.allowLinks=true] - Allow anchor tags
 * @param {boolean} [options.allowImages=false] - Allow image tags
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html, options = {}) {
  if (typeof html !== 'string' || !html.trim()) {
    return '';
  }

  const { allowLinks = true, allowImages = false } = options;

  // Create a temporary container
  const template = document.createElement('template');
  template.innerHTML = html;
  const content = template.content;

  // Walk through all elements and sanitize
  const walker = document.createTreeWalker(
    content,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );

  const elementsToRemove = [];

  while (walker.nextNode()) {
    /** @type {Element} */
    const node = /** @type {Element} */ (walker.currentNode);
    const tagName = node.tagName.toLowerCase();

    // Check if tag is allowed
    if (!ALLOWED_TAGS.has(tagName)) {
      elementsToRemove.push(node);
      continue;
    }

    // Special handling for links
    if (tagName === 'a') {
      if (!allowLinks) {
        elementsToRemove.push(node);
        continue;
      }
      // Force safe link attributes
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('target', '_blank');

      // Validate href
      const href = node.getAttribute('href') || '';
      if (!isValidUrl(href) && !href.startsWith('#') && !href.startsWith('mailto:')) {
        elementsToRemove.push(node);
        continue;
      }
    }

    // Special handling for images
    if (tagName === 'img') {
      if (!allowImages) {
        elementsToRemove.push(node);
        continue;
      }
      // Validate src
      const src = node.getAttribute('src') || '';
      if (!isValidImageUrl(src)) {
        elementsToRemove.push(node);
        continue;
      }
      // Add lazy loading
      node.setAttribute('loading', 'lazy');
    }

    // Remove disallowed attributes
    const allowedAttrs = new Set([
      ...(ALLOWED_ATTRIBUTES[tagName] || []),
      ...(ALLOWED_ATTRIBUTES['*'] || []),
    ]);

    const attrsToRemove = [];
    for (const attr of node.attributes) {
      if (!allowedAttrs.has(attr.name)) {
        attrsToRemove.push(attr.name);
      }
      // Check for javascript: protocol
      if (attr.value.toLowerCase().includes('javascript:')) {
        attrsToRemove.push(attr.name);
      }
      // Check for event handlers
      if (attr.name.startsWith('on')) {
        attrsToRemove.push(attr.name);
      }
    }

    for (const attr of attrsToRemove) {
      node.removeAttribute(attr);
    }
  }

  // Remove disallowed elements
  for (const el of elementsToRemove) {
    // Replace with text content to preserve inner text
    const text = document.createTextNode(el.textContent || '');
    el.parentNode?.replaceChild(text, el);
  }

  return template.innerHTML;
}

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Valid URL protocols
 * @type {Set<string>}
 */
const VALID_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Check if a string is a valid URL
 * @param {string} str - String to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(str) {
  if (typeof str !== 'string') {
    return false;
  }
  try {
    const url = new URL(str);
    return VALID_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Valid image extensions
 * @type {Set<string>}
 */
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']);

/**
 * Check if a URL points to an image
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid image URL
 */
export function isValidImageUrl(url) {
  if (!isValidUrl(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return [...IMAGE_EXTENSIONS].some(ext => path.endsWith(ext)) ||
      // Allow known image CDN patterns
      parsed.hostname.includes('pravatar.cc') ||
      parsed.hostname.includes('dicebear.com') ||
      parsed.hostname.includes('cloudinary.com') ||
      parsed.hostname.includes('supabase.co');
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a valid YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid YouTube URL
 */
export function isValidYoutubeUrl(url) {
  if (!isValidUrl(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'youtube.com' ||
      parsed.hostname === 'www.youtube.com' ||
      parsed.hostname === 'youtu.be' ||
      parsed.hostname === 'www.youtu.be';
  } catch {
    return false;
  }
}

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
export function extractYoutubeId(url) {
  if (!isValidYoutubeUrl(url)) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1);
    }
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Sanitize a string for safe display
 * @param {string} str - String to sanitize
 * @param {Object} options - Sanitization options
 * @param {number} [options.maxLength] - Maximum length
 * @param {boolean} [options.trim=true] - Trim whitespace
 * @param {boolean} [options.singleLine=false] - Remove newlines
 * @returns {string} Sanitized string
 */
export function sanitizeString(str, options = {}) {
  if (typeof str !== 'string') {
    return '';
  }

  const { maxLength, trim = true, singleLine = false } = options;

  let result = str;

  // Trim whitespace
  if (trim) {
    result = result.trim();
  }

  // Remove newlines if single line
  if (singleLine) {
    result = result.replace(/[\r\n]+/g, ' ');
  }

  // Normalize whitespace
  result = result.replace(/\s+/g, ' ');

  // Limit length
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  return result;
}

/**
 * Sanitize email input
 * @param {string} email - Email to sanitize
 * @returns {string} Sanitized email
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}

/**
 * Sanitize numeric input
 * @param {string|number} value - Value to sanitize
 * @param {Object} options - Options
 * @param {number} [options.min] - Minimum value
 * @param {number} [options.max] - Maximum value
 * @param {number} [options.decimals] - Number of decimal places
 * @returns {number} Sanitized number
 */
export function sanitizeNumber(value, options = {}) {
  const { min, max, decimals } = options;

  let num = typeof value === 'number' ? value : parseFloat(String(value));

  if (Number.isNaN(num)) {
    return 0;
  }

  if (typeof min === 'number' && num < min) {
    num = min;
  }

  if (typeof max === 'number' && num > max) {
    num = max;
  }

  if (typeof decimals === 'number') {
    num = Number(num.toFixed(decimals));
  }

  return num;
}

// ============================================================================
// CSRF & Nonce
// ============================================================================

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
export function generateNonce(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return `${Date.now().toString(36)}-${generateNonce(8)}`;
}

// ============================================================================
// Rate Limiting (Client-side)
// ============================================================================

/**
 * Simple rate limiter for client-side operations
 */
class RateLimiter {
  /**
   * @param {number} maxRequests - Maximum requests per window
   * @param {number} windowMs - Time window in milliseconds
   */
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    /** @type {number[]} */
    this.requests = [];
  }

  /**
   * Check if action is allowed
   * @returns {boolean} True if allowed
   */
  isAllowed() {
    const now = Date.now();
    // Remove old requests
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  /**
   * Get remaining time until next allowed request
   * @returns {number} Milliseconds until reset
   */
  getResetTime() {
    if (this.requests.length === 0) {
      return 0;
    }
    const oldest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldest));
  }
}

/**
 * Create a rate limiter
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {RateLimiter}
 */
export function createRateLimiter(maxRequests, windowMs) {
  return new RateLimiter(maxRequests, windowMs);
}

// ============================================================================
// Content Security
// ============================================================================

/**
 * Check if content looks like potential XSS
 * @param {string} content - Content to check
 * @returns {boolean} True if potentially dangerous
 */
export function isPotentiallyDangerous(content) {
  if (typeof content !== 'string') {
    return false;
  }

  const dangerous = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /data:/i,
    /vbscript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /expression\s*\(/i, // CSS expression
  ];

  return dangerous.some(pattern => pattern.test(content));
}

export default {
  escapeHtml,
  unescapeHtml,
  sanitizeHtml,
  sanitizeString,
  sanitizeEmail,
  sanitizeNumber,
  isValidUrl,
  isValidImageUrl,
  isValidYoutubeUrl,
  extractYoutubeId,
  generateNonce,
  generateId,
  createRateLimiter,
  isPotentiallyDangerous,
};
