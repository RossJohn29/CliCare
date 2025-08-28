// healthcarelogin.js - CLICARE Healthcare Login Component (Doctor Only)
import React, { useState, useEffect } from 'react';
import './healthcarelogin.css';

const HealthcareLogin = () => {
  const [credentials, setCredentials] = useState({
    staffId: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Add this useEffect after the existing useState declarations
  useEffect(() => {
    // Check for stored login error first
    const storedError = localStorage.getItem('loginError');
    if (storedError) {
      setError(storedError);
      localStorage.removeItem('loginError'); // Clear it after showing
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredentials({
      ...credentials,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error when user starts typing
    if (error) {
      setError('');
      localStorage.removeItem('loginError'); // Also clear stored error
    }
  };

  const handleLogin = async () => {
  setLoading(true);
  setError('');

    try {
      // Validate inputs
      if (!credentials.staffId || !credentials.password) {
        setError('Healthcare Staff ID is required');
        setLoading(false);
        return;
      }

      // Make API request to backend
      const response = await fetch('http://localhost:5000/api/healthcare/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          staffId: credentials.staffId.toUpperCase(),
          password: credentials.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Store error in localStorage so it persists after page reload
        localStorage.setItem('loginError', data.error || 'Login failed. Please check your credentials.');
        
        // Force page reload
        window.location.reload();
        return;
      }

      // Store authentication data
      localStorage.setItem('healthcareToken', data.token);        
      localStorage.setItem('staffId', data.staff.staff_id);      
      localStorage.setItem('staffType', data.staff.role.toLowerCase());
      localStorage.setItem('staffInfo', JSON.stringify(data.staff));

      // Redirect to healthcare dashboard
      window.location.href = '/healthcare-dashboard';

    } catch (err) {
      console.error('Login error:', err);
      
      // Store error in localStorage so it persists after page reload
      localStorage.setItem('loginError', 'Connection error. Please check your internet and try again.');
      
      // Force page reload
      window.location.reload();
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleForgotPassword = () => {
    alert('🔒 Password reset request sent to IT department.\n\nFor immediate assistance, contact:\nIT Support: (02) 8123-4567 ext. 100\nMedical Office: ext. 200');
  };

  return (
    <div className="healthcare-portal">
      <div className="healthcare-header">
        <div className="healthcare-logo">🏥</div>
        <h1>CLICARE</h1>
        <p>Healthcare Staff Portal</p>
      </div>
      
      <div className="healthcare-content">
        <div className="healthcare-card">
          <div className="healthcare-form-header">
            <div className="healthcare-indicator">
              <span className="healthcare-icon"><i class="fa-regular fa-user"></i></span>
            </div>
            <h2>Healthcare Staff Login</h2>
            <p>Secure access to patient management system</p>
          </div>

          {error && <div className="healthcare-error">{error}</div>}

          <div className="healthcare-login-form">
            <div className="healthcare-input-group">
              <label htmlFor="staffId">Healthcare Staff ID</label>
              <div className="healthcare-input-wrapper">
                <span className="healthcare-input-icon"><i class="fa-solid fa-user"></i></span>
                <input
                  type="text"
                  id="staffId"
                  name="staffId"
                  value={credentials.staffId}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter Healthcare Staff ID"
                  className="healthcare-form-input"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
              <small className="healthcare-input-hint">Use your healthcare staff ID</small>
            </div>

            <div className="healthcare-input-group">
              <label htmlFor="password">Password</label>
              <div className="healthcare-input-wrapper">
                <span className="healthcare-input-icon"><i class="fa-solid fa-lock"></i></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password"
                  className="healthcare-form-input"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="healthcare-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <i className="fa-solid fa-eye"></i> : <i className="fa-solid fa-eye-slash"></i>}
                </button>
              </div>
            </div>

            <div className="healthcare-form-options">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="healthcare-forgot-password"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="healthcare-login-btn"
            >
              Sign In
            </button>
          </div>
        </div>
        
        <div className="healthcare-help-section">
            <h3><i className="fa-solid fa-phone"></i> Need Help?</h3>
            <div className="healthcare-contact-grid">
              <div className="healthcare-contact-item">
                <strong>IT Support</strong>
                <p>(02) 8123-4567 ext. 100</p>
                <small>Mon-Fri, 7AM-7PM</small>
              </div>
              <div className="healthcare-contact-item">
                <strong>Medical Office</strong>
                <p>(02) 8123-4567 ext. 200</p>
                <small>24/7 Support</small>
              </div>
            </div>
          </div>
      </div>

      <div className="healthcare-footer">
        <p>🔒 Secured by CLICARE • Pamantasan ng Lungsod ng Maynila</p>
        <p>For technical support: itsupport@plm.edu.ph</p>
      </div>
    </div>
  );
};

export default HealthcareLogin;