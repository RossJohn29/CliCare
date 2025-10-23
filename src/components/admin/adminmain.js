// adminmain.js
import React, { useState, useEffect } from 'react';
import './adminmain.css';
import clicareLogo from "../../clicareLogo.png";
import logo from "../../logo.png";
import { adminApi, adminUtils } from '../../services/adminApi';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { 
  ChartSpline,
  UserStar,
  Users,
  BotMessageSquare,
  UserPlus,
  CalendarArrowUp,
  TriangleAlert,
  Search,
  X,
  FunnelX,
  ArrowUp,
  ArrowDown,
  UserX,
  LogOut
} from 'lucide-react';

const AdminMain = () => {
  const [currentPage, setCurrentPage] = useState('patient-overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState([]);
  const [patientData, setPatientData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState('daily');
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [adminInfo, setAdminInfo] = useState({
    name: 'Loading...',
    role: 'Loading...',
    adminId: 'Loading...'
  });

  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalRegisteredPatients: 0,
      outPatientToday: 0,
      activeConsultants: 0,
      appointmentsToday: 0
    },
    trends: { patients: 0 },
    topHealthTrends: [],
    systemAlerts: [],
    patientFlow: {
      registration: 0,
      consultation: 0,
      completed: 0
    },
    averageWaitTime: 0,
    timeSeriesData: []
  });

  const [filters, setFilters] = useState({
    role: 'all',
    department: 'all',
    status: 'all',
    specialization: 'all',
    sex: 'all',
    ageRange: [0, 100],
    registrationDateFrom: '',
    registrationDateTo: '',
    visitStatus: 'all'
  });

  const menuItems = [
    { id: 'patient-overview', icon: <ChartSpline size={18} />, label: 'Dashboard', description: 'System statistics' },
    { id: 'doctor-staff', icon: <UserStar size={18} />, label: 'Doctor & Staff', description: 'Staff management' },
    { id: 'out-patient', icon: <Users size={18} />, label: 'Out Patient', description: 'Outpatient records' },
    { id: 'chatbot', icon: <BotMessageSquare size={18} />, label: 'Chatbot', description: 'AI-driven analytics' }
  ];

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (!adminUtils.isAuthenticated()) {
          localStorage.clear();
          window.location.replace('/admin-login');
          return;
        }

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

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (currentPage === 'patient-overview') {
        try {
          setStatsLoading(true);
          const [statsResponse, timeSeriesData] = await Promise.all([
            fetch('http://localhost:5000/api/admin/dashboard-stats', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            }),
            fetchTimeSeriesData(timePeriod)
          ]);
          
          if (statsResponse.ok) {
            const data = await statsResponse.json();
            setDashboardData({
              stats: data.stats,
              trends: data.trends || { patients: 0 },
              topHealthTrends: data.topHealthTrends || [],
              systemAlerts: data.systemAlerts || [],
              patientFlow: data.patientFlow || { registration: 0, consultation: 0, completed: 0 },
              averageWaitTime: data.averageWaitTime || 0,
              timeSeriesData: timeSeriesData
            });
          }
        } catch (error) {
          console.error('Failed to fetch dashboard stats:', error);
        } finally {
          setStatsLoading(false);
        }
      }
    };

    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, [currentPage, timePeriod]);

  useEffect(() => {
    if (currentPage === 'doctor-staff') {
      fetchStaffData();
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (currentPage === 'out-patient') {
      fetchPatientData();
    }
  }, [currentPage, searchQuery]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/admin/staff?search=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
     
      if (response.ok) {
        const data = await response.json();
        setStaffData(data.staff);
      }
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
      setError('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/admin/patients?search=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
     
      if (response.ok) {
        const data = await response.json();
        setPatientData(data.patients);
      }
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSeriesData = async (period) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/time-series-stats?period=${period}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.timeSeriesData || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch time series data:', error);
      return [];
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      localStorage.clear();
      window.location.replace('/admin-login');
    }
  };

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    setTimeout(() => {
      const textarea = document.querySelector('.adminmain-chat-input');
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = '48px';
      }
    }, 0);
    
    try {
      const hospitalData = {
        totalRegisteredPatients: dashboardData.stats.totalRegisteredPatients,
        outPatientToday: dashboardData.stats.outPatientToday,
        activeConsultants: dashboardData.stats.activeConsultants,
        appointmentsToday: dashboardData.stats.appointmentsToday,
        patientSummary: patientData.slice(0, 50).map(p => ({
          age: p.age,
          sex: p.sex,
          registrationDate: p.registration_date
        })),
        staffSummary: staffData.map(s => ({
          role: s.role,
          department: s.department_name,
          isOnline: s.is_online
        }))
      };

      const response = await fetch('http://localhost:5000/api/admin/analyze-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          query: chatInput,
          hospitalData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze data');
      }

      const aiResponse = await response.json();
     
      const botMessage = {
        role: 'assistant',
        content: aiResponse.textResponse,
        chartType: aiResponse.chartType,
        chartData: aiResponse.chartData,
        chartTitle: aiResponse.chartTitle
      };
     
      setChatMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error analyzing the data. Please try again.'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleTimePeriodChange = async (newPeriod) => {
    setTimePeriod(newPeriod);
    setStatsLoading(true);
    const timeSeriesData = await fetchTimeSeriesData(newPeriod);
    setDashboardData(prev => ({
      ...prev,
      timeSeriesData: timeSeriesData
    }));
    setStatsLoading(false);
  };

  const getUniqueRoles = () => {
    const roles = [...new Set(staffData.map(s => s.role))];
    return roles.filter(Boolean);
  };

  const getUniqueDepartments = () => {
    const departments = [...new Set(staffData.map(s => s.department_name))];
    return departments.filter(Boolean);
  };

  const getUniqueSpecializations = () => {
    const specializations = [...new Set(staffData.map(s => s.specialization))];
    return specializations.filter(Boolean);
  };

  const getFilteredStaff = () => {
    let filtered = [...staffData];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(staff => 
        staff.name.toLowerCase().includes(query) ||
        staff.staff_id.toLowerCase().includes(query) ||
        staff.role.toLowerCase().includes(query) ||
        (staff.specialization && staff.specialization.toLowerCase().includes(query)) ||
        (staff.department_name && staff.department_name.toLowerCase().includes(query)) ||
        (staff.contact_no && staff.contact_no.includes(query)) ||
        (staff.license_no && staff.license_no.toLowerCase().includes(query))
      );
    }
    
    if (filters.role !== 'all') {
      filtered = filtered.filter(s => s.role === filters.role);
    }
    if (filters.department !== 'all') {
      filtered = filtered.filter(s => s.department_name === filters.department);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(s => 
        filters.status === 'online' ? s.is_online : !s.is_online
      );
    }
    if (filters.specialization !== 'all') {
      filtered = filtered.filter(s => s.specialization === filters.specialization);
    }
    
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'role') {
        return a.role.localeCompare(b.role);
      } else if (sortBy === 'status') {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return 0;
      }
      return 0;
    });
    
    return filtered;
  };

  const getFilteredPatients = () => {
    let filtered = [...patientData];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(patient => 
        patient.name.toLowerCase().includes(query) ||
        patient.patient_id.toLowerCase().includes(query) ||
        (patient.contact_no && patient.contact_no.includes(query)) ||
        (patient.email && patient.email.toLowerCase().includes(query)) ||
        patient.sex.toLowerCase().includes(query)
      );
    }
    
    if (filters.sex !== 'all') {
      filtered = filtered.filter(p => p.sex.toLowerCase() === filters.sex.toLowerCase());
    }
    
    filtered = filtered.filter(p => 
      p.age >= filters.ageRange[0] && p.age <= filters.ageRange[1]
    );
    
    if (filters.visitStatus === 'recent') {
      filtered = filtered.filter(p => p.last_visit);
    } else if (filters.visitStatus === 'none') {
      filtered = filtered.filter(p => !p.last_visit);
    }
    
    if (filters.registrationDateFrom) {
      filtered = filtered.filter(p => 
        new Date(p.registration_date) >= new Date(filters.registrationDateFrom)
      );
    }
    if (filters.registrationDateTo) {
      filtered = filtered.filter(p => 
        new Date(p.registration_date) <= new Date(filters.registrationDateTo)
      );
    }
    
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'age') {
        return a.age - b.age;
      } else if (sortBy === 'recent') {
        return new Date(b.registration_date) - new Date(a.registration_date);
      }
      return 0;
    });
    
    return filtered;
  };

  const resetFilters = () => {
    setFilters({
      role: 'all',
      department: 'all',
      status: 'all',
      specialization: 'all',
      sex: 'all',
      ageRange: [0, 100],
      registrationDateFrom: '',
      registrationDateTo: '',
      visitStatus: 'all'
    });
    setSearchQuery('');
  };

  const parseMarkdown = (text) => {
    if (!text) return '';
    
    const paragraphs = text.split(/\n\n+/);
    
    const parsed = paragraphs.map(paragraph => {
      let result = paragraph;
      
      result = result
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>');
      
      result = result.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');
      result = result.replace(/`(.+?)`/g, '<code>$1</code>');
      
      const numberedListMatch = result.match(/^\d+\.\s+.+$/m);
      if (numberedListMatch) {
        const lines = result.split('\n');
        let listItems = [];
        let normalText = [];
        
        lines.forEach(line => {
          const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
          if (numberedMatch) {
            if (normalText.length > 0) {
              result = normalText.join('<br/>');
              normalText = [];
            }
            listItems.push(`<li>${numberedMatch[2]}</li>`);
          } else if (line.match(/^[\*\-]\s+(.+)$/)) {
            const bulletMatch = line.match(/^[\*\-]\s+(.+)$/);
            if (normalText.length > 0) {
              result = normalText.join('<br/>');
              normalText = [];
            }
            listItems.push(`<li>${bulletMatch[1]}</li>`);
          } else {
            if (listItems.length > 0) {
              result = `<ol>${listItems.join('')}</ol>`;
              listItems = [];
            }
            normalText.push(line);
          }
        });
        
        if (listItems.length > 0) {
          result = `<ol>${listItems.join('')}</ol>`;
        } else if (normalText.length > 0) {
          result = normalText.join('<br/>');
        }
      } else {
        const bulletMatch = result.match(/^[\*\-]\s+.+$/m);
        if (bulletMatch) {
          const lines = result.split('\n');
          const listItems = lines
            .filter(line => line.match(/^[\*\-]\s+(.+)$/))
            .map(line => {
              const match = line.match(/^[\*\-]\s+(.+)$/);
              return `<li>${match[1]}</li>`;
            });
          result = `<ul>${listItems.join('')}</ul>`;
        }
      }
      
      result = result
        .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');
      
      if (!result.includes('<ol>') && !result.includes('<ul>') && !result.includes('<pre>')) {
        result = result.replace(/\n/g, '<br/>');
      }
      
      return result;
    }).join('</p><p>');
    
    return `<p>${parsed}</p>`;
  };

  const renderChart = (type, data, title) => {
    const COLORS = ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#a142f4', '#f538a0'];
   
    if (type === 'bar') {
      return (
        <div className="adminmain-chart-container">
          <h4 className="adminmain-chart-title">{title}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" className="adminmain-chart-axis" />
              <YAxis className="adminmain-chart-axis" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#4285f4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
   
    if (type === 'pie') {
      return (
        <div className="adminmain-chart-container">
          <h4 className="adminmain-chart-title">{title}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }
   
    if (type === 'line') {
      return (
        <div className="adminmain-chart-container">
          <h4 className="adminmain-chart-title">{title}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" className="adminmain-chart-axis" />
              <YAxis className="adminmain-chart-axis" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#4285f4" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
   
    return null;
  };

  const renderPatientOverview = () => (
    <div className="adminmain-page-content">
      {loading ? (
        <div className="adminmain-loading-container">
          <div className="adminmain-loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : error ? (
        <div className="adminmain-placeholder">
          <div className="adminmain-placeholder-icon">❌</div>
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="adminmain-back-btn">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="adminmain-stats-grid">
            <div className="adminmain-flow-card">
              <div className="adminmain-page-header">
                <div className="adminmain-header-left">
                  <h2>Dashboard</h2>
                  <p>Patient activity over time</p>
                </div>
                <div className="adminmain-header-right">
                  <div className="adminmain-time-period-selector">
                    <button 
                      className={`adminmain-period-btn ${timePeriod === 'daily' ? 'active' : ''}`}
                      onClick={() => handleTimePeriodChange('daily')}
                    >
                      Daily
                    </button>
                    <button 
                      className={`adminmain-period-btn ${timePeriod === 'weekly' ? 'active' : ''}`}
                      onClick={() => handleTimePeriodChange('weekly')}
                    >
                      Weekly
                    </button>
                    <button 
                      className={`adminmain-period-btn ${timePeriod === 'yearly' ? 'active' : ''}`}
                      onClick={() => handleTimePeriodChange('yearly')}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={dashboardData.timeSeriesData || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    className="adminmain-chart-axis-small" 
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      if (timePeriod === 'daily') {
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      } else if (timePeriod === 'weekly') {
                        return `Week ${Math.ceil(date.getDate() / 7)}`;
                      } else {
                        return date.getFullYear().toString();
                      }
                    }}
                  />
                  <YAxis 
                    className="adminmain-chart-axis-small" 
                    tick={{ fill: '#6b7280' }}
                    label={{ value: 'Number of Patients', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.75em'
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      fontSize: '0.75em',
                      fontFamily: 'inherit',
                      fontWeight: '400',
                    }}
                  />
                  
                  <Line 
                    type="monotone" 
                    dataKey="registrations" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Registrations"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                  
                  <Line 
                    type="monotone" 
                    dataKey="appointments" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Appointments"
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 4, stroke: '#f59e0b', strokeWidth: 2 }}
                  />
                  
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Completed"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="adminmain-middle-section">
            <div className="adminmain-stat-card hexagon primary">
              <div className="adminmain-stat-card-inner">
                <div className="adminmain-stat-icon"><Users size={20} /></div>
                <div className="adminmain-stat-content">
                  <h3>Total Registered Patients</h3>
                  <div className="adminmain-stat-number-row">
                    <div className="adminmain-stat-number">{dashboardData.stats.totalRegisteredPatients}</div>
                    {dashboardData.trends?.patients !== undefined && (
                      <small className={`adminmain-stat-trend ${parseFloat(dashboardData.trends.patients) >= 0 ? 'positive' : 'negative'}`}>
                        {parseFloat(dashboardData.trends.patients) >= 0 ? (
                          <ArrowUp className="text-green-500 inline-block" size={10}/>
                        ) : (
                          <ArrowDown className="text-red-500 inline-block" size={10} />
                        )}
                        {Math.abs(parseFloat(dashboardData.trends.patients)).toFixed(1)}%
                      </small>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="adminmain-stat-card hexagon secondary">
              <div className="adminmain-stat-card-inner">
                <div className="adminmain-stat-icon"><UserPlus size={20} /></div>
                <div className="adminmain-stat-content">
                  <h3>Out-Patients Today</h3>
                  <div className="adminmain-stat-number">{dashboardData.stats.outPatientToday}</div>
                </div>
              </div>
            </div>

            <div className="adminmain-stat-card hexagon tertiary">
              <div className="adminmain-stat-card-inner">
                <div className="adminmain-stat-icon"><UserStar size={20} /></div>
                <div className="adminmain-stat-content">
                  <h3>Active Consultant</h3>
                  <div className="adminmain-stat-number">{dashboardData.stats.activeConsultants}</div>
                </div>
              </div>
            </div>

            <div className="adminmain-stat-card hexagon quaternary">
              <div className="adminmain-stat-card-inner">
                <div className="adminmain-stat-icon"><CalendarArrowUp size={20} /></div>
                <div className="adminmain-stat-content">
                  <h3>Appointments Today</h3>
                  <div className="adminmain-stat-number">{dashboardData.stats.appointmentsToday}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="adminmain-bottom-section">
            <div className="adminmain-middle-column adminmain-left-column">
              <div className="adminmain-analytics-card adminmain-trends-card">
                <div className="adminmain-card-header">
                  <div className="adminmain-analytics-trends-icon"><ChartSpline size={20} /></div>
                  <div className="adminmain-header-text">
                    <h4>Top 3 Daily Health Trends</h4>
                    <small className="adminmain-analytics-subtitle">Most Common Symptoms Today</small>
                  </div>
                </div>
                {dashboardData.topHealthTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dashboardData.topHealthTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" className="adminmain-chart-axis-small" />
                      <YAxis className="adminmain-chart-axis-small" />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {dashboardData.topHealthTrends.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#de4924ff', '#fc6a08ff', '#e8b00aff'][index % 3]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="adminmain-empty-chart-state">
                    <p>No symptom data available today</p>
                  </div>
                )}
              </div>
            </div>

            <div className="adminmain-middle-column adminmain-right-column">
              <div className="adminmain-analytics-card adminmain-alerts-card">
                <div className="adminmain-card-header">
                  <div className="adminmain-analytics-alert-icon"><TriangleAlert size={20} /></div>
                  <div className="adminmain-header-text">
                    <h4>Department Queue Distribution</h4>
                    <small className="adminmain-analytics-subtitle">Long Queue Alerts</small>
                  </div>
                </div>
                {dashboardData.systemAlerts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboardData.systemAlerts}
                        dataKey="count"
                        nameKey="department"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.department}: ${entry.count}`}
                      >
                        {dashboardData.systemAlerts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#f59e0b'][index % 3]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="adminmain-empty-chart-state">
                    <p>All departments running smoothly</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderDoctorStaff = () => {
    const filteredStaff = getFilteredStaff();
    const activeFiltersCount = Object.values(filters).filter(f => 
      f !== 'all' && f !== '' && !(Array.isArray(f) && f[0] === 0 && f[1] === 100)
    ).length;

    return (
      <div className="adminmain-page-content">
        <div className="adminmain-search-section">
          <div className="adminmain-page-header">
            <div className="adminmain-header-left">
              <h2>Doctor & Staff Management</h2>
              <p>Manage healthcare professionals and their credentials</p>
            </div>
          </div>

          <div className="adminmain-search-wrapper-new">
            <Search size={18} className="fa-solid fa-magnifying-glass adminmain-search-icon"/>
            <input
              type="text"
              placeholder="Search by name, ID, role, department, specialization, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="adminmain-search-input-new"
            />
            {searchQuery && (
              <button className="adminmain-clear-search" onClick={() => setSearchQuery('')}>
                <X size={15} />
              </button>
            )}
          </div>

          <div className="adminmain-filter-section">
            <div className="adminmain-filter-controls">
              <select 
                value={filters.role} 
                onChange={(e) => setFilters({...filters, role: e.target.value})}
                className="adminmain-filter-select"
              >
                <option value="all">All Roles</option>
                {getUniqueRoles().map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <select 
                value={filters.department} 
                onChange={(e) => setFilters({...filters, department: e.target.value})}
                className="adminmain-filter-select"
              >
                <option value="all">All Departments</option>
                {getUniqueDepartments().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select 
                value={filters.status} 
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="adminmain-filter-select"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>

              <select 
                value={filters.specialization} 
                onChange={(e) => setFilters({...filters, specialization: e.target.value})}
                className="adminmain-filter-select"
              >
                <option value="all">All Specializations</option>
                {getUniqueSpecializations().map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>

              {activeFiltersCount > 0 && (
                <button className="adminmain-reset-filters-btn" onClick={resetFilters}>
                  <FunnelX size={15} />
                </button>
              )}

              <div className="adminmain-sort-controls">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="adminmain-sort-select">
                  <option value="name">Name</option>
                  <option value="role">Role</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          </div>

          <div className="adminmain-results-summary">
            <div className="adminmain-results-count">
              Showing <strong>{filteredStaff.length}</strong> of <strong>{staffData.length}</strong> staff members
            </div>
          </div>
        </div>

        {loading ? (
          <div className="adminmain-loading-container">
            <div className="adminmain-loading-spinner"></div>
            <p>Loading staff data...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="adminmain-empty-state">
            <div className="adminmain-empty-icon">
              <UserX size={40} />
            </div>
            <h3>No staff members found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="adminmain-table-container">
            <table className="adminmain-data-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Specialization</th>
                  <th>Department</th>
                  <th>License No</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => (
                  <tr key={staff.id}>
                    <td>{staff.staff_id}</td>
                    <td>{staff.name}</td>
                    <td>{staff.role}</td>
                    <td>{staff.specialization || 'N/A'}</td>
                    <td>{staff.department_name || 'N/A'}</td>
                    <td>{staff.license_no || 'N/A'}</td>
                    <td>{staff.contact_no}</td>
                    <td>
                      <span className={`adminmain-status-badge ${staff.is_online ? 'active' : 'offline'}`}>
                        {staff.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderOutPatient = () => {
    const filteredPatients = getFilteredPatients();
    const activeFiltersCount = Object.values(filters).filter(f => 
      f !== 'all' && f !== '' && !(Array.isArray(f) && f[0] === 0 && f[1] === 100)
    ).length;

    return (
      <div className="adminmain-page-content">
        <div className="adminmain-search-section">
          <div className="adminmain-page-header">
            <div className="adminmain-header-left">
              <h2>Out-Patient Demographics</h2>
              <p>Comprehensive patient records and demographics</p>
            </div>
          </div>

          <div className="adminmain-search-wrapper-new">
            <Search size={18} className="fa-solid fa-magnifying-glass adminmain-search-icon"/>  
            <input
              type="text"
              placeholder="Search by name, ID, contact, email, sex..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="adminmain-search-input-new"
            />
            {searchQuery && (
              <button className="adminmain-clear-search" onClick={() => setSearchQuery('')}>
                <X size={15} />
              </button>
            )}
          </div>

          <div className="adminmain-filter-section">
            <div className="adminmain-filter-controls">
              <select 
                value={filters.sex} 
                onChange={(e) => setFilters({...filters, sex: e.target.value})}
                className="adminmain-filter-select"
              >
                <option value="all">All Sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              <div className="adminmain-age-filter">
                <label>Age: {filters.ageRange[0]} - {filters.ageRange[1]}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.ageRange[1]}
                  onChange={(e) => setFilters({...filters, ageRange: [0, parseInt(e.target.value)]})}
                  className="adminmain-age-slider"
                />
              </div>

              <select 
                value={filters.visitStatus} 
                onChange={(e) => setFilters({...filters, visitStatus: e.target.value})}
                className="adminmain-filter-select"
              >
                <option value="all">All Visits</option>
                <option value="recent">Has Visits</option>
                <option value="none">No Visits</option>
              </select>

              <input
                type="date"
                value={filters.registrationDateFrom}
                onChange={(e) => setFilters({...filters, registrationDateFrom: e.target.value})}
                className="adminmain-filter-date"
                placeholder="From Date"
              />

              <input
                type="date"
                value={filters.registrationDateTo}
                onChange={(e) => setFilters({...filters, registrationDateTo: e.target.value})}
                className="adminmain-filter-date"
                placeholder="To Date"
              />

              {activeFiltersCount > 0 && (
                <button className="adminmain-reset-filters-btn" onClick={resetFilters}>
                  <FunnelX size={15} />
                </button>
              )}

              <div className="adminmain-sort-controls">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="adminmain-sort-select">
                  <option value="name">Name</option>
                  <option value="age">Age</option>
                  <option value="recent">Recent Registration</option>
                </select>
              </div>
            </div>
          </div>

          <div className="adminmain-results-summary">
            <div className="adminmain-results-count">
              Showing <strong>{filteredPatients.length}</strong> of <strong>{patientData.length}</strong> patients
            </div>
          </div>
        </div>

        {loading ? (
          <div className="adminmain-loading-container">
            <div className="adminmain-loading-spinner"></div>
            <p>Loading patient data...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="adminmain-empty-state">
            <div className="adminmain-empty-icon">
              <UserX size={40} />
            </div>
            <h3>No patients found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="adminmain-table-container">
            <table className="adminmain-data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Registration Date</th>
                  <th>Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.patient_id}</td>
                    <td>{patient.name}</td>
                    <td>{patient.age}</td>
                    <td>{patient.sex}</td>
                    <td>{patient.contact_no}</td>
                    <td>{patient.email}</td>
                    <td>{new Date(patient.registration_date).toLocaleDateString()}</td>
                    <td>{patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : 'No visits'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderChatbot = () => (
    <div className="adminmain-page-content adminmain-chatbot-container">
      <div className="adminmain-chatbot-wrapper">
        {chatMessages.length > 0 && (
          <div className="adminmain-page-header">
            <div className="adminmain-header-left">
              <h2>CliCare Chatbot</h2>
              <p>Powered by Google Gemini</p>
            </div>
          </div>
        )}

        <div className="adminmain-chat-messages">
          {chatMessages.length === 0 ? (
            <div className="adminmain-chat-welcome">
              <div className="adminmain-chat-welcome-icon"><img src={logo} alt="Logo" /></div>
              <h3>Welcome to CliCare Chatbot</h3>
              <p>Ask me anything about hospital statistics, patient trends, or diagnostic patterns.</p>
              <div className="adminmain-chat-suggestions">
                <button onClick={() => setChatInput("What is the current health trend today?")}>
                  Current health trends
                </button>
                <button onClick={() => setChatInput("How many patients registered today?")}>
                  Today's registrations
                </button>
                <button onClick={() => setChatInput("Show department usage statistics")}>
                  Department statistics
                </button>
              </div>
            </div>
          ) : (
            chatMessages.map((msg, idx) => (
              <div key={idx} className={`adminmain-chat-message ${msg.role}`}>
                <div className="adminmain-chat-message-icon">
                  {msg.role === 'assistant' && <img src={logo} alt="Logo" />}
                </div>
                <div className="adminmain-chat-message-content">
                  <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                  {msg.chartType && msg.chartType !== 'none' && renderChart(msg.chartType, msg.chartData, msg.chartTitle)}
                </div>
              </div>
            ))
          )}
          {chatLoading && (
            <div className="adminmain-chat-message assistant">
              <div className="adminmain-chat-message-icon"><img src={logo} alt="Logo" /></div>
              <div className="adminmain-chat-message-content">
                <div className="adminmain-chat-loading">Analyzing data...</div>
              </div>
            </div>
          )}
        </div>

        <form className="adminmain-chat-input-form" onSubmit={handleChatSubmit}>
          <div className="adminmain-chat-input-wrapper">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about hospital statistics, trends, or patterns..."
              className="adminmain-chat-input"
              disabled={chatLoading}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSubmit(e);
                }
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button type="submit" className="adminmain-chat-send-btn" disabled={chatLoading || !chatInput.trim()}>
              <ArrowUp size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'patient-overview':
        return renderPatientOverview();
      case 'doctor-staff':
        return renderDoctorStaff();
      case 'out-patient':
        return renderOutPatient();
      case 'chatbot':
        return renderChatbot();
      default:
        return renderPatientOverview();
    }
  };

  return (
    <div className="adminmain-dashboard">
      <div className="adminmain-mobile-header">
        <button className="adminmain-sidebar-toggle" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <div className="adminmain-mobile-logo">
          <img src={clicareLogo} alt="CliCare Logo" />
        </div>
      </div>

      <div className={`adminmain-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="adminmain-sidebar-header">
          <div className="adminmain-sidebar-logo">
            <img src={clicareLogo} alt="CliCare Logo" className="adminmain-webreg-reg-logo"/>
          </div>
          <button className="adminmain-sidebar-close" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>

        <nav className="adminmain-navigation">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false);
              }}
              className={`adminmain-nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="adminmain-nav-icon">{item.icon}</span>
              <div className="adminmain-nav-content">
                <div className="adminmain-nav-label">{item.label}</div>
                <div className="adminmain-nav-description">{item.description}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="adminmain-sidebar-footer">
          <div className="adminmain-user-info-wrapper">
            <div className="adminmain-user-details">
              <div className="adminmain-user-name">{adminInfo.name}</div>
              <div className="adminmain-user-id">{adminInfo.adminId}</div>
            </div>
            <button onClick={confirmLogout} className="adminmain-logout-btn" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div className="adminmain-sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      <div className="adminmain-main-content">
        {renderCurrentPage()}
      </div>

      {showLogoutModal && (
        <div className="adminmain-modal-overlay">
          <div className="adminmain-modal">
            <div className="adminmain-modal-header">
              <h3>Confirm Logout</h3>
              <button 
                className="adminmain-modal-close" 
                onClick={() => setShowLogoutModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="adminmain-modal-content">
              <p>Are you sure you want to logout? You will need to login again to access the admin dashboard.</p>
            </div>
            <div className="adminmain-modal-actions">
              <button 
                className="adminmain-modal-btn secondary" 
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button 
                className="adminmain-modal-btn logout" 
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMain;