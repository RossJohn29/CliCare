// terminalpatientregistration.js - UPDATED to display non-editable patient data for returning patients
import React, { useState, useEffect } from 'react';
import './terminalpatientregistration.css';

const TerminalPatientRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [patientType, setPatientType] = useState('new'); // 'new' or 'returning'
  const [patientData, setPatientData] = useState({
    // Patient Info from database
    patient_id: '',
    name: '',
    birthday: '',
    age: '',
    sex: '',
    address: '',
    contact_no: '',
    email: '',
    registration_date: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_no: '',

    
    // Form data for symptoms (editable)
    selectedSymptoms: [],
    preferredTime: '',
    duration: '',
    severity: '',
    previousTreatment: '',
    allergies: '',
    medications: '',
    preferredDate: '',
    appointmentTime: ''
  });
  
  const [formData, setFormData] = useState({
    // New patient form data (only used for new registrations)
    fullName: '',
    age: '',
    sex: '',
    address: '',
    contactNumber: '',
    email: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyRelationship: '',
    idType: '',
    idNumber: '',
    selectedSymptoms: [],
    preferredTime: '',
    duration: '',
    severity: '',
    previousTreatment: '',
    allergies: '',
    medications: '',
    preferredDate: '',
    appointmentTime: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [idScanMode, setIdScanMode] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Check authentication and patient type
    const storedPatientType = sessionStorage.getItem('patientType') || 'new';
    const storedPatientInfo = sessionStorage.getItem('patientInfo');
    const patientToken = sessionStorage.getItem('patientToken');
    
    setPatientType(storedPatientType);
    
    if (storedPatientType === 'returning' && storedPatientInfo) {
      try {
        const patientInfo = JSON.parse(storedPatientInfo);
        console.log('Retrieved patient info:', patientInfo);
        
        // Map database fields to display data
        setPatientData({
          patient_id: patientInfo.patient_id || '',
          name: patientInfo.name || '',
          birthday: patientInfo.birthday || '',
          age: patientInfo.age || '',
          sex: patientInfo.sex || '',
          address: patientInfo.address || '',
          contact_no: patientInfo.contact_no || '',
          email: patientInfo.email || '',
          registration_date: patientInfo.registration_date || '',
          emergency_contact_name: patientInfo.emergency_contact_name || '',
          emergency_contact_relationship: patientInfo.emergency_contact_relationship || '',
          emergency_contact_no: patientInfo.emergency_contact_no || '',
          // Initialize symptom data as empty - user will fill these
          selectedSymptoms: [],
          preferredTime: '',
          duration: '',
          severity: '',
          previousTreatment: '',
          allergies: '',
          medications: '',
          preferredDate: '',
          appointmentTime: ''
        });
        
        // Skip to symptoms step for returning patients
        setCurrentStep(4);
        
      } catch (err) {
        console.error('Error parsing patient info:', err);
        setError('Error loading patient information. Please try logging in again.');
      }
    } else if (storedPatientType === 'new') {
      // For new patients, start from step 1
      setCurrentStep(1);
    } else {
      // No valid session, redirect to login
      console.warn('No valid patient session found');
      window.location.href = '/terminal-patient-login';
    }

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (patientType === 'returning') {
      // For returning patients, only update symptom-related fields
      setPatientData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      // For new patients, update form data
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  const handleSymptomToggle = (symptom) => {
    if (patientType === 'returning') {
      const isSelected = patientData.selectedSymptoms.includes(symptom);
      const updatedSymptoms = isSelected
        ? patientData.selectedSymptoms.filter(s => s !== symptom)
        : [...patientData.selectedSymptoms, symptom];
      
      setPatientData(prev => ({
        ...prev,
        selectedSymptoms: updatedSymptoms
      }));
    } else {
      const isSelected = formData.selectedSymptoms.includes(symptom);
      const updatedSymptoms = isSelected
        ? formData.selectedSymptoms.filter(s => s !== symptom)
        : [...formData.selectedSymptoms, symptom];
      
      setFormData(prev => ({
        ...prev,
        selectedSymptoms: updatedSymptoms
      }));
    }
    setError('');
  };

  // Validation function - UPDATED to check emergency contact for returning patients
  const validateStep = (step) => {
    if (patientType === 'returning') {
      // For returning patients
      switch (step) {
        case 4: // Personal Info Review (check emergency contact data exists)
          return patientData.patient_id && 
                 patientData.name && 
                 patientData.emergency_contact_name && 
                 patientData.emergency_contact_relationship && 
                 patientData.emergency_contact_no;
        case 5: // Symptoms
          return patientData.selectedSymptoms && patientData.selectedSymptoms.length > 0;
        case 6: // Health Info
          return patientData.duration && patientData.severity;
        case 7: // Final Review
          return patientData.selectedSymptoms.length > 0 && 
                 patientData.duration && 
                 patientData.severity &&
                 patientData.emergency_contact_name && 
                 patientData.emergency_contact_relationship && 
                 patientData.emergency_contact_no;
        default:
          return true;
      }
    } else {
      // For new patients (existing validation)
      switch (step) {
        case 1: // Personal Details
          return formData.fullName && formData.age && formData.sex && formData.address && formData.contactNumber && formData.email;
        case 2: // Emergency Contact
          return formData.emergencyContactName && formData.emergencyContactNumber && formData.emergencyRelationship;
        case 3: // ID Verification
          return formData.idType && formData.idNumber;
        case 4: // Symptoms
          return formData.selectedSymptoms && formData.selectedSymptoms.length > 0;
        case 5: // Health Info
          return formData.duration && formData.severity;
        case 6: // Review
          return formData.fullName && formData.selectedSymptoms.length > 0 && termsAccepted;
        default:
          return true;
      }
    }
  };

  const nextStep = () => {
    const maxStep = patientType === 'returning' ? 7 : 6;
    if (currentStep < maxStep && validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      setError('');
    } else {
      setError('Please complete all required fields before continuing.');
    }
  };

  const prevStep = () => {
    const minStep = patientType === 'returning' ? 4 : 1;
    if (currentStep > minStep) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  // MODIFICATION 1: Update the renderProgressBar function in terminalpatientregistration.js
// Replace your existing renderProgressBar function with this enhanced version

const renderProgressBar = () => {
  const totalSteps = patientType === 'returning' ? 4 : 6; // Returning: Info, Symptoms, Details, Summary
  const stepNames = patientType === 'returning' 
    ? ['Personal', 'Symptoms', 'Details', 'Summary']
    : ['Personal', 'Emergency', 'Review', 'Symptoms', 'Details', 'Summary'];
  
  const adjustedStep = patientType === 'returning' 
    ? Math.max(1, currentStep - 3) // Map steps 4,5,6,7 to 1,2,3,4
    : currentStep;

  const stepIcons = patientType === 'returning' 
    ? ['1', '2', '3', '4'] 
    : ['1', '2', '3', '4', '5', '6'];

  return (
    <div className="terminal-progress-container">
      <div className="terminal-progress-steps">
        {stepNames.map((name, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === adjustedStep;
          const isCompleted = stepNumber < adjustedStep;
          
          return (
            <React.Fragment key={index}>
              <div className="terminal-progress-step-wrapper">
                <div className={`terminal-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="terminal-step-number">
                    {isCompleted ? '✓' : stepIcons[index]}
                  </div>
                  <div className="terminal-step-label">{name}</div>
                </div>
              </div>
              
              {/* Add connecting line between steps (except after last step) */}
              {index < stepNames.length - 1 && (
                <div className={`terminal-step-connector ${isCompleted ? 'completed' : ''} ${stepNumber === adjustedStep - 1 ? 'active' : ''}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
    </div>
  );
};

  // RETURNING PATIENT READ-ONLY INFORMATION DISPLAY STEP
  const renderPatientInfoStep = () => (
    <div className="terminal-reg-card terminal-step-transition">
      <div className="terminal-step-header">
        <div className="terminal-step-icon">👤</div>
        <h3>Patient Information</h3>
        <p>Your Registered Information</p>
      </div>

      <div className="terminal-patient-info-banner">
        <div className="terminal-info-icon">✅</div>
        <div className="terminal-info-content">
          <h4>Welcome back, {patientData.name}!</h4>
          <p>Your information is displayed below for verification. This data cannot be edited at the terminal.</p>
        </div>
      </div>

      <div className="terminal-readonly-sections">
        <div className="terminal-readonly-section">
          <h4>🏥 Basic Information</h4>
          <div className="terminal-readonly-grid">
            <div className="terminal-readonly-item">
              <label>Patient ID:</label>
              <div className="terminal-readonly-value">{patientData.patient_id}</div>
            </div>
            <div className="terminal-readonly-item">
              <label>Full Name:</label>
              <div className="terminal-readonly-value">{patientData.name}</div>
            </div>
            <div className="terminal-readonly-item">
              <label>Age:</label>
              <div className="terminal-readonly-value">{patientData.age} years old</div>
            </div>
            <div className="terminal-readonly-item">
              <label>Sex:</label>
              <div className="terminal-readonly-value">{patientData.sex}</div>
            </div>
            <div className="terminal-readonly-item">
              <label>Date of Birth:</label>
              <div className="terminal-readonly-value">
                {patientData.birthday ? new Date(patientData.birthday).toLocaleDateString() : 'Not available'}
              </div>
            </div>
            <div className="terminal-readonly-item full-width">
              <label>Address:</label>
              <div className="terminal-readonly-value">{patientData.address}</div>
            </div>
          </div>
        </div>

        <div className="terminal-readonly-section">
          <h4>📞 Contact Information</h4>
          <div className="terminal-readonly-grid">
            <div className="terminal-readonly-item">
              <label>Contact Number:</label>
              <div className="terminal-readonly-value">{patientData.contact_no}</div>
            </div>
            <div className="terminal-readonly-item">
              <label>Email Address:</label>
              <div className="terminal-readonly-value">{patientData.email}</div>
            </div>
            <div className="terminal-readonly-item">
              <label>Registration Date:</label>
              <div className="terminal-readonly-value">
                {patientData.registration_date ? new Date(patientData.registration_date).toLocaleDateString() : 'Not available'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="terminal-readonly-section">
          <h4>🚨 Emergency Contact</h4>
          <div className="terminal-readonly-grid">
            <div className="terminal-readonly-item">
              <label>Contact Name:</label>
              <div className="terminal-readonly-value">
                {patientData.emergency_contact_name || 'Not provided'}
              </div>
            </div>
            <div className="terminal-readonly-item">
              <label>Relationship:</label>
              <div className="terminal-readonly-value">
                {patientData.emergency_contact_relationship || 'Not provided'}
              </div>
            </div>
            <div className="terminal-readonly-item">
              <label>Contact Number:</label>
              <div className="terminal-readonly-value">
                {patientData.emergency_contact_no || 'Not provided'}
              </div>
            </div>
          </div>
        </div>

      {(!patientData.emergency_contact_name || !patientData.emergency_contact_relationship || !patientData.emergency_contact_no) && (
        <div className="terminal-warning-note">
          <div className="terminal-warning-icon">⚠️</div>
          <div className="terminal-warning-content">
            <strong>Emergency Contact Required</strong>
            <p>Your emergency contact information is incomplete. Please visit the reception desk to update this information before continuing.</p>
          </div>
        </div>
      )}
      </div>
  );

  // NEW PATIENT FORM STEPS (existing implementation)
  const renderPersonalDetailsStep = () => (
    <div className="terminal-reg-card terminal-step-transition">
      <div className="terminal-step-header">
        <div className="terminal-step-icon">👤</div>
        <h3>Personal Information</h3>
        <p>Please provide your basic information</p>
      </div>

      <div className="terminal-id-scan">
        <button
          onClick={() => setIdScanMode(!idScanMode)}
          disabled={idScanMode}
          className="terminal-id-scan-btn"
        >
          {idScanMode ? (
            <>
              <span className="terminal-loading-spinner"></span>
              Scanning ID...
            </>
          ) : (
            <>
              📄 Scan Philippine ID for Quick Setup
            </>
          )}
        </button>
        <small>Scan your ID for faster data entry</small>
      </div>

      <div className="terminal-form-grid two-column">
        <div className="terminal-reg-input-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter your complete name"
            className="terminal-reg-input"
            required
          />
        </div>

        <div className="terminal-reg-input-group">
          <label>Age *</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            placeholder="Age"
            className="terminal-reg-input"
            min="1"
            max="120"
            required
          />
        </div>

        <div className="terminal-reg-input-group">
          <label>Sex *</label>
          <select
            name="sex"
            value={formData.sex}
            onChange={handleInputChange}
            className="terminal-reg-input"
            required
          >
            <option value="">Select sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="terminal-reg-input-group">
          <label>Contact Number *</label>
          <input
            type="tel"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleInputChange}
            placeholder="09XX-XXX-XXXX"
            className="terminal-reg-input"
            required
          />
        </div>

        <div className="terminal-reg-input-group full-width">
          <label>Complete Address *</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="House No., Street, Barangay, City, Province"
            className="terminal-reg-input"
            required
          />
        </div>

        <div className="terminal-reg-input-group full-width">
          <label>Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your.email@example.com"
            className="terminal-reg-input"
            required
          />
        </div>
      </div>
    </div>
  );

  const renderEmergencyContactStep = () => (
    <div className="terminal-reg-card terminal-step-transition">
      <div className="terminal-step-header">
        <div className="terminal-step-icon">🚨</div>
        <h3>Emergency Contact</h3>
        <p>Provide emergency contact information</p>
      </div>

      <div className="terminal-emergency-banner">
        <div className="terminal-banner-icon">🚨</div>
        <div className="terminal-banner-content">
          <h4>Important Information</h4>
          <p>This person will be contacted in case of medical emergency</p>
        </div>
      </div>

      <div className="terminal-form-grid">
        <div className="terminal-reg-input-group">
          <label>Emergency Contact Name *</label>
          <input
            type="text"
            name="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={handleInputChange}
            placeholder="Full name of emergency contact"
            className="terminal-reg-input"
            required
          />
        </div>

        <div className="terminal-reg-input-group">
          <label>Contact Number *</label>
          <input
            type="tel"
            name="emergencyContactNumber"
            value={formData.emergencyContactNumber}
            onChange={handleInputChange}
            placeholder="09XX-XXX-XXXX"
            className="terminal-reg-input"
            required
          />
        </div>

        <div className="terminal-reg-input-group">
          <label>Relationship *</label>
          <select
            name="emergencyRelationship"
            value={formData.emergencyRelationship}
            onChange={handleInputChange}
            className="terminal-reg-input"
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
    <div className="terminal-reg-card terminal-step-transition">
      <div className="terminal-step-header">
        <div className="terminal-step-icon">📋</div>
        <h3>Review & Confirm</h3>
        <p>Please verify all information is correct</p>
      </div>

      <div className="terminal-review-sections">
        <div className="terminal-review-section">
          <h4>👤 Personal Information</h4>
          <div className="terminal-review-grid">
            <div className="terminal-review-item">
              <label>Full Name:</label>
              <span>{formData.fullName}</span>
            </div>
            <div className="terminal-review-item">
              <label>Age & Sex:</label>
              <span>{formData.age} years old, {formData.sex}</span>
            </div>
            <div className="terminal-review-item">
              <label>Contact Number:</label>
              <span>{formData.contactNumber}</span>
            </div>
            <div className="terminal-review-item">
              <label>Email:</label>
              <span>{formData.email}</span>
            </div>
            <div className="terminal-review-item full-width">
              <label>Address:</label>
              <span>{formData.address}</span>
            </div>
          </div>
        </div>

        <div className="terminal-review-section">
          <h4>🚨 Emergency Contact</h4>
          <div className="terminal-review-grid">
            <div className="terminal-review-item">
              <label>Name:</label>
              <span>{formData.emergencyContactName}</span>
            </div>
            <div className="terminal-review-item">
              <label>Number:</label>
              <span>{formData.emergencyContactNumber}</span>
            </div>
            <div className="terminal-review-item">
              <label>Relationship:</label>
              <span>{formData.emergencyRelationship}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="terminal-terms">
        <label className="terminal-checkbox-label">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>
            I confirm that all information provided is accurate and I agree to the 
            <strong> Terms and Conditions</strong> and <strong>Privacy Policy</strong> 
            of CLICARE Hospital.
          </span>
        </label>
      </div>
    </div>
  );

  // SHARED STEPS (both new and returning patients)
  const renderSymptomsStep = () => {
    const currentData = patientType === 'returning' ? patientData : formData;
    
    return (
      <div className="terminal-reg-card terminal-step-transition">
        <div className="terminal-step-header">
          <div className="terminal-step-icon">🩺</div>
          <h3>Health Assessment</h3>
          <p>What brings you to the clinic today?</p>
        </div>

        <div className="terminal-symptoms-info">
          <div className="terminal-info-banner">
            <div className="terminal-info-icon">💡</div>
            <div className="terminal-info-content">
              <h4>Select Your Symptoms</h4>
              <p>Choose all symptoms or health concerns you're experiencing. This helps us direct you to the right specialist.</p>
            </div>
          </div>
        </div>

        {currentData.selectedSymptoms.length > 0 && (
          <div className="terminal-selected-symptoms">
            <h4>Selected Symptoms ({currentData.selectedSymptoms.length})</h4>
            <div className="terminal-selected-list">
              {currentData.selectedSymptoms.map(symptom => (
                <div 
                  key={symptom}
                  className="terminal-selected-symptom"
                  onClick={() => handleSymptomToggle(symptom)}
                >
                  {symptom}
                  <span className="remove-icon">×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="terminal-symptoms-categories">
          {outpatientSymptoms.map(category => (
            <div key={category.category} className="terminal-symptom-category">
              <div className="terminal-category-title">{category.category}</div>
              <div className="terminal-symptom-grid">
                {category.symptoms.map(symptom => (
                  <button
                    key={symptom}
                    onClick={() => handleSymptomToggle(symptom)}
                    className={`terminal-symptom-btn ${
                      currentData.selectedSymptoms.includes(symptom) ? 'selected' : ''
                    }`}
                  >
                    <span className="symptom-text">{symptom}</span>
                    {currentData.selectedSymptoms.includes(symptom) && (
                      <span className="check-icon">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDetailsStep = () => {
    const currentData = patientType === 'returning' ? patientData : formData;
    
    return (
      <div className="terminal-reg-card terminal-step-transition">
        <div className="terminal-step-header">
          <div className="terminal-step-icon">📝</div>
          <h3>Additional Details</h3>
          <p>Help us understand your condition better</p>
        </div>

        <div className="terminal-form-grid two-column">
          <div className="terminal-reg-input-group">
            <label>How long have you experienced these symptoms? *</label>
            <select
              name="duration"
              value={currentData.duration}
              onChange={handleInputChange}
              className="terminal-reg-input"
              required
            >
              <option value="">Select duration</option>
              <option value="Less than 1 day">Less than 1 day</option>
              <option value="1-3 days">1-3 days</option>
              <option value="1 week">1 week</option>
              <option value="2-4 weeks">2-4 weeks</option>
              <option value="1-3 months">1-3 months</option>
              <option value="More than 3 months">More than 3 months</option>
            </select>
          </div>

          <div className="terminal-reg-input-group">
            <label>Severity Level *</label> 
            <select
              name="severity"
              value={currentData.severity}
              onChange={handleInputChange}
              className="terminal-reg-input"
              required
            >
              <option value="">Select severity</option>
              <option value="Mild">Mild - Manageable discomfort</option>
              <option value="Moderate">Moderate - Affects daily activities</option>
              <option value="Severe">Severe - Significantly impacts life</option>
              <option value="Critical">Critical - Urgent attention needed</option>
            </select>
          </div>

          <div className="terminal-reg-input-group full-width">
            <label>Previous Treatment</label>
            <textarea
              name="previousTreatment"
              value={currentData.previousTreatment}
              onChange={handleInputChange}
              placeholder="Any previous treatments or medications tried for this condition"
              className="terminal-reg-input terminal-reg-textarea"
              rows="2"
            />
          </div>

          <div className="terminal-reg-input-group full-width">
            <label>Known Allergies</label>
            <input
              type="text"
              name="allergies"
              value={currentData.allergies}
              onChange={handleInputChange}
              placeholder="List any known allergies (medications, food, etc.)"
              className="terminal-reg-input"
            />
          </div>

          <div className="terminal-reg-input-group full-width">
            <label>Current Medications</label>
            <textarea
              name="medications"
              value={currentData.medications}
              onChange={handleInputChange}
              placeholder="List any medications you're currently taking"
              className="terminal-reg-input terminal-reg-textarea"
              rows="2"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryStep = () => {
    const currentData = patientType === 'returning' ? patientData : formData;
    
    return (
      <div className="terminal-reg-card terminal-step-transition">
        <div className="terminal-step-header">
          <div className="terminal-step-icon">✅</div>
          <h3>Registration Summary</h3>
          <p>Review all information before completing registration</p>
        </div>

        <div className="terminal-summary-sections">
          {/* Show patient info for both types, but from different data sources */}
          <div className="terminal-summary-section">
            <h4>👤 Patient Information</h4>
            <div className="terminal-summary-grid">
              {patientType === 'returning' ? (
                <>
                  <div className="terminal-summary-item">
                    <label>Patient ID:</label>
                    <span>{patientData.patient_id}</span>
                  </div>
                  <div className="terminal-summary-item">
                    <label>Full Name:</label>
                    <span>{patientData.name}</span>
                  </div>
                  <div className="terminal-summary-item">
                    <label>Age:</label>
                    <span>{patientData.age}</span>
                  </div>
                  <div className="terminal-summary-item">
                    <label>Sex:</label>
                    <span>{patientData.sex}</span>
                  </div>
                  <div className="terminal-summary-item full-width">
                    <label>Contact:</label>
                    <span>{patientData.contact_no}</span>
                    
                  </div>
                  <div className="terminal-summary-item full-width">
                    <label>Email:</label>
                    <span>{patientData.email}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="terminal-summary-item">
                    <label>Full Name:</label>
                    <span>{formData.fullName}</span>
                  </div>
                  <div className="terminal-summary-item">
                    <label>Age:</label>
                    <span>{formData.age}</span>
                  </div>
                  <div className="terminal-summary-item">
                    <label>Sex:</label>
                    <span>{formData.sex}</span>
                  </div>
                  <div className="terminal-summary-item full-width">
                    <label>Contact:</label>
                    <span>{formData.contactNumber} | {formData.email}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="terminal-summary-section">
            <h4>🩺 Health Information</h4>
            <div className="terminal-summary-grid">
              <div className="terminal-summary-item full-width">
                <label>Symptoms ({currentData.selectedSymptoms.length}):</label>
                <span>{currentData.selectedSymptoms.join(', ')}</span>
              </div>
              <div className="terminal-summary-item">
                <label>Duration:</label>
                <span>{currentData.duration}</span>
              </div>
              <div className="terminal-summary-item">
                <label>Severity:</label>
                <span>{currentData.severity}</span>
              </div>
              {currentData.allergies && (
                <div className="terminal-summary-item full-width">
                  <label>Allergies:</label>
                  <span>{currentData.allergies}</span>
                </div>
              )}
              {currentData.medications && (
                <div className="terminal-summary-item full-width">
                  <label>Current Medications:</label>
                  <span>{currentData.medications}</span>
                </div>
              )}
            </div>
          </div>

          {/* Show emergency contact only for new patients */}
          {patientType === 'new' && (
            <div className="terminal-summary-section">
              <h4>🚨 Emergency Contact</h4>
              <div className="terminal-summary-grid">
                <div className="terminal-summary-item">
                  <label>Name:</label>
                  <span>{formData.emergencyContactName}</span>
                </div>
                <div className="terminal-summary-item">
                  <label>Number:</label>
                  <span>{formData.emergencyContactNumber}</span>
                </div>
                <div className="terminal-summary-item">
                  <label>Relationship:</label>
                  <span>{formData.emergencyRelationship}</span>
                </div>
              </div>
            </div>
          )}

          <div className="terminal-recommended-department">
            <div className="terminal-recommendation-icon">🏥</div>
            <div className="terminal-recommendation-content">
              <h4>Recommended Department</h4>
              <p><strong>{generateDepartmentRecommendation()}</strong></p>
              <small>Based on your selected symptoms</small>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const generateDepartmentRecommendation = () => {
    const currentData = patientType === 'returning' ? patientData : formData;
    const departmentMapping = {
      'Fever': 'Internal Medicine',
      'Chest Pain': 'Cardiology',
      'Chest Discomfort': 'Cardiology',
      'Heart Palpitations': 'Cardiology',
      'High Blood Pressure': 'Cardiology',
      'Cough': 'Pulmonology',
      'Shortness of Breath': 'Pulmonology',
      'Joint Pain': 'Orthopedics',
      'Back Pain': 'Orthopedics',
      'Muscle Pain': 'Orthopedics',
      'Arthritis': 'Rheumatology',
      'Migraine': 'Neurology',
      'Seizures': 'Neurology',
      'Memory Problems': 'Neurology',
      'Rash': 'Dermatology',
      'Skin Discoloration': 'Dermatology',
      'Acne': 'Dermatology',
      'Vision Problems': 'Ophthalmology',
      'Eye Pain': 'Ophthalmology',
      'Hearing Loss': 'ENT',
      'Ear Pain': 'ENT',
      'Anxiety': 'Psychiatry',
      'Depression': 'Psychiatry',
      'Menstrual Problems': 'Gynecology',
      'Pregnancy Concerns': 'Obstetrics',
      'Annual Check-up': 'General Practice',
      'Vaccination': 'General Practice',
      'Health Screening': 'General Practice'
    };

    const primarySymptom = currentData.selectedSymptoms[0];
    return departmentMapping[primarySymptom] || 'General Practice';
  };

  const outpatientSymptoms = [
    // General Symptoms
    { category: 'General', symptoms: ['Fever', 'Headache', 'Fatigue', 'Weight Loss', 'Weight Gain', 'Loss of Appetite'] },
    
    // Respiratory
    { category: 'Respiratory', symptoms: ['Cough', 'Shortness of Breath', 'Chest Pain', 'Sore Throat', 'Runny Nose', 'Congestion'] },
    
    // Cardiovascular
    { category: 'Cardiovascular', symptoms: ['Chest Discomfort', 'Heart Palpitations', 'Dizziness', 'Swelling in Legs', 'High Blood Pressure'] },
    
    // Gastrointestinal
    { category: 'Gastrointestinal', symptoms: ['Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Abdominal Pain', 'Heartburn'] },
    
    // Musculoskeletal
    { category: 'Musculoskeletal', symptoms: ['Joint Pain', 'Back Pain', 'Muscle Pain', 'Neck Pain', 'Arthritis', 'Injury'] },
    
    // Neurological
    { category: 'Neurological', symptoms: ['Migraine', 'Memory Problems', 'Numbness', 'Tingling', 'Seizures', 'Balance Issues'] },
    
    // Skin/Dermatological
    { category: 'Skin', symptoms: ['Rash', 'Itching', 'Skin Discoloration', 'Wounds', 'Acne', 'Hair Loss'] },
    
    // Mental Health
    { category: 'Mental Health', symptoms: ['Anxiety', 'Depression', 'Stress', 'Sleep Problems', 'Mood Changes'] },
    
    // Women\'s Health
    { category: 'Women\'s Health', symptoms: ['Menstrual Problems', 'Pregnancy Concerns', 'Menopause Symptoms', 'Breast Issues'] },
    
    // Eye/ENT
    { category: 'Eye/ENT', symptoms: ['Vision Problems', 'Hearing Loss', 'Ear Pain', 'Eye Pain', 'Discharge'] },
    
    // Routine Care
    { category: 'Routine Care', symptoms: ['Annual Check-up', 'Vaccination', 'Lab Test Follow-up', 'Prescription Refill', 'Health Screening'] }
  ];

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = patientType === 'returning' ? patientData : formData;
      
      // Mock API call for now - replace with actual backend call
      console.log('Submitting registration data:', {
        patientType,
        data: submitData,
        recommendedDepartment: generateDepartmentRecommendation()
      });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Success
      alert('✅ Registration completed successfully!');
      
      // Clear session storage
      sessionStorage.removeItem('patientType');
      sessionStorage.removeItem('patientInfo');
      sessionStorage.removeItem('patientToken');
      sessionStorage.removeItem('patientId');
      sessionStorage.removeItem('patientName');
      
      // Redirect to login or success page
      window.location.href = '/terminal-patient-login';

    } catch (err) {
      console.error('Registration error:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderBackButton = () => {
    if (patientType === 'returning' && currentStep === 4) {
      // For returning patients, show logout option instead of back
      return (
        <button 
          type="button"
          onClick={() => {
            sessionStorage.clear();
            window.location.href = '/terminal-patient-login';
          }}
          className="terminal-nav-btn secondary"
        >
          🚪 Logout
        </button>
      );
    }

    if ((patientType === 'new' && currentStep === 1) || (patientType === 'returning' && currentStep === 4)) {
      return null; // No back button on first step
    }

    return (
      <button 
        type="button"
        onClick={prevStep}
        className="terminal-nav-btn secondary"
      >
        ← Back
      </button>
    );
  };

  const renderNextButton = () => {
    const maxStep = patientType === 'returning' ? 7 : 6; // Returning: steps 4,5,6,7
    
    if (currentStep === maxStep) {
      return (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !validateStep(currentStep)}
          className="terminal-nav-btn submit"
        >
          {loading ? (
            <>
              <span className="terminal-loading-spinner"></span>
              Processing Registration...
            </>
          ) : (
            '✅ Complete Registration'
          )}
        </button>
      );
    }

    return (
      <button 
        type="button"
        onClick={nextStep}
        className="terminal-nav-btn primary"
        disabled={!validateStep(currentStep)}
      >
        Continue →
      </button>
    );
  };

  const renderCurrentStep = () => {
    if (patientType === 'returning') {
      switch (currentStep) {
        case 4:
          return renderPatientInfoStep(); // Show read-only patient info first
        case 5:
          return renderSymptomsStep();
        case 6:
          return renderDetailsStep();
        case 7:
          return renderSummaryStep();
        default:
          return renderPatientInfoStep();
      }
    }

    // New patient flow
    switch (currentStep) {
      case 1:
        return renderPersonalDetailsStep();
      case 2:
        return renderEmergencyContactStep();
      case 3:
        return renderReviewStep();
      case 4:
        return renderSymptomsStep();
      case 5:
        return renderDetailsStep();
      case 6:
        return renderSummaryStep();
      default:
        return renderPersonalDetailsStep();
    }
  };

  return (
    <div className="terminal-registration-portal">
      <div className="terminal-reg-header">
        <div className="terminal-reg-logo">🏥</div>
        <div className="terminal-reg-title">
          <h1>CLICARE</h1>
          <p>Patient Registration System</p>
        </div>
        <div className="terminal-reg-info">
          <p><strong>{formatTime(currentTime)}</strong></p>
          <p>{formatDate(currentTime)}</p>
        </div>
      </div>

      {renderProgressBar()}
      
      <div className="terminal-reg-content">
        {error && <div className="terminal-reg-error">⚠️ {error}</div>}
        
        {renderCurrentStep()}
      </div>

      <div className="terminal-nav-container">
        <div className="terminal-nav-buttons">
          {renderBackButton()}
          {renderNextButton()}
        </div>
      </div>

      <div className="terminal-help-footer">
        <div className="terminal-help-section">
          <h4>Need Help?</h4>
          <p>Press the help button or ask hospital staff for assistance</p>
        </div>
      </div>
    </div>
  );

  // Utility functions
  function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

export default TerminalPatientRegistration;