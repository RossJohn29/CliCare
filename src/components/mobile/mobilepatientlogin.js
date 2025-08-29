// mobilepatientlogin.js
import React, { useState, useEffect } from 'react';
import './mobilepatientlogin.css';

const MobilePatientLogin = () => {
  const [patientType, setPatientType] = useState('');
  const [loginMethod, setLoginMethod] = useState('email');
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

  const handleInputChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    setError('');
  };

  const handleMethodSwitch = (method) => {
    setLoginMethod(method);
    setCodeSent(false);
    setJustSent(false);
    setCredentials((prev) => ({ ...prev, otp: '' }));
    setError('');
  };

  const handleSendOTP = async () => {
    if (!credentials.patientId) {
      setError('Please enter your Patient ID');
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

      const response = await fetch('http://localhost:5000/api/outpatient/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      localStorage.setItem('patientToken', data.token);
      localStorage.setItem('patientId', data.patient.patient_id);
      localStorage.setItem('patientName', data.patient.name);
      localStorage.setItem('patientInfo', JSON.stringify(data.patient));

      window.location.href = '/mobile-patient-dashboard';
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* Patient Type Selection */
  const renderPatientTypeSelection = () => (
    <div className="mobile-card">
      <div className="mobile-form-header">
        <div className="mobile-patient-indicator">
          <span className="mobile-indicator">
            <i className="fa-regular fa-hospital"></i>
          </span>
        </div>
        <h3>Welcome to CliCare</h3>
        <p>Choose your access type below</p>
      </div>

      <div className="mobile-patient-types">
        <button onClick={() => setPatientType('old')} className="mobile-patient-btn">
          <div className="icon"><i className="fa-solid fa-user"></i></div>
          <div className="mobile-btn-content">
            <h3>Returning Patient</h3>
            <p>I have a Patient ID</p>
            <small>Access your medical records and book appointments</small>
          </div>
        </button>

        <button onClick={() => setPatientType('new')} className="mobile-patient-btn">
          <div className="icon"><i className="fa-solid fa-user-plus"></i></div>
          <div className="mobile-btn-content">
            <h3>New Patient</h3>
            <p>First time here</p>
            <small>Create your patient account in minutes</small>
          </div>
        </button>
      </div>
    </div>
  );

  /* Old Patient */
  const renderOldPatientLogin = () => (
    <div className="mobile-card">
      <div className="mobile-form-header">
        <div className="mobile-patient-indicator">
          <span className="mobile-indicator">
            <i className="fa-regular fa-user"></i>
          </span>
        </div>
        <h3>Welcome Back!</h3>
        <p>Enter your details to access your account</p>
      </div>

      {error && <div className="mobile-error">{error}</div>}

      <div className="mobile-login-form">
        <div className="mobile-input-group">
          <label>Patient ID</label>
          <input
            type="text"
            name="patientId"
            value={credentials.patientId}
            onChange={handleInputChange}
            placeholder="Enter Patient ID (e.g., PAT001)"
            className="mobile-form-input mobile-patient-id-input"
            required
            autoComplete="off"
            spellCheck="false"
          />
          <small className="mobile-input-hint">
            Found on your patient card or previous visit documents
          </small>
        </div>

        <div className="mobile-input-group">
          <div className="mobile-method-selection">
            <label>Verification Method</label>
            <div className="mobile-method-toggle">
              <button
                type="button"
                onClick={() => handleMethodSwitch('email')}
                className={`mobile-method-btn ${loginMethod === 'email' ? 'active' : ''}`}
              >
                <i className="fa-solid fa-envelope"></i> Email
              </button>
              <button
                type="button"
                onClick={() => handleMethodSwitch('phone')}
                className={`mobile-method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
              >
                <i className="fa-solid fa-phone"></i> SMS
              </button>
            </div>
          </div>
          
          <label>{loginMethod === 'email' ? 'Email Address' : 'Phone Number'}</label>
          <div className="mobile-contact-group">
            <input
              type={loginMethod === 'email' ? 'email' : 'tel'}
              name={loginMethod === 'email' ? 'email' : 'phoneNumber'}
              value={loginMethod === 'email' ? credentials.email : credentials.phoneNumber}
              onChange={handleInputChange}
              placeholder={loginMethod === 'email' ? 'you@example.com' : '09XX-XXX-XXXX'}
              className="mobile-form-input"
              required
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleSendOTP}
              className="mobile-otp-send-btn"
              disabled={sendingCode || justSent || countdown > 0}
            >
              {sendingCode
                ? (<><span className="mobile-loading-spinner"></span> Sending...</>)
                : justSent
                  ? 'Sent'
                  : countdown > 0
                    ? `Resend in ${countdown}s`
                    : 'Send Code'}
            </button>
          </div>
          <small className="mobile-input-hint">
            We'll send a verification code to your registered {loginMethod}
          </small>
        </div>

        <div className="mobile-input-group">
          <label>Verification Code</label>
          <input
            type="text"
            name="otp"
            value={credentials.otp}
            onChange={handleInputChange}
            placeholder="Enter 6-digit verification code"
            className="mobile-form-input"
            maxLength="6"
            disabled={sendingCode}
            required
          />
          <small className="mobile-input-hint">
            {codeSent
              ? (<><i className="fa-solid fa-square-check"></i> Code sent to your {loginMethod}</>)
              : (<><i className="fa-solid fa-triangle-exclamation"></i> Please send verification code first</>)
            }
          </small>
        </div>

        <button type="button" onClick={handleLogin} className="mobile-access-btn">
          Sign In
        </button>

        <div className="mobile-account-toggle">
          <p>
            Don't have an account?{' '}
            <button onClick={() => setPatientType('new')} className="mobile-account-link">
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  /* New Patient Registration */
  const renderNewPatientRedirect = () => (
    <div className="mobile-card">
      <div className="mobile-form-header">
        <div className="mobile-patient-indicator">
          <span className="mobile-indicator">
            <i className="fa-solid fa-user-plus"></i>
          </span>
        </div>
        <h3>Create Your Account</h3>
        <p>Join CliCare for better healthcare management</p>
      </div>

      <div className="mobile-reg-info">
        <div className="mobile-info-card">
          <h4>Quick Registration Process:</h4>
          <ul className="mobile-info-list">
            <li><i className="fa-solid fa-check"></i> Personal information (name, age, contact)</li>
            <li><i className="fa-solid fa-check"></i> Emergency contact details</li>
            <li><i className="fa-solid fa-check"></i> Optional ID scan for faster setup</li>
            <li><i className="fa-solid fa-check"></i> Review and confirm your details</li>
          </ul>
        </div>
      </div>

      <button
        onClick={() => (window.location.href = '/mobile-patient-register')}
        className="mobile-access-btn"
      >
        Start Registration
      </button>

      <div className="mobile-account-toggle">
        <p>
          Already have an account?{' '}
          <button onClick={() => setPatientType('old')} className="mobile-account-link">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <div className="mobile-patient-portal">
      <div className="mobile-header">
        <div className="mobile-logo">CliCare</div>
        <div className="mobile-title">
          <h1>CliCare</h1>
          <p>Digital Patient Management</p>
        </div>
        <div className="mobile-hospital-info">
          <p><strong>Mobile Portal</strong></p>
          <p>Patient Access</p>
        </div>
      </div>

      <div className="mobile-content">
        {!patientType && renderPatientTypeSelection()}
        {patientType === 'old' && renderOldPatientLogin()}
        {patientType === 'new' && renderNewPatientRedirect()}
      </div>

      <div className="mobile-footer">
        <p>Secure patient access • Need help? Tap to call (02) 8123-4567</p>
      </div>
    </div>
  );
};

export default MobilePatientLogin;