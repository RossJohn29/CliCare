// mobilepatientdashboard.js
import React, { useState, useEffect } from 'react';
import './mobilepatientdashboard.css';

const MobilePatientDashboard = () => {
  const [currentPage, setCurrentPage] = useState('overview');
  const [patientInfo, setPatientInfo] = useState({
    patientId: '',
    name: '',
    email: '',
    contactNumber: ''
  });
  const [dashboardData, setDashboardData] = useState({
    todayStats: {
      myHistory: 0,
      labRequests: 0,
      labHistory: 0
    },
    recentActivity: [],
    pendingLabRequests: [],
    upcomingAppointments: []
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAppointmentConfirm, setShowAppointmentConfirm] = useState(false);

  useEffect(() => {
    // Load patient info from localStorage (changed from sessionStorage)
    const patientId = localStorage.getItem('patientId') || 'PAT001';
    const patientName = localStorage.getItem('patientName') || 'Patient User';
    const storedPatientInfo = localStorage.getItem('patientInfo');
    
    // Parse the full patient info if available
    let fullPatientInfo = {};
    if (storedPatientInfo) {
      try {
        fullPatientInfo = JSON.parse(storedPatientInfo);
      } catch (error) {
        console.warn('Failed to parse stored patient info:', error);
      }
    }
    
    setPatientInfo({
      patientId: fullPatientInfo.patient_id || patientId,
      name: fullPatientInfo.name || patientName,
      email: fullPatientInfo.email || 'patient@example.com',
      contactNumber: fullPatientInfo.contact_no || '09171234567',
      birthday: fullPatientInfo.birthday || '',
      age: fullPatientInfo.age || '',
      sex: fullPatientInfo.sex || '',
      address: fullPatientInfo.address || ''
    });

    // Mock dashboard data loading - keep this part the same
    const loadDashboardData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setDashboardData({
        todayStats: {
          myHistory: 8,
          labRequests: 3,
          labHistory: 12
        },
        recentActivity: [
          { time: '14:30', action: 'Lab results uploaded', department: 'Cardiology', status: 'success' },
          { time: '13:45', action: 'New lab request received', department: 'Internal Medicine', status: 'info' },
          { time: '12:20', action: 'Consultation completed', department: 'General Practice', status: 'success' },
          { time: '11:10', action: 'Blood test results ready', department: 'Laboratory', status: 'success' },
          { time: '10:30', action: 'X-ray uploaded successfully', department: 'Radiology', status: 'success' }
        ],
        pendingLabRequests: [
          { 
            id: 'LAB001', 
            test: 'Complete Blood Count (CBC)', 
            department: 'Internal Medicine', 
            doctor: 'Dr. Maria Santos',
            requestDate: '2025-08-08',
            dueDate: '2025-08-10',
            status: 'pending'
          },
          { 
            id: 'LAB002', 
            test: 'Lipid Profile', 
            department: 'Cardiology', 
            doctor: 'Dr. Juan Dela Cruz',
            requestDate: '2025-08-07',
            dueDate: '2025-08-09',
            status: 'pending'
          },
          { 
            id: 'LAB003', 
            test: 'Chest X-Ray', 
            department: 'Pulmonology', 
            doctor: 'Dr. Ana Reyes',
            requestDate: '2025-08-06',
            dueDate: '2025-08-08',
            status: 'overdue'
          }
        ],
        upcomingAppointments: [
          { date: '2025-08-10', time: '10:00 AM', department: 'Cardiology', doctor: 'Dr. Juan Dela Cruz' },
          { date: '2025-08-12', time: '2:00 PM', department: 'Internal Medicine', doctor: 'Dr. Maria Santos' }
        ]
      });
      setLoading(false);
    };

    loadDashboardData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.clear(); // Changed from sessionStorage
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

  const handleLabUpload = (labId) => {
    // Mock lab upload functionality
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        alert(`📋 Lab result uploaded successfully for ${labId}!\n\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB`);
        // In real app, would upload to server
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

      <div className="patient-lab-requests">
        {dashboardData.pendingLabRequests.map((request, index) => (
          <div key={index} className={`patient-lab-request-card ${request.status}`}>
            <div className="patient-lab-request-header">
              <div className="patient-lab-request-id">{request.id}</div>
              <div className={`patient-lab-status ${request.status}`}>
                {request.status === 'overdue' ? '⚠️ Overdue' : '⏳ Pending'}
              </div>
            </div>
            
            <div className="patient-lab-request-content">
              <h4>{request.test}</h4>
              <div className="patient-lab-details">
                <div className="patient-lab-detail-item">
                  <label>Department:</label>
                  <span>{request.department}</span>
                </div>
                <div className="patient-lab-detail-item">
                  <label>Doctor:</label>
                  <span>{request.doctor}</span>
                </div>
                <div className="patient-lab-detail-item">
                  <label>Request Date:</label>
                  <span>{request.requestDate}</span>
                </div>
                <div className="patient-lab-detail-item">
                  <label>Due Date:</label>
                  <span>{request.dueDate}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleLabUpload(request.id)}
              className="patient-upload-btn"
            >
              📤 Upload Result
            </button>
          </div>
        ))}
      </div>
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
        return renderPlaceholderPage('My History', 'Medical records and consultation history');
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
          <span className="patient-mobile-title">CliCare Patient</span>
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
              <h1>CliCare</h1>
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