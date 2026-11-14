/**
 * Public Display Handlers
 */

import { Env, ApiResponse, CampaignRow, MatchRow, MatchMemberRow, StudentRow } from '../types';
import { getCampaignFromDB, getMatchesByCampaign } from '../services/database';
import { createErrorResponse, createSuccessResponse } from '../utils/security';

/**
 * Interface for public match display
 */
interface PublicMatchDisplay {
  matchId: string;
  students: {
    firstName: string;
    lastName: string;
    nickname: string;
    arrivalYear: number;
    hobbies: string[];
  }[];
  compatibilityScore: number;
  nicknameTheme: string;
  matchedAt: number;
}

/**
 * Get public display data
 */
export async function handleGetPublicDisplay(request: Request, env: Env, campaignId: string): Promise<Response> {
  try {
    // Get campaign
    const campaign = await getCampaignFromDB(env.DB, campaignId);
    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }
    
    // Check if campaign is expired
    if (campaign.status === 'EXPIRED') {
      return createErrorResponse('Campaign has expired', 403);
    }
    
    // Get all matches for this campaign
    const matches = await getMatchesByCampaign(env.DB, campaignId);
    
    // Build public display data
    const publicMatches: PublicMatchDisplay[] = [];
    
    for (const match of matches) {
      // Get match members
      const members = await env.DB
        .prepare(`SELECT * FROM match_members WHERE match_id = ?`)
        .bind(match.id)
        .all<MatchMemberRow>();
      
      if (!members.results || members.results.length === 0) {
        continue;
      }
      
      // Get student details for each member
      const studentIds = members.results.map(m => m.student_id);
      const students = await env.DB
        .prepare(`SELECT * FROM students WHERE id IN (${studentIds.map(() => '?').join(',')})`)
        .bind(...studentIds)
        .all<StudentRow>();
      
      // Build the public match display
      const publicMatch: PublicMatchDisplay = {
        matchId: match.id,
        students: members.results.map(member => {
          const student = students.results.find(s => s.id === member.student_id);
          return {
            firstName: student?.first_name || '',
            lastName: student?.last_name || '',
            nickname: member.nickname,
            arrivalYear: student?.arrival_year || 0,
            hobbies: student ? JSON.parse(student.hobbies) : [],
          };
        }),
        compatibilityScore: match.compatibility_score,
        nicknameTheme: match.nickname_theme,
        matchedAt: match.created_at,
      };
      
      publicMatches.push(publicMatch);
    }
    
    // Sort by matchedAt (newest first)
    publicMatches.sort((a, b) => b.matchedAt - a.matchedAt);
    
    return createSuccessResponse(publicMatches);
  } catch (error) {
    console.error('Get public display error:', error);
    return createErrorResponse('Failed to get public display', 500);
  }
}
