/**
 * Matching Algorithm Utilities
 */

import { StudentRow, MatchRow, MatchMemberRow, MatchingRoundRow, MatchingSnapshotRow } from '../types';
import { HOBBY_RELATIONSHIPS, NICKNAME_THEMES, PREDEFINED_HOBBIES } from '../types';
import { getCurrentTimestamp } from './date';
import { generateId, createHash } from './crypto';

/**
 * Interface for a student in the matching pool
 */
export interface MatchingStudent {
  id: string;
  firstName: string;
  lastName: string;
  arrivalYear: number;
  hobbies: string[];
  type: 'NEW' | 'OLD';
}

/**
 * Interface for a potential match group
 */
export interface MatchGroup {
  students: MatchingStudent[];
  compatibilityScore: number;
  oldCount: number;
  newCount: number;
}

/**
 * Interface for matching configuration
 */
export interface MatchingConfig {
  oldToNewRatio: string;
  newToNewGroupSize: number;
}

/**
 * Interface for matching result
 */
export interface MatchingResult {
  matches: MatchRow[];
  matchMembers: MatchMemberRow[];
  pendingStudentIds: string[];
  stats: {
    totalStudents: number;
    totalMatched: number;
    totalPending: number;
    matchesCreated: number;
  };
}

/**
 * Convert StudentRow to MatchingStudent
 */
export function toMatchingStudent(student: StudentRow): MatchingStudent {
  return {
    id: student.id,
    firstName: student.first_name,
    lastName: student.last_name,
    arrivalYear: student.arrival_year,
    hobbies: JSON.parse(student.hobbies),
    type: getStudentType(student),
  };
}

/**
 * Get student type (NEW or OLD)
 */
export function getStudentType(student: StudentRow): 'NEW' | 'OLD' {
  const currentYear = new Date().getFullYear();
  return student.arrival_year === currentYear ? 'NEW' : 'OLD';
}

/**
 * Parse ratio string into old and new counts
 */
export function parseRatio(ratio: string): { old: number; new: number } {
  const [oldStr, newStr] = ratio.split(':');
  return {
    old: parseInt(oldStr, 10),
    new: parseInt(newStr, 10),
  };
}

/**
 * Calculate hobby compatibility score between two sets of hobbies
 */
export function calculateHobbyCompatibility(hobbies1: string[], hobbies2: string[]): number {
  let score = 0;
  const hobbySet1 = new Set(hobbies1);
  const hobbySet2 = new Set(hobbies2);
  
  // Exact matches (score 100 each)
  const exactMatches = [...hobbySet1].filter(h => hobbySet2.has(h));
  score += exactMatches.length * 100;
  
  // Related hobbies
  for (const hobby1 of hobbySet1) {
    for (const hobby2 of hobbySet2) {
      if (hobby1 === hobby2) continue;
      
      // Check predefined relationships
      const relationship = HOBBY_RELATIONSHIPS.find(
        r => (r.hobby1 === hobby1 && r.hobby2 === hobby2) || 
             (r.hobby1 === hobby2 && r.hobby2 === hobby1)
      );
      
      if (relationship) {
        score += relationship.score;
      }
    }
  }
  
  // Normalize by the number of hobbies
  const totalHobbies = hobbySet1.size + hobbySet2.size;
  if (totalHobbies > 0) {
    score = Math.round((score / totalHobbies) * 100);
  }
  
  return Math.min(score, 100);
}

/**
 * Calculate compatibility score for a group of students
 */
export function calculateGroupCompatibility(students: MatchingStudent[]): number {
  if (students.length <= 1) return 0;
  
  let totalScore = 0;
  let pairCount = 0;
  
  // Calculate pairwise compatibility
  for (let i = 0; i < students.length; i++) {
    for (let j = i + 1; j < students.length; j++) {
      const compatibility = calculateHobbyCompatibility(
        students[i].hobbies,
        students[j].hobbies
      );
      totalScore += compatibility;
      pairCount++;
    }
  }
  
  if (pairCount === 0) return 0;
  
  // Average pairwise compatibility
  const averageScore = totalScore / pairCount;
  
  // Add bonus for shared hobbies across the group
  const allHobbies = students.flatMap(s => s.hobbies);
  const hobbyCounts = new Map<string, number>();
  for (const hobby of allHobbies) {
    hobbyCounts.set(hobby, (hobbyCounts.get(hobby) || 0) + 1);
  }
  
  // Count hobbies shared by at least 2 students
  const sharedHobbies = [...hobbyCounts.entries()].filter(([_, count]) => count >= 2);
  const sharedBonus = Math.min(sharedHobbies.length * 5, 20); // Max 20 bonus points
  
  return Math.min(Math.round(averageScore + sharedBonus), 100);
}

/**
 * Find the optimal matching for pending students
 */
export function findOptimalMatching(
  pendingStudents: MatchingStudent[],
  config: MatchingConfig
): MatchingResult {
  const { oldToNewRatio, newToNewGroupSize } = config;
  const { old: oldRatio, new: newRatio } = parseRatio(oldToNewRatio);
  
  const oldStudents = pendingStudents.filter(s => s.type === 'OLD');
  const newStudents = pendingStudents.filter(s => s.type === 'NEW');
  
  const usedStudentIds = new Set<string>();
  const matches: MatchRow[] = [];
  const matchMembers: MatchMemberRow[] = [];
  
  // Phase 1: Match old students with new students
  const oldNewMatches = matchOldWithNew(
    oldStudents,
    newStudents,
    oldRatio,
    newRatio,
    usedStudentIds
  );
  
  // Add old-new matches
  for (const group of oldNewMatches) {
    const matchResult = createMatchFromGroup(group, config);
    matches.push(matchResult.match);
    matchMembers.push(...matchResult.members);
    group.students.forEach(s => usedStudentIds.add(s.id));
  }
  
  // Phase 2: Match remaining new students
  const remainingNew = newStudents.filter(s => !usedStudentIds.has(s.id));
  const newNewMatches = matchNewWithNew(
    remainingNew,
    newToNewGroupSize,
    usedStudentIds
  );
  
  // Add new-new matches
  for (const group of newNewMatches) {
    const matchResult = createMatchFromGroup(group, config);
    matches.push(matchResult.match);
    matchMembers.push(...matchResult.members);
    group.students.forEach(s => usedStudentIds.add(s.id));
  }
  
  // Calculate pending students
  const pendingStudentsList = pendingStudents.filter(s => !usedStudentIds.has(s.id));
  
  return {
    matches,
    matchMembers,
    pendingStudentIds: pendingStudentsList.map(s => s.id),
    stats: {
      totalStudents: pendingStudents.length,
      totalMatched: pendingStudents.length - pendingStudentsList.length,
      totalPending: pendingStudentsList.length,
      matchesCreated: matches.length,
    },
  };
}

/**
 * Match old students with new students using the specified ratio
 */
function matchOldWithNew(
  oldStudents: MatchingStudent[],
  newStudents: MatchingStudent[],
  oldRatio: number,
  newRatio: number,
  usedStudentIds: Set<string>
): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const availableOld = oldStudents.filter(s => !usedStudentIds.has(s.id));
  const availableNew = newStudents.filter(s => !usedStudentIds.has(s.id));
  
  // Calculate how many complete groups we can make
  const maxOldGroups = Math.floor(availableOld.length / oldRatio);
  const maxNewGroups = Math.floor(availableNew.length / newRatio);
  const maxGroups = Math.min(maxOldGroups, maxNewGroups);
  
  // Sort students by number of hobbies (descending) to prioritize compatibility
  const sortedOld = [...availableOld].sort((a, b) => b.hobbies.length - a.hobbies.length);
  const sortedNew = [...availableNew].sort((a, b) => b.hobbies.length - a.hobbies.length);
  
  // Create groups greedily
  for (let i = 0; i < maxGroups; i++) {
    const groupOld = sortedOld.slice(i * oldRatio, (i + 1) * oldRatio);
    const groupNew = sortedNew.slice(i * newRatio, (i + 1) * newRatio);
    
    if (groupOld.length === oldRatio && groupNew.length === newRatio) {
      const groupStudents = [...groupOld, ...groupNew];
      const compatibility = calculateGroupCompatibility(groupStudents);
      
      groups.push({
        students: groupStudents,
        compatibilityScore: compatibility,
        oldCount: oldRatio,
        newCount: newRatio,
      });
    }
  }
  
  return groups;
}

/**
 * Match new students with each other using the specified group size
 */
function matchNewWithNew(
  newStudents: MatchingStudent[],
  groupSize: number,
  usedStudentIds: Set<string>
): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const availableNew = newStudents.filter(s => !usedStudentIds.has(s.id));
  
  // Sort by number of hobbies
  const sortedNew = [...availableNew].sort((a, b) => b.hobbies.length - a.hobbies.length);
  
  // Create groups
  for (let i = 0; i + groupSize <= sortedNew.length; i += groupSize) {
    const groupStudents = sortedNew.slice(i, i + groupSize);
    const compatibility = calculateGroupCompatibility(groupStudents);
    
    groups.push({
      students: groupStudents,
      compatibilityScore: compatibility,
      oldCount: 0,
      newCount: groupSize,
    });
  }
  
  return groups;
}

/**
 * Create a MatchRow and MatchMemberRows from a MatchGroup
 */
function createMatchFromGroup(group: MatchGroup, config: MatchingConfig): { match: MatchRow; members: MatchMemberRow[] } {
  const now = getCurrentTimestamp();
  const matchId = generateId();
  
  // Determine nickname theme
  const nicknameTheme = determineNicknameTheme(group);
  
  // Assign nicknames
  const members: MatchMemberRow[] = group.students.map((student, index) => {
    const nickname = assignNickname(student, group.students, index);
    return {
      id: generateId(),
      match_id: matchId,
      student_id: student.id,
      nickname,
      role: getRoleFromNickname(nickname),
    };
  });
  
  return {
    match: {
      id: matchId,
      campaign_id: '', // Will be set by caller
      matching_round_id: '', // Will be set by caller
      compatibility_score: group.compatibilityScore,
      nickname_theme: nicknameTheme,
      created_at: now,
    },
    members,
  };
}

/**
 * Assign a nickname to a student based on the group
 */
function assignNickname(
  student: MatchingStudent,
  group: MatchingStudent[],
  index: number
): string {
  const groupSize = group.length;
  
  // For pairs, use predefined pairs
  if (groupSize === 2) {
    const themesWithPairs = NICKNAME_THEMES.filter(t => t.pairs.length > 0);
    const theme = themesWithPairs[Math.floor(Math.random() * themesWithPairs.length)];
    const pair = theme.pairs[Math.floor(Math.random() * theme.pairs.length)];
    return index === 0 ? pair.name1 : pair.name2;
  }
  
  // For larger groups, use group nicknames
  const themesWithGroups = NICKNAME_THEMES.filter(
    t => t.groups.some(g => g.minSize <= groupSize && g.maxSize >= groupSize)
  );
  
  if (themesWithGroups.length > 0) {
    const theme = themesWithGroups[Math.floor(Math.random() * themesWithGroups.length)];
    const groupDef = theme.groups.find(g => g.minSize <= groupSize && g.maxSize >= groupSize);
    
    if (groupDef) {
      // Assign unique nicknames from the group
      const shuffledNames = [...groupDef.names].sort(() => Math.random() - 0.5);
      return shuffledNames[index % shuffledNames.length];
    }
  }
  
  // Fallback: use generic nicknames
  const genericNicknames = [
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
    'Star', 'Moon', 'Sun', 'Comet', 'Nebula', 'Galaxy',
    'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange',
  ];
  
  return genericNicknames[index % genericNicknames.length];
}

/**
 * Extract role from nickname
 */
function getRoleFromNickname(nickname: string): string {
  return nickname.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Determine the nickname theme for a group
 */
function determineNicknameTheme(group: MatchGroup): string {
  const groupSize = group.students.length;
  
  // Check if any theme has a matching group definition
  for (const theme of NICKNAME_THEMES) {
    for (const groupDef of theme.groups) {
      if (groupDef.minSize <= groupSize && groupDef.maxSize >= groupSize) {
        return theme.name;
      }
    }
  }
  
  // For pairs, use pair themes
  if (groupSize === 2) {
    return 'Shakespeare';
  }
  
  return 'Pop Culture';
}

/**
 * Deduplicate hobby list
 */
export function deduplicateHobbies(hobbies: string[]): string[] {
  const normalized = hobbies.map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const unique = [...new Set(normalized)];
  return unique.map(name => {
    const predefined = PREDEFINED_HOBBIES.find(h => h.toLowerCase().replace(/\s+/g, '_') === name);
    return predefined || name.replace(/_/g, ' ');
  });
}

/**
 * Create a matching snapshot
 */
export async function createMatchingSnapshot(
  db: D1Database,
  campaignId: string,
  matchingRoundId: string,
  studentIds: string[]
): Promise<MatchingSnapshotRow> {
  const snapshotId = generateId();
  const now = getCurrentTimestamp();
  
  const snapshot: MatchingSnapshotRow = {
    id: snapshotId,
    campaign_id: campaignId,
    matching_round_id: matchingRoundId,
    student_ids: JSON.stringify(studentIds),
    created_at: now,
  };
  
  await db.prepare(`
    INSERT INTO matching_snapshots (id, campaign_id, matching_round_id, student_ids, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    snapshot.id,
    snapshot.campaign_id,
    snapshot.matching_round_id,
    snapshot.student_ids,
    snapshot.created_at
  ).run();
  
  return snapshot;
}

/**
 * Get students for a matching snapshot
 */
export async function getSnapshotStudents(
  db: D1Database,
  snapshot: MatchingSnapshotRow
): Promise<StudentRow[]> {
  const studentIds = JSON.parse(snapshot.student_ids);
  
  const placeholders = studentIds.map(() => '?').join(',');
  const query = `SELECT * FROM students WHERE id IN (${placeholders})`;
  
  const result = await db.prepare(query).bind(...studentIds).all<StudentRow>();
  return result.results || [];
}
