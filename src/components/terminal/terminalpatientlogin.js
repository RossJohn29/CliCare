// terminalpatientlogin.js - CLICARE Terminal Patient Login Component
import React, { useState, useEffect } from 'react';
import './terminalpatientlogin.css';

const TerminalPatientLogin = () => {
  const [patientType, setPatientType] = useState(''); // 'returning' or 'new'
  const [formData, setFormData] = useState({
    patientId: '',
    email: '',
    phoneNumber: '',
    otp: ''
  });
  const [verificationMethod, setVerificationMethod] = useState('email'); // 'email' or 'phone'
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSendCode = async () => {
    if (!formData.patientId) {
      setError('Please enter your Patient ID first');
      return;
    }

    const contactValue = verificationMethod === 'email' ? formData.email : formData.phoneNumber;
    if (!contactValue) {
      setError(`Please enter your ${verificationMethod === 'email' ? 'email address' : 'phone number'}`);
      return;
    }

    setSendingCode(true);
    setError('');

    try {
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock validation for returning patients
      const validPatients = ['PAT001', 'PAT123', 'PAT456'];
      if (!validPatients.includes(formData.patientId.toUpperCase())) {
        setError('Patient ID not found. Please check your patient card.');
        setSendingCode(false);
        return;
      }

      // Mock successful code sending
      setCodeSent(true);
      alert(`📱 Verification code sent to your ${verificationMethod}!\n\nFor testing, use: 123456`);
    } catch (err) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleReturningPatientLogin = async () => {
    setLoading(true);
    setError('');

    try {
      if (!formData.patientId) {
        setError('Please enter your Patient ID');
        setLoading(false);
        return;
      }

      if (!codeSent) {
        setError('Please send verification code first');
        setLoading(false);
        return;
      }

      if (!formData.otp) {
        setError('Please enter the verification code');
        setLoading(false);
        return;
      }

      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock OTP validation
      if (formData.otp !== '123456') {
        setError('Invalid verification code. Please try again.');
        setLoading(false);
        return;
      }

      // Mock successful authentication
      const patientName = 'Returning Patient';
      
      // Store session data
      sessionStorage.setItem('terminalPatientId', formData.patientId);
      sessionStorage.setItem('patientName', patientName);
      sessionStorage.setItem('patientType', 'returning');
      
      alert('🎉 Welcome back to CLICARE! Proceeding to symptom assessment...');
      window.location.href = '/terminal-patient-registration';
    } catch (err) {
      setError('System error. Please contact hospital staff for assistance.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPatientRedirect = () => {
    // Set new patient indicator and redirect to registration
    sessionStorage.setItem('patientType', 'new');
    sessionStorage.setItem('terminalPatientId', 'NEW_' + Date.now().toString().slice(-6));
    sessionStorage.setItem('patientName', 'New Patient');
    
    alert('📋 Redirecting to new patient registration...');
    window.location.href = '/terminal-patient-registration';
  };

  const resetForm = () => {
    setPatientType('');
    setFormData({
      patientId: '',
      email: '',
      phoneNumber: '',
      otp: ''
    });
    setVerificationMethod('email');
    setCodeSent(false);
    setError('');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderPatientTypeSelection = () => (
    <div className="terminal-main-card">
      <div className="terminal-welcome">
        <h2>Welcome to CLICARE</h2>
        <p>Hospital Digital Registration System</p>
        <div className="terminal-time-display">
          <div className="terminal-time">{formatTime(currentTime)}</div>
          <div className="terminal-date">{formatDate(currentTime)}</div>
        </div>
      </div>
      
      <div className="terminal-patient-types">
        <button 
          onClick={() => setPatientType('returning')}
          className="terminal-patient-btn"
        >
          <div className="terminal-btn-icon">👤</div>
          <div className="terminal-btn-content">
            <h3>Returning Patient</h3>
            <p>I have visited this hospital before</p>
            <small>Use your Patient ID and get verification code</small>
          </div>
          <div className="terminal-btn-arrow">→</div>
        </button>
        
        <button 
          onClick={() => setPatientType('new')}
          className="terminal-patient-btn"
        >
          <div className="terminal-btn-icon">✨</div>
          <div className="terminal-btn-content">
            <h3>New Patient</h3>
            <p>First time visiting this hospital</p>
            <small>Create your patient record and proceed to registration</small>
          </div>
          <div className="terminal-btn-arrow">→</div>
        </button>
      </div>

      <div className="terminal-help-footer">
        <p>🆘 Need assistance? Press the help button or ask hospital staff</p>
      </div>
    </div>
  );

  const renderReturningPatientForm = () => (
    <div className="terminal-main-card">
      <div className="terminal-form-header">
        <div className="terminal-back-btn-container">
          <button onClick={resetForm} className="terminal-back-btn">
            ← Back
          </button>
        </div>
        <div className="terminal-patient-indicator">
          <span className="terminal-indicator-icon">👤</span>
        </div>
        <h3>Welcome Back!</h3>
        <p>Please verify your identity to continue</p>
      </div>

      <div className="terminal-login-form">
        {/* Patient ID Input */}
        <div className="terminal-input-group">
          <label>Patient ID *</label>
          <input
            type="text"
            name="patientId"
            value={formData.patientId}
            onChange={handleInputChange}
            placeholder="Enter your Patient ID (e.g., PAT001)"
            className="terminal-input"
            required
          />
          <small>Found on your patient card or previous visit documents</small>
        </div>

        {/* Verification Method Selection */}
        <div className="terminal-verification-section">
          <label className="terminal-verification-label">Verification Method *</label>
          <div className="terminal-verification-toggle">
            <button
              type="button"
              onClick={() => {
                setVerificationMethod('email');
                setCodeSent(false);
                setFormData(prev => ({ ...prev, otp: '' }));
              }}
              className={`terminal-method-btn ${verificationMethod === 'email' ? 'active' : ''}`}
            >
              📧 Email
            </button>
            <button
              type="button"
              onClick={() => {
                setVerificationMethod('phone');
                setCodeSent(false);
                setFormData(prev => ({ ...prev, otp: '' }));
              }}
              className={`terminal-method-btn ${verificationMethod === 'phone' ? 'active' : ''}`}
            >
              📱 SMS
            </button>
          </div>
        </div>

        {/* Contact Input with Send Code Button */}
        <div className="terminal-input-group">
          <label>{verificationMethod === 'email' ? 'Email Address' : 'Phone Number'} *</label>
          <div className="terminal-contact-group">
            <input
              type={verificationMethod === 'email' ? 'email' : 'tel'}
              name={verificationMethod === 'email' ? 'email' : 'phoneNumber'}
              value={verificationMethod === 'email' ? formData.email : formData.phoneNumber}
              onChange={handleInputChange}
              placeholder={verificationMethod === 'email' ? 'your@email.com' : '09XX-XXX-XXXX'}
              className="terminal-input terminal-contact-input"
              required
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode || !formData.patientId || (!formData.email && !formData.phoneNumber)}
              className="terminal-send-btn"
            >
              {sendingCode ? (
                <>
                  <span className="terminal-loading-spinner"></span>
                  Sending...
                </>
              ) : (
                'Send Code'
              )}
            </button>
          </div>
          <small>
            We'll send a verification code to your registered {verificationMethod}
          </small>
        </div>

        {/* OTP Input */}
        <div className="terminal-input-group">
          <label>Verification Code *</label>
          <input
            type="text"
            name="otp"
            value={formData.otp}
            onChange={handleInputChange}
            placeholder="Enter 6-digit verification code"
            className="terminal-input"
            maxLength="6"
            disabled={!codeSent}
            required
          />
          <small>
            {codeSent 
              ? `Code sent to your ${verificationMethod}. Please check and enter the 6-digit code.`
              : 'Please send verification code first'
            }
          </small>
        </div>
      </div>

      <button
        onClick={handleReturningPatientLogin}
        disabled={loading || !formData.patientId || !formData.otp || !codeSent}
        className="terminal-action-btn primary"
      >
        {loading ? (
          <>
            <span className="terminal-loading-spinner"></span>
            Verifying...
          </>
        ) : (
          'Continue to Registration'
        )}
      </button>
    </div>
  );

  const renderNewPatientRedirection = () => (
    <div className="terminal-main-card">
      <div className="terminal-form-header">
        <div className="terminal-back-btn-container">
          <button onClick={resetForm} className="terminal-back-btn">
            ← Back
          </button>
        </div>
        <div className="terminal-patient-indicator">
          <span className="terminal-indicator-icon">✨</span>
        </div>
        <h3>New Patient Registration</h3>
        <p>Let's get you registered in our system</p>
      </div>

      <div className="terminal-new-patient-info">
        <div className="terminal-registration-flow">
          <h4>📋 Registration Process</h4>
          <div className="terminal-flow-steps">
            <div className="terminal-flow-step">
              <span className="terminal-flow-number">1</span>
              <div className="terminal-flow-content">
                <strong>Personal Information</strong>
                <p>Basic details and contact information</p>
              </div>
            </div>
            <div className="terminal-flow-step">
              <span className="terminal-flow-number">2</span>
              <div className="terminal-flow-content">
                <strong>Symptom Assessment</strong>
                <p>Tell us about your current health concerns</p>
              </div>
            </div>
            <div className="terminal-flow-step">
              <span className="terminal-flow-number">3</span>
              <div className="terminal-flow-content">
                <strong>Department Assignment</strong>
                <p>Automatic routing to appropriate departments</p>
              </div>
            </div>
          </div>
        </div>

        <div className="terminal-features-info">
          <h4>✨ Quick Setup Features</h4>
          <div className="terminal-features-list">
            <div className="terminal-feature-item">
              <span className="terminal-feature-icon">🆔</span>
              <span>ID Scanning for auto-fill</span>
            </div>
            <div className="terminal-feature-item">
              <span className="terminal-feature-icon">🚀</span>
              <span>Fast 3-minute process</span>
            </div>
            <div className="terminal-feature-item">
              <span className="terminal-feature-icon">🗺️</span>
              <span>Printed navigation maps</span>
            </div>
            <div className="terminal-feature-item">
              <span className="terminal-feature-icon">📋</span>
              <span>Digital queue management</span>
            </div>
          </div>
        </div>

        <div className="terminal-time-estimate">
          <div className="terminal-estimate-icon">⏱️</div>
          <div className="terminal-estimate-content">
            <strong>Estimated Time: 3-5 minutes</strong>
            <p>Complete registration and get your queue numbers</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleNewPatientRedirect}
        className="terminal-action-btn primary large"
      >
        🚀 Start New Patient Registration
      </button>
    </div>
  );

  return (
    <div className="terminal-portal">
      <div className="terminal-header">
        <div className="terminal-logo">🏥</div>
        <div className="terminal-title">
          <h1>CLICARE</h1>
          <p>Patient Registration Terminal</p>
        </div>
        <div className="terminal-hospital-info">
          <p>Pamantasan ng Lungsod ng Maynila</p>
          <p>Hospital Terminal #1</p>
        </div>
      </div>
      
      <div className="terminal-content">
        {error && <div className="terminal-error">⚠️ {error}</div>}
        
        {!patientType && renderPatientTypeSelection()}
        {patientType === 'returning' && renderReturningPatientForm()}
        {patientType === 'new' && renderNewPatientRedirection()}
      </div>

      <div className="terminal-footer">
        <div className="terminal-footer-section">
          <h4>Emergency</h4>
          <p>Press RED button or dial 911</p>
        </div>
        <div className="terminal-footer-section">
          <h4>Help Desk</h4>
          <p>Information Counter</p>
        </div>
        <div className="terminal-footer-section">
          <h4>Technical Support</h4>
          <p>Call ext. 100</p>
        </div>
      </div>
    </div>
  );
};

export default TerminalPatientLogin;