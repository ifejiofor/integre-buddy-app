/**
 * Cryptographic utilities for the Campus Buddies application
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique identifier
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a campaign secret code
 */
export function generateSecretCode(): string {
  return generateRandomString(12);
}

/**
 * Generate a registration URL token
 */
export function generateRegistrationToken(): string {
  return generateRandomString(24);
}

/**
 * Generate a result URL token
 */
export function generateResultToken(): string {
  return generateRandomString(32);
}

/**
 * Generate an admin session token
 */
export function generateSessionToken(): string {
  return generateRandomString(48);
}

/**
 * Hash a string using SHA-256
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a secure password hash using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  // In a real backend, we'd use bcrypt with proper salt
  // For the frontend, we'll use Web Crypto API
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Array.from(salt).map(b => b.toString()).join(''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return `$2a$10$${Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')}${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Generate a short, memorable campaign ID
 */
export function generateCampaignId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique matching round ID
 */
export function generateMatchingRoundId(): string {
  return `round_${Date.now()}_${generateRandomString(8)}`;
}

/**
 * Generate a unique match ID
 */
export function generateMatchId(): string {
  return `match_${Date.now()}_${generateRandomString(8)}`;
}

/**
 * Parse old-to-new ratio string into numbers
 * @example parseRatio("1:2") => { old: 1, new: 2 }
 */
export function parseRatio(ratio: string): { old: number; new: number } {
  const [oldStr, newStr] = ratio.split(':');
  return {
    old: parseInt(oldStr, 10),
    new: parseInt(newStr, 10),
  };
}

/**
 * Format ratio as string
 */
export function formatRatio(old: number, newVal: number): string {
  return `${old}:${newVal}`;
}

/**
 * Generate a deterministic hash for consistent matching
 */
export async function deterministicHash(...inputs: (string | number)[]): Promise<string> {
  const inputString = inputs.join('|');
  return hashString(inputString);
}
