/**
 * Validation utilities for the backend
 */

import { VALIDATION } from '../types';

// Define validation constants
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 50;
const MIN_SECRET_LENGTH = 8;
const MAX_SECRET_LENGTH = 64;
const MIN_HOBBY_LENGTH = 2;
const MAX_HOBBY_LENGTH = 100;
const MAX_HOBBIES_PER_STUDENT = 10;

/**
 * Validate a name
 */
export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  
  if (name.trim().length < MIN_NAME_LENGTH) {
    return { valid: false, error: `Name must be at least ${MIN_NAME_LENGTH} character` };
  }
  
  if (name.trim().length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Name must be at most ${MAX_NAME_LENGTH} characters` };
  }
  
  // Check for invalid characters
  if (!/^[a-zA-Z\s\-\'\.]+$/.test(name.trim())) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Validate a city name
 */
export function validateCity(city: string): { valid: boolean; error?: string } {
  if (!city || city.trim().length === 0) {
    return { valid: false, error: 'City name is required' };
  }
  
  if (city.trim().length < 2) {
    return { valid: false, error: 'City name must be at least 2 characters' };
  }
  
  if (city.trim().length > 100) {
    return { valid: false, error: 'City name must be at most 100 characters' };
  }
  
  return { valid: true };
}

/**
 * Validate a secret code
 */
export function validateSecretCode(secret: string): { valid: boolean; error?: string } {
  if (!secret || secret.trim().length === 0) {
    return { valid: false, error: 'Secret code is required' };
  }
  
  if (secret.length < MIN_SECRET_LENGTH) {
    return { valid: false, error: `Secret code must be at least ${MIN_SECRET_LENGTH} characters` };
  }
  
  if (secret.length > MAX_SECRET_LENGTH) {
    return { valid: false, error: `Secret code must be at most ${MAX_SECRET_LENGTH} characters` };
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    '12345678',
    'password',
    'qwerty',
    'abc123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'football',
  ];
  
  if (weakPatterns.some(pattern => secret.toLowerCase().includes(pattern))) {
    return { valid: false, error: 'Secret code is too weak' };
  }
  
  return { valid: true };
}

/**
 * Validate secret code confirmation
 */
export function validateSecretCodeConfirmation(
  secret: string,
  confirmation: string
): { valid: boolean; error?: string } {
  if (secret !== confirmation) {
    return { valid: false, error: 'Secret codes do not match' };
  }
  return { valid: true };
}

/**
 * Validate arrival year
 */
export function validateArrivalYear(year: number | null): { valid: boolean; error?: string } {
  if (year === null || year === undefined) {
    return { valid: false, error: 'Arrival year is required' };
  }
  
  const currentYear = new Date().getFullYear();
  
  if (year > currentYear) {
    return { valid: false, error: 'Arrival year cannot be in the future' };
  }
  
  if (year < 1900) {
    return { valid: false, error: 'Arrival year must be after 1900' };
  }
  
  return { valid: true };
}

/**
 * Validate hobbies
 */
export function validateHobbies(hobbies: string[]): { valid: boolean; error?: string } {
  if (!hobbies || hobbies.length === 0) {
    return { valid: false, error: 'At least one hobby is required' };
  }
  
  if (hobbies.length > MAX_HOBBIES_PER_STUDENT) {
    return { valid: false, error: `Maximum ${MAX_HOBBIES_PER_STUDENT} hobbies allowed` };
  }
  
  for (const hobby of hobbies) {
    if (hobby.length < MIN_HOBBY_LENGTH) {
      return { valid: false, error: `Hobby must be at least ${MIN_HOBBY_LENGTH} characters` };
    }
    
    if (hobby.length > MAX_HOBBY_LENGTH) {
      return { valid: false, error: `Hobby must be at most ${MAX_HOBBY_LENGTH} characters` };
    }
  }
  
  return { valid: true };
}

/**
 * Validate consent
 */
export function validateConsent(consent: boolean): { valid: boolean; error?: string } {
  if (!consent) {
    return { valid: false, error: 'You must agree to the privacy notice' };
  }
  return { valid: true };
}

/**
 * Validate matching ratio
 */
export function validateRatio(ratio: string): { valid: boolean; error?: string } {
  const ratioRegex = /^(\d+):(\d+)$/;
  const match = ratio.match(ratioRegex);
  
  if (!match) {
    return { valid: false, error: 'Invalid ratio format. Use format like "1:1" or "2:3"' };
  }
  
  const oldCount = parseInt(match[1], 10);
  const newCount = parseInt(match[2], 10);
  
  if (oldCount <= 0 || newCount <= 0) {
    return { valid: false, error: 'Both numbers in ratio must be positive' };
  }
  
  if (oldCount > 5 || newCount > 5) {
    return { valid: false, error: 'Ratio numbers must be 5 or less' };
  }
  
  return { valid: true };
}

/**
 * Validate group size
 */
export function validateGroupSize(size: number): { valid: boolean; error?: string } {
  if (size < 2) {
    return { valid: false, error: 'Group size must be at least 2' };
  }
  
  if (size > 10) {
    return { valid: false, error: 'Group size must be at most 10' };
  }
  
  return { valid: true };
}

/**
 * Validate campaign creation form
 */
export function validateCampaignCreation(
  city: string,
  secretCode: string,
  secretCodeConfirmation: string
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  const cityValidation = validateCity(city);
  if (!cityValidation.valid) {
    errors.city = cityValidation.error!;
  }
  
  const secretValidation = validateSecretCode(secretCode);
  if (!secretValidation.valid) {
    errors.secretCode = secretValidation.error!;
  }
  
  const confirmationValidation = validateSecretCodeConfirmation(secretCode, secretCodeConfirmation);
  if (!confirmationValidation.valid) {
    errors.secretCodeConfirmation = confirmationValidation.error!;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate student registration form
 */
export function validateStudentRegistration(
  firstName: string,
  lastName: string,
  arrivalYear: number | null,
  hobbies: string[],
  consent: boolean
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  const firstNameValidation = validateName(firstName);
  if (!firstNameValidation.valid) {
    errors.firstName = firstNameValidation.error!;
  }
  
  const lastNameValidation = validateName(lastName);
  if (!lastNameValidation.valid) {
    errors.lastName = lastNameValidation.error!;
  }
  
  const arrivalYearValidation = validateArrivalYear(arrivalYear);
  if (!arrivalYearValidation.valid) {
    errors.arrivalYear = arrivalYearValidation.error!;
  }
  
  const hobbiesValidation = validateHobbies(hobbies);
  if (!hobbiesValidation.valid) {
    errors.hobbies = hobbiesValidation.error!;
  }
  
  const consentValidation = validateConsent(consent);
  if (!consentValidation.valid) {
    errors.consent = consentValidation.error!;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
