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
        window.location.href = '/mobile-patient-login';
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
    // Fetch real lab requests from backend
    const labRequests = await fetchLabRequests();
    const visitHistory = await fetchPatientHistory();
    
    setDashboardData({
      todayStats: {
        myHistory: visitHistory.length || 8,
        labRequests: labRequests.filter(req => req.status === 'pending').length || 0,
        labHistory: labRequests.filter(req => req.status === 'completed').length || 0
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
      visitHistory: visitHistory
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
    if (window.confirm('Are you sure you want to logout?')) {
      // Clear all stored data
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login
      window.location.replace('/mobile-patient-login');
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
  // Create file input for lab upload
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,application/pdf,.doc,.docx';
  fileInput.multiple = false;
  
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      // Show loading
      setDataLoading(true);

      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('labResultFile', file);
        formData.append('labRequestId', labRequestId);
        formData.append('patientId', patientInfo.patientId);

        const token = localStorage.getItem('patientToken');
        
        // Upload to backend
        const response = await fetch('http://localhost:5000/api/patient/upload-lab-result', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: formData
        });

        const result = await response.json();

        if (response.ok) {
          alert(`📋 Lab result uploaded successfully!\n\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\n\nThe result has been sent to your doctor for review.`);
          
          // Refresh lab requests to update status
          await loadDashboardData();
        } else {
          throw new Error(result.error || 'Upload failed');
        }
        
      } catch (error) {
        console.error('Lab upload error:', error);
        alert(`Failed to upload lab result: ${error.message}\nPlease try again.`);
      } finally {
        setDataLoading(false);
      }
    }
  };
  
  fileInput.click();
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
            <div className="patient-history-list">
              {dashboardData.visitHistory.map((visit, index) => (
                <div key={index} className="patient-history-item">
                  <div className="patient-history-date">
                    {visit.visit_date} at {visit.visit_time}
                  </div>
                  <div className="patient-history-content">
                    <h4>{visit.appointment_type}</h4>
                    <p><strong>Symptoms:</strong> {visit.symptoms}</p>
                    {visit.diagnosis && (
                      <p><strong>Diagnosis:</strong> {visit.diagnosis.diagnosis_description}</p>
                    )}
                    {visit.department && (
                      <p><strong>Department:</strong> {visit.department.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

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
        return renderPlaceholderPage('Lab History', 'Previous laboratory test results');
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
    </div>
  );
};

export default MobilePatientDashboard;