// App.js
import React from 'react';
import './App.css';

// Web Patient Components
import WebLogin from './components/web/weblogin';
import WebRegistration from './components/web/webregistration';
import WebMain from './components/web/webmain';
import WebAppointment from './components/web/webappointment';

// Admin Components
import AdminLogin from './components/admin/adminlogin';
import AdminMain from './components/admin/adminmain';

// Healthcare Components
import StaffLogin from './components/healthcare/stafflogin';
import StaffMain from './components/healthcare/staffmain';

// Kiosk Components
import KioskLogin from './components/kiosk/kiosklogin';
import KioskRegistration from './components/kiosk/kioskregistration';

// Queue Display Component (NEW)
import QueueDisplay from './components/queue/QueueDisplay';

import { supabase } from './supabase';

const App = () => {
  const [currentRoute, setCurrentRoute] = React.useState(
    window.location.pathname || '/'
  );

  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path);
  };

  // Auth Protection Helper
  const requireAuth = (tokenKey, infoKey, loginPath) => {
    const token = localStorage.getItem(tokenKey);
    const info = localStorage.getItem(infoKey);
    
    if (!token || !info) {
      localStorage.clear();
      window.location.replace(loginPath);
      return false;
    }
    return true;
  };

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('outPatient').select('count');
      if (error) {
        console.log('Supabase connection error:', error);
      } else {
        console.log('Supabase connected successfully!', data);
      }
    } catch (err) {
      console.log('Connection test failed:', err);
    }
  };

  const LandingPage = () => {
    return (
      <div className="landing-page">
        <div className="landing-container">
          
          <h1 className="landing-title">CliCare</h1>

          <div className="patient-access-section">
            <h3 className="section-title">Patient Access</h3>
              
            <div className="patient-buttons">
              <button
                onClick={() => navigate('/web-login')}
                className="patient-btn patient-btn-mobile"
              >
                👤 Mobile Patient
              </button>
                
              <button
                onClick={() => navigate('/kiosk-login')}
                className="patient-btn patient-btn-kiosk"
              >
                🖥️ Kiosk Patient
              </button>
              
            </div>
          </div>

          <div className="staff-access-section">
            <h3 className="section-title">Staff Access</h3>
            
            <div className="staff-buttons">
              <button
                onClick={() => navigate('/admin-login')}
                className="staff-btn staff-btn-admin"
              >
                👨‍💼 HealthAdmin
              </button>
              
              <button
                onClick={() => navigate('/staff-login')}
                className="staff-btn staff-btn-healthcare"
              >
                👨‍⚕️ HealthStaff
              </button>
            
            </div>
          </div>

          <div className="footer-info">
            <p>🔒 Secure access • Need help? Call (02) 8123-4567</p>
          </div>
        </div>
      </div>
    );
  };

  const NotFound = () => {
    return (
      <div className="not-found-page">
        <div className="not-found-container">
          <h1 className="not-found-title">404</h1>
          <h2 className="not-found-subtitle">Page Not Found</h2>
          <p className="not-found-description">
            The page you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate('/')}
            className="back-home-btn"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentRoute = () => {
    // Handle dynamic queue display routes (e.g., /queue-display/3)
    if (currentRoute.startsWith('/queue-display/')) {
      const departmentId = currentRoute.split('/').pop();
      return <QueueDisplay departmentId={departmentId} />;
    }

    switch (currentRoute) {
      case '/':
        return <LandingPage />;
      
      case '/web-login':
        return <WebLogin />;
      case '/web-registration':
        return <WebRegistration />;
      case '/web-main':
        if (!requireAuth('patientToken', 'patientId', '/web-login')) return null;
        return <WebMain />;
      case '/web-appointment':
        return <WebAppointment/>;
      
      case '/admin-login':
        return <AdminLogin />;
      case '/admin-main':
        if (!requireAuth('adminToken', 'adminInfo', '/admin-login')) return null;
        return <AdminMain />;
      
      case '/staff-login':
        return <StaffLogin />;
      case '/staff-main':
        if (!requireAuth('healthcareToken', 'staffInfo', '/staff-login')) return null;
        return <StaffMain />;

      case '/kiosk-login':
        return <KioskLogin />;
      case '/kiosk-registration':
        return <KioskRegistration />;
      
      // Legacy redirects
      case '/patient-login':
        navigate('/web-login');
        return <WebLogin />;
      case '/patient-register':
        navigate('/web-registration');
        return <WebRegistration />;
      case '/terminal-kiosk':
        navigate('/kiosk-login');
        return <KioskLogin />;
      
      default:
        return <NotFound />;
    }
  };

  return (
    <div className="App">
      {renderCurrentRoute()}
    </div>
  );
};

export default App;