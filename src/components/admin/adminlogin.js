// adminlogin.js - CLICARE Admin Login Component
import React, { useState } from 'react';
import './adminlogin.css';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({
    adminId: '',
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
      if (!credentials.adminId || !credentials.password) {
        setError('Please enter both Admin ID and password');
        setLoading(false);
        return;
      }

      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock admin validation
      const validAdmins = {
        'ADMIN001': 'admin123',
        'ADMIN002': 'admin456',
        'ADMIN999': 'superadmin'
      };
      
      if (!validAdmins[credentials.adminId.toUpperCase()]) {
        setError('Invalid Admin ID. Try: ADMIN001, ADMIN002, or ADMIN999');
        setLoading(false);
        return;
      }

      if (validAdmins[credentials.adminId.toUpperCase()] !== credentials.password) {
        setError('Incorrect password. Try: admin123, admin456, or superadmin');
        setLoading(false);
        return;
      }

      // Mock successful login
      sessionStorage.setItem('adminToken', 'mock_admin_token_' + credentials.adminId);
      sessionStorage.setItem('adminId', credentials.adminId.toUpperCase());
      alert('🎉 Login successful! Redirecting to admin dashboard...');
      
      // Redirect to admin dashboard
      window.location.href = '/admin-dashboard';
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
    alert('🔒 Password reset request sent to IT department.\n\nFor immediate assistance, contact:\nIT Support: (02) 8123-4567 ext. 100');
  };

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <div className="admin-logo">🏥</div>
        <h1>CLICARE</h1>
        <p>Hospital Administration Portal</p>
      </div>
      
      <div className="admin-content">
        <div className="admin-card">
          <div className="admin-form-header">
            <div className="admin-indicator">
              <span className="admin-icon">👨‍💼</span>
            </div>
            <h2>Administrator Login</h2>
            <p>Secure access to hospital management system</p>
          </div>

          {error && <div className="admin-error">⚠️ {error}</div>}

          <div className="admin-login-form">
            <div className="admin-input-group">
              <label htmlFor="adminId">Administrator ID *</label>
              <div className="admin-input-wrapper">
                <span className="admin-input-icon">🆔</span>
                <input
                  type="text"
                  id="adminId"
                  name="adminId"
                  value={credentials.adminId}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter Administrator ID"
                  className="admin-form-input"
                  required
                  autoComplete="username"
                />
              </div>
              <small className="admin-input-hint">Format: ADMIN001, ADMIN002, etc.</small>
            </div>

            <div className="admin-input-group">
              <label htmlFor="password">Password *</label>
              <div className="admin-input-wrapper">
                <span className="admin-input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password"
                  className="admin-form-input"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="admin-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="admin-form-options">
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={credentials.rememberMe}
                  onChange={handleInputChange}
                />
                <span className="admin-checkmark"></span>
                Remember me for 30 days
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="admin-forgot-password"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading || !credentials.adminId || !credentials.password}
              className="admin-login-btn"
            >
              {loading ? (
                <>
                  <span className="admin-loading-spinner"></span>
                  Authenticating...
                </>
              ) : (
                <>🔐 Secure Login</>
              )}
            </button>
          </div>

          <div className="admin-security-info">
            <h3>🛡️ Security Notice</h3>
            <ul className="admin-security-list">
              <li>This portal is for authorized hospital administrators only</li>
              <li>All access attempts are logged and monitored</li>
              <li>Sessions expire after 60 minutes of inactivity</li>
              <li>Use strong passwords and never share credentials</li>
            </ul>
          </div>

          <div className="admin-help-section">
            <h3>📞 Need Help?</h3>
            <div className="admin-contact-grid">
              <div className="admin-contact-item">
                <strong>IT Support</strong>
                <p>(02) 8123-4567 ext. 100</p>
                <small>Mon-Fri, 7AM-7PM</small>
              </div>
              <div className="admin-contact-item">
                <strong>Emergency Access</strong>
                <p>(02) 8123-4567 ext. 911</p>
                <small>24/7 Emergency Support</small>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-navigation-links">
          <button 
            onClick={() => window.location.href = '/'}
            className="admin-nav-btn secondary"
          >
            ← Back to Main Portal
          </button>
          <button 
            onClick={() => window.location.href = '/healthcare-login'}
            className="admin-nav-btn secondary"
          >
            Healthcare Staff Login →
          </button>
        </div>
      </div>

      <div className="admin-footer">
        <p>🔒 Secured by CLICARE • Pamantasan ng Lungsod ng Maynila</p>
        <p>For technical support: itsupport@plm.edu.ph</p>
      </div>
    </div>
  );
};

export default AdminLogin;