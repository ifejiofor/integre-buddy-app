/**
 * Campaign Handlers
 */

import { Request, Response } from '@cloudflare/workers-types';
import { Env, CampaignCreationRequest, Campaign, ApiResponse, CampaignRow, CAMPAIGN_DURATION_HOURS } from '../types';
import { generateId, hashPassword, generateRegistrationToken, generateResultToken } from '../utils/crypto';
import { getCurrentTimestamp } from '../utils/date';
import { createCampaignInDB, getCampaignFromDB } from '../services/database';
import { validateCampaignCreation } from '../utils/validation';
import QRCode from 'qrcode';

/**
 * Create a new campaign
 */
export async function handleCampaignCreation(request: Request, env: Env): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json<CampaignCreationRequest>();
    
    // Validate input
    const validation = validateCampaignCreation(
      body.city,
      body.secretCode,
      body.secretCodeConfirmation
    );
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: Object.values(validation.errors).join(', '),
        } as ApiResponse<null>),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Check if secret codes match
    if (body.secretCode !== body.secretCodeConfirmation) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Secret codes do not match',
        } as ApiResponse<null>),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Hash the secret code
    const secretHash = await hashPassword(body.secretCode);
    
    // Generate unique IDs and tokens
    const campaignId = generateId();
    const registrationToken = generateRegistrationToken();
    const resultToken = generateResultToken();
    const adminToken = generateRegistrationToken();
    const displayToken = generateRegistrationToken();
    
    const now = getCurrentTimestamp();
    const expiresAt = now + CAMPAIGN_DURATION_HOURS * 60 * 60 * 1000;
    
    // Generate URLs
    const baseUrl = getBaseUrl(request);
    const registrationUrl = `${baseUrl}/campaigns/${campaignId}/register`;
    const adminUrl = `${baseUrl}/campaigns/${campaignId}/admin/login`;
    const displayUrl = `${baseUrl}/campaigns/${campaignId}/display`;
    
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl);
    
    // Create campaign in database
    const campaign: CampaignRow = {
      id: campaignId,
      city: body.city.trim(),
      secret_hash: secretHash,
      registration_url: registrationUrl,
      qr_code_url: qrCodeDataUrl,
      admin_url: adminUrl,
      display_url: displayUrl,
      status: 'ACTIVE',
      created_at: now,
      expires_at: expiresAt,
    };
    
    await createCampaignInDB(env.DB, campaign);
    
    // Return response
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
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          campaign: responseCampaign,
          qrCodeDataUrl: qrCodeDataUrl,
        },
      } as ApiResponse<{ campaign: Campaign; qrCodeDataUrl: string }>),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Campaign creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to create campaign',
      } as ApiResponse<null>),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get campaign details
 */
export async function handleGetCampaign(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    
    if (!campaign) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campaign not found',
        } as ApiResponse<null>),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
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
    
    return new Response(
      JSON.stringify({
        success: true,
        data: responseCampaign,
      } as ApiResponse<Campaign>),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get campaign error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get campaign',
      } as ApiResponse<null>),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Check if campaign is accessible
 */
export async function handleCheckCampaign(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    
    if (!campaign) {
      return new Response(
        JSON.stringify({
          success: false,
          accessible: false,
          expired: true,
        } as ApiResponse<{ accessible: boolean; expired: boolean }>),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const now = getCurrentTimestamp();
    const isExpired = now > campaign.expires_at;
    const isAccessible = campaign.status === 'ACTIVE' && !isExpired;
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          accessible: isAccessible,
          expired: isExpired,
        },
      } as ApiResponse<{ accessible: boolean; expired: boolean }>),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Check campaign error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        accessible: false,
        expired: true,
      } as ApiResponse<{ accessible: boolean; expired: boolean }>),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get base URL from request
 */
function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  // In production, use the actual host
  // In development, use localhost
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return `http://${url.hostname}:3000`;
  }
  return `https://${url.hostname}`;
}
