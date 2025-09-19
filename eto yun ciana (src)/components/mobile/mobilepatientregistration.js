// mobilepatientregistration.js - Aligned with Terminal Design
import React, { useState, useEffect } from 'react';
import './mobilepatientregistration.css';
import Tesseract from 'tesseract.js';

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
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (['fullName', 'emergencyContactName', 'address'].includes(name)) {
      processedValue = toTitleCase(value);
    } else if (name === 'email') {
      processedValue = value.toLowerCase();
    } else if (['contactNumber', 'emergencyContactNumber'].includes(name)) {
      processedValue = formatPhoneNumber(value);
    }

    setFormData({
      ...formData,
      [name]: processedValue
    });
    setError('');

    if (showValidation) {
      setShowValidation(false);
      setFieldErrors({});
    }
  };

  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
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

  const checkCameraPermissions = async () => {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' });
      
      if (permissions.state === 'denied') {
        setCameraError('Camera access is blocked. Please enable camera permissions in your browser settings and refresh the page.');
        return false;
      }
      
      return true;
    } catch (err) {
      return true;
    }
  };

  const handleIDScanClick = () => {
    setShowCameraModal(true);
    setCameraError('');
  };

  useEffect(() => {
    if (showCameraModal) {
      initializeCamera();
    } else {
      cleanupCamera();
    }
    
    return () => cleanupCamera();
  }, [showCameraModal]);

  const initializeCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser or requires HTTPS');
      }

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 640, max: 1920 },
          height: { ideal: 1080, min: 480, max: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      
      setTimeout(() => {
        const videoElement = document.getElementById('mobile-camera-feed');
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
      
      let errorMessage = '';
      
      if (err.message.includes('Camera API not supported')) {
        errorMessage = 'Camera scanning requires HTTPS connection. Please access this page using https:// or use a modern browser.';
      } else if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported on this device or browser.';
      } else {
        errorMessage = 'Camera access failed. Please try again or enter information manually.';
      }
      
      setCameraError(errorMessage);
    }
  };

  const isCameraAvailable = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  const cleanupCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleCaptureID = () => {
    const videoElement = document.getElementById('mobile-camera-feed');
    
    if (!videoElement || !videoElement.srcObject) {
      setCameraError('Camera not ready. Please wait and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    const capturedImageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(capturedImageData);
    
    processIDWithOCR(capturedImageData);
  };

  const processIDWithOCR = async (imageData) => {
    setOcrLoading(true);
    setIdScanMode(true);
    
    try {
      const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz,0123456789',
      });
      
      console.log('OCR Result:', text);
      
      const extractedName = extractNameFromID(text);
      
      if (extractedName) {
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        
        setFormData(prev => ({
          ...prev,
          fullName: extractedName
        }));
        
        setShowCameraModal(false);
        setError('');
        
        alert('ID scanned successfully! Name has been filled in the form.');
        
      } else {
        setCameraError('Could not read the name from your ID. Please ensure the ID is well-lit and try again, or enter your name manually.');
      }
      
    } catch (err) {
      console.error('OCR processing error:', err);
      setCameraError('Failed to process the ID image. Please ensure good lighting and try again.');
    } finally {
      setOcrLoading(false);
      setIdScanMode(false);
    }
  };

  const extractNameFromID = (text) => {
    const lines = text.split('\n').map(line => line.trim().toUpperCase());
    
    const namePattern = /([A-Z\s]+),\s*([A-Z\s]+)/;
    
    for (let line of lines) {
      if (line.includes('REPUBLIC') || line.includes('PHILIPPINES') || 
          line.includes('DEPARTMENT') || line.includes('TRANSPORTATION') ||
          line.includes('DRIVER') || line.includes('LICENSE')) {
        continue;
      }
      
      const nameMatch = line.match(namePattern);
      if (nameMatch) {
        const lastName = nameMatch[1].trim();
        const firstMiddle = nameMatch[2].trim();
        return `${firstMiddle} ${lastName}`;
      }
      
      if (line.length > 10 && line.length < 50 && 
          /^[A-Z\s]+$/.test(line) && 
          !line.includes('MALE') && !line.includes('FEMALE') &&
          !line.includes('PHL') && !line.includes('NCR')) {
        
        const words = line.split(/\s+/).filter(word => word.length > 1);
        if (words.length >= 2 && words.length <= 4) {
          return line;
        }
      }
    }
    
    return null;
  };

  const closeCameraModal = () => {
    setShowCameraModal(false);
    setCapturedImage(null);
    setCameraError('');
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        const contactValid = validatePhoneNumber(formData.contactNumber) === null;
        const emailValid = validateEmail(formData.email) === null;
        const nameValid = validateFullName(formData.fullName) === null;
        const addressValid = validateAddress(formData.address) === null;
        return formData.fullName && formData.age && formData.sex && 
               formData.address && formData.contactNumber && formData.email &&
               contactValid && emailValid && nameValid && addressValid;
      case 2:
        const emergencyNameValid = validateFullName(formData.emergencyContactName) === null;
        const emergencyNumberValid = validatePhoneNumber(formData.emergencyContactNumber) === null;
        const notSameAsPatient = formData.emergencyContactNumber !== formData.contactNumber;
        return formData.emergencyContactName && formData.emergencyContactNumber && 
               formData.emergencyRelationship && emergencyNameValid && emergencyNumberValid && notSameAsPatient;
      case 3:
        return termsAccepted;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const stepErrors = {};

    if (currentStep === 1) {
      if (!formData.fullName.trim()) stepErrors.fullName = 'Full name is required';
      else if (validateFullName(formData.fullName)) stepErrors.fullName = validateFullName(formData.fullName);
      
      if (!formData.sex) stepErrors.sex = 'Select your sex';
      if (!formData.age) stepErrors.age = 'Age is required';
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
        stepErrors.termsAccepted = 'Please accept the terms and conditions to proceed';
      }
    }

    setFieldErrors(stepErrors);
    setShowValidation(true);

    if (Object.keys(stepErrors).length === 0) {
      setCurrentStep(currentStep + 1);
      setShowValidation(false);
      setError('');
    } else {
      setError('Please complete all required fields before continuing.');
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
      // Calculate age from birthday if not already set
      const calculatedAge = formData.age || calculateAge(formData.birthday);

      // Prepare registration data according to database schema
      const registrationData = {
        name: formData.fullName,
        birthday: formData.birthday,
        age: parseInt(calculatedAge),
        sex: formData.sex,
        address: formData.address,
        contact_no: cleanPhoneNumber(formData.contactNumber),
        email: formData.email.toLowerCase(),
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_relationship: formData.emergencyRelationship,
        emergency_contact_no: cleanPhoneNumber(formData.emergencyContactNumber),
        preferred_time: new Date().toISOString(),
        created_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      };

      console.log('Submitting registration data:', registrationData);

      // Submit to backend API
      const response = await fetch('http://localhost:5000/api/temp-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      console.log('Registration successful:', result);

      // Store registration info in session
      const tempRegId = result.temp_id;
      const tempPatientId = result.temp_patient_id;

      sessionStorage.setItem('tempRegId', tempRegId);
      sessionStorage.setItem('tempPatientId', tempPatientId);
      sessionStorage.setItem('patientName', formData.fullName);
      sessionStorage.setItem('patientEmail', formData.email);
      sessionStorage.setItem('registrationSuccess', 'true');

      // Proceed to health assessment
      window.location.href = '/mobile-health-assessment';

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
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

  const renderCameraModal = () => {
    if (!showCameraModal) return null;
    
    return (
      <div className="mobile-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeCameraModal()}>
        <div className="mobile-modal mobile-camera-modal">
          <div className="mobile-modal-header">
            <h3>Scan Philippine ID</h3>
            <button 
              onClick={closeCameraModal}
              className="mobile-modal-close"
            >
              ×
            </button>
          </div>
          
          <div className="mobile-modal-content">
            {cameraError ? (
              <div className="mobile-camera-error">
                <div className="mobile-error-icon">⚠️</div>
                <p>{cameraError}</p>
                <div className="mobile-error-actions">
                  <button 
                    onClick={initializeCamera}
                    className="mobile-retry-btn"
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={closeCameraModal}
                    className="mobile-cancel-btn"
                  >
                    Enter Manually
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mobile-camera-container">
                  <video
                    id="mobile-camera-feed"
                    autoPlay
                    playsInline
                    webkit-playsinline
                    muted
                    className="mobile-camera-feed"
                  />
                  <div className="mobile-camera-overlay">
                    <div className="mobile-id-frame">
                      <div className="mobile-frame-text">Position ID here</div>
                      <div className="mobile-corner tl"></div>
                      <div className="mobile-corner tr"></div>
                      <div className="mobile-corner bl"></div>
                      <div className="mobile-corner br"></div>
                    </div>
                  </div>
                </div>
                
                <div className="mobile-camera-instructions">
                  <p><strong>Tips for best results:</strong></p>
                  <ul>
                    <li>Ensure good lighting</li>
                    <li>Hold phone steady</li>
                    <li>Keep ID flat and within frame</li>
                    <li>Avoid glare and shadows</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleCaptureID}
                  disabled={ocrLoading || !cameraStream}
                  className="mobile-capture-btn"
                >
                  {ocrLoading ? (
                    <>
                      <span className="mobile-loading-spinner"></span>
                      Processing... Please wait
                    </>
                  ) : (
                    'Capture ID'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPersonalDetailsStep = () => (
    <div className="mobile-reg-card mobile-step-transition">
      <div className="mobile-step-header">
        <div className="mobile-step-icon">
          <i className="fa-regular fa-user"></i>
        </div>
        <h3>Personal Information</h3>
        <p>Please provide your basic information</p>
      </div>

      <div className="mobile-id-scan">
        <button 
          type="button" 
          onClick={handleIDScanClick}
          className="mobile-id-scan-btn"
          disabled={idScanMode || !isCameraAvailable()}
        >
          {!isCameraAvailable() ? (
            <>
              Camera Not Available (HTTPS Required)
            </>
          ) : idScanMode ? (
            <>
              <span className="mobile-loading-spinner"></span>
              Processing ID...
            </>
          ) : (
            <>
              Scan Philippine ID
            </>
          )}
        </button>
        <small>
          {!isCameraAvailable() 
            ? 'Camera scanning requires HTTPS connection' 
            : 'Optional: Auto-fill using your ID'
          }
        </small>
      </div>

      <div className="mobile-form-grid">
        <div className="mobile-input-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter your complete legal name"
            className={`mobile-form-input ${fieldErrors.fullName ? 'invalid' : ''}`}
            required
          />
          <small className="input-reminder">
            First Name, Middle Name, Last Name
          </small>
          {showValidation && fieldErrors.fullName && (
            <small className="error-text">{fieldErrors.fullName}</small>
          )}
        </div>

        <div className="mobile-form-grid two-column">
          <div className="mobile-input-group">
            <label>Age *</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Age"
              className={`mobile-form-input ${fieldErrors.age ? 'invalid' : ''}`}
              min="1"
              max="120"
              required
            />
            {showValidation && fieldErrors.age && (
              <small className="error-text">{fieldErrors.age}</small>
            )}
          </div>

          <div className="mobile-input-group">
            <label>Sex *</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleInputChange}
              className={`mobile-form-input ${showValidation && fieldErrors.sex ? 'invalid' : ''} ${formData.sex ? 'has-value' : 'empty'}`}
              required
            >
              <option value="" disabled hidden>Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {showValidation && fieldErrors.sex && (
              <small className="error-text">{fieldErrors.sex}</small>
            )}
          </div>
        </div>

        <div className="mobile-input-group">
          <label>Complete Address *</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="House/Unit, Street, Barangay, City, Province"
            className={`mobile-form-input mobile-form-textarea ${fieldErrors.address ? 'invalid' : ''}`}
            rows="3"
            required
          />
          {fieldErrors.address && (
            <small className="error-text">{fieldErrors.address}</small>
          )}
        </div>

        <div className="mobile-input-group">
          <label>Contact Number *</label>
          <input
            type="tel"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleInputChange}
            placeholder="09XX-XXX-XXXX"
            className={`mobile-form-input ${fieldErrors.contactNumber ? 'invalid' : ''}`}
            pattern="[0-9]{11}"
            required
          />
          {fieldErrors.contactNumber && (
            <small className="error-text">{fieldErrors.contactNumber}</small>
          )}
        </div>

        <div className="mobile-input-group">
          <label>Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your.email@example.com"
            className={`mobile-form-input ${fieldErrors.email ? 'invalid' : ''}`}
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
    <div className="mobile-reg-card mobile-step-transition">
      <div className="mobile-step-header">
        <div className="mobile-step-icon">
          <i className="fa-regular fa-bell"></i>
        </div>
        <h3>Emergency Contact</h3>
        <p>Who should we contact in emergencies?</p>
      </div>

      <div className="mobile-emergency-banner">
        <div className="mobile-banner-icon">
          <i className="fa-solid fa-bell"></i>
        </div>
        <div className="mobile-banner-content">
          <h4>Important Information</h4>
          <p>This person will be contacted during medical emergencies</p>
        </div>
      </div>

      <div className="mobile-form-grid">
        <div className="mobile-input-group">
          <label>Emergency Contact Name *</label>
          <input
            type="text"
            name="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={handleInputChange}
            placeholder="Full name of emergency contact"
            className={`mobile-form-input ${fieldErrors.emergencyContactName ? 'invalid' : ''}`}
            required
          />
          {fieldErrors.emergencyContactName && (
            <small className="error-text">{fieldErrors.emergencyContactName}</small>
          )}
        </div>

        <div className="mobile-input-group">
          <label>Contact Number *</label>
          <input
            type="tel"
            name="emergencyContactNumber"
            value={formData.emergencyContactNumber}
            onChange={handleInputChange}
            placeholder="09XX-XXX-XXXX"
            className={`mobile-form-input ${fieldErrors.emergencyContactNumber ? 'invalid' : ''}`}
            pattern="[0-9]{11}"
            required
          />
          {fieldErrors.emergencyContactNumber && (
            <small className="error-text">{fieldErrors.emergencyContactNumber}</small>
          )}
        </div>

        <div className="mobile-input-group">
          <label>Relationship *</label>
          <select
            name="emergencyRelationship"
            value={formData.emergencyRelationship}
            onChange={handleInputChange}
            className={`mobile-form-input ${showValidation && fieldErrors.emergencyRelationship ? 'invalid' : ''} ${formData.emergencyRelationship ? 'has-value' : 'empty'}`}
            required
          >
            <option value="" disabled hidden>Select relationship</option>
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
    <div className="mobile-reg-card mobile-step-transition">
      <div className="mobile-step-header">
        <div className="mobile-step-icon">
          <i className="fa-regular fa-clipboard"></i>
        </div>
        <h3>Review & Confirm</h3>
        <p>Please verify your information</p>
      </div>

      <div className="mobile-review-sections">
        <div className="mobile-review-section">
          <h4><i className="fa-solid fa-user"></i> Personal Information</h4>
          <div className="mobile-review-grid">
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
            <div className="mobile-review-item full-width">
              <label>Address:</label>
              <span>{formData.address}</span>
            </div>
          </div>
        </div>

        <div className="mobile-review-section">
          <h4><i className="fa-solid fa-bell"></i> Emergency Contact</h4>
          <div className="mobile-review-grid">
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
        </div>

        {formData.idType && (
          <div className="mobile-review-section">
            <h4><i className="fa-solid fa-id-card"></i> ID Information</h4>
            <div className="mobile-review-grid">
              <div className="mobile-review-item">
                <label>ID Type:</label>
                <span>{formData.idType}</span>
              </div>
              <div className="mobile-review-item">
                <label>ID Number:</label>
                <span>{formData.idNumber}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mobile-terms">
        <label className={`mobile-checkbox-label ${showValidation && fieldErrors.hasOwnProperty('termsAccepted') && !termsAccepted ? 'invalid' : ''}`}>
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
            required 
          />
          <span>I agree to CLICARE's privacy policy and terms of service</span>
        </label>
        {showValidation && fieldErrors.termsAccepted && (
          <small className="error-text">{fieldErrors.termsAccepted}</small>
        )}
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
            <i className="fa-solid fa-less-than"></i>Back
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || !termsAccepted}
            className="mobile-nav-btn submit"
          >
            {loading ? (
              <>
                <span className="mobile-loading-spinner"></span>
                Creating...
              </>
            ) : (
              'Complete Registration'
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
            <i className="fa-solid fa-less-than"></i>Back
          </button>
        )}
        <button 
          type="button"
          onClick={nextStep}
          className="mobile-nav-btn primary"
          disabled={!validateStep(currentStep)}
        >
          Continue<i className="fa-solid fa-greater-than"></i>
        </button>
      </div>
    );
  };

  const renderProgressBar = () => (
    <div className="mobile-progress-container">
      <div className="mobile-progress-steps">
        <div className={`mobile-progress-step-item ${currentStep >= 1 ? 'active' : ''}`}>
          <div className="mobile-step">
            <div className="mobile-step-number">
              {currentStep > 1 ? <i className="fa-solid fa-check"></i> : '1'}
            </div>
            <div className="mobile-step-label">Personal</div>
          </div>
          {currentStep > 1 && <div className="mobile-step-connector completed"></div>}
        </div>
        
        <div className={`mobile-progress-step-item ${currentStep >= 2 ? 'active' : ''}`}>
          <div className="mobile-step">
            <div className="mobile-step-number">
              {currentStep > 2 ? <i className="fa-solid fa-check"></i> : '2'}
            </div>
            <div className="mobile-step-label">Emergency</div>
          </div>
          {currentStep > 2 && <div className="mobile-step-connector completed"></div>}
        </div>
        
        <div className={`mobile-progress-step-item ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="mobile-step">
            <div className="mobile-step-number">3</div>
            <div className="mobile-step-label">Review</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mobile-registration-portal">
      <div className="mobile-reg-header">
        <div className="mobile-reg-logo">
          <i className="fa-solid fa-hospital"></i>
        </div>
        <div className="mobile-reg-title">
          <h1>CliCare</h1>
          <p>Patient Registration System</p>
        </div>
        <div className="mobile-hospital-info">
          <p><strong>{formatTime(currentTime)}</strong></p>
          <p>{formatDate(currentTime)}</p>
        </div>
      </div>

      {renderProgressBar()}
      
      <div className="mobile-reg-content">
        {error && <div className="mobile-reg-error">{error}</div>}
        
        {currentStep === 1 && renderPersonalDetailsStep()}
        {currentStep === 2 && renderEmergencyContactStep()}
        {currentStep === 3 && renderReviewStep()}

        <div className="mobile-back-to-login">
          <button 
            onClick={() => window.location.href = '/mobile-patient-login'}
            className="mobile-back-to-login-btn"
          >
            <i className="fa-solid fa-less-than"></i>Back to Login
          </button>
          
          <div className="mobile-help-text">
            <p>Need help? <strong>Tap to call (02) 8123-4567</strong></p>
            <p>Registration hours: Mon-Fri 7AM-5PM</p>
          </div>
        </div>
      </div>

      <div className="mobile-nav-container">
        {renderNavigationButtons()}
      </div>
      {renderCameraModal()}
    </div>
  );
};

export default MobilePatientRegistration;