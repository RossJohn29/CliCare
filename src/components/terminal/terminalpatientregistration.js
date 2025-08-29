// terminalpatientregistration.js
import React, { useState, useEffect } from 'react';
import './terminalpatientregistration.css';
import sampleID from "../../sampleID.png";

const TerminalPatientRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [patientType, setPatientType] = useState('new');
  const [patientData, setPatientData] = useState({
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
    fullName: '',
    sex: '',
    birthday: '',
    age: '',
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

  const outpatientSymptoms = [
    { category: 'General', symptoms: ['Fever', 'Headache', 'Fatigue', 'Weight Loss', 'Weight Gain', 'Loss of Appetite'] },
    { category: 'Respiratory', symptoms: ['Cough', 'Shortness of Breath', 'Chest Pain', 'Sore Throat', 'Runny Nose', 'Congestion'] },
    { category: 'Cardiovascular', symptoms: ['Chest Discomfort', 'Heart Palpitations', 'Dizziness', 'Swelling in Legs', 'High Blood Pressure'] },
    { category: 'Gastrointestinal', symptoms: ['Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Abdominal Pain', 'Heartburn'] },
    { category: 'Musculoskeletal', symptoms: ['Joint Pain', 'Back Pain', 'Muscle Pain', 'Neck Pain', 'Arthritis', 'Injury'] },
    { category: 'Neurological', symptoms: ['Migraine', 'Memory Problems', 'Numbness', 'Tingling', 'Seizures', 'Balance Issues'] },
    { category: 'Skin', symptoms: ['Rash', 'Itching', 'Skin Discoloration', 'Wounds', 'Acne', 'Hair Loss'] },
    { category: 'Mental Health', symptoms: ['Anxiety', 'Depression', 'Stress', 'Sleep Problems', 'Mood Changes'] },
    { category: 'Women\'s Health', symptoms: ['Menstrual Problems', 'Pregnancy Concerns', 'Menopause Symptoms', 'Breast Issues'] },
    { category: 'Eye/ENT', symptoms: ['Vision Problems', 'Hearing Loss', 'Ear Pain', 'Eye Pain', 'Discharge'] },
    { category: 'Routine Care', symptoms: ['Annual Check-up', 'Vaccination', 'Lab Test Follow-up', 'Prescription Refill', 'Health Screening'] }
  ];

  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  useEffect(() => {
    const storedPatientType = localStorage.getItem('patientType') || 'new';
    const storedPatientInfo = localStorage.getItem('patientInfo');
    const patientToken = localStorage.getItem('patientToken');
    
    setPatientType(storedPatientType);
    
    if (storedPatientType === 'returning' && storedPatientInfo) {
      try {
        const patientInfo = JSON.parse(storedPatientInfo);
        console.log('Retrieved patient info:', patientInfo);
        
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
        
        setCurrentStep(4);
        
      } catch (err) {
        console.error('Error parsing patient info:', err);
        setError('Error loading patient information. Please try logging in again.');
      }
    } else if (storedPatientType === 'new') {
      setCurrentStep(1);
    } else {
      console.warn('No valid patient session found');
      window.location.href = '/terminal-patient-login';
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (patientType === 'returning') {
      const updatedData = { ...patientData, [name]: value };
      if (name === 'birthday') {
        updatedData.age = calculateAge(value);
      }
      setPatientData(updatedData);
    } else {
      const updatedData = { ...formData, [name]: value };
      if (name === 'birthday') {
        updatedData.age = calculateAge(value);
      }
      setFormData(updatedData);
    }
    setError('');
  };

  const handleSymptomToggle = (symptom) => {
    if (patientType === 'returning') {
      const isSelected = patientData.selectedSymptoms.includes(symptom);
      const updatedSymptoms = isSelected
        ? patientData.selectedSymptoms.filter(s => s !== symptom)
        : [...patientData.selectedSymptoms, symptom];
      
      setPatientData(prev => ({ ...prev, selectedSymptoms: updatedSymptoms }));
    } else {
      const isSelected = formData.selectedSymptoms.includes(symptom);
      const updatedSymptoms = isSelected
        ? formData.selectedSymptoms.filter(s => s !== symptom)
        : [...formData.selectedSymptoms, symptom];
      
      setFormData(prev => ({ ...prev, selectedSymptoms: updatedSymptoms }));
    }
    setError('');
  };

  const validateStep = (step) => {
    if (patientType === 'returning') {
      switch (step) {
        case 4:
          return patientData.patient_id && 
                 patientData.name && 
                 patientData.emergency_contact_name && 
                 patientData.emergency_contact_relationship && 
                 patientData.emergency_contact_no;
        case 5:
          return patientData.selectedSymptoms && patientData.selectedSymptoms.length > 0;
        case 6:
          return patientData.duration && patientData.severity;
        case 7:
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
      switch (step) {
        case 1:
          return formData.fullName && formData.sex && formData.birthday && formData.address && formData.contactNumber && formData.email;
        case 2:
          return formData.emergencyContactName && formData.emergencyContactNumber && formData.emergencyRelationship;
        case 3:
          return formData.idType && formData.idNumber;
        case 4:
          return formData.selectedSymptoms && formData.selectedSymptoms.length > 0;
        case 5:
          return formData.duration && formData.severity;
        case 6:
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

  const renderProgressBar = () => {
    const totalSteps = patientType === 'returning' ? 4 : 6;
    const stepNames = patientType === 'returning' 
      ? ['Personal', 'Symptoms', 'Details', 'Summary']
      : ['Personal', 'Emergency', 'Review', 'Symptoms', 'Details', 'Summary'];
    
    const adjustedStep = patientType === 'returning' 
      ? Math.max(1, currentStep - 3)
      : currentStep;

    const stepIcons = patientType === 'returning' 
      ? ['1', '2', '3', '4'] 
      : ['1', '2', '3', '4', '5', '6'];

    return (
      <div className="terminal-patient-progress-container">
        <div className="terminal-patient-progress-steps">
          {stepNames.map((name, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === adjustedStep;
            const isCompleted = stepNumber < adjustedStep;
            const isLast = index === stepNames.length - 1;
            
            return (
              <div key={index} className="terminal-patient-progress-step-item">
                <div className={`terminal-patient-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="terminal-patient-step-number">
                    {isCompleted ? <i className="fa-solid fa-check"></i> : stepIcons[index]}
                  </div>
                  <div className="terminal-patient-step-label">{name}</div>
                </div>
                
                {!isLast && (
                  <div className={`terminal-patient-step-connector ${isCompleted ? 'completed' : ''} ${stepNumber === adjustedStep ? 'active' : ''}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPatientInfoStep = () => (
    <div className="terminal-patient-card terminal-patient-step-transition">
      <div className="terminal-patient-step-header">
        <div className="terminal-patient-step-icon"><i className="fa-regular fa-user"></i></div>
        <h3>Patient Information</h3>
        <p>Your Registered Information</p>
      </div>

      {error && <div className="terminal-patient-error">{error}</div>}

      <div className="terminal-patient-content">
        {renderCurrentStep()}
      </div>

      <div className="terminal-patient-info-banner">
        <div className="terminal-patient-info-icon"><i class="fa-solid fa-square-check"></i></div>
        <div className="terminal-patient-info-content">
          <h4>Welcome back, {patientData.name}!</h4>
          <p>Your information is displayed below for verification</p>
        </div>
      </div>

      <div className="terminal-patient-readonly-sections">
        <div className="terminal-patient-readonly-section">
          <h4><i className="fa-solid fa-user"></i>Personal Information</h4>
          <div className="terminal-patient-readonly-grid">
            <div className="terminal-patient-readonly-item">
              <label>Patient ID:</label>
              <div className="terminal-patient-readonly-value">{patientData.patient_id}</div>
            </div>
            <div className="terminal-patient-readonly-item">
              <label>Registration Date:</label>
              <div className="terminal-patient-readonly-value">
                {patientData.registration_date ? new Date(patientData.registration_date).toLocaleDateString() : 'Not available'}
              </div>
            </div>
            <div className="terminal-patient-readonly-item">
              <label>Full Name:</label>
              <div className="terminal-patient-readonly-value">{patientData.name}</div>
            </div>
            <div className="terminal-patient-readonly-item">
              <label>Sex:</label>
              <div className="terminal-patient-readonly-value">{patientData.sex}</div>
            </div>
            <div className="terminal-patient-readonly-item">
              <label>Date of Birth:</label>
              <div className="terminal-patient-readonly-value">
                {patientData.birthday ? new Date(patientData.birthday).toLocaleDateString() : 'Not available'}
              </div>
            </div>
            <div className="terminal-patient-readonly-item">
              <label>Age:</label>
              <div className="terminal-patient-readonly-value">{patientData.age} years old</div>
            </div>
            <div className="terminal-patient-readonly-item full-width">
              <label>Address:</label>
              <div className="terminal-patient-readonly-value">{patientData.address}</div>
            </div>
          </div>
        </div>

        <div className="terminal-patient-readonly-section">
          <h4><i class="fa-solid fa-phone"></i>Contact Information</h4>
          <div className="terminal-patient-readonly-grid">
            <div className="terminal-patient-readonly-item">
              <label>Contact Number:</label>
              <div className="terminal-patient-readonly-value">{patientData.contact_no}</div>
            </div>
            <div className="terminal-patient-readonly-item">
              <label>Email Address:</label>
              <div className="terminal-patient-readonly-value">{patientData.email}</div>
            </div>
          </div>
        </div>

        <div className="terminal-patient-readonly-section">
          <h4><i class="fa-solid fa-bell"></i>Emergency Contact</h4>
          <div className="terminal-patient-readonly-grid">
            <div className="terminal-patient-readonly-item">
              <label>Contact Name:</label>
              <div className="terminal-patient-readonly-value">
                {patientData.emergency_contact_name || 'Not provided'}
              </div>
            </div>
            <div className="terminal-patient-readonly-item">
              <label>Relationship:</label>
              <div className="terminal-patient-readonly-value">
                {patientData.emergency_contact_relationship || 'Not provided'}
              </div>
            </div>
            <div className="terminal-patient-readonly-item">
              <label>Contact Number:</label>
              <div className="terminal-patient-readonly-value">
                {patientData.emergency_contact_no || 'Not provided'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {(!patientData.emergency_contact_name || !patientData.emergency_contact_relationship || !patientData.emergency_contact_no) && (
        <div className="terminal-patient-warning-note">
          <div className="terminal-patient-warning-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div className="terminal-patient-warning-content">
            <strong>Emergency Contact Required</strong>
            <p>Your emergency contact information is incomplete. Please visit the reception desk to update this information before continuing.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderPersonalDetailsStep = () => (
    <div className="terminal-patient-card terminal-patient-step-transition">
      <div className="terminal-patient-step-header">
        <div className="terminal-patient-step-icon"><i className="fa-regular fa-user"></i></div>
        <h3>Personal Information</h3>
        <p>Please provide your basic information</p>
      </div>

      {error && <div className="terminal-patient-error">{error}</div>}

      <div className="terminal-patient-input-group">
        <label>Scan ID</label>
        <div className="terminal-patient-scan-helper">Optional: a shortcut to speed up typing your full name</div>
        <div className="terminal-patient-id-scan">
          <img src={sampleID} alt="Sample ID" className="sampleID" />
          <button
            onClick={() => setIdScanMode(!idScanMode)}
            disabled={idScanMode}
            className="terminal-patient-id-scan-btn"
          >
            {idScanMode ? (
              <>
                <span className="terminal-patient-loading-spinner"></span>
                Scanning ID...
              </>
            ) : (
              'Scan ID'
            )}
          </button>
        </div>
      </div>

      <div className="terminal-patient-form-grid two-column">
        <div className="terminal-patient-input-group">
          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter your complete name"
            className="terminal-patient-form-input"
            required
          />
        </div>

        <div className="terminal-patient-input-group">
          <label>Sex</label>
          <select
            name="sex"
            value={formData.sex}
            onChange={handleInputChange}
            className={`terminal-patient-form-input ${formData.sex ? 'has-value' : 'empty'}`}
            required
          >
            <option value="">Select sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="terminal-patient-input-group">
          <label>Date of Birth</label>
          <input
            type="date"
            name="birthday"
            value={formData.birthday}
            onChange={handleInputChange}
            className={`terminal-patient-form-input ${formData.birthday ? 'has-value' : 'empty'}`}
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="terminal-patient-input-group">
          <label>Age</label>
          <input
            type="text"
            value={formData.age ? `${formData.age} years old` : ''}
            className="terminal-patient-form-input"
            disabled
            placeholder="Auto-calculated from date of birth"
          />
        </div>

        <div className="terminal-patient-input-group full-width">
          <label>Complete Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="House No., Street, Barangay, City, Province"
            className="terminal-patient-form-input"
            required
          />
        </div>

        <div className="terminal-patient-input-group">
          <label>Contact Number</label>
          <input
            type="tel"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleInputChange}
            placeholder="09XX-XXX-XXXX"
            className="terminal-patient-form-input"
            required
          />
        </div>

        <div className="terminal-patient-input-group">
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your.email@example.com"
            className="terminal-patient-form-input"
            required
          />
        </div>
      </div>
    </div>
  );

  const renderEmergencyContactStep = () => (
    <div className="terminal-patient-card terminal-patient-step-transition">
      <div className="terminal-patient-step-header">
        <div className="terminal-patient-step-icon"><i className="fa-regular fa-bell"></i></div>
        <h3>Emergency Contact</h3>
        <p>Provide emergency contact information</p>
      </div>

      {error && <div className="terminal-patient-error">{error}</div>}

      <div className="terminal-patient-emergency-banner">
        <div className="terminal-patient-banner-icon"><i className="fa-solid fa-bell"></i></div>
        <div className="terminal-patient-banner-content">
          <h4>Important Information</h4>
          <p>This person will be contacted in case of medical emergency</p>
        </div>
      </div>

      <div className="terminal-patient-form-grid">
        <div className="terminal-patient-input-group">
          <label>Emergency Contact Name</label>
          <input
            type="text"
            name="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={handleInputChange}
            placeholder="Full name of emergency contact"
            className="terminal-patient-form-input"
            required
          />
        </div>

        <div className="terminal-patient-input-group">
          <label>Contact Number</label>
          <input
            type="tel"
            name="emergencyContactNumber"
            value={formData.emergencyContactNumber}
            onChange={handleInputChange}
            placeholder="09XX-XXX-XXXX"
            className="terminal-patient-form-input"
            required
          />
        </div>

        <div className="terminal-patient-input-group">
          <label>Relationship</label>
          <select
            name="emergencyRelationship"
            value={formData.emergencyRelationship}
            onChange={handleInputChange}
            className="terminal-patient-form-input"
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
    <div className="terminal-patient-card terminal-patient-step-transition">
      <div className="terminal-patient-step-header">
        <div className="terminal-patient-step-icon"><i className="fa-regular fa-clipboard"></i></div>
        <h3>Review & Confirm</h3>
        <p>Please verify all information is correct</p>
      </div>

      {error && <div className="terminal-patient-error">{error}</div>}

      <div className="terminal-patient-review-sections">
        <div className="terminal-patient-review-section">
          <h4><i className="fa-solid fa-user"></i>Personal Information</h4>
          <div className="terminal-patient-review-grid">
            <div className="terminal-patient-review-item">
              <label>Full Name:</label>
              <span>{formData.fullName}</span>
            </div>
            <div className="terminal-patient-review-item">
              <label>Age & Sex:</label>
              <span>{formData.age} years old, {formData.sex}</span>
            </div>
            <div className="terminal-patient-review-item full-width">
              <label>Address:</label>
              <span>{formData.address}</span>
            </div>
            <div className="terminal-patient-review-item">
              <label>Contact Number:</label>
              <span>{formData.contactNumber}</span>
            </div>
            <div className="terminal-patient-review-item">
              <label>Email:</label>
              <span>{formData.email}</span>
            </div>
          </div>
        </div>

        <div className="terminal-patient-review-section">
          <h4><i className="fa-solid fa-bell"></i>Emergency Contact</h4>
          <div className="terminal-patient-review-grid">
            <div className="terminal-patient-review-item">
              <label>Name:</label>
              <span>{formData.emergencyContactName}</span>
            </div>
            <div className="terminal-patient-review-item">
              <label>Number:</label>
              <span>{formData.emergencyContactNumber}</span>
            </div>
            <div className="terminal-patient-review-item">
              <label>Relationship:</label>
              <span>{formData.emergencyRelationship}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="terminal-patient-terms">
        <label className="terminal-patient-checkbox-label">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>
            I confirm that all information provided is accurate and I agree to the 
            <strong> Terms and Conditions</strong> and <strong>Privacy Policy </strong> 
            of CliCare Hospital.
          </span>
        </label>
      </div>
    </div>
  );

  const renderSymptomsStep = () => {
    const currentData = patientType === 'returning' ? patientData : formData;
    
    return (
      <div className="terminal-patient-card terminal-patient-step-transition">
        <div className="terminal-patient-step-header">
          <div className="terminal-patient-step-icon">🩺</div>
          <h3>Health Assessment</h3>
          <p>What brings you to the clinic today?</p>
        </div>

        {error && <div className="terminal-patient-error">{error}</div>}

        <div className="terminal-patient-symptoms-info">
          <div className="terminal-patient-info-banner">
            <div className="terminal-patient-info-icon">💡</div>
            <div className="terminal-patient-info-content">
              <h4>Select Your Symptoms</h4>
              <p>Choose all symptoms or health concerns you're experiencing. This helps us direct you to the right specialist.</p>
            </div>
          </div>
        </div>

        {currentData.selectedSymptoms.length > 0 && (
          <div className="terminal-patient-selected-symptoms">
            <h4>Selected Symptoms ({currentData.selectedSymptoms.length})</h4>
            <div className="terminal-patient-selected-list">
              {currentData.selectedSymptoms.map(symptom => (
                <div 
                  key={symptom}
                  className="terminal-patient-selected-symptom"
                  onClick={() => handleSymptomToggle(symptom)}
                >
                  {symptom}
                  <span className="remove-icon">×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="terminal-patient-symptoms-categories">
          {outpatientSymptoms.map(category => (
            <div key={category.category} className="terminal-patient-symptom-category">
              <div className="terminal-patient-category-title">{category.category}</div>
              <div className="terminal-patient-symptom-grid">
                {category.symptoms.map(symptom => (
                  <button
                    key={symptom}
                    onClick={() => handleSymptomToggle(symptom)}
                    className={`terminal-patient-symptom-btn ${
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
      <div className="terminal-patient-card terminal-patient-step-transition">
        <div className="terminal-patient-step-header">
          <div className="terminal-patient-step-icon">📝</div>
          <h3>Additional Details</h3>
          <p>Help us understand your condition better</p>
        </div>

        {error && <div className="terminal-patient-error">{error}</div>}

        <div className="terminal-patient-form-grid two-column">
          <div className="terminal-patient-input-group">
            <label>How long have you experienced these symptoms?</label>
            <select
              name="duration"
              value={currentData.duration}
              onChange={handleInputChange}
              className="terminal-patient-form-input"
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

          <div className="terminal-patient-input-group">
            <label>Severity Level</label> 
            <select
              name="severity"
              value={currentData.severity}
              onChange={handleInputChange}
              className="terminal-patient-form-input"
              required
            >
              <option value="">Select severity</option>
              <option value="Mild">Mild - Manageable discomfort</option>
              <option value="Moderate">Moderate - Affects daily activities</option>
              <option value="Severe">Severe - Significantly impacts life</option>
              <option value="Critical">Critical - Urgent attention needed</option>
            </select>
          </div>

          <div className="terminal-patient-input-group full-width">
            <label>Previous Treatment</label>
            <textarea
              name="previousTreatment"
              value={currentData.previousTreatment}
              onChange={handleInputChange}
              placeholder="Any previous treatments or medications tried for this condition"
              className="terminal-patient-form-input terminal-patient-form-textarea"
              rows="2"
            />
          </div>

          <div className="terminal-patient-input-group full-width">
            <label>Known Allergies</label>
            <input
              type="text"
              name="allergies"
              value={currentData.allergies}
              onChange={handleInputChange}
              placeholder="List any medications you're currently taking"
              className="terminal-patient-form-input terminal-patient-form-textarea"
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
      <div className="terminal-patient-card terminal-patient-step-transition">
        <div className="terminal-patient-step-header">
          <div className="terminal-patient-step-icon">✅</div>
          <h3>Registration Summary</h3>
          <p>Review all information before completing registration</p>
        </div>

        {error && <div className="terminal-patient-error">{error}</div>}

        <div className="terminal-patient-summary-sections">
          <div className="terminal-patient-summary-section">
            <h4>👤 Patient Information</h4>
            <div className="terminal-patient-summary-grid">
              {patientType === 'returning' ? (
                <>
                  <div className="terminal-patient-summary-item">
                    <label>Patient ID:</label>
                    <span>{patientData.patient_id}</span>
                  </div>
                  <div className="terminal-patient-summary-item">
                    <label>Full Name:</label>
                    <span>{patientData.name}</span>
                  </div>
                  <div className="terminal-patient-summary-item">
                    <label>Age:</label>
                    <span>{patientData.age}</span>
                  </div>
                  <div className="terminal-patient-summary-item">
                    <label>Sex:</label>
                    <span>{patientData.sex}</span>
                  </div>
                  <div className="terminal-patient-summary-item full-width">
                    <label>Contact:</label>
                    <span>{patientData.contact_no}</span>
                  </div>
                  <div className="terminal-patient-summary-item full-width">
                    <label>Email:</label>
                    <span>{patientData.email}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="terminal-patient-summary-item">
                    <label>Full Name:</label>
                    <span>{formData.fullName}</span>
                  </div>
                  <div className="terminal-patient-summary-item">
                    <label>Age & Sex:</label>
                    <span>{formData.age} years old, {formData.sex}</span>
                  </div>
                  <div className="terminal-patient-summary-item">
                    <label>Contact Number:</label>
                    <span>{formData.contactNumber}</span>
                  </div>
                  <div className="terminal-patient-summary-item">
                    <label>Email:</label>
                    <span>{formData.email}</span>
                  </div>
                  <div className="terminal-patient-summary-item full-width">
                    <label>Address:</label>
                    <span>{formData.address}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="terminal-patient-summary-section">
            <h4>🩺 Health Information</h4>
            <div className="terminal-patient-summary-grid">
              <div className="terminal-patient-summary-item full-width">
                <label>Symptoms ({currentData.selectedSymptoms.length}):</label>
                <span>{currentData.selectedSymptoms.join(', ')}</span>
              </div>
              <div className="terminal-patient-summary-item">
                <label>Duration:</label>
                <span>{currentData.duration}</span>
              </div>
              <div className="terminal-patient-summary-item">
                <label>Severity:</label>
                <span>{currentData.severity}</span>
              </div>
              {currentData.allergies && (
                <div className="terminal-patient-summary-item full-width">
                  <label>Allergies:</label>
                  <span>{currentData.allergies}</span>
                </div>
              )}
              {currentData.medications && (
                <div className="terminal-patient-summary-item full-width">
                  <label>Current Medications:</label>
                  <span>{currentData.medications}</span>
                </div>
              )}
            </div>
          </div>

          {patientType === 'new' && (
            <div className="terminal-patient-summary-section">
              <h4>🚨 Emergency Contact</h4>
              <div className="terminal-patient-summary-grid">
                <div className="terminal-patient-summary-item">
                  <label>Name:</label>
                  <span>{formData.emergencyContactName}</span>
                </div>
                <div className="terminal-patient-summary-item">
                  <label>Number:</label>
                  <span>{formData.emergencyContactNumber}</span>
                </div>
                <div className="terminal-patient-summary-item">
                  <label>Relationship:</label>
                  <span>{formData.emergencyRelationship}</span>
                </div>
              </div>
            </div>
          )}

          <div className="terminal-patient-recommended-department">
            <div className="terminal-patient-recommendation-icon">🏥</div>
            <div className="terminal-patient-recommendation-content">
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

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = patientType === 'returning' ? patientData : formData;
      
      console.log('Submitting registration data:', {
        patientType,
        data: submitData,
        recommendedDepartment: generateDepartmentRecommendation()
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      alert('✅ Registration completed successfully!');
      
      localStorage.removeItem('patientType');
      localStorage.removeItem('patientInfo');
      localStorage.removeItem('patientToken');
      localStorage.removeItem('patientId');
      localStorage.removeItem('patientName');

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
      return (
        <button 
          type="button"
          onClick={() => {
            localStorage.clear();
            window.location.href = '/terminal-patient-login';
          }}
          className="terminal-patient-nav-btn secondary"
        >
          Logout
        </button>
      );
    }

    if ((patientType === 'new' && currentStep === 1) || (patientType === 'returning' && currentStep === 4)) {
      return (
        <button 
          type="button"
          onClick={() => {
            window.location.href = '/terminal-patient-login';
          }}
          className="terminal-patient-nav-btn home"
        >
          <i class="fa-solid fa-less-than"></i>Back to Home
        </button>
      );
    }

    if ((patientType === 'new' && currentStep === 1) || (patientType === 'returning' && currentStep === 4)) {
      return null;
    }

    return (
      <button 
        type="button"
        onClick={prevStep}
        className="terminal-patient-nav-btn secondary"
      >
        <i class="fa-solid fa-less-than"></i>Back
      </button>
    );
  };

  const renderNextButton = () => {
    const maxStep = patientType === 'returning' ? 7 : 6;
    
    if (currentStep === maxStep) {
      return (
        <button
          type="button"
          onClick={handleSubmit}
          className="terminal-patient-nav-btn submit"
        >
          Submit
        </button>
      );
    }

    return (
      <button 
        type="button"
        onClick={nextStep}
        className="terminal-patient-nav-btn primary"
      >
        Continue<i class="fa-solid fa-greater-than"></i>
      </button>
    );
  };

  const renderCurrentStep = () => {
    if (patientType === 'returning') {
      switch (currentStep) {
        case 4:
          return renderPatientInfoStep();
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

  return (
    <div className="terminal-patient-registration-portal">
      <div className="terminal-patient-header">
        <div className="terminal-patient-logo">🏥</div>
        <div className="terminal-patient-title">
          <h1>CliCare</h1>
          <p>Patient Registration System</p>
        </div>
        <div className="terminal-patient-hospital-info">
          <p><strong>{formatTime(currentTime)}</strong></p>
          <p>{formatDate(currentTime)}</p>
        </div>
      </div>

      {renderProgressBar()}
      
      <div className="terminal-patient-content">
        {renderCurrentStep()}
      </div>

      <div className="terminal-patient-nav-container">
        <div className="terminal-patient-nav-buttons">
          {renderBackButton()}
          {renderNextButton()}
        </div>
      </div>

      <div className="terminal-patient-help-footer">
        <div className="terminal-patient-help-section">
          <h4>Need Help?</h4>
          <p>Press the help button or ask hospital staff for assistance</p>
        </div>
      </div>
    </div>
  );
};

export default TerminalPatientRegistration;