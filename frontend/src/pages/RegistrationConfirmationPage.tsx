import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaign, getStudentResults, getStudentResultToken } from '../services/api';
import { Campaign, Match } from '../types';
import { formatDateTime } from '../utils/date';

// Simple celebration illustration
const CelebrationIllustration = () => (
  <div className="relative w-64 h-64 mx-auto mb-8">
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Confetti */}
      {[...Array(20)].map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const distance = 50 + Math.random() * 50;
        const x = 100 + Math.cos(angle) * distance;
        const y = 100 + Math.sin(angle) * distance;
        const color = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][Math.floor(Math.random() * 5)];
        return (
          <rect
            key={i}
            x={x - 3}
            y={y - 3}
            width="6"
            height="6"
            fill={color}
            opacity={0.8}
            transform={`rotate(${Math.random() * 360}, ${x}, ${y})`}
          />
        );
      })}
      
      {/* Person */}
      <circle cx="100" cy="100" r="20" fill="#3b82f6" />
      <circle cx="100" cy="90" r="10" fill="#fbbf24" />
      <rect x="90" y="115" width="20" height="30" fill="#3b82f6" rx="5" />
      
      {/* Arms up */}
      <rect x="75" y="110" width="15" height="8" fill="#3b82f6" rx="4" transform="rotate(-45, 82.5, 114)" />
      <rect x="110" y="110" width="15" height="8" fill="#3b82f6" rx="4" transform="rotate(45, 117.5, 114)" />
      
      {/* Checkmark */}
      <circle cx="100" cy="60" r="15" fill="#10b981" />
      <path d="M95 65 L100 70 L105 65" stroke="white" strokeWidth="3" fill="none" />
    </svg>
  </div>
);

export default function RegistrationConfirmationPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pollingInterval: ReturnType<typeof setInterval> | undefined;
    let isActive = true;

    const fetchData = async () => {
      if (!campaignId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch campaign
        const campaignResponse = await getCampaign(campaignId);
        if (!campaignResponse.success || !campaignResponse.data) {
          setError('Campaign not found');
          return;
        }
        setCampaign(campaignResponse.data);
        
        // Check if campaign is expired
        if (campaignResponse.data.status === 'EXPIRED') {
          navigate(`/campaigns/${campaignId}/expired`);
          return;
        }
        
        // Get the result token from storage
        const token = getStudentResultToken(campaignId);
        
        if (!token) return;

        const redirectToResultsIfMatched = async () => {
          try {
            const resultResponse = await getStudentResults(campaignId, token);
            if (isActive && resultResponse.success && resultResponse.data) {
              setMatch(resultResponse.data);
              navigate(`/campaigns/${campaignId}/results/${token}`, { replace: true });
              return true;
            }
          } catch {
            // A student can remain unmatched while matching is in progress.
          }

          return false;
        };

        // Check immediately, then continue checking while the student waits here.
        if (await redirectToResultsIfMatched()) return;

        if (!isActive) return;

        pollingInterval = setInterval(async () => {
          if (await redirectToResultsIfMatched() && pollingInterval) {
            clearInterval(pollingInterval);
          }
        }, 5000);
        
      } catch (err) {
        setError('Failed to load data');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isActive = false;
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [campaignId, navigate]);

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

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Error Loading Page</h2>
          <p className="mb-6">{error || 'Page not found'}</p>
          <button onClick={() => navigate('/')} className="btn btn-white text-primary-600">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Navigation is triggered as soon as polling finds a match.
  if (match) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <img
                src="/favicon.svg"
                alt="IntEGre Buddy App logo"
                className="w-12 h-12"
              />
            </div>
            <span className="text-white text-2xl font-bold">IntEGre Buddy App</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Registration Complete!</h1>
          <p className="text-white/90">Welcome to {campaign.city}!</p>
        </div>

        {/* Confirmation Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
          <CelebrationIllustration />
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            You're Registered!
          </h2>
          
          <p className="text-lg text-gray-600 mb-8">
            We're looking forward to finding you a great campus buddy.
            Keep this page handy and you'll be notified when your buddy has been assigned.
          </p>

          {/* Status */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-primary-800 mb-2">Waiting for Match</h3>
            <p className="text-sm text-primary-600">
              Your registration is complete. The event organizer will start matching students soon.
            </p>
          </div>

          {/* Next Steps */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Get Notified</h3>
              <p className="text-sm text-gray-600">
                If you enabled notifications, you'll receive an alert when your buddy is assigned.
              </p>
            </div>
            
            <div className="card">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Check Back Later</h3>
              <p className="text-sm text-gray-600">
                Save this page and check back to see your assigned buddy.
              </p>
            </div>
          </div>

          {/* Campaign Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-600">
              Campaign: <strong>{campaign.city}</strong>
            </p>
            <p className="text-sm text-gray-600">
              Created: {formatDateTime(campaign.createdAt)}
            </p>
            <p className="text-sm text-gray-600">
              Expires: {formatDateTime(campaign.expiresAt)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white/70">
          <p>Questions? Contact the event organizer</p>
        </div>
      </div>
    </div>
  );
}
