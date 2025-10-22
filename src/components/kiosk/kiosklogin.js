// kiosklogin.js
import React, { useState, useEffect } from 'react';
import './kiosklogin.css';
import logo from "../../logo.png";
import { 
  User,
  UserPlus,
  Mail,
  Phone,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const KioskLogin = () => {
  const [patientType, setPatientType] = useState('');
  const [loginMethod, setLoginMethod] = useState('email');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);
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
  const [countdown, setCountdown] = useState(0);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Enhanced phone number validation
  const validatePhoneNumber = (phone) => {
    // Philippine phone number format
    const phoneRegex = /^(09|\+639|639)\d{9}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  };

  // Enhanced email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    
    if (showValidation) {
      setShowValidation(false);
      setFieldErrors({});
    }
    
    setError('');
  };

  const handleMethodSwitch = (method) => {
    setLoginMethod(method);
    setCodeSent(false);
    setJustSent(false);
    setCredentials((prev) => ({ ...prev, otp: '' }));
    setError('');
    // Clear field-specific errors when switching methods
    setFieldErrors({});
    setShowValidation(false);
  };

  const handleSendOTP = async () => {
    const stepErrors = {};
    
    if (!credentials.patientId.trim()) {
      stepErrors.patientId = 'Patient ID is required';
    }

    const contactValue = loginMethod === 'email' ? credentials.email : credentials.phoneNumber;
    if (!contactValue.trim()) {
      if (loginMethod === 'email') {
        stepErrors.email = 'Email address is required';
      } else {
        stepErrors.phoneNumber = 'Phone number is required';
      }
    } else {
      // Enhanced validation
      if (loginMethod === 'email' && !validateEmail(contactValue)) {
        stepErrors.email = 'Please enter a valid email address';
      }
      if (loginMethod === 'phone' && !validatePhoneNumber(contactValue)) {
        stepErrors.phoneNumber = 'Please enter a valid Philippine phone number (09XXXXXXXXX)';
      }
    }

    setFieldErrors(stepErrors);
    setShowValidation(true);

    if (Object.keys(stepErrors).length > 0) {
      return;
    }

    setSendingCode(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/outpatient/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      setCodeSent(true);
      setJustSent(true);
      
      setTimeout(() => {
        setJustSent(false);
        setCountdown(120);
      }, 2000);
    } catch (err) {
      console.error('Send OTP error:', err);
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const stepErrors = {};

    if (!credentials.patientId.trim()) {
      stepErrors.patientId = 'Patient ID is required';
    }

    if (!codeSent) {
      stepErrors.otp = 'Please send verification code first';
    } else if (!credentials.otp.trim()) {
      stepErrors.otp = 'Verification code is required';
    }

    const contactValue = loginMethod === 'email' ? credentials.email : credentials.phoneNumber;
    if (!contactValue.trim()) {
      if (loginMethod === 'email') {
        stepErrors.email = 'Email address is required';
      } else {
        stepErrors.phoneNumber = 'Phone number is required';
      }
    }

    setFieldErrors(stepErrors);
    setShowValidation(true);

    if (Object.keys(stepErrors).length > 0) {
      setLoading(false);
      return;
    }

    try {
      const requestBody = {
        patientId: credentials.patientId.toUpperCase(),
        contactInfo: contactValue,
        otp: credentials.otp,
        deviceType: 'kiosk'
      };

      console.log('Sending login request:', requestBody);

      const response = await fetch('http://localhost:5000/api/outpatient/verify-otp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok) {
        setError(data.error || 'Login failed. Please check your verification code.');
        setLoading(false);
        return;
      }

      // Store comprehensive patient data
      localStorage.setItem('patientToken', data.token);
      localStorage.setItem('patientId', data.patient.patient_id);
      localStorage.setItem('patientName', data.patient.name);
      localStorage.setItem('patientInfo', JSON.stringify(data.patient));

      // Store emergency contact separately for easy access
      if (data.patient.emergency_contact_name) {
        localStorage.setItem('emergencyContact', JSON.stringify({
          name: data.patient.emergency_contact_name,
          relationship: data.patient.emergency_contact_relationship,
          contact_no: data.patient.emergency_contact_no
        }));
      }

      // Store login metadata
      localStorage.setItem('loginMethod', loginMethod);
      localStorage.setItem('deviceType', 'kiosk');
      localStorage.setItem('loginTimestamp', new Date().toISOString());

      console.log('✅ Login successful for:', data.patient.name);
      
      // Use window.location.replace for better security
      window.location.replace('/kiosk-dashboard');

    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* Patient Type Selection */
  const renderPatientTypeSelection = () => (
    <div className="kiosklogin-card">
      <div className="kiosklogin-form-header">
        <div className="kiosklogin-indicator">
          <span className="kiosk-indicator">
            <img src={logo} alt="Logo" className="kiosklogin-indicator-logo"/>
          </span>
        </div>
        <h3>Welcome to CliCare</h3>
        <p>Choose your access type below</p>
      </div>

      <div className="kiosklogin-types">
        <button onClick={() => setPatientType('old')} className="kiosklogin-btn">
          <div className="icon">
            <User size={20} />
          </div>
          <div className="kiosklogin-btn-content">
            <h3>Returning Patient</h3>
            <p>I have a Patient ID</p>
            <small>Login with an existing account</small>
          </div>
        </button>

        <button onClick={() => setPatientType('new')} className="kiosklogin-btn">
          <div className="icon">
            <UserPlus size={20} />
          </div>
          <div className="kiosklogin-btn-content">
            <h3>New Patient</h3>
            <p>First time here</p>
            <small>Create your patient account</small>
          </div>
        </button>
      </div>
    </div>
  );

  /* Old Patient */
  const renderOldPatientLogin = () => (
    <div className="kiosklogin-card">
      <div className="kiosklogin-form-header">
        <div className="kiosklogin-indicator">
          <span className="kiosk-indicator">
            <User size={25} />
          </span>
        </div>
        <h3>Welcome Back!</h3>
        <p>Enter your details to access your account</p>
      </div>

      {error && <div className="kiosklogin-error">{error}</div>}

      <div className="kiosklogin-login-form">
        <div className="kiosklogin-input-group">
          <label>Patient ID</label>
          <input
            type="text"
            name="patientId"
            value={credentials.patientId}
            onChange={handleInputChange}
            placeholder="Enter Patient ID (e.g., PAT001)"
            className={`kiosklogin-form-input ${fieldErrors.patientId ? 'invalid' : ''}`}
            required
            autoComplete="off"
            spellCheck="false"
          />
          <small className="kiosklogin-input-hint">
            Found on your patient card or previous visit documents
          </small>
          {showValidation && fieldErrors.patientId && (
            <small className="error-text">{fieldErrors.patientId}</small>
          )}
        </div>

        <div className="kiosklogin-input-group">
          <div className="kiosklogin-method-selection">
            <label>Verification Method</label>
            <div className="kiosklogin-method-toggle">
              <button
                type="button"
                onClick={() => handleMethodSwitch('email')}
                className={`kiosklogin-method-btn ${loginMethod === 'email' ? 'active' : ''}`}
              >
                <Mail size={16} /> Email
              </button>
              <button
                type="button"
                onClick={() => handleMethodSwitch('phone')}
                className={`kiosklogin-method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
              >
                <Phone size={16} /> SMS
              </button>
            </div>
          </div>
          
          <label>{loginMethod === 'email' ? 'Email Address' : 'Phone Number'}</label>
          <div className="kiosklogin-contact-group">
            <input
              type={loginMethod === 'email' ? 'email' : 'tel'}
              name={loginMethod === 'email' ? 'email' : 'phoneNumber'}
              value={loginMethod === 'email' ? credentials.email : credentials.phoneNumber}
              onChange={handleInputChange}
              placeholder={loginMethod === 'email' ? 'you@example.com' : '09XX-XXX-XXXX'}
              className={`kiosklogin-form-input ${fieldErrors[loginMethod === 'email' ? 'email' : 'phoneNumber'] ? 'invalid' : ''}`}
              required
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleSendOTP}
              className="kiosklogin-otp-send-btn"
              disabled={sendingCode || justSent || countdown > 0}
            >
              {sendingCode
                ? (<><span className="kiosklogin-loading-spinner"></span> Sending...</>)
                : justSent
                  ? 'Sent'
                  : countdown > 0
                    ? `Resend in ${countdown}s`
                    : 'Send Code'}
            </button>
          </div>
          <small className="kiosklogin-input-hint">
            We'll send a verification code to your registered {loginMethod}
          </small>
          {showValidation && fieldErrors[loginMethod === 'email' ? 'email' : 'phoneNumber'] && (
            <small className="error-text">{fieldErrors[loginMethod === 'email' ? 'email' : 'phoneNumber']}</small>
          )}
        </div>

        <div className="kiosklogin-input-group">
          <label>Verification Code</label>
          <input
            type="text"
            name="otp"
            value={credentials.otp}
            onChange={handleInputChange}
            placeholder="Enter 6-digit verification code"
            className={`kiosklogin-form-input ${fieldErrors.otp ? 'invalid' : ''}`}
            maxLength="6"
            disabled={sendingCode}
            required
          />
          <small className="kiosklogin-input-hint">
            {codeSent
              ? (<><CheckCircle size={14} /> Code sent to your {loginMethod}</>)
              : (<><AlertTriangle size={14} /> Please send verification code first</>)
            }
          </small>
          {showValidation && fieldErrors.otp && (
            <small className="error-text">{fieldErrors.otp}</small>
          )}
        </div>

        <button 
          type="button" 
          onClick={handleLogin} 
          className="kiosklogin-access-btn"
          disabled={loading}
        >
          Sign In
        </button>

        <div className="kiosklogin-account-toggle">
          <p>
            Don't have an account?{' '}
            <button onClick={() => setPatientType('new')} className="kiosklogin-account-link">
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  /* New Patient Registration */
  const renderNewPatientRedirect = () => (
    <div className="kiosklogin-card">
      <div className="kiosklogin-form-header">
        <div className="kiosklogin-indicator">
          <span className="kiosk-indicator">
            <UserPlus size={25} />
          </span>
        </div>
        <h3>Create Your Account</h3>
        <p>Join CliCare for better healthcare management</p>
      </div>

      <div className="kiosklogin-reg-info">
        <div className="kiosklogin-info-card">
          <h4>Quick Registration Process:</h4>
          <ul className="kiosklogin-info-list">
            <li><CheckCircle size={14} /> Personal information (name, age, contact)</li>
            <li><CheckCircle size={14} /> Emergency contact details</li>
            <li><CheckCircle size={14} /> Optional ID scan for faster setup</li>
            <li><CheckCircle size={14} /> Review and confirm your details</li>
          </ul>
        </div>
      </div>

      <button
        onClick={() => (window.location.href = '/kiosk-registration')}
        className="kiosklogin-access-btn"
      >
        Start Registration
      </button>

      <div className="kiosklogin-account-toggle">
        <p>
          Already have an account?{' '}
          <button onClick={() => setPatientType('old')} className="kiosklogin-account-link">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <div className="kiosklogin-portal">
      <div className="kiosklogin-content">
        {!patientType && renderPatientTypeSelection()}
        {patientType === 'old' && renderOldPatientLogin()}
        {patientType === 'new' && renderNewPatientRedirect()}
      </div>

      <div className="kiosklogin-footer">
        <p>Secure patient access • Need help? Tap to call (02) 8123-4567</p>
      </div>
    </div>
  );
};

export default KioskLogin;