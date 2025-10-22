// kioskregistration.js
import React, { useState, useEffect } from 'react';
import './kioskregistration.css';
import sampleID from "../../sampleID.png";
import clicareLogo from "../../clicareLogo.png";
import { PrintingService } from '../../services/printingService';
import jsQR from 'jsqr';
import {
  User,
  Bell,
  Clipboard,
  Stethoscope,
  List,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Check,
  Info,
  QrCode,
  Camera,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Heart,
  Activity,
  Shield,
  Printer,
  Receipt,
  Home,
  LogOut
} from 'lucide-react';

import {
  processIDWithOCR,
  isCameraAvailable,
  initializeCamera,
  cleanupCamera,
  captureImageFromVideo
} from '../../services/tesseractOCR';

const KioskRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [patientType, setPatientType] = useState('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fieldErrors, setFieldErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [duplicateChecking, setDuplicateChecking] = useState(false);
  const [duplicateCheckTimer, setDuplicateCheckTimer] = useState(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalContent, setAlertModalContent] = useState({ title: '', message: '', type: 'info' });

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [showQrScanModal, setShowQrScanModal] = useState(false);
  const [qrScanResult, setQrScanResult] = useState(null);
  const [qrError, setQrError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanInterval, setScanInterval] = useState(null);

  const [outpatientSymptoms, setOutpatientSymptoms] = useState([]);
  const [symptomsLoading, setSymptomsLoading] = useState(true);

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    const storedPatientType = localStorage.getItem('patientType') || 'new';
    const storedPatientInfo = localStorage.getItem('patientInfo');
    setPatientType(storedPatientType);

    if (storedPatientType === 'returning' && storedPatientInfo) {
      try {
        const patientInfo = JSON.parse(storedPatientInfo);
        setPatientData({
          ...patientInfo,
          selectedSymptoms: [], 
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
        setError('Error loading patient information. Please try logging in again.');
      }
    } else if (storedPatientType === 'new') {
      setCurrentStep(1);
    } else {
      setTimeout(() => {
        window.location.href = '/kiosk-login';
      }, 500);
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchSymptoms();
  }, []);

  useEffect(() => {
    if (showCameraModal) {
      initializeCameraStream();
    } else {
      cleanupCameraStream();
    }
    return () => cleanupCameraStream();
  }, [showCameraModal]);

  useEffect(() => {
    if (showQrScanModal) {
      initializeCameraStream();
    } else {
      stopQrScanning();
      cleanupCameraStream();
    }
    return () => {
      stopQrScanning();
      cleanupCameraStream();
    };
  }, [showQrScanModal]);

  useEffect(() => {
    const shouldScanQr = localStorage.getItem('scanQrOnLoad');
    if (shouldScanQr === 'true') {
      localStorage.removeItem('scanQrOnLoad');
      setTimeout(() => {
        handleQrScan();
      }, 1000);
    }
  }, []);

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        handleSuccessModalClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  useEffect(() => {
    return () => {
      if (duplicateCheckTimer) {
        clearTimeout(duplicateCheckTimer);
      }
    };
  }, [duplicateCheckTimer]);

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

  const registerNewPatient = async (data) => {
    const response = await fetch('http://localhost:5000/api/patient/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: data.fullName,
        birthday: data.birthday,
        age: parseInt(data.age),
        sex: data.sex,
        address: data.address,
        contact_no: cleanPhoneNumber(data.contactNumber),
        email: data.email.toLowerCase(),
        emergency_contact_name: data.emergencyContactName,
        emergency_contact_relationship: data.emergencyRelationship,
        emergency_contact_no: cleanPhoneNumber(data.emergencyContactNumber),
        symptoms: data.selectedSymptoms,
        duration: data.duration,
        severity: data.severity,
        previous_treatment: data.previousTreatment,
        allergies: data.allergies,
        medications: data.medications,
        temp_id: qrScanResult?.temp_id || null
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      if (result.field) {
        setFieldErrors(prev => ({
          ...prev,
          [result.field === 'phone' ? 'contactNumber' : result.field]: result.error
        }));
      }
      throw new Error(result.error || 'Registration failed');
    }

    if (qrScanResult && qrScanResult.temp_id) {
      try {
        await fetch(`http://localhost:5000/api/temp-registration/${qrScanResult.temp_id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (cleanupError) {
        // Silent fail for cleanup
      }
    }
    return result;
  };

  const bookAppointmentForReturningPatient = async (data) => {
    const response = await fetch('http://localhost:5000/api/patient/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        patient_id: data.patient_id,
        symptoms: data.selectedSymptoms.join(', '),
        duration: data.duration,
        severity: data.severity,
        previous_treatment: data.previousTreatment,
        allergies: data.allergies,
        medications: data.medications,
        appointment_type: 'Walk-in Appointment'
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Appointment booking failed');
    return result;
  };

  const generateTempToken = (patientId) => {
    const payload = {
      patientId: patientId,
      type: 'outpatient',
      exp: Math.floor(Date.now() / 1000) + (60 * 60)
    };
    return btoa(JSON.stringify(payload));
  };

  const handleIDScanClick = () => {
    if (!isCameraAvailable()) {
      setError('Camera scanning requires HTTPS connection. Please contact IT support or enter information manually.');
      return;
    }
    
    setOcrProcessing(false);
    setShowCameraModal(true);
    setCameraError('');
  };

  const initializeCameraStream = async () => {
    cleanupCameraStream();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const stream = await initializeCamera();
      
      if (!stream) {
        throw new Error('Failed to get camera stream');
      }
      
      setCameraStream(stream);
      setCameraError('');
      
      setTimeout(() => {
        const videoId = showQrScanModal ? 'qr-camera-feed' : 'camera-feed';
        const video = document.getElementById(videoId);
        
        if (!video) {
          setCameraError('Video element not available. Please try again.');
          return;
        }
        
        video.srcObject = null;
        video.load();
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.muted = true;
        
        const playVideo = async () => {
          try {
            await video.play();
            
            if (showQrScanModal && videoId === 'qr-camera-feed') {
              const checkVideoReady = () => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  setTimeout(() => {
                    startQrScanningWithStream(stream, video);
                  }, 500);
                } else {
                  setTimeout(checkVideoReady, 500);
                }
              };
              setTimeout(checkVideoReady, 1000);
            }
          } catch (playError) {
            setCameraError('Failed to start camera preview. Please check camera permissions.');
          }
        };
        
        playVideo();
      }, 300);
      
    } catch (err) {
      let errorMessage = 'Failed to access camera. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.';
      } else {
        errorMessage += err.message || 'Unknown camera error.';
      }
      
      setCameraError(errorMessage);
      setCameraStream(null);
    }
  };

  const cleanupCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
      });
    }

    const videoElements = ['camera-feed', 'qr-camera-feed'];
    videoElements.forEach(id => {
      const video = document.getElementById(id);
      if (video) {
        video.srcObject = null;
        video.load();
      }
    });

    cleanupCamera(cameraStream);
    setCameraStream(null);
  };

  const handleCaptureID = () => {
    if (ocrProcessing) return;
    
    const video = document.getElementById('camera-feed');
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Camera not ready. Please wait a moment and try again.');
      return;
    }
    
    try {
      const imageData = captureImageFromVideo(video);
      if (!imageData) {
        setCameraError('Failed to capture image. Please try again.');
        return;
      }
      
      setCapturedImage(imageData);
      processIDImageWithOCR(imageData);
    } catch (error) {
      setCameraError('Failed to capture image. Please try again.');
    }
  };

  const processIDImageWithOCR = async (imageData) => {
    if (ocrProcessing || !imageData) return;
    
    setOcrProcessing(true);
    
    try {
      const result = await processIDWithOCR(imageData);
      
      if (result.success && result.name) {
        setFormData((prev) => ({ ...prev, fullName: result.name }));
        setShowCameraModal(false);
        setError('');
        showToastNotification('ID scanned successfully! Name auto-filled.', 'success');
      } else {
        setCameraError(result.message || 'Failed to extract name from ID');
      }
    } catch (err) {
      setCameraError('Failed to process ID image. Please try again.');
    } finally {
      setOcrProcessing(false);
    }
  };

  const closeCameraModal = (focusFullName = false) => {
    setShowCameraModal(false);
    setCapturedImage(null);
    setCameraError('');
    setOcrProcessing(false);
    
    cleanupCameraStream();
    
    if (focusFullName) {
      setTimeout(() => {
        const fullNameInput = document.querySelector('input[name="fullName"]');
        if (fullNameInput) {
          fullNameInput.focus();
          fullNameInput.select();
        }
      }, 100);
    }
  };

  const retryIDCamera = async () => {
    setCameraError('');
    setOcrProcessing(false);
    await initializeCameraStream();
  };

  const handleQrScan = () => {
    if (!isCameraAvailable()) {
      setError('Camera scanning requires HTTPS connection. Please contact IT support.');
      return;
    }
    
    setQrError('');
    setQrScanResult(null);
    setIsScanning(false);
    stopQrScanning();
    
    setShowQrScanModal(true);
  };

  const startQrScanningWithStream = (stream, videoElement) => {
    if (!stream) {
      setQrError('Camera stream not available. Please try again.');
      return;
    }
    
    if (scanInterval) {
      clearInterval(scanInterval);
      setScanInterval(null);
    }
    
    setIsScanning(true);
    setQrError('');
    
    const interval = setInterval(() => {
      const video = videoElement || document.getElementById('qr-camera-feed');
      
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }
      
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code && code.data) {
          clearInterval(interval);
          setScanInterval(null);
          setIsScanning(false);
          processQrData(code.data);
        }
      } catch (error) {
        // Silent fail for QR scanning errors
      }
    }, 300);
    
    setScanInterval(interval);

    setTimeout(() => {
      if (scanInterval === interval) { 
        clearInterval(interval);
        setScanInterval(null);
        setIsScanning(false);
        setQrError('No QR code detected within 30 seconds. Please ensure the QR code is clearly visible and try again.');
      }
    }, 30000);
  };

  const processQrData = async (qrDataString) => {
    try {
      const qrData = JSON.parse(qrDataString);
      
      const validation = validateQRData(qrData);
      if (!validation.valid) {
        setQrError(validation.error);
        return;
      }
      
      if (qrData.type === 'health_assessment') {
        await processHealthAssessmentQR(qrData);
      } else if (qrData.type === 'mobile_registration' || qrData.type === 'webreg_registration') {
        await processRegistrationQR(qrData);
      }
      
    } catch (err) {
      if (err instanceof SyntaxError) {
        setQrError('Invalid QR code format. Please scan a valid CliCare QR code.');
      } else {
        setQrError('Failed to process QR code. Please try again.');
      }
    }
  };

  const processHealthAssessmentQR = async (qrData) => {
    try {
      if (!patientData.patient_id) {
        setQrError('Please ensure you are logged in before scanning health assessment QR codes.');
        return;
      }

      if (qrData.patientId !== patientData.patient_id) {
        setQrError(`This health assessment QR code belongs to patient ID ${qrData.patientId}. You are currently logged in as ${patientData.patient_id}. Please use your own QR code or log in with the correct account.`);
        return;
      }

      if (qrData.expiresAt) {
        const now = new Date();
        const expiresAt = new Date(qrData.expiresAt);
        if (now > expiresAt) {
          setQrError('This health assessment QR code has expired. Please generate a new one from your mobile app.');
          return;
        }
      }

      const response = await fetch(`http://localhost:5000/api/health-assessment/${qrData.tempAssessmentId}`);
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        setQrError('Health assessment expired or not found. Please create a new health assessment.');
        return;
      }

      const assessmentData = result.assessment;

      if (assessmentData.patient && assessmentData.patient.patient_id !== patientData.patient_id) {
        setQrError('Server verification failed: This health assessment belongs to a different patient.');
        return;
      }

      setPatientData(prev => ({
        ...prev,
        selectedSymptoms: assessmentData.symptoms ? assessmentData.symptoms.split(', ') : [],
        duration: assessmentData.duration || '',
        severity: assessmentData.severity || '',
        previousTreatment: assessmentData.previous_treatment || '',
        allergies: assessmentData.allergies || '',
        medications: assessmentData.medications || '',
        preferredDate: assessmentData.preferred_date || '',
        appointmentTime: assessmentData.preferred_time_slot || ''
      }));

      setQrScanResult(assessmentData);
      closeQrScanModal();
      showToastNotification('Health assessment data loaded successfully!', 'success');
      
    } catch (err) {
      setQrError('Failed to load health assessment data. Please check your internet connection and try again.');
    }
  };

  const processRegistrationQR = async (qrData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/temp-registration/${qrData.tempPatientId}`);
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        setQrError('Registration expired or not found. Please register manually or contact staff for assistance.');
        return;
      }

      const tempData = result.data;
      
      setFormData({
        fullName: tempData.name || '',
        sex: tempData.sex || '',
        birthday: tempData.birthday || '',
        age: tempData.age ? tempData.age.toString() : '',
        address: tempData.address || '',
        contactNumber: tempData.contact_no ? formatPhoneNumber(tempData.contact_no) : '',
        email: tempData.email || '',
        emergencyContactName: tempData.emergency_contact_name || '',
        emergencyContactNumber: tempData.emergency_contact_no ? formatPhoneNumber(tempData.emergency_contact_no) : '',
        emergencyRelationship: tempData.emergency_contact_relationship || '',
        selectedSymptoms: tempData.symptoms ? tempData.symptoms.split(', ') : [],
        duration: tempData.duration || '',
        severity: tempData.severity || '',
        previousTreatment: tempData.previous_treatment || '',
        allergies: tempData.allergies || '',
        medications: tempData.medications || '',
        preferredDate: tempData.preferred_date || '',
        appointmentTime: tempData.preferred_time_slot || ''
      });

      setQrScanResult(tempData);
      closeQrScanModal();
      showToastNotification('Registration data loaded successfully!', 'success');
      
    } catch (err) {
      setQrError('Failed to process registration QR code. Please check your internet connection and try again.');
    }
  };

  const stopQrScanning = () => {
    if (scanInterval) {
      clearInterval(scanInterval);
      setScanInterval(null);
    }
    setIsScanning(false);
  };

  const retryQRCamera = async () => {
    setQrError('');
    setQrScanResult(null);
    setIsScanning(false);
    
    stopQrScanning();
    cleanupCameraStream();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      await initializeCameraStream();
    } catch (error) {
      setQrError('Failed to restart camera. Please close and try again.');
    }
  };

  const closeQrScanModal = () => {
    stopQrScanning();
    
    setShowQrScanModal(false);
    setQrError('');
    setQrScanResult(null);
    setIsScanning(false);
    
    cleanupCameraStream();
  };

  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const today = new Date();
    const birthDate = new Date(birthday);
    
    if (birthDate > today) return '';
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
  
    if (years > 120) return 'invalid';

    if (years === 0 && months === 0) {
      return days === 1 ? '1 day old' : `${days} days old`;
    } else if (years === 0) {
      return months === 1 ? '1 month old' : `${months} months old`;
    } else {
      return years;
    }
  };

  const validateAge = (birthday) => {
    if (!birthday) return 'Date of birth is required';
    const age = calculateAge(birthday);
    if (age === 'invalid') return 'Enter a valid date of birth';
    if (age === '') return 'Date of birth is invalid';
    return null;
  };

  const toTitleCase = (str) => str ? str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '';
  const toLowerCase = (str) => str ? str.toLowerCase() : '';
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length >= 8) return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
    if (cleaned.length >= 5) return cleaned.replace(/(\d{4})(\d{1,3})/, '$1-$2');
    return cleaned;
  };

  const cleanPhoneNumber = (value) => value.replace(/\D/g, '');
  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const getQRButtonConfig = () => {
    if (isReturningPatient()) {
      return {
        acceptedQRTypes: ['health_assessment'],
        buttonText: "Scan Health Assessment QR",
        helperText: "Have a health assessment QR code from your mobile app? Scan to auto-fill appointment details."
      };
    } else {
      return {
        acceptedQRTypes: ['mobile_registration', 'webreg_registration'],
        buttonText: "Scan Registration QR Code", 
        helperText: "Have a registration QR code from web registration? Scan to auto-fill information."
      };
    }
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

  const validatePhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) return 'Contact number is required';
    if (cleaned.length !== 11) return 'Contact number must be exactly 11 digits';
    if (!cleaned.startsWith('09')) return 'Contact number must start with 09';
    return null;
  };

  const validateEmail = (email) => {
    if (!email) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase())) return 'Please enter a valid email format';
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
    if (parts.length < 4) return 'Please follow the format: House No., Street, Barangay, City, Province';
    return null;
  };

  const validateStep = (step) => {
    if (patientType === 'returning') {
      switch (step) {
        case 4:
          return (
            patientData.patient_id &&
            patientData.name &&
            patientData.emergency_contact_name &&
            patientData.emergency_contact_relationship &&
            validatePhoneNumber(patientData.emergency_contact_no || '') === null
          );
        case 5:
          return patientData.selectedSymptoms.length > 0;
        case 6:
          const hasRoutineOnly = hasOnlyRoutineCareSymptoms(patientData.selectedSymptoms);
          if (hasRoutineOnly) return true;
          return patientData.duration && patientData.severity;
        case 7:
          return (
            patientData.selectedSymptoms.length > 0 &&
            patientData.duration &&
            patientData.severity &&
            patientData.emergency_contact_name &&
            patientData.emergency_contact_relationship &&
            validatePhoneNumber(patientData.emergency_contact_no || '') === null
          );
        default:
          return true;
      }
    } else {
      switch (step) {
        case 1:
          return (
            validateFullName(formData.fullName) === null &&
            formData.sex &&
            formData.birthday &&
            validateAddress(formData.address) === null &&
            validatePhoneNumber(formData.contactNumber) === null &&
            validateEmail(formData.email) === null &&
            !fieldErrors.contactNumber &&
            !fieldErrors.email &&
            !duplicateChecking
          );
        case 2:
          return (
            validateFullName(formData.emergencyContactName) === null &&
            validatePhoneNumber(formData.emergencyContactNumber) === null &&
            formData.emergencyRelationship &&
            formData.emergencyContactNumber !== formData.contactNumber &&
            !fieldErrors.emergencyContactNumber
          );
        case 3:
          return (
            formData.fullName &&
            formData.sex &&
            formData.birthday &&
            formData.address &&
            formData.contactNumber &&
            formData.email &&
            formData.emergencyContactName &&
            formData.emergencyContactNumber &&
            formData.emergencyRelationship &&
            termsAccepted &&
            !fieldErrors.contactNumber &&
            !fieldErrors.email &&
            !fieldErrors.emergencyContactNumber
          );
        case 4:
          return formData.selectedSymptoms.length > 0;
        case 5:
          const hasRoutineOnly = hasOnlyRoutineCareSymptoms(formData.selectedSymptoms);
          if (hasRoutineOnly) return true;
          return formData.duration && formData.severity;
        case 6:
          return (
            formData.fullName &&
            formData.selectedSymptoms.length > 0 &&
            validatePhoneNumber(formData.contactNumber) === null &&
            validatePhoneNumber(formData.emergencyContactNumber) === null &&
            validateEmail(formData.email) === null &&
            termsAccepted &&
            !fieldErrors.contactNumber &&
            !fieldErrors.email &&
            !fieldErrors.emergencyContactNumber
          );
        default:
          return true;
      }
    }
  };

  const checkDuplicateUser = async (email, contactNumber) => {
    if (!email && !contactNumber) return null;
    
    try {
      setDuplicateChecking(true);
      
      const response = await fetch('http://localhost:5000/api/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email ? email.toLowerCase() : undefined,
          contact_no: contactNumber ? cleanPhoneNumber(contactNumber) : undefined
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        return null;
      }

      return result;
      
    } catch (error) {
      return null; 
    } finally {
      setDuplicateChecking(false);
    }
  };

  const validateQRData = (qrData) => {
    const config = getQRButtonConfig();
    
    if (!config.acceptedQRTypes.includes(qrData.type)) {
      if (isReturningPatient()) {
        if (qrData.type === 'mobile_registration' || qrData.type === 'webreg_registration') {
          return {
            valid: false,
            error: 'This appears to be a registration QR code. As a returning patient, please use a health assessment QR code from your mobile app.'
          };
        } else {
          return {
            valid: false,
            error: `Invalid QR code type for returning patients. Please use a health assessment QR code.`
          };
        }
      } else {
        if (qrData.type === 'health_assessment') {
          return {
            valid: false,
            error: 'This appears to be a health assessment QR code. For new patient registration, please use a registration QR code from web registration.'
          };
        } else {
          return {
            valid: false,
            error: `Invalid QR code type for new patient registration. Please use a registration QR code.`
          };
        }
      }
    }
    
    if (qrData.type === 'health_assessment') {
      if (!qrData.tempAssessmentId || !qrData.patientId) {
        return {
          valid: false,
          error: 'Invalid health assessment QR code. Missing required data.'
        };
      }
      
      if (patientData.patient_id && qrData.patientId !== patientData.patient_id) {
        return {
          valid: false,
          error: `This health assessment QR code belongs to patient ${qrData.patientId}, but you are logged in as ${patientData.patient_id}. Please use your own QR code or log in with the correct account.`
        };
      }
      
      if (qrData.patientName && patientData.name && 
          qrData.patientName.toLowerCase() !== patientData.name.toLowerCase()) {
        return {
          valid: false,
          error: 'Patient name in QR code does not match your account. Please verify you are using the correct QR code.'
        };
      }
      
    } else if (qrData.type === 'mobile_registration' || qrData.type === 'webreg_registration') {
      if (!qrData.tempPatientId || !qrData.patientName) {
        return {
          valid: false,
          error: 'Invalid registration QR code. Missing required data.'
        };
      }
      
      if (!qrData.patientEmail || !qrData.patientPhone) {
        return {
          valid: false,
          error: 'Registration QR code is missing contact information. Please generate a new QR code.'
        };
      }
      
      if (qrData.checksum && qrData.tempPatientId && qrData.patientName && qrData.patientEmail) {
        const expectedChecksum = btoa(`${qrData.tempPatientId}${qrData.patientName}${qrData.patientEmail}`).slice(0, 8);
        if (qrData.checksum !== expectedChecksum) {
          return {
            valid: false,
            error: 'QR code data integrity check failed. Please generate a new QR code.'
          };
        }
      }
    }
    
    if (qrData.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(qrData.expiresAt);
      if (now > expiresAt) {
        return {
          valid: false,
          error: `This QR code expired on ${expiresAt.toLocaleDateString()}. Please generate a new one or register manually.`
        };
      }
    }
    
    return { valid: true };
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
      
      const duplicateErrorFields = ['contactNumber', 'email'];
      const preservedErrors = {};
      
      duplicateErrorFields.forEach(field => {
        if (fieldErrors[field] && 
            (fieldErrors[field].includes('already registered') || 
            fieldErrors[field].includes('duplicate') ||
            fieldErrors[field].includes('already exists') ||
            fieldErrors[field].includes('already in use'))) {
          preservedErrors[field] = fieldErrors[field];
        }
      });
      
      setFieldErrors(preservedErrors);
      setError('');
    }

    if (fieldErrors[name] && 
        (fieldErrors[name].includes('already registered') || 
        fieldErrors[name].includes('duplicate') ||
        fieldErrors[name].includes('already exists') ||
        fieldErrors[name].includes('already in use'))) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    const updateData = (prev) => {
      const updated = { ...prev, [name]: processedValue };
      if (name === 'birthday') {
        updated.age = calculateAge(processedValue);
      }
      return updated;
    };

    if (patientType === 'returning') {
      setPatientData(updateData);
    } else {
      setFormData(updateData);
    }

    if (name === 'email' || name === 'contactNumber') {
      debouncedDuplicateCheck(name, processedValue);
    }
  };

  const handleSymptomToggle = (symptom) => {
    const current = patientType === 'returning' ? patientData : formData;
    const isSelected = current.selectedSymptoms.includes(symptom);
    const updatedSymptoms = isSelected
      ? current.selectedSymptoms.filter(s => s !== symptom)
      : [...current.selectedSymptoms, symptom];

    if (patientType === 'returning') {
      setPatientData(prev => ({ ...prev, selectedSymptoms: updatedSymptoms }));
    } else {
      setFormData(prev => ({ ...prev, selectedSymptoms: updatedSymptoms }));
    }
    
    if (updatedSymptoms.length > 0 && fieldErrors.selectedSymptoms) {
      const newErrors = { ...fieldErrors };
      delete newErrors.selectedSymptoms;
      setFieldErrors(newErrors);
      setError('');
    }
  };

  const isReturningPatient = () => {
    return patientType === 'returning';
  };

  const shouldShowQRButton = () => {
    if (isReturningPatient()) {
      return currentStep === 5;
    } else {
      return currentStep === 1;
    }
  };

  const debouncedDuplicateCheck = async (fieldName, value) => {
    if (duplicateCheckTimer) {
      clearTimeout(duplicateCheckTimer);
    }

    const timer = setTimeout(async () => {
      if (!value || value.length < 3) return;

      let email = '';
      let contactNumber = '';
      
      if (fieldName === 'email') {
        email = value;
      } else if (fieldName === 'contactNumber') {
        contactNumber = value;
        if (cleanPhoneNumber(value).length !== 11) return;
      }

      const duplicateResult = await checkDuplicateUser(email, contactNumber);
      
      if (duplicateResult && duplicateResult.isDuplicate) {
        setFieldErrors(prev => ({
          ...prev,
          [fieldName]: duplicateResult.message
        }));
      } else if (duplicateResult && !duplicateResult.isDuplicate) {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
        
        setFieldErrors(currentErrors => {
          const remainingErrors = Object.keys(currentErrors).filter(key => key !== fieldName);
          if (remainingErrors.length === 0) {
            setError('');
          }
          return currentErrors;
        });
      }
    }, 800);
    setDuplicateCheckTimer(timer);
  };

  const nextStep = () => {
    const currentData = patientType === 'returning' ? patientData : formData;
    const stepErrors = {};

    if (currentStep === 1) {
      if (!formData.fullName.trim()) stepErrors.fullName = 'Full name is required';
      else if (validateFullName(formData.fullName)) stepErrors.fullName = validateFullName(formData.fullName);

      if (!formData.sex) stepErrors.sex = 'Select your sex';
      
      if (!formData.birthday) {
        stepErrors.birthday = 'Select your date of birth';
      } else if (validateAge(formData.birthday)) {
        stepErrors.birthday = validateAge(formData.birthday);
      }

      if (!formData.address.trim()) stepErrors.address = 'Complete address is required';
      else if (validateAddress(formData.address)) stepErrors.address = validateAddress(formData.address);

      if (!formData.contactNumber) stepErrors.contactNumber = 'Contact number is required';
      else if (validatePhoneNumber(formData.contactNumber)) stepErrors.contactNumber = validatePhoneNumber(formData.contactNumber);

      if (!formData.email) stepErrors.email = 'Email address is required';
      else if (validateEmail(formData.email)) stepErrors.email = validateEmail(formData.email);

      if (fieldErrors.contactNumber && !stepErrors.contactNumber) {
        stepErrors.contactNumber = fieldErrors.contactNumber;
      }
      if (fieldErrors.email && !stepErrors.email) {
        stepErrors.email = fieldErrors.email;
      }

      if (duplicateChecking) {
        setError('Please wait while we verify your contact details...');
        return;
      }
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

    if (currentStep === 3 && !termsAccepted) {
      stepErrors.termsAccepted = 'Please accept the terms and conditions';
    }

    if ((patientType === 'new' && currentStep === 4) || (patientType === 'returning' && currentStep === 5)) {
      if (currentData.selectedSymptoms.length === 0) {
        stepErrors.selectedSymptoms = 'Please select at least one symptom';
      }
    }

    if ((patientType === 'new' && currentStep === 5) || (patientType === 'returning' && currentStep === 6)) {
      const currentData = patientType === 'returning' ? patientData : formData;
      const hasRoutineOnly = hasOnlyRoutineCareSymptoms(currentData.selectedSymptoms);
      
      if (!hasRoutineOnly) {
        if (!currentData.duration) {
          stepErrors.duration = 'Select how long you have experienced these symptoms';
        }
        if (!currentData.severity) {
          stepErrors.severity = 'Select the severity level';
        }
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
      if (stepErrors.contactNumber || stepErrors.email) {
        setError('Please use different contact details that are not already registered.');
      } else {
        setError('Please complete all required fields before continuing.');
      }
      
      setTimeout(() => {
        const symptomsStep = patientType === 'new' ? 4 : 5;
        if (currentStep === symptomsStep && stepErrors.selectedSymptoms) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const firstErrorField = document.querySelector(`[name="${Object.keys(stepErrors)[0]}"]`);
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
          }
        }
      }, 100);
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
      'Chest Pain': 'Cardiology',
      'Chest Discomfort': 'Cardiology', 
      'Heart Palpitations': 'Cardiology',
      'High Blood Pressure': 'Cardiology',
      'Shortness of Breath': 'Cardiology',
      'Stomach Ache': currentData.age < 18 ? 'Pediatrics' : 'Internal Medicine',
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

    for (const symptom of currentData.selectedSymptoms) {
      if (departmentMapping[symptom]) {
        return departmentMapping[symptom];
      }
    }
    
    return 'Internal Medicine';
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result;
      
      if (patientType === 'returning') {
        result = await bookAppointmentForReturningPatient(patientData);
      } else {
        const calculatedAge = formData.age || calculateAge(formData.birthday);
        result = await registerNewPatient({
          ...formData,
          age: calculatedAge
        });
      }

      const patientId = result.patient?.patient_id || result.visit?.patient_id || 'UNKNOWN';
      const recommendedDepartment = generateDepartmentRecommendation();

      showToastNotification('Registration completed successfully!', 'success');

      const registrationResult = {
        patientId: patientId,
        recommendedDepartment: recommendedDepartment,
        type: patientType === 'returning' ? 'appointment' : 'registration',
        message: patientType === 'returning' ? 
          'Appointment booked successfully!' : 
          'Registration completed successfully!',
        estimated_wait: result.estimated_wait || '15-30 minutes',
        queue_number: result.queue_number || Math.floor(Math.random() * 50) + 1
      };

      setRegistrationResult(registrationResult);
      
      setTimeout(() => {
        setShowSuccessModal(true);
        
        setTimeout(() => {
          handleAutomaticPrint(registrationResult);
        }, 1500);
        
      }, 1000);

    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    
    ['patientType', 'patientInfo', 'patientToken', 'patientId', 'patientName'].forEach(key =>
      localStorage.removeItem(key)
    );

    setTimeout(() => {
      window.location.href = '/kiosk-login';
    }, 500);
  };

  const handleAutomaticPrint = (registrationResult) => {
    try {
      if (!PrintingService.isPrintingSupported()) {
        console.warn('Printing not supported in this environment');
        return;
      }

      const currentData = patientType === 'returning' ? patientData : formData;
      
      // Generate and auto-print the guidance packet
      const printWindow = PrintingService.generatePatientGuidancePacket(
        registrationResult, 
        patientType === 'returning' ? patientData : null,
        patientType === 'new' ? formData : null
      );
      
      showToastNotification('Printing patient guidance packet...', 'info');
      
    } catch (error) {
      PrintingService.handlePrintError(error);
      showToastNotification('Printing failed. Please ask staff for assistance.', 'error');
    }
  };

  const handleReceiptPrint = (registrationResult) => {
    try {
      const currentData = patientType === 'returning' ? patientData : formData;
      PrintingService.printThermalReceipt(
        registrationResult,
        patientType === 'returning' ? patientData : null,
        patientType === 'new' ? formData : null
      );
    } catch (error) {
      PrintingService.handlePrintError(error);
    }
  };

  const showToastNotification = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const showAlert = (title, message, type = 'info') => {
    setAlertModalContent({ title, message, type });
    setShowAlertModal(true);

    setTimeout(() => {
      setShowAlertModal(false);
    }, 3000);
  };

  const renderProgressBar = () => {
    const totalSteps = patientType === 'returning' ? 4 : 6;
    const stepNames = patientType === 'returning'
      ? ['Personal', 'Symptoms', 'Details', 'Summary']
      : ['Personal', 'Emergency', 'Review', 'Symptoms', 'Details', 'Summary'];
    const adjustedStep = patientType === 'returning' ? Math.max(1, currentStep - 3) : currentStep;
    const stepIcons = patientType === 'returning' ? ['1', '2', '3', '4'] : ['1', '2', '3', '4', '5', '6'];

    return (
      <div className="kioskreg-progress-container">
        <div className="kioskreg-progress-steps">
          {stepNames.map((name, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === adjustedStep;
            const isCompleted = stepNumber < adjustedStep;
            const isLast = index === stepNames.length - 1;

            return (
              <div key={index} className="kioskreg-progress-step-item">
                <div className={`kioskreg-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="kioskreg-step-number">
                    {isCompleted ? <Check size={12} /> : stepIcons[index]}
                  </div>
                  <div className="kioskreg-step-label">{name}</div>
                </div>
                {!isLast && (
                  <div className={`kioskreg-step-connector ${isCompleted ? 'completed' : ''} ${stepNumber === adjustedStep ? 'active' : ''}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPatientInfoStep = () => (
    <div className="kioskreg-card kioskreg-step-transition">
      <div className="kioskreg-step-header">
        <div className="kioskreg-step-icon"><User size={24} /></div>
        <h3>Patient Information</h3>
        <p>Your Registered Information</p>
      </div>

      <div className="kioskreg-info-banner">
        <div className="kioskreg-info-icon"><CheckCircle size={20} /></div>
        <div className="kioskreg-info-content">
          <h4>Welcome back, {patientData.name}!</h4>
          <p>Your information is displayed below for verification</p>
        </div>
      </div>

      <div className="kioskreg-readonly-sections">
        <div className="kioskreg-readonly-section">
          <h4><User size={16} />Personal Information</h4>
          <div className="kioskreg-form-grid two-column">
            <div className="kioskreg-readonly-item">
              <label>Patient ID:</label>
              <div className="kioskreg-readonly-value">{patientData.patient_id}</div>
            </div>
            <div className="kioskreg-readonly-item">
              <label>Registration Date:</label>
              <div className="kioskreg-readonly-value">
                {patientData.registration_date ? new Date(patientData.registration_date).toLocaleDateString() : 'Not available'}
              </div>
            </div>
            <div className="kioskreg-readonly-item">
              <label>Full Name:</label>
              <div className="kioskreg-readonly-value">{patientData.name}</div>
            </div>
            <div className="kioskreg-readonly-item">
              <label>Sex:</label>
              <div className="kioskreg-readonly-value">{patientData.sex}</div>
            </div>
            <div className="kioskreg-readonly-item">
              <label>Date of Birth:</label>
              <div className="kioskreg-readonly-value">
                {patientData.birthday ? new Date(patientData.birthday).toLocaleDateString() : 'Not available'}
              </div>
            </div>
            <div className="kioskreg-readonly-item">
              <label>Age:</label>
              <div className="kioskreg-readonly-value">{patientData.age} years old</div>
            </div>
            <div className="kioskreg-readonly-item full-width">
              <label>Address:</label>
              <div className="kioskreg-readonly-value">{patientData.address}</div>
            </div>
          </div>
        </div>

        <div className="kioskreg-readonly-section">
          <h4><Phone size={16} />Contact Information</h4>
          <div className="kioskreg-form-grid two-column">
            <div className="kioskreg-readonly-item">
              <label>Contact Number:</label>
              <div className="kioskreg-readonly-value">{patientData.contact_no}</div>
            </div>
            <div className="kioskreg-readonly-item">
              <label>Email Address:</label>
              <div className="kioskreg-readonly-value">{patientData.email}</div>
            </div>
          </div>
        </div>

        <div className="kioskreg-readonly-section">
          <h4><Bell size={16} />Emergency Contact</h4>
          <div className="kioskreg-form-grid two-column">
            <div className="kioskreg-readonly-item">
              <label>Contact Name:</label>
              <div className="kioskreg-readonly-value">
                {patientData.emergency_contact_name || 'Not provided'}
              </div>
            </div>
            <div className="kioskreg-readonly-item">
              <label>Relationship:</label>
              <div className="kioskreg-readonly-value">
                {patientData.emergency_contact_relationship || 'Not provided'}
              </div>
            </div>
            <div className="kioskreg-readonly-item">
              <label>Contact Number:</label>
              <div className="kioskreg-readonly-value">
                {patientData.emergency_contact_no || 'Not provided'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {(!patientData.emergency_contact_name || !patientData.emergency_contact_relationship || !patientData.emergency_contact_no) && (
        <div className="kioskreg-warning-note">
          <div className="kioskreg-warning-icon"><AlertTriangle size={18} /></div>
          <div className="kioskreg-warning-content">
            <strong>Emergency Contact Required</strong>
            <p>Your emergency contact information is incomplete. Please visit the reception desk to update this information before continuing.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderPersonalDetailsStep = () => (
    <div className="kioskreg-card kioskreg-step-transition">
      <div className="kioskreg-step-header">
        <div className="kioskreg-step-icon"><User size={24} /></div>
        <h3>Personal Information</h3>
        <p>Please provide your basic information</p>
      </div>

      {renderQRCodeButton()}

      <div className="kioskreg-input-group">
        <label>Scan ID</label>
        <div className="kioskreg-scan-helper">Optional: a shortcut to speed up typing your full name</div>
        <div className="kioskreg-id-scan">
          <img src={sampleID} alt="Sample ID" className="sampleID" />
          <button
            onClick={handleIDScanClick}
            disabled={ocrProcessing || !isCameraAvailable()}
            className="kioskreg-id-scan-btn"
          >
            {!isCameraAvailable() ? 'Camera Not Available (HTTPS Required)' :
              ocrProcessing ? (<><span className="kioskreg-loading-spinner"></span>Scanning ID...</>) : 
              (<><Camera size={16} />Scan ID</>)}
          </button>
        </div>
      </div>

      <div className="kioskreg-form-grid two-column">
        <div className="kioskreg-input-group">
          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter your complete name"
            className={`kioskreg-form-input ${fieldErrors.fullName ? 'invalid' : ''}`}
            required
            autoComplete="off"
          />
          <small className="input-reminder">First Name, Middle Name, Last Name</small>
          {showValidation && fieldErrors.fullName && (
            <small className="error-text">{fieldErrors.fullName}</small>
          )}
        </div>

        <div className="kioskreg-input-group">
          <label>Sex</label>
          <select
            name="sex"
            value={formData.sex}
            onChange={handleInputChange}
            className={`kioskreg-form-input ${showValidation && fieldErrors.sex ? 'invalid' : ''}`}
            required
            autoComplete="off"
          >
            <option value="" disabled hidden>Select sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {showValidation && fieldErrors.sex && (
            <small className="error-text">{fieldErrors.sex}</small>
          )}
        </div>
        <div className="kioskreg-input-group">
          <label>Date of Birth</label>
          <input
            type="date"
            name="birthday"
            value={formData.birthday}
            onChange={handleInputChange}
            className={`kioskreg-form-input ${showValidation && fieldErrors.birthday ? 'invalid' : ''}`}
            max={new Date().toISOString().split('T')[0]}
            required
            autoComplete="off"
          />
          {showValidation && fieldErrors.birthday && (
            <small className="error-text">{fieldErrors.birthday}</small>
          )}
        </div>

        <div className="kioskreg-input-group">
          <label>Age</label>
          <input
            type="text"
            value={formData.age ? (typeof formData.age === 'string' && formData.age.includes('old') ? formData.age : `${formData.age} years old`) : ''}
            className="kioskreg-form-input"
            disabled
            placeholder="Auto-fill"
          />
        </div>

        <div className="kioskreg-input-group full-width">
          <label>Complete Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="House No., Street, Barangay, City, Province"
            className={`kioskreg-form-input ${fieldErrors.address ? 'invalid' : ''}`}
            required
            autoComplete="off"
          />
          {fieldErrors.address && (
            <small className="error-text">{fieldErrors.address}</small>
          )}
        </div>

        <div className="kioskreg-input-group">
          <label>Contact Number</label>
          <div className="input-with-indicator">
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleInputChange}
              placeholder="09XX-XXX-XXXX"
              className={`kioskreg-form-input ${fieldErrors.contactNumber ? 'invalid' : ''}`}
              required
              autoComplete="off"
            />
          </div>
          {fieldErrors.contactNumber && (
            <small className="error-text">{fieldErrors.contactNumber}</small>
          )}
        </div>

        <div className="kioskreg-input-group">
          <label>Email Address</label>
          <div className="input-with-indicator">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
              className={`kioskreg-form-input ${fieldErrors.email ? 'invalid' : ''}`}
              required
              autoComplete="off"
            />
          </div>
          {fieldErrors.email && (
            <small className="error-text">{fieldErrors.email}</small>
          )}
        </div>
      </div>
    </div>
  );

  const renderEmergencyContactStep = () => (
    <div className="kioskreg-card kioskreg-step-transition">
      <div className="kioskreg-step-header">
        <div className="kioskreg-step-icon"><Bell size={24} /></div>
        <h3>Emergency Contact</h3>
        <p>Provide emergency contact information</p>
      </div>

      <div className="kioskreg-emergency-banner">
        <div className="kioskreg-banner-icon"><Bell size={20} /></div>
        <div className="kioskreg-banner-content">
          <h4>Important Information</h4>
          <p>This person will be contacted in case of medical emergency</p>
        </div>
      </div>

      <div className="kioskreg-form-grid">
        <div className="kioskreg-input-group">
          <label>Emergency Contact Name</label>
          <input
            type="text"
            name="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={handleInputChange}
            placeholder="Full name of emergency contact"
            className={`kioskreg-form-input ${fieldErrors.emergencyContactName ? 'invalid' : ''}`}
            required
            autoComplete="off"
          />
          {fieldErrors.emergencyContactName && (
            <small className="error-text">{fieldErrors.emergencyContactName}</small>
          )}
        </div>

        <div className="kioskreg-input-group">
          <label>Contact Number</label>
          <input
            type="tel"
            name="emergencyContactNumber"
            value={formData.emergencyContactNumber}
            onChange={handleInputChange}
            placeholder="09XX-XXX-XXXX"
            className={`kioskreg-form-input ${fieldErrors.emergencyContactNumber ? 'invalid' : ''}`}
            required
            autoComplete="off"
          />
          {fieldErrors.emergencyContactNumber && (
            <small className="error-text">{fieldErrors.emergencyContactNumber}</small>
          )}
          {formData.emergencyContactNumber === formData.contactNumber && (
            <small className="error-text">Emergency contact number cannot be the same as patient's number</small>
          )}
        </div>

        <div className="kioskreg-input-group">
          <label>Relationship</label>
          <select
            name="emergencyRelationship"
            value={formData.emergencyRelationship}
            onChange={handleInputChange}
            className={`kioskreg-form-input ${showValidation && fieldErrors.emergencyRelationship ? 'invalid' : ''}`}
            required
            autoComplete="off"
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
    <div className="kioskreg-card kioskreg-step-transition">
      <div className="kioskreg-step-header">
        <div className="kioskreg-step-icon"><Clipboard size={24} /></div>
        <h3>Review & Confirm</h3>
        <p>Please verify all information is correct</p>
      </div>

      <div className="kioskreg-review-sections">
        <div className="kioskreg-review-section">
          <h4><User size={16} />Personal Information</h4>
          <div className="kioskreg-form-grid two-column">
            <div className="kioskreg-review-item">
              <label>Full Name:</label>
              <span>{formData.fullName}</span>
            </div>
            <div className="kioskreg-review-item">
              <label>Age & Sex:</label>
              <span>{formData.age} years old, {formData.sex}</span>
            </div>
            <div className="kioskreg-review-item full-width">
              <label>Address:</label>
              <span>{formData.address}</span>
            </div>
            <div className="kioskreg-review-item">
              <label>Contact Number:</label>
              <span>{formData.contactNumber}</span>
            </div>
            <div className="kioskreg-review-item">
              <label>Email:</label>
              <span>{formData.email}</span>
            </div>
          </div>
        </div>

        <div className="kioskreg-review-section">
          <h4><Bell size={16} />Emergency Contact</h4>
          <div className="kioskreg-form-grid two-column">
            <div className="kioskreg-review-item">
              <label>Name:</label>
              <span>{formData.emergencyContactName}</span>
            </div>
            <div className="kioskreg-review-item">
              <label>Number:</label>
              <span>{formData.emergencyContactNumber}</span>
            </div>
            <div className="kioskreg-review-item">
              <label>Relationship:</label>
              <span>{formData.emergencyRelationship}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="kioskreg-terms">
        <label className={`kioskreg-checkbox-label ${showValidation && !termsAccepted ? 'invalid' : ''}`}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked) {
                const newErrors = { ...fieldErrors };
                delete newErrors.termsAccepted;
                setFieldErrors(newErrors);
              }
            }}
            className={showValidation && !termsAccepted ? 'invalid' : ''}
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
      <div className="kioskreg-card kioskreg-step-transition">
        <div className="kioskreg-step-header">
          <div className="kioskreg-step-icon"><Stethoscope size={24} /></div>
          <h3>Health Assessment</h3>
          <p>What brings you to the clinic today?</p>
        </div>

        {renderQRCodeButton()}

        <div className="kioskreg-symptoms-info">
          <div className={`kioskreg-info-banner ${showValidation && fieldErrors.selectedSymptoms ? 'has-error' : ''}`}>
            <div className="kioskreg-info-icon"><Stethoscope size={20} /></div>
            <div className="kioskreg-info-content">
              <h4>Select Your Symptoms</h4>
              <p>Choose all symptoms or health concerns you're experiencing</p>
            </div>
          </div>
        </div>

        {symptomsLoading ? (
          <div className="kioskreg-loading">
            <span className="kioskreg-loading-spinner"></span>
            Loading symptoms...
          </div>
        ) : outpatientSymptoms.length === 0 ? (
          <div className="kioskreg-error">
            No symptoms available. Please refresh the page or contact support.
          </div>
        ) : (
          <div className="kioskreg-symptoms-categories">
            {outpatientSymptoms.map(category => (
              <div key={category.category} className="kioskreg-symptom-category">
                <div className="kioskreg-category-title">{category.category}</div>
                <div className="kioskreg-symptom-grid">
                  {category.symptoms.map((symptom, index) => (
                    <button
                      key={`${category.category}-${symptom}-${index}`}
                      onClick={() => handleSymptomToggle(symptom)}
                      className={`kioskreg-symptom-btn ${currentData.selectedSymptoms.includes(symptom) ? 'selected' : ''}`}
                    >
                      <span className="symptom-text">{symptom}</span>
                      {currentData.selectedSymptoms.includes(symptom) && <span className="check-icon">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {currentData.selectedSymptoms.length > 0 && (
          <div className="kioskreg-selected-symptoms">
            <h4>Selected Symptoms ({currentData.selectedSymptoms.length})</h4>
            <div className="kioskreg-selected-list">
              {currentData.selectedSymptoms.map(symptom => (
                <div
                  key={symptom}
                  className="kioskreg-selected-symptom"
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
    const hasRoutineOnly = hasOnlyRoutineCareSymptoms(currentData.selectedSymptoms);

    return (
      <div className="kioskreg-card kioskreg-step-transition">
        <div className="kioskreg-step-header">
          <div className="kioskreg-step-icon"><List size={24} /></div>
          <h3>Additional Details</h3>
          <p>
            {hasRoutineOnly 
              ? "Additional information for your appointment"
              : "Help us understand your condition better"
            }
          </p>
        </div>

        {hasRoutineOnly && (
          <div className="kioskreg-info-banner">
            <div className="kioskreg-info-icon"><CheckCircle size={20} /></div>
            <div className="kioskreg-info-content">
              <h4>Routine Care Appointment</h4>
              <p>Duration and severity are not required for routine care services. You may skip to scheduling if desired.</p>
            </div>
          </div>
        )}

        <div className="kioskreg-form-grid two-column">
          {!hasRoutineOnly && (
            <>
              <div className="kioskreg-input-group full-width">
                <label>How long have you experienced these symptoms?</label>
                <select
                  name="duration"
                  value={currentData.duration}
                  onChange={handleInputChange}
                  className={`kioskreg-form-input ${fieldErrors.duration ? 'invalid' : ''}`}
                  required
                  autoComplete="off"
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

              <div className="kioskreg-input-group full-width">
                <label>Severity Level</label>
                <select
                  name="severity"
                  value={currentData.severity}
                  onChange={handleInputChange}
                  className={`kioskreg-form-input ${fieldErrors.severity ? 'invalid' : ''}`}
                  required
                  autoComplete="off"
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

          <div className="kioskreg-input-group full-width">
            <label>Previous Treatment</label>
            <textarea
              name="previousTreatment"
              value={currentData.previousTreatment}
              onChange={handleInputChange}
              placeholder={hasRoutineOnly 
                ? "Any previous screenings, vaccinations, or relevant medical history"
                : "Any previous treatments or medications tried for this condition"
              }
              className="kioskreg-form-input kioskreg-form-textarea"
              rows="2"
              autoComplete="off"
            />
          </div>

          <div className="kioskreg-input-group full-width">
            <label>Known Allergies</label>
            <input
              type="text"
              name="allergies"
              value={currentData.allergies}
              onChange={handleInputChange}
              placeholder="List any known allergies to medications or substances"
              className="kioskreg-form-input"
              autoComplete="off"
            />
          </div>

          <div className="kioskreg-input-group full-width">
            <label>Current Medications</label>
            <input
              type="text"
              name="medications"
              value={currentData.medications}
              onChange={handleInputChange}
              placeholder="List any medications you're currently taking"
              className="kioskreg-form-input"
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryStep = () => {
    const currentData = patientType === 'returning' ? patientData : formData;

    return (
      <div className="kioskreg-card kioskreg-step-transition">
        <div className="kioskreg-step-header">
          <div className="kioskreg-step-icon"><Clipboard size={24} /></div>
          <h3>Registration Summary</h3>
          <p>Review all information before completing registration</p>
        </div>

        <div className="kioskreg-summary-sections">
          <div className="kioskreg-summary-section">
            <h4><User size={16} />Patient Information</h4>
            <div className="kioskreg-form-grid two-column">
              {patientType === 'returning' ? (
                <>
                  <div className="kioskreg-summary-item">
                    <label>Patient ID:</label>
                    <span>{patientData.patient_id}</span>
                  </div>
                  <div className="kioskreg-summary-item">
                    <label>Full Name:</label>
                    <span>{patientData.name}</span>
                  </div>
                  <div className="kioskreg-summary-item">
                    <label>Age:</label>
                    <span>{patientData.age}</span>
                  </div>
                  <div className="kioskreg-summary-item">
                    <label>Sex:</label>
                    <span>{patientData.sex}</span>
                  </div>
                  <div className="kioskreg-summary-item">
                    <label>Contact:</label>
                    <span>{patientData.contact_no}</span>
                  </div>
                  <div className="kioskreg-summary-item">
                    <label>Email:</label>
                    <span>{patientData.email}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="kioskreg-summary-item">
                    <label>Full Name:</label>
                    <span>{formData.fullName}</span>
                  </div>
                  <div className="kioskreg-summary-item">
                    <label>Age & Sex:</label>
                    <span>{formData.age} years old, {formData.sex}</span>
                  </div>
                  <div className="kioskreg-summary-item">
                    <label>Contact Number:</label>
                    <span>{formData.contactNumber}</span>
                  </div>
                  <div className="kioskreg-summary-item">
                    <label>Email:</label>
                    <span>{formData.email}</span>
                  </div>
                  <div className="kioskreg-summary-item full-width">
                    <label>Address:</label>
                    <span>{formData.address}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="kioskreg-summary-section">
            <h4><Stethoscope size={16} />Health Information</h4>
            <div className="kioskreg-form-grid two-column">
              <div className="kioskreg-summary-item full-width">
                <label>Symptoms ({currentData.selectedSymptoms.length}):</label>
                <span>{currentData.selectedSymptoms.join(', ')}</span>
              </div>
              <div className="kioskreg-summary-item">
                <label>Duration:</label>
                <span>{currentData.duration}</span>
              </div>
              <div className="kioskreg-summary-item">
                <label>Severity:</label>
                <span>{currentData.severity}</span>
              </div>
              {currentData.allergies && (
                <div className="kioskreg-summary-item full-width">
                  <label>Allergies:</label>
                  <span>{currentData.allergies}</span>
                </div>
              )}
              {currentData.medications && (
                <div className="kioskreg-summary-item full-width">
                  <label>Current Medications:</label>
                  <span>{currentData.medications}</span>
                </div>
              )}
            </div>
          </div>

          {patientType === 'new' && (
            <div className="kioskreg-summary-section">
              <h4><Bell size={16} />Emergency Contact</h4>
              <div className="kioskreg-form-grid two-column">
                <div className="kioskreg-summary-item">
                  <label>Name:</label>
                  <span>{formData.emergencyContactName}</span>
                </div>
                <div className="kioskreg-summary-item">
                  <label>Number:</label>
                  <span>{formData.emergencyContactNumber}</span>
                </div>
                <div className="kioskreg-summary-item">
                  <label>Relationship:</label>
                  <span>{formData.emergencyRelationship}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (patientType === 'returning') {
      switch (currentStep) {
        case 4: return renderPatientInfoStep();
        case 5: return renderSymptomsStep();
        case 6: return renderDetailsStep();
        case 7: return renderSummaryStep();
        default: return renderPatientInfoStep();
      }
    }

    switch (currentStep) {
      case 1: return renderPersonalDetailsStep();
      case 2: return renderEmergencyContactStep();
      case 3: return renderReviewStep();
      case 4: return renderSymptomsStep();
      case 5: return renderDetailsStep();
      case 6: return renderSummaryStep();
      default: return renderPersonalDetailsStep();
    }
  };

  const renderBackButton = () => {
    if (patientType === 'returning' && currentStep === 4) {
      return (
        <button
          type="button"
          onClick={() => setShowLogoutConfirmModal(true)}
          className="kioskreg-nav-btn secondary"
        >
          <LogOut size={16} />Logout
        </button>
      );
    }

    if ((patientType === 'new' && currentStep === 1) || (patientType === 'returning' && currentStep === 4)) {
      return (
        <button
          type="button"
          onClick={() => window.location.href = '/kiosk-login'}
          className="kioskreg-nav-btn home"
        >
          <ChevronLeft size={16} />Back to Home
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={prevStep}
        className="kioskreg-nav-btn secondary"
      >
        <ChevronLeft size={16} />Back
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
          disabled={loading}
          className="kioskreg-nav-btn submit"
        >
          Submit
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={nextStep}
        className="kioskreg-nav-btn primary"
      >
        Continue<ChevronRight size={16} />
      </button>
    );
  };

  const renderCameraModal = () => {
    if (!showCameraModal) return null;

    return (
      <div className="kiosk-popup-overlay">
        <div className="kiosk-popup kiosk-camera-modal">
          <div className="kiosk-popup-header">
            <h3>Scan Philippine ID</h3>
            <button onClick={closeCameraModal} className="kiosk-popup-close">
              <X size={20} />
            </button>
          </div>
          <div className="kiosk-popup-content">
            {cameraError ? (
              <div className="kiosk-camera-error">
                <div className="kiosk-error-icon">
                  <AlertTriangle size={48} />
                </div>
                <p>{cameraError}</p>
                <div className="kiosk-error-actions">
                  {cameraError.includes('HTTPS') ? (
                    <button onClick={() => closeCameraModal(true)} className="kiosk-retry-btn">
                      Enter Manually
                    </button>
                  ) : (
                    <>
                      <button onClick={retryIDCamera} className="kiosk-retry-btn">
                        <RotateCcw size={16} /> Try Again
                      </button>
                      <button onClick={() => closeCameraModal(true)} className="kiosk-cancel-btn">
                        Enter Manually
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="kiosk-camera-container">
                  <video 
                    id="camera-feed" 
                    autoPlay
                    playsInline
                    muted
                    className="kiosk-camera-feed"
                  />
                  <div className="kiosk-camera-overlay">
                    <div className="kiosk-id-frame">
                      <div className="kiosk-corner tl"></div>
                      <div className="kiosk-corner tr"></div>
                      <div className="kiosk-corner bl"></div>
                      <div className="kiosk-corner br"></div>
                    </div>
                  </div>
                </div>
                <p className="kiosk-camera-instruction">
                  <Camera size={16} />Position your ID within the frame above
                </p>
                <div className="kiosk-error-actions">
                  <button
                    onClick={handleCaptureID}
                    disabled={ocrProcessing || !cameraStream}
                    className="kiosk-capture-btn"
                  >
                    Capture ID
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderQRCodeButton = () => {
    if (!shouldShowQRButton()) return null;

    const buttonText = isReturningPatient() 
      ? "Scan QR Code" 
      : "Scan QR Code";
      
    const helperText = isReturningPatient()
      ? "Have a registration QR code? Scan to auto-fill appointment details."
      : "Have a registration QR code? Scan to auto-fill information.";

    return (
      <div className="kioskreg-qr-section">
        <div className="kioskreg-qr-content">
          <h4>Quick Registration Available</h4>
          <p>{helperText}</p>
        </div>
        
        <button
          onClick={handleQrScan}
          className="kioskreg-qr-scan-btn"
          disabled={!isCameraAvailable()}
        >
          <QrCode size={16} />
          {!isCameraAvailable() ? 'Camera Unavailable' : buttonText}
        </button>
      </div>
    );
  };

  const renderQrScanModal = () => {
    if (!showQrScanModal) return null;

    return (
      <div className="kiosk-popup-overlay">
        <div className="kiosk-popup kiosk-camera-modal">
          <div className="kiosk-popup-header">
            <h3>
              {isReturningPatient() ? 'Scan Health Assessment QR' : 'Scan Registration QR Code'}
            </h3>
            <button onClick={closeQrScanModal} className="kiosk-popup-close">
              <X size={20} />
            </button>
          </div>
          <div className="kiosk-popup-content">
            {cameraError ? (
              <div className="kiosk-camera-error">
                <div className="kiosk-error-icon">
                  <AlertTriangle size={48} />
                </div>
                <div className="kiosk-error-content">
                  <p>{cameraError}</p>
                </div>
                <div className="kiosk-error-actions">
                  <button onClick={retryQRCamera} className="kiosk-retry-btn">
                    <RotateCcw size={16} /> Try Again
                  </button>
                  <button onClick={closeQrScanModal} className="kiosk-cancel-btn">
                    <X size={16} /> Cancel
                  </button>
                </div>
              </div>
            ) : qrError ? (
              <div className="kiosk-qr-error">
                <div className="kiosk-error-icon">
                  <QrCode size={48} />
                </div>
                <div className="kiosk-error-content">
                  <p>{qrError}</p>
                  <div className="kiosk-qr-help">
                  </div>
                </div>
                <div className="kiosk-error-actions">
                  <button onClick={() => {
                    setQrError('');
                    setQrScanResult(null);
                    if (cameraStream) {
                      const video = document.getElementById('qr-camera-feed');
                      if (video && video.videoWidth > 0) {
                        startQrScanningWithStream(cameraStream, video);
                      } else {
                        retryQRCamera();
                      }
                    } else {
                      retryQRCamera();
                    }
                  }} className="kiosk-retry-btn">
                    <RotateCcw size={16} /> Scan Different QR
                  </button>
                  <button onClick={closeQrScanModal} className="kiosk-cancel-btn">
                    <X size={16} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="kiosk-camera-container">
                  <video id="qr-camera-feed" autoPlay playsInline muted className="kiosk-camera-feed" />
                  <div className="kiosk-camera-overlay">
                    {isScanning && (
                      <div className="kiosk-scanning-indicator">
                        <div className="kiosk-scan-line"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="kiosk-camera-status">
                  <p className="kiosk-camera-instruction">
                    <QrCode size={16} />
                    {isScanning ? 'Scanning for QR code...' : 
                    cameraStream ? 'Camera ready - place QR code in frame' : 'Preparing camera...'}
                  </p>
                </div>
                <div className="kiosk-manual-actions">
                  {!isScanning && cameraStream && (
                    <button onClick={() => {
                      const video = document.getElementById('qr-camera-feed');
                      if (video && video.videoWidth > 0) {
                        startQrScanningWithStream(cameraStream, video);
                      } else {
                        setQrError('Camera not ready. Please wait a moment and try again.');
                      }
                    }} className="kiosk-retry-btn">
                      <Activity size={16} /> Start Scanning
                    </button>
                  )}
                  <button onClick={closeQrScanModal} className="kiosk-cancel-btn">
                    <X size={16} /> Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessModal = () => {
    if (!showSuccessModal || !registrationResult) return null;

    return (
      <div className="kiosk-popup-overlay">
        <div className="kiosk-popup kiosk-success-modal">
          <div className="kiosk-popup-header">
          </div>
          <div className="kiosk-popup-content">
            <div className="kiosk-success-content">
              <div className="kiosk-success-icon">
                <CheckCircle size={48} />
              </div>
              <div className="kiosk-success-message">
                <h4>{registrationResult.message}</h4>
                <div className="kiosk-success-details">
                  <div className="kiosk-success-item">
                    <label>Your Patient ID:</label>
                    <span className="kioskreg-id">{registrationResult.patientId}</span>
                  </div>
                  <div className="kiosk-success-item">
                    <label>Recommended Department:</label>
                    <span className="kiosk-department">{registrationResult.recommendedDepartment}</span>
                  </div>
                  <div className="kiosk-success-item">
                    <label>Queue Number:</label>
                    <span className="kiosk-queue">{registrationResult.queue_number}</span>
                  </div>
                </div>
              </div>
              
              {/* Add printing options */}
              <div className="kiosk-print-options">
                <div className="kiosk-print-status">
                  <Printer size={16} />
                  <span>Your guidance packet is being prepared for printing...</span>
                </div>
                
                <div className="kiosk-print-buttons">
                  <button
                    onClick={() => handleAutomaticPrint(registrationResult)}
                    className="kiosk-print-btn"
                  >
                    <Printer size={16} /> Print Guidance Packet
                  </button>
                  
                  <button
                    onClick={() => handleReceiptPrint(registrationResult)}
                    className="kiosk-receipt-btn"
                  >
                    <Receipt size={16} /> Print Receipt Only
                  </button>
                </div>
              </div>
              
              <div className="kiosk-error-actions">
                <button
                  onClick={handleSuccessModalClose}
                  className="kiosk-success-btn"
                >
                  Continue to Homepage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderToast = () => {
    if (!showToast) return null;

    return (
      <div className={`kiosk-toast kiosk-toast-${toastType}`}>
        <div className="kiosk-toast-content">
          <div className="kiosk-toast-icon">
            {toastType === 'success' && <CheckCircle size={18} />}
            {toastType === 'error' && <AlertTriangle size={18} />}
            {toastType === 'info' && <Info size={18} />}
          </div>
          <div className="kiosk-toast-message">{toastMessage}</div>
          <button 
            onClick={() => setShowToast(false)} 
            className="kiosk-toast-close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="kioskreg-registration-portal">
      <div className="kioskreg-header">
        <img src={clicareLogo} alt="CliCare Logo" className="kioskreg-logo"/>
        <div className="kioskreg-hospital-info">
          <p><strong>{formatTime(currentTime)}</strong></p>
          <p>{formatDate(currentTime)}</p>
        </div>
      </div>
      
      {renderProgressBar()}

      <div className="kioskreg-content">
        {renderCurrentStep()}
      </div>

      <div className="kioskreg-nav-container">
        <div className="kioskreg-nav-buttons">
          {renderBackButton()}
          {renderNextButton()}
        </div>
      </div>

      <div className="kioskreg-help-footer">
        <div className="kioskreg-help-section">
          <h4>Need Help?</h4>
          <p>Press the help button or ask hospital staff for assistance</p>
        </div>
      </div>

      {showLogoutConfirmModal && (
        <div className="kiosk-popup-overlay">
          <div className="kiosk-popup">
            <div className="kiosk-popup-header">
              <h3>Confirm Logout</h3>
              <button 
                className="kiosk-popup-close" 
                onClick={() => setShowLogoutConfirmModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="kiosk-popup-content">
              <p style={{ color: 'var(--kioskreg-text-light)', fontSize: '0.8em', lineHeight: '1.5', marginBottom: '15px', fontWeight: 400 }}>
                Are you sure you want to logout? You will need to login again to continue your registration.
              </p>
            </div>
            <div className="kiosk-modal-actions">
              <button 
                className="kiosk-modal-btn secondary" 
                onClick={() => setShowLogoutConfirmModal(false)}
              >
                Cancel
              </button>
              <button 
                className="kiosk-modal-btn logout" 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/kiosk-login';
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlertModal && (
        <div className="kiosk-popup-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="kiosk-popup kiosk-alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kiosk-alert-content">
              <div className={`kiosk-alert-icon ${alertModalContent.type}`}>
                {alertModalContent.type === 'success' && <CheckCircle size={24} />}
                {alertModalContent.type === 'error' && <AlertTriangle size={24} />}
                {alertModalContent.type === 'info' && <Info size={24} />}
              </div>
              <h3>{alertModalContent.title}</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{alertModalContent.message}</p>
            </div>
          </div>
        </div>
      )}

      {renderCameraModal()}
      {renderQrScanModal()}
      {renderSuccessModal()}
      {renderToast()}
    </div>
  );
};

export default KioskRegistration;