/**
 * API Service for the IntEGre Buddy App application
 * 
 * This service provides all the API endpoints for communicating with the Cloudflare Workers backend
 */

import { 
  Campaign, 
  CampaignCreationRequest, 
  CampaignCreationResponse,
  AdminLoginRequest,
  AdminLoginResponse,
  StudentRegistrationRequest,
  StudentRegistrationResponse,
  MatchingConfiguration,
  MatchingPreview,
  DashboardStats,
  Student,
  Match,
  MatchedStudentGroup,
  PublicMatchDisplay,
  ApiResponse,
  HobbyRelationship,
  API_ENDPOINTS,
  STORAGE_KEYS,
} from '../types';

// API endpoints already include the /api prefix; this is only for an optional host.
let API_BASE_URL = '';

/**
 * Configure the API base URL
 */
export function configureApi(baseUrl?: string) {
  API_BASE_URL = baseUrl || '';
}

// Initialize API configuration
configureApi();

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<ApiResponse<T>> {
  let url = endpoint;
  
  // Add query parameters if provided
  if (options?.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }
  
  const fullUrl = `${API_BASE_URL}${url}`;
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  
    const data = await response.json() as ApiResponse<T>;
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get the admin session token from storage
 */
export function getAdminSessionToken(campaignId: string): string | null {
  try {
    const sessionData = localStorage.getItem(`${STORAGE_KEYS.ADMIN_SESSION}_${campaignId}`);
    if (sessionData) {
      const { token, expiresAt } = JSON.parse(sessionData);
      if (expiresAt > Date.now()) {
        return token;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/**
 * Store the admin session token
 */
export function storeAdminSessionToken(campaignId: string, token: string, expiresAt: number) {
  try {
    localStorage.setItem(
      `${STORAGE_KEYS.ADMIN_SESSION}_${campaignId}`,
      JSON.stringify({ token, expiresAt })
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear the admin session token
 */
export function clearAdminSessionToken(campaignId: string) {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.ADMIN_SESSION}_${campaignId}`);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get all admin session tokens
 */
export function getAllAdminSessionTokens(): Record<string, string> {
  const tokens: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${STORAGE_KEYS.ADMIN_SESSION}_`)) {
        const campaignId = key.replace(`${STORAGE_KEYS.ADMIN_SESSION}_`, '');
        const sessionData = localStorage.getItem(key);
        if (sessionData) {
          const { token, expiresAt } = JSON.parse(sessionData);
          if (expiresAt > Date.now()) {
            tokens[campaignId] = token;
          }
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
  return tokens;
}

/**
 * Store the student result token
 */
export function storeStudentResultToken(campaignId: string, token: string) {
  try {
    localStorage.setItem(
      `${STORAGE_KEYS.STUDENT_RESULT_TOKEN}_${campaignId}`,
      token
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the student result token
 */
export function getStudentResultToken(campaignId: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_KEYS.STUDENT_RESULT_TOKEN}_${campaignId}`);
  } catch {
    return null;
  }
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  request: CampaignCreationRequest
): Promise<ApiResponse<CampaignCreationResponse>> {
  return apiFetch<CampaignCreationResponse>(API_ENDPOINTS.CREATE_CAMPAIGN, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get campaign details
 */
export async function getCampaign(campaignId: string): Promise<ApiResponse<Campaign>> {
  return apiFetch<Campaign>(API_ENDPOINTS.GET_CAMPAIGN.replace(':campaignId', campaignId));
}

/**
 * Admin login
 */
export async function adminLogin(
  campaignId: string,
  request: AdminLoginRequest
): Promise<ApiResponse<AdminLoginResponse>> {
  return apiFetch<AdminLoginResponse>(
    API_ENDPOINTS.LOGIN_ADMIN.replace(':campaignId', campaignId),
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

/**
 * Admin logout
 */
export async function adminLogout(campaignId: string): Promise<ApiResponse<void>> {
  const token = getAdminSessionToken(campaignId);
  
  const response = await apiFetch<void>(
    API_ENDPOINTS.LOGOUT_ADMIN.replace(':campaignId', campaignId),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  // Clear the token regardless of response
  clearAdminSessionToken(campaignId);
  
  return response;
}

/**
 * Verify admin session
 */
export async function verifyAdminSession(campaignId: string): Promise<ApiResponse<Campaign>> {
  const token = getAdminSessionToken(campaignId);
  
  if (!token) {
    return { success: false, error: 'No session token found' };
  }
  
  return apiFetch<Campaign>(
    API_ENDPOINTS.VERIFY_ADMIN.replace(':campaignId', campaignId),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Register a student
 */
export async function registerStudent(
  campaignId: string,
  request: StudentRegistrationRequest
): Promise<ApiResponse<StudentRegistrationResponse>> {
  return apiFetch<StudentRegistrationResponse>(
    API_ENDPOINTS.REGISTER_STUDENT.replace(':campaignId', campaignId),
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

/**
 * Get student details
 */
export async function getStudent(
  campaignId: string,
  studentId: string,
  token?: string
): Promise<ApiResponse<Student>> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return apiFetch<Student>(
    API_ENDPOINTS.GET_STUDENT.replace(':campaignId', campaignId).replace(':studentId', studentId),
    { headers }
  );
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(campaignId: string): Promise<ApiResponse<DashboardStats>> {
  const token = getAdminSessionToken(campaignId);
  
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }
  
  return apiFetch<DashboardStats>(
    API_ENDPOINTS.GET_DASHBOARD.replace(':campaignId', campaignId),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Get pending students
 */
export async function getPendingStudents(
  campaignId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<{ students: Student[]; total: number }>> {
  const token = getAdminSessionToken(campaignId);
  
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }
  
  return apiFetch<{ students: Student[]; total: number }>(
    API_ENDPOINTS.GET_PENDING_STUDENTS.replace(':campaignId', campaignId),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { page: page.toString(), limit: limit.toString() },
    }
  );
}

/**
 * Get matched students
 */
export async function getMatchedStudents(
  campaignId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<{ matches: MatchedStudentGroup[]; total: number }>> {
  const token = getAdminSessionToken(campaignId);
  
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }
  
  return apiFetch<{ matches: MatchedStudentGroup[]; total: number }>(
    API_ENDPOINTS.GET_MATCHED_STUDENTS.replace(':campaignId', campaignId),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { page: page.toString(), limit: limit.toString() },
    }
  );
}

/**
 * Configure matching
 */
export async function configureMatching(
  campaignId: string,
  config: MatchingConfiguration
): Promise<ApiResponse<void>> {
  const token = getAdminSessionToken(campaignId);
  
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }
  
  return apiFetch<void>(
    API_ENDPOINTS.CONFIGURE_MATCHING.replace(':campaignId', campaignId),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    }
  );
}

/**
 * Preview matching
 */
export async function previewMatching(
  campaignId: string,
  config: MatchingConfiguration
): Promise<ApiResponse<MatchingPreview>> {
  const token = getAdminSessionToken(campaignId);
  
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }
  
  return apiFetch<MatchingPreview>(
    API_ENDPOINTS.PREVIEW_MATCHING.replace(':campaignId', campaignId),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    }
  );
}

/**
 * Generate matches
 */
export async function generateMatches(
  campaignId: string,
  config: MatchingConfiguration
): Promise<ApiResponse<{ matchingRoundId: string; matchesCreated: number; studentsMatched: number; studentsPending: number }>> {
  const token = getAdminSessionToken(campaignId);
  
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }
  
  return apiFetch<{ matchingRoundId: string; matchesCreated: number; studentsMatched: number; studentsPending: number }>(
    API_ENDPOINTS.GENERATE_MATCHES.replace(':campaignId', campaignId),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    }
  );
}

/**
 * Get match results for a student
 */
export async function getStudentResults(
  campaignId: string,
  studentId: string,
  token: string
): Promise<ApiResponse<Match | null>> {
  return apiFetch<Match | null>(
    API_ENDPOINTS.GET_STUDENT_RESULTS
      .replace(':campaignId', campaignId)
      .replace(':studentId', studentId),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Get public display data
 */
export async function getPublicDisplay(campaignId: string): Promise<ApiResponse<PublicMatchDisplay[]>> {
  return apiFetch<PublicMatchDisplay[]>(
    API_ENDPOINTS.GET_PUBLIC_DISPLAY.replace(':campaignId', campaignId)
  );
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  campaignId: string,
  subscription: PushSubscription,
  studentId?: string
): Promise<ApiResponse<void>> {
  const requestBody = {
    subscription,
    studentId,
  };
  
  return apiFetch<void>(
    API_ENDPOINTS.SUBSCRIBE_PUSH.replace(':campaignId', campaignId),
    {
      method: 'POST',
      body: JSON.stringify(requestBody),
    }
  );
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(
  campaignId: string,
  subscriptionId: string
): Promise<ApiResponse<void>> {
  return apiFetch<void>(
    API_ENDPOINTS.UNSUBSCRIBE_PUSH.replace(':campaignId', campaignId),
    {
      method: 'POST',
      body: JSON.stringify({ subscriptionId }),
    }
  );
}

/**
 * Get hobby relationships
 */
export async function getHobbyRelationships(): Promise<ApiResponse<HobbyRelationship[]>> {
  return apiFetch<HobbyRelationship[]>(API_ENDPOINTS.GET_HOBBY_RELATIONSHIPS);
}

/**
 * Poll for updates (for real-time functionality)
 */
export async function pollForUpdates<T>(
  endpoint: string,
  interval: number = 5000,
  onUpdate: (data: T) => void,
  onError?: (error: string) => void,
  stopCondition?: () => boolean
): Promise<void> {
  let lastData: T | null = null;
  
  const poll = async () => {
    if (stopCondition?.()) {
      return;
    }
    
    try {
      const response = await apiFetch<T>(endpoint);
      if (response.success && response.data) {
        if (JSON.stringify(response.data) !== JSON.stringify(lastData)) {
          lastData = response.data;
          onUpdate(response.data);
        }
      }
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error.message : 'Polling error');
      }
    }
    
    if (!stopCondition?.()) {
      setTimeout(poll, interval);
    }
  };
  
  // Start polling
  poll();
}

/**
 * Check if a campaign is accessible (not expired)
 */
export async function checkCampaignAccessible(campaignId: string): Promise<ApiResponse<{ accessible: boolean; expired: boolean }>> {
  return apiFetch<{ accessible: boolean; expired: boolean }>(
    `/api/campaigns/${campaignId}/check`
  );
}
