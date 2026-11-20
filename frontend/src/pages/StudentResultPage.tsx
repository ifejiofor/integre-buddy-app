import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentResults, getCampaign } from '../services/api';
import { Campaign, Match } from '../types';
import { formatDateTime } from '../utils/date';

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
        const resultResponse = await getStudentResults(campaignId, token);
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

  // The API resolves the result token to its owner, so member order cannot
  // cause another student to be labelled as the viewer.
  const currentMember = match.students.find(member => member.studentId === match.currentStudentId);
  const currentStudent = currentMember?.student;
  const otherStudents = match.students.filter(member => member.studentId !== match.currentStudentId);

  if (!currentMember || !currentStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Match Not Found</h2>
          <p className="mb-6">Your match details could not be loaded.</p>
          <button onClick={() => navigate(`/campaigns/${campaignId}/register`)} className="btn btn-white text-primary-600">
            Register Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
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
          <h1 className="text-3xl font-bold text-white mb-2">Your Match is Ready!</h1>
          <p className="text-white/90">Congratulations, {currentStudent.firstName}!</p>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          {/* Compatibility Score */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl font-bold text-white">{match.compatibilityScore}%</span>
            </div>
            <p className="text-gray-600">Compatibility Score</p>
          </div>
          
          {/* Current Student */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                {currentStudent.firstName.charAt(0)}{currentStudent.lastName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-primary-800">{currentMember.nickname}</p>
                <p className="text-primary-600">{currentStudent.firstName} {currentStudent.lastName}</p>
                <p className="text-sm text-primary-500">You</p>
              </div>
            </div>
          </div>

          {/* Match Details */}
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Buddy{otherStudents.length > 1 ? ' Group' : ''}</h2>

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
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white/70">
          <p>Thank you for using IntEGre Buddy App!</p>
        </div>
      </div>
    </div>
  );
}
