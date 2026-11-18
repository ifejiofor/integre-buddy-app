/**
 * Date utilities for the IntEGre Buddy App application
 */

/**
 * Get the current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get the current timestamp
 */
export function getCurrentTimestamp(): number {
  return Date.now();
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
 * Format a timestamp as a relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (seconds > 0) {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/**
 * Calculate the remaining time until expiration
 */
export function getRemainingTime(expiresAt: number): { hours: number; minutes: number; seconds: number } {
  const now = Date.now();
  const diff = expiresAt - now;
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return { hours, minutes, seconds };
}

/**
 * Format remaining time as a human-readable string
 */
export function formatRemainingTime(expiresAt: number): string {
  const { hours, minutes, seconds } = getRemainingTime(expiresAt);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Check if a campaign has expired
 */
export function isCampaignExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

/**
 * Calculate expiration timestamp from creation time
 */
export function calculateExpiration(createdAt: number, durationHours: number = 24): number {
  return createdAt + durationHours * 60 * 60 * 1000;
}

/**
 * Get years for the arrival year dropdown
 */
export function getArrivalYears(): number[] {
  const currentYear = getCurrentYear();
  const years: number[] = [];
  
  // Include current year and previous 10 years
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

/**
 * Get the current year range for display
 */
export function getYearRange(startYear: number, endYear: number): string {
  if (startYear === endYear) {
    return startYear.toString();
  }
  return `${startYear} - ${endYear}`;
}
