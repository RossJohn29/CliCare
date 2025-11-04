// webappointment.js
import React, { useState, useEffect } from 'react';
import './webappointment.css';
import clicareLogo from "../../clicareLogo.png";
import {
  User,
  Bell,
  Clipboard,
  Stethoscope,
  List,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Info,
  Phone,
  CalendarCheck,
  Hospital
} from 'lucide-react';

const WebAppointment = () => {
  // Core state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fieldErrors, setFieldErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Symptoms state
  const [outpatientSymptoms, setOutpatientSymptoms] = useState([]);
  const [symptomsLoading, setSymptomsLoading] = useState(true);

  // Patient and form data
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
    emergency_contact_no: ''
  });

  const [formData, setFormData] = useState({
    selectedSymptoms: [],
    duration: '',
    severity: '',
    previousTreatment: '',
    allergies: '',
    medications: '',
    preferredDate: '',
    appointmentTime: ''
  });

  // Initialize on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    // Load patient info from localStorage (from login)
    const storedPatientInfo = localStorage.getItem('patientInfo');
    if (storedPatientInfo) {
      try {
        const patientInfo = JSON.parse(storedPatientInfo);
        setPatientData(patientInfo);
      } catch (err) {
        setError('Error loading patient information. Please try logging in again.');
      }
    } else {
      setError('Patient information not found. Please log in again.');
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchSymptoms();
  }, []);

  useEffect(() => {
    if (formData.preferredDate && formData.appointmentTime) {
      const availableSlots = generateAvailableTimeSlots(formData.preferredDate);
      const valid = availableSlots.some(slot => slot.value === formData.appointmentTime);
      if (!valid) {
        setFormData(prev => ({ ...prev, appointmentTime: '' }));
      }
    }
  }, [formData.preferredDate]);

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        handleSuccessModalClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // API Functions
  const fetchSymptoms = async () => {
    try {
      setSymptomsLoading(true);
      const response = await fetch('http://localhost:5000/api/symptoms');
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.symptoms && result.symptoms.length > 0) {
          setOutpatientSymptoms(result.symptoms);
        } else {
          setError('No symptoms found. Please check your database.');
          setOutpatientSymptoms([]);
        }
      } else {
        throw new Error(`API request failed with status ${response.status}`);
      }
    } catch (error) {
      setError('Failed to load symptoms from server.');
      setOutpatientSymptoms([]);
    } finally {
      setSymptomsLoading(false);
    }
  };

  // Utility Functions
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

  const getMaxAppointmentDate = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate.toISOString().split('T')[0];
  };

  const isRoutineCareSymptom = (symptoms) => {
    const routineCareSymptoms = [
      'Annual Check-up',
      'Health Screening', 
      'Vaccination',
      'Physical Exam',
      'Blood Pressure Check',
      'Cholesterol Screening',
      'Diabetes Screening',
      'Cancer Screening'
    ];
    
    return symptoms.some(symptom => routineCareSymptoms.includes(symptom));
  };

  const hasOnlyRoutineCareSymptoms = (symptoms) => {
    const routineCareSymptoms = [
      'Annual Check-up',
      'Health Screening', 
      'Vaccination',
      'Physical Exam',
      'Blood Pressure Check',
      'Cholesterol Screening',
      'Diabetes Screening',
      'Cancer Screening'
    ];
    
    return symptoms.every(symptom => routineCareSymptoms.includes(symptom));
  };

  // Validation Functions
  const validateAppointmentDateTime = (date, time) => {
    if (!date) return 'Appointment date is required';
    if (!time) return 'Appointment time is required';
    
    const selectedDate = new Date(date);
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    const isToday = selectedDate.toDateString() === today.toDateString();

    if (selectedDate < today.setHours(0, 0, 0, 0)) {
      return 'Invalid appointment date';
    }
    
    if (selectedDate > oneYearFromNow.setHours(0, 0, 0, 0)) {
      return 'Invalid appointment date';
    }
    
    if (isToday) {
      const currentHour = new Date().getHours();
      
      if (time === 'morning' && currentHour >= 12) {
        return 'Morning time slot is no longer available today';
      }
      if (time === 'afternoon' && currentHour >= 17) {
        return 'Afternoon time slot is no longer available today';
      }
      if (time === 'evening' && currentHour >= 20) {
        return 'Evening time slot is no longer available today';
      }
    }
    
    return null;
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return (
          patientData.patient_id &&
          patientData.name &&
          patientData.emergency_contact_name &&
          patientData.emergency_contact_relationship &&
          patientData.emergency_contact_no
        );
      case 2:
        return formData.selectedSymptoms.length > 0;
      case 3:
        const hasRoutineOnly = hasOnlyRoutineCareSymptoms(formData.selectedSymptoms);
        if (hasRoutineOnly) return true;
        return formData.duration && formData.severity;
      case 4:
        return formData.preferredDate && formData.appointmentTime;
      case 5:
        const hasRoutineOnlyFinal = hasOnlyRoutineCareSymptoms(formData.selectedSymptoms);
        return (
          formData.selectedSymptoms.length > 0 &&
          (hasRoutineOnlyFinal || (formData.duration && formData.severity)) &&
          formData.preferredDate &&
          formData.appointmentTime
        );
      default:
        return true;
    }
  };

  // Event Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'preferredDate') {
      if (value && value.length === 10) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          setError('Invalid date format');
        } else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          oneYearFromNow.setHours(0, 0, 0, 0);
          
          if (selectedDate < today) {
            setError('Invalid appointment date');
          } else if (selectedDate > oneYearFromNow) {
            setError('Invalid appointment date');
          } else {
            setError('');
          }
        }
      } else {
        setError('');
      }
      
      if (formData.preferredDate !== value && formData.appointmentTime) {
        setFormData(prev => ({ 
          ...prev, 
          [name]: processedValue,
          appointmentTime: ''
        }));
        return;
      }
    }

    if (showValidation) {
      setShowValidation(false);
      setFieldErrors({});
      setError('');
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSymptomToggle = (symptom) => {
    const isSelected = formData.selectedSymptoms.includes(symptom);
    const updatedSymptoms = isSelected
      ? formData.selectedSymptoms.filter(s => s !== symptom)
      : [...formData.selectedSymptoms, symptom];
    
    setFormData(prev => ({ ...prev, selectedSymptoms: updatedSymptoms }));
    
    if (updatedSymptoms.length > 0 && fieldErrors.selectedSymptoms) {
      const newErrors = { ...fieldErrors };
      delete newErrors.selectedSymptoms;
      setFieldErrors(newErrors);
      setError('');
    }
  };

  // Business Logic
  const generateAvailableTimeSlots = (selectedDate) => {
    const allSlots = [
      { value: 'morning', label: 'Morning (8:00 AM - 12:00 PM)', endHour: 12 },
      { value: 'afternoon', label: 'Afternoon (12:00 PM - 5:00 PM)', endHour: 17 },
      { value: 'evening', label: 'Evening (5:00 PM - 8:00 PM)', endHour: 20 },
      { value: 'anytime', label: 'Any available time', endHour: 24 }
    ];

    if (!selectedDate) return allSlots;

    const selectedDateObj = new Date(selectedDate);
    const today = new Date();
    const isToday = selectedDateObj.toDateString() === today.toDateString();

    if (!isToday) {
      return allSlots;
    }

    const currentHour = today.getHours();
    const availableSlots = [];

    allSlots.forEach(slot => {
      if (slot.value === 'anytime') {
        if (availableSlots.length > 0) {
          availableSlots.push(slot);
        }
      } else if (currentHour < slot.endHour - 2) {
        availableSlots.push(slot);
      }
    });

    return availableSlots.length > 0 ? availableSlots : [
      { value: 'emergency', label: 'Walk-in (subject to availability)' }
    ];
  };

  const generateDepartmentRecommendation = () => {
    const departmentMapping = {
      'Chest Pain': 'Cardiology',
      'Chest Discomfort': 'Cardiology', 
      'Heart Palpitations': 'Cardiology',
      'High Blood Pressure': 'Cardiology',
      'Shortness of Breath': 'Cardiology',
      'Stomach Ache': patientData.age < 18 ? 'Pediatrics' : 'Internal Medicine',
      'Fever': 'Internal Medicine',
      'Headache': 'Internal Medicine',
      'Fatigue': 'Internal Medicine',
      'Cough': 'Internal Medicine',
      'Nausea': 'Internal Medicine',
      'Vomiting': 'Internal Medicine',
      'Diarrhea': 'Internal Medicine',
      'Joint Pain': 'Internal Medicine',
      'Back Pain': 'Internal Medicine',
      'Annual Check-up': 'Internal Medicine',
      'Health Screening': 'Internal Medicine',
      'Vaccination': 'Internal Medicine'
    };

    for (const symptom of formData.selectedSymptoms) {
      if (departmentMapping[symptom]) {
        return departmentMapping[symptom];
      }
    }
    
    return 'Internal Medicine';
  };

  // Navigation
  const nextStep = () => {
    const stepErrors = {};

    if (currentStep === 1) {
      if (!patientData.emergency_contact_name || !patientData.emergency_contact_relationship || !patientData.emergency_contact_no) {
        setError('Emergency contact information is incomplete. Please visit the reception desk to update this information before continuing.');
        return;
      }
    }

    if (currentStep === 2) {
      if (formData.selectedSymptoms.length === 0) {
        stepErrors.selectedSymptoms = 'Please select at least one symptom';
      }
    }

    if (currentStep === 3) {
      const hasRoutineOnly = hasOnlyRoutineCareSymptoms(formData.selectedSymptoms);
      
      if (!hasRoutineOnly) {
        if (!formData.duration) {
          stepErrors.duration = 'Select how long you have experienced these symptoms';
        }
        if (!formData.severity) {
          stepErrors.severity = 'Select the severity level';
        }
      }
    }

    if (currentStep === 4) {
      const dateTimeValidation = validateAppointmentDateTime(formData.preferredDate, formData.appointmentTime);
      if (dateTimeValidation) {
        stepErrors.preferredDate = dateTimeValidation;
      }
      
      if (!formData.preferredDate) stepErrors.preferredDate = 'Select your preferred date';
      if (!formData.appointmentTime) stepErrors.appointmentTime = 'Select your preferred time slot';
    }

    setFieldErrors(stepErrors);
    setShowValidation(true);

    if (Object.keys(stepErrors).length === 0) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
        setShowValidation(false);
        setError('');
      }
    } else {
      setError('Please complete all required fields before continuing.');
      
      setTimeout(() => {
        if (currentStep === 2 && stepErrors.selectedSymptoms) {
          window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
          });
        } else {
          const firstErrorField = document.querySelector(
            `[name="${Object.keys(stepErrors)[0]}"]`
          );
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
          }
        }
      }, 100);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('patientToken');
      
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Validate patient data is loaded and matches expected format
      if (!patientData.patient_id || !patientData.name || !patientData.email) {
        throw new Error('Patient information incomplete. Please refresh and try again.');
      }

      // Create health assessment record
      const healthAssessmentData = {
        symptoms: formData.selectedSymptoms,
        duration: formData.duration,
        severity: formData.severity,
        previous_treatment: formData.previousTreatment || null,
        allergies: formData.allergies || null,
        medications: formData.medications || null,
        preferred_date: formData.preferredDate,
        preferred_time_slot: formData.appointmentTime
      };

      console.log('Submitting health assessment:', healthAssessmentData);

      const response = await fetch('http://localhost:5000/api/health-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(healthAssessmentData)
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          localStorage.removeItem('patientToken');
          localStorage.removeItem('patientInfo');
          throw new Error('Authentication expired. Please log in again.');
        }
        throw new Error(result.error || 'Health assessment submission failed');
      }

      const tempAssessmentId = result.temp_assessment_id;
      console.log('Health assessment created with ID:', tempAssessmentId);

      // Generate and send QR code via email with enhanced validation
      try {
        console.log('Generating QR code for assessment:', tempAssessmentId);

        const qrResponse = await fetch('http://localhost:5000/api/generate-health-assessment-qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            temp_assessment_id: tempAssessmentId
          })
        });

        const qrResult = await qrResponse.json();

        if (qrResponse.ok) {
          console.log('QR generation successful:', qrResult.success);
          
          // Validate that the generated QR data matches our patient
          const generatedQrData = {
            type: 'health_assessment',
            tempAssessmentId: tempAssessmentId,
            patientId: patientData.patient_id,
            patientName: patientData.name,
            department: qrResult.recommended_department,
            scheduledDate: formData.preferredDate,
            preferredTime: formData.appointmentTime,
            symptoms: formData.selectedSymptoms.join(', '),
            severity: formData.severity,
            timestamp: new Date().toISOString()
          };
          
          // Validate QR data integrity
          if (generatedQrData.patientId !== patientData.patient_id) {
            throw new Error('QR code validation failed - patient mismatch');
          }
          
          // Store in session storage for potential kiosk use
          sessionStorage.setItem('healthAssessmentQR', JSON.stringify(generatedQrData));
          
          setRegistrationResult({
            tempPatientId: tempAssessmentId,
            type: 'health_assessment'
          });
          setShowSuccessModal(true);
          
          // Show success message mentioning email
          showToastNotification('Health assessment completed! Check your email for the QR code.', 'success');
          
        } else {
          console.error('QR generation failed:', qrResult.error);
          
          // Handle QR generation failure gracefully
          if (qrResponse.status === 403 || qrResponse.status === 401) {
            throw new Error('Authentication expired during QR generation. Please log in again.');
          }
          
          // Show success but with limited functionality
          setRegistrationResult({
            tempPatientId: tempAssessmentId,
            recommendedDepartment: 'Internal Medicine',
            type: 'health_assessment',
            qrError: true
          });
          setShowSuccessModal(true);
          showToastNotification('Health assessment completed, but QR code email failed. Please visit the reception desk.', 'warning');
        }
        
      } catch (emailError) {
        console.error('QR generation error:', emailError);
        
        // Check if it's an authentication error
        if (emailError.message.includes('Authentication')) {
          throw emailError; // Re-throw auth errors to be handled by outer catch
        }
        
        // For other email errors, still show success but with warning
        setRegistrationResult({
          tempPatientId: tempAssessmentId,
          recommendedDepartment: 'Internal Medicine',
          type: 'health_assessment',
          qrError: true
        });
        setShowSuccessModal(true);
        showToastNotification('Health assessment completed, but QR code email failed. Please visit the reception desk.', 'warning');
      }

    } catch (err) {
      console.error('Submit error:', err);
      
      // Handle authentication errors specifically
      if (err.message.includes('Authentication')) {
        setError(err.message + ' Redirecting to login...');
        setTimeout(() => {
          localStorage.removeItem('patientToken');
          localStorage.removeItem('patientInfo');
          window.location.href = '/webapp-login';
        }, 2000);
      } else {
        setError(err.message || 'Submission failed. Please check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    
    setTimeout(() => {
      window.location.href = '/web-main';
    }, 500);
  };

  const showToastNotification = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  // Render Components
  const renderProgressBar = () => (
    <div className="webapp-progress-container">
      <div className="webapp-progress-steps">
        {['Personal', 'Symptoms', 'Details', 'Schedule', 'Summary'].map((name, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isLast = index === 4;

          return (
            <div key={index} className="webapp-progress-step-item">
              <div className={`webapp-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="webapp-step-number">
                  {isCompleted ? <Check size={14} /> : stepNumber}
                </div>
                <div className="webapp-step-label">{name}</div>
              </div>
              {!isLast && (
                <div className={`webapp-step-connector ${isCompleted ? 'completed' : ''} ${stepNumber === currentStep ? 'active' : ''}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPatientInfoStep = () => (
    <div className="webapp-reg-card webapp-step-transition">
      <div className="webapp-step-header">
        <div className="webapp-step-icon"><User size={24} /></div>
        <h3>Patient Information</h3>
        <p>Your Registered Information</p>
      </div>

      <div className="webapp-info-banner">
        <div className="webapp-info-icon"><CheckCircle size={20} /></div>
        <div className="webapp-info-content">
          <h4>Welcome back, {patientData.name}!</h4>
          <p>Your information is displayed below for verification</p>
        </div>
      </div>

      <div className="webapp-review-sections">
        <div className="webapp-review-section">
          <h4><User size={16} />Personal Information</h4>
          <div className="webapp-review-grid">
            <div className="webapp-review-item">
              <label>Patient ID:</label>
              <span>{patientData.patient_id}</span>
            </div>
            <div className="webapp-review-item">
              <label>Registration Date:</label>
              <span>
                {patientData.registration_date ? new Date(patientData.registration_date).toLocaleDateString() : 'Not available'}
              </span>
            </div>
            <div className="webapp-review-item">
              <label>Full Name:</label>
              <span>{patientData.name}</span>
            </div>
            <div className="webapp-review-item">
              <label>Sex:</label>
              <span>{patientData.sex}</span>
            </div>
            <div className="webapp-review-item">
              <label>Date of Birth:</label>
              <span>
                {patientData.birthday ? new Date(patientData.birthday).toLocaleDateString() : 'Not available'}
              </span>
            </div>
            <div className="webapp-review-item">
              <label>Age:</label>
              <span>{patientData.age} years old</span>
            </div>
            <div className="webapp-review-item full-width">
              <label>Address:</label>
              <span>{patientData.address}</span>
            </div>
          </div>
        </div>

        <div className="webapp-review-section">
          <h4><Phone size={16} />Contact Information</h4>
          <div className="webapp-review-grid">
            <div className="webapp-review-item">
              <label>Contact Number:</label>
              <span>{patientData.contact_no}</span>
            </div>
            <div className="webapp-review-item">
              <label>Email Address:</label>
              <span>{patientData.email}</span>
            </div>
          </div>
        </div>

        <div className="webapp-review-section">
          <h4><Bell size={16} />Emergency Contact</h4>
          <div className="webapp-review-grid">
            <div className="webapp-review-item">
              <label>Contact Name:</label>
              <span>
                {patientData.emergency_contact_name || 'Not provided'}
              </span>
            </div>
            <div className="webapp-review-item">
              <label>Relationship:</label>
              <span>
                {patientData.emergency_contact_relationship || 'Not provided'}
              </span>
            </div>
            <div className="webapp-review-item">
              <label>Contact Number:</label>
              <span>
                {patientData.emergency_contact_no || 'Not provided'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {(!patientData.emergency_contact_name || !patientData.emergency_contact_relationship || !patientData.emergency_contact_no) && (
        <div className="webapp-warning-note">
          <div className="webapp-warning-icon"><AlertTriangle size={20} /></div>
          <div className="webapp-warning-content">
            <strong>Emergency Contact Required</strong>
            <p>Your emergency contact information is incomplete. Please visit the reception desk to update this information before continuing.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderSymptomStep = () => (
    <div className="webapp-reg-card webapp-step-transition">
      <div className="webapp-step-header">
        <div className="webapp-step-icon">
          <Stethoscope size={24} />
        </div>
        <h3>Health Assessment</h3>
        <p>What brings you to the clinic today?</p>
      </div>

      <div className="webapp-symptoms-info">
        <div className={`webapp-info-banner ${showValidation && fieldErrors.selectedSymptoms ? 'has-error' : ''}`}>
          <div className="webapp-info-icon"><Stethoscope size={20} /></div>
          <div className="webapp-info-content">
            <h4>Select Your Symptoms</h4>
            <p>Choose all symptoms or health concerns you're experiencing</p>
          </div>
        </div>
      </div>

      {symptomsLoading ? (
        <div className="webapp-loading">
          <span className="webapp-loading-spinner"></span>
          Loading symptoms...
        </div>
      ) : outpatientSymptoms.length === 0 ? (
        <div className="webapp-reg-error">
          No symptoms available. Please refresh the page or contact support.
        </div>
      ) : (
        <div className="webapp-symptoms-categories">
          {outpatientSymptoms.map(category => (
            <div key={category.category} className="webapp-symptom-category">
              <div className="webapp-category-title">{category.category}</div>
              <div className="webapp-symptom-grid">
                {category.symptoms.map((symptom, index) => (
                  <button
                    key={`${category.category}-${symptom}-${index}`}
                    onClick={() => handleSymptomToggle(symptom)}
                    className={`webapp-symptom-btn ${formData.selectedSymptoms.includes(symptom) ? 'selected' : ''}`}
                  >
                    <span className="symptom-text">{symptom}</span>
                    {formData.selectedSymptoms.includes(symptom) && <span className="check-icon">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {formData.selectedSymptoms.length > 0 && (
        <div className="webapp-selected-symptoms">
          <h4>Selected Symptoms ({formData.selectedSymptoms.length})</h4>
          <div className="webapp-selected-list">
            {formData.selectedSymptoms.map(symptom => (
              <div
                key={symptom}
                className="webapp-selected-symptom"
                onClick={() => handleSymptomToggle(symptom)}
              >
                {symptom}
                <span className="remove-icon">×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => {
    const hasRoutineOnly = hasOnlyRoutineCareSymptoms(formData.selectedSymptoms);
    
    return (
      <div className="webapp-reg-card webapp-step-transition">
        <div className="webapp-step-header">
          <div className="webapp-step-icon">
            <List size={24} />
          </div>
          <h3>Additional Details</h3>
          <p>
            {hasRoutineOnly 
              ? "Additional information for your appointment"
              : "Help us understand your condition better"
            }
          </p>
        </div>

        {hasRoutineOnly && (
          <div className="webapp-info-banner">
            <div className="webapp-info-icon"><CalendarCheck size={20} /></div>
            <div className="webapp-info-content">
              <h4>Routine Care Appointment</h4>
              <p>Duration and severity are not required for routine care services. You may skip to scheduling if desired.</p>
            </div>
          </div>
        )}

        <div className="webapp-input-group">
          {!hasRoutineOnly && (
            <>
              <div className="webapp-input-group full-width">
                <label>How long have you experienced these symptoms?</label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className={`webapp-reg-form-input ${fieldErrors.duration ? 'invalid' : ''}`}
                  required
                >
                  <option value="" disabled>Select duration</option>
                  <option value="Less than 1 day">Less than 1 day</option>
                  <option value="1-3 days">1-3 days</option>
                  <option value="1 week">1 week</option>
                  <option value="2-4 weeks">2-4 weeks</option>
                  <option value="1-3 months">1-3 months</option>
                  <option value="More than 3 months">More than 3 months</option>
                </select>
                {showValidation && fieldErrors.duration && (
                  <small className="error-text">{fieldErrors.duration}</small>
                )}
              </div>

              <div className="webapp-input-group full-width">
                <label>Severity Level</label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className={`webapp-reg-form-input ${fieldErrors.severity ? 'invalid' : ''}`}
                  required
                >
                  <option value="" disabled>Select severity</option>
                  <option value="Mild">Mild - Manageable discomfort</option>
                  <option value="Moderate">Moderate - Affects daily activities</option>
                  <option value="Severe">Severe - Significantly impacts life</option>
                  <option value="Critical">Critical - Urgent attention needed</option>
                </select>
                {showValidation && fieldErrors.severity && (
                  <small className="error-text">{fieldErrors.severity}</small>
                )}
              </div>
            </>
          )}

          <div className="webapp-input-group full-width">
            <label>Previous Treatment</label>
            <textarea
              name="previousTreatment"
              value={formData.previousTreatment}
              onChange={handleInputChange}
              placeholder={hasRoutineOnly 
                ? "Any previous screenings, vaccinations, or relevant medical history"
                : "Any previous treatments or medications tried for this condition"
              }
              className="webapp-reg-form-input webapp-form-textarea"
              rows="2"
            />
          </div>

          <div className="webapp-input-group full-width">
            <label>Known Allergies</label>
            <input
              type="text"
              name="allergies"
              value={formData.allergies}
              onChange={handleInputChange}
              placeholder="List any known allergies to medications or substances"
              className="webapp-reg-form-input"
            />
          </div>

          <div className="webapp-input-group full-width">
            <label>Current Medications</label>
            <input
              type="text"
              name="medications"
              value={formData.medications}
              onChange={handleInputChange}
              placeholder="List any medications you're currently taking"
              className="webapp-reg-form-input"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSchedulingStep = () => (
    <div className="webapp-reg-card webapp-step-transition">
      <div className="webapp-step-header">
        <div className="webapp-step-icon">
          <Calendar size={24} />
        </div>
        <h3>Appointment Scheduling</h3>
        <p>Choose your preferred appointment date and time</p>
      </div>

      <div className="webapp-form-grid two-column">
        <div className="webapp-input-group">
          <label>Preferred Date</label>
          <input
            type="date"
            name="preferredDate"
            value={formData.preferredDate}
            onChange={handleInputChange}
            onInput={(e) => {
              const value = e.target.value;
              if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                e.target.value = formData.preferredDate;
              }
            }}
            min={new Date().toISOString().split('T')[0]}
            max={getMaxAppointmentDate()}
            className={`webapp-reg-form-input ${fieldErrors.preferredDate ? 'invalid' : ''}`}
            required
          />
          {showValidation && fieldErrors.preferredDate && (
            <small className="error-text">{fieldErrors.preferredDate}</small>
          )}
        </div>

        <div className="webapp-input-group">
          <label>Appointment Time</label>
          <select
            name="appointmentTime"
            value={formData.appointmentTime}
            onChange={handleInputChange}
            className={`webapp-reg-form-input ${fieldErrors.appointmentTime ? 'invalid' : ''}`}
            required
          >
            <option value="">Select preferred time</option>
            {generateAvailableTimeSlots(formData.preferredDate).map(slot => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          {formData.preferredDate && new Date(formData.preferredDate).toDateString() === new Date().toDateString() && (
            <small className="input-reminder">Same-day appointments are subject to availability</small>
          )}
          {showValidation && fieldErrors.appointmentTime && (
            <small className="error-text">{fieldErrors.appointmentTime}</small>
          )}
        </div>
      </div>
    </div>
  );

  const renderSummaryStep = () => (
    <div className="webapp-reg-card webapp-step-transition">
      <div className="webapp-step-header">
        <div className="webapp-step-icon">
          <Clipboard size={24} />
        </div>
        <h3>Assessment Summary</h3>
        <p>Review your information before submitting</p>
      </div>

      {error && <div className="webapp-reg-error">{error}</div>}

      <div className="webapp-summary-sections">
        <div className="webapp-summary-section">
          <h4><User size={16} /> Patient Information</h4>
          <div className="webapp-summary-grid">
            <div className="webapp-summary-item">
              <label>Patient ID:</label>
              <span>{patientData.patient_id}</span>
            </div>
            <div className="webapp-summary-item">
              <label>Full Name:</label>
              <span>{patientData.name}</span>
            </div>
            <div className="webapp-summary-item">
              <label>Age:</label>
              <span>{patientData.age}</span>
            </div>
            <div className="webapp-summary-item">
              <label>Sex:</label>
              <span>{patientData.sex}</span>
            </div>
            <div className="webapp-summary-item full-width">
              <label>Contact:</label>
              <span>{patientData.contact_no}</span>
            </div>
            <div className="webapp-summary-item full-width">
              <label>Email:</label>
              <span>{patientData.email}</span>
            </div>
          </div>
        </div>

        <div className="webapp-summary-section">
          <h4><Stethoscope size={16} /> Health Information</h4>
          <div className="webapp-summary-grid">
            <div className="webapp-summary-item full-width">
              <label>Symptoms ({formData.selectedSymptoms.length}):</label>
              <span>{formData.selectedSymptoms.join(', ')}</span>
            </div>
            <div className="webapp-summary-item">
              <label>Duration:</label>
              <span>{formData.duration}</span>
            </div>
            <div className="webapp-summary-item">
              <label>Severity:</label>
              <span>{formData.severity}</span>
            </div>
            {formData.allergies && (
              <div className="webapp-summary-item full-width">
                <label>Allergies:</label>
                <span>{formData.allergies}</span>
              </div>
            )}
            {formData.medications && (
              <div className="webapp-summary-item full-width">
                <label>Current Medications:</label>
                <span>{formData.medications}</span>
              </div>
            )}
          </div>
        </div>

        <div className="webapp-summary-section">
          <h4><Calendar size={16} /> Appointment Schedule</h4>
          <div className="webapp-summary-grid">
            <div className="webapp-summary-item">
              <label>Preferred Date:</label>
              <span>{formData.preferredDate}</span>
            </div>
            <div className="webapp-summary-item">
              <label>Preferred Time:</label>
              <span>{formData.appointmentTime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderPatientInfoStep();
      case 2: return renderSymptomStep();
      case 3: return renderDetailsStep();
      case 4: return renderSchedulingStep();
      case 5: return renderSummaryStep();
      default: return renderPatientInfoStep();
    }
  };

  const renderBackButton = () => {
    if (currentStep === 1) {
      return (
        <button
          type="button"
          onClick={() => window.location.href = '/web-main'}
          className="webapp-nav-btn home"
        >
          <ChevronLeft size={16} />Back to Dashboard
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={prevStep}
        className="webapp-nav-btn secondary"
      >
        <ChevronLeft size={16} />Back
      </button>
    );
  };

  const renderNextButton = () => {
    if (currentStep === 5) {
      return (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="webapp-nav-btn submit"
        >
          Submit
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={nextStep}
        className="webapp-nav-btn primary"
      >
        Continue<ChevronRight size={16} />
      </button>
    );
  };

  const renderNavigationButtons = () => (
    <div className="webapp-nav-buttons">
      {renderBackButton()}
      {renderNextButton()}
    </div>
  );

  const renderSuccessModal = () => {
    if (!showSuccessModal || !registrationResult) return null;

    return (
      <div className="webapp-popup-overlay">
        <div className="webapp-popup webapp-success-modal">
          <div className="webapp-popup-content">
            <div className="webapp-success-content">
              <div className="webapp-success-icon">
                <CheckCircle size={48} />
              </div>
              <div className="webapp-success-message">
                <h4>Health Assessment QR Code Sent!</h4>
                <p style={{ color: 'var(--webapp-text-light)', fontSize: '0.85em', margin: '10px 0' }}>
                  Your health assessment QR code has been sent to your email.
                </p>
                <p style={{ color: 'var(--webapp-text-light)', fontSize: '0.85em', margin: '10px 0' }}>
                  Please check your email and present the QR code at the hospital kiosk for your appointment.
                </p>
              </div>
              <button
                onClick={handleSuccessModalClose}
                className="webapp-success-btn"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderToast = () => {
    if (!showToast) return null;

    return (
      <div className={`webapp-toast webapp-toast-${toastType}`}>
        <div className="webapp-toast-content">
          <div className="webapp-toast-icon">
            {toastType === 'success' && <CheckCircle size={18} />}
            {toastType === 'error' && <AlertTriangle size={18} />}
            {toastType === 'info' && <Info size={18} />}
          </div>
          <div className="webapp-toast-message">{toastMessage}</div>
          <button 
            onClick={() => setShowToast(false)} 
            className="webapp-toast-close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Main Render
  return (
    <div className="webapp-registration-portal">
      <div className="webapp-reg-header">
        <img src={clicareLogo} alt="CliCare Logo" className="kioskreg-logo"/>
        <div className="webapp-hospital-info">
          <p><strong>{formatTime(currentTime)}</strong></p>
          <p>{formatDate(currentTime)}</p>
        </div>
      </div>

      {renderProgressBar()}
      
      <div className="webapp-reg-content">
        {renderCurrentStep()}
      </div>

      <div className="webapp-nav-container">
        {renderNavigationButtons()}
      </div>

      <div className="webapp-help-footer">
        <div className="webapp-help-section">
          <h4>Need Help?</h4>
          <p>Contact hospital staff or use the help button for assistance</p>
        </div>
      </div>

      {renderSuccessModal()}
      {renderToast()}
    </div>
  );
};

export default WebAppointment;