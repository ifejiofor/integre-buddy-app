import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentResults, getCampaign } from '../services/api';
import { Campaign, Match } from '../types';
import { formatDateTime } from '../utils/date';

// Illustration component for different nickname themes
const ThemeIllustration = ({ theme }: { theme: string }) => {
  const illustrations: Record<string, React.ReactNode> = {
    shakespeare: (
      <div className="w-48 h-32 mx-auto mb-6">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Simple Shakespeare-themed illustration */}
          <circle cx="50" cy="60" r="20" fill="#8b5cf6" />
          <circle cx="150" cy="60" r="20" fill="#ec4899" />
          <line x1="70" y1="60" x2="130" y2="60" stroke="#3b82f6" strokeWidth="3" />
          <text x="100" y="70" textAnchor="middle" fontSize="16" fill="#3b82f6">❤️</text>
          <text x="50" y="100" textAnchor="middle" fontSize="12" fill="#8b5cf6">Romeo</text>
          <text x="150" y="100" textAnchor="middle" fontSize="12" fill="#ec4899">Juliet</text>
        </svg>
      </div>
    ),
    literature: (
      <div className="w-48 h-32 mx-auto mb-6">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <rect x="40" y="40" width="30" height="40" fill="#8b5cf6" rx="5" />
          <rect x="130" y="40" width="30" height="40" fill="#ec4899" rx="5" />
          <line x1="70" y1="60" x2="130" y2="60" stroke="#3b82f6" strokeWidth="3" />
          <text x="55" y="90" textAnchor="middle" fontSize="10" fill="white">Sherlock</text>
          <text x="145" y="90" textAnchor="middle" fontSize="10" fill="white">Watson</text>
        </svg>
      </div>
    ),
    pop_culture: (
      <div className="w-48 h-32 mx-auto mb-6">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <circle cx="60" cy="60" r="15" fill="#f59e0b" />
          <circle cx="80" cy="50" r="10" fill="#ef4444" />
          <circle cx="140" cy="60" r="15" fill="#3b82f6" />
          <circle cx="120" cy="50" r="10" fill="#8b5cf6" />
          <line x1="95" y1="55" x2="125" y2="55" stroke="#10b981" strokeWidth="3" />
          <text x="60" y="100" textAnchor="middle" fontSize="10" fill="white">Batman</text>
          <text x="140" y="100" textAnchor="middle" fontSize="10" fill="white">Robin</text>
        </svg>
      </div>
    ),
    default: (
      <div className="w-48 h-32 mx-auto mb-6">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <circle cx="60" cy="60" r="20" fill="#3b82f6" />
          <circle cx="140" cy="60" r="20" fill="#8b5cf6" />
          <line x1="80" y1="60" x2="120" y2="60" stroke="#ec4899" strokeWidth="4" />
          <text x="100" y="70" textAnchor="middle" fontSize="16" fill="#ec4899">❤️</text>
        </svg>
      </div>
    ),
  };

  return illustrations[theme.toLowerCase()] || illustrations.default;
};

export default function StudentResultPage() {
  const { campaignId, token } = useParams<{ campaignId: string; token: string }>();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!campaignId || !token) return;
      
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
        
        // Fetch match results
        const resultResponse = await getStudentResults(campaignId, token, token);
        if (resultResponse.success && resultResponse.data) {
          setMatch(resultResponse.data);
        } else {
          setError(resultResponse.error || 'Match not found');
        }
        
      } catch (err) {
        setError('Failed to load data');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [campaignId, token, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-xl">Loading your match...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Match Not Found</h2>
          <p className="mb-6">{error || 'Your match could not be found'}</p>
          <button onClick={() => navigate(`/campaigns/${campaignId}/register`)} className="btn btn-white text-primary-600">
            Register Again
          </button>
        </div>
      </div>
    );
  }

  // Find the current student from the match
  const currentStudent = match.students[0].student; // Assuming first student is the current user
  const otherStudents = match.students.slice(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-bold text-xl">CB</span>
            </div>
            <span className="text-white text-2xl font-bold">Campus Buddies</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Match is Ready!</h1>
          <p className="text-white/90">Congratulations, {currentStudent.firstName}!</p>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          {/* Illustration */}
          <ThemeIllustration theme={match.nicknameTheme} />
          
          {/* Compatibility Score */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl font-bold text-white">{match.compatibilityScore}%</span>
            </div>
            <p className="text-gray-600">Compatibility Score</p>
          </div>

          {/* Match Details */}
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Buddy{otherStudents.length > 1 ? ' Group' : ''}</h2>
          
          {/* Current Student */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                {currentStudent.firstName.charAt(0)}{currentStudent.lastName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-primary-800">{match.students[0].nickname}</p>
                <p className="text-primary-600">{currentStudent.firstName} {currentStudent.lastName}</p>
                <p className="text-sm text-primary-500">You</p>
              </div>
            </div>
          </div>

          {/* Other Students */}
          <div className="space-y-4">
            {otherStudents.map((member, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                    {member.student.firstName.charAt(0)}{member.student.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{member.nickname}</p>
                    <p className="text-gray-600">{member.student.firstName} {member.student.lastName}</p>
                    <p className="text-sm text-gray-500">
                      Arrived in {member.student.arrivalYear}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Shared Interests */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Shared Interests</h3>
            <div className="flex flex-wrap gap-2">
              {currentStudent.hobbies.map((hobby, index) => (
                <span key={index} className="hobby-chip">{hobby}</span>
              ))}
            </div>
          </div>

          {/* Match Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p><strong>Matched:</strong> {formatDateTime(match.createdAt)}</p>
              </div>
              <div>
                <p><strong>Theme:</strong> {match.nicknameTheme}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="text-center">
          <button
            onClick={() => navigate(`/campaigns/${campaignId}/register`)}
            className="btn btn-secondary mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20L20 4" />
            </svg>
            Start Over
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="btn btn-outline text-white border-white hover:bg-white/10"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Home
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white/70">
          <p>Thank you for using Campus Buddies!</p>
        </div>
      </div>
    </div>
  );
}
