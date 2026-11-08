import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaign } from '../services/api';
import { Campaign } from '../types';
import { formatDateTime } from '../utils/date';

export default function CampaignExpiredPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) return;
      
      try {
        setIsLoading(true);
        const response = await getCampaign(campaignId);
        
        if (response.success && response.data) {
          setCampaign(response.data);
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
          <h2 className="text-2xl font-bold mb-4">Campaign Not Found</h2>
          <p className="mb-6">{error || 'Campaign not found'}</p>
          <button onClick={() => navigate('/')} className="btn btn-white text-primary-600">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center p-4">
      <div className="text-center text-white max-w-md">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-4xl font-bold mb-4">Campaign Expired</h1>
        <p className="text-lg text-white/90 mb-6">
          This campaign has reached its 24-hour limit and all data has been automatically deleted.
        </p>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-8">
          <p className="text-sm">
            <strong>Campaign:</strong> {campaign.city}
          </p>
          <p className="text-sm">
            <strong>Created:</strong> {formatDateTime(campaign.createdAt)}
          </p>
          <p className="text-sm">
            <strong>Expired:</strong> {formatDateTime(campaign.expiresAt)}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => navigate('/')} className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Create New Campaign
          </button>
          
          <button onClick={() => navigate('/')} className="btn btn-lg btn-outline text-white border-white hover:bg-white/10">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Home
          </button>
        </div>
        
        <div className="mt-8 text-sm text-white/70">
          <p>Thank you for using Campus Buddies!</p>
        </div>
      </div>
    </div>
  );
}
