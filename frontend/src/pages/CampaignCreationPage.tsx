import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateCampaignCreation } from '../utils/validation';
import { generateSecretCode } from '../utils/crypto';
import { createCampaign } from '../services/api';
import { CampaignCreationRequest } from '../types';

export default function CampaignCreationPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    city: '',
    secretCode: '',
    secretCodeConfirmation: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Generate a secure secret code on mount
  useEffect(() => {
    const secret = generateSecretCode();
    setFormData(prev => ({ ...prev, secretCode: secret, secretCodeConfirmation: secret }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateCampaignCreation(
      formData.city,
      formData.secretCode,
      formData.secretCodeConfirmation
    );
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const request: CampaignCreationRequest = {
        city: formData.city.trim(),
        secretCode: formData.secretCode,
        secretCodeConfirmation: formData.secretCodeConfirmation,
      };
      
      const response = await createCampaign(request);
      
      if (response.success && response.data) {
        // Navigate to setup page with campaign data
        navigate(`/campaigns/${response.data.campaign.id}/setup`);
      } else {
        setErrors(prev => ({ ...prev, form: response.error || 'Failed to create campaign' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, form: 'Network error. Please try again.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateNewSecret = () => {
    const secret = generateSecretCode();
    setFormData(prev => ({ ...prev, secretCode: secret, secretCodeConfirmation: secret }));
    setShowSecret(false);
  };

  const toggleShowSecret = () => {
    setShowSecret(!showSecret);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formData.secretCode);
    // Could add a toast notification here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-bold text-xl">CB</span>
            </div>
            <span className="text-white text-2xl font-bold">IntEGre Buddy App</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create a Campaign</h1>
          <p className="text-white/90">Set up a new buddy matching campaign for your university city</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {errors.form && (
            <div className="alert alert-danger mb-6">
              {errors.form}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* City Field */}
            <div>
              <label htmlFor="city" className="label label-required">
                University City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter the university city name"
                className={`input ${errors.city ? 'input-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.city && <p className="error-message">{errors.city}</p>}
            </div>

            {/* Secret Code Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="secretCode" className="label label-required">
                  Campaign Secret Code
                </label>
                <button
                  type="button"
                  onClick={handleGenerateNewSecret}
                  className="btn btn-sm btn-ghost text-primary-600"
                  disabled={isSubmitting}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20L20 4" />
                  </svg>
                  Regenerate
                </button>
              </div>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  id="secretCode"
                  name="secretCode"
                  value={formData.secretCode}
                  onChange={handleChange}
                  placeholder="Enter a strong secret code"
                  className={`input pr-12 ${errors.secretCode ? 'input-error' : ''}`}
                  disabled={isSubmitting}
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
              <div className="flex items-center mt-2">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="btn btn-sm btn-ghost text-primary-600"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
                <span className="text-sm text-gray-500 ml-2">Keep this secure!</span>
              </div>
              {errors.secretCode && <p className="error-message">{errors.secretCode}</p>}
            </div>

            {/* Confirm Secret Code Field */}
            <div>
              <label htmlFor="secretCodeConfirmation" className="label label-required">
                Confirm Secret Code
              </label>
              <input
                type={showSecret ? 'text' : 'password'}
                id="secretCodeConfirmation"
                name="secretCodeConfirmation"
                value={formData.secretCodeConfirmation}
                onChange={handleChange}
                placeholder="Re-enter the secret code"
                className={`input ${errors.secretCodeConfirmation ? 'input-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.secretCodeConfirmation && (
                <p className="error-message">{errors.secretCodeConfirmation}</p>
              )}
            </div>

            {/* Secret Code Info */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className="text-sm text-primary-800">
                    <strong>Important:</strong> This secret code is your administrator password. 
                    Keep it secure and don't share it with anyone. You'll need it to access 
                    the admin dashboard and manage the campaign.
                  </p>
                </div>
              </div>
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
                    Creating Campaign...
                  </>
                ) : (
                  'Create Campaign'
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
          <p>Need help? Contact support or check our documentation</p>
        </div>
      </div>
    </div>
  );
}
