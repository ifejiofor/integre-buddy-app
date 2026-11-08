/**
 * Admin Handlers
 */

import { Request, Response } from '@cloudflare/workers-types';
import { Env, AdminLoginRequest, Campaign, ApiResponse, AdminSessionRow, CampaignRow } from '../types';
import { getCampaignFromDB, createAdminSessionInDB, getAdminSessionByToken, deleteAdminSession } from '../services/database';
import { verifyPassword } from '../utils/crypto';
import { getCurrentTimestamp, calculateExpiration } from '../utils/date';
import { generateId, generateSessionToken } from '../utils/crypto';
import { extractTokenFromHeader, createErrorResponse, createSuccessResponse } from '../utils/security';
import { TIME_CONSTANTS } from '../types';

/**
 * Admin login
 */
export async function handleAdminLogin(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json<AdminLoginRequest>();
    
    // Get campaign
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }
    
    // Check if campaign is expired
    if (campaign.status === 'EXPIRED') {
      return createErrorResponse('Campaign has expired', 403);
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(body.secretCode, campaign.secret_hash);
    if (!isPasswordValid) {
      // Rate limiting would be applied here in production
      return createErrorResponse('Invalid secret code', 401);
    }
    
    // Create session
    const sessionId = generateId();
    const token = generateSessionToken();
    const now = getCurrentTimestamp();
    const expiresAt = now + TIME_CONSTANTS.SESSION_DURATION_HOURS * 60 * 60 * 1000;
    
    const session: AdminSessionRow = {
      id: sessionId,
      campaign_id: campaignId,
      token,
      created_at: now,
      expires_at: expiresAt,
    };
    
    await createAdminSessionInDB(env.DB, session);
    
    // Convert to response format
    const responseCampaign: Campaign = {
      id: campaign.id,
      city: campaign.city,
      secretHash: campaign.secret_hash,
      registrationUrl: campaign.registration_url,
      qrCodeUrl: campaign.qr_code_url,
      adminUrl: campaign.admin_url,
      displayUrl: campaign.display_url,
      status: campaign.status,
      createdAt: campaign.created_at,
      expiresAt: campaign.expires_at,
    };
    
    return createSuccessResponse({
      sessionToken: token,
      campaign: responseCampaign,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return createErrorResponse('Login failed', 500);
  }
}

/**
 * Admin logout
 */
export async function handleAdminLogout(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Extract token from header
    const token = extractTokenFromHeader(request);
    if (!token) {
      return createErrorResponse('No authorization token provided', 401);
    }
    
    // Delete the session
    await deleteAdminSession(env.DB, token);
    
    return createSuccessResponse(null);
  } catch (error) {
    console.error('Admin logout error:', error);
    return createErrorResponse('Logout failed', 500);
  }
}

/**
 * Verify admin session
 */
export async function handleVerifyAdmin(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Extract token from header
    const token = extractTokenFromHeader(request);
    if (!token) {
      return createErrorResponse('No authorization token provided', 401);
    }
    
    // Get session
    const session = await getAdminSessionByToken(env.DB, token);
    if (!session) {
      return createErrorResponse('Invalid or expired session', 401);
    }
    
    // Check if session has expired
    const now = getCurrentTimestamp();
    if (now > session.expires_at) {
      await deleteAdminSession(env.DB, token);
      return createErrorResponse('Session has expired', 401);
    }
    
    // Check if session belongs to the campaign
    if (session.campaign_id !== campaignId) {
      return createErrorResponse('Session does not belong to this campaign', 403);
    }
    
    // Get campaign
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }
    
    // Convert to response format
    const responseCampaign: Campaign = {
      id: campaign.id,
      city: campaign.city,
      secretHash: campaign.secret_hash,
      registrationUrl: campaign.registration_url,
      qrCodeUrl: campaign.qr_code_url,
      adminUrl: campaign.admin_url,
      displayUrl: campaign.display_url,
      status: campaign.status,
      createdAt: campaign.created_at,
      expiresAt: campaign.expires_at,
    };
    
    return createSuccessResponse(responseCampaign);
  } catch (error) {
    console.error('Verify admin error:', error);
    return createErrorResponse('Verification failed', 500);
  }
}
