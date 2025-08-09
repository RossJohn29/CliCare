// terminalpatientregistration.js - CLICARE Terminal Patient Registration Component
import React, { useState, useEffect } from 'react';
import './terminalpatientregistration.css';

const TerminalPatientRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Personal, 2: Emergency, 3: Review, 4: Symptoms, 5: Details, 6: Summary
  const [patientType, setPatientType] = useState('new'); // 'new' or 'returning'
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
    idNumber: '',
    
    // Symptoms (for step 4)
    selectedSymptoms: [],
    preferredTime: '',

    // Health details (for step 5)
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
    // Check if patient type was set from login
    const storedPatientType = sessionStorage.getItem('patientType') || 'new';
    const storedPatientName = sessionStorage.getItem('patientName') || '';
    const storedPatientId = sessionStorage.getItem('terminalPatientId') || '';
    
    setPatientType(storedPatientType);
    
    if (storedPatientType === 'returning' && storedPatientName) {
      setFormData(prev => ({
        ...prev,
        fullName: storedPatientName
      }));
      // Skip to symptoms for returning patients
      setCurrentStep(4);
    }

    // Update time every second
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
      case 4:
        return formData.selectedSymptoms.length > 0;
      case 5:
        return formData.duration && formData.severity;
      case 6:
        return formData.preferredDate && formData.appointmentTime;
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
      } else if (currentStep === 4) {
        setError('Please select at least one symptom or health concern');
      } else if (currentStep === 5) {
        setError('Please fill in duration and severity level');
      } else if (currentStep === 6) {
        setError('Please select your preferred appointment date and time');
      } else {
        setError('Please fill in all required fields');
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  const handleSymptomToggle = (symptom) => {
    const isSelected = formData.selectedSymptoms.includes(symptom);
    const updatedSymptoms = isSelected
      ? formData.selectedSymptoms.filter(s => s !== symptom)
      : [...formData.selectedSymptoms, symptom];
    
    setFormData({
      ...formData,
      selectedSymptoms: updatedSymptoms
    });
    setError('');
  };

  const generateDepartmentRecommendation = () => {
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

    const primarySymptom = formData.selectedSymptoms[0];
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

  const generatePatientId = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `PAT${timestamp}`;
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 3000));

      const patientId = patientType === 'new' ? generatePatientId() : 
                       sessionStorage.getItem('terminalPatientId') || generatePatientId();

      // Use the department recommendation function
      const assignedDepartment = generateDepartmentRecommendation();
      const queueNumber = Math.floor(Math.random() * 50) + 1;

      // Store registration data
      sessionStorage.setItem('registrationComplete', 'true');
      sessionStorage.setItem('patientId', patientId);
      sessionStorage.setItem('assignedDepartment', assignedDepartment);
      sessionStorage.setItem('queueNumber', queueNumber.toString());
      sessionStorage.setItem('patientData', JSON.stringify(formData));

      alert(`🎉 Registration successful!\n\nPatient ID: ${patientId}\nDepartment: ${assignedDepartment}\nQueue Number: ${queueNumber}\n\nPlease collect your printed navigation guide.`);
      
      // In a real implementation, this would redirect to a completion/printing page
      window.location.href = '/terminal-patient-login';
    } catch (err) {
      setError('Registration failed. Please try again or contact hospital staff.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderProgressBar = () => {
    const totalSteps = patientType === 'new' ? 6 : 3;
    const steps = patientType === 'new' 
      ? [
          { id: 1, label: 'Personal', icon: '👤' },
          { id: 2, label: 'Emergency', icon: '🚨' },
          { id: 3, label: 'Review', icon: '📋' },
          { id: 4, label: 'Symptoms', icon: '🩺' },
          { id: 5, label: 'Details', icon: '📝' },
          { id: 6, label: 'Summary', icon: '✅' }
        ]
      : [
          { id: 4, label: 'Symptoms', icon: '🩺' },
          { id: 5, label: 'Details', icon: '📝' },
          { id: 6, label: 'Summary', icon: '✅' }
        ];

    return (
      <div className="terminal-progress-container">
        
        <div className="terminal-progress-bar">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className={`terminal-step ${currentStep >= step.id ? 'active' : ''}`}>
                <span className="terminal-step-number">
                  {currentStep > step.id ? '✓' : step.icon}
                </span>
                <span className="terminal-step-label">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`terminal-step-line ${currentStep > step.id ? 'active' : ''}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderPersonalDetailsStep = () => (
    <div className="terminal-reg-card terminal-step-transition">
      <div className="terminal-step-header">
        <div className="terminal-step-icon">👤</div>
        <h3>Personal Information</h3>
        <p>Please provide your basic information</p>
      </div>

      <div className="terminal-id-scan">
        <button 
          type="button" 
          onClick={handleIDScan}
          className="terminal-id-scan-btn"
          disabled={idScanMode}
        >
          {idScanMode ? (
            <>
              <span className="terminal-loading-spinner"></span>
              Scanning Philippine ID...
            </>
          ) : (
            <>🆔 Scan Philippine ID for Quick Setup</>
          )}
        </button>
        <small>Optional: Auto-fill using your government ID</small>
      </div>

      <div className="terminal-form-grid">
        <div className="terminal-reg-input-group">
          <label>Full Legal Name *</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter your complete legal name"
            className="terminal-reg-input"
            required
          />
        </div>

        <div className="terminal-form-grid two-column">
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
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        <div className="terminal-reg-input-group">
          <label>Complete Address *</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="House/Unit Number, Street, Barangay, City, Province"
            className="terminal-reg-input terminal-reg-textarea"
            rows="3"
            required
          />
        </div>

        <div className="terminal-form-grid two-column">
          <div className="terminal-reg-input-group">
            <label>Contact Number *</label>
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleInputChange}
              placeholder="09XX-XXX-XXXX"
              className="terminal-reg-input"
              pattern="[0-9]{11}"
              required
            />
          </div>

          <div className="terminal-reg-input-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
              className="terminal-reg-input"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmergencyContactStep = () => (
    <div className="terminal-reg-card terminal-step-transition">
      <div className="terminal-step-header">
        <div className="terminal-step-icon">🚨</div>
        <h3>Emergency Contact</h3>
        <p>Who should we contact in case of emergency?</p>
      </div>

      <div className="terminal-emergency-banner">
        <span style={{ fontSize: '2em' }}>🚨</span>
        <div>
          <h4>Important Information</h4>
          <p>This person will be contacted during medical emergencies or if you need assistance</p>
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
            pattern="[0-9]{11}"
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
            {formData.email && (
              <div className="terminal-review-item">
                <label>Email:</label>
                <span>{formData.email}</span>
              </div>
            )}
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

        {formData.idType && (
          <div className="terminal-review-section">
            <h4>🆔 ID Information</h4>
            <div className="terminal-review-grid">
              <div className="terminal-review-item">
                <label>ID Type:</label>
                <span>{formData.idType}</span>
              </div>
              <div className="terminal-review-item">
                <label>ID Number:</label>
                <span>{formData.idNumber}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="terminal-terms">
        <label className="terminal-checkbox-label">
          <input 
            type="checkbox" 
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required 
          />
          <span className="terminal-checkmark"></span>
          <span>I agree to CLICARE's privacy policy and terms of service, and consent to the processing of my medical information for healthcare purposes.</span>
        </label>
      </div>
    </div>
  );

  const renderSymptomsStep = () => (
    <div className="terminal-reg-card terminal-step-transition">
      <div className="terminal-step-header">
        <div className="terminal-step-icon">🩺</div>
        <h3>Health Assessment</h3>
        <p>Please select your current symptoms or health concerns</p>
      </div>

      <div className="terminal-symptoms-info">
        <div className="terminal-info-banner">
          <span style={{ fontSize: '2em' }}>ℹ️</span>
          <div>
            <h4>Symptom Selection</h4>
            <p>Select all symptoms that apply to you. This helps us direct you to the most appropriate department and medical specialist.</p>
          </div>
        </div>
      </div>

      <div className="terminal-symptoms-container">
        {formData.selectedSymptoms.length > 0 && (
          <div className="terminal-selected-symptoms">
            <h4>Selected Symptoms ({formData.selectedSymptoms.length})</h4>
            <div className="terminal-selected-list">
              {formData.selectedSymptoms.map((symptom, index) => (
                <button
                  key={index}
                  onClick={() => handleSymptomToggle(symptom)}
                  className="terminal-selected-symptom"
                >
                  <span>{symptom}</span>
                  <span className="remove-icon">×</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="terminal-symptoms-categories">
          {outpatientSymptoms.map((category, categoryIndex) => (
            <div key={categoryIndex} className="terminal-symptom-category">
              <h4 className="terminal-category-title">{category.category}</h4>
              <div className="terminal-symptom-grid">
                {category.symptoms.map((symptom, symptomIndex) => (
                  <button
                    key={symptomIndex}
                    onClick={() => handleSymptomToggle(symptom)}
                    className={`terminal-symptom-btn ${
                      formData.selectedSymptoms.includes(symptom) ? 'selected' : ''
                    }`}
                  >
                    <span className="symptom-text">{symptom}</span>
                    {formData.selectedSymptoms.includes(symptom) && (
                      <span className="check-icon">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="terminal-reg-card terminal-step-transition">
      <div className="terminal-step-header">
        <div className="terminal-step-icon">📝</div>
        <h3>Health Details</h3>
        <p>Provide more information about your condition</p>
      </div>

      <div className="terminal-form-grid two-column">
        <div className="terminal-reg-input-group">
          <label>Duration *</label>
          <select
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            className="terminal-reg-input"
            required
          >
            <option value="">How long have you had these symptoms?</option>
            <option value="less-than-day">Less than a day</option>
            <option value="1-3-days">1-3 days</option>
            <option value="4-7-days">4-7 days</option>
            <option value="1-2-weeks">1-2 weeks</option>
            <option value="2-4-weeks">2-4 weeks</option>
            <option value="1-3-months">1-3 months</option>
            <option value="more-than-3-months">More than 3 months</option>
          </select>
        </div>

        <div className="terminal-reg-input-group">
          <label>Severity Level *</label>
          <select
            name="severity"
            value={formData.severity}
            onChange={handleInputChange}
            className="terminal-reg-input"
            required
          >
            <option value="">Rate your symptom severity</option>
            <option value="mild">Mild - Doesn't interfere with daily activities</option>
            <option value="moderate">Moderate - Some interference with activities</option>
            <option value="severe">Severe - Significant interference</option>
            <option value="very-severe">Very Severe - Unable to function normally</option>
          </select>
        </div>

        <div className="terminal-reg-input-group">
          <label>Preferred Date *</label>
          <input
            type="date"
            name="preferredDate"
            value={formData.preferredDate}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            className="terminal-reg-input"
            required
          />
        </div>

        <div className="terminal-reg-input-group">
          <label>Preferred Time *</label>
          <select
            name="appointmentTime"
            value={formData.appointmentTime}
            onChange={handleInputChange}
            className="terminal-reg-input"
            required
          >
            <option value="">Select preferred time</option>
            <option value="morning">Morning (8:00 AM - 12:00 PM)</option>
            <option value="afternoon">Afternoon (12:00 PM - 5:00 PM)</option>
            <option value="evening">Evening (5:00 PM - 8:00 PM)</option>
            <option value="anytime">Any available time</option>
          </select>
        </div>
      </div>

      <div className="terminal-form-grid">
        <div className="terminal-reg-input-group full-width">
          <label>Previous Treatment</label>
          <textarea
            name="previousTreatment"
            value={formData.previousTreatment}
            onChange={handleInputChange}
            placeholder="Any medications, treatments, or remedies you've tried"
            className="terminal-reg-input terminal-reg-textarea"
            rows="2"
          />
        </div>

        <div className="terminal-reg-input-group full-width">
          <label>Known Allergies</label>
          <input
            type="text"
            name="allergies"
            value={formData.allergies}
            onChange={handleInputChange}
            placeholder="List any known allergies (medications, food, etc.)"
            className="terminal-reg-input"
          />
        </div>

        <div className="terminal-reg-input-group full-width">
          <label>Current Medications</label>
          <textarea
            name="medications"
            value={formData.medications}
            onChange={handleInputChange}
            placeholder="List any medications you're currently taking"
            className="terminal-reg-input terminal-reg-textarea"
            rows="2"
          />
        </div>
      </div>
    </div>
  );

  const renderSummaryStep = () => (
    <div className="terminal-reg-card terminal-step-transition">
      <div className="terminal-step-header">
        <div className="terminal-step-icon">✅</div>
        <h3>Registration Summary</h3>
        <p>Review all information before completing registration</p>
      </div>

      <div className="terminal-summary-sections">
        {patientType === 'new' && (
          <>
            <div className="terminal-summary-section">
              <h4>👤 Personal Information</h4>
              <div className="terminal-summary-grid">
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
                  <label>Address:</label>
                  <span>{formData.address}</span>
                </div>
                <div className="terminal-summary-item">
                  <label>Contact:</label>
                  <span>{formData.contactNumber}</span>
                </div>
                <div className="terminal-summary-item">
                  <label>Email:</label>
                  <span>{formData.email}</span>
                </div>
              </div>
            </div>

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
          </>
        )}

        <div className="terminal-summary-section">
          <h4>📋 Selected Symptoms</h4>
          <div className="terminal-summary-symptoms">
            {formData.selectedSymptoms.map((symptom, index) => (
              <span key={index} className="terminal-summary-symptom">{symptom}</span>
            ))}
          </div>
        </div>

        <div className="terminal-summary-section">
          <h4>🩺 Health Details</h4>
          <div className="terminal-summary-grid">
            <div className="terminal-summary-item">
              <label>Duration:</label>
              <span>{formData.duration.replace('-', ' ')}</span>
            </div>
            <div className="terminal-summary-item">
              <label>Severity:</label>
              <span>{formData.severity}</span>
            </div>
            {formData.previousTreatment && (
              <div className="terminal-summary-item full-width">
                <label>Previous Treatment:</label>
                <span>{formData.previousTreatment}</span>
              </div>
            )}
            {formData.allergies && (
              <div className="terminal-summary-item full-width">
                <label>Allergies:</label>
                <span>{formData.allergies}</span>
              </div>
            )}
            {formData.medications && (
              <div className="terminal-summary-item full-width">
                <label>Current Medications:</label>
                <span>{formData.medications}</span>
              </div>
            )}
          </div>
        </div>

        <div className="terminal-summary-section">
          <h4>📅 Appointment Preferences</h4>
          <div className="terminal-summary-grid">
            <div className="terminal-summary-item">
              <label>Preferred Date:</label>
              <span>{formData.preferredDate}</span>
            </div>
            <div className="terminal-summary-item">
              <label>Preferred Time:</label>
              <span>{formData.appointmentTime}</span>
            </div>
          </div>
        </div>

        <div className="terminal-recommendation-section">
          <h4>🏥 Recommended Department</h4>
          <div className="terminal-recommendation-card">
            <div className="terminal-recommendation-department">
              {generateDepartmentRecommendation()}
            </div>
            <p>Based on your symptoms, we recommend starting with this department. The doctor may refer you to other specialists if needed.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackButton = () => {
    // Don't show back button on first step for new patients or on symptoms step for returning patients
    if ((patientType === 'new' && currentStep === 1) || (patientType === 'returning' && currentStep === 4)) {
      return (
        <button 
          onClick={() => window.location.href = '/terminal-patient-login'}
          className="terminal-nav-btn secondary"
        >
          ← Back to Login
        </button>
      );
    }

    return (
      <button 
        type="button" 
        onClick={prevStep}
        className="terminal-nav-btn secondary"
        disabled={loading}
      >
        ← Previous
      </button>
    );
  };

  const renderNextButton = () => {
    const isLastStep = (patientType === 'new' && currentStep === 6) || (patientType === 'returning' && currentStep === 6);
    
    if (isLastStep) {
      return (
        <button 
          type="button"
          onClick={handleSubmit}
          disabled={loading || !validateStep(currentStep)}
          className="terminal-nav-btn primary submit"
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
          return renderSymptomsStep();
        case 5:
          return renderDetailsStep();
        case 6:
          return renderSummaryStep();
        default:
          return renderSymptomsStep();
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

  return (
    <div className="terminal-registration-portal">
      <div className="terminal-reg-header">
        <div className="terminal-reg-logo">🏥</div>
        <div className="terminal-reg-title">
          <h1>CLICARE</h1>
          <p>Patient Registration System</p>
        </div>
        <div className="terminal-reg-info">
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
};

export default TerminalPatientRegistration;