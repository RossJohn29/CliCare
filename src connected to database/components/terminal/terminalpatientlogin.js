// terminalpatientlogin.js - CLICARE Terminal Patient Login Component (Smaller Design)
import React, { useState, useEffect } from 'react';
import './terminalpatientlogin.css';

const TerminalPatientLogin = () => {
  const [patientType, setPatientType] = useState(''); // 'returning' or 'new'
  const [formData, setFormData] = useState({
    patientId: '',
    qrCode: '',
    name: '',
    birthday: '',
    contactNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [codeSent, setCodeSent] = useState(false); 
  const [scanMode, setScanMode] = useState(''); // 'qr' or 'id'
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

  setLoading(true);
  setError('');

  try {
    // Mock API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock validation
    const validPatients = ['PAT001', 'PAT002', 'PAT123', 'PAT456'];
    
    if (!validPatients.includes(formData.patientId.toUpperCase())) {
      setError('Patient ID not found. Try: PAT001, PAT002, PAT123, or PAT456');
      setLoading(false);
      return;
    }

    // Mock successful code sending
    setCodeSent(true);
    alert(`📱 OTP sent successfully to your ${loginMethod}! For testing, use: 123456`);
  } catch (err) {
    setError('Connection error. Please try again.');
  } finally {
    setLoading(false);
  }
};

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

  // Mock OTP validation
  if (formData.otp !== '123456') {
    setError('Invalid verification code. Please try again.');
    setLoading(false);
    return;
  }

      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock validation for returning patients
      const validPatients = ['PAT001', 'PAT123', 'PAT456'];
      if (!validPatients.includes(formData.patientId) && !formData.qrCode) {
        setError('Patient ID not found. Please check your patient card or use QR code.');
        setLoading(false);
        return;
      }

      // Mock successful login
      sessionStorage.setItem('terminalPatientId', formData.patientId || formData.qrCode);
      sessionStorage.setItem('patientName', formData.name || 'Returning Patient');
      
      alert('🎉 Login successful! Proceeding to symptom assessment...');
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
      qrCode: '',
      name: '',
      birthday: '',
      contactNumber: ''
    });
    setError('');
    setScanMode('');
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
            onClick={() => setLoginMethod('email')}
            className={`terminal-method-btn ${loginMethod === 'email' ? 'active' : ''}`}
          >
            📧 Email
          </button>
          <button
            onClick={() => setLoginMethod('phone')}
            className={`terminal-method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
          >
            📱 SMS
          </button>
        </div>
      </div>

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
              disabled={loading || !formData.email || codeSent}
              className="terminal-send-btn"
            >
              {loading ? (
                <>
                  <span className="terminal-loading-spinner"></span>
                  Sending...
                </>
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
              placeholder="+63 9XX XXX XXXX"
              className="terminal-input"
              disabled={codeSent}
            />
            <button
              onClick={handleSendOTP}
              disabled={loading || !formData.phoneNumber || codeSent}
              className="terminal-send-btn"
            >
              {loading ? (
                <>
                  <span className="terminal-loading-spinner"></span>
                  Sending...
                </>
              ) : (
                'Send Code'
              )}
            </button>
          </div>
          <small>We'll send a verification code to your registered phone</small>
        </div>
      )}

      {codeSent && (
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
          />
          <small>
            {codeSent 
              ? `Code sent to your ${loginMethod}. Please check and enter the 6-digit code.`
              : 'Please send verification code first'
            }
          </small>
        </div>
      )}
    </div>

      <button
        onClick={handleReturningPatientLogin}
        disabled={loading || (!formData.patientId && !formData.qrCode)}
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