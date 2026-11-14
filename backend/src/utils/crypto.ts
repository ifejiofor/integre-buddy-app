/**
 * Cryptographic utilities for the backend
 */

import bcrypt from 'bcryptjs';

/**
 * Generate a unique identifier
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number = 32): string {
  return generateStringFromAlphabet(
    length,
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  );
}

function generateStringFromAlphabet(length: number, alphabet: string): string {
  const maxValidByte = 256 - (256 % alphabet.length);
  let result = '';

  while (result.length < length) {
    const bytes = crypto.getRandomValues(
      new Uint8Array(Math.max(length - result.length, 16))
    );

    for (const byte of bytes) {
      if (byte < maxValidByte) {
        result += alphabet[byte % alphabet.length];
        if (result.length === length) break;
      }
    }
  }

  return result;
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
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a short, memorable campaign ID
 */
export function generateCampaignId(): string {
  return generateStringFromAlphabet(8, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
}

/**
 * Parse old-to-new ratio string
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
