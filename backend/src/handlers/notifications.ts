/**
 * Notification Handlers
 */

import { Request, Response } from '@cloudflare/workers-types';
import { Env, ApiResponse, PushSubscriptionRow } from '../types';
import { 
  createPushSubscriptionInDB, 
  getPushSubscriptionFromDB,
  deletePushSubscription,
  getPushSubscriptionsByCampaign
} from '../services/database';
import { generateId } from '../utils/crypto';
import { getCurrentTimestamp } from '../utils/date';
import { createErrorResponse, createSuccessResponse } from '../utils/security';

/**
 * Subscribe to push notifications
 */
export async function handleSubscribePush(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json<{
      subscription: {
        endpoint: string;
        keys: {
          p256dh: string;
          auth: string;
        };
      };
      studentId?: string;
    }>();
    
    if (!body.subscription) {
      return createErrorResponse('Subscription data is required', 400);
    }
    
    // Create subscription
    const subscriptionId = generateId();
    const now = getCurrentTimestamp();
    
    const subscription: PushSubscriptionRow = {
      id: subscriptionId,
      campaign_id: campaignId,
      student_id: body.studentId || null,
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
      created_at: now,
    };
    
    await createPushSubscriptionInDB(env.DB, subscription);
    
    return createSuccessResponse(null);
  } catch (error) {
    console.error('Subscribe push error:', error);
    return createErrorResponse('Failed to subscribe to push notifications', 500);
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function handleUnsubscribePush(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json<{ subscriptionId: string }>();
    
    if (!body.subscriptionId) {
      return createErrorResponse('Subscription ID is required', 400);
    }
    
    // Delete subscription
    await deletePushSubscription(env.DB, body.subscriptionId);
    
    return createSuccessResponse(null);
  } catch (error) {
    console.error('Unsubscribe push error:', error);
    return createErrorResponse('Failed to unsubscribe from push notifications', 500);
  }
}

/**
 * Send push notification (internal function, not exposed via API)
 * This would be called by the matching handler after matches are created
 */
export async function sendPushNotification(
  env: Env,
  campaignId: string,
  title: string,
  body: string,
  data: { url: string }
): Promise<void> {
  try {
    // Get all push subscriptions for this campaign
    const subscriptions = await getPushSubscriptionsByCampaign(env.DB, campaignId);
    
    if (subscriptions.length === 0) {
      console.log('No push subscriptions for campaign:', campaignId);
      return;
    }
    
    // In a real implementation, we would send push notifications here
    // For Cloudflare Workers, we would use the Web Push API
    // However, this requires VAPID keys and proper configuration
    
    console.log(`Would send push notification to ${subscriptions.length} subscribers for campaign ${campaignId}`);
    console.log(`Title: ${title}, Body: ${body}, URL: ${data.url}`);
    
    // Note: In a production environment, you would:
    // 1. Create a Web Push message
    // 2. Sign it with your VAPID private key
    // 3. Send it to each subscription endpoint
    
    // For now, we'll just log it
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}
