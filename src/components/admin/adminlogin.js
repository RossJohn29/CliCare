// adminlogin.js - Updated with Backend Integration + Using existing CSS structure
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
  const [rememberMe, setRememberMe] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (adminUtils.isAuthenticated()) {
      // Validate token before redirecting
      adminApi.validateToken()
        .then(() => {
          window.location.href = '/admin-dashboard';
        })
        .catch(() => {
          // Token invalid, clear storage
          sessionStorage.clear();
        });
    }
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.healthadminid.trim()) {
      setError('Admin ID is required');
      return;
    }

    if (!formData.password.trim()) {
      setError('Password is required');
      return;
    }

    if (formData.password.length < 3) {
      setError('Password must be at least 3 characters');
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
        // Success - redirect to dashboard
        window.location.href = '/admin-dashboard';
      } else {
        setError(response.message || 'Login failed. Please try again.');
      }

    } catch (error) {
      console.error('Login error:', error);
      setError(adminUtils.formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Handle back to main app
  const handleBack = () => {
    window.location.href = '/';
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle key press (Enter to submit)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    alert('Please contact IT support at support@clicare.com for password reset.');
  };

  return (
    <div className="admin-portal">
      {/* Admin Header */}
      <div className="admin-header">
        <div className="admin-logo">🏥</div>
        <h1>CLICARE</h1>
        <p>Administrator Portal</p>
      </div>

      {/* Admin Content */}
      <div className="admin-content">
        <div className="admin-card">
          {/* Form Header */}
          <div className="admin-form-header">
            <div className="admin-indicator">
              <div className="admin-icon">👨‍💼</div>
            </div>
            <h2>Admin Login</h2>
            <p>Access your administrative dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="admin-error">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="admin-input-group">
              <label>Admin ID</label>
              <div className="admin-input-wrapper">
                <span className="admin-input-icon">👤</span>
                <input
                  type="text"
                  name="healthadminid"
                  value={formData.healthadminid}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your admin ID (e.g., ADMIN001)"
                  className="admin-form-input"
                  disabled={loading}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <small className="admin-input-hint">Use your assigned administrator ID</small>
            </div>

            <div className="admin-input-group">
              <label>Password</label>
              <div className="admin-input-wrapper">
                <span className="admin-input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password"
                  className="admin-form-input"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="admin-password-toggle"
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Form Options */}
            <div className="admin-form-options">
              <label className="admin-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                Remember me
              </label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="admin-forgot-password"
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button 
              type="submit" 
              className="admin-login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="admin-loading-spinner"></div>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Navigation Links */}
          <div className="admin-navigation-links">
            <button 
              onClick={handleBack} 
              className="admin-nav-btn secondary"
              disabled={loading}
            >
              ← Back to Main
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="admin-help-section">
          <h3>Need Help?</h3>
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

      {/* Footer */}
      <div className="admin-footer">
        <p>CLICARE Hospital Management System</p>
        <p>Secure Admin Access Portal</p>
      </div>
    </div>
  );
};

export default AdminLogin;