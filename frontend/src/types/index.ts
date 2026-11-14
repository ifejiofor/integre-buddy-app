// Campaign Types
export interface Campaign {
  id: string;
  city: string;
  secretHash: string;
  registrationUrl: string;
  qrCodeUrl: string;
  status: CampaignStatus;
  createdAt: number;
  expiresAt: number;
  adminUrl: string;
  displayUrl: string;
}

export type CampaignStatus = 'ACTIVE' | 'EXPIRED' | 'COMPLETED';

// Student Types
export interface Student {
  id: string;
  campaignId: string;
  firstName: string;
  lastName: string;
  arrivalYear: number;
  type?: StudentType;
  hobbies: string[];
  status: StudentStatus;
  registeredAt: number;
  consentGiven: boolean;
  consentTimestamp: number;
  privacyNoticeVersion: string;
}

export type StudentStatus = 'PENDING' | 'MATCHING' | 'MATCHED' | 'EXPIRED';

export type StudentType = 'NEW' | 'OLD';

// Hobby Types
export interface Hobby {
  id: string;
  name: string;
  category: string;
}

export interface HobbyRelationship {
  hobby1: string;
  hobby2: string;
  score: number; // 0-100
}

// Matching Types
export interface MatchingRound {
  id: string;
  campaignId: string;
  configuredAt: number;
  completedAt: number;
  oldToNewRatio: string; // e.g., "1:1", "1:2", "2:1"
  newToNewGroupSize: number;
  totalMatches: number;
  totalStudentsMatched: number;
  totalStudentsPending: number;
  status: MatchingRoundStatus;
}

export type MatchingRoundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Match {
  id: string;
  campaignId: string;
  matchingRoundId: string;
  students: MatchMember[];
  compatibilityScore: number;
  createdAt: number;
  nicknameTheme: string;
}

export interface MatchMember {
  studentId: string;
  student: Student;
  nickname: string;
  role: string; // e.g., "romeo", "juliet", "sherlock", "watson"
}

// Nickname Types
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

// Push Notification Types
export interface PushSubscription {
  id: string;
  campaignId: string;
  studentId: string | null;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CampaignCreationRequest {
  city: string;
  secretCode: string;
  secretCodeConfirmation: string;
}

export interface CampaignCreationResponse {
  campaign: Campaign;
  qrCodeDataUrl: string;
}

export interface AdminLoginRequest {
  campaignId: string;
  secretCode: string;
}

export interface AdminLoginResponse {
  sessionToken: string;
  campaign: Campaign;
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

export interface StudentRegistrationResponse {
  student: Student;
  resultUrlToken: string;
}

export interface MatchingConfiguration {
  oldToNewRatio: string;
  newToNewGroupSize: number;
}

export interface MatchingPreview {
  pendingOldStudents: number;
  pendingNewStudents: number;
  selectedOldToNewRatio: string;
  selectedNewToNewGroupSize: number;
  estimatedMatches: number;
  estimatedPending: number;
}

export interface DashboardStats {
  totalRegistered: number;
  totalMatched: number;
  totalPending: number;
  totalRounds: number;
  campaign: Campaign;
}

// Public Display Types
export interface PublicMatchDisplay {
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

// Predefined Hobbies
export const PREDEFINED_HOBBIES: Hobby[] = [
  { id: 'football', name: 'Football', category: 'sports' },
  { id: 'basketball', name: 'Basketball', category: 'sports' },
  { id: 'volleyball', name: 'Volleyball', category: 'sports' },
  { id: 'tennis', name: 'Tennis', category: 'sports' },
  { id: 'running', name: 'Running', category: 'sports' },
  { id: 'gym_fitness', name: 'Gym and fitness', category: 'sports' },
  { id: 'hiking', name: 'Hiking', category: 'outdoor' },
  { id: 'camping', name: 'Camping', category: 'outdoor' },
  { id: 'travelling', name: 'Travelling', category: 'outdoor' },
  { id: 'photography', name: 'Photography', category: 'creative' },
  { id: 'music', name: 'Music', category: 'creative' },
  { id: 'singing', name: 'Singing', category: 'creative' },
  { id: 'dancing', name: 'Dancing', category: 'creative' },
  { id: 'movies', name: 'Movies', category: 'entertainment' },
  { id: 'reading', name: 'Reading', category: 'entertainment' },
  { id: 'gaming', name: 'Gaming', category: 'entertainment' },
  { id: 'cooking', name: 'Cooking', category: 'lifestyle' },
  { id: 'technology', name: 'Technology', category: 'lifestyle' },
  { id: 'programming', name: 'Programming', category: 'lifestyle' },
  { id: 'art_drawing', name: 'Art and drawing', category: 'creative' },
  { id: 'fashion', name: 'Fashion', category: 'lifestyle' },
  { id: 'volunteering', name: 'Volunteering', category: 'community' },
  { id: 'board_games', name: 'Board games', category: 'entertainment' },
  { id: 'outdoor_activities', name: 'Outdoor activities', category: 'outdoor' },
];

// Predefined Hobby Relationships (symmetric, score 0-100)
export const HOBBY_RELATIONSHIPS: HobbyRelationship[] = [
  // Sports relationships
  { hobby1: 'football', hobby2: 'basketball', score: 90 },
  { hobby1: 'football', hobby2: 'volleyball', score: 85 },
  { hobby1: 'football', hobby2: 'tennis', score: 60 },
  { hobby1: 'football', hobby2: 'running', score: 75 },
  { hobby1: 'football', hobby2: 'gym_fitness', score: 70 },
  { hobby1: 'basketball', hobby2: 'volleyball', score: 80 },
  { hobby1: 'basketball', hobby2: 'tennis', score: 70 },
  { hobby1: 'basketball', hobby2: 'running', score: 75 },
  { hobby1: 'basketball', hobby2: 'gym_fitness', score: 80 },
  { hobby1: 'volleyball', hobby2: 'tennis', score: 65 },
  { hobby1: 'volleyball', hobby2: 'running', score: 70 },
  { hobby1: 'tennis', hobby2: 'running', score: 65 },
  { hobby1: 'running', hobby2: 'gym_fitness', score: 85 },
  { hobby1: 'gym_fitness', hobby2: 'hiking', score: 60 },
  
  // Outdoor relationships
  { hobby1: 'hiking', hobby2: 'camping', score: 95 },
  { hobby1: 'hiking', hobby2: 'travelling', score: 80 },
  { hobby1: 'hiking', hobby2: 'outdoor_activities', score: 90 },
  { hobby1: 'camping', hobby2: 'travelling', score: 75 },
  { hobby1: 'camping', hobby2: 'outdoor_activities', score: 85 },
  { hobby1: 'travelling', hobby2: 'outdoor_activities', score: 80 },
  { hobby1: 'travelling', hobby2: 'cooking', score: 55 },
  
  // Creative relationships
  { hobby1: 'photography', hobby2: 'art_drawing', score: 85 },
  { hobby1: 'music', hobby2: 'singing', score: 95 },
  { hobby1: 'music', hobby2: 'dancing', score: 75 },
  { hobby1: 'music', hobby2: 'movies', score: 65 },
  { hobby1: 'singing', hobby2: 'dancing', score: 80 },
  { hobby1: 'singing', hobby2: 'movies', score: 60 },
  { hobby1: 'dancing', hobby2: 'movies', score: 60 },
  { hobby1: 'photography', hobby2: 'music', score: 50 },
  
  // Entertainment relationships
  { hobby1: 'movies', hobby2: 'reading', score: 70 },
  { hobby1: 'movies', hobby2: 'gaming', score: 75 },
  { hobby1: 'gaming', hobby2: 'technology', score: 90 },
  { hobby1: 'gaming', hobby2: 'programming', score: 85 },
  { hobby1: 'gaming', hobby2: 'board_games', score: 80 },
  { hobby1: 'reading', hobby2: 'programming', score: 60 },
  { hobby1: 'technology', hobby2: 'programming', score: 95 },
  { hobby1: 'technology', hobby2: 'photography', score: 65 },
  
  // Lifestyle relationships
  { hobby1: 'cooking', hobby2: 'fashion', score: 50 },
  { hobby1: 'fashion', hobby2: 'art_drawing', score: 70 },
  { hobby1: 'volunteering', hobby2: 'outdoor_activities', score: 65 },
  { hobby1: 'board_games', hobby2: 'movies', score: 60 },
];

// Predefined Nickname Themes
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
  {
    id: 'animals',
    name: 'Animals',
    description: 'Animal-themed nicknames',
    pairs: [
      { id: 'lion_lamb', name1: 'Lion', name2: 'Lamb', theme: 'Animals' },
      { id: 'fox_hound', name1: 'Fox', name2: 'Hound', theme: 'Animals' },
      { id: 'eagle_owl', name1: 'Eagle', name2: 'Owl', theme: 'Animals' },
      { id: 'wolf_bear', name1: 'Wolf', name2: 'Bear', theme: 'Animals' },
    ],
    groups: [
      {
        id: 'jungle',
        names: ['Lion', 'Tiger', 'Leopard', 'Jaguar', 'Panther'],
        theme: 'Animals',
        minSize: 2,
        maxSize: 5,
      },
      {
        id: 'forest',
        names: ['Deer', 'Fox', 'Rabbit', 'Squirrel', 'Bear'],
        theme: 'Animals',
        minSize: 2,
        maxSize: 5,
      },
    ],
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Nature-inspired nicknames',
    pairs: [
      { id: 'sun_moon', name1: 'Sun', name2: 'Moon', theme: 'Nature' },
      { id: 'ocean_wave', name1: 'Ocean', name2: 'Wave', theme: 'Nature' },
      { id: 'mountain_valley', name1: 'Mountain', name2: 'Valley', theme: 'Nature' },
      { id: 'forest_meadow', name1: 'Forest', name2: 'Meadow', theme: 'Nature' },
    ],
    groups: [
      {
        id: 'elements',
        names: ['Fire', 'Water', 'Earth', 'Air'],
        theme: 'Nature',
        minSize: 2,
        maxSize: 4,
      },
      {
        id: 'seasons',
        names: ['Spring', 'Summer', 'Autumn', 'Winter'],
        theme: 'Nature',
        minSize: 2,
        maxSize: 4,
      },
    ],
  },
];

// Privacy Notice Version
export const PRIVACY_NOTICE_VERSION = '1.0';

export const PRIVACY_NOTICE_TEXT = `
Your information will only be used to organize this buddy-matching event. 
This campaign automatically expires within 24 hours of its creation, after which 
your personal information and matching records are permanently deleted. 

Your first and last names will be disclosed to your assigned buddy and may appear 
on the event's public matching screen. 

Browser notifications are optional and require your explicit permission. 
The application does not request email addresses, phone numbers, or other 
unnecessary personal details.
`;

// Validation Constants
export const VALIDATION = {
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 50,
  MIN_SECRET_LENGTH: 8,
  MAX_SECRET_LENGTH: 64,
  MIN_HOBBY_LENGTH: 2,
  MAX_HOBBY_LENGTH: 100,
  MAX_HOBBIES_PER_STUDENT: 10,
};

// API Endpoints
export const API_ENDPOINTS = {
  CREATE_CAMPAIGN: '/api/campaigns',
  GET_CAMPAIGN: '/api/campaigns/:campaignId',
  LOGIN_ADMIN: '/api/campaigns/:campaignId/admin/login',
  LOGOUT_ADMIN: '/api/campaigns/:campaignId/admin/logout',
  VERIFY_ADMIN: '/api/campaigns/:campaignId/admin/verify',
  REGISTER_STUDENT: '/api/campaigns/:campaignId/students',
  GET_STUDENT: '/api/campaigns/:campaignId/students/:studentId',
  GET_DASHBOARD: '/api/campaigns/:campaignId/dashboard',
  GET_PENDING_STUDENTS: '/api/campaigns/:campaignId/students/pending',
  GET_MATCHED_STUDENTS: '/api/campaigns/:campaignId/students/matched',
  CONFIGURE_MATCHING: '/api/campaigns/:campaignId/matching/configure',
  PREVIEW_MATCHING: '/api/campaigns/:campaignId/matching/preview',
  GENERATE_MATCHES: '/api/campaigns/:campaignId/matching/generate',
  GET_MATCH_RESULTS: '/api/campaigns/:campaignId/matches/:matchId',
  GET_STUDENT_RESULTS: '/api/campaigns/:campaignId/students/:studentId/results',
  GET_PUBLIC_DISPLAY: '/api/campaigns/:campaignId/display',
  SUBSCRIBE_PUSH: '/api/campaigns/:campaignId/notifications/subscribe',
  UNSUBSCRIBE_PUSH: '/api/campaigns/:campaignId/notifications/unsubscribe',
  GET_HOBBY_RELATIONSHIPS: '/api/hobbies/relationships',
};

// Storage Keys
export const STORAGE_KEYS = {
  ADMIN_SESSION: 'campus_buddies_admin_session',
  STUDENT_RESULT_TOKEN: 'campus_buddies_student_token',
  PUSH_SUBSCRIPTION: 'campus_buddies_push_subscription',
};

// Time Constants
export const TIME_CONSTANTS = {
  CAMPAIGN_DURATION_HOURS: 24,
  SESSION_DURATION_HOURS: 8,
  POLLING_INTERVAL_MS: 5000,
  NOTIFICATION_TTL_HOURS: 24,
};
