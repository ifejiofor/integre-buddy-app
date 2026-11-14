/**
 * Student Handlers
 */

import { Env, StudentRegistrationRequest, Student, ApiResponse, CampaignRow, StudentRow, MatchRow, MatchMemberRow, PushSubscriptionRow } from '../types';
import {
  getCampaignFromDB,
  createStudentInDB,
  getStudentFromDB,
  createResultTokenInDB,
  getResultTokenByToken,
  getPushSubscriptionByEndpoint,
  createPushSubscriptionInDB,
  updatePushSubscriptionInDB,
} from '../services/database';
import { validateStudentRegistration } from '../utils/validation';
import { generateId, generateResultToken } from '../utils/crypto';
import { getCurrentTimestamp, getCurrentYear } from '../utils/date';
import { createErrorResponse, createSuccessResponse } from '../utils/security';
import { deduplicateHobbies, getStudentType } from '../utils/matching';
import { isValidPushEndpoint } from '../utils/webPush';

/**
 * Student registration
 */
export async function handleStudentRegistration(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Get campaign
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }
    
    // Check if campaign is expired
    if (campaign.status === 'EXPIRED' || getCurrentTimestamp() > campaign.expires_at) {
      return createErrorResponse('Campaign has expired', 403);
    }
    
    // Parse request body
    const body = await request.json<StudentRegistrationRequest>();
    
    // Validate input
    const validation = validateStudentRegistration(
      body.firstName,
      body.lastName,
      body.arrivalYear,
      body.hobbies,
      body.consentGiven
    );
    
    if (!validation.valid) {
      return createErrorResponse(Object.values(validation.errors).join(', '), 400);
    }
    
    // Deduplicate hobbies
    const hobbies = deduplicateHobbies(body.hobbies);
    
    // Create student
    const studentId = generateId();
    const now = getCurrentTimestamp();
    
    const student: StudentRow = {
      id: studentId,
      campaign_id: campaignId,
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      arrival_year: body.arrivalYear,
      hobbies: JSON.stringify(hobbies),
      status: 'PENDING',
      registered_at: now,
      consent_given: body.consentGiven ? 1 : 0,
      consent_timestamp: now,
      privacy_notice_version: body.privacyNoticeVersion,
    };
    
    await createStudentInDB(env.DB, student);
    
    // Create result token
    const resultToken = generateResultToken();
    const resultTokenId = generateId();
    
    await createResultTokenInDB(env.DB, {
      id: resultTokenId,
      campaign_id: campaignId,
      student_id: studentId,
      token: resultToken,
      created_at: now,
    });

    const pushSubscription = body.pushSubscription;
    if (
      pushSubscription?.endpoint &&
      pushSubscription.keys?.p256dh &&
      pushSubscription.keys.auth
    ) {
      try {
        if (!isValidPushEndpoint(pushSubscription.endpoint)) {
          throw new Error('Unsupported push subscription endpoint');
        }
        const endpoint = new URL(pushSubscription.endpoint);

        const subscription: PushSubscriptionRow = {
          id: generateId(),
          campaign_id: campaignId,
          student_id: studentId,
          endpoint: endpoint.toString(),
          p256dh: pushSubscription.keys.p256dh,
          auth: pushSubscription.keys.auth,
          created_at: now,
        };
        const existing = await getPushSubscriptionByEndpoint(env.DB, campaignId, subscription.endpoint);
        if (existing) {
          subscription.id = existing.id;
          await updatePushSubscriptionInDB(env.DB, subscription);
        } else {
          await createPushSubscriptionInDB(env.DB, subscription);
        }
      } catch (error) {
        console.error('Could not save optional push subscription:', error);
      }
    }
    
    // Convert to response format
    const responseStudent: Student = {
      id: student.id,
      campaignId: student.campaign_id,
      firstName: student.first_name,
      lastName: student.last_name,
      arrivalYear: student.arrival_year,
      hobbies: JSON.parse(student.hobbies),
      status: student.status,
      registeredAt: student.registered_at,
      consentGiven: student.consent_given === 1,
      consentTimestamp: student.consent_timestamp,
      privacyNoticeVersion: student.privacy_notice_version,
    };
    
    return createSuccessResponse({
      student: responseStudent,
      resultUrlToken: resultToken,
    });
  } catch (error) {
    console.error('Student registration error:', error);
    return createErrorResponse('Registration failed', 500);
  }
}

/**
 * Get student details
 */
export async function handleGetStudent(request: Request, env: Env, campaignId: string, studentId: string): Promise<Response> {
  try {
    // Get student
    const student = await getStudentFromDB(env.DB, studentId);
    if (!student) {
      return createErrorResponse('Student not found', 404);
    }
    
    // Check if student belongs to the campaign
    if (student.campaign_id !== campaignId) {
      return createErrorResponse('Student does not belong to this campaign', 403);
    }
    
    // Convert to response format
    const responseStudent: Student = {
      id: student.id,
      campaignId: student.campaign_id,
      firstName: student.first_name,
      lastName: student.last_name,
      arrivalYear: student.arrival_year,
      hobbies: JSON.parse(student.hobbies),
      status: student.status,
      registeredAt: student.registered_at,
      consentGiven: student.consent_given === 1,
      consentTimestamp: student.consent_timestamp,
      privacyNoticeVersion: student.privacy_notice_version,
    };
    
    return createSuccessResponse(responseStudent);
  } catch (error) {
    console.error('Get student error:', error);
    return createErrorResponse('Failed to get student', 500);
  }
}

/**
 * Get student results (match information)
 */
export async function handleGetStudentResults(request: Request, env: Env, campaignId: string, studentId: string): Promise<Response> {
  try {
    // Get the result token from the URL or header
    const url = new URL(request.url);
    const token = url.pathname.split('/').pop() || '';
    
    // Get the result token from database
    const resultToken = await getResultTokenByToken(env.DB, token);
    if (!resultToken) {
      return createSuccessResponse(null); // No match yet
    }
    
    // Check if token belongs to the campaign and student
    if (resultToken.campaign_id !== campaignId || resultToken.student_id !== studentId) {
      return createErrorResponse('Invalid token', 403);
    }
    
    // Get matches for this student
    const matchMembers = await env.DB
      .prepare(`SELECT * FROM match_members WHERE student_id = ?`)
      .bind(studentId)
      .all<MatchMemberRow>();
    
    if (!matchMembers.results || matchMembers.results.length === 0) {
      return createSuccessResponse(null); // No match yet
    }
    
    // Get the match
    const matchId = matchMembers.results[0].match_id;
    const match = await env.DB
      .prepare(`SELECT * FROM matches WHERE id = ?`)
      .bind(matchId)
      .first<MatchRow>();
    
    if (!match) {
      return createSuccessResponse(null);
    }
    
    // Get all members of this match
    const allMembers = await env.DB
      .prepare(`SELECT * FROM match_members WHERE match_id = ?`)
      .bind(matchId)
      .all<MatchMemberRow>();
    
    // Get student details for each member
    const memberStudentIds = allMembers.results.map(m => m.student_id);
    const students = await env.DB
      .prepare(`SELECT * FROM students WHERE id IN (${memberStudentIds.map(() => '?').join(',')})`)
      .bind(...memberStudentIds)
      .all<StudentRow>();
    
    // Build the match response
    const matchResponse: any = {
      id: match.id,
      campaignId: match.campaign_id,
      matchingRoundId: match.matching_round_id,
      students: allMembers.results.map(member => {
        const student = students.results.find(s => s.id === member.student_id);
        return {
          studentId: member.student_id,
          student: student ? {
            id: student.id,
            campaignId: student.campaign_id,
            firstName: student.first_name,
            lastName: student.last_name,
            arrivalYear: student.arrival_year,
            hobbies: JSON.parse(student.hobbies),
            status: student.status,
            registeredAt: student.registered_at,
            consentGiven: student.consent_given === 1,
            consentTimestamp: student.consent_timestamp,
            privacyNoticeVersion: student.privacy_notice_version,
          } : null,
          nickname: member.nickname,
          role: member.role,
        };
      }),
      compatibilityScore: match.compatibility_score,
      createdAt: match.created_at,
      nicknameTheme: match.nickname_theme,
    };
    
    return createSuccessResponse(matchResponse);
  } catch (error) {
    console.error('Get student results error:', error);
    return createErrorResponse('Failed to get results', 500);
  }
}
