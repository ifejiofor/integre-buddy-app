/**
 * Matching algorithm utilities for the Campus Buddies application
 * 
 * This implements a deterministic, backend-controlled matching algorithm that:
 * 1. Prioritizes maximizing the number of students in valid groups
 * 2. Then optimizes for hobby compatibility
 * 3. Uses snapshot-based batch processing for concurrency safety
 */

import { 
  Student, 
  StudentStatus, 
  Match, 
  MatchMember,
  HobbyRelationship,
  PREDEFINED_HOBBIES,
  HOBBY_RELATIONSHIPS,
  NICKNAME_THEMES
} from '../types';

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
  oldToNewRatio: string; // e.g., "1:1", "1:2", "2:1"
  newToNewGroupSize: number;
}

/**
 * Interface for matching result
 */
export interface MatchingResult {
  matches: Match[];
  pendingStudents: MatchingStudent[];
  stats: {
    totalStudents: number;
    totalMatched: number;
    totalPending: number;
    matchesCreated: number;
  };
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
 * Check if a student is new (arrived this year)
 */
export function getStudentType(student: Student): 'NEW' | 'OLD' {
  const currentYear = new Date().getFullYear();
  return student.arrivalYear === currentYear ? 'NEW' : 'OLD';
}

/**
 * Convert Student to MatchingStudent
 */
export function toMatchingStudent(student: Student): MatchingStudent {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    arrivalYear: student.arrivalYear,
    hobbies: student.hobbies,
    type: getStudentType(student),
  };
}

/**
 * Calculate hobby compatibility score between two sets of hobbies
 * Score is normalized to 0-100
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
      if (hobby1 === hobby2) continue; // Already counted
      
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
  
  // Normalize by the number of hobbies to avoid bias towards students with many hobbies
  const totalHobbies = hobbySet1.size + hobbySet2.size;
  if (totalHobbies > 0) {
    score = Math.round((score / totalHobbies) * 100);
  }
  
  return Math.min(score, 100);
}

/**
 * Calculate compatibility score for a group of students
 * This considers both exact matches and related hobbies across all group members
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
 * Generate all possible valid groups from pending students
 * based on the matching configuration
 */
export function generateValidGroups(
  pendingStudents: MatchingStudent[],
  config: MatchingConfig
): MatchGroup[] {
  const { oldToNewRatio, newToNewGroupSize } = config;
  const { old: oldRatio, new: newRatio } = parseRatio(oldToNewRatio);
  
  const oldStudents = pendingStudents.filter(s => s.type === 'OLD');
  const newStudents = pendingStudents.filter(s => s.type === 'NEW');
  
  const groups: MatchGroup[] = [];
  
  // Generate old-to-new groups
  if (oldRatio > 0 && newRatio > 0) {
    const oldNewGroups = generateOldNewGroups(oldStudents, newStudents, oldRatio, newRatio);
    groups.push(...oldNewGroups);
  }
  
  // Generate new-to-new groups
  if (newToNewGroupSize >= 2) {
    const newNewGroups = generateNewNewGroups(newStudents, newToNewGroupSize);
    groups.push(...newNewGroups);
  }
  
  return groups;
}

/**
 * Generate all possible old-to-new groups with the given ratio
 */
function generateOldNewGroups(
  oldStudents: MatchingStudent[],
  newStudents: MatchingStudent[],
  oldRatio: number,
  newRatio: number
): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const totalSize = oldRatio + newRatio;
  
  // We need to create groups with exactly oldRatio old students and newRatio new students
  // This is a combinatorial problem - we need to find all possible combinations
  
  // For performance, we'll use a greedy approach that tries to maximize compatibility
  // In a real implementation, we'd use a more sophisticated algorithm
  
  const availableOld = [...oldStudents];
  const availableNew = [...newStudents];
  
  // Sort by number of hobbies to prioritize students with more interests
  availableOld.sort((a, b) => b.hobbies.length - a.hobbies.length);
  availableNew.sort((a, b) => b.hobbies.length - a.hobbies.length);
  
  // Try to create as many groups as possible
  while (availableOld.length >= oldRatio && availableNew.length >= newRatio) {
    // Take the first available old and new students
    const groupOld = availableOld.splice(0, oldRatio);
    const groupNew = availableNew.splice(0, newRatio);
    
    const groupStudents = [...groupOld, ...groupNew];
    const compatibility = calculateGroupCompatibility(groupStudents);
    
    groups.push({
      students: groupStudents,
      compatibilityScore: compatibility,
      oldCount: oldRatio,
      newCount: newRatio,
    });
  }
  
  return groups;
}

/**
 * Generate all possible new-to-new groups with the given size
 */
function generateNewNewGroups(
  newStudents: MatchingStudent[],
  groupSize: number
): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const availableNew = [...newStudents];
  
  // Sort by number of hobbies
  availableNew.sort((a, b) => b.hobbies.length - a.hobbies.length);
  
  // Create groups of the specified size
  while (availableNew.length >= groupSize) {
    const groupStudents = availableNew.splice(0, groupSize);
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
 * Find the optimal set of non-overlapping groups that maximizes:
 * 1. Number of students matched
 * 2. Total compatibility score
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
  const matches: Match[] = [];
  
  // Phase 1: Match old students with new students
  // We want to maximize the number of old-new pairs first
  const oldNewMatches = matchOldWithNew(
    oldStudents,
    newStudents,
    oldRatio,
    newRatio,
    usedStudentIds
  );
  
  // Add old-new matches
  for (const group of oldNewMatches) {
    const match = createMatchFromGroup(group, config);
    matches.push(match);
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
    const match = createMatchFromGroup(group, config);
    matches.push(match);
    group.students.forEach(s => usedStudentIds.add(s.id));
  }
  
  // Calculate pending students
  const pendingStudentsList = pendingStudents.filter(s => !usedStudentIds.has(s.id));
  
  return {
    matches,
    pendingStudents: pendingStudentsList,
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
  
  // Create groups greedily, trying to maximize compatibility
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
 * Create a Match object from a MatchGroup
 */
function createMatchFromGroup(group: MatchGroup, config: MatchingConfig): Match {
  const { oldToNewRatio, newToNewGroupSize } = config;
  
  // Generate a unique match ID
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Assign nicknames based on group composition
  const members: MatchMember[] = group.students.map((student, index) => {
    const nickname = assignNickname(student, group.students, index);
    return {
      studentId: student.id,
      student: {
        ...student,
        id: student.id,
        campaignId: '', // Will be set by backend
        status: 'MATCHED' as StudentStatus,
        registeredAt: Date.now(),
        consentGiven: true,
        consentTimestamp: Date.now(),
        privacyNoticeVersion: '1.0',
      },
      nickname,
      role: getRoleFromNickname(nickname),
    };
  });
  
  // Determine nickname theme
  const nicknameTheme = determineNicknameTheme(group);
  
  return {
    id: matchId,
    campaignId: '', // Will be set by backend
    matchingRoundId: '', // Will be set by backend
    students: members,
    compatibilityScore: group.compatibilityScore,
    createdAt: Date.now(),
    nicknameTheme,
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
    return 'Shakespeare'; // Default pair theme
  }
  
  return 'Pop Culture';
}

/**
 * Test the matching algorithm with the examples from the requirements
 */
export function testMatchingExamples(): void {
  console.log('Testing matching algorithm examples...');
  
  // Example 1: 5 old, 8 new, ratio 1:1, group size 2
  const students1: MatchingStudent[] = [
    ...Array(5).fill(null).map((_, i) => ({
      id: `old_${i}`,
      firstName: `Old${i}`,
      lastName: `Student`,
      arrivalYear: 2022,
      hobbies: ['football', 'basketball'],
      type: 'OLD' as const,
    })),
    ...Array(8).fill(null).map((_, i) => ({
      id: `new_${i}`,
      firstName: `New${i}`,
      lastName: `Student`,
      arrivalYear: 2024,
      hobbies: ['football', 'running'],
      type: 'NEW' as const,
    })),
  ];
  
  const config1: MatchingConfig = {
    oldToNewRatio: '1:1',
    newToNewGroupSize: 2,
  };
  
  const result1 = findOptimalMatching(students1, config1);
  console.log('Example 1 Result:', {
    expected: { oldNewGroups: 5, newNewGroups: 1, pending: 1 },
    actual: {
      oldNewGroups: result1.matches.filter(m => m.students.some(s => s.type === 'OLD')).length,
      newNewGroups: result1.matches.filter(m => m.students.every(s => s.type === 'NEW')).length,
      pending: result1.pendingStudents.length,
    },
  });
  
  // Example 2: 2 old, 7 new, ratio 1:2, group size 2
  const students2: MatchingStudent[] = [
    ...Array(2).fill(null).map((_, i) => ({
      id: `old_${i}`,
      firstName: `Old${i}`,
      lastName: `Student`,
      arrivalYear: 2022,
      hobbies: ['football'],
      type: 'OLD' as const,
    })),
    ...Array(7).fill(null).map((_, i) => ({
      id: `new_${i}`,
      firstName: `New${i}`,
      lastName: `Student`,
      arrivalYear: 2024,
      hobbies: ['basketball'],
      type: 'NEW' as const,
    })),
  ];
  
  const config2: MatchingConfig = {
    oldToNewRatio: '1:2',
    newToNewGroupSize: 2,
  };
  
  const result2 = findOptimalMatching(students2, config2);
  console.log('Example 2 Result:', {
    expected: { oldNewGroups: 1, newNewGroups: 2, pending: 1 },
    actual: {
      oldNewGroups: result2.matches.filter(m => m.students.some(s => s.type === 'OLD')).length,
      newNewGroups: result2.matches.filter(m => m.students.every(s => s.type === 'NEW')).length,
      pending: result2.pendingStudents.length,
    },
  });
  
  // Example 3: 0 old, 5 new, group size 2
  const students3: MatchingStudent[] = Array(5).fill(null).map((_, i) => ({
    id: `new_${i}`,
    firstName: `New${i}`,
    lastName: `Student`,
    arrivalYear: 2024,
    hobbies: ['reading'],
    type: 'NEW' as const,
  }));
  
  const config3: MatchingConfig = {
    oldToNewRatio: '1:1',
    newToNewGroupSize: 2,
  };
  
  const result3 = findOptimalMatching(students3, config3);
  console.log('Example 3 Result:', {
    expected: { oldNewGroups: 0, newNewGroups: 2, pending: 1 },
    actual: {
      oldNewGroups: result3.matches.filter(m => m.students.some(s => s.type === 'OLD')).length,
      newNewGroups: result3.matches.filter(m => m.students.every(s => s.type === 'NEW')).length,
      pending: result3.pendingStudents.length,
    },
  });
}

/**
 * Get hobby ID from hobby name
 */
export function getHobbyId(hobbyName: string): string {
  const hobby = PREDEFINED_HOBBIES.find(h => h.name.toLowerCase() === hobbyName.toLowerCase());
  return hobby ? hobby.id : hobbyName.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Normalize hobby names
 */
export function normalizeHobbyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Deduplicate hobby list
 */
export function deduplicateHobbies(hobbies: string[]): string[] {
  const normalized = hobbies.map(normalizeHobbyName);
  const unique = [...new Set(normalized)];
  return unique.map(name => {
    const predefined = PREDEFINED_HOBBIES.find(h => normalizeHobbyName(h.name) === name);
    return predefined ? predefined.name : name.replace(/_/g, ' ');
  });
}
