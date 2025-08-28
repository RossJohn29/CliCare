// terminalpatientlogin.js - FIXED to use localStorage consistently
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
  const [scanMode, setScanMode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [justSent, setJustSent] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  // Real OTP sending function (matches mobile login)
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

      // Remove alert and add "Sent" state
      setCodeSent(true);
      setJustSent(true);
      
      // Show "Sent" for 2 seconds, then start countdown
      setTimeout(() => {
        setJustSent(false);
        setCountdown(120);
      }, 2000);

    } catch (err) {
      console.error('Send OTP error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleMethodSwitch = (method) => {
    setLoginMethod(method);
    setCodeSent(false);
    setJustSent(false);
    setFormData(prev => ({ ...prev, otp: '' }));
    setError('');
  };

  // Real login function that connects to backend
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

      // Use real backend API with deviceType: 'terminal'
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

      // Store authentication data - ALL using localStorage now
      localStorage.setItem('patientToken', data.token);
      localStorage.setItem('patientId', data.patient.patient_id);
      localStorage.setItem('patientName', data.patient.name);
      localStorage.setItem('patientInfo', JSON.stringify(data.patient));

      console.log('✅ Login successful, redirecting...');

      // Redirect to terminal patient registration
      window.location.href = '/terminal-patient-registration';

    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // QR scan functions (mock for now)
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

  // FIXED: Changed from sessionStorage to localStorage
  const handleNewPatientRedirect = () => {
    // Set new patient indicator and redirect to registration - ALL using localStorage now
    localStorage.setItem('patientType', 'new');
    localStorage.setItem('terminalPatientId', 'NEW_' + Date.now().toString().slice(-6));
    localStorage.setItem('patientName', 'New Patient');
    
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

  // Utility functions
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

  const renderReturningPatientForm = () => (
    <div className="terminal-main-card">
      <div className="terminal-form-header">
        {/* Remove entire terminal-back-btn-container div */}
        
        <div className="terminal-patient-indicator">
          <span className="terminal-indicator"><i class="fa-regular fa-user"></i></span>
        </div>
        <h3>Welcome Back!</h3>
        <p>Enter your details to access your account</p>
      </div>

      {error && <div className="terminal-error">{error}</div>}

      <div className="terminal-login-form">
        <div className="terminal-input-group">
          <label>Patient ID</label>
          <input
            type="text"
            name="patientId"
            value={formData.patientId}
            onChange={handleInputChange}
            placeholder="Enter Patient ID (e.g., PAT001)"
            className="terminal-form-input"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <small className="terminal-input-hint">Found on your patient card or previous visit documents</small>
        </div>

        <div className="terminal-input-group">
          <div className="terminal-method-selection">
            <label>Verification Method</label>
            <div className="terminal-method-toggle">
              <button
                type="button"
                onClick={() => handleMethodSwitch('email')}
                className={`terminal-method-btn ${loginMethod === 'email' ? 'active' : ''}`}
              >
                <i class="fa-solid fa-envelope"></i> Email
              </button>
              <button
                type="button"
                onClick={() => handleMethodSwitch('phone')}
                className={`terminal-method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
              >
                <i class="fa-solid fa-phone"></i> SMS
              </button>
            </div>
          </div>

          <label>{loginMethod === 'email' ? 'Email Address' : 'Phone Number'}</label>
          <div className="terminal-contact-group">
            <input
              type={loginMethod === 'email' ? 'email' : 'tel'}
              name={loginMethod === 'email' ? 'email' : 'phoneNumber'}
              value={loginMethod === 'email' ? formData.email : formData.phoneNumber}
              onChange={handleInputChange}
              placeholder={loginMethod === 'email' ? 'your@email.com' : '09XX-XXX-XXXX'}
              className="terminal-form-input"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={sendingCode || justSent || countdown > 0}
              className="terminal-otp-send-btn"
            >
              {sendingCode ? (
                <>
                  <span className="terminal-loading-spinner"></span>
                  Sending...
                </>
              ) : justSent ? (
                'Sent ✓'
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Send Code'
              )}
            </button>
          </div>
          <small className="terminal-input-hint">
            We'll send a verification code to your registered {loginMethod}
          </small>
        </div>

        <div className="terminal-input-group">
          <label>Verification Code</label>
          <input
            type="text"
            name="otp"
            value={formData.otp}
            onChange={handleInputChange}
            placeholder="Enter 6-digit verification code"
            className="terminal-form-input"
            maxLength="6"
            disabled={!codeSent}
          />
          <small className="terminal-input-hint">
            {codeSent 
              ? (
                  <>
                    <i class="fa-solid fa-square-check"></i> Code sent to your {loginMethod}. Enter the 6-digit code
                  </>
                )
              : (
                  <>
                    <i class="fa-solid fa-triangle-exclamation"></i> Please send verification code first
                  </>
                )
            }
          </small>
        </div>

        <button
          type="button"
          onClick={handleReturningPatientLogin}
          className="terminal-access-btn"
        >
          {loading ? (
            <>
              <span className="terminal-loading-spinner"></span>
              Verifying...
            </>
          ) : (
            'Sign In'
          )}
        </button>
        
        <div className="terminal-account-toggle">
          <p>
            Don't have an account? <button 
              onClick={() => setPatientType('new')}
              className="terminal-account-link"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );

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
        <div className="terminal-patient-indicator">
          <span className="terminal-indicator">✨</span>
        </div>
        <h3>Create Your Account</h3>
        <p>Join CLICARE for better healthcare management</p>
      </div>

      <div className="terminal-reg-info">
        <div className="terminal-info-card">
          <h4>📋 Quick Registration Process:</h4>
          <ul className="terminal-info-list">
            <li>Personal information (name, age, contact)</li>
            <li>Emergency contact details</li>
            <li>Optional ID scan for faster setup</li>
            <li>Review and confirm your details</li>
          </ul>
        </div>
        
        <div className="terminal-time-estimate">
          <p>⏱️ Takes only 3-5 minutes to complete</p>
        </div>
      </div>

      <button 
        onClick={handleNewPatientRedirect}
        className="terminal-access-btn"
      >
        Start Registration
      </button>

      <div className="terminal-account-toggle">
        <p>
          Already have an account? <button 
            onClick={() => setPatientType('returning')}
            className="terminal-account-link"
          >
            Sign in
          </button>
        </p>
      </div>
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