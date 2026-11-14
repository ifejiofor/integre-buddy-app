/**
 * Dashboard Handlers
 */

import { Env, Campaign, ApiResponse, DashboardStats, Student } from '../types';
import { getCampaignFromDB, getCampaignStats, getPendingStudentsByCampaign, getMatchedStudentsByCampaign } from '../services/database';
import { createErrorResponse, createSuccessResponse, extractTokenFromHeader } from '../utils/security';

/**
 * Get dashboard statistics
 */
export async function handleGetDashboard(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Verify admin session
    const token = extractTokenFromHeader(request);
    if (!token) {
      return createErrorResponse('No authorization token provided', 401);
    }
    
    // Get campaign
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }
    
    // Check if campaign is expired
    if (campaign.status === 'EXPIRED') {
      return createErrorResponse('Campaign has expired', 403);
    }
    
    // Get stats
    const stats = await getCampaignStats(env.DB, campaignId);
    
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
    
    const responseStats: DashboardStats = {
      totalRegistered: stats.totalRegistered,
      totalMatched: stats.totalMatched,
      totalPending: stats.totalPending,
      totalRounds: stats.totalRounds,
      campaign: responseCampaign,
    };
    
    return createSuccessResponse(responseStats);
  } catch (error) {
    console.error('Get dashboard error:', error);
    return createErrorResponse('Failed to get dashboard', 500);
  }
}

/**
 * Get pending students
 */
export async function handleGetPendingStudents(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Verify admin session
    const token = extractTokenFromHeader(request);
    if (!token) {
      return createErrorResponse('No authorization token provided', 401);
    }
    
    // Get campaign
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }
    
    // Check if campaign is expired
    if (campaign.status === 'EXPIRED') {
      return createErrorResponse('Campaign has expired', 403);
    }
    
    // Get pending students
    const students = await getPendingStudentsByCampaign(env.DB, campaignId);
    
    // Convert to response format
    const responseStudents: Student[] = students.map(s => ({
      id: s.id,
      campaignId: s.campaign_id,
      firstName: s.first_name,
      lastName: s.last_name,
      arrivalYear: s.arrival_year,
      hobbies: JSON.parse(s.hobbies),
      status: s.status,
      registeredAt: s.registered_at,
      consentGiven: s.consent_given === 1,
      consentTimestamp: s.consent_timestamp,
      privacyNoticeVersion: s.privacy_notice_version,
    }));
    
    return createSuccessResponse({
      students: responseStudents,
      total: responseStudents.length,
    });
  } catch (error) {
    console.error('Get pending students error:', error);
    return createErrorResponse('Failed to get pending students', 500);
  }
}

/**
 * Get matched students
 */
export async function handleGetMatchedStudents(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Verify admin session
    const token = extractTokenFromHeader(request);
    if (!token) {
      return createErrorResponse('No authorization token provided', 401);
    }
    
    // Get campaign
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }
    
    // Check if campaign is expired
    if (campaign.status === 'EXPIRED') {
      return createErrorResponse('Campaign has expired', 403);
    }
    
    // Get matched students
    const students = await getMatchedStudentsByCampaign(env.DB, campaignId);
    
    // Convert to response format
    const responseStudents: Student[] = students.map(s => ({
      id: s.id,
      campaignId: s.campaign_id,
      firstName: s.first_name,
      lastName: s.last_name,
      arrivalYear: s.arrival_year,
      hobbies: JSON.parse(s.hobbies),
      status: s.status,
      registeredAt: s.registered_at,
      consentGiven: s.consent_given === 1,
      consentTimestamp: s.consent_timestamp,
      privacyNoticeVersion: s.privacy_notice_version,
    }));
    
    return createSuccessResponse({
      students: responseStudents,
      total: responseStudents.length,
    });
  } catch (error) {
    console.error('Get matched students error:', error);
    return createErrorResponse('Failed to get matched students', 500);
  }
}
