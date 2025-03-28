/**
 * Nexus UI Formatters
 * Provides formatting utilities for the UI components.
 * 
 * Version 3.0.0
 */

/**
 * Format a date as a readable string
 * @param {number|string|Date} date - Date to format (timestamp, string, or Date object)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  try {
    if (!date) return '';
    
    // Convert to Date object
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return '';
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Default options
    const defaultOptions = {
      format: 'medium', // 'short', 'medium', 'long', 'full', 'relative'
      includeTime: false,
      locale: navigator.language || 'en-US'
    };
    
    // Merge with provided options
    const formattingOptions = { ...defaultOptions, ...options };
    
    // Format as relative time if requested
    if (formattingOptions.format === 'relative') {
      return formatRelativeTime(dateObj);
    }
    
    // Format date based on format style
    const dateTimeFormat = new Intl.DateTimeFormat(formattingOptions.locale, {
      dateStyle: formattingOptions.format,
      timeStyle: formattingOptions.includeTime ? formattingOptions.format : undefined
    });
    
    return dateTimeFormat.format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    
    // Fallback to simple formatting
    if (date instanceof Date) {
      return date.toLocaleDateString();
    } else if (typeof date === 'number') {
      return new Date(date).toLocaleDateString();
    } else if (typeof date === 'string') {
      return date;
    }
    
    return '';
  }
}

/**
 * Format a date as a relative time string (e.g., "5 minutes ago")
 * @param {Date} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
  try {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    const diffMonth = Math.round(diffDay / 30);
    const diffYear = Math.round(diffDay / 365);
    
    if (diffSec < 5) {
      return 'just now';
    } else if (diffSec < 60) {
      return `${diffSec} seconds ago`;
    } else if (diffMin < 60) {
      return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    } else if (diffHour < 24) {
      return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    } else if (diffDay < 30) {
      return diffDay === 1 ? 'yesterday' : `${diffDay} days ago`;
    } else if (diffMonth < 12) {
      return diffMonth === 1 ? '1 month ago' : `${diffMonth} months ago`;
    } else {
      return diffYear === 1 ? '1 year ago' : `${diffYear} years ago`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
}

/**
 * Format a number with thousands separators
 * @param {number} number - Number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number
 */
export function formatNumber(number, options = {}) {
  try {
    if (typeof number !== 'number' || isNaN(number)) {
      return '';
    }
    
    // Default options
    const defaultOptions = {
      decimals: 0,
      decimalSeparator: '.',
      thousandsSeparator: ',',
      compact: false,
      locale: navigator.language || 'en-US'
    };
    
    // Merge with provided options
    const formattingOptions = { ...defaultOptions, ...options };
    
    // Use Intl.NumberFormat for formatting
    if (formattingOptions.compact) {
      // Compact notation (e.g., 1.2K, 5.3M)
      const formatter = new Intl.NumberFormat(formattingOptions.locale, {
        notation: 'compact',
        maximumFractionDigits: formattingOptions.decimals
      });
      
      return formatter.format(number);
    } else {
      // Standard notation with custom separators
      const formatter = new Intl.NumberFormat(formattingOptions.locale, {
        minimumFractionDigits: formattingOptions.decimals,
        maximumFractionDigits: formattingOptions.decimals
      });
      
      return formatter.format(number);
    }
  } catch (error) {
    console.error('Error formatting number:', error);
    return number.toString();
  }
}

/**
 * Format a file size in bytes to a human-readable string
 * @param {number} bytes - Size in bytes
 * @param {Object} options - Formatting options
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes, options = {}) {
  try {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
      return '';
    }
    
    // Default options
    const defaultOptions = {
      decimals: 1,
      binary: false, // If true, use binary units (KiB, MiB) instead of decimal (KB, MB)
      locale: navigator.language || 'en-US'
    };
    
    // Merge with provided options
    const formattingOptions = { ...defaultOptions, ...options };
    
    // Units and base
    const units = formattingOptions.binary
      ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
      : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const base = formattingOptions.binary ? 1024 : 1000;
    
    // Find the appropriate unit
    const exp = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(base));
    const index = Math.min(exp, units.length - 1);
    
    // Format the number with the selected unit
    const value = bytes / Math.pow(base, index);
    
    // Number formatter
    const formatter = new Intl.NumberFormat(formattingOptions.locale, {
      minimumFractionDigits: index === 0 ? 0 : formattingOptions.decimals,
      maximumFractionDigits: index === 0 ? 0 : formattingOptions.decimals
    });
    
    return `${formatter.format(value)} ${units[index]}`;
  } catch (error) {
    console.error('Error formatting file size:', error);
    return bytes.toString() + ' B';
  }
}

/**
 * Truncate text with ellipsis if it exceeds the specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {Object} options - Truncation options
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength, options = {}) {
  try {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Default options
    const defaultOptions = {
      ellipsis: '...',
      breakWords: false, // If true, break words; if false, break at word boundaries
      preserveWords: true // If true, try to preserve whole words
    };
    
    // Merge with provided options
    const truncateOptions = { ...defaultOptions, ...options };
    
    // If text is shorter than maxLength, return it as is
    if (text.length <= maxLength) {
      return text;
    }
    
    // Simple truncation if breaking words is allowed
    if (!truncateOptions.preserveWords) {
      return text.substring(0, maxLength) + truncateOptions.ellipsis;
    }
    
    // Try to preserve whole words
    let truncated = text.substring(0, maxLength);
    
    // Find last space
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 0) {
      // Truncate at the last space
      truncated = truncated.substring(0, lastSpace);
    }
    
    return truncated + truncateOptions.ellipsis;
  } catch (error) {
    console.error('Error truncating text:', error);
    return text;
  }
}

/**
 * Format a URL for display
 * @param {string} url - URL to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted URL
 */
export function formatUrl(url, options = {}) {
  try {
    if (!url || typeof url !== 'string') {
      return '';
    }
    
    // Default options
    const defaultOptions = {
      maxLength: 50,
      removeProtocol: true,
      removeWww: true,
      ellipsis: '...'
    };
    
    // Merge with provided options
    const formattingOptions = { ...defaultOptions, ...options };
    
    // Parse URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      // Not a valid URL, return as is
      return truncateText(url, formattingOptions.maxLength, {
        ellipsis: formattingOptions.ellipsis
      });
    }
    
    // Format hostname
    let hostname = parsedUrl.hostname;
    
    if (formattingOptions.removeWww && hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    // Build display URL
    let displayUrl = '';
    
    if (!formattingOptions.removeProtocol) {
      displayUrl += parsedUrl.protocol + '//';
    }
    
    displayUrl += hostname;
    
    // Add path if present
    if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
      displayUrl += parsedUrl.pathname;
    }
    
    // Add query parameters if present
    if (parsedUrl.search) {
      displayUrl += parsedUrl.search;
    }
    
    // Truncate if too long
    return truncateText(displayUrl, formattingOptions.maxLength, {
      ellipsis: formattingOptions.ellipsis
    });
  } catch (error) {
    console.error('Error formatting URL:', error);
    return url;
  }
}

/**
 * Format a list of items into a human-readable string
 * @param {Array} items - List of items
 * @param {Object} options - Formatting options
 * @returns {string} Formatted list
 */
export function formatList(items, options = {}) {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }
    
    // Default options
    const defaultOptions = {
      conjunction: 'and',
      serialComma: true,
      separator: ', ',
      limit: null,
      moreText: 'more',
      empty: '',
      locale: navigator.language || 'en-US'
    };
    
    // Merge with provided options
    const formattingOptions = { ...defaultOptions, ...options };
    
    // Handle empty list
    if (items.length === 0) {
      return formattingOptions.empty;
    }
    
    // Convert items to strings
    let strings = items.map(item => String(item));
    
    // Apply limit if specified
    let hasMore = false;
    if (formattingOptions.limit && strings.length > formattingOptions.limit) {
      hasMore = true;
      const remaining = strings.length - formattingOptions.limit;
      strings = strings.slice(0, formattingOptions.limit);
      
      if (formattingOptions.moreText) {
        strings.push(`${remaining} ${formattingOptions.moreText}`);
      }
    }
    
    // Format the list
    if (strings.length === 1) {
      return strings[0];
    } else if (strings.length === 2) {
      return `${strings[0]} ${formattingOptions.conjunction} ${strings[1]}`;
    } else {
      const lastItem = strings.pop();
      let result = strings.join(formattingOptions.separator);
      
      // Add serial comma (Oxford comma) if requested
      if (formattingOptions.serialComma) {
        result += formattingOptions.separator;
      } else {
        result += ' ';
      }
      
      result += `${formattingOptions.conjunction} ${lastItem}`;
      
      return result;
    }
  } catch (error) {
    console.error('Error formatting list:', error);
    return items.join(', ');
  }
}

/**
 * Format a percentage
 * @param {number} value - Value to format as percentage
 * @param {Object} options - Formatting options
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, options = {}) {
  try {
    if (typeof value !== 'number' || isNaN(value)) {
      return '';
    }
    
    // Default options
    const defaultOptions = {
      decimals: 1,
      includePlusSign: false,
      locale: navigator.language || 'en-US'
    };
    
    // Merge with provided options
    const formattingOptions = { ...defaultOptions, ...options };
    
    // Create formatter
    const formatter = new Intl.NumberFormat(formattingOptions.locale, {
      style: 'percent',
      minimumFractionDigits: formattingOptions.decimals,
      maximumFractionDigits: formattingOptions.decimals,
      signDisplay: formattingOptions.includePlusSign ? 'exceptZero' : 'auto'
    });
    
    return formatter.format(value / 100);
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return value.toString() + '%';
  }
}

export default {
  formatDate,
  formatNumber,
  formatFileSize,
  truncateText,
  formatUrl,
  formatList,
  formatPercentage
};
