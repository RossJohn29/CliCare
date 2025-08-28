// admindashboard.js - Updated with Backend Integration + Using existing CSS structure
import React, { useState, useEffect } from 'react';
import './admindashboard.css';
import { adminApi, adminUtils } from '../../services/adminApi';

const AdminDashboard = () => {
  const [currentPage, setCurrentPage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [adminInfo, setAdminInfo] = useState({
    name: 'Loading...',
    role: 'Loading...',
    adminId: 'Loading...'
  });
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalPatients: 0,
      outPatients: 0,
      inPatients: 0,
      appointments: 0,
      activeStaff: 0,
      systemAlerts: 0
    },
    recentActivities: [],
    systemStatus: {
      server: 'online',
      database: 'online',
      backup: 'completed'
    }
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Authentication check
        if (!adminUtils.isAuthenticated()) {
          localStorage.clear();
          window.location.replace('/admin-login');
          return;
        }

        // Load admin info from localStorage
        const storedAdminInfo = adminUtils.getAdminInfo();
        if (storedAdminInfo) {
          setAdminInfo({
            name: adminUtils.formatAdminName(storedAdminInfo),
            role: adminUtils.formatAdminPosition(storedAdminInfo),
            adminId: storedAdminInfo.healthadmin_id || storedAdminInfo.healthadminid || 'Unknown ID'
          });
        } else {
          setAdminInfo({
            name: 'Admin User',
            role: 'Administrator',
            adminId: localStorage.getItem('adminId') || 'Unknown ID'
          });
        }

        setLoading(false);

      } catch (error) {
        console.error('Dashboard initialization error:', error);
        setError('Failed to initialize dashboard');
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      // Optional: Call logout API when you implement it
      // await adminApi.logout();
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      localStorage.clear();
      window.location.replace('/admin-login');
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
      ) : error ? (
        <div className="admin-placeholder">
          <div className="admin-placeholder-icon">❌</div>
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="admin-back-btn"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon">👥</div>
              <div className="admin-stat-content">
                <h3>Total Patients</h3>
                <div className="admin-stat-number">{dashboardData.stats.totalPatients}</div>
                <small>Active in system</small>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">🏥</div>
              <div className="admin-stat-content">
                <h3>Out-Patients</h3>
                <div className="admin-stat-number">{dashboardData.stats.outPatients}</div>
                <small>Registered today</small>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">🛏️</div>
              <div className="admin-stat-content">
                <h3>In-Patients</h3>
                <div className="admin-stat-number">{dashboardData.stats.inPatients}</div>
                <small>Currently admitted</small>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">📅</div>
              <div className="admin-stat-content">
                <h3>Appointments</h3>
                <div className="admin-stat-number">{dashboardData.stats.appointments}</div>
                <small>Scheduled</small>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">👨‍⚕️</div>
              <div className="admin-stat-content">
                <h3>Active Staff</h3>
                <div className="admin-stat-number">{dashboardData.stats.activeStaff}</div>
                <small>Online now</small>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon">🚨</div>
              <div className="admin-stat-content">
                <h3>System Alerts</h3>
                <div className="admin-stat-number">{dashboardData.stats.systemAlerts}</div>
                <small>Requires attention</small>
              </div>
            </div>
          </div>

          <div className="admin-content-grid">
            <div className="admin-activity-section">
              <h3>Recent Activity</h3>
              <div className="admin-activity-list">
                {dashboardData.recentActivities.map((activity) => (
                  <div key={activity.id} className="admin-activity-item">
                    <div className="admin-activity-time">{activity.time}</div>
                    <div className="admin-activity-content">
                      <div className="admin-activity-action">{activity.action}</div>
                      <div className="admin-activity-user">{activity.user}</div>
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
                    {dashboardData.systemStatus.backup === 'completed' ? '🟢 Completed' : '🟡 In Progress'}
                  </span>
                </div>
              </div>

              <div className="admin-quick-actions">
                <h4>Quick Actions</h4>
                <button className="admin-action-btn" onClick={() => window.location.reload()}>🔄 Refresh Data</button>
                <button className="admin-action-btn">📊 Generate Report</button>
                <button className="admin-action-btn">⚙️ System Settings</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderComingSoon = (icon, title, description) => (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="admin-placeholder">
        <div className="admin-placeholder-icon">{icon}</div>
        <h3>{title} Coming Soon</h3>
        <p>This feature will be available in the next update.</p>
        <button className="admin-back-btn" onClick={() => setCurrentPage('overview')}>
          Back to Overview
        </button>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'overview': 
        return renderOverview();
      case 'analytics': 
        return renderComingSoon('📈', 'Health Analytics', 'AI-generated health reports and insights');
      case 'system': 
        return renderComingSoon('⚙️', 'System Settings', 'Configure system parameters and maintenance');
      case 'reports': 
        return renderComingSoon('📋', 'Reports', 'Generate and manage system reports');
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
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <div className="admin-mobile-logo">
          <span className="admin-mobile-icon">🏥</span>
          <span className="admin-mobile-title">CLICARE</span>
        </div>
        <button 
          onClick={handleLogout} 
          className="admin-mobile-logout"
        >
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