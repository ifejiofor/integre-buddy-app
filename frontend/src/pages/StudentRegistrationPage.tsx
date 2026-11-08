import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  validateStudentRegistration,
  validateName,
  validateArrivalYear,
  validateHobbies,
  validateConsent,
  validateCustomHobby
} from '../utils/validation';
import { getCampaign, registerStudent, storeStudentResultToken } from '../services/api';
import { getCurrentYear, getArrivalYears, isNewStudent } from '../utils/date';
import { deduplicateHobbies, PREDEFINED_HOBBIES } from '../types';
import { Campaign, StudentRegistrationRequest, PRIVACY_NOTICE_TEXT, PRIVACY_NOTICE_VERSION } from '../types';

export default function StudentRegistrationPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    arrivalYear: getCurrentYear(),
    selectedHobbies: new Set<string>(),
    customHobby: '',
    consentGiven: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  // Fetch campaign details
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) return;
      
      try {
        setIsLoading(true);
        const response = await getCampaign(campaignId);
        
        if (response.success && response.data) {
          // Check if campaign is expired
          if (response.data.status === 'EXPIRED') {
            navigate(`/campaigns/${campaignId}/expired`);
            return;
          }
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
  }, [campaignId, navigate]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'selectedHobbies') {
      // This shouldn't happen as we use individual checkboxes
    } else if (name === 'customHobby') {
      setFormData(prev => ({ ...prev, customHobby: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleHobbyToggle = (hobbyName: string) => {
    setFormData(prev => {
      const newHobbies = new Set(prev.selectedHobbies);
      if (newHobbies.has(hobbyName)) {
        newHobbies.delete(hobbyName);
      } else {
        newHobbies.add(hobbyName);
      }
      return { ...prev, selectedHobbies: newHobbies };
    });
    
    // Clear hobby error
    if (errors.hobbies) {
      setErrors(prev => ({ ...prev, hobbies: '' }));
    }
  };

  const handleCustomHobbyAdd = () => {
    const hobby = formData.customHobby.trim();
    if (!hobby) return;
    
    const validation = validateCustomHobby(hobby);
    if (!validation.valid) {
      setErrors(prev => ({ ...prev, customHobby: validation.error || '' }));
      return;
    }
    
    // Add custom hobby
    setFormData(prev => {
      const newHobbies = new Set(prev.selectedHobbies);
      newHobbies.add(hobby);
      return { ...prev, selectedHobbies: newHobbies, customHobby: '' };
    });
    
    setErrors(prev => ({ ...prev, customHobby: '', hobbies: '' }));
  };

  const handleCustomHobbyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomHobbyAdd();
    }
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: import.meta.env.VITE_PUSH_PUBLIC_KEY,
        });
        setPushSubscription(subscription);
      }
    } catch (err) {
      console.error('Failed to request push permission:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignId) return;

    // Validate form
    const validation = validateStudentRegistration(
      formData.firstName,
      formData.lastName,
      formData.arrivalYear,
      Array.from(formData.selectedHobbies),
      formData.consentGiven
    );
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    
    // Check if at least one hobby is selected
    if (formData.selectedHobbies.size === 0) {
      setErrors(prev => ({ ...prev, hobbies: 'Please select at least one hobby' }));
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Prepare hobbies
      const hobbies = deduplicateHobbies(Array.from(formData.selectedHobbies));
      
      const request: StudentRegistrationRequest = {
        campaignId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        arrivalYear: formData.arrivalYear,
        hobbies,
        consentGiven: formData.consentGiven,
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
        pushSubscription: pushPermission === 'granted' ? {
          endpoint: pushSubscription?.endpoint || '',
          keys: pushSubscription ? {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(pushSubscription.getKey('p256dh') as ArrayBuffer))),
            auth: btoa(String.fromCharCode(...new Uint8Array(pushSubscription.getKey('auth') as ArrayBuffer))),
          } : { p256dh: '', auth: '' },
        } : undefined,
      };
      
      const response = await registerStudent(campaignId, request);
      
      if (response.success && response.data) {
        // Store the result token for later access
        storeStudentResultToken(campaignId, response.data.resultUrlToken);
        
        // Navigate to confirmation page
        navigate(`/campaigns/${campaignId}/confirmation`);
      } else {
        setError(response.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const arrivalYears = getArrivalYears();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-xl">Loading registration...</p>
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
          <h2 className="text-2xl font-bold mb-4">Error Loading Campaign</h2>
          <p className="mb-6">{error || 'Campaign not found'}</p>
          <button onClick={() => navigate('/')} className="btn btn-white text-primary-600">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-bold text-xl">CB</span>
            </div>
            <span className="text-white text-2xl font-bold">Campus Buddies</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Student Registration</h1>
          <p className="text-white/90">Welcome to {campaign.city}!</p>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Error Message */}
          {error && (
            <div className="alert alert-danger mb-6">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="label label-required">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                  className={`input ${errors.firstName ? 'input-error' : ''}`}
                  disabled={isSubmitting}
                  autoComplete="given-name"
                  autoFocus
                />
                {errors.firstName && <p className="error-message">{errors.firstName}</p>}
              </div>
              
              <div>
                <label htmlFor="lastName" className="label label-required">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                  className={`input ${errors.lastName ? 'input-error' : ''}`}
                  disabled={isSubmitting}
                  autoComplete="family-name"
                />
                {errors.lastName && <p className="error-message">{errors.lastName}</p>}
              </div>
            </div>

            {/* Arrival Year */}
            <div>
              <label htmlFor="arrivalYear" className="label label-required">
                Year of Arrival in {campaign.city}
              </label>
              <select
                id="arrivalYear"
                name="arrivalYear"
                value={formData.arrivalYear}
                onChange={handleChange}
                className={`input ${errors.arrivalYear ? 'input-error' : ''}`}
                disabled={isSubmitting}
              >
                {arrivalYears.map(year => (
                  <option key={year} value={year}>
                    {year} {year === getCurrentYear() && '(New Student)'}
                  </option>
                ))}
              </select>
              {errors.arrivalYear && <p className="error-message">{errors.arrivalYear}</p>}
            </div>

            {/* Hobbies Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label label-required">
                  Hobbies and Interests
                </label>
                <span className="text-sm text-gray-500">
                  Select at least one
                </span>
              </div>
              
              {/* Predefined hobbies */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Select your hobbies (click to select/deselect):
                </p>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_HOBBIES.map(hobby => (
                    <button
                      type="button"
                      key={hobby.id}
                      onClick={() => handleHobbyToggle(hobby.name)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                        formData.selectedHobbies.has(hobby.name)
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                      disabled={isSubmitting}
                    >
                      {hobby.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom hobby */}
              <div className="flex gap-2">
                <input
                  type="text"
                  name="customHobby"
                  value={formData.customHobby}
                  onChange={handleChange}
                  onKeyDown={handleCustomHobbyKeyDown}
                  placeholder="Add a custom hobby..."
                  className={`input flex-1 ${errors.customHobby ? 'input-error' : ''}`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={handleCustomHobbyAdd}
                  className="btn btn-secondary"
                  disabled={isSubmitting || !formData.customHobby.trim()}
                >
                  Add
                </button>
              </div>
              {errors.customHobby && <p className="error-message">{errors.customHobby}</p>}
              {errors.hobbies && <p className="error-message">{errors.hobbies}</p>}

              {/* Selected hobbies preview */}
              {formData.selectedHobbies.size > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected:</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(formData.selectedHobbies).map(hobby => (
                      <span
                        key={hobby}
                        className="hobby-chip"
                      >
                        {hobby}
                        <button
                          type="button"
                          onClick={() => handleHobbyToggle(hobby)}
                          className="ml-1 text-xs hover:text-red-600"
                          disabled={isSubmitting}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Permission */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div>
                  <p className="text-sm text-primary-800">
                    <strong>Optional:</strong> Enable browser notifications to be alerted when your buddy is assigned.
                  </p>
                  {pushPermission === 'default' && (
                    <button
                      type="button"
                      onClick={requestPushPermission}
                      className="btn btn-sm btn-primary mt-2"
                      disabled={isSubmitting}
                    >
                      Enable Notifications
                    </button>
                  )}
                  {pushPermission === 'granted' && (
                    <p className="text-sm text-green-600 mt-1">Notifications enabled ✓</p>
                  )}
                  {pushPermission === 'denied' && (
                    <p className="text-sm text-gray-500 mt-1">Notifications blocked</p>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className={`border border-gray-200 rounded-lg p-4 ${errors.consent ? 'border-red-500' : ''}`}>
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="consentGiven"
                  name="consentGiven"
                  checked={formData.consentGiven}
                  onChange={handleChange}
                  className="checkbox-lg mt-1 mr-3 flex-shrink-0"
                  disabled={isSubmitting}
                />
                <div>
                  <label htmlFor="consentGiven" className="font-medium text-gray-900 cursor-pointer">
                    I have read and agree to the privacy notice
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPrivacyNotice(!showPrivacyNotice)}
                    className="btn btn-sm btn-ghost text-primary-600 ml-2"
                  >
                    {showPrivacyNotice ? 'Hide' : 'Show'}
                  </button>
                  
                  {showPrivacyNotice && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 whitespace-pre-line">{PRIVACY_NOTICE_TEXT}</p>
                    </div>
                  )}
                </div>
              </div>
              {errors.consent && <p className="error-message mt-2">{errors.consent}</p>}
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-lg btn-primary flex-1"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </>
                ) : (
                  'Register'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-lg btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white/70">
          <p>Questions? Contact the event organizer</p>
        </div>
      </div>
    </div>
  );
}
