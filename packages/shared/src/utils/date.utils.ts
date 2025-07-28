/**
 * Date utility functions for healthcare applications
 */

/**
 * Calculates age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Formats a date for display in healthcare contexts
 */
export function formatDate(date: Date, format: 'short' | 'long' | 'time' | 'datetime' = 'short'): string {
  const options: Intl.DateTimeFormatOptions = {};
  
  switch (format) {
    case 'short':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'long':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
      break;
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Checks if a date is within a specified range
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Adds time to a date
 */
export function addTime(date: Date, amount: number, unit: 'minutes' | 'hours' | 'days' | 'weeks'): Date {
  const newDate = new Date(date);
  
  switch (unit) {
    case 'minutes':
      newDate.setMinutes(newDate.getMinutes() + amount);
      break;
    case 'hours':
      newDate.setHours(newDate.getHours() + amount);
      break;
    case 'days':
      newDate.setDate(newDate.getDate() + amount);
      break;
    case 'weeks':
      newDate.setDate(newDate.getDate() + (amount * 7));
      break;
  }
  
  return newDate;
}

/**
 * Gets the start and end of a day
 */
export function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Converts a date to ISO string in local timezone
 */
export function toLocalISOString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().slice(0, -1);
}

/**
 * Parses various date formats commonly used in healthcare
 */
export function parseHealthcareDate(dateString: string): Date | null {
  // Try common healthcare date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];
  
  for (const format of formats) {
    if (format.test(dateString)) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

/**
 * Checks if it's business hours (useful for determining when to send notifications)
 */
export function isBusinessHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  
  // Monday = 1, Sunday = 0
  const isWeekday = day >= 1 && day <= 5;
  const isBusinessTime = hour >= 8 && hour < 17; // 8 AM to 5 PM
  
  return isWeekday && isBusinessTime;
}

/**
 * Gets the next business day
 */
export function getNextBusinessDay(date: Date = new Date()): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Skip weekends
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
} 