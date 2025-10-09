// mobilepatientdashboard.js - CLICARE Patient Dashboard Component (Enhanced with Backend Integration)
import React, { useState, useEffect } from 'react';
import './mobilepatientdashboard.css';

const MobilePatientDashboard = () => {
  const [currentPage, setCurrentPage] = useState('overview');
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
    visitHistory: []
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

  useEffect(() => {
    // Check authentication and load patient data
    initializePatientData();
  }, []);

  const initializePatientData = async () => {
    try {
      // Check authentication
      const token = localStorage.getItem('patientToken');
      const patientId = localStorage.getItem('patientId');
      const patientName = localStorage.getItem('patientName');
      const storedPatientInfo = localStorage.getItem('patientInfo');
      const emergencyContact = localStorage.getItem('emergencyContact');
      
      if (!token || !patientId) {
        // Redirect to login if no valid session
        window.location.href = '/web-login';
        return;
      }
      
      // Parse stored patient information
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
      
      // Set patient information
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
        // Emergency contact info
        emergencyContactName: emergencyContactInfo.name || fullPatientInfo.emergency_contact_name || '',
        emergencyContactRelationship: emergencyContactInfo.relationship || fullPatientInfo.emergency_contact_relationship || '',
        emergencyContactNo: emergencyContactInfo.contact_no || fullPatientInfo.emergency_contact_no || ''
      });

      // Load dashboard data
      await loadDashboardData();
      
    } catch (error) {
      console.error('Error initializing patient data:', error);
      setError('Failed to load patient data');
      setLoading(false);
    }
  };

  // Fetch patient data from backend
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
        
        // Update localStorage with fresh data
        localStorage.setItem('patientInfo', JSON.stringify(data.patient));
      }
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    }
  };

  // Fetch patient visit history
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

  // Fetch lab requests
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

  // Load dashboard data
  const loadDashboardData = async () => {
    setDataLoading(true);
    
    try {
      const labRequests = await fetchLabRequests();
      const visitHistory = await fetchPatientHistory();
      const labHistory = await fetchLabHistory(); // New function call
      
      setDashboardData({
        todayStats: {
          myHistory: visitHistory.length || 0,
          labRequests: labRequests.filter(req => req.status === 'pending').length || 0,
          labHistory: labHistory.length || 0
        },
        recentActivity: [
          { time: '14:30', action: 'Lab results uploaded', department: 'Cardiology', status: 'success' },
          { time: '13:45', action: 'New lab request received', department: 'Internal Medicine', status: 'info' },
          { time: '12:20', action: 'Consultation completed', department: 'General Practice', status: 'success' },
          { time: '11:10', action: 'Blood test results ready', department: 'Laboratory', status: 'success' },
          { time: '10:30', action: 'X-ray uploaded successfully', department: 'Radiology', status: 'success' }
        ],
        pendingLabRequests: labRequests.filter(req => req.status === 'pending') || [],
        upcomingAppointments: [
          { date: '2025-08-10', time: '10:00 AM', department: 'Cardiology', doctor: 'Dr. Juan Dela Cruz' },
          { date: '2025-08-12', time: '2:00 PM', department: 'Internal Medicine', doctor: 'Dr. Maria Santos' }
        ],
        visitHistory: visitHistory,
        labHistory: labHistory // Add this line
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
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

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      // Clear all stored data
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login
      window.location.replace('/web-login');
    }
  };

  const handleAppointmentClick = () => {
    setShowAppointmentConfirm(true);
  };

  const handleAppointmentConfirm = () => {
    setShowAppointmentConfirm(false);
    // Redirect to health assessment
    window.location.href = '/mobile-health-assessment';
  };

  const handleLabUpload = async (labRequestId) => {
    // Find the request to get test details
    const request = dashboardData.pendingLabRequests.find(req => req.request_id === labRequestId);
    if (!request) {
      alert('Lab request not found');
      return;
    }

    // Parse multiple tests from the request
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

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        alert(`File for ${testName} is too large. Maximum size is 10MB.`);
        return;
      }

      // Add file to the specific test
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
      alert(`Please upload files for all ${requiredTests} tests. Currently uploaded: ${uploadedTests}/${requiredTests}`);
      return;
    }

    setDataLoading(true);

    try {
      const uploadPromises = Object.entries(selectedTestFiles).map(async ([testId, fileData]) => {
        const formData = new FormData();
        formData.append('labResultFile', fileData.file);
        formData.append('labRequestId', currentUploadRequest.request_id);
        formData.append('patientId', patientInfo.patientId);
        formData.append('testName', fileData.testName); // Add test name to identify which test this file is for

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

      alert(`Successfully uploaded all ${uploadedTests} test result(s)!\n\nThe results have been sent to your doctor for review.`);
      
      // Reset and refresh
      setSelectedTestFiles({});
      setShowTestUploadModal(false);
      setCurrentUploadRequest(null);
      await loadDashboardData();
      
    } catch (error) {
      console.error('Lab upload error:', error);
      alert(`Failed to upload lab results: ${error.message}\nPlease try again.`);
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

      alert(`Successfully uploaded ${selectedFiles.length} file(s)!\n\nThe results have been sent to your doctor for review.`);
      
      // Reset and refresh
      setSelectedFiles([]);
      setShowFilePreview(false);
      setCurrentLabRequestId(null);
      await loadDashboardData();
      
    } catch (error) {
      console.error('Lab upload error:', error);
      alert(`Failed to upload lab results: ${error.message}\nPlease try again.`);
    } finally {
      setDataLoading(false);
    }
  };

  const getMenuItems = () => [
    { id: 'overview', icon: '📊', label: 'Dashboard Overview', description: 'Statistics and recent activity' },
    { id: 'history', icon: '📋', label: 'My History', description: 'Medical records and consultations' },
    { id: 'lab-requests', icon: '🧪', label: 'Lab Requests', description: 'Doctor lab requests and uploads' },
    { id: 'lab-history', icon: '📊', label: 'Lab History', description: 'Previous lab results' },
    { id: 'appointments', icon: '📅', label: 'Appointments', description: 'Schedule new consultation' }
  ];

  const renderOverview = () => (
    <div className="patient-page-content">
      <div className="patient-page-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back, {patientInfo.name}</p>
      </div>

      {loading ? (
        <div className="patient-loading-container">
          <div className="patient-loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : error ? (
        <div className="patient-error-container">
          <div className="patient-error-message">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <p>{error}</p>
            <button onClick={loadDashboardData} className="patient-retry-btn">
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="patient-stats-grid">
            <div className="patient-stat-card">
              <div className="patient-stat-icon">📋</div>
              <div className="patient-stat-content">
                <h3>My History</h3>
                <div className="patient-stat-number">{dashboardData.todayStats.myHistory}</div>
                <small>Medical records</small>
              </div>
            </div>

            <div className="patient-stat-card">
              <div className="patient-stat-icon">🧪</div>
              <div className="patient-stat-content">
                <h3>Lab Requests</h3>
                <div className="patient-stat-number">{dashboardData.todayStats.labRequests}</div>
                <small>Pending uploads</small>
              </div>
            </div>

            <div className="patient-stat-card">
              <div className="patient-stat-icon">📊</div>
              <div className="patient-stat-content">
                <h3>Lab History</h3>
                <div className="patient-stat-number">{dashboardData.todayStats.labHistory}</div>
                <small>Completed tests</small>
              </div>
            </div>
          </div>

          <div className="patient-content-grid">
            <div className="patient-activity-section">
              <h3>Recent Activity</h3>
              <div className="patient-activity-list">
                {dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="patient-activity-item">
                    <div className="patient-activity-time">{activity.time}</div>
                    <div className="patient-activity-content">
                      <div className="patient-activity-action">{activity.action}</div>
                      <div className="patient-activity-department">Department: {activity.department}</div>
                    </div>
                    <div className={`patient-activity-status ${activity.status}`}>
                      {activity.status === 'success' ? '✅' : 
                       activity.status === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="patient-quick-actions-section">
              <h3>Quick Actions</h3>
              <div className="patient-quick-actions">
                <button 
                  onClick={handleAppointmentClick}
                  className="patient-action-btn primary"
                >
                  📅 Schedule Appointment
                </button>
                <button 
                  onClick={() => setCurrentPage('lab-requests')}
                  className="patient-action-btn"
                >
                  🧪 View Lab Requests
                </button>
                <button 
                  onClick={() => setCurrentPage('history')}
                  className="patient-action-btn"
                >
                  📋 Medical History
                </button>
                <button 
                  onClick={() => setCurrentPage('lab-history')}
                  className="patient-action-btn"
                >
                  📊 Lab Results
                </button>
              </div>
            </div>
          </div>

          {/* Patient Information Card */}
          <div className="patient-info-section">
            <h3>Patient Information</h3>
            <div className="patient-info-card">
              <div className="patient-info-grid">
                <div className="patient-info-item">
                  <label>Patient ID:</label>
                  <span>{patientInfo.patientId}</span>
                </div>
                <div className="patient-info-item">
                  <label>Email:</label>
                  <span>{patientInfo.email}</span>
                </div>
                <div className="patient-info-item">
                  <label>Contact:</label>
                  <span>{patientInfo.contactNumber}</span>
                </div>
                <div className="patient-info-item">
                  <label>Age:</label>
                  <span>{patientInfo.age} years old</span>
                </div>
                {patientInfo.emergencyContactName && (
                  <div className="patient-info-item">
                    <label>Emergency Contact:</label>
                    <span>{patientInfo.emergencyContactName} ({patientInfo.emergencyContactRelationship})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderLabRequests = () => (
  <div className="patient-page-content">
    <div className="patient-page-header">
      <h2>Lab Requests</h2>
      <p>Doctor requested laboratory tests</p>
    </div>

    {dataLoading ? (
      <div className="patient-loading-container">
        <div className="patient-loading-spinner"></div>
        <p>Loading lab requests...</p>
      </div>
    ) : (
      <div className="patient-lab-requests">
        {dashboardData.pendingLabRequests.length === 0 ? (
          <div className="patient-empty-state">
            <div className="patient-empty-icon">🧪</div>
            <h3>No Lab Requests</h3>
            <p>You don't have any pending lab requests at the moment.</p>
          </div>
        ) : (
          dashboardData.pendingLabRequests.map((request, index) => (
            <div key={index} className={`patient-lab-request-card ${request.status}`}>
              <div className="patient-lab-request-header">
                <div className="patient-lab-request-id">REQ-{request.request_id}</div>
                <div className={`patient-lab-status ${request.status}`}>
                  {request.status === 'overdue' ? '⚠️ Overdue' : 
                   request.status === 'pending' ? '⏳ Pending Upload' :
                   request.status === 'completed' ? '✅ Completed' : '📤 Processing'}
                </div>
              </div>
              
              <div className="patient-lab-request-content">
                <h4>{request.test_name}</h4>
                <div className="patient-lab-details">
                  <div className="patient-lab-detail-item">
                    <label>Test Type:</label>
                    <span>{request.test_type}</span>
                  </div>
                  <div className="patient-lab-detail-item">
                    <label>Doctor:</label>
                    <span>Dr. {request.doctor?.name || 'Unknown'}</span>
                  </div>
                  <div className="patient-lab-detail-item">
                    <label>Department:</label>
                    <span>{request.doctor?.department || 'General Medicine'}</span>
                  </div>
                  <div className="patient-lab-detail-item">
                    <label>Request Date:</label>
                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="patient-lab-detail-item">
                    <label>Due Date:</label>
                    <span>{new Date(request.due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="patient-lab-detail-item">
                    <label>Priority:</label>
                    <span className={`priority ${request.priority}`}>{request.priority.toUpperCase()}</span>
                  </div>
                  {request.instructions && (
                    <div className="patient-lab-detail-item">
                      <label>Instructions:</label>
                      <span>{request.instructions}</span>
                    </div>
                  )}
                </div>
              </div>

              {request.status === 'pending' ? (
                <button 
                  onClick={() => handleLabUpload(request.request_id)}
                  className="patient-upload-btn"
                  disabled={dataLoading}
                >
                  {dataLoading ? '⏳ Uploading...' : '📤 Upload Result'}
                </button>
              ) : request.status === 'completed' && request.labResult ? (
                <div className="patient-completed-lab">
                  <p className="upload-success">✅ Result uploaded: {request.labResult.file_name}</p>
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

  const renderHistory = () => (
    <div className="patient-page-content">
      <div className="patient-page-header">
        <h2>Medical History</h2>
        <p>Your consultation and visit history</p>
      </div>

      {dataLoading ? (
        <div className="patient-loading-container">
          <div className="patient-loading-spinner"></div>
          <p>Loading medical history...</p>
        </div>
      ) : (
        <div className="patient-history-container">
          {dashboardData.visitHistory.length === 0 ? (
            <div className="patient-empty-state">
              <div className="patient-empty-icon">📋</div>
              <h3>No Medical History</h3>
              <p>Your consultation history will appear here after your first visit.</p>
            </div>
          ) : (
            <div className="patient-history-table-container">
              <div className="patient-history-table">
                <div className="patient-table-header">
                  <div className="patient-table-row">
                    <div className="patient-table-cell header">Date & Time</div>
                    <div className="patient-table-cell header">Type</div>
                    <div className="patient-table-cell header">Symptoms</div>
                    <div className="patient-table-cell header">Department</div>
                  </div>
                </div>
                <div className="patient-table-body">
                  {dashboardData.visitHistory.map((visit, index) => (
                    <div 
                      key={index} 
                      className="patient-table-row clickable-history-row"
                      onClick={() => handleHistoryRowClick(visit)}
                    >
                      <div className="patient-table-cell date-time">
                        <div className="visit-date">{new Date(visit.visit_date).toLocaleDateString()}</div>
                        <div className="visit-time">{visit.visit_time}</div>
                      </div>
                      <div className="patient-table-cell">
                        <span className="appointment-type">{visit.appointment_type}</span>
                      </div>
                      <div className="patient-table-cell symptoms">
                        <span className="symptoms-text">{visit.symptoms}</span>
                      </div>
                      <div className="patient-table-cell">
                        {(() => {
                          if (visit.labRequest && visit.labRequest.length > 0 && visit.labRequest[0].healthStaff && visit.labRequest[0].healthStaff.department) {
                            return <span className="department-name">{visit.labRequest[0].healthStaff.department.name}</span>;
                          }
                          else if (visit.diagnosis && visit.diagnosis.length > 0 && visit.diagnosis[0].healthStaff && visit.diagnosis[0].healthStaff.department) {
                            return <span className="department-name">{visit.diagnosis[0].healthStaff.department.name}</span>;
                          }
                          else if (visit.queue && visit.queue.length > 0 && visit.queue[0].department) {
                            return <span className="department-name">{visit.queue[0].department.name}</span>;
                          }
                          else {
                            return <span className="no-department">Unknown</span>;
                          }
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Medical History Detail Modal */}
          {showHistoryModal && selectedVisit && (
            <div className="patient-modal-overlay">
              <div className="patient-modal large">
                <div className="patient-modal-header">
                  <h3>Visit Details</h3>
                  <button 
                    onClick={() => {
                      setShowHistoryModal(false);
                      setSelectedVisit(null);
                    }}
                    className="patient-modal-close"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="patient-modal-content">
                  {/* Visit Information */}
                  <div className="patient-history-detail-section">
                    <h4>Visit Information</h4>
                    <div className="patient-info-grid">
                      <div className="patient-info-item">
                        <label>Date:</label>
                        <span>{new Date(selectedVisit.visit_date).toLocaleDateString()}</span>
                      </div>
                      <div className="patient-info-item">
                        <label>Time:</label>
                        <span>{selectedVisit.visit_time}</span>
                      </div>
                      <div className="patient-info-item">
                        <label>Type:</label>
                        <span>{selectedVisit.appointment_type}</span>
                      </div>
                      <div className="patient-info-item">
                        <label>Department:</label>
                        <span className="department-highlight">
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

                  {/* Symptoms & Details */}
                  <div className="patient-history-detail-section">
                    <h4>Symptoms & Details</h4>
                    <div className="patient-info-grid">
                      <div className="patient-info-item full-width">
                        <label>Symptoms:</label>
                        <span>{selectedVisit.symptoms || 'No symptoms recorded'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lab Request Information */}
                  {selectedVisit.labRequest && selectedVisit.labRequest.length > 0 && (
                    <div className="patient-history-detail-section">
                      <h4>Lab Request Information</h4>
                      {selectedVisit.labRequest.map((labReq, idx) => (
                        <div key={idx} className="patient-lab-request-detail">
                          <div className="patient-info-grid">
                            <div className="patient-info-item">
                              <label>Test Type:</label>
                              <span>{labReq.test_type}</span>
                            </div>
                            <div className="patient-info-item">
                              <label>Status:</label>
                              <span className={`lab-status ${labReq.status}`}>{labReq.status}</span>
                            </div>
                          </div>
                          
                          {labReq.healthStaff && (
                            <div className="patient-doctor-info">
                              <h5>👨‍⚕️ Requesting Doctor</h5>
                              <div className="patient-info-grid doctor-info">
                                <div className="patient-info-item">
                                  <label>Doctor:</label>
                                  <span className="doctor-name">Dr. {labReq.healthStaff.name}</span>
                                </div>
                                <div className="patient-info-item">
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

                  {/* Diagnosis Information */}
                  {selectedVisit.diagnosis && selectedVisit.diagnosis.length > 0 && (
                    <div className="patient-history-detail-section">
                      <h4>Diagnosis Information</h4>
                      {selectedVisit.diagnosis.map((diag, index) => (
                        <div key={index} className="patient-diagnosis-detail">
                          <div className="patient-info-grid">
                            <div className="patient-info-item full-width">
                              <label>Diagnosis:</label>
                              <span>{diag.diagnosis_description}</span>
                            </div>
                          </div>

                          {diag.healthStaff && (
                            <div className="patient-doctor-info">
                              <h5>👨‍⚕️ Attending Doctor</h5>
                              <div className="patient-info-grid doctor-info">
                                <div className="patient-info-item">
                                  <label>Doctor:</label>
                                  <span className="doctor-name">Dr. {diag.healthStaff.name}</span>
                                </div>
                                <div className="patient-info-item">
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

                <div className="patient-modal-actions">
                  <button 
                    onClick={() => {
                      setShowHistoryModal(false);
                      setSelectedVisit(null);
                    }}
                    className="patient-modal-btn secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Add this function after the existing handler functions
      const handleHistoryRowClick = (visit) => {
        setSelectedVisit(visit);
        setShowHistoryModal(true);
      };

  const renderLabHistory = () => (
    <div className="patient-page-content">
      <div className="patient-page-header">
        <h2>Lab History</h2>
        <p>Your completed laboratory test results</p>
      </div>

      {dataLoading ? (
        <div className="patient-loading-container">
          <div className="patient-loading-spinner"></div>
          <p>Loading lab history...</p>
        </div>
      ) : (
        <div className="patient-lab-history-container">
          {(!dashboardData.labHistory || dashboardData.labHistory.length === 0) ? (
            <div className="patient-empty-state">
              <div className="patient-empty-icon">📊</div>
              <h3>No Lab History</h3>
              <p>Your completed lab results will appear here after tests are processed.</p>
            </div>
          ) : (
            <div className="patient-lab-history-table-container">
              <div className="patient-lab-history-table">
                <div className="patient-table-header">
                  <div className="patient-table-row">
                    <div className="patient-table-cell header">Test Name</div>
                    <div className="patient-table-cell header">Date Requested</div>
                    <div className="patient-table-cell header">Date Completed</div>
                    <div className="patient-table-cell header">Status</div>
                    <div className="patient-table-cell header">Files</div>
                  </div>
                </div>
                <div className="patient-table-body">
                  {dashboardData.labHistory.map((labItem, index) => (
                    <div 
                      key={index} 
                      className="patient-table-row clickable-row"
                      onClick={() => handleLabHistoryRowClick(labItem)}
                    >
                      <div className="patient-table-cell">
                        <div className="lab-test-name">{labItem.test_name}</div>
                        <div className="lab-test-type">{labItem.test_type}</div>
                      </div>
                      <div className="patient-table-cell date-time">
                        <div className="request-date">{new Date(labItem.request_date).toLocaleDateString()}</div>
                      </div>
                      <div className="patient-table-cell date-time">
                        <div className="completion-date">
                          {labItem.completion_date ? new Date(labItem.completion_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      <div className="patient-table-cell">
                        <span className={`lab-status ${labItem.status}`}>
                          {labItem.status === 'completed' ? '✅ Completed' : 
                          labItem.status === 'pending' ? '⏳ Pending' : 
                          labItem.status === 'processing' ? '🔄 Processing' : labItem.status}
                        </span>
                      </div>
                      <div className="patient-table-cell">
                        <span className="file-count-badge">
                          {labItem.file_count || 1} file{(labItem.file_count || 1) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const handleLabHistoryRowClick = async (labItem) => {
  setSelectedLabHistory(labItem);
  setLoadingLabFiles(true);
  setShowLabHistoryModal(true);
  
  try {
    // Fetch all files for this lab request
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

  const renderPlaceholderPage = (title, description) => (
    <div className="patient-page-content">
      <div className="patient-page-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="patient-placeholder">
        <div className="patient-placeholder-icon">🚧</div>
        <h3>Coming Soon</h3>
        <p>This feature is currently under development and will be available in the next release.</p>
        <button 
          onClick={() => setCurrentPage('overview')}
          className="patient-back-btn"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'overview':
        return renderOverview();
      case 'lab-requests':
        return renderLabRequests();
      case 'history':
        return renderHistory();
      case 'lab-history':
        return renderLabHistory();
      case 'appointments':
        handleAppointmentClick();
        return renderOverview();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="patient-dashboard">
      {/* Mobile Header */}
      <div className="patient-mobile-header">
        <button 
          className="patient-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <div className="patient-mobile-logo">
          <span className="patient-mobile-icon">🏥</span>
          <span className="patient-mobile-title">CLICARE Patient</span>
        </div>
        <button className="patient-mobile-logout" onClick={handleLogout}>
          🚪
        </button>
      </div>

      {/* Sidebar */}
      <div className={`patient-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="patient-sidebar-header">
          <div className="patient-sidebar-logo">
            <span className="patient-sidebar-icon">🏥</span>
            <div className="patient-sidebar-text">
              <h1>CLICARE</h1>
              <p>Patient Portal</p>
            </div>
          </div>
          <button 
            className="patient-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="patient-user-info">
          <div className="patient-user-avatar">👤</div>
          <div className="patient-user-details">
            <div className="patient-user-name">{patientInfo.name}</div>
            <div className="patient-user-role">Patient</div>
            <div className="patient-user-id">{patientInfo.patientId}</div>
          </div>
        </div>

        <nav className="patient-navigation">
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
              className={`patient-nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="patient-nav-icon">{item.icon}</span>
              <div className="patient-nav-content">
                <div className="patient-nav-label">{item.label}</div>
                <div className="patient-nav-description">{item.description}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="patient-sidebar-footer">
          <button onClick={handleLogout} className="patient-logout-btn">
            <span>🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="patient-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="patient-main-content">
        {renderCurrentPage()}
      </div>

      {/* Appointment Confirmation Modal */}
      {showAppointmentConfirm && (
        <div className="patient-modal-overlay">
          <div className="patient-modal">
            <div className="patient-modal-header">
              <h3>📅 Schedule Appointment</h3>
              <button 
                onClick={() => setShowAppointmentConfirm(false)}
                className="patient-modal-close"
              >
                ✕
              </button>
            </div>
            <div className="patient-modal-content">
              <p>You will be redirected to the health assessment form to help us determine the best department and doctor for your consultation.</p>
              <div className="patient-appointment-info">
                <p><strong>Process:</strong></p>
                <ul>
                  <li>Complete health assessment questionnaire</li>
                  <li>System recommends appropriate department</li>
                  <li>Choose available appointment slots</li>
                  <li>Receive confirmation details</li>
                </ul>
              </div>
            </div>
            <div className="patient-modal-actions">
              <button 
                onClick={() => setShowAppointmentConfirm(false)}
                className="patient-modal-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleAppointmentConfirm}
                className="patient-modal-btn primary"
              >
                Continue to Assessment
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Test Upload Modal */}
      {showTestUploadModal && currentUploadRequest && (
        <div className="patient-modal-overlay">
          <div className="patient-modal large">
            <div className="patient-modal-header">
              <h3>Upload Test Results</h3>
              <button 
                onClick={() => {
                  setShowTestUploadModal(false);
                  setSelectedTestFiles({});
                  setCurrentUploadRequest(null);
                }}
                className="patient-modal-close"
              >
                ✕
              </button>
            </div>
            
            <div className="patient-modal-content">
              <div className="patient-test-upload-info">
                <p><strong>Request ID:</strong> REQ-{currentUploadRequest.request_id}</p>
                <p><strong>Doctor:</strong> Dr. {currentUploadRequest.doctor?.name}</p>
                <p><strong>Due Date:</strong> {new Date(currentUploadRequest.due_date).toLocaleDateString()}</p>
              </div>

              <div className="patient-tests-list">
                <h4>Required Tests ({currentUploadRequest.tests.length}):</h4>
                <p className="upload-instruction">Please upload one file for each test below:</p>
                
                {currentUploadRequest.tests.map((test, index) => {
                  const testFile = selectedTestFiles[test.id];
                  const isUploaded = !!testFile;
                  
                  return (
                    <div key={test.id} className={`patient-test-upload-item ${isUploaded ? 'completed' : 'pending'}`}>
                      <div className="patient-test-header">
                        <div className="patient-test-info">
                          <span className="test-number">{index + 1}.</span>
                          <div className="test-details">
                            <div className="test-name">{test.testName}</div>
                            <div className="test-type">{test.testType}</div>
                          </div>
                        </div>
                        <div className={`test-status ${isUploaded ? 'completed' : 'pending'}`}>
                          {isUploaded ? '✅ File Ready' : '⏳ Pending'}
                        </div>
                      </div>

                      {!isUploaded ? (
                        <div className="patient-test-upload-area">
                          <button 
                            onClick={() => handleTestFileSelect(test.id, test.testName)}
                            className="patient-select-file-btn"
                          >
                            📁 Select File for {test.testName}
                          </button>
                        </div>
                      ) : (
                        <div className="patient-test-file-preview">
                          <div className="patient-file-info">
                            {testFile.preview ? (
                              <img 
                                src={testFile.preview} 
                                alt={testFile.name}
                                className="patient-file-thumbnail"
                                onClick={() => window.open(testFile.preview, '_blank')}
                              />
                            ) : (
                              <div className="patient-file-icon">
                                {testFile.type.includes('pdf') ? '📄' : 
                                testFile.type.includes('doc') ? '📝' : '📎'}
                              </div>
                            )}
                            <div className="patient-file-details">
                              <div className="patient-file-name">{testFile.name}</div>
                              <div className="patient-file-size">{(testFile.size / 1024).toFixed(1)} KB</div>
                              <div className="patient-file-type">{testFile.type}</div>
                            </div>
                          </div>
                          <div className="patient-file-actions">
                            <button 
                              onClick={() => handleTestFileSelect(test.id, test.testName)}
                              className="patient-replace-file-btn"
                            >
                              🔄 Replace
                            </button>
                            <button 
                              onClick={() => handleTestFileRemove(test.id)}
                              className="patient-file-remove-btn"
                            >
                              🗑️ Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="patient-upload-summary">
                <strong>Upload Progress:</strong>
                <br />
                Files Selected: {Object.keys(selectedTestFiles).length} / {currentUploadRequest.tests.length}
                <br />
                Total Size: {Object.values(selectedTestFiles).reduce((sum, file) => sum + file.size, 0) / 1024} KB
              </div>
            </div>

            <div className="patient-modal-actions">
              <button 
                onClick={() => {
                  setShowTestUploadModal(false);
                  setSelectedTestFiles({});
                  setCurrentUploadRequest(null);
                }}
                className="patient-modal-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleAllFilesUpload}
                disabled={Object.keys(selectedTestFiles).length < currentUploadRequest.tests.length || dataLoading}
                className="patient-modal-btn primary"
              >
                {dataLoading ? 'Uploading...' : `Submit All Files (${Object.keys(selectedTestFiles).length}/${currentUploadRequest.tests.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lab History Detail Modal */}
      {showLabHistoryModal && selectedLabHistory && (
        <div className="patient-modal-overlay">
          <div className="patient-modal large">
            <div className="patient-modal-header">
              <h3>Lab Test Details</h3>
              <button 
                onClick={() => {
                  setShowLabHistoryModal(false);
                  setSelectedLabHistory(null);
                  setLabHistoryFiles([]);
                }}
                className="patient-modal-close"
              >
                ✕
              </button>
            </div>
            
            <div className="patient-modal-content">
              {/* Patient Information */}
              <div className="patient-lab-detail-info">
                <h4>Patient Information</h4>
                <div className="patient-info-grid">
                  <div className="patient-info-item">
                    <label>Patient ID:</label>
                    <span>{patientInfo.patientId}</span>
                  </div>
                  <div className="patient-info-item">
                    <label>Name:</label>
                    <span>{patientInfo.name}</span>
                  </div>
                  <div className="patient-info-item">
                    <label>Age:</label>
                    <span>{patientInfo.age} years old</span>
                  </div>
                  <div className="patient-info-item">
                    <label>Sex:</label>
                    <span>{patientInfo.sex}</span>
                  </div>
                </div>
              </div>

              {/* Test Information */}
              <div className="patient-lab-detail-info">
                <h4>Test Information</h4>
                <div className="patient-info-grid">
                  <div className="patient-info-item">
                    <label>Test Name:</label>
                    <span>{selectedLabHistory.test_name}</span>
                  </div>
                  <div className="patient-info-item">
                    <label>Test Type:</label>
                    <span>{selectedLabHistory.test_type}</span>
                  </div>
                  <div className="patient-info-item">
                    <label>Request Date:</label>
                    <span>{new Date(selectedLabHistory.request_date).toLocaleDateString()}</span>
                  </div>
                  <div className="patient-info-item">
                    <label>Completion Date:</label>
                    <span>{selectedLabHistory.completion_date ? new Date(selectedLabHistory.completion_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Files Section */}
              <div className="patient-lab-files-section">
                <h4>Uploaded Files ({labHistoryFiles.length})</h4>
                {loadingLabFiles ? (
                  <div className="patient-loading-container">
                    <div className="patient-loading-spinner"></div>
                    <p>Loading files...</p>
                  </div>
                ) : labHistoryFiles.length === 0 ? (
                  <div className="patient-no-files">
                    <p>No files available for this test.</p>
                  </div>
                ) : (
                  <div className="patient-lab-files-list">
                    {labHistoryFiles.map((file, index) => (
                      <div key={index} className="patient-lab-file-item">
                        <div className="patient-file-info">
                          <div className="patient-file-icon">
                            {file.file_path && file.file_path.toLowerCase().includes('.pdf') ? '📄' : 
                            file.file_path && file.file_path.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? '🖼️' : '📎'}
                          </div>
                          <div className="patient-file-details">
                            <div className="patient-file-label">{file.test_name || `Test ${index + 1}`}</div>
                            <div className="patient-file-name">{file.file_name || 'Uploaded File'}</div>
                            <div className="patient-file-date">
                              Uploaded: {new Date(file.upload_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="patient-file-actions">
                          {file.file_path ? (
                            <button 
                              onClick={() => window.open(file.file_path, '_blank')}
                              className="patient-view-file-btn"
                            >
                              📄 View File
                            </button>
                          ) : (
                            <span className="no-file-available">No file available</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="patient-modal-actions">
              <button 
                onClick={() => {
                  setShowLabHistoryModal(false);
                  setSelectedLabHistory(null);
                  setLabHistoryFiles([]);
                }}
                className="patient-modal-btn secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical History Detail Modal */}
      {showHistoryModal && selectedVisit && (
        <div className="patient-modal-overlay">
          <div className="patient-modal large">
            <div className="patient-modal-header">
              <h3>Visit Details</h3>
              <button 
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedVisit(null);
                }}
                className="patient-modal-close"
              >
                ✕
              </button>
            </div>
            
            <div className="patient-modal-content">
              {/* Visit Information */}
              <div className="patient-history-detail-section">
                <h4>Visit Information</h4>
                <div className="patient-info-grid">
                  <div className="patient-info-item">
                    <label>Date:</label>
                    <span>{new Date(selectedVisit.visit_date).toLocaleDateString()}</span>
                  </div>
                  <div className="patient-info-item">
                    <label>Time:</label>
                    <span>{selectedVisit.visit_time}</span>
                  </div>
                  <div className="patient-info-item">
                    <label>Type:</label>
                    <span>{selectedVisit.appointment_type}</span>
                  </div>
                  <div className="patient-info-item">
                    <label>Department:</label>
                    <span>
                      {selectedVisit.queue && selectedVisit.queue.length > 0 && selectedVisit.queue[0].department 
                        ? selectedVisit.queue[0].department.name 
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Symptoms & Details */}
              <div className="patient-history-detail-section">
                <h4>Symptoms & Details</h4>
                <div className="patient-info-grid">
                  <div className="patient-info-item full-width">
                    <label>Symptoms:</label>
                    <span>{selectedVisit.symptoms || 'No symptoms recorded'}</span>
                  </div>
                  {selectedVisit.duration && (
                    <div className="patient-info-item">
                      <label>Duration:</label>
                      <span>{selectedVisit.duration}</span>
                    </div>
                  )}
                  {selectedVisit.severity && (
                    <div className="patient-info-item">
                      <label>Severity:</label>
                      <span>{selectedVisit.severity}</span>
                    </div>
                  )}
                  {selectedVisit.allergies && (
                    <div className="patient-info-item full-width">
                      <label>Allergies:</label>
                      <span>{selectedVisit.allergies}</span>
                    </div>
                  )}
                  {selectedVisit.medications && (
                    <div className="patient-info-item full-width">
                      <label>Current Medications:</label>
                      <span>{selectedVisit.medications}</span>
                    </div>
                  )}
                  {selectedVisit.previous_treatment && (
                    <div className="patient-info-item full-width">
                      <label>Previous Treatment:</label>
                      <span>{selectedVisit.previous_treatment}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnosis Information */}
              {selectedVisit.diagnosis && selectedVisit.diagnosis.length > 0 && (
                <div className="patient-history-detail-section">
                  <h4>Diagnosis</h4>
                  {selectedVisit.diagnosis.map((diag, index) => (
                    <div key={index} className="patient-diagnosis-detail">
                      <div className="patient-info-grid">
                        <div className="patient-info-item full-width">
                          <label>Diagnosis:</label>
                          <span>{diag.diagnosis_description}</span>
                        </div>
                        {diag.diagnosis_code && (
                          <div className="patient-info-item">
                            <label>Code:</label>
                            <span>{diag.diagnosis_code}</span>
                          </div>
                        )}
                        {diag.severity && (
                          <div className="patient-info-item">
                            <label>Severity:</label>
                            <span>{diag.severity}</span>
                          </div>
                        )}
                        {diag.diagnosis_type && (
                          <div className="patient-info-item">
                            <label>Type:</label>
                            <span>{diag.diagnosis_type}</span>
                          </div>
                        )}
                        {diag.notes && (
                          <div className="patient-info-item full-width">
                            <label>Notes:</label>
                            <span>{diag.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Doctor Information */}
                      {diag.healthStaff && (
                        <div className="patient-doctor-info">
                          <h5>Attending Doctor</h5>
                          <div className="patient-info-grid">
                            <div className="patient-info-item">
                              <label>Doctor:</label>
                              <span>Dr. {diag.healthStaff.name}</span>
                            </div>
                            <div className="patient-info-item">
                              <label>Specialization:</label>
                              <span>{diag.healthStaff.specialization || 'General Practice'}</span>
                            </div>
                            <div className="patient-info-item">
                              <label>Role:</label>
                              <span>{diag.healthStaff.role}</span>
                            </div>
                            {diag.healthStaff.license_no && (
                              <div className="patient-info-item">
                                <label>License No:</label>
                                <span>{diag.healthStaff.license_no}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="patient-diagnosis-date">
                        <small>Diagnosed on: {new Date(diag.created_at).toLocaleDateString()} at {new Date(diag.created_at).toLocaleTimeString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="patient-modal-actions">
              <button 
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedVisit(null);
                }}
                className="patient-modal-btn secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MobilePatientDashboard;