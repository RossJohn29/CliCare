// mobilepatientregistration.js - Fixed Mobile-Optimized Registration Component
import React, { useState, useEffect } from 'react';
import './mobilepatientregistration.css';

const MobilePatientRegistration = () => {
  const [formData, setFormData] = useState({
    // Personal Details
    fullName: '',
    age: '',
    sex: '',
    address: '',
    contactNumber: '',
    email: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyRelationship: '',
    
    // Optional ID Scan
    idType: '',
    idNumber: ''
  });
  
  const [currentStep, setCurrentStep] = useState(1); // 1: Personal, 2: Emergency, 3: Review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [idScanMode, setIdScanMode] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleIDScan = () => {
    setIdScanMode(true);
    setError('');
    
    // Simulate OCR scanning with realistic delay
    setTimeout(() => {
      setFormData({
        ...formData,
        fullName: 'MARIA CLARA SANTOS',
        address: 'BLOCK 15 LOT 8, BARANGAY SAN JOSE, MANILA, METRO MANILA',
        idType: 'National ID',
        idNumber: '1234-5678-9012-3456'
      });
      setIdScanMode(false);
      alert('✅ ID scanned successfully! Information auto-filled.');
    }, 3000);
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.fullName && formData.age && formData.sex && 
               formData.address && formData.contactNumber && formData.email;
      case 2:
        return formData.emergencyContactName && formData.emergencyContactNumber && 
               formData.emergencyRelationship;
      case 3:
        return termsAccepted;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      setError('');
    } else {
      if (currentStep === 3) {
        setError('Please accept the terms and conditions to proceed');
      } else {
        setError('Please fill in all required fields');
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  const generatePatientId = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `PAT${timestamp}`;
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setError('Please accept the terms and conditions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2500));

      const newPatientId = generatePatientId();

      // Mock successful registration
      alert(`🎉 Registration successful!\n\nYour Patient ID: ${newPatientId}\n\nPlease save this ID for future visits.`);
      
      // Redirect to mobile patient login
      sessionStorage.setItem('registrationSuccess', 'true');
      sessionStorage.setItem('newPatientId', newPatientId);
      window.location.href = '/mobile-patient-login';
    } catch (err) {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalDetailsStep = () => (
    <div className="mobile-reg-card mobile-step-transition">
      <div className="mobile-step-header">
        <h2>Personal Information</h2>
        <p>Tell us about yourself</p>
      </div>

      <div className="mobile-id-scan">
        <button 
          type="button" 
          onClick={handleIDScan}
          className="mobile-id-scan-btn"
          disabled={idScanMode}
        >
          {idScanMode ? (
            <>
              <span className="mobile-loading-spinner"></span>
              Scanning ID...
            </>
          ) : (
            <>🆔 Scan Philippine ID</>
          )}
        </button>
        <small>Optional: Auto-fill using your ID</small>
      </div>

      <div className="mobile-form-grid">
        <div className="mobile-reg-input-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter your complete legal name"
            className="mobile-reg-input"
            required
          />
        </div>

        <div className="mobile-form-grid two-column">
          <div className="mobile-reg-input-group">
            <label>Age *</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Age"
              className="mobile-reg-input"
              min="1"
              max="120"
              required
            />
          </div>

          <div className="mobile-reg-input-group">
            <label>Sex *</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleInputChange}
              className="mobile-reg-input"
              required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        <div className="mobile-reg-input-group">
          <label>Complete Address *</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="House/Unit, Street, Barangay, City, Province"
            className="mobile-reg-input mobile-reg-textarea"
            rows="3"
            required
          />
        </div>

        <div className="mobile-reg-input-group">
          <label>Contact Number *</label>
          <input
            type="tel"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleInputChange}
            placeholder="09XX-XXX-XXXX"
            className="mobile-reg-input"
            pattern="[0-9]{11}"
            required
          />
        </div>

        <div className="mobile-reg-input-group">
          <label>Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your.email@example.com"
            className="mobile-reg-input"
            required
          />
        </div>
      </div>
    </div>
  );

  const renderEmergencyContactStep = () => (
    <div className="mobile-reg-card mobile-step-transition">
      <div className="mobile-step-header">
        <h2>Emergency Contact</h2>
        <p>Who should we contact in emergencies?</p>
      </div>

      <div className="mobile-emergency-banner">
        <span style={{ fontSize: '1.2em' }}>🚨</span>
        <p>This person will be contacted during medical emergencies</p>
      </div>

      <div className="mobile-form-grid">
        <div className="mobile-reg-input-group">
          <label>Emergency Contact Name *</label>
          <input
            type="text"
            name="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={handleInputChange}
            placeholder="Full name of emergency contact"
            className="mobile-reg-input"
            required
          />
        </div>

        <div className="mobile-reg-input-group">
          <label>Contact Number *</label>
          <input
            type="tel"
            name="emergencyContactNumber"
            value={formData.emergencyContactNumber}
            onChange={handleInputChange}
            placeholder="09XX-XXX-XXXX"
            className="mobile-reg-input"
            pattern="[0-9]{11}"
            required
          />
        </div>

        <div className="mobile-reg-input-group">
          <label>Relationship *</label>
          <select
            name="emergencyRelationship"
            value={formData.emergencyRelationship}
            onChange={handleInputChange}
            className="mobile-reg-input"
            required
          >
            <option value="">Select relationship</option>
            <option value="Parent">Parent</option>
            <option value="Spouse">Spouse/Partner</option>
            <option value="Sibling">Sibling</option>
            <option value="Child">Child</option>
            <option value="Relative">Other Relative</option>
            <option value="Friend">Close Friend</option>
            <option value="Guardian">Legal Guardian</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="mobile-reg-card mobile-step-transition">
      <div className="mobile-step-header">
        <h2>Review & Confirm</h2>
        <p>Please verify your information</p>
      </div>

      <div className="mobile-review-sections">
        <div className="mobile-review-section">
          <h3>📋 Personal Information</h3>
          <div className="mobile-review-item">
            <label>Full Name:</label>
            <span>{formData.fullName}</span>
          </div>
          <div className="mobile-review-item">
            <label>Age & Sex:</label>
            <span>{formData.age} years old, {formData.sex}</span>
          </div>
          <div className="mobile-review-item">
            <label>Contact Number:</label>
            <span>{formData.contactNumber}</span>
          </div>
          <div className="mobile-review-item">
            <label>Email:</label>
            <span>{formData.email}</span>
          </div>
          <div className="mobile-review-item">
            <label>Address:</label>
            <span>{formData.address}</span>
          </div>
        </div>

        <div className="mobile-review-section">
          <h3>🚨 Emergency Contact</h3>
          <div className="mobile-review-item">
            <label>Name:</label>
            <span>{formData.emergencyContactName}</span>
          </div>
          <div className="mobile-review-item">
            <label>Number:</label>
            <span>{formData.emergencyContactNumber}</span>
          </div>
          <div className="mobile-review-item">
            <label>Relationship:</label>
            <span>{formData.emergencyRelationship}</span>
          </div>
        </div>

        {formData.idType && (
          <div className="mobile-review-section">
            <h3>🆔 ID Information</h3>
            <div className="mobile-review-item">
              <label>ID Type:</label>
              <span>{formData.idType}</span>
            </div>
            <div className="mobile-review-item">
              <label>ID Number:</label>
              <span>{formData.idNumber}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mobile-terms">
        <label className="mobile-checkbox-label">
          <input 
            type="checkbox" 
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required 
          />
          <span>I agree to CLICARE's privacy policy and terms of service</span>
        </label>
      </div>
    </div>
  );

  const renderNavigationButtons = () => {
    if (currentStep === 3) {
      return (
        <div className="mobile-nav-buttons">
          <button 
            type="button" 
            onClick={prevStep}
            className="mobile-nav-btn secondary"
            disabled={loading}
          >
            ← Back
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || !termsAccepted}
            className="mobile-nav-btn primary submit"
          >
            {loading ? (
              <>
                <span className="mobile-loading-spinner"></span>
                Creating...
              </>
            ) : (
              '✅ Complete'
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="mobile-nav-buttons">
        {currentStep > 1 && (
          <button 
            type="button" 
            onClick={prevStep}
            className="mobile-nav-btn secondary"
          >
            ← Back
          </button>
        )}
        <button 
          type="button"
          onClick={nextStep}
          className="mobile-nav-btn primary"
          disabled={!validateStep(currentStep)}
        >
          Continue →
        </button>
      </div>
    );
  };

  const renderProgressBar = () => (
    <div className="mobile-progress-container">
      <div className="mobile-progress-bar">
        <div className={`mobile-step ${currentStep >= 1 ? 'active' : ''}`}>
          <span className="mobile-step-number">1</span>
          <span className="mobile-step-label">Personal</span>
        </div>
        <div className={`mobile-step-line ${currentStep >= 2 ? 'active' : ''}`}></div>
        <div className={`mobile-step ${currentStep >= 2 ? 'active' : ''}`}>
          <span className="mobile-step-number">2</span>
          <span className="mobile-step-label">Emergency</span>
        </div>
        <div className={`mobile-step-line ${currentStep >= 3 ? 'active' : ''}`}></div>
        <div className={`mobile-step ${currentStep >= 3 ? 'active' : ''}`}>
          <span className="mobile-step-number">3</span>
          <span className="mobile-step-label">Review</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mobile-registration-portal">
      <div className="mobile-reg-header">
        <div className="mobile-reg-logo">🏥</div>
        <h1>CLICARE</h1>
        <p>New Patient Registration</p>
      </div>

      {renderProgressBar()}
      
      <div className="mobile-reg-content">
        {error && <div className="mobile-reg-error">⚠️ {error}</div>}
        
        {currentStep === 1 && renderPersonalDetailsStep()}
        {currentStep === 2 && renderEmergencyContactStep()}
        {currentStep === 3 && renderReviewStep()}

        <div className="mobile-back-to-login">
          <button 
            onClick={() => window.location.href = '/mobile-patient-login'}
            className="mobile-back-to-login-btn"
          >
            ← Back to Login
          </button>
          
          <div className="mobile-help-text">
            <p>💬 Need help? <strong>Tap to call (02) 8123-4567</strong></p>
            <p>🕒 Registration hours: Mon-Fri 7AM-5PM</p>
          </div>
        </div>
      </div>

      <div className="mobile-nav-container">
        {renderNavigationButtons()}
      </div>
    </div>
  );
};

export default MobilePatientRegistration;