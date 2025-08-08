// healthcarelogin.js - CLICARE Healthcare Login Component (Doctor Only)
import React, { useState } from 'react';
import './healthcarelogin.css';

const HealthcareLogin = () => {
  const [credentials, setCredentials] = useState({
    staffId: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredentials({
      ...credentials,
      [name]: type === 'checkbox' ? checked : value
    });
    setError('');
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!credentials.staffId || !credentials.password) {
        setError('Please enter both Doctor ID and password');
        setLoading(false);
        return;
      }

      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock doctor validation - only doctors allowed
      const validDoctors = {
        'DR001': 'doctor123',
        'DR002': 'doctor456'
      };
      
      if (!validDoctors[credentials.staffId.toUpperCase()]) {
        setError('Invalid Doctor ID. Try: DR001 or DR002');
        setLoading(false);
        return;
      }

      if (validDoctors[credentials.staffId.toUpperCase()] !== credentials.password) {
        setError('Incorrect password. Try: doctor123 or doctor456');
        setLoading(false);
        return;
      }

      // Mock successful login - only set doctor type
      sessionStorage.setItem('healthcareToken', 'mock_healthcare_token_' + credentials.staffId);
      sessionStorage.setItem('staffId', credentials.staffId.toUpperCase());
      sessionStorage.setItem('staffType', 'doctor');
      
      alert('🎉 Login successful! Redirecting to healthcare dashboard...');
      
      // Redirect to healthcare dashboard
      window.location.href = '/healthcare-dashboard';
    } catch (err) {
      setError('Connection error. Please check your internet and try again.');
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
        <p>Doctor Portal</p>
      </div>
      
      <div className="healthcare-content">
        <div className="healthcare-card">
          <div className="healthcare-form-header">
            <div className="healthcare-indicator">
              <span className="healthcare-icon">👨‍⚕️</span>
            </div>
            <h2>Doctor Login</h2>
            <p>Secure access to patient management system</p>
          </div>

          {error && <div className="healthcare-error">⚠️ {error}</div>}

          <div className="healthcare-login-form">
            <div className="healthcare-input-group">
              <label htmlFor="staffId">Doctor ID *</label>
              <div className="healthcare-input-wrapper">
                <span className="healthcare-input-icon">🆔</span>
                <input
                  type="text"
                  id="staffId"
                  name="staffId"
                  value={credentials.staffId}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter Doctor ID"
                  className="healthcare-form-input"
                  required
                  autoComplete="username"
                />
              </div>
              <small className="healthcare-input-hint">Format: DR001, DR002, etc.</small>
            </div>

            <div className="healthcare-input-group">
              <label htmlFor="password">Password *</label>
              <div className="healthcare-input-wrapper">
                <span className="healthcare-input-icon">🔒</span>
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
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="healthcare-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="healthcare-form-options">
              <label className="healthcare-checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={credentials.rememberMe}
                  onChange={handleInputChange}
                />
                <span className="healthcare-checkmark"></span>
                Remember me for 12 hours
              </label>

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
              disabled={loading || !credentials.staffId || !credentials.password}
              className="healthcare-login-btn"
            >
              {loading ? (
                <>
                  <span className="healthcare-loading-spinner"></span>
                  Authenticating...
                </>
              ) : (
                <>🩺 Doctor Login</>
              )}
            </button>
          </div>

          <div className="healthcare-help-section">
            <h3>📞 Need Help?</h3>
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

        <div className="healthcare-navigation-links">
          <button 
            onClick={() => window.location.href = '/'}
            className="healthcare-nav-btn secondary"
          >
            ← Back to Main Portal
          </button>
          <button 
            onClick={() => window.location.href = '/admin-login'}
            className="healthcare-nav-btn secondary"
          >
            Admin Login →
          </button>
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