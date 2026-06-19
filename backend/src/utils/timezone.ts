/**
 * Utility functions for handling Timezones (specifically IST - Indian Standard Time)
 */

/**
 * Converts a Date object or ISO string to a human-readable Indian Standard Time (IST) string.
 * Format: "YYYY-MM-DD HH:mm:ss" or locale string
 */
export function toISTString(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  // Return formatted string in Asia/Kolkata timezone
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
