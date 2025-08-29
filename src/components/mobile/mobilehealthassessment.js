// mobilehealthassessment.js
import React, { useState, useEffect } from 'react';
import './mobilehealthassessment.css';

const MobileHealthAssessment = () => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Symptoms, 2: Details, 3: Urgency, 4: Summary
  const [formData, setFormData] = useState({
    symptoms: [],
    duration: '',
    severity: '',
    previousTreatment: '',
    allergies: '',
    medications: '',
    preferredDate: '',
    preferredTime: '',
    urgencyLevel: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [selectedAllergies, setSelectedAllergies] = useState(['']);
  const [error, setError] = useState('');
  const [patientInfo, setPatientInfo] = useState({});

  useEffect(() => {
    // Load patient info from session
    const patientId = sessionStorage.getItem('patientId') || 'PAT001';
    const patientName = sessionStorage.getItem('patientName') || 'Patient User';
    
    setPatientInfo({
      patientId: patientId,
      name: patientName
    });
  }, []);

  const symptomCategories = [
    {
      category: 'General',
      symptoms: ['Fever', 'Headache', 'Fatigue', 'Weight Loss', 'Weight Gain', 'Loss of Appetite']
    },
    {
      category: 'Respiratory',
      symptoms: ['Cough', 'Shortness of Breath', 'Chest Pain', 'Sore Throat', 'Runny Nose', 'Congestion']
    },
    {
      category: 'Cardiovascular',
      symptoms: ['Chest Discomfort', 'Heart Palpitations', 'Dizziness', 'Swelling in Legs', 'High Blood Pressure']
    },
    {
      category: 'Gastrointestinal',
      symptoms: ['Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Abdominal Pain', 'Heartburn']
    },
    {
      category: 'Musculoskeletal',
      symptoms: ['Joint Pain', 'Back Pain', 'Muscle Pain', 'Neck Pain', 'Arthritis', 'Injury']
    },
    {
      category: 'Neurological',
      symptoms: ['Migraine', 'Memory Problems', 'Numbness', 'Tingling', 'Seizures', 'Balance Issues']
    },
    {
      category: 'Skin',
      symptoms: ['Rash', 'Itching', 'Skin Discoloration', 'Wounds', 'Acne', 'Hair Loss']
    },
    {
      category: 'Mental Health',
      symptoms: ['Anxiety', 'Depression', 'Stress', 'Sleep Problems', 'Mood Changes']
      
    },
    {
      category: 'Women\'s Health',
      symptoms: ['Menstrual Problems', 'Pregnancy Concerns', 'Menopause Symptoms', 'Breast Issues']
    },
    {
      category: 'Eye/ENT',
      symptoms: ['Vision Problems', 'Hearing Loss', 'Ear Pain', 'Eye Pain', 'Discharge']
    },
    {
      category: 'Routine Care',
      symptoms: ['Annual Check-up', 'Vaccination', 'Lab Test Follow-up', 'Prescription Refill', 'Health Screening']
    }
  ];

  const allergyCategories = {
  medications: {
    title: "💊 Medication Allergies",
    items: [
      "Penicillin (amoxicillin, augmentin)",
      "Cephalosporins (cefalexin, ceftriaxone)",
      "Sulfa drugs (sulfamethoxazole)",
      "Aspirin (ASA)",
      "NSAIDs (ibuprofen, naproxen)",
      "Codeine",
      "Morphine",
      "Local anesthetics (lidocaine)",
      "Anticonvulsants (phenytoin, carbamazepine)",
      "Chemotherapy agents (cisplatin)",
      "Insulin (non-human)",
      "Vaccines (egg-based flu vaccines)"
    ]
  },
  foods: {
    title: "🍽️ Food Allergies",
    items: [
      "Peanuts",
      "Tree nuts (almonds, walnuts, cashews)",
      "Shellfish (shrimp, crab, lobster)",
      "Fish (salmon, tuna, cod)",
      "Eggs",
      "Milk / Dairy",
      "Wheat / Gluten",
      "Soy",
      "Sesame",
      "Corn",
      "Strawberries",
      "Tomatoes",
      "Food dyes / additives (Red Dye 40, MSG)"
    ]
  }
};

  const handleSymptomToggle = (symptom) => {
    const isSelected = formData.symptoms.includes(symptom);
    const updatedSymptoms = isSelected
      ? formData.symptoms.filter(s => s !== symptom)
      : [...formData.symptoms, symptom];
    
    setFormData({
      ...formData,
      symptoms: updatedSymptoms
    });
    setError('');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleAllergySelect = (allergy, index) => {
  if (allergy) {
    const newAllergies = [...selectedAllergies];
    newAllergies[index] = allergy;
    setSelectedAllergies(newAllergies);
    
    // Update formData
    setFormData({
      ...formData,
      allergies: newAllergies.filter(a => a).join(', ')
    });
  }
};

const addAllergyDropdown = () => {
  setSelectedAllergies([...selectedAllergies, '']);
};

const removeAllergyDropdown = (index) => {
  const newAllergies = selectedAllergies.filter((_, i) => i !== index);
  setSelectedAllergies(newAllergies);
  
  setFormData({
    ...formData,
    allergies: newAllergies.filter(a => a).join(', ')
  });
};

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.symptoms.length > 0;
      case 2:
        return formData.duration && formData.severity;
      case 3:
        return formData.preferredDate && formData.preferredTime;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      setError('');
    } else {
      if (currentStep === 1) {
        setError('Please select at least one symptom');
      } else if (currentStep === 2) {
        setError('Please fill in all required fields');
      } else if (currentStep === 3) {
        setError('Please select your preferred appointment date and time');
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
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

    const primarySymptom = formData.symptoms[0];
    return departmentMapping[primarySymptom] || 'General Practice';
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const recommendedDepartment = generateDepartmentRecommendation();
      const appointmentId = 'APT' + Date.now().toString().slice(-6);

      // Mock successful submission
      alert(`🎉 Health assessment completed!\n\nAppointment Request Submitted:\nID: ${appointmentId}\nRecommended Department: ${recommendedDepartment}\nDate: ${formData.preferredDate}\nTime: ${formData.preferredTime}\n\nYou will receive a confirmation call within 24 hours.`);
      
      // Redirect back to dashboard
      window.location.href = '/mobile-patient-dashboard';
    } catch (err) {
      setError('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSymptomStep = () => (
    <div className="assessment-step">
      <div className="assessment-step-header">
        <h3>Select Your Symptoms</h3>
        <p>Choose all symptoms that apply to your current condition</p>
      </div>

      {formData.symptoms.length > 0 && (
        <div className="selected-symptoms">
          <h4>Selected Symptoms ({formData.symptoms.length})</h4>
          <div className="selected-list">
            {formData.symptoms.map((symptom, index) => (
              <button
                key={index}
                onClick={() => handleSymptomToggle(symptom)}
                className="selected-symptom"
              >
                <span>{symptom}</span>
                <span className="remove-icon">×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="symptom-categories">
        {symptomCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="symptom-category">
            <h4 className="category-title">{category.category}</h4>
            <div className="symptom-grid">
              {category.symptoms.map((symptom, symptomIndex) => (
                <button
                  key={symptomIndex}
                  onClick={() => handleSymptomToggle(symptom)}
                  className={`symptom-btn ${
                    formData.symptoms.includes(symptom) ? 'selected' : ''
                  }`}
                >
                  <span className="symptom-text">{symptom}</span>
                  {formData.symptoms.includes(symptom) && (
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

  const renderDetailsStep = () => (
    <div className="assessment-step">
      <div className="assessment-step-header">
        <h3>Symptom Details</h3>
        <p>Provide more information about your condition</p>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label>Duration *</label>
          <select
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            className="form-input"
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

        <div className="input-group">
          <label>Severity Level *</label>
          <select
            name="severity"
            value={formData.severity}
            onChange={handleInputChange}
            className="form-input"
            required
          >
            <option value="">Rate your symptom severity</option>
            <option value="mild">Mild - Doesn't interfere with daily activities</option>
            <option value="moderate">Moderate - Some interference with activities</option>
            <option value="severe">Severe - Significant interference</option>
            <option value="very-severe">Very Severe - Unable to function normally</option>
          </select>
        </div>

        <div className="input-group">
          <label>Previous Treatment</label>
          <input
            type='text'
            name="previousTreatment"
            value={formData.previousTreatment}
            onChange={handleInputChange}
            placeholder="Any medications, treatments, or remedies you've tried"
            className="form-input"
            rows="2"
          />
        </div>

        <div className="input-group">
          <label>Known Allergies</label>
          
          {selectedAllergies.map((selectedAllergy, index) => (
            <div key={index} className="allergy-dropdown-container">
              <select
                value={selectedAllergy}
                onChange={(e) => handleAllergySelect(e.target.value, index)}
                className="form-input"
              >
                <option value="">Select an allergy</option>
                {Object.entries(allergyCategories).map(([categoryKey, category]) => (
                  <optgroup key={categoryKey} label={category.title}>
                    {category.items.map((item, itemIndex) => (
                      <option key={itemIndex} value={item}>
                        {item}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              
              {selectedAllergies.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAllergyDropdown(index)}
                  className="remove-allergy-btn"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          
                <button
        type="button"
        onClick={addAllergyDropdown}
        className="add-allergy-btn"
      >
        + Add Known Allergy
      </button>

        </div>

        <div className="input-group">
          <label>Current Medications</label>
          <input
            type='text'
            name="medications"
            value={formData.medications}
            onChange={handleInputChange}
            placeholder="List any medications you're currently taking"
            className="form-input"
            rows="2"
          />
        </div>
      </div>
    </div>
  );

  const renderSchedulingStep = () => (
    <div className="assessment-step">
      <div className="assessment-step-header">
        <h3>Appointment Scheduling</h3>
        <p>Choose your preferred appointment date and time</p>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label>Preferred Date *</label>
          <input
            type="date"
            name="preferredDate"
            value={formData.preferredDate}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            className="form-input"
            required
          />
        </div>

        <div className="input-group">
          <label>Preferred Time *</label>
          <select
            name="preferredTime"
            value={formData.preferredTime}
            onChange={handleInputChange}
            className="form-input"
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
    </div>
  );

  const renderSummaryStep = () => (
    <div className="assessment-step">
      <div className="assessment-step-header">
        <h3>Assessment Summary</h3>
        <p>Review your information before submitting</p>
      </div>

      <div className="summary-sections">
        <div className="summary-section">
          <h4>📋 Selected Symptoms</h4>
          <div className="summary-symptoms">
            {formData.symptoms.map((symptom, index) => (
              <span key={index} className="summary-symptom">{symptom}</span>
            ))}
          </div>
        </div>

        <div className="summary-section">
          <h4>🩺 Condition Details</h4>
          <div className="summary-details">
            <div className="summary-item">
              <strong>Duration:</strong>
              <span>{formData.duration.replace('-', ' ')}</span>
            </div>
            <div className="summary-item">
              <strong>Severity:</strong>
              <span>{formData.severity}</span>
            </div>
            {formData.previousTreatment && (
              <div className="summary-item">
                <strong>Previous Treatment:</strong>
                <span>{formData.previousTreatment}</span>
              </div>
            )}
            {formData.allergies && (
              <div className="summary-item">
                <strong>Allergies:</strong>
                <span>{formData.allergies}</span>
              </div>
            )}
            {formData.medications && (
              <div className="summary-item">
                <strong>Current Medications:</strong>
                <span>{formData.medications}</span>
              </div>
            )}
          </div>
        </div>

        <div className="summary-section">
          <h4>📅 Appointment Preferences</h4>
          <div className="summary-details">
            <div className="summary-item">
              <strong>Preferred Date:</strong>
              <span>{formData.preferredDate}</span>
            </div>
            <div className="summary-item">
              <strong>Preferred Time:</strong>
              <span>{formData.preferredTime}</span>
            </div>
          </div>
        </div>

        <div className="recommendation-section">
          <h4>🏥 Recommended Department</h4>
          <div className="recommendation-card">
            <div className="recommendation-department">
              {generateDepartmentRecommendation()}
            </div>
            <p>Based on your symptoms, we recommend starting with this department. The doctor may refer you to other specialists if needed.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProgressBar = () => (
    <div className="progress-container">
      <div className="progress-bar">
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <div className={`progress-step ${currentStep >= step ? 'active' : ''}`}>
              <span className="step-number">
                {currentStep > step ? '✓' : step}
              </span>
              <span className="step-label">
                {step === 1 ? 'Symptoms' :
                 step === 2 ? 'Details' :
                 step === 3 ? 'Schedule' : 'Summary'}
              </span>
            </div>
            {step < 4 && (
              <div className={`progress-line ${currentStep > step ? 'active' : ''}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderSymptomStep();
      case 2:
        return renderDetailsStep();
      case 3:
        return renderSchedulingStep();
      case 4:
        return renderSummaryStep();
      default:
        return renderSymptomStep();
    }
  };

  const renderNavigationButtons = () => {
    if (currentStep === 4) {
      return (
        <div className="nav-buttons">
          <button 
            type="button" 
            onClick={prevStep}
            className="nav-btn secondary"
            disabled={loading}
          >
            ← Back
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="nav-btn primary submit"
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Submitting...
              </>
            ) : (
              'Generate QR Code'
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="nav-buttons">
        {currentStep > 1 && (
          <button 
            type="button" 
            onClick={prevStep}
            className="nav-btn secondary"
          >
            ← Back
          </button>
        )}
        <button 
          type="button"
          onClick={nextStep}
          className="nav-btn primary"
          disabled={!validateStep(currentStep)}
        >
          Continue →
        </button>
      </div>
    );
  };

  return (
    <div className="health-assessment">
      <div className="assessment-header">
        <div className="assessment-logo">🏥</div>
        <div className="assessment-title">
          <h1>CliCare</h1>
          <p>Health Assessment</p>
        </div>
        <button 
          onClick={() => window.location.href = '/mobile-patient-dashboard'}
          className="assessment-close"
        >
          ✕
        </button>
      </div>

      {renderProgressBar()}
      
      <div className="assessment-content">
        <div className="assessment-patient-info">
          <p>Patient: <strong>{patientInfo.name}</strong> | ID: <strong>{patientInfo.patientId}</strong></p>
        </div>

        {error && <div className="assessment-error">{error}</div>}
        
        {renderCurrentStep()}
      </div>

      <div className="assessment-nav-container">
        {renderNavigationButtons()}
      </div>
    </div>
  );
};

export default MobileHealthAssessment;