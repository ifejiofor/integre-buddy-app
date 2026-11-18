import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { getCampaign } from '../services/api';
import { formatDateTime, formatRemainingTime } from '../utils/date';
import { Campaign } from '../types';

export default function CampaignSetupPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setIsLoading(true);
        const response = await getCampaign(campaignId!);
        
        if (response.success && response.data) {
          setCampaign(response.data);
          
          // Generate QR code
          try {
            const qrCodeDataUrl = await QRCode.toDataURL(response.data.registrationUrl);
            setQrCodeUrl(qrCodeDataUrl);
          } catch (qrError) {
            console.error('Failed to generate QR code:', qrError);
            setError('Failed to generate QR code');
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

    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  const copyRegistrationUrl = async () => {
    if (campaign) {
      try {
        await navigator.clipboard.writeText(campaign.registrationUrl);
        // Could show a toast notification here
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  };

  const downloadPDF = async () => {
    if (!campaign || !qrCodeUrl) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const { jsPDF } = await import('jspdf');

      // Create a new PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // PDF dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add header
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246); // primary-600
      pdf.text('IntEGre Buddy App', pageWidth / 2, 30, { align: 'center' });

      // Add subtitle
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`University City: ${campaign.city}`, pageWidth / 2, 40, { align: 'center' });

      // Add main heading
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('SCAN TO FIND YOUR CAMPUS BUDDY!', pageWidth / 2, 60, { align: 'center' });

      // Add instruction
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const instruction = 'Scan this QR code with your phone to register for the buddy matching event.';
      const splitInstruction = pdf.splitTextToSize(instruction, pageWidth - 40);
      pdf.text(splitInstruction, pageWidth / 2, 70, { align: 'center' });

      // Calculate QR code size (max 120mm x 120mm)
      const qrSize = 100;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 90;

      // Add QR code image
      const img = new Image();
      img.src = qrCodeUrl;
      
      // Wait for image to load
      img.onload = () => {
        pdf.addImage(qrCodeUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        
        // Add URL below QR code
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const urlText = `Or visit: ${campaign.registrationUrl}`;
        const splitUrl = pdf.splitTextToSize(urlText, pageWidth - 40);
        pdf.text(splitUrl, pageWidth / 2, qrY + qrSize + 10, { align: 'center' });

        // Add expiration info
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        const expiryText = `This campaign expires on ${new Date(campaign.expiresAt).toLocaleDateString()}`;
        pdf.text(expiryText, pageWidth / 2, pageHeight - 20, { align: 'center' });

        // Add footer
        pdf.setFontSize(8);
        pdf.setTextColor(200, 200, 200);
        pdf.text('IntEGre Buddy App - University Buddy Matching Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Save the PDF
        const fileName = `integre-buddy-app-${campaign.city.toLowerCase().replace(/\s+/g, '-')}-${campaign.id}.pdf`;
        pdf.save(fileName);
        setIsGeneratingPDF(false);
      };
      
      img.onerror = () => {
        setIsGeneratingPDF(false);
        setError('Failed to generate PDF');
      };
    } catch (err) {
      setIsGeneratingPDF(false);
      setError('Failed to generate PDF');
      console.error('PDF generation error:', err);
    }
  };

  const goToAdminDashboard = () => {
    navigate(`/campaigns/${campaignId}/admin/dashboard`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-xl">Loading campaign setup...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center">
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
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-bold text-xl">CB</span>
            </div>
            <span className="text-white text-2xl font-bold">IntEGre Buddy App</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Campaign Setup Complete!</h1>
          <p className="text-white/90">Your campaign has been created successfully</p>
        </div>

        {/* Campaign Info Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">University City</p>
                  <p className="text-lg font-semibold text-gray-900">{campaign.city}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Campaign ID</p>
                  <p className="text-lg font-mono text-gray-900">{campaign.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Status</p>
                  <span className={`badge ${campaign.status === 'ACTIVE' ? 'badge-success' : campaign.status === 'EXPIRED' ? 'badge-danger' : 'badge-secondary'}`}>
                    {campaign.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Created</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDateTime(campaign.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Expires</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDateTime(campaign.expiresAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Time Remaining</p>
                  <p className="text-lg font-semibold text-primary-600">{formatRemainingTime(campaign.expiresAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">QR Code for Registration</h2>
          
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* QR Code */}
            <div className="flex-shrink-0">
              <div 
                ref={qrCodeRef}
                className="qr-container p-4"
              >
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="Registration QR Code" 
                    className="qr-code w-64 h-64"
                  />
                ) : (
                  <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">QR Code not available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Registration Info */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Registration URL</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-mono text-gray-800 break-all">{campaign.registrationUrl}</p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={copyRegistrationUrl}
                  className="btn btn-secondary"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy URL
                </button>
                
                <button
                  onClick={downloadPDF}
                  disabled={isGeneratingPDF || !qrCodeUrl}
                  className="btn btn-primary"
                >
                  {isGeneratingPDF ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Download PDF
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm text-primary-800">
                  <strong>Tip:</strong> Print this QR code on A4 paper and display it prominently at your event. 
                  Students can scan it with their phone to register.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Access Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Administrator Access</h2>
          <p className="text-gray-600 mb-6">
            Use your secret code to access the admin dashboard and manage the campaign.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={goToAdminDashboard}
              className="btn btn-primary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Go to Admin Dashboard
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Return to Home
            </button>
          </div>
        </div>

        {/* Public Display Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Public Display</h2>
          <p className="text-gray-600 mb-6">
            Access the public display interface for projecting match results on a large screen.
          </p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-mono text-gray-800 break-all">{campaign.displayUrl}</p>
          </div>
          
          <button
            onClick={() => {
              // Open in new tab
              window.open(campaign.displayUrl, '_blank');
            }}
            className="btn btn-accent"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Public Display
          </button>
        </div>
      </div>
    </div>
  );
}
