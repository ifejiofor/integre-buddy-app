/**
 * Security utilities for the backend
 */

import { Request, Response } from '@cloudflare/workers-types';

/**
 * Set security headers on a response
 */
export function setSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  // Note: This might need adjustment based on your frontend needs
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
  );
  
  // CORS headers
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Cache control for API responses
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Log request information
 */
export async function logRequest(request: Request, startTime: number): Promise<void> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  
  const duration = Date.now() - startTime;
  
  console.log(`[${new Date().toISOString()}] ${method} ${path} - ${ip} - ${userAgent} - ${duration}ms`);
}

/**
 * Rate limiting middleware
 * Note: This is a simple implementation. For production, consider using Durable Objects
 */
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  adminLogin: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
  default: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

export function checkRateLimit(key: string, type: keyof typeof RATE_LIMITS = 'default'): boolean {
  const now = Date.now();
  const limit = RATE_LIMITS[type];
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    // Reset the counter
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + limit.windowMs,
    });
    return true;
  }
  
  if (entry.count >= limit.maxRequests) {
    return false;
  }
  
  // Increment the counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return true;
}

/**
 * Verify authentication token
 */
export function verifyAuthToken(token: string | null, expectedToken: string): boolean {
  if (!token) return false;
  return token === expectedToken;
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate that a campaign belongs to the authenticated user
 */
export function validateCampaignOwnership(
  campaignId: string,
  sessionToken: string | null
): boolean {
  // In a real implementation, we would check the database
  // For now, just return true if we have a token
  return !!sessionToken;
}

/**
 * Generate a secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

/**
 * Create a response with an error message
 */
export function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
