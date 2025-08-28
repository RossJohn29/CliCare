// App.js - CLICARE Application with Updated Routing - Mobile Dashboard Integration
import React from 'react';
import './App.css';

// Mobile Patient Components
import MobilePatientLogin from './components/mobile/mobilepatientlogin';
import MobilePatientRegistration from './components/mobile/mobilepatientregistration';
import MobilePatientDashboard from './components/mobile/mobilepatientdashboard';
import MobileHealthAssessment from './components/mobile/mobilehealthassessment';

// Admin Components
import AdminLogin from './components/admin/adminlogin';
import AdminDashboard from './components/admin/admindashboard';

// Healthcare Components
import HealthcareLogin from './components/healthcare/healthcarelogin';
import HealthcareDashboard from './components/healthcare/healthcaredashboard';

// Terminal Components
import TerminalPatientLogin from './components/terminal/terminalpatientlogin';
import TerminalPatientRegistration from './components/terminal/terminalpatientregistration';

import { supabase } from './supabase';

// Simple Router Implementation (without react-router-dom)
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

  // Test Supabase connection
  const testSupabaseConnection = async () => {
    console.log('Testing Supabase connection...');
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

  // Landing Page Component
  const LandingPage = () => {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4285f4 0%, #1a73e8 50%, #1557b0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Poppins, sans-serif',
        padding: '15px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '30px 25px',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {/* Hospital Branding */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #4285f4, #1a73e8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.8em',
            fontWeight: '700',
            margin: '0 auto 15px auto',
            boxShadow: '0 6px 20px rgba(66, 133, 244, 0.25)'
          }}>
            🏥
          </div>
          
          <h1 style={{
            color: '#1557b0',
            fontSize: '2.4em',
            margin: '15px 0 5px 0',
            fontWeight: '800',
            letterSpacing: '-0.5px'
          }}>
            CLICARE
          </h1>
          
          <p style={{
            color: '#5f6368',
            fontSize: '1em',
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Digital Patient Management
          </p>
          
          <p style={{
            color: '#80868b',
            fontSize: '0.8em',
            marginBottom: '30px'
          }}>
            Pamantasan ng Lungsod ng Maynila
          </p>

          {/* Patient Access Section */}
          <div style={{ marginBottom: '25px' }}>
            <h2 style={{
              color: '#202124',
              fontSize: '1.4em',
              marginBottom: '20px',
              fontWeight: '600'
            }}>
              Patient Access Portal
            </h2>
            
            {/* Single Patient Button */}
            <button
              onClick={() => navigate('/mobile-patient-login')}
              style={{
                background: '#ffffff',
                border: '2px solid #e8eaed',
                borderRadius: '14px',
                padding: '18px 16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                textAlign: 'left',
                boxShadow: '0 3px 12px rgba(0, 0, 0, 0.06)',
                width: '100%',
                fontSize: '14px'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.borderColor = '#4285f4';
                e.target.style.boxShadow = '0 6px 20px rgba(66, 133, 244, 0.12)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.borderColor = '#e8eaed';
                e.target.style.boxShadow = '0 3px 12px rgba(0, 0, 0, 0.06)';
              }}
            >
              <div style={{
                fontSize: '2.2em',
                marginRight: '15px',
                background: 'linear-gradient(145deg, #e8f0fe, #d2e3fc)',
                padding: '10px',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                👤
              </div>
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <h3 style={{
                  margin: '0 0 3px 0',
                  color: '#202124',
                  fontSize: '1.1em',
                  fontWeight: '600'
                }}>
                  Patient
                </h3>
                <p style={{
                  color: '#4285f4',
                  margin: '0 0 3px 0',
                  fontSize: '0.9em',
                  fontWeight: '600'
                }}>
                  Mobile Access Portal
                </p>
                <small style={{
                  color: '#5f6368',
                  fontSize: '0.75em',
                  lineHeight: '1.3',
                  display: 'block'
                }}>
                  Login or register for new and returning patients
                </small>
              </div>
              <div style={{
                fontSize: '1.3em',
                color: '#dadce0',
                marginLeft: '10px',
                flexShrink: 0
              }}>
                →
              </div>
            </button>
          </div>

          {/* Staff Access Section */}
          <div style={{
            background: 'linear-gradient(145deg, #f8f9fa 0%, #f1f3f4 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #e8eaed'
          }}>
            <h3 style={{
              color: '#202124',
              fontSize: '1.1em',
              margin: '0 0 15px 0',
              fontWeight: '600'
            }}>
              Staff Access
            </h3>
            
            <div style={{
              display: 'flex',
              gap: '10px'
            }}>
              <button
                onClick={() => navigate('/admin-login')}
                style={{
                  background: 'linear-gradient(145deg, #4285f4 0%, #1a73e8 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 0.3s ease',
                  flex: 1,
                  textAlign: 'center',
                  boxShadow: '0 3px 8px rgba(66, 133, 244, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 5px 12px rgba(66, 133, 244, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 3px 8px rgba(66, 133, 244, 0.3)';
                }}
              >
                👨‍💼HealthAdmin
              </button>
              
              <button
                onClick={() => navigate('/healthcare-login')}
                style={{
                  background: 'linear-gradient(145deg, #34a853 0%, #137333 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 0.3s ease',
                  flex: 1,
                  textAlign: 'center',
                  boxShadow: '0 3px 8px rgba(52, 168, 83, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 5px 12px rgba(52, 168, 83, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 3px 8px rgba(52, 168, 83, 0.3)';
                }}
              >
                👨‍⚕️ HealthStaff
              </button>
              
              <button
                onClick={() => navigate('/terminal-patient-login')}
                style={{
                  background: 'linear-gradient(145deg, #ffc107 0%, #e0a800 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 0.3s ease',
                  flex: 1,
                  textAlign: 'center',
                  boxShadow: '0 3px 8px rgba(255, 193, 7, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 5px 12px rgba(255, 193, 7, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 3px 8px rgba(255, 193, 7, 0.3)';
                }}
              >
                🖥️ Kiosk
              </button>
            </div>
          </div>

          {/* Temporary Supabase Test Button */}
          <button
            onClick={testSupabaseConnection}
            style={{
              background: 'linear-gradient(145deg, #ea4335 0%, #d33b2c 100%)',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
              marginBottom: '15px',
              transition: 'all 0.3s ease'
            }}
          >
            🔗 Test Supabase Connection
          </button>


          {/* Footer */}
          <div style={{
            marginTop: '25px',
            paddingTop: '20px',
            borderTop: '1px solid #e8eaed'
          }}>
            <p style={{
              color: '#80868b',
              fontSize: '0.75em',
              margin: '0',
              lineHeight: '1.4'
            }}>
              🔒 Secure access • Need help? Call (02) 8123-4567
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Not Found Component
  const NotFound = () => {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4285f4 0%, #1a73e8 50%, #1557b0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Poppins, sans-serif',
        padding: '15px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '18px',
          padding: '30px 25px',
          textAlign: 'center',
          maxWidth: '350px',
          width: '100%',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.12)'
        }}>
          <h1 style={{ 
            color: '#1557b0', 
            fontSize: '3em', 
            margin: '0 0 15px 0',
            fontWeight: '800'
          }}>
            404
          </h1>
          <h2 style={{ 
            color: '#202124', 
            marginBottom: '10px',
            fontSize: '1.3em',
            fontWeight: '600'
          }}>
            Page Not Found
          </h2>
          <p style={{ 
            color: '#5f6368', 
            marginBottom: '25px',
            fontSize: '0.9em',
            lineHeight: '1.4'
          }}>
            The page you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(145deg, #4285f4 0%, #1a73e8 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 20px rgba(66, 133, 244, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  };

  // Route rendering logic
  const renderCurrentRoute = () => {

    switch (currentRoute) {
      case '/':
        return <LandingPage />;
      
      // Mobile Patient Routes
      case '/mobile-patient-login':
        return <MobilePatientLogin />;
      case '/mobile-patient-register':
        return <MobilePatientRegistration />;
      // In app.js - Replace this case too:
      case '/mobile-patient-dashboard':
        // CHECK AUTH BEFORE RENDERING COMPONENT
        const patientToken = localStorage.getItem('patientToken'); 
        const patientId = localStorage.getItem('patientId');
        
        if (!patientToken || !patientId) {
          localStorage.clear();
          window.location.replace('/mobile-patient-login');
          return null;
        }

        // Simplified token check - don't parse JWT for now
        return <MobilePatientDashboard />;
      case '/mobile-health-assessment':
        return <MobileHealthAssessment />;
      
      // Admin Routes
      case '/admin-login':
        return <AdminLogin />;
      // In app.js - Replace this case in renderCurrentRoute():
      case '/admin-dashboard':
        const adminToken = localStorage.getItem('adminToken');
        const adminInfo = localStorage.getItem('adminInfo');
        
        if (!adminToken || !adminInfo) {
          localStorage.clear();
          window.location.replace('/admin-login');
          return null;
        }

    return <AdminDashboard />;
      // Healthcare Routes (Doctor Only)
      case '/healthcare-login':
        return <HealthcareLogin />;
      // In app.js - Replace this case too:
      case '/healthcare-dashboard':
        const healthcareToken = localStorage.getItem('healthcareToken');
        const staffInfo = localStorage.getItem('staffInfo');         
        
        if (!healthcareToken || !staffInfo) {
          localStorage.clear();
          window.location.replace('/healthcare-login');
          return null;
        }

        // Simplified - let HealthcareDashboard handle detailed validation
        return <HealthcareDashboard />;

      // Terminal Routes
      case '/terminal-patient-login':
        return <TerminalPatientLogin />;
      case '/terminal-patient-registration':
        return <TerminalPatientRegistration />;
      
      // Legacy redirects for backward compatibility
      case '/patient-login':
        navigate('/mobile-patient-login');
        return <MobilePatientLogin />;
      case '/patient-register':
        navigate('/mobile-patient-register');
        return <MobilePatientRegistration />;
      case '/terminal-kiosk':
        // Redirect old terminal-kiosk route to terminal-patient-login
        navigate('/terminal-patient-login');
        return <TerminalPatientLogin />;
      
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