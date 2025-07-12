/**
 * Timezone utilities for EasyJob frontend
 * Handles conversion from UTC timestamps to local timezone
 */

/**
 * Convert UTC timestamp to local timezone
 * @param {string|Date} utcTimestamp - UTC timestamp from database
 * @param {string} format - Format type: 'date', 'time', 'datetime', 'relative'
 * @returns {string} Formatted local time
 */
export const formatLocalTime = (utcTimestamp, format = 'datetime') => {
  if (!utcTimestamp) return 'N/A';
  
  try {
    // Create a Date object from the UTC timestamp
    const utcDate = new Date(utcTimestamp);
    
    // Check if the date is valid
    if (isNaN(utcDate.getTime())) {
      console.warn('Invalid timestamp:', utcTimestamp);
      return 'Invalid Date';
    }
    
    const now = new Date();
    const diffInMs = now - utcDate;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    switch (format) {
      case 'date':
        return utcDate.toLocaleDateString();
        
      case 'time':
        return utcDate.toLocaleTimeString();
        
      case 'datetime':
        return utcDate.toLocaleString();
        
      case 'relative':
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        return utcDate.toLocaleDateString();
        
      case 'iso':
        return utcDate.toISOString();
        
      default:
        return utcDate.toLocaleString();
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Error';
  }
};

/**
 * Get the user's timezone
 * @returns {string} Timezone identifier (e.g., 'Europe/Berlin')
 */
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Check if the user is in Berlin timezone
 * @returns {boolean} True if user is in Berlin timezone
 */
export const isBerlinTimezone = () => {
  const timezone = getUserTimezone();
  return timezone === 'Europe/Berlin';
};

/**
 * Format timestamp specifically for Berlin timezone
 * @param {string|Date} utcTimestamp - UTC timestamp from database
 * @param {string} format - Format type
 * @returns {string} Formatted Berlin time
 */
export const formatBerlinTime = (utcTimestamp, format = 'datetime') => {
  if (!utcTimestamp) return 'N/A';
  
  try {
    const utcDate = new Date(utcTimestamp);
    
    if (isNaN(utcDate.getTime())) {
      return 'Invalid Date';
    }
    
    const options = {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    
    switch (format) {
      case 'date':
        return utcDate.toLocaleDateString('de-DE', { 
          timeZone: 'Europe/Berlin',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
        
      case 'time':
        return utcDate.toLocaleTimeString('de-DE', { 
          timeZone: 'Europe/Berlin',
          hour: '2-digit',
          minute: '2-digit'
        });
        
      case 'datetime':
        return utcDate.toLocaleString('de-DE', options);
        
      case 'relative':
        return formatLocalTime(utcTimestamp, 'relative');
        
      default:
        return utcDate.toLocaleString('de-DE', options);
    }
  } catch (error) {
    console.error('Error formatting Berlin time:', error);
    return formatLocalTime(utcTimestamp, format);
  }
};

/**
 * Get timezone offset for display
 * @returns {string} Timezone offset string (e.g., "+01:00" for Berlin)
 */
export const getTimezoneOffset = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const minutes = Math.abs(offset % 60);
  const sign = offset <= 0 ? '+' : '-';
  
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Format timestamp with timezone info
 * @param {string|Date} utcTimestamp - UTC timestamp from database
 * @param {string} format - Format type
 * @param {boolean} showTimezone - Whether to show timezone info
 * @returns {string} Formatted time with optional timezone
 */
export const formatTimeWithTimezone = (utcTimestamp, format = 'datetime', showTimezone = false) => {
  const formattedTime = formatLocalTime(utcTimestamp, format);
  
  if (showTimezone) {
    const timezone = getUserTimezone();
    const offset = getTimezoneOffset();
    return `${formattedTime} (${timezone} ${offset})`;
  }
  
  return formattedTime;
}; 