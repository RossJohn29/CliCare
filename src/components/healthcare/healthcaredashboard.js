// healthcaredashboard.js
import React, { useState, useEffect } from 'react';
import './healthcaredashboard.css';

const validateHealthcareToken = async () => {
  const token = localStorage.getItem('healthcareToken');  // Changed from sessionStorage
  if (!token) return false;
  
  try {
    const response = await fetch('http://localhost:5000/api/healthcare/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

const HealthcareDashboard = () => {
  const [currentPage, setCurrentPage] = useState('overview');
  const [staffInfo, setStaffInfo] = useState({
    staffId: '',
    name: '',
    role: '',
    department: '',
    staffType: ''
  });
  const [dashboardData, setDashboardData] = useState({
    todayStats: {
      myPatients: 0,
      labResults: 0
    },
    recentActivity: [],
    patientQueue: [],
    notifications: []
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
  const initializeDashboard = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('healthcareToken'); 
      const staffInfo = localStorage.getItem('staffInfo');   
      
      if (!token || !staffInfo) {
        window.location.replace('/healthcare-login');
        return;
      }

      // Validate token
      const isValid = await validateHealthcareToken();
      if (!isValid) {
        localStorage.clear();  // Changed from sessionStorage
        window.location.replace('/healthcare-login');
        return;
      }

      // Parse and validate staff info
      const parsedStaffInfo = JSON.parse(staffInfo);
      
      // Only allow doctors
      if (parsedStaffInfo.role !== 'Doctor') {
        alert('Access denied. This system is for doctors only.');
        window.location.replace('/healthcare-login');
        return;
      }
      
      // Set staff info state
      setStaffInfo({
        staffId: parsedStaffInfo.staff_id,
        name: parsedStaffInfo.name,
        role: 'Attending Physician',
        department: parsedStaffInfo.specialization || 'General Medicine',
        staffType: 'doctor'
      });

      // Load dashboard data
      const loadDashboardData = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setDashboardData({
          todayStats: { 
            myPatients: 12, 
            labResults: 8 
          },
          recentActivity: [
            { time: '14:45', action: 'Patient consultation completed', patient: 'PAT789', status: 'success' },
            { time: '14:30', action: 'Lab results reviewed', patient: 'PAT456', status: 'success' },
            { time: '14:15', action: 'Prescription updated', patient: 'PAT123', status: 'success' },
            { time: '13:50', action: 'New lab order created', patient: 'PAT321', status: 'info' },
            { time: '13:35', action: 'Patient history updated', patient: 'PAT654', status: 'success' }
          ],
          patientQueue: [
            { time: '15:00', patient: 'Maria Cruz', id: 'PAT001', status: 'waiting', priority: 'normal' },
            { time: '15:15', patient: 'John Santos', id: 'PAT002', status: 'ready', priority: 'urgent' },
            { time: '15:30', patient: 'Ana Garcia', id: 'PAT003', status: 'scheduled', priority: 'normal' },
            { time: '15:45', patient: 'Carlos Reyes', id: 'PAT004', status: 'waiting', priority: 'high' },
            { time: '16:00', patient: 'Lisa Tan', id: 'PAT005', status: 'scheduled', priority: 'normal' }
          ]
        });
        setLoading(false);
      };

      loadDashboardData();

    } catch (error) {
      console.error('Error parsing staff info:', error);
      localStorage.clear();  // Changed from sessionStorage
      window.location.replace('/healthcare-login');
    }
  };

  initializeDashboard();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.clear();  // Changed from sessionStorage
      window.location.replace('/healthcare-login');
    }
  };

  const getMenuItems = () => {
    return [
      { id: 'overview', icon: '📊', label: 'Dashboard Overview', description: 'Daily statistics and activities' },
      { id: 'patients', icon: '👥', label: 'My Patients', description: 'Patient records and consultations' },
      { id: 'lab-orders', icon: '🧪', label: 'Lab Orders', description: 'Laboratory test requests' }
    ];
  };

  const renderOverview = () => (
    <div className="healthcare-page-content">
      <div className="healthcare-page-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back, {staffInfo.name}</p>
      </div>

      {loading ? (
        <div className="healthcare-loading-container">
          <div className="healthcare-loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="healthcare-stats-grid">
            <div className="healthcare-stat-card">
              <div className="healthcare-stat-icon">👥</div>
              <div className="healthcare-stat-content">
                <h3>My Patients</h3>
                <div className="healthcare-stat-number">{dashboardData.todayStats.myPatients}</div>
                <small>Today's consultations</small>
              </div>
            </div>

            <div className="healthcare-stat-card">
              <div className="healthcare-stat-icon">🧪</div>
              <div className="healthcare-stat-content">
                <h3>Lab Results</h3>
                <div className="healthcare-stat-number">{dashboardData.todayStats.labResults}</div>
                <small>Available to review</small>
              </div>
            </div>
          </div>

          <div className="healthcare-content-grid">
            <div className="healthcare-activity-section">
              <h3>Recent Activity</h3>
              <div className="healthcare-activity-list">
                {dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="healthcare-activity-item">
                    <div className="healthcare-activity-time">{activity.time}</div>
                    <div className="healthcare-activity-content">
                      <div className="healthcare-activity-action">{activity.action}</div>
                      <div className="healthcare-activity-patient">
                        Patient: {activity.patient}
                      </div>
                    </div>
                    <div className={`healthcare-activity-status ${activity.status}`}>
                      {activity.status === 'success' ? '✅' : 
                       activity.status === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="healthcare-queue-section">
              <h3>Patient Queue</h3>
              <div className="healthcare-queue-list">
                {dashboardData.patientQueue.map((item, index) => (
                  <div key={index} className="healthcare-queue-item">
                    <div className="healthcare-queue-time">{item.time}</div>
                    <div className="healthcare-queue-content">
                      <div className="healthcare-queue-patient">{item.patient}</div>
                      <div className="healthcare-queue-id">{item.id}</div>
                      <div className="healthcare-queue-status">{item.status}</div>
                    </div>
                    <div className={`healthcare-queue-priority ${item.priority}`}>
                      {item.priority === 'urgent' ? '🔴' : 
                       item.priority === 'high' ? '🟡' : '🟢'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="healthcare-quick-actions">
                <h4>Quick Actions</h4>
                <button className="healthcare-action-btn">👥 View All Patients</button>
                <button className="healthcare-action-btn">💊 New Prescription</button>
                <button className="healthcare-action-btn">🧪 Order Lab Test</button>
                <button className="healthcare-action-btn">📋 Patient History</button>
                <button className="healthcare-action-btn">📝 Medical Notes</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderPlaceholderPage = (title, description) => (
    <div className="healthcare-page-content">
      <div className="healthcare-page-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="healthcare-placeholder">
        <div className="healthcare-placeholder-icon">🚧</div>
        <h3>Coming Soon</h3>
        <p>This feature is currently under development and will be available in the next release.</p>
        <button 
          onClick={() => setCurrentPage('overview')}
          className="healthcare-back-btn"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    if (currentPage === 'overview') {
      return renderOverview();
    }
    
    const menuItems = getMenuItems();
    const currentItem = menuItems.find(item => item.id === currentPage);
    
    if (currentItem) {
      return renderPlaceholderPage(currentItem.label, currentItem.description);
    }
    
    return renderOverview();
  };

  return (
    <div className="healthcare-dashboard">
      {/* Mobile Header */}
      <div className="healthcare-mobile-header">
        <button 
          className="healthcare-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <div className="healthcare-mobile-logo">
          <span className="healthcare-mobile-icon">🏥</span>
          <span className="healthcare-mobile-title">CliCare Healthcare</span>
        </div>
        <button className="healthcare-mobile-logout" onClick={handleLogout}>
          🚪
        </button>
      </div>

      {/* Sidebar */}
      <div className={`healthcare-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="healthcare-sidebar-header">
          <div className="healthcare-sidebar-logo">
            <span className="healthcare-sidebar-icon">🏥</span>
            <div className="healthcare-sidebar-text">
              <h1>CliCare</h1>
              <p>Healthcare Portal</p>
            </div>
          </div>
          <button 
            className="healthcare-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="healthcare-user-info">
          <div className="healthcare-user-avatar">👨‍⚕️</div>
          <div className="healthcare-user-details">
            <div className="healthcare-user-name">{staffInfo.name}</div>
            <div className="healthcare-user-role">{staffInfo.role}</div>
            <div className="healthcare-user-department">{staffInfo.department}</div>
            <div className="healthcare-user-id">{staffInfo.staffId}</div>
          </div>
        </div>

        <nav className="healthcare-navigation">
          {getMenuItems().map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false);
              }}
              className={`healthcare-nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="healthcare-nav-icon">{item.icon}</span>
              <div className="healthcare-nav-content">
                <div className="healthcare-nav-label">{item.label}</div>
                <div className="healthcare-nav-description">{item.description}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="healthcare-sidebar-footer">
          <button onClick={handleLogout} className="healthcare-logout-btn">
            <span>🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="healthcare-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="healthcare-main-content">
        {renderCurrentPage()}
      </div>
    </div>
  );
};

export default HealthcareDashboard;