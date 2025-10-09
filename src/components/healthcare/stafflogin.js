// stafflogin.js
import React, { useState, useEffect } from 'react';
import './stafflogin.css';

const StaffLogin = () => {
  const [credentials, setCredentials] = useState({
    staffId: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    const storedError = localStorage.getItem('loginError');
    if (storedError) {
      setError(storedError);
      localStorage.removeItem('loginError');
    }
  }, []);

  // Event Handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredentials({
      ...credentials,
      [name]: type === 'checkbox' ? checked : value
    });

    if (showValidation) {
      setShowValidation(false);
      setFieldErrors({});
    }

    if (error) {
      setError('');
      localStorage.removeItem('loginError');
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

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    const stepErrors = {};
    
    if (!credentials.staffId.trim()) {
      stepErrors.staffId = 'Healthcare Staff ID is required';
    }
    
    if (!credentials.password.trim()) {
      stepErrors.password = 'Password is required';
    }
    
    setFieldErrors(stepErrors);
    setShowValidation(true);
    
    if (Object.keys(stepErrors).length > 0) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/staff/login', {
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
        localStorage.setItem('loginError', data.error || 'Login failed. Please check your credentials.');
        window.location.reload();
        return;
      }

      localStorage.setItem('healthcareToken', data.token);        
      localStorage.setItem('staffId', data.staff.staff_id);      
      localStorage.setItem('staffType', data.staff.role.toLowerCase());
      localStorage.setItem('staffInfo', JSON.stringify(data.staff));

      window.location.href = '/healthcare-dashboard';

    } catch (err) {
      console.error('Login error:', err);
      localStorage.setItem('loginError', 'Connection error. Please check your internet and try again.');
      window.location.reload();
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stafflogin-portal">
     
      <div className="stafflogin-content">
        <div className="stafflogin-card">
          <div className="stafflogin-form-header">
            <div className="stafflogin-indicator">
              <span className="stafflogin-icon"><i className="fa-regular fa-user"></i></span>
            </div>
            <h2>Healthcare Staff Login</h2>
            <p>Secure access to patient management system</p>
          </div>

          {error && <div className="stafflogin-error">{error}</div>}

          <div className="stafflogin-login-form">
            <div className="stafflogin-input-group">
              <label htmlFor="staffId">Healthcare Staff ID</label>
              <div className="stafflogin-input-wrapper">
                <span className="stafflogin-input-icon"><i className="fa-solid fa-user"></i></span>
                <input
                  type="text"
                  id="staffId"
                  name="staffId"
                  value={credentials.staffId}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter Healthcare Staff ID"
                  className={`stafflogin-form-input ${fieldErrors.staffId ? 'invalid' : ''}`}
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
              {showValidation && fieldErrors.staffId && (
                <small className="error-text">{fieldErrors.staffId}</small>
              )}
            </div>

            <div className="stafflogin-input-group">
              <label htmlFor="password">Password</label>
              <div className="stafflogin-input-wrapper">
                <span className="stafflogin-input-icon"><i className="fa-solid fa-lock"></i></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password"
                  className={`stafflogin-form-input ${fieldErrors.password ? 'invalid' : ''}`}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="stafflogin-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <i className="fa-solid fa-eye"></i> : <i className="fa-solid fa-eye-slash"></i>}
                </button>
              </div>
              {showValidation && fieldErrors.password && (
                <small className="error-text">{fieldErrors.password}</small>
              )}
            </div>

            <div className="stafflogin-form-options">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="stafflogin-forgot-password"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="stafflogin-login-btn"
            >
              Sign In
            </button>
          </div>
        </div>
       
        <div className="stafflogin-help-section">
          <h3><i className="fa-solid fa-phone"></i> Need Help?</h3>
          <div className="stafflogin-contact-grid">
            <div className="stafflogin-contact-item">
              <strong>IT Support</strong>
              <p>(02) 8123-4567 ext. 100</p>
              <small>Mon-Fri, 7AM-7PM</small>
            </div>
            <div className="stafflogin-contact-item">
              <strong>Medical Office</strong>
              <p>(02) 8123-4567 ext. 200</p>
              <small>24/7 Support</small>
            </div>
          </div>
        </div>
      </div>

      <div className="stafflogin-footer">
        <p>🔒 Secured by CliCare • Pamantasan ng Lungsod ng Maynila</p>
        <p>For technical support: itsupport@plm.edu.ph</p>
      </div>
    </div>
  );
};

export default StaffLogin;