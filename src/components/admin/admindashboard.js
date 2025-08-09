// admindashboard.js - CLICARE Admin Dashboard Component
import React, { useState, useEffect } from 'react';
import './admindashboard.css';

const AdminDashboard = () => {
  const [currentPage, setCurrentPage] = useState('overview');
  const [adminInfo, setAdminInfo] = useState({
    adminId: '',
    name: '',
    role: ''
  });
  const [dashboardData, setDashboardData] = useState({
    todayStats: {
      totalPatients: 0,
      newRegistrations: 0,
      appointments: 0,
      labRequests: 0
    },
    recentActivity: [],
    systemStatus: {
      server: 'online',
      database: 'online',
      backup: 'completed'
    }
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Load admin info from session
    const adminId = sessionStorage.getItem('adminId') || 'ADMIN001';
    setAdminInfo({
      adminId: adminId,
      name: adminId === 'ADMIN999' ? 'Super Administrator' : 'Hospital Administrator',
      role: adminId === 'ADMIN999' ? 'System Admin' : 'Department Admin'
    });

    // Mock dashboard data loading
    const loadDashboardData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setDashboardData({
        todayStats: {
          totalPatients: 247,
          newRegistrations: 18,
          appointments: 156,
          labRequests: 89
        },
        recentActivity: [
          { time: '14:32', action: 'New patient registration', user: 'PAT789', status: 'success' },
          { time: '14:28', action: 'Lab result uploaded', user: 'DR001', status: 'success' },
          { time: '14:25', action: 'System backup completed', user: 'SYSTEM', status: 'info' },
          { time: '14:20', action: 'Department queue updated', user: 'AUTO', status: 'success' },
          { time: '14:15', action: 'Emergency contact called', user: 'NURSE03', status: 'warning' }
        ],
        systemStatus: {
          server: 'online',
          database: 'online',
          backup: 'completed'
        }
      });
      setLoading(false);
    };

    loadDashboardData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminId');
      window.location.href = '/admin-login';
    }
  };

  const menuItems = [
    { id: 'overview', icon: '📊', label: 'Dashboard Overview', description: 'System statistics and analytics' },
    { id: 'analytics', icon: '📈', label: 'Health Analytics', description: 'AI-generated health reports' },
    { id: 'system', icon: '⚙️', label: 'System Settings', description: 'Configuration and maintenance' },
    { id: 'reports', icon: '📋', label: 'Reports', description: 'Generate system reports' }
  ];

  const renderOverview = () => (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h2>Dashboard Overview</h2>
        <p>Real-time hospital management statistics</p>
      </div>

      {loading ? (
        <div className="admin-loading-container">
          <div className="admin-loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon">👥</div>
              <div className="admin-stat-content">
                <h3>Total Patients Today</h3>
                <div className="admin-stat-number">{dashboardData.todayStats.totalPatients}</div>
                <small>+12% from yesterday</small>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">✨</div>
              <div className="admin-stat-content">
                <h3>New Registrations</h3>
                <div className="admin-stat-number">{dashboardData.todayStats.newRegistrations}</div>
                <small>+5% from yesterday</small>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">📅</div>
              <div className="admin-stat-content">
                <h3>Appointments</h3>
                <div className="admin-stat-number">{dashboardData.todayStats.appointments}</div>
                <small>3 pending confirmations</small>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">🧪</div>
              <div className="admin-stat-content">
                <h3>Lab Requests</h3>
                <div className="admin-stat-number">{dashboardData.todayStats.labRequests}</div>
                <small>15 results pending</small>
              </div>
            </div>
          </div>

          <div className="admin-content-grid">
            <div className="admin-activity-section">
              <h3>Recent Activity</h3>
              <div className="admin-activity-list">
                {dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="admin-activity-item">
                    <div className="admin-activity-time">{activity.time}</div>
                    <div className="admin-activity-content">
                      <div className="admin-activity-action">{activity.action}</div>
                      <div className="admin-activity-user">by {activity.user}</div>
                    </div>
                    <div className={`admin-activity-status ${activity.status}`}>
                      {activity.status === 'success' ? '✅' : 
                       activity.status === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-status-section">
              <h3>System Status</h3>
              <div className="admin-status-list">
                <div className="admin-status-item">
                  <span className="admin-status-label">Server Status</span>
                  <span className={`admin-status-badge ${dashboardData.systemStatus.server}`}>
                    {dashboardData.systemStatus.server === 'online' ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </div>
                <div className="admin-status-item">
                  <span className="admin-status-label">Database</span>
                  <span className={`admin-status-badge ${dashboardData.systemStatus.database}`}>
                    {dashboardData.systemStatus.database === 'online' ? '🟢 Connected' : '🔴 Error'}
                  </span>
                </div>
                <div className="admin-status-item">
                  <span className="admin-status-label">Last Backup</span>
                  <span className={`admin-status-badge ${dashboardData.systemStatus.backup}`}>
                    {dashboardData.systemStatus.backup === 'completed' ? '🟢 2 hours ago' : '🟡 Pending'}
                  </span>
                </div>
              </div>

              <div className="admin-quick-actions">
                <h4>Quick Actions</h4>
                <button className="admin-action-btn">📊 Generate Daily Report</button>
                <button className="admin-action-btn">🔄 Run System Backup</button>
                <button className="admin-action-btn">📢 Send Announcement</button>
                <button className="admin-action-btn">⚙️ System Maintenance</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderPlaceholderPage = (title, description) => (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="admin-placeholder">
        <div className="admin-placeholder-icon">🚧</div>
        <h3>Coming Soon</h3>
        <p>This feature is currently under development and will be available in the next release.</p>
        <button 
          onClick={() => setCurrentPage('overview')}
          className="admin-back-btn"
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
      case 'patients':
        return renderPlaceholderPage('Patient Management', 'Comprehensive patient record management system');
      case 'staff':
        return renderPlaceholderPage('Staff Management', 'Healthcare provider account administration');
      case 'analytics':
        return renderPlaceholderPage('Health Analytics', 'AI-powered health trend analysis and reporting');
      case 'system':
        return renderPlaceholderPage('System Settings', 'System configuration and maintenance tools');
      case 'reports':
        return renderPlaceholderPage('Reports', 'Generate comprehensive system and health reports');
      default:
        return renderOverview();
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Mobile Header */}
      <div className="admin-mobile-header">
        <button 
          className="admin-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <div className="admin-mobile-logo">
          <span className="admin-mobile-icon">🏥</span>
          <span className="admin-mobile-title">CLICARE Admin</span>
        </div>
        <button className="admin-mobile-logout" onClick={handleLogout}>
          🚪
        </button>
      </div>

      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <span className="admin-sidebar-icon">🏥</span>
            <div className="admin-sidebar-text">
              <h1>CLICARE</h1>
              <p>Admin Portal</p>
            </div>
          </div>
          <button 
            className="admin-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="admin-user-info">
          <div className="admin-user-avatar">👨‍💼</div>
          <div className="admin-user-details">
            <div className="admin-user-name">{adminInfo.name}</div>
            <div className="admin-user-role">{adminInfo.role}</div>
            <div className="admin-user-id">{adminInfo.adminId}</div>
          </div>
        </div>

        <nav className="admin-navigation">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false);
              }}
              className={`admin-nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <div className="admin-nav-content">
                <div className="admin-nav-label">{item.label}</div>
                <div className="admin-nav-description">{item.description}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="admin-logout-btn">
            <span>🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="admin-main-content">
        {renderCurrentPage()}
      </div>
    </div>
  );
};

export default AdminDashboard;