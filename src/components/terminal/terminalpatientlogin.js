// terminalpatientlogin.js - UPDATED to work with real backend API
import React, { useState, useEffect } from 'react';
import './terminalpatientlogin.css';

const TerminalPatientLogin = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [patientType, setPatientType] = useState(''); // 'returning' or 'new'
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone' 
  const [formData, setFormData] = useState({
    patientId: '',
    email: '',
    phoneNumber: '',
    otp: '',
    qrCode: '',
    name: '',
    birthday: '',
    contactNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [scanMode, setScanMode] = useState(''); // 'qr' or 'id'

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  // FIXED: Real OTP sending function (matches mobile login)
  const handleSendOTP = async () => {
    if (!formData.patientId) {
      setError('Please enter your Patient ID first');
      return;
    }

    const contactValue = loginMethod === 'email' ? formData.email : formData.phoneNumber;
    if (!contactValue) {
      setError(`Please enter your ${loginMethod === 'email' ? 'email address' : 'phone number'}`);
      return;
    }

    setSendingCode(true);
    setError('');

    try {
      // FIXED: Use real backend API (same as mobile login)
      const response = await fetch('http://localhost:5000/api/outpatient/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          patientId: formData.patientId.toUpperCase(),
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

  // FIXED: Real login function that connects to backend
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

      const contactValue = loginMethod === 'email' ? formData.email : formData.phoneNumber;

      // FIXED: Use real backend API with deviceType: 'terminal'
      const response = await fetch('http://localhost:5000/api/outpatient/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          patientId: formData.patientId.toUpperCase(),
          contactInfo: contactValue,
          otp: formData.otp,
          deviceType: 'terminal'  // KEY DIFFERENCE: terminal instead of mobile
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please check your verification code.');
        setLoading(false);
        return;
      }

      // Store authentication data (same as mobile)
      sessionStorage.setItem('patientToken', data.token);
      sessionStorage.setItem('patientId', data.patient.patient_id);
      sessionStorage.setItem('patientName', data.patient.name);
      sessionStorage.setItem('patientInfo', JSON.stringify(data.patient));
      
       sessionStorage.setItem('patientType', 'returning');
      sessionStorage.setItem('terminalPatientId', data.patient.patient_id);
      sessionStorage.setItem('directToHealthAssessment', 'true'); // Flag for direct redirect
      
      alert('✅ Login successful! Redirecting to Health Assessment...');

      
      // CRITICAL: Redirect to Symptoms page instead of dashboard
      window.location.href = '/terminal-patient-registration';

    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Keep existing QR scan functions (they can stay as mock for now)
  const handleQRScan = () => {
    setScanMode('qr');
    setError('');
    
    // Simulate QR code scanning
    setTimeout(() => {
      const mockQRData = {
        patientId: 'PAT123',
        name: 'MARIA SANTOS',
        birthday: '1985-05-15',
        contactNumber: '09171234567'
      };
      
      setFormData({
        ...formData,
        ...mockQRData,
        qrCode: 'QR_' + Date.now()
      });
      setScanMode('');
      alert('✅ QR Code scanned successfully! Please verify your information.');
    }, 2000);
  };

  const handleIDScan = () => {
    setScanMode('id');
    setError('');
    
    // Simulate ID OCR scanning
    setTimeout(() => {
      const mockIDData = {
        name: 'JUAN DELA CRUZ',
        birthday: '1990-03-22'
      };
      
      setFormData({
        ...formData,
        ...mockIDData
      });
      setScanMode('');
      alert('📄 ID scanned successfully! Information auto-filled. Please complete remaining fields.');
    }, 3000);
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
      otp: '',
      qrCode: '',
      name: '',
      birthday: '',
      contactNumber: ''
    });
    setCodeSent(false);
    setError('');
    setScanMode('');
  };

  // Keep existing utility functions
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

  // Keep existing render functions but update the OTP input section
  const renderReturningPatientForm = () => (
    <div className="terminal-main-card">
      <div className="terminal-form-header">
        <div className="terminal-back-btn-container">
          <button onClick={resetForm} className="terminal-back-btn">
            ← Back
          </button>
        </div>
        
        <div className="terminal-patient-indicator">
          <div className="terminal-indicator-icon">👤</div>
        </div>
        <h3>Returning Patient Login</h3>
        <p>Access your existing patient record</p>
      </div>

      {error && <div className="terminal-error">⚠️ {error}</div>}

      <div className="terminal-login-options">
        <div className="terminal-input-group">
          <label>Patient ID *</label>
          <input
            type="text"
            name="patientId"
            value={formData.patientId}
            onChange={handleInputChange}
            placeholder="ENTER PATIENT ID (E.G., PAT001)"
            className="terminal-input"
            style={{ textTransform: 'uppercase' }}
          />
          <small>Found on your patient card or previous visit documents</small>
        </div>

        <div className="terminal-input-group">
          <label>Verification Method</label>
          <div className="terminal-method-toggle">
            <button
              onClick={() => {
                setLoginMethod('email');
                setCodeSent(false);
                setFormData(prev => ({ ...prev, otp: '' }));
              }}
              className={`terminal-method-btn ${loginMethod === 'email' ? 'active' : ''}`}
            >
              📧 Email
            </button>
            <button
              onClick={() => {
                setLoginMethod('phone');
                setCodeSent(false);
                setFormData(prev => ({ ...prev, otp: '' }));
              }}
              className={`terminal-method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
            >
              📱 SMS
            </button>
          </div>
        </div>

        {/* UPDATED: Real contact info input with send button */}
        {loginMethod === 'email' ? (
          <div className="terminal-input-group">
            <label>Email Address *</label>
            <div className="terminal-contact-group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                className="terminal-input"
                disabled={codeSent}
              />
              <button
                onClick={handleSendOTP}
                disabled={sendingCode || !formData.email || codeSent || !formData.patientId}
                className="terminal-send-btn"
              >
                {sendingCode ? (
                  <>
                    <span className="terminal-loading-spinner"></span>
                    Sending...
                  </>
                ) : codeSent ? (
                  '✓ Sent'
                ) : (
                  'Send Code'
                )}
              </button>
            </div>
            <small>We'll send a verification code to your registered email</small>
          </div>
        ) : (
          <div className="terminal-input-group">
            <label>Phone Number *</label>
            <div className="terminal-contact-group">
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="09XX-XXX-XXXX"
                className="terminal-input"
                disabled={codeSent}
              />
              <button
                onClick={handleSendOTP}
                disabled={sendingCode || !formData.phoneNumber || codeSent || !formData.patientId}
                className="terminal-send-btn"
              >
                {sendingCode ? (
                  <>
                    <span className="terminal-loading-spinner"></span>
                    Sending...
                  </>
                ) : codeSent ? (
                  '✓ Sent'
                ) : (
                  'Send Code'
                )}
              </button>
            </div>
            <small>We'll send a verification code to your registered phone number</small>
          </div>
        )}

        {/* UPDATED: OTP verification input */}
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
          />
          <small>
            {codeSent 
              ? `Code sent to your ${loginMethod}. Please check and enter the 6-digit code.`
              : 'Please send verification code first'
            }
          </small>
        </div>
      </div>

      <button
        onClick={handleReturningPatientLogin}
        disabled={loading || !formData.patientId || !formData.otp || !codeSent}
        className="terminal-action-btn primary large"
      >
        {loading ? (
          <>
            <span className="terminal-loading-spinner"></span>
            Verifying...
          </>
        ) : (
          '🏥 Access Patient Record'
        )}
      </button>
    </div>
  );

  // Keep all other existing render functions unchanged...
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
            <small>Use your Patient ID or scan QR code from mobile app</small>
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

  const renderNewPatientRedirect = () => (
    <div className="terminal-main-card">
      <div className="terminal-form-header">
        <div className="terminal-back-btn-container">
          <button onClick={resetForm} className="terminal-back-btn">
            ← Back
          </button>
        </div>
        
        <div className="terminal-patient-indicator">
          <div className="terminal-indicator-icon">✨</div>
        </div>
        <h3>New Patient Registration</h3>
        <p>Create your patient record with CLICARE</p>
      </div>

      <div className="terminal-reg-info">
        <div className="terminal-info-card">
          <h4>📋 Registration Process:</h4>
          <div className="terminal-feature-list">
            <div className="terminal-feature-item">
              <span className="terminal-feature-icon">👤</span>
              <span>Personal information and contact details</span>
            </div>
            <div className="terminal-feature-item">
              <span className="terminal-feature-icon">🆔</span>
              <span>Optional ID scan for faster setup</span>
            </div>
            <div className="terminal-feature-item">
              <span className="terminal-feature-icon">✅</span>
              <span>Review and confirm your information</span>
            </div>
          </div>
        </div>
        
        <div className="terminal-time-estimate">
          <div className="terminal-estimate-icon">⏱️</div>
          <div className="terminal-estimate-content">
            <strong>Quick & Easy</strong>
            <p>Takes only 3-5 minutes to complete</p>
          </div>
        </div>
      </div>

      <button 
        onClick={handleNewPatientRedirect}
        className="terminal-action-btn primary large"
      >
        🚀 Start Registration Process
      </button>
    </div>
  );

  return (
    <div className="terminal-portal">
      <div className="terminal-header">
        <div className="terminal-logo">🏥</div>
        <div className="terminal-title">
          <h1>CLICARE</h1>
          <p>Digital Patient Management</p>
        </div>
        <div className="terminal-hospital-info">
          <p><strong>Terminal Station</strong></p>
          <p>Main Lobby Registration</p>
        </div>
      </div>
      
      <div className="terminal-content">
        {!patientType && renderPatientTypeSelection()}
        {patientType === 'returning' && renderReturningPatientForm()}
        {patientType === 'new' && renderNewPatientRedirect()}
      </div>

      <div className="terminal-footer">
        <div className="terminal-footer-section">
          <h4>🆘 Need Help?</h4>
          <p>Press help button or ask staff</p>
        </div>
        <div className="terminal-footer-section">
          <h4>📞 Emergency</h4>
          <p>Call extension 911</p>
        </div>
        <div className="terminal-footer-section">
          <h4>ℹ️ Information</h4>
          <p>Reception desk available</p>
        </div>
      </div>
    </div>
  );
};

export default TerminalPatientLogin;