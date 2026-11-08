/**
 * Campus Buddies Backend - Cloudflare Workers
 * 
 * This is the main backend implementation for the Campus Buddies application.
 * It provides all the API endpoints for campaign management, student registration,
 * matching, and notifications.
 */

import { D1Database } from '@cloudflare/workers-types/experimental';
import { Env } from './types';
import { handleCampaignCreation } from './handlers/campaigns';
import { handleAdminLogin, handleAdminLogout, handleVerifyAdmin } from './handlers/admin';
import { handleStudentRegistration, handleGetStudent, handleGetStudentResults } from './handlers/students';
import { handleGetDashboard, handleGetPendingStudents, handleGetMatchedStudents } from './handlers/dashboard';
import { handleConfigureMatching, handlePreviewMatching, handleGenerateMatches } from './handlers/matching';
import { handleGetPublicDisplay } from './handlers/display';
import { handleSubscribePush, handleUnsubscribePush } from './handlers/notifications';
import { handleGetCampaign, handleCheckCampaign } from './handlers/campaigns';
import { ApiResponse } from './types';
import { logRequest, setSecurityHeaders } from './utils/security';

/**
 * Main request handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Log the request
    await logRequest(request, startTime);
    
    try {
      // Set security headers
      const response = await handleRequest(request, env);
      return setSecurityHeaders(response);
    } catch (error) {
      console.error('Unhandled error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error',
        } as ApiResponse<null>),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

/**
 * Route requests to appropriate handlers
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Debug logging
  if (env.DEBUG === 'true') {
    console.log(`[DEBUG] ${request.method} ${path}`);
  }
  
  // API Routes
  
  // Campaigns
  if (path === '/api/campaigns' && request.method === 'POST') {
    return handleCampaignCreation(request, env);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)$/) && request.method === 'GET') {
    const campaignId = path.split('/')[3];
    return handleGetCampaign(request, env, campaignId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/check$/) && request.method === 'GET') {
    const campaignId = path.split('/')[3];
    return handleCheckCampaign(request, env, campaignId);
  }
  
  // Admin
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/admin\/login$/) && request.method === 'POST') {
    const campaignId = path.split('/')[3];
    return handleAdminLogin(request, env, campaignId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/admin\/logout$/) && request.method === 'POST') {
    const campaignId = path.split('/')[3];
    return handleAdminLogout(request, env, campaignId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/admin\/verify$/) && request.method === 'GET') {
    const campaignId = path.split('/')[3];
    return handleVerifyAdmin(request, env, campaignId);
  }
  
  // Students
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/students$/) && request.method === 'POST') {
    const campaignId = path.split('/')[3];
    return handleStudentRegistration(request, env, campaignId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/students\/([^\/]+)$/) && request.method === 'GET') {
    const campaignId = path.split('/')[3];
    const studentId = path.split('/')[5];
    return handleGetStudent(request, env, campaignId, studentId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/students\/([^\/]+)\/results$/) && request.method === 'GET') {
    const campaignId = path.split('/')[3];
    const studentId = path.split('/')[5];
    return handleGetStudentResults(request, env, campaignId, studentId);
  }
  
  // Dashboard
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/dashboard$/) && request.method === 'GET') {
    const campaignId = path.split('/')[3];
    return handleGetDashboard(request, env, campaignId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/students\/pending$/) && request.method === 'GET') {
    const campaignId = path.split('/')[3];
    return handleGetPendingStudents(request, env, campaignId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/students\/matched$/) && request.method === 'GET') {
    const campaignId = path.split('/')[3];
    return handleGetMatchedStudents(request, env, campaignId);
  }
  
  // Matching
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/matching\/configure$/) && request.method === 'POST') {
    const campaignId = path.split('/')[3];
    return handleConfigureMatching(request, env, campaignId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/matching\/preview$/) && request.method === 'POST') {
    const campaignId = path.split('/')[3];
    return handlePreviewMatching(request, env, campaignId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/matching\/generate$/) && request.method === 'POST') {
    const campaignId = path.split('/')[3];
    return handleGenerateMatches(request, env, campaignId);
  }
  
  // Display
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/display$/) && request.method === 'GET') {
    const campaignId = path.split('/')[3];
    return handleGetPublicDisplay(request, env, campaignId);
  }
  
  // Notifications
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/notifications\/subscribe$/) && request.method === 'POST') {
    const campaignId = path.split('/')[3];
    return handleSubscribePush(request, env, campaignId);
  }
  
  if (path.match(/^\/api\/campaigns\/([^\/]+)\/notifications\/unsubscribe$/) && request.method === 'POST') {
    const campaignId = path.split('/')[3];
    return handleUnsubscribePush(request, env, campaignId);
  }
  
  // Hobby relationships
  if (path === '/api/hobbies/relationships' && request.method === 'GET') {
    // Return predefined hobby relationships
    const { HOBBY_RELATIONSHIPS } = await import('./types');
    return new Response(
      JSON.stringify({
        success: true,
        data: HOBBY_RELATIONSHIPS,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  // Default: Not found
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Not found',
    } as ApiResponse<null>),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
