import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import './styles/index.css'

// Import all pages
import LandingPage from './pages/LandingPage'
import CampaignCreationPage from './pages/CampaignCreationPage'
import CampaignSetupPage from './pages/CampaignSetupPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import StudentRegistrationPage from './pages/StudentRegistrationPage'
import RegistrationConfirmationPage from './pages/RegistrationConfirmationPage'
import StudentResultPage from './pages/StudentResultPage'
import PublicDisplayPage from './pages/PublicDisplayPage'
import NotFoundPage from './pages/NotFoundPage'
import CampaignExpiredPage from './pages/CampaignExpiredPage'

// Import service worker registration
import { configureApi } from './services/api'

// Configure API
configureApi();

// Service worker registration for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          {/* Public routes */}
          <Route index element={<LandingPage />} />
          <Route path="create" element={<CampaignCreationPage />} />
          <Route path="campaigns/:campaignId/setup" element={<CampaignSetupPage />} />
          <Route path="campaigns/:campaignId/register" element={<StudentRegistrationPage />} />
          <Route path="campaigns/:campaignId/confirmation" element={<RegistrationConfirmationPage />} />
          <Route path="campaigns/:campaignId/results/:token" element={<StudentResultPage />} />
          <Route path="campaigns/:campaignId/display" element={<PublicDisplayPage />} />
          
          {/* Admin routes */}
          <Route path="campaigns/:campaignId/admin/login" element={<AdminLoginPage />} />
          <Route path="campaigns/:campaignId/admin/dashboard" element={<AdminDashboardPage />} />
          
          {/* Error pages */}
          <Route path="campaigns/:campaignId/expired" element={<CampaignExpiredPage />} />
          
          {/* Fallback */}
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
