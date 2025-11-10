// webmain.js
import React, { useState, useEffect } from 'react';
import './webmain.css';
import clicareLogo from "../../clicareLogo.png";
import logo from "../../logo.png";
import { 
  ChartSpline,
  TriangleAlert,
  Search,
  X,
  LogOut,
  FlaskConical,
  CalendarCheck,
  Menu,
  CheckCircle,
  AlertTriangle,
  Info,
  FileText,
  Upload,
  RotateCcw,
  Trash2,
  ArrowLeft,
  File,
  Image,
  FileType,
  Settings
} from 'lucide-react';

const WebMain = () => {
  const [currentPage, setCurrentPage] = useState('overview');
  const [activeProfileTab, setActiveProfileTab] = useState('details');
  const [patientInfo, setPatientInfo] = useState({
    patientId: '',
    name: '',
    email: '',
    contactNumber: '',
    birthday: '',
    age: '',
    sex: '',
    address: '',
    registrationDate: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactNo: ''
  });
  const [dashboardData, setDashboardData] = useState({
    todayStats: {
      myHistory: 0,
      labRequests: 0,
      labHistory: 0
    },
    recentActivity: [],
    pendingLabRequests: [],
    upcomingAppointments: [],
    visitHistory: [],
    diagnoses: []
  });
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAppointmentConfirm, setShowAppointmentConfirm] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [currentLabRequestId, setCurrentLabRequestId] = useState(null);
  const [selectedTestFiles, setSelectedTestFiles] = useState({});
  const [showTestUploadModal, setShowTestUploadModal] = useState(false);
  const [currentUploadRequest, setCurrentUploadRequest] = useState(null);
  const [showLabHistoryModal, setShowLabHistoryModal] = useState(false);
  const [selectedLabHistory, setSelectedLabHistory] = useState(null);
  const [labHistoryFiles, setLabHistoryFiles] = useState([]);
  const [loadingLabFiles, setLoadingLabFiles] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [labRequestsSearchTerm, setLabRequestsSearchTerm] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalContent, setAlertModalContent] = useState({ title: '', message: '', type: 'info' });
  const [diagnosisHistory, setDiagnosisHistory] = useState([]);

  useEffect(() => {
    initializePatientData();
  }, []);

  const initializePatientData = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const patientId = localStorage.getItem('patientId');
      const patientName = localStorage.getItem('patientName');
      const storedPatientInfo = localStorage.getItem('patientInfo');
      const emergencyContact = localStorage.getItem('emergencyContact');
      
      if (!token || !patientId) {
        window.location.href = '/web-login';
        return;
      }
      
      let fullPatientInfo = {};
      let emergencyContactInfo = {};
      
      try {
        if (storedPatientInfo) {
          fullPatientInfo = JSON.parse(storedPatientInfo);
        }
        if (emergencyContact) {
          emergencyContactInfo = JSON.parse(emergencyContact);
        }
      } catch (error) {
        console.warn('Failed to parse stored patient info:', error);
      }
      
      setPatientInfo({
        patientId: fullPatientInfo.patient_id || patientId,
        name: fullPatientInfo.name || patientName,
        email: fullPatientInfo.email || '',
        contactNumber: fullPatientInfo.contact_no || '',
        birthday: fullPatientInfo.birthday || '',
        age: fullPatientInfo.age || '',
        sex: fullPatientInfo.sex || '',
        address: fullPatientInfo.address || '',
        registrationDate: fullPatientInfo.registration_date || '',
        emergencyContactName: emergencyContactInfo.name || fullPatientInfo.emergency_contact_name || '',
        emergencyContactRelationship: emergencyContactInfo.relationship || fullPatientInfo.emergency_contact_relationship || '',
        emergencyContactNo: emergencyContactInfo.contact_no || fullPatientInfo.emergency_contact_no || ''
      });

      await loadDashboardData();
      
    } catch (error) {
      console.error('Error initializing patient data:', error);
      setError('Failed to load patient data');
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const response = await fetch('http://localhost:5000/api/patient/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPatientInfo(prev => ({
          ...prev,
          ...data.patient
        }));
        
        localStorage.setItem('patientInfo', JSON.stringify(data.patient));
      }
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    }
  };

  const fetchPatientHistory = async () => { 
    try {
      const token = localStorage.getItem('patientToken');
      const patientId = localStorage.getItem('patientId');
      
      const response = await fetch(`http://localhost:5000/api/patient/history/${patientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.visitHistory || [];
      }
    } catch (error) {
      console.error('Failed to fetch patient history:', error);
    }
    return [];
  };

  const fetchLabRequests = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const patientId = localStorage.getItem('patientId');
      
      const response = await fetch(`http://localhost:5000/api/patient/lab-requests/${patientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.labRequests || [];
      } else {
        console.error('Failed to fetch lab requests:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch lab requests:', error);
    }
    return [];
  };

  const fetchLabHistory = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const patientId = localStorage.getItem('patientId');
      
      const response = await fetch(`http://localhost:5000/api/patient/lab-history/${patientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.labHistory || [];
      } else {
        console.error('Failed to fetch lab history:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch lab history:', error);
    }
    return [];
  };

  const fetchPatientDiagnoses = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const patientId = localStorage.getItem('patientId');
      
      const response = await fetch(`http://localhost:5000/api/patient/history/${patientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Extract all diagnoses from visit history
        const allDiagnoses = [];
        data.visitHistory?.forEach(visit => {
          if (visit.diagnosis && visit.diagnosis.length > 0) {
            visit.diagnosis.forEach(diag => {
              allDiagnoses.push({
                diagnosis_id: diag.diagnosis_id,
                diagnosis_description: diag.diagnosis_description,
                diagnosis_type: diag.diagnosis_type,
                severity: diag.severity,
                notes: diag.notes,
                visit_date: visit.visit_date,
                visit_time: visit.visit_time,
                doctor_name: diag.healthStaff?.name || 'Unknown',
                department: diag.healthStaff?.department?.name || 'Unknown',
                specialization: diag.healthStaff?.specialization || ''
              });
            });
          }
        });
        return allDiagnoses;
      }
    } catch (error) {
      console.error('Failed to fetch patient diagnoses:', error);
    }
    return [];
  };

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const patientId = localStorage.getItem('patientId');
      
      // Fetch visit history
      const historyResponse = await fetch(`http://localhost:5000/api/patient/history/${patientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      // Fetch lab requests
      const labResponse = await fetch(`http://localhost:5000/api/patient/lab-requests/${patientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const activities = [];

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        
        // Process visits
        historyData.visitHistory?.forEach(visit => {
          const visitDateTime = new Date(`${visit.visit_date}T${visit.visit_time}`);
          
          // Get department name
          let departmentName = 'Unknown';
          if (visit.diagnosis && visit.diagnosis.length > 0 && visit.diagnosis[0].healthStaff?.department) {
            departmentName = visit.diagnosis[0].healthStaff.department.name;
          } else if (visit.queue && visit.queue.length > 0 && visit.queue[0].department) {
            departmentName = visit.queue[0].department.name;
          }

          // Add visit activity
          if (visit.queue && visit.queue.length > 0 && visit.queue[0].status === 'completed') {
            activities.push({
              time: visitDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              action: 'Consultation completed',
              department: departmentName,
              status: 'success',
              timestamp: visitDateTime.getTime()
            });
          }

          // Add diagnosis activity
          if (visit.diagnosis && visit.diagnosis.length > 0) {
            activities.push({
              time: visitDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              action: `Diagnosed: ${visit.diagnosis[0].diagnosis_description.substring(0, 50)}${visit.diagnosis[0].diagnosis_description.length > 50 ? '...' : ''}`,
              department: departmentName,
              status: 'info',
              timestamp: visitDateTime.getTime()
            });
          }
        });
      }

      if (labResponse.ok) {
        const labData = await labResponse.json();
        
        // Process lab requests
        labData.labRequests?.forEach(request => {
          const requestDate = new Date(request.created_at);
          
          if (request.status === 'completed' && request.labResult) {
            const uploadDate = new Date(request.labResult.upload_date);
            activities.push({
              time: uploadDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              action: `Lab results uploaded: ${request.test_name}`,
              department: request.doctor?.department || 'Laboratory',
              status: 'success',
              timestamp: uploadDate.getTime()
            });
          } else if (request.status === 'pending') {
            activities.push({
              time: requestDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              action: `New lab request: ${request.test_name}`,
              department: request.doctor?.department || 'Laboratory',
              status: 'info',
              timestamp: requestDate.getTime()
            });
          }
        });
      }

      // Sort by timestamp (most recent first) and limit to 10
      activities.sort((a, b) => b.timestamp - a.timestamp);
      return activities.slice(0, 10);
      
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
    return [];
  };

  const loadDashboardData = async () => {
    setDataLoading(true);
    
    try {
      const labRequests = await fetchLabRequests();
      const visitHistory = await fetchPatientHistory();
      const labHistory = await fetchLabHistory();
      const diagnoses = await fetchPatientDiagnoses();
      const recentActivity = await fetchRecentActivity();
      
      setDashboardData({
        todayStats: {
          myHistory: visitHistory.length || 0,
          labRequests: labRequests.filter(req => req.status === 'pending').length || 0,
          labHistory: labHistory.length || 0
        },
        recentActivity: recentActivity,
        pendingLabRequests: labRequests.filter(req => req.status === 'pending') || [],
        upcomingAppointments: [],
        visitHistory: visitHistory,
        labHistory: labHistory,
        diagnoses: diagnoses
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/web-login');
  };

  const handleAppointmentClick = () => {
    setShowAppointmentConfirm(true);
  };

  const handleAppointmentConfirm = () => {
    setShowAppointmentConfirm(false);
    window.location.href = '/web-appointment';
  };

  const handleLabUpload = async (labRequestId) => {
    const request = dashboardData.pendingLabRequests.find(req => req.request_id === labRequestId);
    if (!request) {
      showAlert('Error', 'Lab request not found', 'error');
      return;
    }

    const tests = request.test_type.split(', ').map((testType, index) => {
      const testNames = request.test_name.split(', ');
      return {
        testType: testType.trim(),
        testName: testNames[index] ? testNames[index].trim() : testType.trim(),
        id: `${labRequestId}_${index}`
      };
    });

    setCurrentUploadRequest({
      ...request,
      tests: tests
    });
    setSelectedTestFiles({});
    setShowTestUploadModal(true);
  };

  const handleTestFileSelect = (testId, testName) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf,.doc,.docx';
    fileInput.multiple = false;
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        showAlert('File Too Large', `File for ${testName} is too large. Maximum size is 10MB.`, 'error');
        return;
      }

      setSelectedTestFiles(prev => ({
        ...prev,
        [testId]: {
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          testName: testName,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        }
      }));
    };
    
    fileInput.click();
  };

  const handleTestFileRemove = (testId) => {
    setSelectedTestFiles(prev => {
      const newFiles = { ...prev };
      if (newFiles[testId]?.preview) {
        URL.revokeObjectURL(newFiles[testId].preview);
      }
      delete newFiles[testId];
      return newFiles;
    });
  };

  const handleAllFilesUpload = async () => {
    const requiredTests = currentUploadRequest.tests.length;
    const uploadedTests = Object.keys(selectedTestFiles).length;

    if (uploadedTests < requiredTests) {
      showAlert('Incomplete Upload', `Please upload files for all ${requiredTests} tests. Currently uploaded: ${uploadedTests}/${requiredTests}`, 'error');
      return;
    }

    setDataLoading(true);

    try {
      const uploadPromises = Object.entries(selectedTestFiles).map(async ([testId, fileData]) => {
        const formData = new FormData();
        formData.append('labResultFile', fileData.file);
        formData.append('labRequestId', currentUploadRequest.request_id);
        formData.append('patientId', patientInfo.patientId);
        formData.append('testName', fileData.testName);

        const token = localStorage.getItem('patientToken');
        
        const response = await fetch('http://localhost:5000/api/patient/upload-lab-result-by-test', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: formData
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(`Failed to upload ${fileData.testName}: ${result.error || 'Upload failed'}`);
        }

        return await response.json();
      });

      await Promise.all(uploadPromises);

      showAlert('Upload Successful', `Successfully uploaded all ${uploadedTests} test result(s)!\n\nThe results have been sent to your doctor for review.`, 'success');
      
      setSelectedTestFiles({});
      setShowTestUploadModal(false);
      setCurrentUploadRequest(null);
      await loadDashboardData();
      
    } catch (error) {
      console.error('Lab upload error:', error);
      showAlert('Upload Failed', `Failed to upload lab results: ${error.message}\nPlease try again.`, 'error');
    } finally {
      setDataLoading(false);
    }
  };

  const handleFileRemove = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    if (newFiles.length === 0) {
      setShowFilePreview(false);
    }
  };

  const handleFileUploadConfirm = async () => {
    if (selectedFiles.length === 0) return;

    setDataLoading(true);

    try {
      const uploadPromises = selectedFiles.map(async (fileData) => {
        const formData = new FormData();
        formData.append('labResultFile', fileData.file);
        formData.append('labRequestId', currentLabRequestId);
        formData.append('patientId', patientInfo.patientId);

        const token = localStorage.getItem('patientToken');
        
        const response = await fetch('http://localhost:5000/api/patient/upload-lab-result', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: formData
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Upload failed');
        }

        return await response.json();
      });

      await Promise.all(uploadPromises);

      showAlert('Upload Successful', `Successfully uploaded ${selectedFiles.length} file(s)!\n\nThe results have been sent to your doctor for review.`, 'success');
      
      setSelectedFiles([]);
      setShowFilePreview(false);
      setCurrentLabRequestId(null);
      await loadDashboardData();
      
    } catch (error) {
      console.error('Lab upload error:', error);
      showAlert('Upload Failed', `Failed to upload lab results: ${error.message}\nPlease try again.`, 'error');
    } finally {
      setDataLoading(false);
    }
  };

  const getMenuItems = () => [
    { 
      id: 'overview', 
      icon: <ChartSpline size={15} />, 
      label: 'Patient Profile', 
      description: 'Statistics and recent activity' 
    },
    { 
      id: 'lab-requests', 
      icon: <FlaskConical size={15} />, 
      label: 'Lab Requests', 
      description: 'Upload lab results' 
    },
    { 
      id: 'appointments', 
      icon: <CalendarCheck size={15} />, 
      label: 'Appointments', 
      description: 'Schedule new consultation' 
    }
  ];

  const fetchDiagnosisHistory = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const patientId = localStorage.getItem('patientId');
      
      // Get patient database ID first
      const { data: patientData } = await fetch(`http://localhost:5000/api/patient/by-id/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(res => res.json());

      if (!patientData) return [];

      // Fetch diagnosis history using the patient's database ID
      const response = await fetch(`http://localhost:5000/api/healthcare/patient-history-by-db-id/${patientData.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only visits that have diagnosis
        const diagnosisRecords = data.visitHistory
          .filter(visit => visit.diagnosis && visit.diagnosis.length > 0)
          .map(visit => ({
            visit_date: visit.visit_date,
            visit_time: visit.visit_time,
            diagnosis: visit.diagnosis[0].diagnosis_description,
            severity: visit.diagnosis[0].severity,
            doctor_name: visit.diagnosis[0].staff?.name || 'Unknown',
            department: visit.diagnosis[0].staff?.department?.name || 'Unknown',
            notes: visit.diagnosis[0].notes
          }));
        return diagnosisRecords;
      }
    } catch (error) {
      console.error('Failed to fetch diagnosis history:', error);
    }
    return [];
  };

  const getFilteredVisitHistory = () => {
    if (!historySearchTerm.trim()) {
      return dashboardData.visitHistory;
    }
    
    const query = historySearchTerm.toLowerCase();
    return dashboardData.visitHistory.filter(visit => {
      const matchesSymptoms = visit.symptoms?.toLowerCase().includes(query);
      const matchesDate = new Date(visit.visit_date).toLocaleDateString().includes(query);
      const matchesType = visit.appointment_type?.toLowerCase().includes(query);
      
      let matchesDepartment = false;
      if (visit.labRequest && visit.labRequest.length > 0 && visit.labRequest[0].healthStaff?.department) {
        matchesDepartment = visit.labRequest[0].healthStaff.department.name.toLowerCase().includes(query);
      } else if (visit.diagnosis && visit.diagnosis.length > 0 && visit.diagnosis[0].healthStaff?.department) {
        matchesDepartment = visit.diagnosis[0].healthStaff.department.name.toLowerCase().includes(query);
      } else if (visit.queue && visit.queue.length > 0 && visit.queue[0].department) {
        matchesDepartment = visit.queue[0].department.name.toLowerCase().includes(query);
      }
      
      return matchesSymptoms || matchesDate || matchesType || matchesDepartment;
    });
  };

  const getFilteredLabRequests = () => {
    if (!labRequestsSearchTerm.trim()) {
      return dashboardData.pendingLabRequests;
    }
    
    const query = labRequestsSearchTerm.toLowerCase();
    return dashboardData.pendingLabRequests.filter(request => {
      const matchesTestName = request.test_name?.toLowerCase().includes(query);
      const matchesTestType = request.test_type?.toLowerCase().includes(query);
      const matchesRequestId = request.request_id?.toString().includes(query);
      const matchesDoctor = request.doctor?.name?.toLowerCase().includes(query);
      const matchesDepartment = request.doctor?.department?.toLowerCase().includes(query);
      const matchesStatus = request.status?.toLowerCase().includes(query);
      const matchesPriority = request.priority?.toLowerCase().includes(query);
      
      return matchesTestName || matchesTestType || matchesRequestId || 
            matchesDoctor || matchesDepartment || matchesStatus || matchesPriority;
    });
  };
  
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm.trim() || !text) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} className="webmain-search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  const handleHistoryRowClick = (visit) => {
    setSelectedVisit(visit);
    setShowHistoryModal(true);
  };

  const handleLabHistoryRowClick = async (labItem) => {
    setSelectedLabHistory(labItem);
    setLoadingLabFiles(true);
    setShowLabHistoryModal(true);
    
    try {
      const token = localStorage.getItem('patientToken');
      const response = await fetch(`http://localhost:5000/api/patient/lab-history-files/${labItem.request_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setLabHistoryFiles(data.files || []);
      } else {
        console.error('Failed to fetch lab history files');
        setLabHistoryFiles([]);
      }
    } catch (error) {
      console.error('Error fetching lab history files:', error);
      setLabHistoryFiles([]);
    } finally {
      setLoadingLabFiles(false);
    }
  };

  const showAlert = (title, message, type = 'info') => {
    setAlertModalContent({ title, message, type });
    setShowAlertModal(true);

    setTimeout(() => {
      setShowAlertModal(false);
    }, 3000);
  };

  const renderOverview = () => (
    <div className="webmain-page-content">
      {loading ? (
        <div className="webmain-loading-container">
          <div className="webmain-loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : error ? (
        <div className="webmain-error-container">
          <div className="webmain-error-message">
            <TriangleAlert size={20} />
            <p>{error}</p>
            <button onClick={loadDashboardData} className="webmain-retry-btn">
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="webmain-profile-combined-card">
            <div className="webmain-profile-header-section">
              <div className="webmain-profile-avatar">
                {patientInfo.name ? patientInfo.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="webmain-profile-header-info">
                <div className="webmain-profile-name-row">
                  <h2 className="webmain-profile-name">{patientInfo.name}</h2>
                  <span className="webmain-status-badge">Active</span>
                </div>
                <div className="webmain-profile-meta">
                  <div className="webmain-profile-meta-item">
                    <span>ID: {patientInfo.patientId}</span>
                  </div>
                  <div className="webmain-profile-meta-item">
                    <span>Contact No: {patientInfo.contactNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="webmain-profile-tabs-nav">
              <button
                className={`webmain-profile-tab-btn ${activeProfileTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('details')}
              >
                Details
              </button>
              <button
                className={`webmain-profile-tab-btn ${activeProfileTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('activity')}
              >
                Recent Activity
                <span className="webmain-profile-tab-badge">{dashboardData.recentActivity.length}</span>
              </button>
              <button
                className={`webmain-profile-tab-btn ${activeProfileTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('history')}
              >
                Medical History
                <span className="webmain-profile-tab-badge">{dashboardData.visitHistory.length}</span>
              </button>
              <button
                className={`webmain-profile-tab-btn ${activeProfileTab === 'lab-history' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('lab-history')}
              >
                Lab History
                <span className="webmain-profile-tab-badge">
                  {dashboardData.labHistory ? dashboardData.labHistory.length : 0}
                </span>
              </button>
              <button
                className={`webmain-profile-tab-btn ${activeProfileTab === 'diagnoses' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('diagnoses')}
              >
                Diagnoses
                <span className="webmain-profile-tab-badge">
                  {dashboardData.diagnoses ? dashboardData.diagnoses.length : 0}
                </span>
              </button>
            </div>

            <div className="webmain-profile-tab-content">
              {activeProfileTab === 'details' && (
                <>
                  <div className="webmain-profile-section">
                    <h3 className="webmain-profile-section-title">Personal Information</h3>
                    <div className="webmain-profile-info-grid">
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">First Name</label>
                        <span className="webmain-profile-info-value">
                          {patientInfo.name ? patientInfo.name.split(' ')[0] : 'N/A'}
                        </span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Last Name</label>
                        <span className="webmain-profile-info-value">
                          {patientInfo.name ? patientInfo.name.split(' ').slice(1).join(' ') : 'N/A'}
                        </span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Age</label>
                        <span className="webmain-profile-info-value">{patientInfo.age || 'N/A'}</span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Gender</label>
                        <span className="webmain-profile-info-value">{patientInfo.sex || 'N/A'}</span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Phone Number</label>
                        <span className="webmain-profile-info-value">{patientInfo.contactNumber || 'N/A'}</span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Email Id</label>
                        <span className="webmain-profile-info-value">{patientInfo.email || 'N/A'}</span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Date of Birth</label>
                        <span className="webmain-profile-info-value">
                          {patientInfo.birthday ? new Date(patientInfo.birthday).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Blood Group</label>
                        <span className="webmain-profile-info-value">O+</span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Address</label>
                        <span className="webmain-profile-info-value">{patientInfo.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="webmain-profile-section">
                    <h3 className="webmain-profile-section-title">Medical Information</h3>
                    <div className="webmain-profile-info-grid">
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Primary Physician</label>
                        <span className="webmain-profile-info-value">Dr. Emily Davies</span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Known Allergies</label>
                        <span className="webmain-profile-info-value">Penicillin</span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Chronic Conditions</label>
                        <span className="webmain-profile-info-value">Hypertension</span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Previous Surgeries</label>
                        <span className="webmain-profile-info-value">Appendectomy (2020)</span>
                      </div>
                      <div className="webmain-profile-info-item">
                        <label className="webmain-profile-info-label">Current Medication</label>
                        <span className="webmain-profile-info-value">Atenolol 50mg</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeProfileTab === 'activity' && (
                <div className="webmain-profile-section">
                  <h3 className="webmain-profile-section-title">Recent Activity</h3>
                  {dashboardData.recentActivity.length === 0 ? (
                    <div className="webmain-empty-state">
                      <div className="webmain-empty-icon">
                        <Info size={40} />
                      </div>
                      <h3>No Recent Activity</h3>
                      <p>Your recent activities will appear here.</p>
                    </div>
                  ) : (
                    <div className="webmain-profile-activity-list">
                      {dashboardData.recentActivity.map((activity, index) => (
                        <div key={index} className="webmain-profile-activity-item">
                          <div className="webmain-profile-activity-icon">
                            {activity.status === 'success' ? <CheckCircle size={16} /> : 
                            activity.status === 'warning' ? <AlertTriangle size={16} /> : 
                            <Info size={16} />}
                          </div>
                          <div className="webmain-profile-activity-content">
                            <div className="webmain-profile-activity-title">{activity.action}</div>
                            <div className="webmain-profile-activity-desc">Department: {activity.department}</div>
                            <div className="webmain-profile-activity-time">{activity.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeProfileTab === 'history' && (
                <div className="webmain-profile-section">
                  <h3 className="webmain-profile-section-title">Medical History Timeline</h3>
                  {dashboardData.visitHistory.length === 0 ? (
                    <div className="webmain-empty-state">
                      <div className="webmain-empty-icon">
                        <FileText size={40} />
                      </div>
                      <h3>No Medical History</h3>
                      <p>Your consultation history will appear here after your first visit.</p>
                    </div>
                  ) : (
                    <div className="webmain-medical-history-timeline">
                      {dashboardData.visitHistory.map((visit, index) => (
                        <div key={index} className="webmain-history-timeline-item">
                          <div className="webmain-history-timeline-date">
                            {new Date(visit.visit_date).toLocaleDateString()} - {visit.visit_time}
                          </div>
                          <div className="webmain-history-timeline-card">
                            <div className="webmain-history-timeline-title">
                              {visit.appointment_type}
                            </div>
                            <div className="webmain-history-timeline-details">
                              <div className="webmain-history-timeline-detail">
                                <strong>Department: </strong>
                                <span>
                                  {(() => {
                                    if (visit.labRequest && visit.labRequest.length > 0 && visit.labRequest[0].healthStaff && visit.labRequest[0].healthStaff.department) {
                                      return visit.labRequest[0].healthStaff.department.name;
                                    }
                                    else if (visit.diagnosis && visit.diagnosis.length > 0 && visit.diagnosis[0].healthStaff && visit.diagnosis[0].healthStaff.department) {
                                      return visit.diagnosis[0].healthStaff.department.name;
                                    }
                                    else if (visit.queue && visit.queue.length > 0 && visit.queue[0].department) {
                                      return visit.queue[0].department.name;
                                    }
                                    else {
                                      return 'Unknown';
                                    }
                                  })()}
                                </span>
                              </div>
                              <div className="webmain-history-timeline-detail">
                                <strong>Symptoms: </strong>
                                <span>{visit.symptoms}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeProfileTab === 'lab-history' && (
                <div className="webmain-profile-section">
                  <h3 className="webmain-profile-section-title">Laboratory Test History</h3>
                  {(!dashboardData.labHistory || dashboardData.labHistory.length === 0) ? (
                    <div className="webmain-empty-state">
                      <div className="webmain-empty-icon">
                        <FlaskConical size={40} />
                      </div>
                      <h3>No Lab History</h3>
                      <p>Your completed lab results will appear here after tests are processed.</p>
                    </div>
                  ) : (
                    <div className="webmain-profile-lab-history-list">
                      {dashboardData.labHistory.map((labItem, index) => (
                        <div 
                          key={index} 
                          className="webmain-profile-lab-history-item"
                          onClick={() => handleLabHistoryRowClick(labItem)}
                        >
                          <div className="webmain-profile-lab-compact-header">
                            <div className="webmain-profile-lab-main-info">
                              <div className="webmain-profile-lab-test-name">{labItem.test_name}</div>
                              <div className="webmain-profile-lab-test-type">{labItem.test_type}</div>
                            </div>
                            <div className="webmain-profile-lab-date-item">
                              <span className="date-label">Requested:</span>
                              <span className="date-value">{new Date(labItem.request_date).toLocaleDateString()}</span>
                            </div>
                            <div className="webmain-profile-lab-date-item">
                              <span className="date-label">Completed:</span>
                              <span className="date-value">
                                {labItem.completion_date ? new Date(labItem.completion_date).toLocaleDateString() : 'Pending'}
                              </span>
                            </div>
                            <div className="webmain-profile-lab-files-info">
                              <span className="webmain-profile-lab-files-badge">
                                <File size={12} />
                                {labItem.file_count || 1} file{(labItem.file_count || 1) > 1 ? 's' : ''}
                              </span>
                            </div>
                            <span className={`webmain-profile-lab-status-badge ${labItem.status}`}>
                              {labItem.status === 'completed' ? 'Completed' : 
                              labItem.status === 'pending' ? 'Pending' : 
                              labItem.status === 'processing' ? 'Processing' : labItem.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeProfileTab === 'diagnoses' && (
                <div className="webmain-profile-section">
                  <h3 className="webmain-profile-section-title">Medical Diagnoses History</h3>
                  {(!dashboardData.diagnoses || dashboardData.diagnoses.length === 0) ? (
                    <div className="webmain-empty-state">
                      <div className="webmain-empty-icon">
                        <FileText size={40} />
                      </div>
                      <h3>No Diagnoses</h3>
                      <p>Your medical diagnoses will appear here after consultations.</p>
                    </div>
                  ) : (
                    <div className="webmain-medical-history-timeline">
                      {dashboardData.diagnoses.map((diagnosis, index) => (
                        <div key={index} className="webmain-history-timeline-item">
                          <div className="webmain-history-timeline-date">
                            {new Date(diagnosis.visit_date).toLocaleDateString()} - {diagnosis.visit_time}
                          </div>
                          <div className="webmain-history-timeline-card">
                            <div className="webmain-history-timeline-title">
                              {diagnosis.diagnosis_description}
                            </div>
                            <div className="webmain-history-timeline-details">
                              <div className="webmain-history-timeline-detail">
                                <strong>Type: </strong>
                                <span style={{ textTransform: 'capitalize' }}>{diagnosis.diagnosis_type}</span>
                              </div>
                              <div className="webmain-history-timeline-detail">
                                <strong>Severity: </strong>
                                <span style={{ 
                                  textTransform: 'capitalize',
                                  color: diagnosis.severity === 'severe' ? 'var(--webmain-error)' : 
                                        diagnosis.severity === 'moderate' ? 'var(--webmain-warning)' : 
                                        'var(--webmain-success)'
                                }}>
                                  {diagnosis.severity}
                                </span>
                              </div>
                              <div className="webmain-history-timeline-detail">
                                <strong>Doctor: </strong>
                                <span>Dr. {diagnosis.doctor_name}</span>
                              </div>
                              <div className="webmain-history-timeline-detail">
                                <strong>Department: </strong>
                                <span>{diagnosis.department}</span>
                              </div>
                              {diagnosis.notes && (
                                <div className="webmain-history-timeline-detail" style={{ gridColumn: '1 / -1' }}>
                                  <strong>Notes: </strong>
                                  <span>{diagnosis.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderLabRequests = () => {
    const filteredLabRequests = getFilteredLabRequests();
    
    return (
      <div className="webmain-page-content">
        <div className="webmain-search-section">
          <div className="webmain-page-header">
            <div className="header-left">
              <h2>Lab Requests</h2>
              <p>Doctor requested laboratory tests</p>
            </div>
          </div>

          <div className="webmain-search-wrapper">
            <Search size={18} className="webmain-search-icon" />
            <input
              type="text"
              placeholder="Search by test name, type, doctor, department, status, or priority..."
              value={labRequestsSearchTerm}
              onChange={(e) => setLabRequestsSearchTerm(e.target.value)}
              className="webmain-search-input"
            />
            {labRequestsSearchTerm && (
              <button 
                onClick={() => setLabRequestsSearchTerm('')}
                className="webmain-clear-search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {labRequestsSearchTerm && (
            <div className="webmain-results-summary">
              <div className="webmain-results-count">
                Showing <strong>{filteredLabRequests.length}</strong> of <strong>{dashboardData.pendingLabRequests.length}</strong> requests
              </div>
            </div>
          )}
        </div>

        {dataLoading ? (
          <div className="webmain-loading-container">
            <div className="webmain-loading-spinner"></div>
            <p>Loading lab requests...</p>
          </div>
        ) : (
          <div className="webmain-lab-requests">
            {filteredLabRequests.length === 0 ? (
              <div className="webmain-empty-state">
                <div className="webmain-empty-icon">
                  <FlaskConical size={40} />
                </div>
                <h3>{labRequestsSearchTerm ? 'No matching requests found' : 'No Lab Requests'}</h3>
                <p>
                  {labRequestsSearchTerm 
                    ? `No lab requests match "${labRequestsSearchTerm}"`
                    : "You don't have any pending lab requests at the moment."
                  }
                </p>
                {labRequestsSearchTerm && (
                  <button 
                    onClick={() => setLabRequestsSearchTerm('')}
                    className="webmain-back-btn"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              filteredLabRequests.map((request, index) => (
                <div key={index} className={`webmain-lab-request-card ${request.status}`}>
                  <div className="webmain-lab-request-header">
                    <div className="webmain-lab-request-id">
                      {highlightSearchTerm(`REQ-${request.request_id}`, labRequestsSearchTerm)}
                    </div>
                    <div className={`webmain-lab-status ${request.status}`}>
                      {request.status === 'overdue' ? 'Overdue' : 
                      request.status === 'pending' ? 'Pending Upload' :
                      request.status === 'completed' ? 'Completed' : 'Processing'}
                    </div>
                  </div>
                  
                  <div className="webmain-lab-request-content">
                    <h4>{highlightSearchTerm(request.test_name, labRequestsSearchTerm)}</h4>
                    <div className="webmain-lab-details">
                      <div className="webmain-lab-detail-item">
                        <label>Test Type:</label>
                        <span>{highlightSearchTerm(request.test_type, labRequestsSearchTerm)}</span>
                      </div>
                      <div className="webmain-lab-detail-item">
                        <label>Doctor:</label>
                        <span>
                          {highlightSearchTerm(`Dr. ${request.doctor?.name || 'Unknown'}`, labRequestsSearchTerm)}
                        </span>
                      </div>
                      <div className="webmain-lab-detail-item">
                        <label>Department:</label>
                        <span>
                          {highlightSearchTerm(request.doctor?.department || 'General Medicine', labRequestsSearchTerm)}
                        </span>
                      </div>
                      <div className="webmain-lab-detail-item">
                        <label>Request Date:</label>
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="webmain-lab-detail-item">
                        <label>Due Date:</label>
                        <span>{new Date(request.due_date).toLocaleDateString()}</span>
                      </div>
                      <div className="webmain-lab-detail-item">
                        <label>Priority:</label>
                        <span className={`priority ${request.priority}`}>
                          {highlightSearchTerm(request.priority.toUpperCase(), labRequestsSearchTerm)}
                        </span>
                      </div>
                      {request.instructions && (
                        <div className="webmain-lab-detail-item">
                          <label>Instructions:</label>
                          <span>{request.instructions}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.status === 'pending' ? (
                    <button 
                      onClick={() => handleLabUpload(request.request_id)}
                      className="webmain-upload-btn"
                      disabled={dataLoading}
                    >
                      {dataLoading ? '⏳ Uploading...' : 'Upload Result'}
                    </button>
                  ) : request.status === 'completed' && request.labResult ? (
                    <div className="webmain-completed-lab">
                      <p className="upload-success">
                        <CheckCircle size={16} /> Result uploaded: {request.labResult.file_name}
                      </p>
                      <small>Uploaded on {new Date(request.labResult.upload_date).toLocaleDateString()}</small>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'overview':
        return renderOverview();
      case 'lab-requests':
        return renderLabRequests();
      case 'appointments':
        handleAppointmentClick();
        return renderOverview();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="webmain-dashboard">
      <div className="webmain-mobile-header">
        <button 
          className="webmain-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={20} />
        </button>
        <div className="webmain-mobile-logo">
          <img src={clicareLogo} alt="CliCare Logo" />
        </div>
        <button className="webmain-mobile-logout" onClick={handleLogout}>
          <LogOut size={20} />
        </button>
      </div>

      <div className={`webmain-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="webmain-sidebar-header">
          <div className="webmain-sidebar-logo">
            <img src={clicareLogo} alt="CliCare Logo" className="webreg-reg-logo" />
          </div>
          <button 
            className="webmain-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="webmain-navigation">
          {getMenuItems().map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'appointments') {
                  handleAppointmentClick();
                } else {
                  setCurrentPage(item.id);
                }
                setSidebarOpen(false);
              }}
              className={`webmain-nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="webmain-nav-icon">{item.icon}</span>
              <div className="webmain-nav-content">
                <div className="webmain-nav-label">{item.label}</div>
                <div className="webmain-nav-description">{item.description}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="webmain-sidebar-footer">
          <div className="webmain-user-info-wrapper">
            <div className="webmain-user-details">
              <div className="webmain-user-name">{patientInfo.name}</div>
              <div className="webmain-user-id">{patientInfo.patientId}</div>
            </div>
            <button onClick={handleLogout} className="webmain-logout-btn" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div 
          className="webmain-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div className="webmain-main-content">
        {renderCurrentPage()}
      </div>

      {showAppointmentConfirm && (
        <div className="webmain-modal-overlay">
          <div className="webmain-modal">
            <div className="webmain-modal-header">
              <h3>Schedule Appointment</h3>
              <button 
                onClick={() => setShowAppointmentConfirm(false)}
                className="webmain-modal-close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="webmain-modal-content">
              <p>You will be redirected to the health assessment form to help us determine the best department and doctor for your consultation.</p>
            </div>
            <div className="webmain-modal-actions">
              <button 
                onClick={() => setShowAppointmentConfirm(false)}
                className="webmain-modal-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleAppointmentConfirm}
                className="webmain-modal-btn primary"
              >
                Continue to Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {showTestUploadModal && currentUploadRequest && (
        <div className="webmain-modal-overlay">
          <div className="webmain-modal large">
            <div className="webmain-modal-header">
              <h3>Upload Test Results</h3>
              <button 
                onClick={() => {
                  setShowTestUploadModal(false);
                  setSelectedTestFiles({});
                  setCurrentUploadRequest(null);
                }}
                className="webmain-modal-close"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="webmain-modal-content">
              <div className="webmain-test-upload-info">
                <p><strong>Request ID:</strong> REQ-{currentUploadRequest.request_id}</p>
                <p><strong>Doctor:</strong> Dr. {currentUploadRequest.doctor?.name}</p>
                <p><strong>Due Date:</strong> {new Date(currentUploadRequest.due_date).toLocaleDateString()}</p>
              </div>

              <div className="webmain-tests-list">
                <h4>Required Tests ({currentUploadRequest.tests.length}):</h4>
                <div className="upload-instruction">Please upload one file for each test below:</div>
                
                {currentUploadRequest.tests.map((test, index) => {
                  const testFile = selectedTestFiles[test.id];
                  const isUploaded = !!testFile;
                  
                  return (
                    <div key={test.id} className={`webmain-test-upload-item ${isUploaded ? 'completed' : 'pending'}`}>
                      <div className="webmain-test-header">
                        <div className="webmain-test-info">
                          <span className="test-number">{index + 1}.</span>
                          <div className="test-details">
                            <div className="test-name">{test.testName}</div>
                            <div className="test-type">{test.testType}</div>
                          </div>
                        </div>
                        <div className={`test-status ${isUploaded ? 'completed' : 'pending'}`}>
                          {isUploaded ? 'File Ready' : 'Pending'}
                        </div>
                      </div>

                      {!isUploaded ? (
                        <div className="webmain-test-upload-area">
                          <button 
                            onClick={() => handleTestFileSelect(test.id, test.testName)}
                            className="webmain-select-file-btn"
                          >
                            <Upload size={13} /> Select File for {test.testName}
                          </button>
                        </div>
                      ) : (
                        <div className="webmain-test-file-preview">
                          <div className="webmain-file-info">
                            {testFile.preview ? (
                              <img 
                                src={testFile.preview} 
                                alt={testFile.name}
                                className="webmain-file-thumbnail"
                                onClick={() => window.open(testFile.preview, '_blank')}
                              />
                            ) : (
                              <div className="webmain-file-icon">
                                {testFile.type.includes('pdf') ? <FileType size={24} /> : 
                                testFile.type.includes('doc') ? <FileType size={24} /> : 
                                <File size={24} />}
                              </div>
                            )}
                            <div className="webmain-file-details">
                              <div className="webmain-file-name">{testFile.name}</div>
                              <div className="webmain-file-size">{(testFile.size / 1024).toFixed(1)} KB</div>
                              <div className="webmain-file-type">{testFile.type}</div>
                            </div>
                          </div>
                          <div className="webmain-file-actions">
                            <button 
                              onClick={() => handleTestFileSelect(test.id, test.testName)}
                              className="webmain-replace-file-btn"
                            >
                              <RotateCcw size={16} /> Replace
                            </button>
                            <button 
                              onClick={() => handleTestFileRemove(test.id)}
                              className="webmain-file-remove-btn"
                            >
                              <Trash2 size={16} /> Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="webmain-upload-summary">
                <strong>Upload Progress:</strong>
                <br />
                Files Selected: {Object.keys(selectedTestFiles).length} / {currentUploadRequest.tests.length}
                <br />
                Total Size: {(Object.values(selectedTestFiles).reduce((sum, file) => sum + file.size, 0) / 1024).toFixed(1)} KB
              </div>
            </div>

            <div className="webmain-modal-actions">
              <button 
                onClick={() => {
                  setShowTestUploadModal(false);
                  setSelectedTestFiles({});
                  setCurrentUploadRequest(null);
                }}
                className="webmain-modal-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleAllFilesUpload}
                disabled={Object.keys(selectedTestFiles).length < currentUploadRequest.tests.length || dataLoading}
                className="webmain-modal-btn primary"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {showLabHistoryModal && selectedLabHistory && (
        <div className="webmain-modal-overlay">
          <div className="webmain-modal large">
            <div className="webmain-modal-header">
              <h3>Lab Test Details</h3>
              <button 
                onClick={() => {
                  setShowLabHistoryModal(false);
                  setSelectedLabHistory(null);
                  setLabHistoryFiles([]);
                }}
                className="webmain-modal-close"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="webmain-modal-content">
              <div className="webmain-lab-detail-info">
                <h4>Patient Information</h4>
                <div className="webmain-lab-info-grid">
                  <div className="webmain-info-item">
                    <label>Patient ID:</label>
                    <span>{patientInfo.patientId}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Name:</label>
                    <span>{patientInfo.name}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Age:</label>
                    <span>{patientInfo.age} years old</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Sex:</label>
                    <span>{patientInfo.sex}</span>
                  </div>
                </div>
              </div>

              <div className="webmain-lab-detail-info">
                <h4>Test Information</h4>
                <div className="webmain-lab-info-grid">
                  <div className="webmain-info-item">
                    <label>Test Name:</label>
                    <span>{selectedLabHistory.test_name}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Test Type:</label>
                    <span>{selectedLabHistory.test_type}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Request Date:</label>
                    <span>{new Date(selectedLabHistory.request_date).toLocaleDateString()}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Completion Date:</label>
                    <span>{selectedLabHistory.completion_date ? new Date(selectedLabHistory.completion_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="webmain-lab-files-section">
                <h4>Uploaded Files ({labHistoryFiles.length})</h4>
                {loadingLabFiles ? (
                  <div className="webmain-loading-container">
                    <div className="webmain-loading-spinner"></div>
                    <p>Loading files...</p>
                  </div>
                ) : labHistoryFiles.length === 0 ? (
                  <div className="webmain-no-files">
                    <p>No files available for this test.</p>
                  </div>
                ) : (
                  <div className="webmain-lab-files-list">
                    {labHistoryFiles.map((file, index) => (
                      <div key={index} className="webmain-lab-file-item">
                        <div className="webmain-file-info">
                          <div className="webmain-file-icon">
                            {file.file_path && file.file_path.toLowerCase().includes('.pdf') ? <FileType size={20} /> : 
                            file.file_path && file.file_path.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? <Image size={20} /> : 
                            <File size={20} />}
                          </div>
                          <div className="webmain-file-details">
                            <div className="webmain-file-label">{file.test_name || `Test ${index + 1}`}</div>
                            <div 
                              className="webmain-file-name clickable-file-name"
                              onClick={() => file.file_path && window.open(file.file_path, '_blank')}
                            >
                              {file.file_name || 'Uploaded File'}
                            </div>
                            <div className="webmain-file-date">
                              Uploaded: {new Date(file.upload_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="webmain-modal-actions">
              <button 
                onClick={() => {
                  setShowLabHistoryModal(false);
                  setSelectedLabHistory(null);
                  setLabHistoryFiles([]);
                }}
                className="webmain-modal-btn secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedVisit && (
        <div className="webmain-modal-overlay">
          <div className="webmain-modal large">
            <div className="webmain-modal-header">
              <h3>Visit Details</h3>
              <button 
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedVisit(null);
                }}
                className="webmain-modal-close"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="webmain-modal-content">
              <div className="webmain-lab-detail-info">
                <h4>Patient Information</h4>
                <div className="webmain-lab-info-grid">
                  <div className="webmain-info-item">
                    <label>Patient ID:</label>
                    <span>{patientInfo.patientId}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Name:</label>
                    <span>{patientInfo.name}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Age:</label>
                    <span>{patientInfo.age} years old</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Sex:</label>
                    <span>{patientInfo.sex}</span>
                  </div>
                </div>
              </div>

              <div className="webmain-lab-detail-info">
                <h4>Visit Information</h4>
                <div className="webmain-lab-info-grid">
                  <div className="webmain-info-item">
                    <label>Date:</label>
                    <span>{new Date(selectedVisit.visit_date).toLocaleDateString()}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Time:</label>
                    <span>{selectedVisit.visit_time}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Type:</label>
                    <span>{selectedVisit.appointment_type}</span>
                  </div>
                  <div className="webmain-info-item">
                    <label>Department:</label>
                    <span>
                      {(() => {
                        if (selectedVisit.labRequest && selectedVisit.labRequest.length > 0 && selectedVisit.labRequest[0].healthStaff && selectedVisit.labRequest[0].healthStaff.department) {
                          return selectedVisit.labRequest[0].healthStaff.department.name;
                        }
                        else if (selectedVisit.diagnosis && selectedVisit.diagnosis.length > 0 && selectedVisit.diagnosis[0].healthStaff && selectedVisit.diagnosis[0].healthStaff.department) {
                          return selectedVisit.diagnosis[0].healthStaff.department.name;
                        }
                        else if (selectedVisit.queue && selectedVisit.queue.length > 0 && selectedVisit.queue[0].department) {
                          return selectedVisit.queue[0].department.name;
                        }
                        else {
                          return 'Unknown';
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="webmain-lab-detail-info">
                <h4>Symptoms & Details</h4>
                <div className="webmain-lab-info-grid">
                  <div className="webmain-info-item full-width">
                    <label>Symptoms:</label>
                    <span>{selectedVisit.symptoms || 'No symptoms recorded'}</span>
                  </div>
                </div>
              </div>

              {selectedVisit.labRequest && selectedVisit.labRequest.length > 0 && (
                <div className="webmain-lab-detail-info">
                  <h4>Lab Request Information</h4>
                  {selectedVisit.labRequest.map((labReq, idx) => (
                    <div key={idx} className="webmain-lab-request-detail">
                      <div className="webmain-lab-info-grid">
                        <div className="webmain-info-item">
                          <label>Test Type:</label>
                          <span>{labReq.test_type}</span>
                        </div>
                        <div className="webmain-info-item">
                          <label>Status:</label>
                          <span className={`lab-status ${labReq.status}`}>{labReq.status}</span>
                        </div>
                      </div>
                      
                      {labReq.healthStaff && (
                        <div className="webmain-doctor-info">
                          <h5>Requesting Doctor</h5>
                          <div className="webmain-lab-info-grid doctor-info">
                            <div className="webmain-info-item">
                              <label>Doctor:</label>
                              <span className="doctor-name">Dr. {labReq.healthStaff.name}</span>
                            </div>
                            <div className="webmain-info-item">
                              <label>Department:</label>
                              <span className="doctor-department">
                                {labReq.healthStaff.department ? labReq.healthStaff.department.name : 'Unknown Department'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedVisit.diagnosis && selectedVisit.diagnosis.length > 0 && (
                <div className="webmain-lab-detail-info">
                  <h4>Diagnosis Information</h4>
                  {selectedVisit.diagnosis.map((diag, index) => (
                    <div key={index}>
                      <div className="webmain-lab-info-grid">
                        <div className="webmain-info-item full-width">
                          <label>Diagnosis:</label>
                          <span>{diag.diagnosis_description}</span>
                        </div>
                      </div>

                      {diag.healthStaff && (
                        <div className="webmain-doctor-info">
                          <h5>Attending Doctor</h5>
                          <div className="webmain-lab-info-grid doctor-info">
                            <div className="webmain-info-item">
                              <label>Doctor:</label>
                              <span className="doctor-name">Dr. {diag.healthStaff.name}</span>
                            </div>
                            <div className="webmain-info-item">
                              <label>Department:</label>
                              <span className="doctor-department">
                                {diag.healthStaff.department ? diag.healthStaff.department.name : 'Unknown Department'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="webmain-modal-actions">
              <button 
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedVisit(null);
                }}
                className="webmain-modal-btn secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="webmain-modal-overlay">
          <div className="webmain-modal">
            <div className="webmain-modal-header">
              <h3>Confirm Logout</h3>
              <button 
                className="webmain-modal-close" 
                onClick={() => setShowLogoutModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="webmain-modal-content">
              <p>Are you sure you want to logout? You will need to login again to access your dashboard.</p>
            </div>
            <div className="webmain-modal-actions">
              <button 
                className="webmain-modal-btn secondary" 
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button 
                className="webmain-modal-btn logout" 
                onClick={confirmLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlertModal && (
        <div className="webmain-modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="webmain-modal webmain-alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="webmain-alert-content">
              <div className={`webmain-alert-icon ${alertModalContent.type}`}>
                {alertModalContent.type === 'success' && <CheckCircle size={24} />}
                {alertModalContent.type === 'error' && <X size={24} />}
                {alertModalContent.type === 'info' && <Info size={24} />}
              </div>
              <h3>{alertModalContent.title}</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{alertModalContent.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebMain;