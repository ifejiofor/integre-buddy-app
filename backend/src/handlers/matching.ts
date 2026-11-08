/**
 * Matching Handlers
 */

import { Request, Response } from '@cloudflare/workers-types';
import { Env, MatchingConfiguration, ApiResponse, MatchingRoundRow, MatchRow, MatchMemberRow, StudentRow, CampaignRow } from '../types';
import { 
  getCampaignFromDB, 
  getPendingStudentsByCampaign,
  createMatchingRoundInDB,
  updateMatchingRoundStatus,
  createMatchInDB,
  createMatchMemberInDB,
  updateStudentsStatus,
  getCampaignStats
} from '../services/database';
import { createErrorResponse, createSuccessResponse, extractTokenFromHeader } from '../utils/security';
import { generateId } from '../utils/crypto';
import { getCurrentTimestamp } from '../utils/date';
import { 
  toMatchingStudent, 
  findOptimalMatching,
  createMatchingSnapshot,
  getSnapshotStudents,
  MatchingConfig
} from '../utils/matching';

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
    const body = await request.json<MatchingConfiguration>();
    
    // Validate configuration
    if (!body.oldToNewRatio || !body.newToNewGroupSize) {
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
    const body = await request.json<MatchingConfiguration>();
    
    // Get pending students
    const pendingStudents = await getPendingStudentsByCampaign(env.DB, campaignId);
    
    // Convert to matching students
    const matchingStudents = pendingStudents.map(toMatchingStudent);
    
    // Calculate preview
    const oldStudents = matchingStudents.filter(s => s.type === 'OLD');
    const newStudents = matchingStudents.filter(s => s.type === 'NEW');
    
    const { old: oldRatio, new: newRatio } = { old: 1, new: 1 }; // Default ratio
    const parsedRatio = body.oldToNewRatio ? body.oldToNewRatio.split(':') : ['1', '1'];
    
    const maxOldGroups = Math.floor(oldStudents.length / parseInt(parsedRatio[0], 10));
    const maxNewGroups = Math.floor(newStudents.length / parseInt(parsedRatio[1], 10));
    const maxGroups = Math.min(maxOldGroups, maxNewGroups);
    
    const studentsMatchedInOldNew = maxGroups * (parseInt(parsedRatio[0], 10) + parseInt(parsedRatio[1], 10));
    const remainingNew = newStudents.length - maxGroups * parseInt(parsedRatio[1], 10);
    const newNewGroups = Math.floor(remainingNew / body.newToNewGroupSize);
    const studentsMatchedInNewNew = newNewGroups * body.newToNewGroupSize;
    
    const totalMatched = studentsMatchedInOldNew + studentsMatchedInNewNew;
    const totalPending = matchingStudents.length - totalMatched;
    
    return createSuccessResponse({
      pendingOldStudents: oldStudents.length,
      pendingNewStudents: newStudents.length,
      selectedOldToNewRatio: body.oldToNewRatio,
      selectedNewToNewGroupSize: body.newToNewGroupSize,
      estimatedMatches: maxGroups + newNewGroups,
      estimatedPending: totalPending,
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
    const body = await request.json<MatchingConfiguration>();
    
    // Validate configuration
    if (!body.oldToNewRatio || !body.newToNewGroupSize) {
      return createErrorResponse('Invalid matching configuration', 400);
    }
    
    // Get pending students
    const pendingStudents = await getPendingStudentsByCampaign(env.DB, campaignId);
    
    if (pendingStudents.length < 2) {
      return createErrorResponse('At least 2 pending students are required to generate matches', 400);
    }
    
    // Start a transaction
    await env.DB.exec('BEGIN TRANSACTION');
    
    try {
      // Create matching round
      const now = getCurrentTimestamp();
      const roundId = generateId();
      
      const round: MatchingRoundRow = {
        id: roundId,
        campaign_id: campaignId,
        configured_at: now,
        completed_at: null,
        old_to_new_ratio: body.oldToNewRatio,
        new_to_new_group_size: body.newToNewGroupSize,
        total_matches: 0,
        total_students_matched: 0,
        total_students_pending: 0,
        status: 'PROCESSING',
      };
      
      await createMatchingRoundInDB(env.DB, round);
      
      // Create snapshot of current pending students
      const studentIds = pendingStudents.map(s => s.id);
      const snapshot = await createMatchingSnapshot(env.DB, campaignId, roundId, studentIds);
      
      // Get snapshot students (to ensure we're working with the same data)
      const snapshotStudents = await getSnapshotStudents(env.DB, snapshot);
      const matchingStudents = snapshotStudents.map(toMatchingStudent);
      
      // Run matching algorithm
      const config: MatchingConfig = {
        oldToNewRatio: body.oldToNewRatio,
        newToNewGroupSize: body.newToNewGroupSize,
      };
      
      const result = findOptimalMatching(matchingStudents, config);
      
      // Save matches
      for (const match of result.matches) {
        // Set campaign and round IDs
        match.campaign_id = campaignId;
        match.matching_round_id = roundId;
        
        await createMatchInDB(env.DB, match);
        
        // Save match members
        const matchMembers = result.matchMembers.filter(m => m.match_id === match.id);
        for (const member of matchMembers) {
          await createMatchMemberInDB(env.DB, member);
        }
      }
      
      // Update student statuses
      const matchedStudentIds = matchingStudents
        .filter(s => !result.pendingStudentIds.includes(s.id))
        .map(s => s.id);
      
      if (matchedStudentIds.length > 0) {
        await updateStudentsStatus(env.DB, matchedStudentIds, 'MATCHED');
      }
      
      // Update round statistics
      await updateMatchingRoundStatus(
        env.DB,
        roundId,
        'COMPLETED',
        now
      );
      
      // Update round with actual stats
      await env.DB.prepare(`
        UPDATE matching_rounds 
        SET total_matches = ?, total_students_matched = ?, total_students_pending = ?
        WHERE id = ?
      `).bind(
        result.stats.matchesCreated,
        result.stats.totalMatched,
        result.stats.totalPending,
        roundId
      ).run();
      
      // Commit transaction
      await env.DB.exec('COMMIT');
      
      // Return success
      return createSuccessResponse({
        matchingRoundId: roundId,
        matchesCreated: result.stats.matchesCreated,
        studentsMatched: result.stats.totalMatched,
        studentsPending: result.stats.totalPending,
      });
    } catch (error) {
      // Rollback on error
      await env.DB.exec('ROLLBACK');
      console.error('Generate matches error:', error);
      return createErrorResponse('Failed to generate matches', 500);
    }
  } catch (error) {
    console.error('Generate matches error:', error);
    return createErrorResponse('Failed to generate matches', 500);
  }
}
