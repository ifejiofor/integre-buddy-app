import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getDashboardStats, 
  getPendingStudents, 
  getMatchedStudents,
  getCampaign,
  adminLogout,
  getAdminSessionToken,
  clearAdminSessionToken,
  verifyAdminSession
} from '../services/api';
import { formatDateTime, formatRemainingTime, getCurrentYear } from '../utils/date';
import { Campaign, DashboardStats, Student, StudentStatus } from '../types';
import { getStudentType } from '../utils/matching';

export default function AdminDashboardPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [matchedStudents, setMatchedStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'matched'>('overview');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Verify admin session
  useEffect(() => {
    const verifySession = async () => {
      if (!campaignId) return;
      
      const token = getAdminSessionToken(campaignId);
      if (!token) {
        navigate(`/campaigns/${campaignId}/admin/login`);
        return;
      }
      
      const response = await verifyAdminSession(campaignId);
      if (!response.success) {
        clearAdminSessionToken(campaignId);
        navigate(`/campaigns/${campaignId}/admin/login`);
      }
    };

    verifySession();
  }, [campaignId, navigate]);

  // Fetch initial data
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
          navigate(`/campaigns/${campaignId}/expired`);
          return;
        }
        
        // Fetch stats
        const statsResponse = await getDashboardStats(campaignId);
        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        }
        
        // Fetch pending students
        const pendingResponse = await getPendingStudents(campaignId);
        if (pendingResponse.success && pendingResponse.data) {
          setPendingStudents(pendingResponse.data.students);
        }
        
        // Fetch matched students
        const matchedResponse = await getMatchedStudents(campaignId);
        if (matchedResponse.success && matchedResponse.data) {
          setMatchedStudents(matchedResponse.data.students);
        }
        
      } catch (err) {
        setError('Failed to load data');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [campaignId, navigate]);

  // Set up polling
  useEffect(() => {
    if (campaignId) {
      const interval = setInterval(async () => {
        try {
          // Fetch stats
          const statsResponse = await getDashboardStats(campaignId);
          if (statsResponse.success && statsResponse.data) {
            setStats(statsResponse.data);
          }
          
          // Fetch pending students
          const pendingResponse = await getPendingStudents(campaignId);
          if (pendingResponse.success && pendingResponse.data) {
            setPendingStudents(pendingResponse.data.students);
          }
          
          // Fetch matched students
          const matchedResponse = await getMatchedStudents(campaignId);
          if (matchedResponse.success && matchedResponse.data) {
            setMatchedStudents(matchedResponse.data.students);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 5000); // Poll every 5 seconds
      
      setPollingInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [campaignId]);

  const handleLogout = async () => {
    if (!campaignId) return;
    
    try {
      await adminLogout(campaignId);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAdminSessionToken(campaignId);
      navigate(`/campaigns/${campaignId}/admin/login`);
    }
  };

  const handleGenerateMatches = () => {
    navigate(`/campaigns/${campaignId}/admin/matching`);
  };

  const handleViewPublicDisplay = () => {
    if (campaign) {
      window.open(campaign.displayUrl, '_blank');
    }
  };

  const getStudentTypeLabel = (student: Student): 'NEW' | 'OLD' => {
    return getStudentType(student);
  };

  const getStudentTypeBadge = (student: Student) => {
    const type = getStudentTypeLabel(student);
    return (
      <span className={`badge ${type === 'NEW' ? 'badge-success' : 'badge-secondary'}`}>
        {type}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error || 'Data not available'}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/campaigns/${campaignId}/setup`)}
                className="btn btn-sm btn-ghost"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Setup
              </button>
              
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">CB</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{campaign.city}</h1>
                  <p className="text-sm text-gray-500">Admin Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleViewPublicDisplay}
                className="btn btn-sm btn-outline"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Public Display
              </button>
              
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-secondary"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Campaign Status Alert */}
        {campaign.status === 'EXPIRED' && (
          <div className="alert alert-danger mb-6">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This campaign has expired. No further actions can be taken.
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="stat-label">Total Registered</h3>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="stat-value">{stats.totalRegistered}</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="stat-label">Matched</h3>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="stat-value text-green-600">{stats.totalMatched}</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="stat-label">Pending</h3>
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="stat-value text-yellow-600">{stats.totalPending}</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="stat-label">Time Remaining</h3>
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="stat-value text-primary-600">{formatRemainingTime(campaign.expiresAt)}</p>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Campaign Information</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Campaign ID</p>
              <p className="font-mono text-gray-900">{campaign.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Created</p>
              <p className="text-gray-900">{formatDateTime(campaign.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Expires</p>
              <p className="text-gray-900">{formatDateTime(campaign.expiresAt)}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Registration URL</p>
            <p className="font-mono text-gray-900 break-all">{campaign.registrationUrl}</p>
          </div>
        </div>

        {/* Matching Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Matching Controls</h2>
              <p className="text-gray-600">
                {stats.totalPending >= 2 
                  ? `There are ${stats.totalPending} pending students ready to be matched.`
                  : `You need at least 2 pending students to generate matches. Currently have ${stats.totalPending}.`}
              </p>
            </div>
            
            <button
              onClick={handleGenerateMatches}
              disabled={stats.totalPending < 2 || campaign.status !== 'ACTIVE'}
              className="btn btn-primary mt-4 md:mt-0"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Matches
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Pending Students ({pendingStudents.length})
              </button>
              <button
                onClick={() => setActiveTab('matched')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'matched' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Matched Students ({matchedStudents.length})
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Overview</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* New vs Old Students */}
                  <div className="card">
                    <h4 className="font-bold text-gray-900 mb-4">Student Distribution</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                          <span>New Students ({getCurrentYear()})</span>
                        </div>
                        <span className="font-semibold">{pendingStudents.filter(s => getStudentTypeLabel(s) === 'NEW').length + matchedStudents.filter(s => getStudentTypeLabel(s) === 'NEW').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                          <span>Old Students (Before {getCurrentYear()})</span>
                        </div>
                        <span className="font-semibold">{pendingStudents.filter(s => getStudentTypeLabel(s) === 'OLD').length + matchedStudents.filter(s => getStudentTypeLabel(s) === 'OLD').length}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Activity */}
                  <div className="card">
                    <h4 className="font-bold text-gray-900 mb-4">Recent Activity</h4>
                    <div className="space-y-3">
                      {pendingStudents.slice(0, 5).map(student => (
                        <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                            <p className="text-xs text-gray-500">Registered {formatDateTime(student.registeredAt)}</p>
                          </div>
                          {getStudentTypeBadge(student)}
                        </div>
                      ))}
                      {pendingStudents.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No recent registrations</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Students Tab */}
            {activeTab === 'pending' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Pending Students</h3>
                
                {pendingStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No pending students</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead className="table-header">
                        <tr>
                          <th className="table-header-cell">Name</th>
                          <th className="table-header-cell">Year</th>
                          <th className="table-header-cell">Type</th>
                          <th className="table-header-cell">Hobbies</th>
                          <th className="table-header-cell">Registered</th>
                        </tr>
                      </thead>
                      <tbody className="table-body">
                        {pendingStudents.map(student => (
                          <tr key={student.id} className="table-row">
                            <td className="table-cell">
                              <div className="font-medium">{student.firstName} {student.lastName}</div>
                            </td>
                            <td className="table-cell">{student.arrivalYear}</td>
                            <td className="table-cell">{getStudentTypeBadge(student)}</td>
                            <td className="table-cell">
                              <div className="flex flex-wrap gap-1">
                                {student.hobbies.slice(0, 3).map(hobby => (
                                  <span key={hobby} className="hobby-chip">{hobby}</span>
                                ))}
                                {student.hobbies.length > 3 && (
                                  <span className="hobby-chip">+{student.hobbies.length - 3} more</span>
                                )}
                              </div>
                            </td>
                            <td className="table-cell">{formatDateTime(student.registeredAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Matched Students Tab */}
            {activeTab === 'matched' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Matched Students</h3>
                
                {matchedStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No matches yet</p>
                    <p className="text-sm text-gray-400 mt-2">Generate matches to see results</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead className="table-header">
                        <tr>
                          <th className="table-header-cell">Name</th>
                          <th className="table-header-cell">Year</th>
                          <th className="table-header-cell">Type</th>
                          <th className="table-header-cell">Hobbies</th>
                          <th className="table-header-cell">Status</th>
                          <th className="table-header-cell">Registered</th>
                        </tr>
                      </thead>
                      <tbody className="table-body">
                        {matchedStudents.map(student => (
                          <tr key={student.id} className="table-row">
                            <td className="table-cell">
                              <div className="font-medium">{student.firstName} {student.lastName}</div>
                            </td>
                            <td className="table-cell">{student.arrivalYear}</td>
                            <td className="table-cell">{getStudentTypeBadge(student)}</td>
                            <td className="table-cell">
                              <div className="flex flex-wrap gap-1">
                                {student.hobbies.slice(0, 3).map(hobby => (
                                  <span key={hobby} className="hobby-chip">{hobby}</span>
                                ))}
                                {student.hobbies.length > 3 && (
                                  <span className="hobby-chip">+{student.hobbies.length - 3} more</span>
                                )}
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="badge badge-success">Matched</span>
                            </td>
                            <td className="table-cell">{formatDateTime(student.registeredAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500">
          <p>Campaign expires in {formatRemainingTime(campaign.expiresAt)}</p>
        </div>
      </footer>
    </div>
  );
}
