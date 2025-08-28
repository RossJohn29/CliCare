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

  useEffect(() => {
    // Check for stored login error first
    const storedError = localStorage.getItem('loginError');
    if (storedError) {
      setError(storedError);
      localStorage.removeItem('loginError'); // Clear it after showing
    }

    // Then check authentication
    if (adminUtils.isAuthenticated() && !adminUtils.isTokenExpired() && localStorage.getItem('adminInfo')) {
      window.location.replace('/admin-dashboard');
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
    if (error) {
      setError('');
      localStorage.removeItem('loginError'); // Also clear stored error
    }
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
      
      // Store error in localStorage so it persists after page reload
      localStorage.setItem('loginError', adminUtils.formatErrorMessage(error));
      
      // Force page reload
      window.location.reload();
      return; // Exit early since page is reloading
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
              <div className="admin-icon"><i class="fa-regular fa-user"></i></div>
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

            {/* Form Options */}
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

            {/* Login Button */}
            <button 
              type="submit" 
              className="admin-login-btn"
            >
              Sign In
            </button>
          </form> 
        </div>

        {/* Help Section */}
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

      {/* Footer */}
      <div className="admin-footer">
        <p>CLICARE Hospital Management System</p>
        <p>Secure Admin Access Portal</p>
      </div>
    </div>
  );
};

export default AdminLogin;