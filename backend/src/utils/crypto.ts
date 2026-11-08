/**
 * Cryptographic utilities for the backend
 */

import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as CryptoJS from 'crypto-js';

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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
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
 * Create a deterministic hash for matching purposes
 */
export function createHash(...inputs: (string | number)[]): string {
  const inputString = inputs.join('|');
  return CryptoJS.SHA256(inputString).toString(CryptoJS.enc.Hex);
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
