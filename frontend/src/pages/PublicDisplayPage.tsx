import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getCampaign, getPublicDisplay } from '../services/api';
import { Campaign, PublicMatchDisplay } from '../types';
import { formatDateTime } from '../utils/date';

// Simple illustration component for matches
const MatchIllustration = ({ theme }: { theme: string }) => {
  const illustrations: Record<string, React.ReactNode> = {
    shakespeare: (
      <svg viewBox="0 0 200 100" className="w-full h-24">
        <circle cx="50" cy="50" r="20" fill="#8b5cf6" />
        <circle cx="150" cy="50" r="20" fill="#ec4899" />
        <line x1="70" y1="50" x2="130" y2="50" stroke="#3b82f6" strokeWidth="3" />
        <text x="100" y="55" textAnchor="middle" fontSize="14" fill="#3b82f6">❤️</text>
      </svg>
    ),
    literature: (
      <svg viewBox="0 0 200 100" className="w-full h-24">
        <rect x="40" y="30" width="30" height="40" fill="#8b5cf6" rx="5" />
        <rect x="130" y="30" width="30" height="40" fill="#ec4899" rx="5" />
        <line x1="70" y1="50" x2="130" y2="50" stroke="#3b82f6" strokeWidth="3" />
      </svg>
    ),
    pop_culture: (
      <svg viewBox="0 0 200 100" className="w-full h-24">
        <circle cx="50" cy="50" r="15" fill="#f59e0b" />
        <circle cx="70" cy="40" r="10" fill="#ef4444" />
        <circle cx="130" cy="50" r="15" fill="#3b82f6" />
        <circle cx="150" cy="40" r="10" fill="#8b5cf6" />
        <line x1="85" y1="45" x2="115" y2="45" stroke="#10b981" strokeWidth="3" />
      </svg>
    ),
    default: (
      <svg viewBox="0 0 200 100" className="w-full h-24">
        <circle cx="60" cy="50" r="15" fill="#3b82f6" />
        <circle cx="140" cy="50" r="15" fill="#8b5cf6" />
        <line x1="75" y1="50" x2="125" y2="50" stroke="#ec4899" strokeWidth="3" />
      </svg>
    ),
  };

  return illustrations[theme.toLowerCase()] || illustrations.default;
};

export default function PublicDisplayPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [matches, setMatches] = useState<PublicMatchDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(20); // seconds for full scroll
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Fetch campaign and matches
  useEffect(() => {
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
          setError('This campaign has expired.');
          return;
        }
        
        // Fetch matches
        const matchesResponse = await getPublicDisplay(campaignId);
        if (matchesResponse.success && matchesResponse.data) {
          setMatches(matchesResponse.data);
        }
        
      } catch (err) {
        setError('Failed to load data');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [campaignId]);

  // Set up periodic refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!campaignId) return;
      
      try {
        const matchesResponse = await getPublicDisplay(campaignId);
        if (matchesResponse.success && matchesResponse.data) {
          setMatches(matchesResponse.data);
        }
      } catch (err) {
        console.error('Refresh error:', err);
      }
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [campaignId]);

  // Scroll animation
  useEffect(() => {
    if (!scrollContainerRef.current || isPaused || matches.length === 0) return;
    
    const container = scrollContainerRef.current;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    if (maxScroll <= 0) return;
    
    let startTime: number | null = null;
    let startScroll: number | null = null;
    
    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
        startScroll = container.scrollTop;
      }
      
        const elapsed = timestamp - startTime;
        const progress = (elapsed % (scrollSpeed * 1000)) / (scrollSpeed * 1000);
        const easedProgress = progress < 0.5
          ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      container.scrollTop = startScroll! + easedProgress * maxScroll;
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, matches.length, scrollSpeed]);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleScrollSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrollSpeed(parseInt(e.target.value, 10));
  };

  if (isLoading) {
    return (
      <div className="public-display flex items-center justify-center">
        <div className="text-center text-white">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-xl">Loading public display...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="public-display flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">{error || 'Campaign not found'}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="public-display">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">CB</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Campus Buddies</h1>
              <p className="text-white/80">{campaign.city}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-white/80">Speed:</span>
              <input
                type="range"
                min="5"
                max="60"
                value={scrollSpeed}
                onChange={handleScrollSpeedChange}
                className="w-32 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-white/80">{scrollSpeed}s</span>
            </div>
            
            <button
              onClick={togglePause}
              className="btn btn-sm bg-white/20 text-white hover:bg-white/30"
            >
              {isPaused ? (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Resume
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 8a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V9a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Pause
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {matches.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4">No Matches Yet</h2>
              <p className="text-xl text-white/80">Waiting for the first matches to be generated...</p>
            </div>
          </div>
        ) : (
          <div 
            ref={scrollContainerRef}
            className="scrolling-container scrollbar-hide"
          >
            <div className="py-8 space-y-6">
              {matches.map((match, index) => (
                <div key={match.matchId} className="public-display-match">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-2xl font-bold text-white">Match #{index + 1}</h2>
                      <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                        Compatibility: {match.compatibilityScore}%
                      </span>
                    </div>
                    <MatchIllustration theme={match.nicknameTheme} />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {match.students.map((student, studentIndex) => (
                      <div key={studentIndex} className="bg-white/10 rounded-lg p-4">
                        <p className="public-display-nickname">{student.nickname}</p>
                        <p className="public-display-name">{student.firstName} {student.lastName}</p>
                        <p className="text-sm text-white/70 mt-2">
                          Arrived in {student.arrivalYear}
                        </p>
                        <div className="mt-3">
                          <p className="text-sm text-white/80 mb-2">Interests:</p>
                          <div className="flex flex-wrap gap-2">
                            {student.hobbies.map((hobby, hobbyIndex) => (
                              <span key={hobbyIndex} className="public-display-hobby">
                                {hobby}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-sm p-4">
        <div className="container mx-auto text-center text-white/80">
          <p>Campus Buddies - University Buddy Matching Platform</p>
          <p className="text-sm">
            Campaign: {campaign.city} | Created: {formatDateTime(campaign.createdAt)}
          </p>
        </div>
      </footer>
    </div>
  );
}
