// adminlogin.js
import React, { useState, useEffect } from 'react';
import './adminlogin.css';
import { adminApi, adminUtils } from '../../services/adminApi';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    healthadminid: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const storedError = localStorage.getItem('loginError');
    if (storedError) {
      setError(storedError);
      localStorage.removeItem('loginError');
    }

    if (adminUtils.isAuthenticated() && !adminUtils.isTokenExpired() && localStorage.getItem('adminInfo')) {
      window.location.replace('/admin-dashboard');
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) {
      setError('');
      localStorage.removeItem('loginError');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.healthadminid.trim()) {
      setError('Admin ID is required');
      return;
    }

    if (!formData.password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await adminApi.login({
        healthadminid: formData.healthadminid.trim(),
        password: formData.password
      });

      if (response.success) {
        window.location.href = '/admin-dashboard';
      } else {
        setError(response.message || 'Login failed. Please try again.');
      }

    } catch (error) {
      console.error('Login error:', error);
      localStorage.setItem('loginError', adminUtils.formatErrorMessage(error));
      window.location.reload();
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/';
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handleForgotPassword = () => {
    alert('Please contact IT support at support@clicare.com for password reset.');
  };

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <div className="admin-logo">🏥</div>
        <h1>CliCare</h1>
        <p>Administrator Portal</p>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <div className="admin-form-header">
            <div className="admin-indicator">
              <div className="admin-icon"><i class="fa-regular fa-user"></i></div>
            </div>
            <h2>Admin Login</h2>
            <p>Access your administrative dashboard</p>
          </div>

          {error && (
            <div className="admin-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="admin-input-group">
              <label>Admin ID</label>
              <div className="admin-input-wrapper">
                <span className="admin-input-icon"><i class="fa-solid fa-user"></i></span>
                <input
                  type="text"
                  name="healthadminid"
                  value={formData.healthadminid}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your admin ID"
                  className="admin-form-input"
                  disabled={loading}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  autoFocus
                />
              </div>
              <small className="admin-input-hint">Use your assigned administrator ID</small>
            </div>

            <div className="admin-input-group">
              <label>Password</label>
              <div className="admin-input-wrapper">
                <span className="admin-input-icon"><i class="fa-solid fa-lock"></i></span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password"
                  className="admin-form-input"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="admin-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <i className="fa-solid fa-eye"></i> : <i className="fa-solid fa-eye-slash"></i>}
                </button>
              </div>
            </div>

            <div className="admin-form-options">
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="admin-forgot-password"
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>

            <button 
              type="submit" 
              className="admin-login-btn"
            >
              Sign In
            </button>
          </form> 
        </div>

        <div className="admin-help-section">
          <h3><i className="fa-solid fa-phone"></i> Need Help?</h3>
          <div className="admin-contact-grid">
            <div className="admin-contact-item">
              <strong>IT Support</strong>
              <p>support@clicare.com</p>
              <small>Technical assistance</small>
            </div>
            <div className="admin-contact-item">
              <strong>Admin Help</strong>
              <p>+1 (555) 123-4567</p>
              <small>24/7 support line</small>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-footer">
        <p>CliCare Hospital Management System</p>
        <p>Secure Admin Access Portal</p>
      </div>
    </div>
  );
};

export default AdminLogin;