  // terminalpatientregistration.js
  import React, { useState, useEffect } from 'react';
  import './terminalpatientregistration.css';
  import sampleID from "../../sampleID.png";
  import Tesseract from 'tesseract.js';
  import { processIDWithOCR, isCameraAvailable, initializeCamera, cleanupCamera, captureImageFromVideo } from '../../services/tesseractOCR';


  const TerminalPatientRegistration = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [patientType, setPatientType] = useState('new');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [idScanMode, setIdScanMode] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [fieldErrors, setFieldErrors] = useState({});
    const [showValidation, setShowValidation] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [cameraError, setCameraError] = useState('');


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

    // API Functions
  const registerNewPatient = async (patientData) => {
  try {
    const response = await fetch('http://localhost:5000/api/patient/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        name: patientData.fullName,
        birthday: patientData.birthday,
        age: parseInt(patientData.age),
        sex: patientData.sex,
        address: patientData.address,
        contact_no: cleanPhoneNumber(patientData.contactNumber),
        email: patientData.email.toLowerCase(),
        emergency_contact_name: patientData.emergencyContactName,
        emergency_contact_relationship: patientData.emergencyRelationship,
        emergency_contact_no: cleanPhoneNumber(patientData.emergencyContactNumber),
        symptoms: patientData.selectedSymptoms // Add this line
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    return data;
  } catch (error) {
    console.error('Registration API error:', error);
    throw error;
  }
};

  const bookAppointmentForReturningPatient = async (patientData) => {
    try {
      const response = await fetch('http://localhost:5000/api/patient/visit', {  // Changed from /api/outpatient/book-appointment
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          patient_id: patientData.patient_id,
          symptoms: patientData.selectedSymptoms.join(', '),
          duration: patientData.duration,
          severity: patientData.severity,
          previous_treatment: patientData.previousTreatment,
          allergies: patientData.allergies,
          medications: patientData.medications,
          appointment_type: 'Walk-in Appointment'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Appointment booking failed');
      }

      return data;
    } catch (error) {
      console.error('Appointment booking API error:', error);
      throw error;
    }
  };

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

    useEffect(() => {
      if (showCameraModal) {
        initializeCameraStream();
      } else {
        cleanupCameraStream();
      }
      return () => cleanupCameraStream();
    }, [showCameraModal]);

    const handleIDScanClick = () => {
      if (!isCameraAvailable()) {
        setError('Camera scanning requires HTTPS connection. Please contact IT support or enter information manually.');
        return;
      }
      setShowCameraModal(true);
      setCameraError('');
    };

    const initializeCameraStream = async () => {
        try {
          const stream = await initializeCamera();
          setCameraStream(stream);
          
          setTimeout(() => {
            const videoElement = document.getElementById('camera-feed');
            if (videoElement) {
              videoElement.srcObject = stream;
              videoElement.setAttribute('playsinline', '');
              videoElement.setAttribute('webkit-playsinline', '');
              videoElement.muted = true;
              
              const playPromise = videoElement.play();
              if (playPromise !== undefined) {
                playPromise.catch(error => {
                  console.log('Video play failed:', error);
                });
              }
            }
          }, 100);
        } catch (err) {
          console.error('Camera access error:', err);
          setCameraError(err.message);
        }
      };

      const cleanupCameraStream = () => {
        cleanupCamera(cameraStream);
        setCameraStream(null);
      };

      const handleCaptureID = () => {
        const videoElement = document.getElementById('camera-feed');
        const capturedImageData = captureImageFromVideo(videoElement);
        setCapturedImage(capturedImageData);
        processIDImageWithOCR(capturedImageData);
      };

      const processIDImageWithOCR = async (imageData) => {
        setOcrLoading(true);
        setIdScanMode(true);
        
        try {
          const result = await processIDWithOCR(imageData);
          
          if (result.success && result.name) {
            setFormData(prev => ({
              ...prev,
              fullName: result.name
            }));
            
            setShowCameraModal(false);
            setError('');
            alert('✅ ID scanned successfully! Name auto-filled.');
          } else {
            setCameraError(result.message);
          }
          
        } catch (err) {
          console.error('OCR processing error:', err);
          setCameraError('Failed to process ID image. Please try again.');
        } finally {
          setOcrLoading(false);
          setIdScanMode(false);
        }
      };

      const closeCameraModal = () => {
        setShowCameraModal(false);
        setCapturedImage(null);
        setCameraError('');
      };

      const renderCameraModal = () => {
      if (!showCameraModal) return null;
      
      return (
        <div className="terminal-modal-overlay">
          <div className="terminal-modal terminal-camera-modal">
            <div className="terminal-modal-header">
              <h3>📄 Scan Philippine ID or PLM ID</h3>
              <button 
                onClick={closeCameraModal}
                className="terminal-modal-close"
              >
                ✕
              </button>
            </div>
            
            <div className="terminal-modal-content">
              {cameraError ? (
                  <div className="terminal-camera-error">
                    <div className="terminal-error-icon">⚠️</div>
                    <p>{cameraError}</p>
                    <div className="terminal-error-actions">
                      {cameraError.includes('HTTPS') ? (
                        <button 
                          onClick={closeCameraModal}
                          className="terminal-retry-btn"
                        >
                          Enter Manually
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={initializeCameraStream}
                            className="terminal-retry-btn"
                          >
                            Try Again
                          </button>
                          <button 
                            onClick={closeCameraModal}
                            className="terminal-cancel-btn"
                          >
                            Enter Manually
                          </button>
                        </>
                      )}
                    </div>
                  </div>
              ) : (
                <>
                  <div className="terminal-camera-container">
                    <video
                      id="camera-feed"
                      autoPlay
                      playsInline
                      muted
                      className="terminal-camera-feed"
                    />
                    <div className="terminal-camera-overlay">
                      <div className="terminal-id-frame">
                        <div className="terminal-corner tl"></div>
                        <div className="terminal-corner tr"></div>
                        <div className="terminal-corner bl"></div>
                        <div className="terminal-corner br"></div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="terminal-camera-instruction">
                    Position your ID within the frame above
                  </p>
                  
                  <button
                    onClick={handleCaptureID}
                    disabled={ocrLoading || !cameraStream}
                    className="terminal-capture-btn"
                  >
                    {ocrLoading ? (
                      <>
                        <span className="terminal-loading-spinner"></span>
                        Processing...
                      </>
                    ) : (
                      '📸 Capture ID'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    };

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


    const toTitleCase = (str) => {
      if (!str) return '';
      return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };


    const toLowerCase = (str) => {
      if (!str) return '';
      return str.toLowerCase();
    };


    const formatPhoneNumber = (value) => {
      const cleaned = value.replace(/\D/g, '');
      const limited = cleaned.slice(0, 11);


      if (limited.length >= 8) {
        return limited.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
      } else if (limited.length >= 5) {
        return limited.replace(/(\d{4})(\d{1,3})/, '$1-$2');
      }
      return limited;
    };


    const cleanPhoneNumber = (value) => {
      return value.replace(/\D/g, '');
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


    const validatePhoneNumber = (value) => {
      const cleaned = value.replace(/\D/g, '');
    
      if (!cleaned) return 'Contact number is required';
      if (cleaned.length < 11) return 'Contact number must be 11 digits';
      if (cleaned.length > 11) return 'Contact number must be exactly 11 digits';
      if (!cleaned.startsWith('09')) return 'Contact number must start with 09';
    
      return null;
    };


    const validateEmail = (email) => {
      if (!email) return 'Email address is required';
      if (!email.includes('@')) return 'Email must contain @';
      if (!email.match(/\.[a-zA-Z]{2,}$/)) return 'Email must contain a valid domain (e.g., .com, .org)';
    
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.toLowerCase())) return 'Please enter a valid email format';
    
      return null;
    };


    const validateFullName = (name) => {
      if (!name.trim()) return 'Full name is required';
      const words = name.trim().split(/\s+/);
      if (words.length < 2) return 'Please enter your full name';
      if (/\./.test(name)) return 'Do not use initials (write full middle name instead)';
      return null;
    };


    const validateAddress = (address) => {
      if (!address.trim()) return 'Complete address is required';
      const parts = address.split(' ').map(p => p.trim()).filter(Boolean);
      if (parts.length < 4) {
        return 'Please follow the format: House No., Street, Barangay, City, Province';
      }
      return null;
    };


    const validateStep = (step) => {
      if (patientType === 'returning') {
        switch (step) {
          case 4:
            const phoneValid = validatePhoneNumber(patientData.emergency_contact_no || '') === null;
            return patientData.patient_id &&
                  patientData.name &&
                  patientData.emergency_contact_name &&
                  patientData.emergency_contact_relationship &&
                  phoneValid;
          case 5:
            return patientData.selectedSymptoms && patientData.selectedSymptoms.length > 0;
          case 6:
            return patientData.duration && patientData.severity;
          case 7:
            const emergencyPhoneValid = validatePhoneNumber(patientData.emergency_contact_no || '') === null;
            return patientData.selectedSymptoms.length > 0 &&
                  patientData.duration &&
                  patientData.severity &&
                  patientData.emergency_contact_name &&
                  patientData.emergency_contact_relationship &&
                  emergencyPhoneValid;
          default:
            return true;
        }
      } else {
        switch (step) {
          case 1:
            const contactValid = validatePhoneNumber(formData.contactNumber) === null;
            const emailValid = validateEmail(formData.email) === null;
            const nameValid = validateFullName(formData.fullName) === null;
            const addressValid = validateAddress(formData.address) === null;
            return formData.fullName &&
              formData.sex &&
              formData.birthday &&
              formData.address &&
              contactValid &&
              emailValid &&
              nameValid &&
              addressValid;
          case 2:
            const emergencyNameValid = validateFullName(formData.emergencyContactName) === null;
            const emergencyNumberValid = validatePhoneNumber(formData.emergencyContactNumber) === null;
            const notSameAsPatient = formData.emergencyContactNumber !== formData.contactNumber;
            return (
              formData.emergencyContactName &&
              formData.emergencyContactNumber &&
              emergencyNameValid &&
              emergencyNumberValid &&
              notSameAsPatient
            );
          case 3:
            return formData.fullName && formData.sex && formData.birthday &&
                formData.address && formData.contactNumber && formData.email &&
                formData.emergencyContactName && formData.emergencyContactNumber &&
                formData.emergencyRelationship && termsAccepted;
          case 4:
            return formData.selectedSymptoms && formData.selectedSymptoms.length > 0;
          case 5:
            return formData.duration && formData.severity;
          case 6:
            const finalContactValid = validatePhoneNumber(formData.contactNumber) === null;
            const finalEmergencyValid = validatePhoneNumber(formData.emergencyContactNumber) === null;
            const finalEmailValid = validateEmail(formData.email) === null;
            return formData.fullName &&
                  formData.selectedSymptoms.length > 0 &&
                  finalContactValid &&
                  finalEmergencyValid &&
                  finalEmailValid &&
                  termsAccepted;
          default:
            return true;
        }
      }
    };


    const handleInputChange = (e) => {
      const { name, value } = e.target;
      let processedValue = value;
    
      if (['fullName', 'emergencyContactName', 'address'].includes(name)) {
        processedValue = toTitleCase(value);
      } else if (name === 'email') {
        processedValue = toLowerCase(value);
      } else if (['contactNumber', 'emergencyContactNumber'].includes(name)) {
        processedValue = formatPhoneNumber(value);
      }
    
      if (showValidation) {
        setShowValidation(false);
        setFieldErrors({});
        setError('');
      }
    
      if (patientType === 'returning') {
        const updatedData = { ...patientData, [name]: processedValue };
        if (name === 'birthday') {
          updatedData.age = calculateAge(processedValue);
        }
        setPatientData(updatedData);
      } else {
        const updatedData = { ...formData, [name]: processedValue };
        if (name === 'birthday') {
          updatedData.age = calculateAge(processedValue);
        }
        setFormData(updatedData);
      }
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


    const nextStep = () => {
      const stepErrors = {};
    
      if (currentStep === 1) {
        if (!formData.fullName.trim()) stepErrors.fullName = 'Full name is required';
        else if (validateFullName(formData.fullName)) stepErrors.fullName = validateFullName(formData.fullName);
      
        if (!formData.sex) stepErrors.sex = 'Select your sex';
        if (!formData.birthday) stepErrors.birthday = 'Select your date of birth';
        if (!formData.address.trim()) stepErrors.address = 'Complete address is required';
        else if (validateAddress(formData.address)) stepErrors.address = validateAddress(formData.address);
      
        if (!formData.contactNumber) stepErrors.contactNumber = 'Contact number is required';
        else if (validatePhoneNumber(formData.contactNumber)) stepErrors.contactNumber = validatePhoneNumber(formData.contactNumber);
      
        if (!formData.email) stepErrors.email = 'Email address is required';
        else if (validateEmail(formData.email)) stepErrors.email = validateEmail(formData.email);
      }
    
      if (currentStep === 2) {
        if (!formData.emergencyContactName.trim()) stepErrors.emergencyContactName = 'Emergency contact name is required';
        else if (validateFullName(formData.emergencyContactName)) stepErrors.emergencyContactName = validateFullName(formData.emergencyContactName);
      
        if (!formData.emergencyContactNumber) stepErrors.emergencyContactNumber = 'Emergency contact number is required';
        else if (validatePhoneNumber(formData.emergencyContactNumber)) stepErrors.emergencyContactNumber = validatePhoneNumber(formData.emergencyContactNumber);
      
        if (!formData.emergencyRelationship) stepErrors.emergencyRelationship = 'Select your relationship';
      
        if (formData.emergencyContactNumber === formData.contactNumber) {
          stepErrors.emergencyContactNumber = 'Emergency contact number cannot be the same as patient\'s number';
        }
      }
    
      if (currentStep === 3) {
        if (!termsAccepted) {
          stepErrors.termsAccepted = '';
        }
      }


      setFieldErrors(stepErrors);
      setShowValidation(true);


      if (Object.keys(stepErrors).length === 0) {
        const maxStep = patientType === 'returning' ? 7 : 6;
        if (currentStep < maxStep) {
          setCurrentStep(currentStep + 1);
          setShowValidation(false);
          setError('');
        }
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


    const generateDepartmentRecommendation = () => {
      const currentData = patientType === 'returning' ? patientData : formData;
      const departmentMapping = {
        'Fever': 'Internal Medicine',
        'Headache': 'Internal Medicine',
        'Fatigue': 'Internal Medicine',
      
        'Chest Pain': 'Cardiology',
        'Chest Discomfort': 'Cardiology',
        'Heart Palpitations': 'Cardiology',
        'High Blood Pressure': 'Cardiology',
        'Dizziness': 'Cardiology',
        'Swelling in Legs': 'Cardiology',
      
        'Joint Pain': currentData.age < 18 ? 'Pediatrics' : 'Internal Medicine',
        'Back Pain': currentData.age < 18 ? 'Pediatrics' : 'Internal Medicine',
        'Muscle Pain': currentData.age < 18 ? 'Pediatrics' : 'Internal Medicine',
        'Stomach Ache': currentData.age < 18 ? 'Pediatrics' : 'Internal Medicine',


        'Cough': 'Internal Medicine',
        'Shortness of Breath': 'Internal Medicine',
        'Sore Throat': 'Internal Medicine',
        'Runny Nose': 'Internal Medicine',
        'Congestion': 'Internal Medicine',
      
        'Nausea': 'Internal Medicine',
        'Vomiting': 'Internal Medicine',
        'Diarrhea': 'Internal Medicine',
        'Constipation': 'Internal Medicine',
        'Abdominal Pain': 'Internal Medicine',
        'Heartburn': 'Internal Medicine',
      
        'Annual Check-up': 'Internal Medicine',
        'Vaccination': 'Internal Medicine',
        'Health Screening': 'Internal Medicine'
      };


      const primarySymptom = currentData.selectedSymptoms[0];
      return departmentMapping[primarySymptom] || 'Internal Medicine';
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
        
        if (patientType === 'new') {
          // Register new patient via API
          console.log('Registering new patient...');
          const registrationResult = await registerNewPatient(formData);
          
          // Show success message with Patient ID
          alert(`✅ Registration completed successfully!\n\nYour Patient ID: ${registrationResult.patient.patient_id}\n\nPlease save this ID for future visits. You can now log in using this ID and your registered email or phone number.`);
          
          // Store new patient info for potential immediate login
          localStorage.setItem('newPatientId', registrationResult.patient.patient_id);
          localStorage.setItem('newPatientEmail', formData.email);
          localStorage.setItem('newPatientPhone', formData.contactNumber);
          
        } else {
          // Book appointment for returning patient
          console.log('Booking appointment for returning patient...');
          const appointmentResult = await bookAppointmentForReturningPatient(patientData);
          
          alert(`✅ Appointment booked successfully!\n\nQueue Number: ${appointmentResult.queue_number || 'TBD'}\nDepartment: ${appointmentResult.department || generateDepartmentRecommendation()}\nEstimated Wait Time: ${appointmentResult.estimated_wait || 'Will be announced'}`);
        }

        // Keep the original registration payload logging for debugging
        const registrationPayload = {
          patient: {
            name: submitData.fullName || submitData.name,
            birthday: submitData.birthday,
            age: submitData.age,
            sex: submitData.sex,
            address: submitData.address,
            contact_no: cleanPhoneNumber(submitData.contactNumber || submitData.contact_no || ''),
            email: submitData.email
          },

          emergencyContact: {
            name: submitData.emergencyContactName || submitData.emergency_contact_name,
            contact_number: cleanPhoneNumber(submitData.emergencyContactNumber || submitData.emergency_contact_no || ''),
            relationship: submitData.emergencyRelationship || submitData.emergency_contact_relationship
          },

          visit: {
            appointment_type: 'Walk-in Registration',
            symptoms: submitData.selectedSymptoms.join(', ')
          },

          healthInfo: {
            symptoms: submitData.selectedSymptoms,
            duration: submitData.duration,
            severity: submitData.severity,
            previousTreatment: submitData.previousTreatment,
            allergies: submitData.allergies,
            medications: submitData.medications
          },
          recommendedDepartment: generateDepartmentRecommendation()
        };

        // Keep the original backup API call (commented out but preserved)
        /*
        const response = await fetch('http://localhost:5000/api/patient/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(registrationPayload)
        });

        if (!response.ok) {
          throw new Error('Registration failed');
        }

        const result = await response.json();
        console.log('Registration successful:', result);
        */

        console.log('Registration payload for debugging:', registrationPayload);
        
        // Clear localStorage (preserve original functionality)
        localStorage.removeItem('patientType');
        localStorage.removeItem('patientInfo');
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patientId');
        localStorage.removeItem('patientName');

        // Redirect back to login (preserve original functionality)
        setTimeout(() => {
          window.location.href = '/terminal-patient-login';
        }, 2000);

      } catch (err) {
        console.error('Registration error:', err);
        setError(err.message || 'Registration failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      const storedPatientType = localStorage.getItem('patientType') || 'new';
      const storedPatientInfo = localStorage.getItem('patientInfo');
      const patientToken = localStorage.getItem('patientToken');
    
      setPatientType(storedPatientType);
    
      if (storedPatientType === 'returning' && storedPatientInfo) {
        try {
          const patientInfo = JSON.parse(storedPatientInfo);
          console.log('Raw localStorage patientInfo:', storedPatientInfo);
      console.log('Parsed patientInfo object:', patientInfo);
      console.log('Emergency contact fields:', {
        emergency_contact_name: patientInfo.emergency_contact_name,
        emergency_contact_relationship: patientInfo.emergency_contact_relationship,
        emergency_contact_no: patientInfo.emergency_contact_no
      });
        
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


    // Step Components
    const renderPatientInfoStep = () => (
      <div className="terminal-patient-card terminal-patient-step-transition">
        <div className="terminal-patient-step-header">
          <div className="terminal-patient-step-icon"><i className="fa-regular fa-user"></i></div>
          <h3>Patient Information</h3>
          <p>Your Registered Information</p>
        </div>


        {error && <div className="terminal-patient-error">{error}</div>}


        <div className="terminal-patient-info-banner">
          <div className="terminal-patient-info-icon"><i className="fa-solid fa-square-check"></i></div>
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
            <h4><i className="fa-solid fa-phone"></i>Contact Information</h4>
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
            <h4><i className="fa-solid fa-bell"></i>Emergency Contact</h4>
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
            <div className="terminal-patient-warning-icon"><i className="fa-solid fa-triangle-exclamation"></i></div>
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


        <div className="terminal-patient-input-group">
          <label>Scan ID</label>
          <div className="terminal-patient-scan-helper">Optional: a shortcut to speed up typing your full name</div>
          <div className="terminal-patient-id-scan">
            <img src={sampleID} alt="Sample ID" className="sampleID" />
            <button
              onClick={handleIDScanClick}
              disabled={idScanMode || !isCameraAvailable()}
              className="terminal-patient-id-scan-btn"
            >
              {!isCameraAvailable() ? (
                <>
                  Camera Not Available (HTTPS Required)
                </>
              ) : idScanMode ? (
                <>
                  <span className="terminal-patient-loading-spinner"></span>
                  Scanning ID...
                </>
              ) : (
                "Scan ID"
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
              className={`terminal-patient-form-input ${fieldErrors.fullName ? 'invalid' : ''}`}
              required
            />
            <small className="input-reminder">
              First Name, Middle Name, Last Name
            </small>
            {showValidation && fieldErrors.fullName && (
              <small className="error-text">{fieldErrors.fullName}</small>
            )}
          </div>


          <div className="terminal-patient-input-group">
            <label>Sex</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleInputChange}
              className={`terminal-patient-form-input ${showValidation && fieldErrors.sex ? 'invalid' : ''} ${formData.sex ? 'has-value' : 'empty'}`}
              required
            >
              <option value="" disabled hidden>
                Select sex
              </option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {showValidation && fieldErrors.sex && (
              <small className="error-text">{fieldErrors.sex}</small>
            )}
          </div>


          <div className="terminal-patient-input-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleInputChange}
              className={`terminal-patient-form-input ${showValidation && fieldErrors.birthday ? 'invalid' : ''} ${formData.birthday ? 'has-value' : 'empty'}`}
              max={new Date().toISOString().split('T')[0]}
              required
            />
            {showValidation && fieldErrors.birthday && (
              <small className="error-text">{fieldErrors.birthday}</small>
            )}
          </div>


          <div className="terminal-patient-input-group">
            <label>Age</label>
            <input
              type="text"
              value={formData.age ? `${formData.age} years old` : ''}
              className="terminal-patient-form-input"
              disabled
              placeholder="Auto-fill"
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
              className={`terminal-patient-form-input ${fieldErrors.address ? 'invalid' : ''}`}
              required
            />
            {fieldErrors.address && (
              <small className="error-text">{fieldErrors.address}</small>
            )}
          </div>


          <div className="terminal-patient-input-group">
            <label>Contact Number</label>
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleInputChange}
              placeholder="09XX-XXX-XXXX"
              className={`terminal-patient-form-input ${fieldErrors.contactNumber ? 'invalid' : ''}`}
              required
            />
            {fieldErrors.contactNumber && (
              <small className="error-text">{fieldErrors.contactNumber}</small>
            )}
          </div>


          <div className="terminal-patient-input-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
              className={`terminal-patient-form-input ${fieldErrors.email ? 'invalid' : ''}`}
              required
            />
            {fieldErrors.email && (
              <small className="error-text">{fieldErrors.email}</small>
            )}
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
              className={`terminal-patient-form-input ${fieldErrors.emergencyContactName ? 'invalid' : ''}`}
              required
            />
            {fieldErrors.emergencyContactName && (
              <small className="error-text">{fieldErrors.emergencyContactName}</small>
            )}
          </div>


          <div className="terminal-patient-input-group">
            <label>Contact Number</label>
            <input
              type="tel"
              name="emergencyContactNumber"
              value={formData.emergencyContactNumber}
              onChange={handleInputChange}
              placeholder="09XX-XXX-XXXX"
              className={`terminal-patient-form-input ${fieldErrors.emergencyContactNumber ? 'invalid' : ''}`}
              required
            />
            {fieldErrors.emergencyContactNumber && (
              <small className="error-text">{fieldErrors.emergencyContactNumber}</small>
            )}
            {formData.emergencyContactNumber &&
              formData.emergencyContactNumber === formData.contactNumber && (
                <small className="error-text">
                  Emergency contact number cannot be the same as patient's number
                </small>
              )}
          </div>


          <div className="terminal-patient-input-group">
            <label>Relationship</label>
            <select
              name="emergencyRelationship"
              value={formData.emergencyRelationship}
              onChange={handleInputChange}
              className={`terminal-patient-form-input ${showValidation && fieldErrors.emergencyRelationship ? 'invalid' : ''}`}
              required
            >
              <option value="" disabled hidden>
                Select relationship
              </option>
              <option value="Parent">Parent</option>
              <option value="Spouse">Spouse/Partner</option>
              <option value="Sibling">Sibling</option>
              <option value="Child">Child</option>
              <option value="Relative">Other Relative</option>
              <option value="Friend">Close Friend</option>
              <option value="Guardian">Legal Guardian</option>
            </select>
            {showValidation && fieldErrors.emergencyRelationship && (
              <small className="error-text">{fieldErrors.emergencyRelationship}</small>
            )}
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
          <label className={`terminal-patient-checkbox-label ${showValidation && fieldErrors.hasOwnProperty('termsAccepted') && !termsAccepted ? 'invalid' : ''}`}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked && fieldErrors.hasOwnProperty('termsAccepted')) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.termsAccepted;
                  setFieldErrors(newErrors);
                }
              }}
              className={showValidation && fieldErrors.hasOwnProperty('termsAccepted') && !termsAccepted ? 'invalid' : ''}
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
            <div className="terminal-patient-step-icon"><i className="fa-solid fa-stethoscope"></i></div>
            <h3>Health Assessment</h3>
            <p>What brings you to the clinic today?</p>
          </div>


          {error && <div className="terminal-patient-error">{error}</div>}


          <div className="terminal-patient-symptoms-info">
            <div className="terminal-patient-info-banner">
              <div className="terminal-patient-info-icon"><i className="fa-solid fa-stethoscope"></i></div>
              <div className="terminal-patient-info-content">
                <h4>Select Your Symptoms</h4>
                <p>Choose all symptoms or health concerns you're experiencing</p>
              </div>
            </div>
          </div>


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


    // Navigation
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
            <i className="fa-solid fa-less-than"></i>Back to Home
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
          <i className="fa-solid fa-less-than"></i>Back
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
          Continue<i className="fa-solid fa-greater-than"></i>
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
        {renderCameraModal()}
      </div>
    );
  };


  export default TerminalPatientRegistration;

