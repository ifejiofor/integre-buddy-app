/**
 * Backend Types for Campus Buddies
 */

import type { D1Database } from '@cloudflare/workers-types';

// Environment type
export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  DEBUG: string;
}

// Campaign Types
export interface Campaign {
  id: string;
  city: string;
  secretHash: string;
  registrationUrl: string;
  qrCodeUrl: string;
  adminUrl: string;
  displayUrl: string;
  status: CampaignStatus;
  createdAt: number;
  expiresAt: number;
}

export type CampaignStatus = 'ACTIVE' | 'EXPIRED' | 'COMPLETED';

// Student Types
export interface Student {
  id: string;
  campaignId: string;
  firstName: string;
  lastName: string;
  arrivalYear: number;
  hobbies: string[];
  status: StudentStatus;
  registeredAt: number;
  consentGiven: boolean;
  consentTimestamp: number;
  privacyNoticeVersion: string;
}

export type StudentStatus = 'PENDING' | 'MATCHING' | 'MATCHED' | 'EXPIRED';

// Matching Types
export interface MatchingRound {
  id: string;
  campaign_id: string;
  configured_at: number;
  completed_at: number;
  old_to_new_ratio: string;
  new_to_new_group_size: number;
  total_matches: number;
  total_students_matched: number;
  total_students_pending: number;
  status: MatchingRoundStatus;
}

export type MatchingRoundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Match {
  id: string;
  campaign_id: string;
  matching_round_id: string;
  compatibility_score: number;
  nickname_theme: string;
  created_at: number;
}

export interface MatchMember {
  id: string;
  match_id: string;
  student_id: string;
  nickname: string;
  role: string;
}

// Push Notification Types
export interface PushSubscription {
  id: string;
  campaign_id: string;
  student_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: number;
}

// Session Types
export interface AdminSession {
  id: string;
  campaign_id: string;
  token: string;
  created_at: number;
  expires_at: number;
}

// API Request Types
export interface CampaignCreationRequest {
  city: string;
  secretCode: string;
  secretCodeConfirmation: string;
}

export interface AdminLoginRequest {
  campaignId: string;
  secretCode: string;
}

export interface StudentRegistrationRequest {
  campaignId: string;
  firstName: string;
  lastName: string;
  arrivalYear: number;
  hobbies: string[];
  consentGiven: boolean;
  privacyNoticeVersion: string;
  pushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

export interface MatchingConfiguration {
  oldToNewRatio: string;
  newToNewGroupSize: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CampaignCreationResponse {
  campaign: Campaign;
  qrCodeDataUrl: string;
}

export interface AdminLoginResponse {
  sessionToken: string;
  campaign: Campaign;
}

export interface StudentRegistrationResponse {
  student: Student;
  resultUrlToken: string;
}

export interface DashboardStats {
  totalRegistered: number;
  totalMatched: number;
  totalPending: number;
  totalRounds: number;
  campaign: Campaign;
}

// Database Row Types (matching the actual database schema)
export interface CampaignRow {
  id: string;
  city: string;
  secret_hash: string;
  registration_url: string;
  qr_code_url: string;
  admin_url: string;
  display_url: string;
  status: CampaignStatus;
  created_at: number;
  expires_at: number;
}

export interface StudentRow {
  id: string;
  campaign_id: string;
  first_name: string;
  last_name: string;
  arrival_year: number;
  hobbies: string; // JSON string
  status: StudentStatus;
  registered_at: number;
  consent_given: number; // 0 or 1
  consent_timestamp: number;
  privacy_notice_version: string;
}

export interface MatchingRoundRow {
  id: string;
  campaign_id: string;
  configured_at: number;
  completed_at: number | null;
  old_to_new_ratio: string;
  new_to_new_group_size: number;
  total_matches: number;
  total_students_matched: number;
  total_students_pending: number;
  status: MatchingRoundStatus;
}

export interface MatchRow {
  id: string;
  campaign_id: string;
  matching_round_id: string;
  compatibility_score: number;
  nickname_theme: string;
  created_at: number;
}

export interface MatchMemberRow {
  id: string;
  match_id: string;
  student_id: string;
  nickname: string;
  role: string;
}

export interface PushSubscriptionRow {
  id: string;
  campaign_id: string;
  student_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: number;
}

export interface AdminSessionRow {
  id: string;
  campaign_id: string;
  token: string;
  created_at: number;
  expires_at: number;
}

// Result Token Types
export interface ResultTokenRow {
  id: string;
  campaign_id: string;
  student_id: string;
  token: string;
  created_at: number;
}

// Matching Snapshot Types
export interface MatchingSnapshotRow {
  id: string;
  campaign_id: string;
  matching_round_id: string;
  student_ids: string; // JSON array string
  created_at: number;
}

// Constants
export const CAMPAIGN_DURATION_HOURS = 24;
export const SESSION_DURATION_HOURS = 8;
export const PRIVACY_NOTICE_VERSION = '1.0';
export const TIME_CONSTANTS = {
  CAMPAIGN_DURATION_HOURS: 24,
  SESSION_DURATION_HOURS: 8,
  POLLING_INTERVAL_MS: 5000,
  NOTIFICATION_TTL_HOURS: 24,
};

// Hobby Constants
export const PREDEFINED_HOBBIES = [
  'Football', 'Basketball', 'Volleyball', 'Tennis', 'Running',
  'Gym and fitness', 'Hiking', 'Camping', 'Travelling', 'Photography',
  'Music', 'Singing', 'Dancing', 'Movies', 'Reading', 'Gaming',
  'Cooking', 'Technology', 'Programming', 'Art and drawing',
  'Fashion', 'Volunteering', 'Board games', 'Outdoor activities',
];

// Hobby Relationships
export interface HobbyRelationship {
  hobby1: string;
  hobby2: string;
  score: number;
}

export const HOBBY_RELATIONSHIPS: HobbyRelationship[] = [
  // Sports relationships
  { hobby1: 'Football', hobby2: 'Basketball', score: 90 },
  { hobby1: 'Football', hobby2: 'Volleyball', score: 85 },
  { hobby1: 'Football', hobby2: 'Tennis', score: 60 },
  { hobby1: 'Football', hobby2: 'Running', score: 75 },
  { hobby1: 'Football', hobby2: 'Gym and fitness', score: 70 },
  { hobby1: 'Basketball', hobby2: 'Volleyball', score: 80 },
  { hobby1: 'Basketball', hobby2: 'Tennis', score: 70 },
  { hobby1: 'Basketball', hobby2: 'Running', score: 75 },
  { hobby1: 'Basketball', hobby2: 'Gym and fitness', score: 80 },
  { hobby1: 'Volleyball', hobby2: 'Tennis', score: 65 },
  { hobby1: 'Volleyball', hobby2: 'Running', score: 70 },
  { hobby1: 'Tennis', hobby2: 'Running', score: 65 },
  { hobby1: 'Running', hobby2: 'Gym and fitness', score: 85 },
  { hobby1: 'Gym and fitness', hobby2: 'Hiking', score: 60 },
  
  // Outdoor relationships
  { hobby1: 'Hiking', hobby2: 'Camping', score: 95 },
  { hobby1: 'Hiking', hobby2: 'Travelling', score: 80 },
  { hobby1: 'Hiking', hobby2: 'Outdoor activities', score: 90 },
  { hobby1: 'Camping', hobby2: 'Travelling', score: 75 },
  { hobby1: 'Camping', hobby2: 'Outdoor activities', score: 85 },
  { hobby1: 'Travelling', hobby2: 'Outdoor activities', score: 80 },
  { hobby1: 'Travelling', hobby2: 'Cooking', score: 55 },
  
  // Creative relationships
  { hobby1: 'Photography', hobby2: 'Art and drawing', score: 85 },
  { hobby1: 'Music', hobby2: 'Singing', score: 95 },
  { hobby1: 'Music', hobby2: 'Dancing', score: 75 },
  { hobby1: 'Music', hobby2: 'Movies', score: 65 },
  { hobby1: 'Singing', hobby2: 'Dancing', score: 80 },
  { hobby1: 'Singing', hobby2: 'Movies', score: 60 },
  { hobby1: 'Dancing', hobby2: 'Movies', score: 60 },
  { hobby1: 'Photography', hobby2: 'Music', score: 50 },
  
  // Entertainment relationships
  { hobby1: 'Movies', hobby2: 'Reading', score: 70 },
  { hobby1: 'Movies', hobby2: 'Gaming', score: 75 },
  { hobby1: 'Gaming', hobby2: 'Technology', score: 90 },
  { hobby1: 'Gaming', hobby2: 'Programming', score: 85 },
  { hobby1: 'Gaming', hobby2: 'Board games', score: 80 },
  { hobby1: 'Reading', hobby2: 'Programming', score: 60 },
  { hobby1: 'Technology', hobby2: 'Programming', score: 95 },
  { hobby1: 'Technology', hobby2: 'Photography', score: 65 },
  
  // Lifestyle relationships
  { hobby1: 'Cooking', hobby2: 'Fashion', score: 50 },
  { hobby1: 'Fashion', hobby2: 'Art and drawing', score: 70 },
  { hobby1: 'Volunteering', hobby2: 'Outdoor activities', score: 65 },
  { hobby1: 'Board games', hobby2: 'Movies', score: 60 },
];

// Nickname Themes
export interface NicknameTheme {
  id: string;
  name: string;
  description: string;
  pairs: NicknamePair[];
  groups: NicknameGroup[];
}

export interface NicknamePair {
  id: string;
  name1: string;
  name2: string;
  theme: string;
}

export interface NicknameGroup {
  id: string;
  names: string[];
  theme: string;
  minSize: number;
  maxSize: number;
}

export const NICKNAME_THEMES: NicknameTheme[] = [
  {
    id: 'shakespeare',
    name: 'Shakespeare',
    description: 'Famous pairs from Shakespeare plays',
    pairs: [
      { id: 'romeo_juliet', name1: 'Romeo', name2: 'Juliet', theme: 'Shakespeare' },
      { id: 'hamlet_ophelia', name1: 'Hamlet', name2: 'Ophelia', theme: 'Shakespeare' },
      { id: 'macbeth_lady', name1: 'Macbeth', name2: 'Lady Macbeth', theme: 'Shakespeare' },
      { id: 'othello_desdemona', name1: 'Othello', name2: 'Desdemona', theme: 'Shakespeare' },
      { id: 'benedick_beatrice', name1: 'Benedick', name2: 'Beatrice', theme: 'Shakespeare' },
    ],
    groups: [],
  },
  {
    id: 'literature',
    name: 'Literature',
    description: 'Famous literary pairs and groups',
    pairs: [
      { id: 'sherlock_watson', name1: 'Sherlock', name2: 'Watson', theme: 'Literature' },
      { id: 'holmes_moriarty', name1: 'Holmes', name2: 'Moriarty', theme: 'Literature' },
      { id: 'frodo_sam', name1: 'Frodo', name2: 'Sam', theme: 'Literature' },
      { id: 'harry_hermione', name1: 'Harry', name2: 'Hermione', theme: 'Literature' },
      { id: 'elizabeth_darcy', name1: 'Elizabeth', name2: 'Darcy', theme: 'Literature' },
    ],
    groups: [
      {
        id: 'hobbit_fellowship',
        names: ['Frodo', 'Sam', 'Merry', 'Pippin', 'Aragorn', 'Legolas', 'Gimli', 'Boromir', 'Gandalf'],
        theme: 'Literature',
        minSize: 4,
        maxSize: 9,
      },
    ],
  },
  {
    id: 'mythology',
    name: 'Mythology',
    description: 'Mythological figures and pairs',
    pairs: [
      { id: 'zeus_hera', name1: 'Zeus', name2: 'Hera', theme: 'Mythology' },
      { id: 'odysseus_penelope', name1: 'Odysseus', name2: 'Penelope', theme: 'Mythology' },
      { id: 'hercules_athena', name1: 'Hercules', name2: 'Athena', theme: 'Mythology' },
      { id: 'apollo_artemis', name1: 'Apollo', name2: 'Artemis', theme: 'Mythology' },
      { id: 'poseidon_amphitrite', name1: 'Poseidon', name2: 'Amphitrite', theme: 'Mythology' },
    ],
    groups: [
      {
        id: 'olympians',
        names: ['Zeus', 'Hera', 'Poseidon', 'Athena', 'Apollo', 'Artemis', 'Ares', 'Aphrodite', 'Hephaestus', 'Hermes'],
        theme: 'Mythology',
        minSize: 3,
        maxSize: 12,
      },
    ],
  },
  {
    id: 'pop_culture',
    name: 'Pop Culture',
    description: 'Famous pairs from movies and TV',
    pairs: [
      { id: 'batman_robin', name1: 'Batman', name2: 'Robin', theme: 'Pop Culture' },
      { id: 'mario_luigi', name1: 'Mario', name2: 'Luigi', theme: 'Pop Culture' },
      { id: 'bonnie_clyde', name1: 'Bonnie', name2: 'Clyde', theme: 'Pop Culture' },
      { id: 'han_solo', name1: 'Han', name2: 'Solo', theme: 'Pop Culture' },
      { id: 'woodstock_snoopy', name1: 'Woodstock', name2: 'Snoopy', theme: 'Pop Culture' },
    ],
    groups: [
      {
        id: 'avengers',
        names: ['Iron Man', 'Captain America', 'Thor', 'Hulk', 'Black Widow', 'Hawkeye'],
        theme: 'Pop Culture',
        minSize: 2,
        maxSize: 6,
      },
      {
        id: 'justice_league',
        names: ['Superman', 'Batman', 'Wonder Woman', 'Flash', 'Aquaman', 'Green Lantern'],
        theme: 'Pop Culture',
        minSize: 2,
        maxSize: 6,
      },
      {
        id: 'star_wars',
        names: ['Luke', 'Leia', 'Han', 'Chewbacca', 'Yoda', 'Obi-Wan'],
        theme: 'Pop Culture',
        minSize: 2,
        maxSize: 6,
      },
    ],
  },
];
