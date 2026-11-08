/**
 * Date utilities for the backend
 */

/**
 * Get the current timestamp
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Get the current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Format a timestamp as a readable date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a timestamp as a readable time string
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format a timestamp as a full datetime string
 */
export function formatDateTime(timestamp: number): string {
  return `${formatDate(timestamp)} at ${formatTime(timestamp)}`;
}

/**
 * Calculate expiration timestamp
 */
export function calculateExpiration(durationHours: number = 24): number {
  return getCurrentTimestamp() + durationHours * 60 * 60 * 1000;
}

/**
 * Check if a timestamp has expired
 */
export function isExpired(expiresAt: number): boolean {
  return getCurrentTimestamp() > expiresAt;
}

/**
 * Get years for the arrival year dropdown
 */
export function getArrivalYears(): number[] {
  const currentYear = getCurrentYear();
  const years: number[] = [];
  
  for (let i = currentYear; i >= currentYear - 10; i--) {
    years.push(i);
  }
  
  return years;
}

/**
 * Check if a year is a new student year (current year)
 */
export function isNewStudent(arrivalYear: number): boolean {
  return arrivalYear === getCurrentYear();
}
