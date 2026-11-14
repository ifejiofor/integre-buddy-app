/**
 * Notification Handlers
 */

import { Env, PushSubscriptionRow } from '../types';
import {
  createPushSubscriptionInDB,
  deletePushSubscription,
  getCampaignFromDB,
  getPushSubscriptionByEndpoint,
  getPushSubscriptionsByStudentAndCampaign,
  updatePushSubscriptionInDB,
} from '../services/database';
import { generateId } from '../utils/crypto';
import { getCurrentTimestamp } from '../utils/date';
import { createErrorResponse, createSuccessResponse } from '../utils/security';
import { isValidPushEndpoint, sendWebPush } from '../utils/webPush';

/**
 * Subscribe to push notifications
 */
export async function handleSubscribePush(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
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

    if (
      typeof body.subscription?.endpoint !== 'string' ||
      typeof body.subscription.keys?.p256dh !== 'string' ||
      typeof body.subscription.keys?.auth !== 'string' ||
      !isValidPushEndpoint(body.subscription.endpoint)
    ) {
      return createErrorResponse('Valid subscription data is required', 400);
    }

    const subscription: PushSubscriptionRow = {
      id: generateId(),
      campaign_id: campaignId,
      student_id: body.studentId || null,
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
      created_at: getCurrentTimestamp(),
    };
    const existing = await getPushSubscriptionByEndpoint(env.DB, campaignId, subscription.endpoint);
    if (existing) {
      subscription.id = existing.id;
      await updatePushSubscriptionInDB(env.DB, subscription);
    } else {
      await createPushSubscriptionInDB(env.DB, subscription);
    }

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
    const body = await request.json<{ subscriptionId: string }>();

    if (!body.subscriptionId) {
      return createErrorResponse('Subscription ID is required', 400);
    }

    const subscription = await env.DB.prepare(`
      SELECT id FROM push_subscriptions WHERE id = ? AND campaign_id = ?
    `).bind(body.subscriptionId, campaignId).first<{ id: string }>();
    if (subscription) {
      await deletePushSubscription(env.DB, subscription.id);
    }

    return createSuccessResponse(null);
  } catch (error) {
    console.error('Unsubscribe push error:', error);
    return createErrorResponse('Failed to unsubscribe from push notifications', 500);
  }
}

/**
 * Send a result notification after a successful match transaction.
 */
export async function sendPushNotification(
  env: Env,
  campaignId: string,
  studentId: string,
  title: string,
  body: string,
  url: string
): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    console.error('Push notification delivery skipped: VAPID configuration is incomplete');
    return;
  }

  try {
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    if (!campaign || campaign.status !== 'ACTIVE' || campaign.expires_at <= getCurrentTimestamp()) {
      console.log('Push notification delivery skipped for inactive campaign');
      return;
    }

    const subscriptions = await getPushSubscriptionsByStudentAndCampaign(env.DB, campaignId, studentId);
    const deliveredEndpoints = new Set<string>();
    for (const subscription of subscriptions) {
      if (deliveredEndpoints.has(subscription.endpoint)) continue;
      deliveredEndpoints.add(subscription.endpoint);

      try {
        const response = await sendWebPush(
          subscription.endpoint,
          subscription.p256dh,
          subscription.auth,
          { title, body, url },
          env.VAPID_PUBLIC_KEY,
          env.VAPID_PRIVATE_KEY,
          env.VAPID_SUBJECT
        );

        if (response.status === 404 || response.status === 410) {
          await deletePushSubscription(env.DB, subscription.id);
        } else if (!response.ok) {
          console.error(`Push delivery failed with HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('Push delivery failed:', error);
      }
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}
