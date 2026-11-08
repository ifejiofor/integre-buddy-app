import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminLogin, getCampaign, getAdminSessionToken, storeAdminSessionToken } from '../services/api';
import { validateSecretCode } from '../utils/validation';
import { Campaign, AdminLoginRequest } from '../types';
import { TIME_CONSTANTS } from '../types';

export default function AdminLoginPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Check if already logged in
  useEffect(() => {
    if (campaignId) {
      const token = getAdminSessionToken(campaignId);
      if (token) {
        // Already logged in, redirect to dashboard
        navigate(`/campaigns/${campaignId}/admin/dashboard`);
      }
    }
  }, [campaignId, navigate]);

  // Fetch campaign details
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) return;
      
      try {
        setIsLoading(true);
        const response = await getCampaign(campaignId);
        
        if (response.success && response.data) {
          setCampaign(response.data);
          
          // Check if campaign is expired
          if (response.data.status === 'EXPIRED') {
            setError('This campaign has expired and cannot be accessed.');
          }
        } else {
          setError(response.error || 'Campaign not found');
        }
      } catch (err) {
        setError('Failed to load campaign data');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignId) return;
    
    // Validate secret code
    const validation = validateSecretCode(secretCode);
    if (!validation.valid) {
      setError(validation.error || 'Invalid secret code');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const request: AdminLoginRequest = {
        campaignId,
        secretCode,
      };
      
      const response = await adminLogin(campaignId, request);
      
      if (response.success && response.data) {
        // Store session token
        const expiresAt = Date.now() + TIME_CONSTANTS.SESSION_DURATION_HOURS * 60 * 60 * 1000;
        storeAdminSessionToken(campaignId, response.data.sessionToken, expiresAt);
        
        // Redirect to dashboard
        navigate(`/campaigns/${campaignId}/admin/dashboard`);
      } else {
        setError(response.error || 'Invalid secret code');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowSecret = () => {
    setShowSecret(!showSecret);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Campaign Not Found</h2>
          <p className="mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-white text-primary-600">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-600">Sign in to manage your campaign</p>
            
            {campaign && (
              <div className="mt-4 bg-primary-50 border border-primary-200 rounded-lg p-3">
                <p className="text-sm text-primary-800">
                  Campaign: <strong>{campaign.city}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger mb-6">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="secretCode" className="label label-required">
                Campaign Secret Code
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  id="secretCode"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="Enter your secret code"
                  className="input pr-12"
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={toggleShowSecret}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showSecret ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm text-primary-800">
                <strong>Note:</strong> This is the secret code you created when setting up the campaign. 
                Keep it secure and don't share it with anyone.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !secretCode.trim()}
              className="btn btn-lg btn-primary w-full"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate(`/campaigns/${campaignId}/setup`)}
              className="btn btn-sm btn-ghost text-primary-600"
            >
              Back to Campaign Setup
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="hidden md:block absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1/2">
          <svg width="200" height="200" viewBox="0 0 200 200" className="opacity-20">
            <circle cx="100" cy="100" r="80" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
            <circle cx="100" cy="100" r="40" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
          </svg>
        </div>
        <div className="hidden md:block absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2">
          <svg width="200" height="200" viewBox="0 0 200 200" className="opacity-20">
            <circle cx="100" cy="100" r="80" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
            <circle cx="100" cy="100" r="40" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
