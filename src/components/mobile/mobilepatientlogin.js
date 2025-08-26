// mobilepatientlogin.js - Mobile-Optimized Patient Login Component
import React, { useState } from 'react';
import './mobilepatientlogin.css';

const MobilePatientLogin = () => {
  const [patientType, setPatientType] = useState(''); // 'old' or 'new'
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [credentials, setCredentials] = useState({
    patientId: '',
    email: '',
    phoneNumber: '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSendOTP = async () => {
    if (!credentials.patientId) {
      setError('Please enter your Patient ID first');
      return;
    }

    const contactValue = loginMethod === 'email' ? credentials.email : credentials.phoneNumber;
    if (!contactValue) {
      setError(`Please enter your ${loginMethod === 'email' ? 'email address' : 'phone number'}`);
      return;
    }

    setSendingCode(true);
    setError('');

    try {
      // Make API request to backend
      const response = await fetch('http://localhost:5000/api/outpatient/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          patientId: credentials.patientId.toUpperCase(),
          contactInfo: contactValue,
          contactType: loginMethod
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code');
        setSendingCode(false);
        return;
      }

      // Success
      setCodeSent(true);
      alert(`📱 Verification code sent successfully to your ${loginMethod}!`);

    } catch (err) {
      console.error('Send OTP error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      if (!credentials.patientId) {
        setError('Please enter your Patient ID');
        setLoading(false);
        return;
      }

      if (!codeSent) {
        setError('Please send verification code first');
        setLoading(false);
        return;
      }

      if (!credentials.otp) {
        setError('Please enter the verification code');
        setLoading(false);
        return;
      }

      const contactValue = loginMethod === 'email' ? credentials.email : credentials.phoneNumber;

      // Make API request to backend
      const response = await fetch('http://localhost:5000/api/outpatient/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          patientId: credentials.patientId.toUpperCase(),
          contactInfo: contactValue,
          otp: credentials.otp,
          deviceType: 'mobile'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please check your verification code.');
        setLoading(false);
        return;
      }

      // Store authentication data
      sessionStorage.setItem('patientToken', data.token);
      sessionStorage.setItem('patientId', data.patient.patient_id);
      sessionStorage.setItem('patientName', data.patient.name);
      sessionStorage.setItem('patientInfo', JSON.stringify(data.patient));
      
      // Redirect to mobile patient dashboard (keeping existing flow)
      window.location.href = '/mobile-patient-dashboard';

    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPatientType('');
    setLoginMethod('email');
    setCredentials({ patientId: '', email: '', phoneNumber: '', otp: '' });
    setCodeSent(false);
    setError('');
  };

  const renderPatientTypeSelection = () => (
    <div className="mobile-card">
      <div className="mobile-welcome">
        <h2>Welcome to CLICARE</h2>
        <p>Your digital healthcare companion. Choose your access type below.</p>
      </div>
      
      <div className="mobile-patient-types">
        <button 
          onClick={() => setPatientType('old')}
          className="mobile-patient-btn"
        >
          <div className="icon">👤</div>
          <div className="mobile-btn-content">
            <h3>Returning Patient</h3>
            <p>I have a Patient ID</p>
            <small>Access your medical records and book appointments</small>
          </div>
          <div className="mobile-arrow">→</div>
        </button>
        
        <button 
          onClick={() => setPatientType('new')}
          className="mobile-patient-btn"
        >
          <div className="icon">✨</div>
          <div className="mobile-btn-content">
            <h3>New Patient</h3>
            <p>First time here</p>
            <small>Create your patient account in minutes</small>
          </div>
          <div className="mobile-arrow">→</div>
        </button>
      </div>
    </div>
  );

  const renderOldPatientLogin = () => (
    <div className="mobile-card">
      <div className="mobile-form-header">
        <div className="mobile-back-btn-container">
          <button onClick={resetForm} className="mobile-back-btn">
            ← Back
          </button>
        </div>

        <div className="mobile-patient-indicator">
          <span className="mobile-indicator">👤</span>
        </div>
        <h3>Welcome Back!</h3>
        <p>Enter your details to access your account</p>
      </div>

      <div className="mobile-login-form">
        <div className="mobile-input-group">
          <label>Patient ID *</label>
          <input
            type="text"
            name="patientId"
            value={credentials.patientId}
            onChange={handleInputChange}
            placeholder="Enter Patient ID (e.g., PAT001)"
            className="mobile-form-input mobile-patient-id-input"
            required
          />
          <small className="mobile-input-hint">Found on your patient card or previous visit documents</small>
        </div>

        <div className="mobile-input-group">
          <div className="mobile-method-selection">
            <label>Verification Method</label>
            <div className="mobile-method-toggle">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('email');
                  setCodeSent(false);
                  setCredentials(prev => ({ ...prev, otp: '' }));
                }}
                className={`mobile-method-btn ${loginMethod === 'email' ? 'active' : ''}`}
              >
                📧 Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('phone');
                  setCodeSent(false);
                  setCredentials(prev => ({ ...prev, otp: '' }));
                }}
                className={`mobile-method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
              >
                📱 SMS
              </button>
            </div>
          </div>

          <label>{loginMethod === 'email' ? 'Email Address' : 'Phone Number'} *</label>
          <div className="mobile-contact-group">
            <input
              type={loginMethod === 'email' ? 'email' : 'tel'}
              name={loginMethod === 'email' ? 'email' : 'phoneNumber'}
              value={loginMethod === 'email' ? credentials.email : credentials.phoneNumber}
              onChange={handleInputChange}
              placeholder={loginMethod === 'email' ? 'your@email.com' : '09XX-XXX-XXXX'}
              className="mobile-form-input"
              required
            />
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={sendingCode || !credentials.patientId || (!credentials.email && !credentials.phoneNumber)}
              className="mobile-send-btn"
            >
              {sendingCode ? (
                <>
                  <span className="mobile-loading-spinner"></span>
                  Send
                </>
              ) : (
                'Send Code'
              )}
            </button>
          </div>
          <small className="mobile-input-hint">
            We'll send a verification code to your registered {loginMethod}
          </small>
        </div>

        {/* OTP Verification Code Input */}
        <div className="mobile-input-group">
          <label>Verification Code *</label>
          <input
            type="text"
            name="otp"
            value={credentials.otp}
            onChange={handleInputChange}
            placeholder="Enter 6-digit verification code"
            className="mobile-form-input"
            maxLength="6"
            disabled={!codeSent}
            required
          />
          <small className="mobile-input-hint">
            {codeSent 
              ? `Code sent to your ${loginMethod}. Please check and enter the 6-digit code.`
              : 'Please send verification code first'
            }
          </small>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading || !credentials.patientId || !credentials.otp || !codeSent}
          className="mobile-action-btn"
        >
          {loading ? (
            <>
              <span className="mobile-loading-spinner"></span>
              Verifying...
            </>
          ) : (
            '🏥 Access CLICARE'
          )}
        </button>
      </div>
    </div>
  );

  const renderNewPatientRedirect = () => (
    <div className="mobile-card">
      <div className="mobile-form-header">
        <div className="mobile-back-btn-container">
          <button onClick={resetForm} className="mobile-back-btn">
            ← Back
          </button>
        </div>

        <div className="mobile-patient-indicator">
          <span className="mobile-indicator">✨</span>
        </div>
        <h3>Create Your Account</h3>
        <p>Join CLICARE for better healthcare management</p>
      </div>

      <div className="mobile-reg-info">
        <div className="mobile-info-card">
          <h4>📋 Quick Registration Process:</h4>
          <ul className="mobile-info-list">
            <li>Personal information (name, age, contact)</li>
            <li>Emergency contact details</li>
            <li>Optional ID scan for faster setup</li>
            <li>Review and confirm your details</li>
          </ul>
        </div>
        
        <div className="mobile-time-estimate">
          <p>⏱️ Takes only 3-5 minutes to complete</p>
        </div>
      </div>

      <button 
        onClick={() => window.location.href = '/mobile-patient-register'}
        className="mobile-action-btn"
      >
        🚀 Start Registration
      </button>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p style={{ color: '#5f6368', fontSize: '0.9em', marginBottom: '10px' }}>Already have an account?</p>
        <button 
          onClick={() => setPatientType('old')}
          className="mobile-secondary-btn"
        >
          Login as Returning Patient
        </button>
      </div>
    </div>
  );

  return (
    <div className="mobile-patient-portal">
      <div className="mobile-header">
        <div className="mobile-logo">🏥</div>
        <div className="mobile-title">
          <h1>CLICARE</h1>
          <p>Digital Patient Management</p>
        </div>
        <div className="mobile-hospital-info">
          <p><strong>Mobile Portal</strong></p>
          <p>Patient Access</p>
        </div>
      </div>
      
      <div className="mobile-content">
        {error && <div className="mobile-error">⚠️ {error}</div>}
        
        {!patientType && renderPatientTypeSelection()}
        {patientType === 'old' && renderOldPatientLogin()}
        {patientType === 'new' && renderNewPatientRedirect()}
        
      </div>

      <div className="mobile-footer">
        <p>🔒 Secure patient access • Need help? Tap to call (02) 8123-4567</p>
      </div>
    </div>
  );
};

export default MobilePatientLogin;