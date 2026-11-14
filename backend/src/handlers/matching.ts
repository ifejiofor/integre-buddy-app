/**
 * Matching Handlers
 */

import { Env, MatchingConfiguration, MatchingRoundRow, MatchingSnapshotRow, StudentRow } from '../types';
import {
  getCampaignFromDB,
  getPendingStudentsByCampaign,
  getResultTokenByStudent,
} from '../services/database';
import { createErrorResponse, createSuccessResponse, extractTokenFromHeader } from '../utils/security';
import { generateId } from '../utils/crypto';
import { getCurrentTimestamp } from '../utils/date';
import { 
  toMatchingStudent, 
  findOptimalMatching,
  MatchingConfig
} from '../utils/matching';
import { validateGroupSize, validateRatio } from '../utils/validation';
import { sendPushNotification } from './notifications';

async function readMatchingConfiguration(request: Request): Promise<MatchingConfiguration | null> {
  let body: unknown;
  try {
    body = await request.json<unknown>();
  } catch {
    return null;
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('oldToNewRatio' in body) ||
    !('newToNewGroupSize' in body) ||
    typeof body.oldToNewRatio !== 'string' ||
    typeof body.newToNewGroupSize !== 'number' ||
    !Number.isInteger(body.newToNewGroupSize)
  ) {
    return null;
  }

  if (!validateRatio(body.oldToNewRatio).valid || !validateGroupSize(body.newToNewGroupSize).valid) {
    return null;
  }

  return {
    oldToNewRatio: body.oldToNewRatio,
    newToNewGroupSize: body.newToNewGroupSize,
  };
}

/**
 * Configure matching (preview)
 */
export async function handleConfigureMatching(request: Request, env: Env, campaignId: string): Promise<Response> {
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
    
    // Parse request body
    const config = await readMatchingConfiguration(request);
    if (!config) {
      return createErrorResponse('Invalid matching configuration', 400);
    }
    
    // Save configuration (in a real implementation, we'd save this to the database)
    // For now, just return success
    
    return createSuccessResponse(null);
  } catch (error) {
    console.error('Configure matching error:', error);
    return createErrorResponse('Failed to configure matching', 500);
  }
}

/**
 * Preview matching
 */
export async function handlePreviewMatching(request: Request, env: Env, campaignId: string): Promise<Response> {
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
    
    // Parse request body
    const config = await readMatchingConfiguration(request);
    if (!config) {
      return createErrorResponse('Invalid matching configuration', 400);
    }
    
    // Get pending students
    const pendingStudents = await getPendingStudentsByCampaign(env.DB, campaignId);
    
    // Convert to matching students
    const matchingStudents = pendingStudents.map(toMatchingStudent);
    
    // Use the same matcher as generation so the estimate reflects its actual grouping.
    const oldStudents = matchingStudents.filter(s => s.type === 'OLD');
    const newStudents = matchingStudents.filter(s => s.type === 'NEW');
    const result = findOptimalMatching(matchingStudents, {
      oldToNewRatio: config.oldToNewRatio,
      newToNewGroupSize: config.newToNewGroupSize,
    });
    
    return createSuccessResponse({
      pendingOldStudents: oldStudents.length,
      pendingNewStudents: newStudents.length,
      selectedOldToNewRatio: config.oldToNewRatio,
      selectedNewToNewGroupSize: config.newToNewGroupSize,
      estimatedMatches: result.stats.matchesCreated,
      estimatedPending: result.stats.totalPending,
    });
  } catch (error) {
    console.error('Preview matching error:', error);
    return createErrorResponse('Failed to preview matching', 500);
  }
}

/**
 * Generate matches
 */
export async function handleGenerateMatches(request: Request, env: Env, campaignId: string): Promise<Response> {
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
    
    // Parse request body
    const body = await readMatchingConfiguration(request);
    if (!body) {
      return createErrorResponse('Invalid matching configuration', 400);
    }
    
    const pendingStudents = await getPendingStudentsByCampaign(env.DB, campaignId);
    if (pendingStudents.length < 2) {
      return createErrorResponse('At least 2 pending students are required to generate matches', 400);
    }

    const pendingIds = pendingStudents.map(student => student.id);
    const placeholders = pendingIds.map(() => '?').join(', ');
    const reservationResult = await env.DB.prepare(`
      UPDATE students
      SET status = 'MATCHING'
      WHERE campaign_id = ? AND status = 'PENDING' AND id IN (${placeholders})
      RETURNING *
    `).bind(campaignId, ...pendingIds).all<StudentRow>();
    const reservedIdsSet = new Set((reservationResult.results || []).map(student => student.id));
    const reservedStudents = pendingStudents.filter(student => reservedIdsSet.has(student.id));
    const reservedIds = reservedStudents.map(student => student.id);

    if (reservedStudents.length < 2) {
      if (reservedIds.length > 0) {
        await env.DB.prepare(`
          UPDATE students SET status = 'PENDING'
          WHERE campaign_id = ? AND status = 'MATCHING' AND id IN (${reservedIds.map(() => '?').join(', ')})
        `).bind(campaignId, ...reservedIds).run();
      }
      return createErrorResponse('Pending students changed while matching started. Please refresh and try again.', 409);
    }

    try {
      const now = getCurrentTimestamp();
      const roundId = generateId();
      const snapshot: MatchingSnapshotRow = {
        id: generateId(),
        campaign_id: campaignId,
        matching_round_id: roundId,
        student_ids: JSON.stringify(reservedIds),
        created_at: now,
      };
      const matchingStudents = reservedStudents.map(toMatchingStudent);
      const config: MatchingConfig = {
        oldToNewRatio: body.oldToNewRatio,
        newToNewGroupSize: body.newToNewGroupSize,
      };
      const result = findOptimalMatching(matchingStudents, config);
      const round: MatchingRoundRow = {
        id: roundId,
        campaign_id: campaignId,
        configured_at: now,
        completed_at: now,
        old_to_new_ratio: body.oldToNewRatio,
        new_to_new_group_size: body.newToNewGroupSize,
        total_matches: result.stats.matchesCreated,
        total_students_matched: result.stats.totalMatched,
        total_students_pending: result.stats.totalPending,
        status: 'COMPLETED',
      };

      const statements = [
        env.DB.prepare(`
          INSERT INTO matching_rounds
            (id, campaign_id, configured_at, completed_at, old_to_new_ratio, new_to_new_group_size, total_matches, total_students_matched, total_students_pending, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          round.id,
          round.campaign_id,
          round.configured_at,
          round.completed_at,
          round.old_to_new_ratio,
          round.new_to_new_group_size,
          round.total_matches,
          round.total_students_matched,
          round.total_students_pending,
          round.status
        ),
        env.DB.prepare(`
          INSERT INTO matching_snapshots (id, campaign_id, matching_round_id, student_ids, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          snapshot.id,
          snapshot.campaign_id,
          snapshot.matching_round_id,
          snapshot.student_ids,
          snapshot.created_at
        ),
      ];

      for (let offset = 0; offset < result.matches.length; offset += 100) {
        const matchChunk = result.matches.slice(offset, offset + 100);
        for (const match of matchChunk) {
          match.campaign_id = campaignId;
          match.matching_round_id = roundId;
        }

        const values = matchChunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        statements.push(env.DB.prepare(`
          INSERT INTO matches (id, campaign_id, matching_round_id, compatibility_score, nickname_theme, created_at)
          VALUES ${values}
        `).bind(...matchChunk.flatMap(match => [
          match.id,
          match.campaign_id,
          match.matching_round_id,
          match.compatibility_score,
          match.nickname_theme,
          match.created_at,
        ])));
      }

      for (let offset = 0; offset < result.matchMembers.length; offset += 100) {
        const memberChunk = result.matchMembers.slice(offset, offset + 100);
        const values = memberChunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
        statements.push(env.DB.prepare(`
          INSERT INTO match_members (id, match_id, student_id, nickname, role)
          VALUES ${values}
        `).bind(...memberChunk.flatMap(member => [
          member.id,
          member.match_id,
          member.student_id,
          member.nickname,
          member.role,
        ])));
      }

      const matchedStudentIds = reservedIds.filter(id => !result.pendingStudentIds.includes(id));
      const unmatchedStudentIds = reservedIds.filter(id => result.pendingStudentIds.includes(id));
      for (const [ids, status] of [
        [matchedStudentIds, 'MATCHED'],
        [unmatchedStudentIds, 'PENDING'],
      ] as const) {
        for (let offset = 0; offset < ids.length; offset += 400) {
          const idChunk = ids.slice(offset, offset + 400);
          statements.push(env.DB.prepare(`
            UPDATE students SET status = ?
            WHERE campaign_id = ? AND status = 'MATCHING' AND id IN (${idChunk.map(() => '?').join(', ')})
          `).bind(status, campaignId, ...idChunk));
        }
      }

      await env.DB.batch(statements);

      for (const studentId of matchedStudentIds) {
        try {
          const resultToken = await getResultTokenByStudent(env.DB, studentId);
          if (!resultToken) {
            console.error('Cannot notify matched student: result token is missing');
            continue;
          }
          const resultUrl = new URL(
            `/campaigns/${campaignId}/results/${encodeURIComponent(resultToken.token)}`,
            campaign.registration_url
          ).toString();
          await sendPushNotification(
            env,
            campaignId,
            studentId,
            'Your Campus Buddy is ready!',
            "Tap here to discover who you've been matched with.",
            resultUrl
          );
        } catch (error) {
          console.error('Could not prepare matched-student notification:', error);
        }
      }

      // Return success
      return createSuccessResponse({
        matchingRoundId: roundId,
        matchesCreated: result.stats.matchesCreated,
        studentsMatched: result.stats.totalMatched,
        studentsPending: result.stats.totalPending,
      });
    } catch (error) {
      await env.DB.prepare(`
        UPDATE students SET status = 'PENDING'
        WHERE campaign_id = ? AND status = 'MATCHING' AND id IN (${reservedIds.map(() => '?').join(', ')})
      `).bind(campaignId, ...reservedIds).run();
      console.error('Generate matches error:', error);
      return createErrorResponse('Failed to generate matches', 500);
    }
  } catch (error) {
    console.error('Generate matches error:', error);
    return createErrorResponse('Failed to generate matches', 500);
  }
}
