import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateCampaignId } from '../utils/crypto';

// Simple illustration component for the landing page
const CampusIllustration = () => (
  <div className="relative w-64 h-64 mx-auto mb-8">
    {/* Simple SVG illustration of students */}
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Background circle */}
      <circle cx="100" cy="100" r="90" fill="url(#gradient1)" opacity="0.1" />
      
      {/* Students */}
      {/* Student 1 */}
      <circle cx="60" cy="80" r="15" fill="#3b82f6" />
      <circle cx="60" cy="70" r="8" fill="#fbbf24" />
      <rect x="55" y="90" width="10" height="20" fill="#3b82f6" rx="2" />
      
      {/* Student 2 */}
      <circle cx="140" cy="80" r="15" fill="#8b5cf6" />
      <circle cx="140" cy="70" r="8" fill="#fbbf24" />
      <rect x="135" y="90" width="10" height="20" fill="#8b5cf6" rx="2" />
      
      {/* Student 3 */}
      <circle cx="100" cy="140" r="15" fill="#ec4899" />
      <circle cx="100" cy="130" r="8" fill="#fbbf24" />
      <rect x="95" y="150" width="10" height="20" fill="#ec4899" rx="2" />
      
      {/* Connection lines */}
      <line x1="75" y1="85" x2="125" y2="85" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
      <line x1="75" y1="85" x2="95" y2="135" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5,5" />
      <line x1="125" y1="85" x2="95" y2="135" stroke="#ec4899" strokeWidth="2" strokeDasharray="5,5" />
      
      {/* Plus icon in center */}
      <circle cx="100" cy="100" r="20" fill="white" opacity="0.9" />
      <text x="100" y="105" textAnchor="middle" fontSize="16" fill="#3b82f6">+</text>
      
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

// Feature card component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="feature-card">
    <div className="feature-icon">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateCampaign = () => {
    setIsLoading(true);
    // Generate a temporary campaign ID for the creation flow
    const tempId = generateCampaignId();
    navigate(`/create?tempId=${tempId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-bold text-lg">CB</span>
            </div>
            <span className="text-white text-xl font-bold">Campus Buddies</span>
          </div>
          <button
            onClick={handleCreateCampaign}
            disabled={isLoading}
            className="btn btn-white text-primary-600 hover:bg-gray-100"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create a Campaign'
            )}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="hero-pattern absolute inset-0"></div>
        <div className="relative">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
            Find Your Campus Buddy
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in">
            Connect with fellow students at university welcome events. 
            Our intelligent matching system pairs you with compatible buddies based on shared interests.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up">
            <button
              onClick={handleCreateCampaign}
              disabled={isLoading}
              className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create a Campaign'
              )}
            </button>
            <button
              onClick={() => navigate('/create')}
              className="btn btn-lg btn-outline text-white border-white hover:bg-white/10"
            >
              Learn More
            </button>
          </div>
          
          <CampusIllustration />
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple, fast, and privacy-focused buddy matching for university events
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>}
              title="Create a Campaign"
              description="Set up a new buddy matching campaign for your university city in minutes."
            />
            
            <FeatureCard
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>}
              title="Easy Registration"
              description="Students scan a QR code and register with just their name, year, and hobbies."
            />
            
            <FeatureCard
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>}
              title="Smart Matching"
              description="Our algorithm pairs students based on arrival year and hobby compatibility."
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Campus Buddies?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Designed specifically for university welcome events
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">No Accounts Needed</h3>
              <p className="text-sm text-gray-600">Students register with just a QR code scan, no email or password required</p>
            </div>
            
            <div className="card text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">24-Hour Privacy</h3>
              <p className="text-sm text-gray-600">All data is automatically deleted after 24 hours for complete privacy</p>
            </div>
            
            <div className="card text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Real-Time Updates</h3>
              <p className="text-sm text-gray-600">See new registrations and matches as they happen in the admin dashboard</p>
            </div>
            
            <div className="card text-center">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Free & Open Source</h3>
              <p className="text-sm text-gray-600">No paid APIs or subscriptions, runs on free Cloudflare services</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary-600 to-purple-700 py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Create your first Campus Buddies campaign and start matching students today.
          </p>
          <button
            onClick={handleCreateCampaign}
            disabled={isLoading}
            className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create a Campaign'
            )}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-6 text-center">
          <p>Built with ❤️ for university communities</p>
          <p className="text-sm mt-2">© {new Date().getFullYear()} Campus Buddies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
