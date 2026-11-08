/**
 * Database Service for Campus Buddies
 * 
 * This service provides all database operations using Cloudflare D1.
 */

import { D1Database, D1Result } from '@cloudflare/workers-types/experimental';
import {
  CampaignRow,
  StudentRow,
  MatchingRoundRow,
  MatchRow,
  MatchMemberRow,
  PushSubscriptionRow,
  AdminSessionRow,
  ResultTokenRow,
  MatchingSnapshotRow,
  CampaignStatus,
  StudentStatus,
  MatchingRoundStatus,
} from '../types';
import { getCurrentTimestamp } from '../utils/date';

/**
 * ==================== CAMPAIGN OPERATIONS ====================
 */

/**
 * Create a new campaign
 */
export async function createCampaignInDB(db: D1Database, campaign: CampaignRow): Promise<D1Result> {
  const query = `
    INSERT INTO campaigns (id, city, secret_hash, registration_url, qr_code_url, admin_url, display_url, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    campaign.id,
    campaign.city,
    campaign.secret_hash,
    campaign.registration_url,
    campaign.qr_code_url,
    campaign.admin_url,
    campaign.display_url,
    campaign.status,
    campaign.created_at,
    campaign.expires_at,
  ];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * Get a campaign by ID
 */
export async function getCampaignFromDB(db: D1Database, campaignId: string): Promise<CampaignRow | null> {
  const query = `
    SELECT * FROM campaigns WHERE id = ?
  `;
  
  const result = await db.prepare(query).bind(campaignId).first<CampaignRow>();
  return result || null;
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(
  db: D1Database,
  campaignId: string,
  status: CampaignStatus
): Promise<D1Result> {
  const query = `
    UPDATE campaigns SET status = ? WHERE id = ?
  `;
  
  return db.prepare(query).bind(status, campaignId).run();
}

/**
 * Delete a campaign and all related data
 */
export async function deleteCampaignAndRelatedData(db: D1Database, campaignId: string): Promise<void> {
  // Start a transaction
  await db.exec(`BEGIN TRANSACTION`);
  
  try {
    // Delete matching snapshots
    await db.prepare(`DELETE FROM matching_snapshots WHERE campaign_id = ?`).bind(campaignId).run();
    
    // Delete match members
    await db.prepare(`DELETE FROM match_members WHERE match_id IN (SELECT id FROM matches WHERE campaign_id = ?)`).bind(campaignId).run();
    
    // Delete matches
    await db.prepare(`DELETE FROM matches WHERE campaign_id = ?`).bind(campaignId).run();
    
    // Delete matching rounds
    await db.prepare(`DELETE FROM matching_rounds WHERE campaign_id = ?`).bind(campaignId).run();
    
    // Delete push subscriptions
    await db.prepare(`DELETE FROM push_subscriptions WHERE campaign_id = ?`).bind(campaignId).run();
    
    // Delete result tokens
    await db.prepare(`DELETE FROM result_tokens WHERE campaign_id = ?`).bind(campaignId).run();
    
    // Delete admin sessions
    await db.prepare(`DELETE FROM admin_sessions WHERE campaign_id = ?`).bind(campaignId).run();
    
    // Delete students
    await db.prepare(`DELETE FROM students WHERE campaign_id = ?`).bind(campaignId).run();
    
    // Delete the campaign
    await db.prepare(`DELETE FROM campaigns WHERE id = ?`).bind(campaignId).run();
    
    // Commit transaction
    await db.exec(`COMMIT`);
  } catch (error) {
    // Rollback on error
    await db.exec(`ROLLBACK`);
    throw error;
  }
}

/**
 * Get all expired campaigns
 */
export async function getExpiredCampaigns(db: D1Database): Promise<CampaignRow[]> {
  const now = getCurrentTimestamp();
  const query = `
    SELECT * FROM campaigns WHERE status = 'ACTIVE' AND expires_at < ?
  `;
  
  const result = await db.prepare(query).bind(now).all<CampaignRow>();
  return result.results || [];
}

/**
 * ==================== STUDENT OPERATIONS ====================
 */

/**
 * Create a new student
 */
export async function createStudentInDB(db: D1Database, student: StudentRow): Promise<D1Result> {
  const query = `
    INSERT INTO students (id, campaign_id, first_name, last_name, arrival_year, hobbies, status, registered_at, consent_given, consent_timestamp, privacy_notice_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    student.id,
    student.campaign_id,
    student.first_name,
    student.last_name,
    student.arrival_year,
    student.hobbies,
    student.status,
    student.registered_at,
    student.consent_given,
    student.consent_timestamp,
    student.privacy_notice_version,
  ];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * Get a student by ID
 */
export async function getStudentFromDB(db: D1Database, studentId: string): Promise<StudentRow | null> {
  const query = `
    SELECT * FROM students WHERE id = ?
  `;
  
  const result = await db.prepare(query).bind(studentId).first<StudentRow>();
  return result || null;
}

/**
 * Get students by campaign ID
 */
export async function getStudentsByCampaign(db: D1Database, campaignId: string): Promise<StudentRow[]> {
  const query = `
    SELECT * FROM students WHERE campaign_id = ? ORDER BY registered_at DESC
  `;
  
  const result = await db.prepare(query).bind(campaignId).all<StudentRow>();
  return result.results || [];
}

/**
 * Get pending students by campaign ID
 */
export async function getPendingStudentsByCampaign(db: D1Database, campaignId: string): Promise<StudentRow[]> {
  const query = `
    SELECT * FROM students WHERE campaign_id = ? AND status = 'PENDING' ORDER BY registered_at DESC
  `;
  
  const result = await db.prepare(query).bind(campaignId).all<StudentRow>();
  return result.results || [];
}

/**
 * Get matched students by campaign ID
 */
export async function getMatchedStudentsByCampaign(db: D1Database, campaignId: string): Promise<StudentRow[]> {
  const query = `
    SELECT * FROM students WHERE campaign_id = ? AND status = 'MATCHED' ORDER BY registered_at DESC
  `;
  
  const result = await db.prepare(query).bind(campaignId).all<StudentRow>();
  return result.results || [];
}

/**
 * Update student status
 */
export async function updateStudentStatus(
  db: D1Database,
  studentId: string,
  status: StudentStatus
): Promise<D1Result> {
  const query = `
    UPDATE students SET status = ? WHERE id = ?
  `;
  
  return db.prepare(query).bind(status, studentId).run();
}

/**
 * Update student status for multiple students
 */
export async function updateStudentsStatus(
  db: D1Database,
  studentIds: string[],
  status: StudentStatus
): Promise<D1Result> {
  const placeholders = studentIds.map(() => '?').join(',');
  const query = `
    UPDATE students SET status = ? WHERE id IN (${placeholders})
  `;
  
  const params = [status, ...studentIds];
  return db.prepare(query).bind(...params).run();
}

/**
 * Get students by IDs
 */
export async function getStudentsByIds(db: D1Database, studentIds: string[]): Promise<StudentRow[]> {
  const placeholders = studentIds.map(() => '?').join(',');
  const query = `
    SELECT * FROM students WHERE id IN (${placeholders})
  `;
  
  const result = await db.prepare(query).bind(...studentIds).all<StudentRow>();
  return result.results || [];
}

/**
 * ==================== MATCHING ROUND OPERATIONS ====================
 */

/**
 * Create a new matching round
 */
export async function createMatchingRoundInDB(db: D1Database, round: MatchingRoundRow): Promise<D1Result> {
  const query = `
    INSERT INTO matching_rounds (id, campaign_id, configured_at, completed_at, old_to_new_ratio, new_to_new_group_size, total_matches, total_students_matched, total_students_pending, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    round.id,
    round.campaign_id,
    round.configured_at,
    round.completed_at,
    round.old_to_new_ratio,
    round.new_to_new_group_size,
    round.total_matches,
    round.total_students_matched,
    round.total_students_pending,
    round.status,
  ];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * Get matching rounds by campaign ID
 */
export async function getMatchingRoundsByCampaign(db: D1Database, campaignId: string): Promise<MatchingRoundRow[]> {
  const query = `
    SELECT * FROM matching_rounds WHERE campaign_id = ? ORDER BY configured_at DESC
  `;
  
  const result = await db.prepare(query).bind(campaignId).all<MatchingRoundRow>();
  return result.results || [];
}

/**
 * Get the latest matching round by campaign ID
 */
export async function getLatestMatchingRound(db: D1Database, campaignId: string): Promise<MatchingRoundRow | null> {
  const query = `
    SELECT * FROM matching_rounds WHERE campaign_id = ? ORDER BY configured_at DESC LIMIT 1
  `;
  
  const result = await db.prepare(query).bind(campaignId).first<MatchingRoundRow>();
  return result || null;
}

/**
 * Update matching round status
 */
export async function updateMatchingRoundStatus(
  db: D1Database,
  roundId: string,
  status: MatchingRoundStatus,
  completedAt?: number
): Promise<D1Result> {
  const query = completedAt
    ? `UPDATE matching_rounds SET status = ?, completed_at = ? WHERE id = ?`
    : `UPDATE matching_rounds SET status = ? WHERE id = ?`;
  
  const params = completedAt
    ? [status, completedAt, roundId]
    : [status, roundId];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * ==================== MATCH OPERATIONS ====================
 */

/**
 * Create a new match
 */
export async function createMatchInDB(db: D1Database, match: MatchRow): Promise<D1Result> {
  const query = `
    INSERT INTO matches (id, campaign_id, matching_round_id, compatibility_score, nickname_theme, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    match.id,
    match.campaign_id,
    match.matching_round_id,
    match.compatibility_score,
    match.nickname_theme,
    match.created_at,
  ];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * Get matches by campaign ID
 */
export async function getMatchesByCampaign(db: D1Database, campaignId: string): Promise<MatchRow[]> {
  const query = `
    SELECT * FROM matches WHERE campaign_id = ? ORDER BY created_at DESC
  `;
  
  const result = await db.prepare(query).bind(campaignId).all<MatchRow>();
  return result.results || [];
}

/**
 * Get matches by matching round ID
 */
export async function getMatchesByRound(db: D1Database, roundId: string): Promise<MatchRow[]> {
  const query = `
    SELECT * FROM matches WHERE matching_round_id = ? ORDER BY created_at DESC
  `;
  
  const result = await db.prepare(query).bind(roundId).all<MatchRow>();
  return result.results || [];
}

/**
 * Get match by ID
 */
export async function getMatchFromDB(db: D1Database, matchId: string): Promise<MatchRow | null> {
  const query = `
    SELECT * FROM matches WHERE id = ?
  `;
  
  const result = await db.prepare(query).bind(matchId).first<MatchRow>();
  return result || null;
}

/**
 * ==================== MATCH MEMBER OPERATIONS ====================
 */

/**
 * Create a new match member
 */
export async function createMatchMemberInDB(db: D1Database, member: MatchMemberRow): Promise<D1Result> {
  const query = `
    INSERT INTO match_members (id, match_id, student_id, nickname, role)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  const params = [
    member.id,
    member.match_id,
    member.student_id,
    member.nickname,
    member.role,
  ];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * Get match members by match ID
 */
export async function getMatchMembersByMatch(db: D1Database, matchId: string): Promise<MatchMemberRow[]> {
  const query = `
    SELECT * FROM match_members WHERE match_id = ?
  `;
  
  const result = await db.prepare(query).bind(matchId).all<MatchMemberRow>();
  return result.results || [];
}

/**
 * Get match member by student ID
 */
export async function getMatchMemberByStudent(db: D1Database, studentId: string): Promise<MatchMemberRow | null> {
  const query = `
    SELECT * FROM match_members WHERE student_id = ?
  `;
  
  const result = await db.prepare(query).bind(studentId).first<MatchMemberRow>();
  return result || null;
}

/**
 * ==================== PUSH SUBSCRIPTION OPERATIONS ====================
 */

/**
 * Create a new push subscription
 */
export async function createPushSubscriptionInDB(db: D1Database, subscription: PushSubscriptionRow): Promise<D1Result> {
  const query = `
    INSERT INTO push_subscriptions (id, campaign_id, student_id, endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    subscription.id,
    subscription.campaign_id,
    subscription.student_id,
    subscription.endpoint,
    subscription.p256dh,
    subscription.auth,
    subscription.created_at,
  ];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * Get push subscription by ID
 */
export async function getPushSubscriptionFromDB(db: D1Database, subscriptionId: string): Promise<PushSubscriptionRow | null> {
  const query = `
    SELECT * FROM push_subscriptions WHERE id = ?
  `;
  
  const result = await db.prepare(query).bind(subscriptionId).first<PushSubscriptionRow>();
  return result || null;
}

/**
 * Get push subscriptions by campaign ID
 */
export async function getPushSubscriptionsByCampaign(db: D1Database, campaignId: string): Promise<PushSubscriptionRow[]> {
  const query = `
    SELECT * FROM push_subscriptions WHERE campaign_id = ?
  `;
  
  const result = await db.prepare(query).bind(campaignId).all<PushSubscriptionRow>();
  return result.results || [];
}

/**
 * Get push subscriptions by student ID
 */
export async function getPushSubscriptionsByStudent(db: D1Database, studentId: string): Promise<PushSubscriptionRow[]> {
  const query = `
    SELECT * FROM push_subscriptions WHERE student_id = ?
  `;
  
  const result = await db.prepare(query).bind(studentId).all<PushSubscriptionRow>();
  return result.results || [];
}

/**
 * Delete push subscription
 */
export async function deletePushSubscription(db: D1Database, subscriptionId: string): Promise<D1Result> {
  const query = `
    DELETE FROM push_subscriptions WHERE id = ?
  `;
  
  return db.prepare(query).bind(subscriptionId).run();
}

/**
 * ==================== ADMIN SESSION OPERATIONS ====================
 */

/**
 * Create a new admin session
 */
export async function createAdminSessionInDB(db: D1Database, session: AdminSessionRow): Promise<D1Result> {
  const query = `
    INSERT INTO admin_sessions (id, campaign_id, token, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  const params = [
    session.id,
    session.campaign_id,
    session.token,
    session.created_at,
    session.expires_at,
  ];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * Get admin session by token
 */
export async function getAdminSessionByToken(db: D1Database, token: string): Promise<AdminSessionRow | null> {
  const query = `
    SELECT * FROM admin_sessions WHERE token = ?
  `;
  
  const result = await db.prepare(query).bind(token).first<AdminSessionRow>();
  return result || null;
}

/**
 * Get admin session by campaign ID
 */
export async function getAdminSessionByCampaign(db: D1Database, campaignId: string): Promise<AdminSessionRow | null> {
  const query = `
    SELECT * FROM admin_sessions WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 1
  `;
  
  const result = await db.prepare(query).bind(campaignId).first<AdminSessionRow>();
  return result || null;
}

/**
 * Delete admin session
 */
export async function deleteAdminSession(db: D1Database, token: string): Promise<D1Result> {
  const query = `
    DELETE FROM admin_sessions WHERE token = ?
  `;
  
  return db.prepare(query).bind(token).run();
}

/**
 * Delete expired admin sessions
 */
export async function deleteExpiredAdminSessions(db: D1Database): Promise<D1Result> {
  const now = getCurrentTimestamp();
  const query = `
    DELETE FROM admin_sessions WHERE expires_at < ?
  `;
  
  return db.prepare(query).bind(now).run();
}

/**
 * ==================== RESULT TOKEN OPERATIONS ====================
 */

/**
 * Create a new result token
 */
export async function createResultTokenInDB(db: D1Database, token: ResultTokenRow): Promise<D1Result> {
  const query = `
    INSERT INTO result_tokens (id, campaign_id, student_id, token, created_at)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  const params = [
    token.id,
    token.campaign_id,
    token.student_id,
    token.token,
    token.created_at,
  ];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * Get result token by token value
 */
export async function getResultTokenByToken(db: D1Database, tokenValue: string): Promise<ResultTokenRow | null> {
  const query = `
    SELECT * FROM result_tokens WHERE token = ?
  `;
  
  const result = await db.prepare(query).bind(tokenValue).first<ResultTokenRow>();
  return result || null;
}

/**
 * Get result token by student ID
 */
export async function getResultTokenByStudent(db: D1Database, studentId: string): Promise<ResultTokenRow | null> {
  const query = `
    SELECT * FROM result_tokens WHERE student_id = ?
  `;
  
  const result = await db.prepare(query).bind(studentId).first<ResultTokenRow>();
  return result || null;
}

/**
 * ==================== MATCHING SNAPSHOT OPERATIONS ====================
 */

/**
 * Create a matching snapshot
 */
export async function createMatchingSnapshotInDB(db: D1Database, snapshot: MatchingSnapshotRow): Promise<D1Result> {
  const query = `
    INSERT INTO matching_snapshots (id, campaign_id, matching_round_id, student_ids, created_at)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  const params = [
    snapshot.id,
    snapshot.campaign_id,
    snapshot.matching_round_id,
    snapshot.student_ids,
    snapshot.created_at,
  ];
  
  return db.prepare(query).bind(...params).run();
}

/**
 * Get matching snapshot by ID
 */
export async function getMatchingSnapshotFromDB(db: D1Database, snapshotId: string): Promise<MatchingSnapshotRow | null> {
  const query = `
    SELECT * FROM matching_snapshots WHERE id = ?
  `;
  
  const result = await db.prepare(query).bind(snapshotId).first<MatchingSnapshotRow>();
  return result || null;
}

/**
 * Get matching snapshots by matching round ID
 */
export async function getMatchingSnapshotsByRound(db: D1Database, roundId: string): Promise<MatchingSnapshotRow[]> {
  const query = `
    SELECT * FROM matching_snapshots WHERE matching_round_id = ?
  `;
  
  const result = await db.prepare(query).bind(roundId).all<MatchingSnapshotRow>();
  return result.results || [];
}

/**
 * ==================== STATISTICS OPERATIONS ====================
 */

/**
 * Get campaign statistics
 */
export async function getCampaignStats(db: D1Database, campaignId: string): Promise<{
  totalRegistered: number;
  totalMatched: number;
  totalPending: number;
  totalRounds: number;
}> {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM students WHERE campaign_id = ?) as total_registered,
      (SELECT COUNT(*) FROM students WHERE campaign_id = ? AND status = 'MATCHED') as total_matched,
      (SELECT COUNT(*) FROM students WHERE campaign_id = ? AND status = 'PENDING') as total_pending,
      (SELECT COUNT(*) FROM matching_rounds WHERE campaign_id = ?) as total_rounds
  `;
  
  const result = await db.prepare(statsQuery)
    .bind(campaignId, campaignId, campaignId, campaignId)
    .first<{
      total_registered: number;
      total_matched: number;
      total_pending: number;
      total_rounds: number;
    }>();
  
  return {
    totalRegistered: result?.total_registered || 0,
    totalMatched: result?.total_matched || 0,
    totalPending: result?.total_pending || 0,
    totalRounds: result?.total_rounds || 0,
  };
}
