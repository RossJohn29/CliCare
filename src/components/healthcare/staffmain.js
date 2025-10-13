// staffmain.js
import React, { useState, useEffect } from 'react';
import './staffmain.css';
import clicareLogo from "../../clicareLogo.png";
import logo from "../../logo.png";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const validateHealthcareToken = async () => {
  const token = localStorage.getItem('healthcareToken');
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

const StaffMain = () => {
  const [currentPage, setCurrentPage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
  
  const [patientQueue, setPatientQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const [myPatients, setMyPatients] = useState([]);
  const [overallPatients, setOverallPatients] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [myPatientsSearchTerm, setMyPatientsSearchTerm] = useState('');
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [overallLoading, setOverallLoading] = useState(false);

  const [labRequests, setLabRequests] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [allLabData, setAllLabData] = useState([]);
  const [activeLabTab, setActiveLabTab] = useState('all');
  const [labDataLoading, setLabDataLoading] = useState(false);
  const [labSearchTerm, setLabSearchTerm] = useState('');
  const [labFilters, setLabFilters] = useState({
    status: 'all',
    priority: 'all',
    testType: 'all',
    dateRange: 'all'
  });
  const [labSortBy, setLabSortBy] = useState('recent');
  
  const [showLabRequestModal, setShowLabRequestModal] = useState(false);
  const [selectedPatientForLab, setSelectedPatientForLab] = useState(null);
  const [labRequestForm, setLabRequestForm] = useState({
    test_requests: [{ test_name: '', test_type: '' }],
    priority: 'normal',
    instructions: '',
    due_date: ''
  });

  const [viewingPatientDetails, setViewingPatientDetails] = useState(false);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState(null);
  const [patientDetailsHistory, setPatientDetailsHistory] = useState([]);
  const [detailsHistoryLoading, setDetailsHistoryLoading] = useState(false);
  const [detailsHistoryPagination, setDetailsHistoryPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalVisits: 0,
    hasNextPage: false
  });
  
  const [showLabResultModal, setShowLabResultModal] = useState(false);
  const [selectedLabResult, setSelectedLabResult] = useState(null);
  const [labResultModalLoading, setLabResultModalLoading] = useState(false);
  
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedPatientForDiagnosis, setSelectedPatientForDiagnosis] = useState(null);
  const [diagnosisForm, setDiagnosisForm] = useState({
    diagnosis_code: '',
    diagnosis_description: '',
    diagnosis_type: 'primary',
    severity: 'mild',
    notes: ''
  });

  // New states for dashboard time series
  const [dashboardTimeSeriesData, setDashboardTimeSeriesData] = useState([]);
  const [timePeriod, setTimePeriod] = useState('daily');
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const token = localStorage.getItem('healthcareToken'); 
        const staffInfo = localStorage.getItem('staffInfo');   
        
        if (!token || !staffInfo) {
          window.location.replace('/staff-login');
          return;
        }

        const isValid = await validateHealthcareToken();
        if (!isValid) {
          localStorage.clear();
          window.location.replace('/staff-login');
          return;
        }

        const parsedStaffInfo = JSON.parse(staffInfo);
        
        if (parsedStaffInfo.role !== 'Doctor') {
          alert('Access denied. This system is for doctors only.');
          window.location.replace('/staff-login');
          return;
        }
        
        setStaffInfo({
          staffId: parsedStaffInfo.staff_id,
          name: parsedStaffInfo.name,
          role: 'Attending Physician',
          department: parsedStaffInfo.specialization || 'General Medicine',
          staffType: 'doctor'
        });

        await fetchPatientQueue();
        await fetchMyPatients();
        await fetchOverallPatients();
        await fetchDashboardTimeSeries('daily');
        
        setLoading(false);

      } catch (error) {
        console.error('Error initializing dashboard:', error);
        localStorage.clear();
        window.location.replace('/staff-login');
      }
    };

    initializeDashboard();
    
    const interval = setInterval(async () => {
      try {
        await fetchPatientQueue();
        if (currentPage === 'patients') {
          await fetchMyPatients();
        }
      } catch (error) {
        console.error('Auto-refresh error:', error);
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardTimeSeries = async (period) => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('healthcareToken');
      
      const response = await fetch(`http://localhost:5000/api/healthcare/time-series-stats?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardTimeSeriesData(data.timeSeriesData || []);
      } else {
        setDashboardTimeSeriesData([]);
      }
    } catch (error) {
      console.error('Failed to fetch time series data:', error);
      setDashboardTimeSeriesData([]);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleTimePeriodChange = async (newPeriod) => {
    setTimePeriod(newPeriod);
    await fetchDashboardTimeSeries(newPeriod);
  };

  const fetchPatientQueue = async () => {
    try {
      setQueueLoading(true);
      const token = localStorage.getItem('healthcareToken');
      
      const response = await fetch('http://localhost:5000/api/healthcare/patient-queue', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPatientQueue(data.queue || []);
        
        const today = new Date().toISOString().split('T')[0];
        const statsResponse = await fetch(`http://localhost:5000/api/healthcare/dashboard-stats?date=${today}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          
          setDashboardData(prev => ({
            ...prev,
            todayStats: {
              myPatients: statsData.stats.myPatientsToday || 0,
              labResults: statsData.stats.totalLabResults || 0
            }
          }));
        } else {
          setDashboardData(prev => ({
            ...prev,
            todayStats: {
              myPatients: data.todayStats?.myPatients || 0,
              labResults: 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch patient queue:', error);
    } finally {
      setQueueLoading(false);
    }
  };

  const updateQueueStatus = async (queueId, newStatus) => {
    try {
      const token = localStorage.getItem('healthcareToken');
      
      const response = await fetch(`http://localhost:5000/api/healthcare/queue/${queueId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchPatientQueue();
        if (currentPage === 'patients') {
          await fetchMyPatients();
        }
      }
    } catch (error) {
      console.error('Failed to update queue status:', error);
    }
  };

  const fetchMyPatients = async () => {
    try {
      const token = localStorage.getItem('healthcareToken');
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`http://localhost:5000/api/healthcare/my-patients-queue?date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMyPatients(data.patients || []);
      } else {
        setMyPatients([]);
      }
    } catch (error) {
      console.error('Failed to fetch my patients:', error);
      setMyPatients([]);
    }
  };

  useEffect(() => {
    const fetchPatientsWhenNeeded = async () => {
      if (currentPage === 'patients') {
        await fetchMyPatients();
      }
    };
    fetchPatientsWhenNeeded();
  }, [currentPage]);

  const fetchOverallPatients = async () => {
    try {
      setOverallLoading(true);
      const token = localStorage.getItem('healthcareToken');
      
      const response = await fetch('http://localhost:5000/api/healthcare/all-patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOverallPatients(data.patients || []);
        setTotalPatients(data.totalCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch overall patients:', error);
    } finally {
      setOverallLoading(false);
    }
  };

  const fetchPatientModal = async (patientId) => {
    try {
      setModalLoading(true);
      
      const patient = overallPatients.find(p => p.patient_id === patientId);
      
      if (patient) {
        setSelectedPatientDetails(patient);
        setViewingPatientDetails(true);
        await fetchPatientDetailsHistory(patient.id, 1);
      } else {
        console.error('Patient not found in loaded data');
        alert('Patient details not available');
      }
    } catch (error) {
      console.error('Failed to fetch patient details:', error);
      alert('Failed to load patient details');
    } finally {
      setModalLoading(false);
    }
  };

  const fetchPatientDetailsHistory = async (patientDbId, page = 1) => {
    try {
      setDetailsHistoryLoading(true);
      const token = localStorage.getItem('healthcareToken');
      
      const response = await fetch(`http://localhost:5000/api/healthcare/patient-history-by-db-id/${patientDbId}?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPatientDetailsHistory(data.visitHistory || []);
        setDetailsHistoryPagination(data.pagination);
      } else {
        setPatientDetailsHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch patient details history:', error);
      setPatientDetailsHistory([]);
    } finally {
      setDetailsHistoryLoading(false);
    }
  };

  const getFilteredOverallPatients = () => {
    if (!patientSearchTerm.trim()) {
      return overallPatients;
    }
    
    return overallPatients.filter(patient => 
      patient.patient_id.toLowerCase().includes(patientSearchTerm.toLowerCase().trim())
    );
  };

  const getFilteredMyPatients = () => {
    if (!myPatientsSearchTerm.trim()) {
      return myPatients;
    }
    
    return myPatients.filter(patient => 
      patient.name.toLowerCase().includes(myPatientsSearchTerm.toLowerCase().trim()) ||
      patient.patient_id.toLowerCase().includes(myPatientsSearchTerm.toLowerCase().trim()) ||
      (patient.contact_no && patient.contact_no.includes(myPatientsSearchTerm.trim())) ||
      (patient.lastSymptoms && patient.lastSymptoms.toLowerCase().includes(myPatientsSearchTerm.toLowerCase().trim()))
    );
  };

  const fetchLabRequests = async () => {
    try {
      const token = localStorage.getItem('healthcareToken');
      
      const response = await fetch('http://localhost:5000/api/healthcare/lab-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLabRequests(data.labRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch lab requests:', error);
    }
  };

  const fetchLabResults = async () => {
    try {
      const token = localStorage.getItem('healthcareToken');
      
      const response = await fetch('http://localhost:5000/api/healthcare/lab-results', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLabResults(data.labResults || []);
      }
    } catch (error) {
      console.error('Failed to fetch lab results:', error);
    }
  };

  useEffect(() => {
    const fetchLabDataWhenNeeded = async () => {
      if (currentPage === 'lab-orders') {
        try {
          setLabDataLoading(true);
          await fetchLabRequests();
          await fetchLabResults();
        } catch (error) {
          console.error('Error fetching lab data:', error);
        } finally {
          setLabDataLoading(false);
        }
      }
    };

    fetchLabDataWhenNeeded();
  }, [currentPage]);

  useEffect(() => {
    if (currentPage === 'lab-orders') {
      const combinedData = labRequests.map(request => ({
        ...request,
        hasResult: request.labResult !== null,
        resultData: request.labResult || null
      }));
      
      setAllLabData(combinedData);
    }
  }, [labRequests, labResults, currentPage]);

  useEffect(() => {
    let interval;
    
    if (currentPage === 'lab-orders') {
      interval = setInterval(async () => {
        try {
          await fetchLabRequests();
          await fetchLabResults();
        } catch (error) {
          console.error('Auto-refresh lab data error:', error);
        }
      }, 30000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentPage]);

  const getUniqueTestTypes = () => {
    const types = [...new Set(allLabData.map(item => item.test_type))];
    return types.filter(Boolean);
  };

  const getFilteredLabData = () => {
    let filtered = [...allLabData];
    
    if (labSearchTerm.trim()) {
      const query = labSearchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.patient?.name.toLowerCase().includes(query) ||
        item.patient?.patient_id.toLowerCase().includes(query) ||
        item.test_name.toLowerCase().includes(query) ||
        item.test_type.toLowerCase().includes(query)
      );
    }
    
    if (labFilters.status !== 'all') {
      if (labFilters.status === 'pending') {
        filtered = filtered.filter(item => item.status === 'pending');
      } else if (labFilters.status === 'completed') {
        filtered = filtered.filter(item => item.status === 'completed' && item.hasResult);
      }
    }
    
    if (labFilters.priority !== 'all') {
      filtered = filtered.filter(item => item.priority === labFilters.priority);
    }
    
    if (labFilters.testType !== 'all') {
      filtered = filtered.filter(item => item.test_type === labFilters.testType);
    }
    
    if (labFilters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (labFilters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(item => new Date(item.created_at) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(item => new Date(item.created_at) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(item => new Date(item.created_at) >= filterDate);
          break;
      }
    }
    
    filtered.sort((a, b) => {
      switch (labSortBy) {
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'priority':
          const priorityOrder = { 'stat': 3, 'urgent': 2, 'normal': 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'patient':
          return a.patient?.name.localeCompare(b.patient?.name);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const resetLabFilters = () => {
    setLabSearchTerm('');
    setLabFilters({
      status: 'all',
      priority: 'all',
      testType: 'all',
      dateRange: 'all'
    });
  };

  const removeTestFromRequest = (index) => {
    if (labRequestForm.test_requests.length === 1) return;
    
    setLabRequestForm(prev => ({
      ...prev,
      test_requests: prev.test_requests.filter((_, i) => i !== index)
    }));
  };

  const updateTestInRequest = (index, field, value) => {
    setLabRequestForm(prev => ({
      ...prev,
      test_requests: prev.test_requests.map((test, i) => 
        i === index ? { ...test, [field]: value } : test
      )
    }));
  };

  const addTestToRequest = () => {
    setLabRequestForm(prev => ({
      ...prev,
      test_requests: [...prev.test_requests, { test_name: '', test_type: '' }]
    }));
  };

  const createLabRequest = async () => {
    try {
      if (!selectedPatientForLab) {
        alert('Please select a patient');
        return;
      }
      
      for (let i = 0; i < labRequestForm.test_requests.length; i++) {
        const test = labRequestForm.test_requests[i];
        if (!test.test_name.trim()) {
          alert(`Please enter test name for Test ${i + 1}`);
          return;
        }
        if (!test.test_type) {
          alert(`Please select test type for Test ${i + 1}`);
          return;
        }
      }
      
      if (!labRequestForm.due_date) {
        alert('Please select due date');
        return;
      }

      const token = localStorage.getItem('healthcareToken');
      
      const requestData = {
        patient_id: selectedPatientForLab.patient_id,
        test_requests: labRequestForm.test_requests.map(test => ({
          test_name: test.test_name.trim(),
          test_type: test.test_type
        })),
        priority: labRequestForm.priority || 'normal',
        instructions: labRequestForm.instructions.trim(),
        due_date: labRequestForm.due_date,
        is_grouped: true,
        group_name: `Multiple Tests - ${new Date().toLocaleDateString()}`
      };

      const response = await fetch('http://localhost:5000/api/healthcare/lab-requests-grouped', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Lab request created successfully!\n\nRequested Tests: ${labRequestForm.test_requests.length}\n\nThe patient will be notified to upload their results.`);
        
        setShowLabRequestModal(false);
        setSelectedPatientForLab(null);
        setLabRequestForm({
          test_requests: [{ test_name: '', test_type: '' }],
          priority: 'normal',
          instructions: '',
          due_date: ''
        });
        
        await fetchLabRequests();
        await fetchLabResults();
        
      } else {
        throw new Error(result.error || 'Failed to create lab request');
      }

    } catch (error) {
      console.error('Failed to create lab request:', error);
      alert('Failed to create lab request: ' + error.message);
    }
  };

  const createDiagnosis = async () => {
    try {
      if (!selectedPatientForDiagnosis) {
        alert('Please select a patient');
        return;
      }
      
      if (!diagnosisForm.diagnosis_description.trim()) {
        alert('Please enter diagnosis description');
        return;
      }

      const token = localStorage.getItem('healthcareToken');
      
      const visitResponse = await fetch('http://localhost:5000/api/healthcare/patient-visit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: selectedPatientForDiagnosis.patient_id
        })
      });

      const visitData = await visitResponse.json();
      if (!visitResponse.ok) {
        throw new Error(visitData.error || 'Failed to create visit');
      }

      const diagnosisData = {
        visit_id: visitData.visit_id,
        patient_id: selectedPatientForDiagnosis.patient_id,
        diagnosis_code: diagnosisForm.diagnosis_code.trim() || null,
        diagnosis_description: diagnosisForm.diagnosis_description.trim(),
        diagnosis_type: diagnosisForm.diagnosis_type,
        severity: diagnosisForm.severity,
        notes: diagnosisForm.notes.trim() || null
      };

      const response = await fetch('http://localhost:5000/api/healthcare/diagnosis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diagnosisData)
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Diagnosis created successfully for ${selectedPatientForDiagnosis.name}!`);
        
        setShowDiagnosisModal(false);
        setSelectedPatientForDiagnosis(null);
        setDiagnosisForm({
          diagnosis_code: '',
          diagnosis_description: '',
          diagnosis_type: 'primary',
          severity: 'mild',
          notes: ''
        });
        
      } else {
        throw new Error(result.error || 'Failed to create diagnosis');
      }

    } catch (error) {
      console.error('Failed to create diagnosis:', error);
      alert('Failed to create diagnosis: ' + error.message);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      window.location.replace('/staff-login');
    }
  };

  const getMenuItems = () => {
    return [
      { 
        id: 'overview', 
        icon: <i className="fa-solid fa-chart-simple"></i>, 
        label: 'Dashboard Overview', 
        description: 'Daily statistics and activities' 
      },
      { 
        id: 'patients', 
        icon: <i className="fa-solid fa-user-doctor"></i>, 
        label: 'Patients Today', 
        description: 'Today\'s consultations only' 
      },
      { 
        id: 'overall-patients', 
        icon: <i className="fa-solid fa-hospital-user"></i>, 
        label: 'Overall Patient', 
        description: 'All registered patients' 
      },
      { 
        id: 'lab-orders', 
        icon: <i className="fa-solid fa-flask"></i>, 
        label: 'Lab Orders', 
        description: 'Laboratory test requests' 
      }
    ];
  };

  const handleViewFile = (fileUrl, fileName) => {
    if (fileUrl) {
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000${fileUrl}`;
      window.open(fullUrl, '_blank');
    } else {
      alert('File not available');
    }
  };

  const renderOverview = () => (
    <div className="staff-page-content">

      {loading ? (
        <div className="staff-loading-container">
          <div className="staff-loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="staff-middle-section">
            <div className="staff-stat-card hexagon primary">
              <div className="stat-card-inner">
                <div className="staff-stat-icon">
                  <i className="fa-solid fa-users"></i>
                </div>
                <div className="staff-stat-content">
                  <h3>Patients Today</h3>
                  <div className="staff-stat-number">{dashboardData.todayStats.myPatients}</div>
                </div>
              </div>
            </div>

            <div className="staff-stat-card hexagon secondary">
              <div className="stat-card-inner">
                <div className="staff-stat-icon">
                  <i className="fa-solid fa-hospital-user"></i>
                </div>
                <div className="staff-stat-content">
                  <h3>Overall Patient</h3>
                  <div className="staff-stat-number">{totalPatients}</div>
                </div>
              </div>
            </div>

            <div className="staff-stat-card hexagon tertiary">
              <div className="stat-card-inner">
                <div className="staff-stat-icon">
                  <i className="fa-solid fa-flask"></i>
                </div>
                <div className="staff-stat-content">
                  <h3>Lab Results</h3>
                  <div className="staff-stat-number">{dashboardData.todayStats.labResults}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="staff-bottom-section">
            <div className="middle-column left-column">
              <div className="staff-analytics-card">
                <div className="card-header">
                  <div className="analytics-trends-icon">
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <div className="header-text">
                    <h4>Patient Queue ({patientQueue.length})</h4>
                    <small className="analytics-subtitle">Current waiting patients</small>
                  </div>
                </div>
                
                {queueLoading ? (
                  <div className="staff-loading-spinner"></div>
                ) : (
                  <div className="healthcare-queue-list">
                    {patientQueue.length === 0 ? (
                      <div className="empty-chart-state">
                        <p>No patients in queue</p>
                      </div>
                    ) : (
                      patientQueue.slice(0, 5).map((item) => (
                        <div key={item.queue_id} className={`healthcare-queue-item ${item.status} ${item.diagnosedByMe ? 'diagnosed-by-me' : ''}`}>
                          <div className="healthcare-queue-number">#{item.queue_no}</div>
                          <div className="healthcare-queue-content">
                            <div className="healthcare-queue-patient">
                              {item.visit.outPatient.name}
                            </div>
                            <div className="healthcare-queue-id">
                              {item.visit.outPatient.patient_id}
</div>
                            <div className="healthcare-queue-symptoms">
                              {item.visit.symptoms}
                            </div>
                            <div className="healthcare-queue-time">
                              {new Date(item.visit.visit_time).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="healthcare-queue-actions">
                            <div className={`healthcare-queue-status ${item.status} ${item.diagnosedByMe ? 'my-patient' : ''}`}>
                              {item.status === 'waiting' ? 'Waiting' : 
                              item.status === 'in_progress' ? 'In Progress' : 
                              item.diagnosedByMe ? 'Done (My Patient)' : 'Done'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="middle-column right-column">
              <div className="staff-analytics-card">
                <div className="card-header">
                  <div className="analytics-trends-icon">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <div className="header-text">
                    <h4>Patient Statistics</h4>
                    <small className="analytics-subtitle">Activity over time</small>
                  </div>
                  <div className="time-period-selector">
                    <button 
                      className={`period-btn ${timePeriod === 'daily' ? 'active' : ''}`}
                      onClick={() => handleTimePeriodChange('daily')}
                      disabled={statsLoading}
                    >
                      Daily
                    </button>
                    <button 
                      className={`period-btn ${timePeriod === 'weekly' ? 'active' : ''}`}
                      onClick={() => handleTimePeriodChange('weekly')}
                      disabled={statsLoading}
                    >
                      Weekly
                    </button>
                    <button 
                      className={`period-btn ${timePeriod === 'yearly' ? 'active' : ''}`}
                      onClick={() => handleTimePeriodChange('yearly')}
                      disabled={statsLoading}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
                
                {statsLoading ? (
                  <div className="staff-loading-container">
                    <div className="staff-loading-spinner"></div>
                  </div>
                ) : dashboardTimeSeriesData.length === 0 ? (
                  <div className="empty-chart-state">
                    <p>No data available for the selected period</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                      data={dashboardTimeSeriesData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        className="chart-axis-small" 
                        tick={{ fill: '#6b7280', fontSize: 11 }}
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
                        className="chart-axis-small" 
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '0.75em'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{
                          fontSize: '0.7em',
                          fontFamily: 'inherit',
                          fontWeight: '500',
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="registrations" 
                        stroke="#1a672a" 
                        strokeWidth={2}
                        name="New Patient Registrations"
                        dot={{ fill: '#1a672a', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderMyPatientsPage = () => {
    const filteredPatients = getFilteredMyPatients();
    
    return (
      <div className="staff-page-content">
        <div className="staff-search-section">
          <div className="staff-page-header">
            <div className="header-left">
              <h2>Patients Today</h2>
              <p>Patients consulted and scheduled for consultation today - {staffInfo.department}</p>
            </div>
          </div>

          <div className="staff-search-wrapper-new">
            <i className="fa-solid fa-magnifying-glass staff-search-icon"></i>
            <input
              type="text"
              placeholder="Search by patient name, ID, contact, or symptoms..."
              value={myPatientsSearchTerm}
              onChange={(e) => setMyPatientsSearchTerm(e.target.value)}
              className="staff-search-input-new"
            />
            {myPatientsSearchTerm && (
              <button 
                onClick={() => setMyPatientsSearchTerm('')}
                className="staff-clear-search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
      
          {myPatientsSearchTerm && (
            <div className="staff-results-summary">
              <div className="staff-results-count">
                Showing <strong>{filteredPatients.length}</strong> of <strong>{myPatients.length}</strong> patients
              </div>
            </div>
          )}
        </div>

        <div className="staff-patients-grid">
          {filteredPatients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fa-solid fa-users"></i>
              </div>
              <h3>No patients found</h3>
              <p>
                {myPatientsSearchTerm 
                  ? `No patients match "${myPatientsSearchTerm}"`
                  : 'No patients in queue or completed consultations for today.'
                }
              </p>
              {myPatientsSearchTerm && (
                <button 
                  onClick={() => setMyPatientsSearchTerm('')}
                  className="staff-action-btn"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div 
                key={patient.patient_id}
                className="staff-patient-card-simple"
              >
                <div className="healthcare-patient-info">
                  <div className="healthcare-patient-name">
                    {patient.name}
                    {patient.queueNumber && <span className="queue-indicator">#{patient.queueNumber}</span>}
                  </div>
                  <div className="healthcare-patient-id">{patient.patient_id}</div>
                  <div className="healthcare-patient-details">
                    {patient.age} years old, {patient.sex}
                  </div>
                  <div className="healthcare-patient-contact">{patient.contact_no}</div>
                  <div className="patient-symptoms">
                    <strong>Chief Complaint:</strong> {patient.lastSymptoms}
                  </div>
                </div>
                
                <div className="healthcare-patient-status">
                  <div className="healthcare-visit-time">
                    {patient.isInQueue ? 'Scheduled' : 'Completed'}: {new Date(`1970-01-01T${patient.visitTime}`).toLocaleTimeString()}
                  </div>
                  <div className={`status-badge ${patient.queueStatus || 'completed'}`}>
                    {patient.isInQueue ? (
                      patient.queueStatus === 'waiting' ? 'Waiting' : 
                      patient.queueStatus === 'in_progress' ? 'In Progress' : 
                      patient.queueStatus
                    ) : 'Completed'}
                  </div>
                </div>
                
                {patient.isInQueue && (
                  <div className="patient-card-actions">
                    {patient.queueStatus === 'waiting' && (
                      <button 
                        onClick={() => updateQueueStatus(patient.queue_id, 'in_progress')}
                        className="staff-action-btn start"
                      >
                        <i className="fa-solid fa-play"></i> Start Consultation
                      </button>
                    )}
                    {patient.queueStatus === 'in_progress' && (
                      <>
                        <button 
                          onClick={() => {
                            setSelectedPatientForLab(patient);
                            setShowLabRequestModal(true);
                          }}
                          className="staff-action-btn lab-request"
                        >
                          <i className="fa-solid fa-flask"></i> Request Lab
                        </button>
                        <button 
                          onClick={() => updateQueueStatus(patient.queue_id, 'completed')}
                          className="staff-action-btn complete"
                        >
                          <i className="fa-solid fa-check"></i> Complete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderOverallPatientsPage = () => {
    if (viewingPatientDetails && selectedPatientDetails) {
      return renderPatientDetailsView();
    }
    
    const filteredPatients = getFilteredOverallPatients();
    
    return (
      <div className="staff-page-content">
        <div className="staff-search-section">
          <div className="staff-page-header">
            <div className="header-left">
              <h2>Overall Patient</h2>
              <p>All registered patients in the system ({totalPatients} total)</p>
            </div>
          </div>

          <div className="staff-search-wrapper-new">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              placeholder="Search by Patient ID (e.g., PAT123456)"
              value={patientSearchTerm}
              onChange={(e) => setPatientSearchTerm(e.target.value)}
              className="search-input-new"
            />
            {patientSearchTerm && (
              <button 
                onClick={() => setPatientSearchTerm('')}
                className="clear-search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {patientSearchTerm && (
            <div className="results-summary">
              <div className="results-count">
                Showing <strong>{filteredPatients.length}</strong> of <strong>{totalPatients}</strong> patients
              </div>
            </div>
          )}
        </div>

        {overallLoading ? (
          <div className="staff-loading-container">
            <div className="staff-loading-spinner"></div>
            <p>Loading all patients...</p>
          </div>
        ) : (
          <div className="staff-table-container">
            <table className="staff-data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Contact</th>
                  <th>Registration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      <div className="empty-icon">
                        <i className="fa-solid fa-users"></i>
                      </div>
                      <h3>
                        {patientSearchTerm 
                          ? `No patients found with ID containing "${patientSearchTerm}"`
                          : 'No patients found'
                        }
                      </h3>
                      {patientSearchTerm && (
                        <button 
                          onClick={() => setPatientSearchTerm('')}
                          className="staff-action-btn"
                        >
                          Clear Search
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr 
                      key={patient.patient_id}
                      className="staff-table-row"
                      onClick={() => fetchPatientModal(patient.patient_id)}
                    >
                      <td>
                        <span className="healthcare-patient-id-highlight">
                          {patientSearchTerm ? (
                            patient.patient_id.split(new RegExp(`(${patientSearchTerm})`, 'gi')).map((part, index) =>
                              part.toLowerCase() === patientSearchTerm.toLowerCase() ? (
                                <mark key={index} className="staff-search-highlight">{part}</mark>
                              ) : (
                                part
                              )
                            )
                          ) : (
                            patient.patient_id
                          )}
                        </span>
                      </td>
                      <td className="healthcare-patient-name-cell">{patient.name}</td>
                      <td>{patient.age}</td>
                      <td>{patient.sex}</td>
                      <td>{patient.contact_no}</td>
                      <td>{new Date(patient.registration_date).toLocaleDateString()}</td>
                      <td>
                        <div className="healthcare-table-actions">
                          <button 
                            className="staff-action-btn view"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchPatientModal(patient.patient_id);
                            }}
                          >
                            View Details
                          </button>
                          <button 
                            className="staff-action-btn diagnosis"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatientForDiagnosis(patient);
                              setShowDiagnosisModal(true);
                            }}
                          >
                            Diagnosis
                          </button>
                          <button 
                            className="staff-action-btn lab"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatientForLab(patient);
                              setShowLabRequestModal(true);
                            }}
                          >
                            Request Lab
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderPatientDetailsView = () => {
    return (
      <div className="staff-page-content">
        <div className="patient-details-container">
          <div className="staff-analytics-card" style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => {
                setViewingPatientDetails(false);
                setSelectedPatientDetails(null);
                setPatientDetailsHistory([]);
              }}
              className="staff-back-btn"
            >
              <i className="fa-solid fa-arrow-left"></i> Back to Patient List
            </button>

            <div className="card-header">
              <div className="analytics-trends-icon">
                <i className="fa-solid fa-user"></i>
              </div>
              <div className="header-text">
                <h4>{selectedPatientDetails.name}</h4>
                <small className="analytics-subtitle">
                  ID: {selectedPatientDetails.patient_id} | {selectedPatientDetails.age}y, {selectedPatientDetails.sex}
                </small>
              </div>
            </div>

            <div className="patient-info-grid">
              <div className="info-section">
                <h4>Personal Information</h4>
                <div className="info-item">
                  <strong>Birthday:</strong> {new Date(selectedPatientDetails.birthday).toLocaleDateString()}
                </div>
                <div className="info-item">
                  <strong>Age:</strong> {selectedPatientDetails.age} years
                </div>
                <div className="info-item">
                  <strong>Sex:</strong> {selectedPatientDetails.sex}
                </div>
                <div className="info-item">
                  <strong>Registration Date:</strong> {new Date(selectedPatientDetails.registration_date).toLocaleDateString()}
                </div>
              </div>

              <div className="info-section">
                <h4>Contact Information</h4>
                <div className="info-item">
                  <strong>Phone:</strong> {selectedPatientDetails.contact_no}
                </div>
                <div className="info-item">
                  <strong>Email:</strong> {selectedPatientDetails.email}
                </div>
                <div className="info-item">
                  <strong>Address:</strong> {selectedPatientDetails.address}
                </div>
              </div>

              {selectedPatientDetails.emergencyContact && selectedPatientDetails.emergencyContact.length > 0 && (
                <div className="info-section">
                  <h4>Emergency Contact</h4>
                  <div className="info-item">
                    <strong>Name:</strong> {selectedPatientDetails.emergencyContact[0].name}
                  </div>
                  <div className="info-item">
                    <strong>Relationship:</strong> {selectedPatientDetails.emergencyContact[0].relationship}
                  </div>
                  <div className="info-item">
                    <strong>Phone:</strong> {selectedPatientDetails.emergencyContact[0].contact_number}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="staff-analytics-card">
            <div className="card-header">
              <div className="analytics-trends-icon">
                <i className="fa-solid fa-notes-medical"></i>
              </div>
              <div className="header-text">
                <h4>Medical History</h4>
                <small className="analytics-subtitle">
                  {detailsHistoryPagination.totalVisits} total visits
                </small>
              </div>
            </div>

            {detailsHistoryLoading ? (
              <div className="staff-loading-container">
                <div className="staff-loading-spinner"></div>
                <p>Loading medical history...</p>
              </div>
            ) : patientDetailsHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fa-solid fa-clipboard"></i>
                </div>
                <h3>No Medical History</h3>
                <p>This patient has no recorded visits yet.</p>
              </div>
            ) : (
              <>
                <div className="healthcare-history-timeline">
                  {patientDetailsHistory.map((visit) => (
                    <div key={visit.visit_id} className="healthcare-timeline-item">
                      <div className="healthcare-timeline-date">
                        <div className="date-day">
                          {new Date(visit.visit_date).getDate()}
                        </div>
                        <div className="date-month">
                          {new Date(visit.visit_date).toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div className="date-year">
                          {new Date(visit.visit_date).getFullYear()}
                        </div>
                      </div>
                      
                      <div className="healthcare-timeline-content">
                        <div className="healthcare-visit-header">
                          <h4>{visit.appointment_type}</h4>
                          <span className="visit-time">
                            {new Date(`1970-01-01T${visit.visit_time}`).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>

                        {visit.queue && visit.queue.length > 0 && (
                          <div className="visit-info-section">
                            <div className="info-item">
                              <strong>Department:</strong> {visit.queue[0].department.name}
                            </div>
                            <div className="info-item">
                              <strong>Queue No:</strong> #{visit.queue[0].queue_no}
                            </div>
                          </div>
                        )}

                        <div className="healthcare-visit-details">
                          <div className="info-item">
                            <strong>Chief Complaint:</strong> {visit.symptoms}
                          </div>

                          {visit.diagnosis && visit.diagnosis.length > 0 && (
                            <div className="healthcare-diagnoses">
                              <strong>Diagnoses:</strong>
                              {visit.diagnosis.map((diag) => (
                                <div key={diag.diagnosis_id} className="healthcare-diagnosis-item">
                                  <div className="diagnosis-header">
                                    <span className={`status-badge ${diag.diagnosis_type}`}>
                                      {diag.diagnosis_type}
                                    </span>
                                    <span className={`status-badge ${diag.severity}`}>
                                      {diag.severity}
                                    </span>
                                  </div>
                                  <div className="diagnosis-desc">{diag.diagnosis_description}</div>
                                  {diag.notes && (
                                    <div className="diagnosis-notes">
                                      <strong>Notes:</strong> {diag.notes}
                                    </div>
                                  )}
                                  {diag.healthStaff && (
                                    <div className="diagnosis-doctor-enhanced">
                                      <div className="doctor-info-card">
                                        <div className="doctor-avatar">
                                          <i className="fa-solid fa-user-doctor"></i>
                                        </div>
                                        <div className="doctor-details">
                                          <div className="doctor-name">Dr. {diag.healthStaff.name}</div>
                                          <div className="doctor-specialty">{diag.healthStaff.specialization || 'General Practice'}</div>
                                          <div className="doctor-role">{diag.healthStaff.role}</div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {visit.labRequest && visit.labRequest.length > 0 && (
                            <div className="healthcare-lab-requests">
                              <strong>Lab Requests:</strong>
                              {visit.labRequest.map((labReq, idx) => (
                                <div key={idx} className="lab-request-item">
                                  <span className="lab-test-type">{labReq.test_type}</span>
                                  <span className={`status-badge ${labReq.status}`}>{labReq.status}</span>
                                  {labReq.healthStaff && (
                                    <span className="lab-requested-by">
                                      Requested by: Dr. {labReq.healthStaff.name}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {detailsHistoryPagination.totalPages > 1 && (
                  <div className="staff-pagination">
                    <button 
                      onClick={() => fetchPatientDetailsHistory(selectedPatientDetails.id, detailsHistoryPagination.currentPage - 1)}
                      disabled={detailsHistoryPagination.currentPage === 1}
                      className="staff-page-btn"
                    >
                      <i className="fa-solid fa-chevron-left"></i> Previous
                    </button>
                    <span className="staff-page-info">
                      Page {detailsHistoryPagination.currentPage} of {detailsHistoryPagination.totalPages}
                    </span>
                    <button 
                      onClick={() => fetchPatientDetailsHistory(selectedPatientDetails.id, detailsHistoryPagination.currentPage + 1)}
                      disabled={!detailsHistoryPagination.hasNextPage}
                      className="staff-page-btn"
                    >
                      Next <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLabOrdersPage = () => {
    const filteredLabData = getFilteredLabData();
    const activeFiltersCount = Object.values(labFilters).filter(f => f !== 'all').length + (labSearchTerm ? 1 : 0);

    return (
      <div className="staff-page-content">
        <div className="staff-search-section">
          <div className="staff-page-header">
            <div className="header-left">
              <h2>Laboratory Orders</h2>
              <p>Manage laboratory test requests and review submitted results</p>
            </div>
          </div>

          <div className="staff-search-wrapper-new">
            <i className="fa-solid fa-magnifying-glass staff-search-icon"></i>
            <input
              type="text"
              placeholder="Search by patient name, ID, test name, or test type..."
              value={labSearchTerm}
              onChange={(e) => setLabSearchTerm(e.target.value)}
              className="staff-search-input-new"
            />
            {labSearchTerm && (
              <button className="staff-clear-search" onClick={() => setLabSearchTerm('')}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <div className="staff-filter-section">
            <div className="staff-filter-controls">
              <select 
                value={labFilters.status} 
                onChange={(e) => setLabFilters({...labFilters, status: e.target.value})}
                className="staff-filter-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Upload</option>
                <option value="completed">Completed</option>
              </select>

              <select 
                value={labFilters.priority} 
                onChange={(e) => setLabFilters({...labFilters, priority: e.target.value})}
                className="staff-filter-select"
              >
                <option value="all">All Priority</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>

              <select 
                value={labFilters.testType} 
                onChange={(e) => setLabFilters({...labFilters, testType: e.target.value})}
                className="staff-filter-select"
              >
                <option value="all">All Test Types</option>
                {getUniqueTestTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select 
                value={labFilters.dateRange} 
                onChange={(e) => setLabFilters({...labFilters, dateRange: e.target.value})}
                className="staff-filter-select"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              {activeFiltersCount > 0 && (
                <button className="staff-reset-filters-btn" onClick={resetLabFilters}>
                  <i className="fa-solid fa-filter-circle-xmark"></i>
                </button>
              )}

              <div className="staff-sort-controls">
                <label>Sort by:</label>
                <select value={labSortBy} onChange={(e) => setLabSortBy(e.target.value)} className="staff-sort-select">
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priority">Priority</option>
                  <option value="patient">Patient Name</option>
                </select>
              </div>
            </div>
          </div>

          <div className="staff-results-summary">
            <div className="staff-results-count">
              Showing <strong>{filteredLabData.length}</strong> of <strong>{allLabData.length}</strong> lab orders
            </div>
          </div>
        </div>

        {labDataLoading ? (
          <div className="staff-loading-container">
            <div className="staff-loading-spinner"></div>
            <p>Loading laboratory data...</p>
          </div>
        ) : filteredLabData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fa-solid fa-flask"></i>
            </div>
            <h3>No lab orders found</h3>
            <p>
              {activeFiltersCount > 0 
                ? 'Try adjusting your search or filters' 
                : 'No lab orders available'
              }
            </p>
            {activeFiltersCount > 0 && (
              <button className="staff-reset-btn" onClick={resetLabFilters}>
                <i className="fa-solid fa-rotate-left"></i>
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="staff-table-container">
            <table className="staff-data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Patient</th>
                  <th>Test Details</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Requested Date</th>
                  <th>Due Date</th>
                  <th>Action</th>
                </tr>
              </thead>
<tbody>
                {filteredLabData.map((item) => (
                  <tr key={item.request_id}>
                    <td>
                      <span className="healthcare-patient-id-highlight">
                        #{item.request_id}
                      </span>
                    </td>
                    <td>
                      <div className="table-patient-info">
                        <div className="patient-name">{item.patient?.name}</div>
                        <div className="patient-id">{item.patient?.patient_id}</div>
                      </div>
                    </td>
                    <td>
                      <div className="table-test-info">
                        <div className="test-name">{item.test_name}</div>
                        <div className="test-type">{item.test_type}</div>
                        {item.hasMultipleTests && (
                          <div className="test-count">{item.expectedFileCount} tests</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge priority ${item.priority}`}>
                        {item.priority === 'stat' ? 'STAT' : item.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status === 'pending' ? 
                          (item.uploadedFileCount > 0 ? 
                            `Partial (${item.uploadedFileCount}/${item.expectedFileCount})` : 
                            'Pending Upload'
                          ) : 
                          item.status === 'completed' ? 'Completed' : 
                          item.status}
                      </span>
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>{new Date(item.due_date).toLocaleDateString()}</td>
                    <td>
                      <button 
                        onClick={() => {
                          setSelectedLabResult(item);
                          setShowLabResultModal(true);
                        }}
                        className="staff-action-btn view"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showLabResultModal && selectedLabResult && (
          <div className="staff-modal-overlay" onClick={() => setShowLabResultModal(false)}>
            <div className="staff-modal staff-lab-result-modal" onClick={(e) => e.stopPropagation()}>
              <div className="staff-lab-modal-header">
                <h3>Lab Test Details</h3>
                <button 
                  className="staff-modal-close"
                  onClick={() => setShowLabResultModal(false)}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              
              <div className="staff-lab-modal-content">
                <div className="staff-test-summary-card">
                  <div className="staff-patient-info-card">
                    <div className="staff-patient-info-header">
                      <div className="staff-patient-details">
                        <h4>{selectedLabResult.patient?.name}</h4>
                        <div className="staff-patient-meta">
                          <span><i className="fa-solid fa-id-card"></i> {selectedLabResult.patient?.patient_id}</span>
                          <span><i className="fa-solid fa-birthday-cake"></i> {selectedLabResult.patient?.age} years</span>
                          <span><i className="fa-solid fa-venus-mars"></i> {selectedLabResult.patient?.sex}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="staff-test-summary-header">
                    <h4>Test Request Information</h4>
                    <span className={`staff-test-priority-badge ${selectedLabResult.priority}`}>
                      {selectedLabResult.priority === 'stat' ? 'STAT' : selectedLabResult.priority}
                    </span>
                  </div>
                  <div className="staff-test-summary-body">
                    <div className="staff-test-info-grid">
                      <div className="staff-test-info-item">
                        <span className="staff-test-info-label">Test Name</span>
                        <span className="staff-test-info-value">{selectedLabResult.test_name}</span>
                      </div>
                      <div className="staff-test-info-item">
                        <span className="staff-test-info-label">Test Type</span>
                        <span className="staff-test-info-value">{selectedLabResult.test_type}</span>
                      </div>
                      <div className="staff-test-info-item">
                        <span className="staff-test-info-label">Request Date</span>
                        <span className="staff-test-info-value">{new Date(selectedLabResult.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="staff-test-info-item">
                        <span className="staff-test-info-label">Due Date</span>
                        <span className="staff-test-info-value">{new Date(selectedLabResult.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {selectedLabResult.instructions && (
                      <div className="staff-test-instructions">
                        <strong>Special Instructions</strong>
                        <p>{selectedLabResult.instructions}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="staff-results-section">
                  <div className="staff-results-header">
                    <h4>Test Results</h4>
                    <span className={`staff-results-status ${selectedLabResult.hasResult ? 'completed' : 'pending'}`}>
                      {selectedLabResult.hasResult ? 'Results Available' : 'Pending Upload'}
                    </span>
                  </div>

                  {selectedLabResult.hasResult && selectedLabResult.resultData ? (
                    selectedLabResult.resultData?.isMultiple ? (
                      <div className="staff-clean-files-grid">
                        {selectedLabResult.resultData.files?.map((file, index) => (
                          <div key={index} className="staff-clean-file-item">
                            <div className="staff-file-type-icon">
                              <i className="fa-solid fa-file-medical"></i>
                            </div>
                            <div className="staff-clean-file-info">
                              <div className="staff-clean-file-name">{file.file_name}</div>
                              <div className="staff-clean-file-meta">
                                <span><i className="fa-solid fa-tag"></i> {file.file_type}</span>
                                {file.test_name && <span><i className="fa-solid fa-flask"></i> {file.test_name}</span>}
                                <span><i className="fa-solid fa-calendar"></i> {new Date(file.upload_date).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleViewFile(file.file_url, file.file_name)}
                              className="staff-clean-view-btn"
                            >
                              <i className="fa-solid fa-eye"></i> View
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="staff-clean-files-grid">
                        <div className="staff-clean-file-item">
                          <div className="staff-file-type-icon">
                            <i className="fa-solid fa-file-medical"></i>
                          </div>
                          <div className="staff-clean-file-info">
                            <div 
                              className="staff-clean-file-name"
                              onClick={() => handleViewFile(selectedLabResult.resultData.file_url, selectedLabResult.resultData.file_name)}
                            >
                              {selectedLabResult.resultData.file_name}
                            </div>
                            <div className="staff-clean-file-meta">
                              {new Date(selectedLabResult.resultData.upload_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="staff-pending-state">
                      <div className="staff-pending-state-icon">
                        <i className="fa-solid fa-clock"></i>
                      </div>
                      <h4>Pending Patient Upload</h4>
                      <p>The patient has been notified to upload their test results. Results will appear here once uploaded.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="staff-clean-modal-actions">
                <button 
                  className="staff-clean-close-btn"
                  onClick={() => setShowLabResultModal(false)}
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

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'overview':
        return renderOverview();
      case 'patients':
        return renderMyPatientsPage();
      case 'overall-patients':
        return renderOverallPatientsPage();
      case 'lab-orders':
        return renderLabOrdersPage();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="staff-dashboard">
      {/* Mobile Header */}
      <div className="staff-mobile-header">
        <button 
          className="staff-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <div className="staff-mobile-logo">
          <img src={clicareLogo} alt="CliCare Logo" />
        </div>
        <button className="staff-mobile-logout" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`staff-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="staff-sidebar-header">
          <div className="staff-sidebar-logo">
            <img src={clicareLogo} alt="CliCare Logo" className="webreg-reg-logo"/>
          </div>
          <button 
            className="staff-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="staff-navigation">
          {getMenuItems().map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false);
              }}
              className={`staff-nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="staff-nav-icon">{item.icon}</span>
              <div className="staff-nav-content">
                <div className="staff-nav-label">{item.label}</div>
                <div className="staff-nav-description">{item.description}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="staff-sidebar-footer">
          <div className="staff-user-info-wrapper">
            <div className="staff-user-details">
              <div className="staff-user-name">{staffInfo.name}</div>
              <div className="staff-user-id">{staffInfo.staffId}</div>
            </div>
            <button onClick={handleLogout} className="staff-logout-btn" title="Logout">
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="staff-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="staff-main-content">
        {renderCurrentPage()}
      </div>

      {/* Lab Request Modal */}
      {showLabRequestModal && (
        <div className="staff-modal-overlay">
          <div className="staff-modal">
            <div className="staff-modal-header">
              <h3>Create Lab Request</h3>
              <button 
                onClick={() => {
                  setShowLabRequestModal(false);
                  setSelectedPatientForLab(null);
                  setLabRequestForm({
                    test_requests: [{ test_name: '', test_type: '' }],
                    priority: 'normal',
                    instructions: '',
                    due_date: ''
                  });
                }}
                className="staff-modal-close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="staff-modal-content">
              <div className="staff-form-group">
                <label>Select Patient: *</label>
                <select 
                  value={selectedPatientForLab?.patient_id || ''}
                  onChange={(e) => {
                    const allAvailablePatients = [...(myPatients || []), ...(overallPatients || [])];
                    const patient = allAvailablePatients.find(p => p.patient_id === e.target.value);
                    setSelectedPatientForLab(patient);
                  }}
                  className="staff-form-select"
                  required
                >
                  <option value="">Choose a patient</option>
                  {myPatients && myPatients.length > 0 && (
                    <optgroup label="My Patients (Today)">
                      {myPatients.map(patient => (
                        <option key={`my-${patient.patient_id}`} value={patient.patient_id}>
                          {patient.name} ({patient.patient_id}) - {patient.age}y, {patient.sex}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {overallPatients && overallPatients.length > 0 && (
                    <optgroup label="All Patients">
                      {overallPatients
                        .filter(patient => !myPatients?.find(mp => mp.patient_id === patient.patient_id))
                        .map(patient => (
                          <option key={`all-${patient.patient_id}`} value={patient.patient_id}>
                            {patient.name} ({patient.patient_id}) - {patient.age}y, {patient.sex}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="staff-form-group">
                <label>Requested Tests: *</label>
                <div className="staff-tests-container">
                  {labRequestForm.test_requests.map((test, index) => (
                    <div key={index} className="staff-test-item">
                      <div className="staff-test-header">
                        <h4>Test {index + 1}</h4>
                        {labRequestForm.test_requests.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => removeTestFromRequest(index)}
                            className="staff-remove-test-btn"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="staff-test-fields">
                        <div className="staff-form-group">
                          <label>Test Name: *</label>
                          <input 
                            type="text"
                            value={test.test_name}
                            onChange={(e) => updateTestInRequest(index, 'test_name', e.target.value)}
                            placeholder="e.g., Complete Blood Count, Chest X-Ray"
                            className="staff-form-input"
                            required
                          />
                        </div>

                        <div className="staff-form-group">
                          <label>Test Type: *</label>
                          <select 
                            value={test.test_type}
                            onChange={(e) => updateTestInRequest(index, 'test_type', e.target.value)}
                            className="staff-form-select"
                            required
                          >
                            <option value="">Select test type</option>
                            <option value="Blood Test">Blood Test</option>
                            <option value="Urine Test">Urine Test</option>
                            <option value="Stool Test">Stool Test</option>
                            <option value="X-Ray">X-Ray</option>
                            <option value="CT Scan">CT Scan</option>
                            <option value="MRI">MRI</option>
                            <option value="Ultrasound">Ultrasound</option>
                            <option value="ECG">ECG/EKG</option>
                            <option value="Echo">Echocardiogram</option>
                            <option value="Biopsy">Biopsy</option>
                            <option value="Culture">Culture Test</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button"
                    onClick={addTestToRequest}
                    className="staff-add-test-btn"
                  >
                    + Add Another Test
                  </button>
                </div>
              </div>

              <div className="staff-form-group">
                <label>Priority:</label>
                <select 
                  value={labRequestForm.priority}
                  onChange={(e) => setLabRequestForm(prev => ({
                    ...prev, 
                    priority: e.target.value
                  }))}
                  className="staff-form-select"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT (Immediate)</option>
                </select>
              </div>

              <div className="staff-form-group">
                <label>Due Date: *</label>
                <input 
                  type="date"
                  value={labRequestForm.due_date}
                  onChange={(e) => setLabRequestForm(prev => ({
                    ...prev, 
                    due_date: e.target.value
                  }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="staff-form-input"
                  required
                />
              </div>

              <div className="staff-form-group">
                <label>Special Instructions:</label>
                <textarea 
                  value={labRequestForm.instructions}
                  onChange={(e) => setLabRequestForm(prev => ({
                    ...prev, 
                    instructions: e.target.value
                  }))}
                  placeholder="Any special instructions for the patient or lab..."
                  className="staff-form-textarea"
                  rows="3"
                />
              </div>
            </div>

            <div className="staff-modal-actions">
              <button 
                onClick={() => {
                  setShowLabRequestModal(false);
                  setSelectedPatientForLab(null);
                  setLabRequestForm({
                    test_requests: [{ test_name: '', test_type: '' }],
                    priority: 'normal',
                    instructions: '',
                    due_date: ''
                  });
                }}
                className="staff-modal-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={createLabRequest}
                disabled={
                  !selectedPatientForLab || 
                  !labRequestForm.due_date || 
                  labRequestForm.test_requests.some(test => !test.test_name?.trim() || !test.test_type)
                }
                className="staff-modal-btn primary"
              >
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Modal */}
      {showDiagnosisModal && (
        <div className="staff-modal-overlay">
          <div className="staff-modal">
            <div className="staff-modal-header">
              <h3>Create Diagnosis</h3>
              <button 
                onClick={() => {
                  setShowDiagnosisModal(false);
                  setSelectedPatientForDiagnosis(null);
                  setDiagnosisForm({
                    diagnosis_code: '',
                    diagnosis_description: '',
                    diagnosis_type: 'primary',
                    severity: 'mild',
                    notes: ''
                  });
                }}
                className="staff-modal-close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="staff-modal-content">
              {selectedPatientForDiagnosis && (
                <div className="staff-selected-patient-info">
                  <h4>Patient: {selectedPatientForDiagnosis.name}</h4>
                  <p>ID: {selectedPatientForDiagnosis.patient_id} | {selectedPatientForDiagnosis.age}y, {selectedPatientForDiagnosis.sex}</p>
                </div>
              )}

              <div className="staff-form-group">
                <label>Diagnosis Description:</label>
                <textarea 
                  value={diagnosisForm.diagnosis_description}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    diagnosis_description: e.target.value
                  }))}
                  placeholder="Enter the primary diagnosis..."
                  className="staff-form-textarea"
                  rows="4"
                  required
                />
              </div>

              <div className="staff-form-group">
                <label>Diagnosis Code (ICD-10):</label>
                <input 
                  type="text"
                  value={diagnosisForm.diagnosis_code}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    diagnosis_code: e.target.value
                  }))}
                  placeholder="e.g., Z00.00, M79.1"
                  className="staff-form-input"
                />
              </div>

              <div className="staff-form-group">
                <label>Diagnosis Type:</label>
                <select 
                  value={diagnosisForm.diagnosis_type}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    diagnosis_type: e.target.value
                  }))}
                  className="staff-form-select"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="differential">Differential</option>
                  <option value="provisional">Provisional</option>
                </select>
              </div>

              <div className="staff-form-group">
                <label>Severity:</label>
                <select 
                  value={diagnosisForm.severity}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    severity: e.target.value
                  }))}
                  className="staff-form-select"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="staff-form-group">
                <label>Additional Notes:</label>
                <textarea 
                  value={diagnosisForm.notes}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    notes: e.target.value
                  }))}
                  placeholder="Treatment recommendations, follow-up instructions, etc."
                  className="staff-form-textarea"
                  rows="3"
                />
              </div>
            </div>

            <div className="staff-modal-actions">
              <button 
                onClick={() => {
                  setShowDiagnosisModal(false);
                  setSelectedPatientForDiagnosis(null);
                  setDiagnosisForm({
                    diagnosis_code: '',
                    diagnosis_description: '',
                    diagnosis_type: 'primary',
                    severity: 'mild',
                    notes: ''
                  });
                }}
                className="staff-modal-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={createDiagnosis}
                disabled={!selectedPatientForDiagnosis || !diagnosisForm.diagnosis_description.trim()}
                className="staff-modal-btn primary"
              >
                Save Diagnosis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMain;