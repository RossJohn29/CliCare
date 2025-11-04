// staffmain.js
import React, { useState, useEffect } from 'react';
import './staffmain.css';
import clicareLogo from "../../clicareLogo.png";
import logo from "../../logo.png";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  ChartSpline,
  UserStar,
  Users,
  Search,
  X,
  FunnelX,
  LogOut,
  FlaskConical,
  ChartLine,
  Play,
  Check,
  ArrowLeft,
  Clipboard,
  Eye,
  Calendar,
  Tag,
  Clock,
  File,
  Plus,
  Info
} from 'lucide-react';

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
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalContent, setAlertModalContent] = useState({ title: '', message: '', type: 'info' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalContent, setConfirmModalContent] = useState({ title: '', message: '', onConfirm: null });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
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
          showAlert('Access Denied', 'This system is for doctors only.', 'error');
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
        showAlert('Error', 'Patient details not available', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch patient details:', error);
      showAlert('Error', 'Failed to load patient details', 'error');
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
    } catch (error){
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
        showAlert('Validation Error', 'Please select a patient', 'error');
        return;
      }
      
      for (let i = 0; i < labRequestForm.test_requests.length; i++) {
        const test = labRequestForm.test_requests[i];
        if (!test.test_name.trim()) {
          showAlert('Validation Error', `Please enter test name for Test ${i + 1}`, 'error');
          return;
        }
        if (!test.test_type) {
          showAlert('Validation Error', `Please select test type for Test ${i + 1}`, 'error');
          return;
        }
      }
      
      if (!labRequestForm.due_date) {
        showAlert('Validation Error', 'Please select due date', 'error');
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
        showAlert('Success', `Lab request created successfully!\n\nRequested Tests: ${labRequestForm.test_requests.length}\n\nThe patient will be notified to upload their results.`, 'success');
        
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
      showAlert('Error', 'Failed to create lab request: ' + error.message, 'error');
    }
  };

  const createDiagnosis = async () => {
    try {
      if (!selectedPatientForDiagnosis) {
        showAlert('Validation Error', 'Please select a patient', 'error');
        return;
      }
      
      if (!diagnosisForm.diagnosis_description.trim()) {
        showAlert('Validation Error', 'Please enter diagnosis description', 'error');
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
        showAlert('Success', `Diagnosis created successfully for ${selectedPatientForDiagnosis.name}!`, 'success');
        
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
      showAlert('Error', 'Failed to create diagnosis: ' + error.message, 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.replace('/staff-login');
  };

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  const showAlert = (title, message, type = 'info') => {
    setAlertModalContent({ title, message, type });
    setShowAlertModal(true);

    setTimeout(() => {
      setShowAlertModal(false);
    }, 3000);
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModalContent({ title, message, onConfirm });
    setShowConfirmModal(true);
  };

  const getMenuItems = () => {
    return [
      { 
        id: 'overview', 
        icon: <ChartSpline size={15} />, 
        label: 'Dashboard Overview', 
        description: 'Daily statistics and activities' 
      },
      { 
        id: 'patients', 
        icon: <UserStar size={15} />, 
        label: 'Patients Today', 
        description: 'Today\'s consultations only' 
      },
      { 
        id: 'overall-patients', 
        icon: <Users size={15} />, 
        label: 'Overall Patient', 
        description: 'All registered patients' 
      },
      { 
        id: 'lab-orders', 
        icon: <FlaskConical size={15} />, 
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
      showAlert('Error', 'File not available', 'error');
    }
  };

  const renderOverview = () => (
    <div className="staffmain-page-content">
      {loading ? (
        <div className="staffmain-loading-container">
          <div className="staffmain-loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="staffmain-middle-section">
            <div className="staffmain-stat-card hexagon primary">
              <div className="stat-card-inner">
                <div className="staffmain-stat-icon">
                  <Users size={20} />
                </div>
                <div className="staffmain-stat-content">
                  <h3>Patients Today</h3>
                  <div className="staffmain-stat-number">{dashboardData.todayStats.myPatients}</div>
                </div>
              </div>
            </div>

            <div className="staffmain-stat-card hexagon secondary">
              <div className="stat-card-inner">
                <div className="staffmain-stat-icon">
                  <Users size={20} />
                </div>
                <div className="staffmain-stat-content">
                  <h3>Overall Patient</h3>
                  <div className="staffmain-stat-number">{totalPatients}</div>
                </div>
              </div>
            </div>

            <div className="staffmain-stat-card hexagon tertiary">
              <div className="stat-card-inner">
                <div className="staffmain-stat-icon">
                  <FlaskConical size={20} />
                </div>
                <div className="staffmain-stat-content">
                  <h3>Lab Results</h3>
                  <div className="staffmain-stat-number">{dashboardData.todayStats.labResults}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="staffmain-bottom-section">
            <div className="middle-column left-column">
              <div className="staffmain-analytics-card">
                <div className="card-header">
                  <div className="analytics-trends-icon">
                    <Users size={20} />
                  </div>
                  <div className="header-text">
                    <h4>Patient Queue ({patientQueue.length})</h4>
                    <small className="analytics-subtitle">Current waiting patients</small>
                  </div>
                </div>
                
                {queueLoading ? (
                  <div className="staffmain-loading-spinner"></div>
                ) : (
                  <div className="healthcare-queue-list">
                    {patientQueue.length === 0 ? (
                      <div className="empty-state">
                       <h3>No patients found</h3>
                        <p>
                          No patients in queue for today
                        </p>
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
              <div className="staffmain-analytics-card">
                <div className="card-header">
                  <div className="analytics-trends-icon">
                    <ChartLine size={20} />
                  </div>
                  <div className="header-text">
                    <h4>Patient Statistics</h4>
                    <small className="analytics-subtitle">Activity over time</small>
                  </div>
                  <div className="staffmain-time-period-selector">
                    <button 
                      className={`staffmain-period-btn ${timePeriod === 'daily' ? 'active' : ''}`}
                      onClick={() => handleTimePeriodChange('daily')}
                      disabled={statsLoading}
                    >
                      Daily
                    </button>
                    <button 
                      className={`staffmain-period-btn ${timePeriod === 'weekly' ? 'active' : ''}`}
                      onClick={() => handleTimePeriodChange('weekly')}
                      disabled={statsLoading}
                    >
                      Weekly
                    </button>
                    <button 
                      className={`staffmain-period-btn ${timePeriod === 'yearly' ? 'active' : ''}`}
                      onClick={() => handleTimePeriodChange('yearly')}
                      disabled={statsLoading}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
                
                {statsLoading ? (
                  <div className="staffmain-loading-container">
                    <div className="staffmain-loading-spinner"></div>
                  </div>
                ) : dashboardTimeSeriesData.length === 0 ? (
                  <div className="empty-chart-state">
                    <p>No data available for the selected period</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                      data={dashboardTimeSeriesData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        className="chart-axis-small" 
                        tick={{ fill: '#6b7280', fontSize: 10 }}
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
                        tick={{ fill: '#6b7280', fontSize: 10 }}
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
                          fontWeight: '400',
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="registrations" 
                        stroke="#1a672a" 
                        strokeWidth={1}
                        name="New Patient Registrations"
                        dot={{ fill: '#1a672a', r: 2 }}
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
      <div className="staffmain-page-content">
        <div className="staffmain-search-section">
          <div className="staffmain-page-header">
            <div className="header-left">
              <h2>Patients Today</h2>
              <p>Patients consulted and scheduled for consultation today - {staffInfo.department}</p>
            </div>
          </div>

          <div className="staffmain-search-wrapper-new">
            <Search size={18} className="staffmain-search-icon"/>
            <input
              type="text"
              placeholder="Search by patient name, ID, contact, or symptoms..."
              value={myPatientsSearchTerm}
              onChange={(e) => setMyPatientsSearchTerm(e.target.value)}
              className="staffmain-search-input-new"
            />
            {myPatientsSearchTerm && (
              <button 
                onClick={() => setMyPatientsSearchTerm('')}
                className="staffmain-clear-search"
              >
                <X size={15} />
              </button>
            )}
          </div>
      
          {myPatientsSearchTerm && (
            <div className="staffmain-results-summary">
              <div className="staffmain-results-count">
                Showing <strong>{filteredPatients.length}</strong> of <strong>{myPatients.length}</strong> patients
              </div>
            </div>
          )}
        </div>

        <div className="staffmain-patients-grid">
          {filteredPatients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Users size={40} />
              </div>
              <h3>No patients found</h3>
              <p>
                {myPatientsSearchTerm 
                  ? `No patients match "${myPatientsSearchTerm}"`
                  : 'No patients in queue for today'
                }
              </p>
              {myPatientsSearchTerm && (
                <button 
                  onClick={() => setMyPatientsSearchTerm('')}
                  className="staffmain-action-btn"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div 
                key={patient.patient_id}
                className="staffmain-patient-card-simple"
              >
                <div className="healthcare-patient-info">
                  <div className="healthcare-patient-name">
                    {patient.name}
                    {patient.queueNumber && <span className="queue-indicator">#{patient.queueNumber}</span>}
                  </div>
                  <div className="healthcare-patient-id">{patient.patient_id}</div>
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
                        className="staffmain-action-btn start"
                      >
                        <Play size={15} /> Start Consultation
                      </button>
                    )}
                    {patient.queueStatus === 'in_progress' && (
                      <>
                        <button 
                          onClick={() => {
                            setSelectedPatientForLab(patient);
                            setShowLabRequestModal(true);
                          }}
                          className="staffmain-action-btn lab-request"
                        >
                          <FlaskConical size={15} /> Request Lab
                        </button>
                        <button 
                          onClick={() => updateQueueStatus(patient.queue_id, 'completed')}
                          className="staffmain-action-btn complete"
                        >
                          <Check size={15} /> Complete
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
      <div className="staffmain-page-content">
        <div className="staffmain-search-section">
          <div className="staffmain-page-header">
            <div className="header-left">
              <h2>Overall Patient</h2>
              <p>All registered patients in the system ({totalPatients} total)</p>
            </div>
          </div>

          <div className="staffmain-search-wrapper-new">
            <Search size={18} className="search-icon"/>
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
                <X size={15} />
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
          <div className="staffmain-loading-container">
            <div className="staffmain-loading-spinner"></div>
            <p>Loading all patients...</p>
          </div>
        ) : (
          <div className="staffmain-table-container">
            <table className="staffmain-data-table">
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
                        <Users size={40} />
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
                          className="staffmain-action-btn"
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
                      className="staffmain-table-row"
                      onClick={() => fetchPatientModal(patient.patient_id)}
                    >
                      <td>
                        <span className="healthcare-patient-id-highlight">
                          {patientSearchTerm ? (
                            patient.patient_id.split(new RegExp(`(${patientSearchTerm})`, 'gi')).map((part, index) =>
                              part.toLowerCase() === patientSearchTerm.toLowerCase() ? (
                                <mark key={index} className="staffmain-search-highlight">{part}</mark>
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
                            className="staffmain-action-btn view"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchPatientModal(patient.patient_id);
                            }}
                          >
                            View Details
                          </button>
                          <button 
                            className="staffmain-action-btn diagnosis"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatientForDiagnosis(patient);
                              setShowDiagnosisModal(true);
                            }}
                          >
                            Diagnosis
                          </button>
                          <button 
                            className="staffmain-action-btn lab"
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
      <div className="staffmain-page-content">
        <div className="staffmain-patient-details-container">
          
          {/* Profile Combined Card */}
          <div className="staffmain-profile-combined-card">

            <button 
              onClick={() => {
                setViewingPatientDetails(false);
                setSelectedPatientDetails(null);
                setPatientDetailsHistory([]);
              }}
              className="staffmain-back-btn"
            >
              <ArrowLeft size={20} /> Back
            </button>

            <div className="staffmain-profile-header-section">
              <div className="staffmain-profile-avatar">
                {selectedPatientDetails.name ? selectedPatientDetails.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="staffmain-profile-header-info">
                <div className="staffmain-profile-name-row">
                  <h2 className="staffmain-profile-name">{selectedPatientDetails.name}</h2>
                </div>
                <div className="staffmain-profile-meta">
                  <div className="staffmain-profile-meta-item">
                    <span>ID: {selectedPatientDetails.patient_id}</span>
                  </div>
                  <div className="staffmain-profile-meta-item">
                    <span>{selectedPatientDetails.age}y, {selectedPatientDetails.sex}</span>
                  </div>
                  <div className="staffmain-profile-meta-item">
                    <span>Contact: {selectedPatientDetails.contact_no}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="staffmain-profile-tab-content">
              <div className="staffmain-profile-section">
                <h3 className="staffmain-profile-section-title">Personal Information</h3>
                <div className="staffmain-profile-info-grid">
                  <div className="staffmain-profile-info-item">
                    <label className="staffmain-profile-info-label">Birthday</label>
                    <span className="staffmain-profile-info-value">
                      {new Date(selectedPatientDetails.birthday).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="staffmain-profile-info-item">
                    <label className="staffmain-profile-info-label">Age</label>
                    <span className="staffmain-profile-info-value">{selectedPatientDetails.age} years</span>
                  </div>
                  <div className="staffmain-profile-info-item">
                    <label className="staffmain-profile-info-label">Sex</label>
                    <span className="staffmain-profile-info-value">{selectedPatientDetails.sex}</span>
                  </div>
                  <div className="staffmain-profile-info-item">
                    <label className="staffmain-profile-info-label">Registration Date</label>
                    <span className="staffmain-profile-info-value">
                      {new Date(selectedPatientDetails.registration_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="staffmain-profile-info-item">
                    <label className="staffmain-profile-info-label">Phone</label>
                    <span className="staffmain-profile-info-value">{selectedPatientDetails.contact_no}</span>
                  </div>
                  <div className="staffmain-profile-info-item">
                    <label className="staffmain-profile-info-label">Email</label>
                    <span className="staffmain-profile-info-value">{selectedPatientDetails.email}</span>
                  </div>
                  <div className="staffmain-profile-info-item">
                    <label className="staffmain-profile-info-label">Address</label>
                    <span className="staffmain-profile-info-value">{selectedPatientDetails.address}</span>
                  </div>
                </div>
              </div>

              {selectedPatientDetails.emergencyContact && selectedPatientDetails.emergencyContact.length > 0 && (
                <div className="staffmain-profile-section">
                  <h3 className="staffmain-profile-section-title">Emergency Contact</h3>
                  <div className="staffmain-profile-info-grid">
                    <div className="staffmain-profile-info-item">
                      <label className="staffmain-profile-info-label">Name</label>
                      <span className="staffmain-profile-info-value">{selectedPatientDetails.emergencyContact[0].name}</span>
                    </div>
                    <div className="staffmain-profile-info-item">
                      <label className="staffmain-profile-info-label">Relationship</label>
                      <span className="staffmain-profile-info-value">{selectedPatientDetails.emergencyContact[0].relationship}</span>
                    </div>
                    <div className="staffmain-profile-info-item">
                      <label className="staffmain-profile-info-label">Phone</label>
                      <span className="staffmain-profile-info-value">{selectedPatientDetails.emergencyContact[0].contact_number}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="staffmain-profile-section">
                <h3 className="staffmain-profile-section-title">Medical History ({detailsHistoryPagination.totalVisits} total visits)</h3>
                {detailsHistoryLoading ? (
                  <div className="staffmain-loading-container">
                    <div className="staffmain-loading-spinner"></div>
                    <p>Loading medical history...</p>
                  </div>
                ) : patientDetailsHistory.length === 0 ? (
                  <div className="staffmain-empty-state">
                    <div className="staffmain-empty-icon">
                      <Clipboard size={40} />
                    </div>
                    <h3>No Medical History</h3>
                    <p>This patient has no recorded visits yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="staffmain-medical-history-timeline">
                      {patientDetailsHistory.map((visit) => (
                        <div key={visit.visit_id} className="staffmain-history-timeline-item">
                          <div className="staffmain-history-timeline-date">
                            {new Date(visit.visit_date).toLocaleDateString()} - {visit.visit_time}
                          </div>
                          <div className="staffmain-history-timeline-card">
                            <div className="staffmain-history-timeline-title">
                              {visit.appointment_type}
                            </div>
                            <div className="staffmain-history-timeline-details">
                              {visit.queue && visit.queue.length > 0 && (
                                <div className="staffmain-history-timeline-detail">
                                  <strong>Department:</strong>
                                  <span>{visit.queue[0].department.name}</span>
                                </div>
                              )}
                              <div className="staffmain-history-timeline-detail">
                                <strong>Queue No:</strong>
                                <span>#{visit.queue[0].queue_no}</span>
                              </div>
                              <div className="staffmain-history-timeline-detail">
                                <strong>Chief Complaint:</strong>
                                <span>{visit.symptoms}</span>
                              </div>
                            </div>

                            {visit.diagnosis && visit.diagnosis.length > 0 && (
                              <div className="staffmain-diagnoses-section">
                                <strong>Diagnoses:</strong>
                                {visit.diagnosis.map((diag) => (
                                  <div key={diag.diagnosis_id} className="staffmain-diagnosis-item">
                                    <div className="staffmain-diagnosis-header">
                                      <span className={`status-badge ${diag.diagnosis_type}`}>
                                        {diag.diagnosis_type}
                                      </span>
                                      <span className={`status-badge ${diag.severity}`}>
                                        {diag.severity}
                                      </span>
                                    </div>
                                    <div className="staffmain-diagnosis-desc">{diag.diagnosis_description}</div>
                                    {diag.notes && (
                                      <div className="staffmain-diagnosis-notes">
                                        <strong>Notes:</strong> {diag.notes}
                                      </div>
                                    )}
                                    {diag.healthStaff && (
                                      <div className="staffmain-diagnosis-doctor-enhanced">
                                        <div className="staffmain-doctor-info-card">
                                          <div className="staffmain-doctor-avatar">
                                            <UserStar size={20} />
                                          </div>
                                          <div className="staffmain-doctor-details">
                                            <div className="staffmain-doctor-name">Dr. {diag.healthStaff.name}</div>
                                            <div className="staffmain-doctor-specialty">{diag.healthStaff.specialization || 'General Practice'}</div>
                                            <div className="staffmain-doctor-role">{diag.healthStaff.role}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {visit.labRequest && visit.labRequest.length > 0 && (
                              <div className="staffmain-lab-requests-section">
                                <strong>Lab Requests:</strong>
                                {visit.labRequest.map((labReq, idx) => (
                                  <div key={idx} className="staffmain-lab-request-item">
                                    <span className="staffmain-lab-test-type">{labReq.test_type}</span>
                                    <span className={`status-badge ${labReq.status}`}>{labReq.status}</span>
                                    {labReq.healthStaff && (
                                      <span className="staffmain-lab-requested-by">
                                        Requested by: Dr. {labReq.healthStaff.name}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {detailsHistoryPagination.totalPages > 1 && (
                      <div className="staffmain-pagination">
                        <button 
                          onClick={() => fetchPatientDetailsHistory(selectedPatientDetails.id, detailsHistoryPagination.currentPage - 1)}
                          disabled={detailsHistoryPagination.currentPage === 1}
                          className="staffmain-page-btn"
                        >
                          <ArrowLeft size={15} /> Previous
                        </button>
                        <span className="staffmain-page-info">
                          Page {detailsHistoryPagination.currentPage} of {detailsHistoryPagination.totalPages}
                        </span>
                        <button 
                          onClick={() => fetchPatientDetailsHistory(selectedPatientDetails.id, detailsHistoryPagination.currentPage + 1)}
                          disabled={!detailsHistoryPagination.hasNextPage}
                          className="staffmain-page-btn"
                        >
                          Next <ArrowLeft size={15} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLabOrdersPage = () => {
    const filteredLabData = getFilteredLabData();
    const activeFiltersCount = Object.values(labFilters).filter(f => f !== 'all').length + (labSearchTerm ? 1 : 0);

    return (
      <div className="staffmain-page-content">
        <div className="staffmain-search-section">
          <div className="staffmain-page-header">
            <div className="header-left">
              <h2>Laboratory Orders</h2>
              <p>Manage laboratory test requests and review submitted results</p>
            </div>
          </div>

          <div className="staffmain-search-wrapper-new">
            <Search size={18} className="staffmain-search-icon"/>
            <input
              type="text"
              placeholder="Search by patient name, ID, test name, or test type..."
              value={labSearchTerm}
              onChange={(e) => setLabSearchTerm(e.target.value)}
              className="staffmain-search-input-new"
            />
            {labSearchTerm && (
              <button className="staffmain-clear-search" onClick={() => setLabSearchTerm('')}>
                <X size={15} />
              </button>
            )}
          </div>

          <div className="staffmain-filter-section">
            <div className="staffmain-filter-controls">
              <select 
                value={labFilters.status} 
                onChange={(e) => setLabFilters({...labFilters, status: e.target.value})}
                className="staffmain-filter-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Upload</option>
                <option value="completed">Completed</option>
              </select>

              <select 
                value={labFilters.priority} 
                onChange={(e) => setLabFilters({...labFilters, priority: e.target.value})}
                className="staffmain-filter-select"
              >
                <option value="all">All Priority</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>

              <select 
                value={labFilters.testType} 
                onChange={(e) => setLabFilters({...labFilters, testType: e.target.value})}
                className="staffmain-filter-select"
              >
                <option value="all">All Test Types</option>
                {getUniqueTestTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select 
                value={labFilters.dateRange} 
                onChange={(e) => setLabFilters({...labFilters, dateRange: e.target.value})}
                className="staffmain-filter-select"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              {activeFiltersCount > 0 && (
                <button className="staffmain-reset-filters-btn" onClick={resetLabFilters}>
                  <FunnelX size={15} />
                </button>
              )}

              <div className="staffmain-sort-controls">
                <label>Sort by:</label>
                <select value={labSortBy} onChange={(e) => setLabSortBy(e.target.value)} className="staffmain-sort-select">
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priority">Priority</option>
                  <option value="patient">Patient Name</option>
                </select>
              </div>
            </div>
          </div>

          <div className="staffmain-results-summary">
            <div className="staffmain-results-count">
              Showing <strong>{filteredLabData.length}</strong> of <strong>{allLabData.length}</strong> lab orders
            </div>
          </div>
        </div>

        {labDataLoading ? (
          <div className="staffmain-loading-container">
            <div className="staffmain-loading-spinner"></div>
            <p>Loading laboratory data...</p>
          </div>
        ) : filteredLabData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FlaskConical size={40} />
            </div>
            <h3>No lab orders found</h3>
            <p>
              {activeFiltersCount > 0 
                ? 'Try adjusting your search or filters' 
                : 'No lab orders available'
              }
            </p>
          </div>
        ) : (
          <div className="staffmain-table-container">
            <table className="staffmain-data-table">
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
                          setSelectedlab_result(item);
                          setShowLabResultModal(true);
                        }}
                        className="staffmain-action-btn view"
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
          <div className="staffmain-modal-overlay" onClick={() => setShowLabResultModal(false)}>
            <div className="staffmain-modal staffmain-lab-result-modal" onClick={(e) => e.stopPropagation()}>
              <div className="staffmain-lab-modal-header">
                <h3>Lab Test Details</h3>
                <button 
                  className="staffmain-modal-close"
                  onClick={() => setShowLabResultModal(false)}
                >
                  <X size={15} />
                </button>
              </div>
              
              <div className="staffmain-lab-modal-content">
                <div className="staffmain-test-summary-card">
                  <div className="staffmain-patient-info-card">
                    <div className="staffmain-patient-info-header">
                      <div className="staffmain-patient-details">
                        <h4>{selectedLabResult.patient?.name}</h4>
                        <div className="staffmain-patient-meta">
                          <span>{selectedLabResult.patient?.patient_id}</span>
                          <span>{selectedLabResult.patient?.age} years old</span>
                          <span>{selectedLabResult.patient?.sex}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="staffmain-test-summary-header">
                    <h4>Test Request Information</h4>
                    <span className={`staffmain-test-priority-badge ${selectedLabResult.priority}`}>
                      {selectedLabResult.priority === 'stat' ? 'STAT' : selectedLabResult.priority}
                    </span>
                  </div>
                  <div className="staffmain-test-summary-body">
                    <div className="staffmain-test-info-grid">
                      <div className="staffmain-test-info-item">
                        <span className="staffmain-test-info-label">Test Name</span>
                        <span className="staffmain-test-info-value">{selectedLabResult.test_name}</span>
                      </div>
                      <div className="staffmain-test-info-item">
                        <span className="staffmain-test-info-label">Test Type</span>
                        <span className="staffmain-test-info-value">{selectedLabResult.test_type}</span>
                      </div>
                      <div className="staffmain-test-info-item">
                        <span className="staffmain-test-info-label">Request Date</span>
                        <span className="staffmain-test-info-value">{new Date(selectedLabResult.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="staffmain-test-info-item">
                        <span className="staffmain-test-info-label">Due Date</span>
                        <span className="staffmain-test-info-value">{new Date(selectedLabResult.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {selectedLabResult.instructions && (
                      <div className="staffmain-test-instructions">
                        <strong>Special Instructions</strong>
                        <p>{selectedLabResult.instructions}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="staffmain-results-section">
                  <div className="staffmain-results-header">
                    <h4>Test Results</h4>
                    <span className={`staffmain-results-status ${selectedLabResult.hasResult ? 'completed' : 'pending'}`}>
                      {selectedLabResult.hasResult ? 'Results Available' : 'Pending Upload'}
                    </span>
                  </div>

                  {selectedLabResult.hasResult && selectedLabResult.resultData ? (
                    selectedLabResult.resultData?.isMultiple ? (
                      <div className="staffmain-clean-files-grid">
                        {selectedLabResult.resultData.files?.map((file, index) => (
                          <div key={index} className="staffmain-clean-file-item">
                            <div className="staffmain-file-type-icon">
                              <File size={20} />
                            </div>
                            <div className="staffmain-clean-file-info">
                              <div className="staffmain-clean-file-name">{file.file_name}</div>
                              <div className="staffmain-clean-file-meta">
                                <span><Tag size={12} /> {file.file_type}</span>
                                {file.test_name && <span><FlaskConical size={12} /> {file.test_name}</span>}
                                <span><Calendar size={12} /> {new Date(file.upload_date).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleViewFile(file.file_url, file.file_name)}
                              className="staffmain-clean-view-btn"
                            >
                              <Eye size={15} /> View
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="staffmain-clean-files-grid">
                        <div className="staffmain-clean-file-item">
                          <div className="staffmain-file-type-icon">
                            <File size={20} />
                          </div>
                          <div className="staffmain-clean-file-info">
                            <div 
                              className="staffmain-clean-file-name"
                              onClick={() => handleViewFile(selectedLabResult.resultData.file_url, selectedLabResult.resultData.file_name)}
                            >
                              {selectedLabResult.resultData.file_name}
                            </div>
                            <div className="staffmain-clean-file-meta">
                              {new Date(selectedLabResult.resultData.upload_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="staffmain-pending-state">
                      <div className="staffmain-pending-state-icon">
                        <Clock size={30} />
                      </div>
                      <h4>Pending Patient Upload</h4>
                      <p>Results will appear here once uploaded.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="staffmain-clean-modal-actions">
                <button 
                  className="staffmain-clean-close-btn"
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
    <div className="staffmain-dashboard">
      <div className="staffmain-mobile-header">
        <button 
          className="staffmain-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <div className="staffmain-mobile-logo">
          <img src={clicareLogo} alt="CliCare Logo" />
        </div>
        <button className="staffmain-mobile-logout" onClick={confirmLogout}>
          <LogOut size={20} />
        </button>
      </div>

      <div className={`staffmain-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="staffmain-sidebar-header">
          <div className="staffmain-sidebar-logo">
            <img src={clicareLogo} alt="CliCare Logo" className="webreg-reg-logo"/>
          </div>
          <button 
            className="staffmain-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="staffmain-navigation">
          {getMenuItems().map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false);
              }}
              className={`staffmain-nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="staffmain-nav-icon">{item.icon}</span>
              <div className="staffmain-nav-content">
                <div className="staffmain-nav-label">{item.label}</div>
                <div className="staffmain-nav-description">{item.description}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="staffmain-sidebar-footer">
          <div className="staffmain-user-info-wrapper">
            <div className="staffmain-user-details">
              <div className="staffmain-user-name">{staffInfo.name}</div>
              <div className="staffmain-user-id">{staffInfo.staffId}</div>
            </div>
            <button onClick={confirmLogout} className="staffmain-logout-btn" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div 
          className="staffmain-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div className="staffmain-main-content">
        {renderCurrentPage()}
      </div>

      {showLabRequestModal && (
        <div className="staffmain-modal-overlay">
          <div className="staffmain-modal">
            <div className="staffmain-modal-header">
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
                className="staffmain-modal-close"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="staffmain-modal-content">
              <div className="staffmain-form-group">
                <label>Select Patient: *</label>
                <select 
                  value={selectedPatientForLab?.patient_id || ''}
                  onChange={(e) => {
                    const allAvailablePatients = [...(myPatients || []), ...(overallPatients || [])];
                    const patient = allAvailablePatients.find(p => p.patient_id === e.target.value);
                    setSelectedPatientForLab(patient);
                  }}
                  className="staffmain-form-select"
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

              <div className="staffmain-form-group">
                <label>Requested Tests: *</label>
                <div className="staffmain-tests-container">
                  {labRequestForm.test_requests.map((test, index) => (
                    <div key={index} className="staffmain-test-item">
                      <div className="staffmain-test-header">
                        <h4>Test {index + 1}</h4>
                        {labRequestForm.test_requests.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => removeTestFromRequest(index)}
                            className="staffmain-remove-test-btn"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="staffmain-test-fields">
                        <div className="staffmain-form-group">
                          <label>Test Name: *</label>
                          <input 
                            type="text"
                            value={test.test_name}
                            onChange={(e) => updateTestInRequest(index, 'test_name', e.target.value)}
                            placeholder="e.g., Complete Blood Count, Chest X-Ray"
                            className="staffmain-form-input"
                            required
                          />
                        </div>

                        <div className="staffmain-form-group">
                          <label>Test Type: *</label>
                          <select 
                            value={test.test_type}
                            onChange={(e) => updateTestInRequest(index, 'test_type', e.target.value)}
                            className="staffmain-form-select"
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
                    className="staffmain-add-test-btn"
                  >
                    <Plus size={10} /> Add Another Test
                  </button>
                </div>
              </div>

              <div className="staffmain-form-group">
                <label>Priority:</label>
                <select 
                  value={labRequestForm.priority}
                  onChange={(e) => setLabRequestForm(prev => ({
                    ...prev, 
                    priority: e.target.value
                  }))}
                  className="staffmain-form-select"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT (Immediate)</option>
                </select>
              </div>

              <div className="staffmain-form-group">
                <label>Due Date: *</label>
                <input 
                  type="date"
                  value={labRequestForm.due_date}
                  onChange={(e) => setLabRequestForm(prev => ({
                    ...prev, 
                    due_date: e.target.value
                  }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="staffmain-form-input"
                  required
                />
              </div>

              <div className="staffmain-form-group">
                <label>Special Instructions:</label>
                <textarea 
                  value={labRequestForm.instructions}
                  onChange={(e) => setLabRequestForm(prev => ({
                    ...prev, 
                    instructions: e.target.value
                  }))}
                  placeholder="Any special instructions for the patient or lab..."
                  className="staffmain-form-textarea"
                  rows="3"
                />
              </div>
            </div>

            <div className="staffmain-modal-actions">
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
                className="staffmain-modal-btn secondary"
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
                className="staffmain-modal-btn primary"
              >
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiagnosisModal && (
        <div className="staffmain-modal-overlay">
          <div className="staffmain-modal">
            <div className="staffmain-modal-header">
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
                className="staffmain-modal-close"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="staffmain-modal-content">
              {selectedPatientForDiagnosis && (
                <div className="staffmain-selected-patient-info">
                  <h4>Patient: {selectedPatientForDiagnosis.name}</h4>
                  <p>ID: {selectedPatientForDiagnosis.patient_id} | {selectedPatientForDiagnosis.age}y, {selectedPatientForDiagnosis.sex}</p>
                </div>
              )}

              <div className="staffmain-form-group">
                <label>Diagnosis Description:</label>
                <textarea 
                  value={diagnosisForm.diagnosis_description}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    diagnosis_description: e.target.value
                  }))}
                  placeholder="Enter the primary diagnosis..."
                  className="staffmain-form-textarea"
                  rows="4"
                  required
                />
              </div>

              <div className="staffmain-form-group">
                <label>Diagnosis Code (ICD-10):</label>
                <input 
                  type="text"
                  value={diagnosisForm.diagnosis_code}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    diagnosis_code: e.target.value
                  }))}
                  placeholder="e.g., Z00.00, M79.1"
                  className="staffmain-form-input"
                />
              </div>

              <div className="staffmain-form-group">
                <label>Diagnosis Type:</label>
                <select 
                  value={diagnosisForm.diagnosis_type}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    diagnosis_type: e.target.value
                  }))}
                  className="staffmain-form-select"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="differential">Differential</option>
                  <option value="provisional">Provisional</option>
                </select>
              </div>

              <div className="staffmain-form-group">
                <label>Severity:</label>
                <select 
                  value={diagnosisForm.severity}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    severity: e.target.value
                  }))}
                  className="staffmain-form-select"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="staffmain-form-group">
                <label>Additional Notes:</label>
                <textarea 
                  value={diagnosisForm.notes}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    notes: e.target.value
                  }))}
                  placeholder="Treatment recommendations, follow-up instructions, etc."
                  className="staffmain-form-textarea"
                  rows="3"
                />
              </div>
            </div>

            <div className="staffmain-modal-actions">
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
                className="staffmain-modal-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={createDiagnosis}
                disabled={!selectedPatientForDiagnosis || !diagnosisForm.diagnosis_description.trim()}
                className="staffmain-modal-btn primary"
              >
                Save Diagnosis
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlertModal && (
        <div className="staffmain-modal-overlay">
          <div className="staffmain-modal staffmain-alert-modal">
            <div className="staffmain-alert-content">
              <div className={`staffmain-alert-icon ${alertModalContent.type}`}>
                {alertModalContent.type === 'success' && <Check size={24} />}
                {alertModalContent.type === 'error' && <X size={24} />}
                {alertModalContent.type === 'info' && <Info size={24} />}
              </div>
              <h3>{alertModalContent.title}</h3>
              <p>{alertModalContent.message}</p>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="staffmain-modal-overlay">
          <div className="staffmain-modal">
            <div className="staffmain-modal-header">
              <h3>Confirm Logout</h3>
              <button 
                className="staffmain-modal-close" 
                onClick={() => setShowLogoutModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="staffmain-modal-content">
              <p>Are you sure you want to logout? You will need to login again to access the staff dashboard.</p>
            </div>
            <div className="staffmain-modal-actions">
              <button 
                className="staffmain-modal-btn secondary" 
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button 
                className="staffmain-modal-btn logout" 
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

export default StaffMain;