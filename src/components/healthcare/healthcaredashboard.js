// healthcaredashboard.js - CLICARE Healthcare Dashboard Component (Doctor Only)
import React, { useState, useEffect } from 'react';
import './healthcaredashboard.css';

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
  const [patientQueue, setPatientQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [myPatients, setMyPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [overallPatients, setOverallPatients] = useState([]);
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [overallLoading, setOverallLoading] = useState(false);
  const [showLabResultModal, setShowLabResultModal] = useState(false);
  const [selectedLabResult, setSelectedLabResult] = useState(null);
  const [labResultModalLoading, setLabResultModalLoading] = useState(false);
  const [totalPatients, setTotalPatients] = useState(0);
  const [historyPagination, setHistoryPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalVisits: 0,
    hasNextPage: false
  });
  const [labRequests, setLabRequests] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [showLabRequestModal, setShowLabRequestModal] = useState(false);
  const [selectedPatientForLab, setSelectedPatientForLab] = useState(null);
  const [labRequestForm, setLabRequestForm] = useState({
    test_requests: [{ test_name: '', test_type: '' }],
    priority: 'normal',
    instructions: '',
    due_date: ''
  });
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedPatientForDiagnosis, setSelectedPatientForDiagnosis] = useState(null);
  const [diagnosisForm, setDiagnosisForm] = useState({
    diagnosis_code: '',
    diagnosis_description: '',
    diagnosis_type: 'primary',
    severity: 'mild',
    notes: ''
  });

  const removeTestFromRequest = (index) => {
    if (labRequestForm.test_requests.length === 1) return; // Keep at least one
    
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

  // New state variables for enhanced lab orders
  const [activeLabTab, setActiveLabTab] = useState('all');
  const [allLabData, setAllLabData] = useState([]);
  const [labDataLoading, setLabDataLoading] = useState(false);

  // Helper functions for lab data
  const getFilteredLabData = () => {
    switch (activeLabTab) {
      case 'pending':
        return allLabData.filter(item => item.status === 'pending');
      case 'completed':
        return allLabData.filter(item => item.status === 'completed' && item.hasResult);
      default:
        return allLabData;
    }
  };

  const handleViewFile = (fileUrl, fileName) => {
    if (fileUrl) {
      // Ensure proper URL format
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000${fileUrl}`;
      window.open(fullUrl, '_blank');
    } else {
      alert('File not available');
    }
  };

  const fetchAllLabData = async () => {
  setLabDataLoading(true);
  try {
    // Fetch both lab requests and results
    await Promise.all([
      fetchLabRequests(),
      fetchLabResults()
    ]);
    
    // After both are fetched, combine lab requests with their results
    const combinedData = labRequests.map(request => ({
      ...request,
      hasResult: request.labResult !== null,
      resultData: request.labResult || null
    }));
    
    setAllLabData(combinedData);
  } catch (error) {
    console.error('Failed to fetch lab data:', error);
  } finally {
    setLabDataLoading(false);
  }
};

// Add this new useEffect after the lab data useEffect
  useEffect(() => {
    const fetchPatientsWhenNeeded = async () => {
      if (currentPage === 'patients') {
        console.log('Fetching patients for My Patients page...');
        await fetchMyPatients();
      }
    };

    fetchPatientsWhenNeeded();
  }, [currentPage]); // Refresh when page changes to 'patients'

  useEffect(() => {
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

  const initializeDashboard = async () => {
    try {
      const token = localStorage.getItem('healthcareToken'); 
      const staffInfo = localStorage.getItem('staffInfo');   
      
      if (!token || !staffInfo) {
        window.location.replace('/healthcare-login');
        return;
      }

      const isValid = await validateHealthcareToken();
      if (!isValid) {
        localStorage.clear();
        window.location.replace('/healthcare-login');
        return;
      }

      const parsedStaffInfo = JSON.parse(staffInfo);
      
      if (parsedStaffInfo.role !== 'Doctor') {
        alert('Access denied. This system is for doctors only.');
        window.location.replace('/healthcare-login');
        return;
      }
      
      setStaffInfo({
        staffId: parsedStaffInfo.staff_id,
        name: parsedStaffInfo.name,
        role: 'Attending Physician',
        department: parsedStaffInfo.specialization || 'General Medicine',
        staffType: 'doctor'
      });

      // Fetch initial data
      await fetchPatientQueue();
      await fetchMyPatients();
      await fetchOverallPatients();
      
      setLoading(false);

    } catch (error) {
      console.error('Error initializing dashboard:', error);
      localStorage.clear();
      window.location.replace('/healthcare-login');
    }
  };

  initializeDashboard();
  
  // Set up auto-refresh every 60 seconds
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
}, []); // Empty dependency array

// Replace the existing useEffect for lab data in healthcaredashboard.js
useEffect(() => {
  const fetchLabDataWhenNeeded = async () => {
    if (currentPage === 'lab-orders') {
      try {
        setLabDataLoading(true);
        await fetchLabRequests();
        await fetchLabResults();
        
        // FIXED: Don't reset data every time, maintain persistent storage
        // Remove the date-based filtering that was causing daily resets
        const combinedData = labRequests.map(request => ({
          ...request,
          hasResult: request.labResult !== null,
          resultData: request.labResult || null
        }));
        
        setAllLabData(combinedData);
      } catch (error) {
        console.error('Error fetching lab data:', error);
      } finally {
        setLabDataLoading(false);
      }
    }
  };

  fetchLabDataWhenNeeded();
}, [currentPage]); // Keep only currentPage as dependency

  useEffect(() => {
    if (currentPage === 'patients' && selectedPatient) {
      const interval = setInterval(() => {
        fetchPatientHistory(selectedPatient.patient_id, historyPagination.currentPage);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [currentPage, selectedPatient, historyPagination.currentPage]);

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
      // No filtering needed here - the backend now properly groups by request
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
    
    // First, get or create a visit for today
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

    // Create diagnosis
    const diagnosisData = {
      visit_id: visitData.visit_id,
      patient_id: selectedPatientForDiagnosis.patient_id,
      diagnosis_code: diagnosisForm.diagnosis_code.trim() || null,
      diagnosis_description: diagnosisForm.diagnosis_description.trim(),
      diagnosis_type: diagnosisForm.diagnosis_type,
      severity: diagnosisForm.severity,
      notes: diagnosisForm.notes.trim() || null
    };

    const { data: staffData } = await fetch('http://localhost:5000/api/healthcare/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

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
      
      // Reset form and close modal
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

const createLabRequest = async () => {
  try {
    // Validate required fields
    if (!selectedPatientForLab) {
      alert('Please select a patient');
      return;
    }
    
    // Validate all tests have required fields
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
    
    // Create grouped lab request
    const requestData = {
      patient_id: selectedPatientForLab.patient_id,
      test_requests: labRequestForm.test_requests.map(test => ({
        test_name: test.test_name.trim(),
        test_type: test.test_type
      })),
      priority: labRequestForm.priority || 'normal',
      instructions: labRequestForm.instructions.trim(),
      due_date: labRequestForm.due_date,
      is_grouped: true, // Flag to indicate this is a grouped request
      group_name: `Multiple Tests - ${new Date().toLocaleDateString()}`
    };

    console.log('Creating grouped lab request:', requestData);

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
      
      // Reset form and close modal
      setShowLabRequestModal(false);
      setSelectedPatientForLab(null);
      setLabRequestForm({
        test_requests: [{ test_name: '', test_type: '' }],
        priority: 'normal',
        instructions: '',
        due_date: ''
      });
      
      // Refresh data
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

const fetchPatientModal = async (patientId) => {
  try {
    setModalLoading(true);
    
    // Find patient in existing data
    const patient = overallPatients.find(p => p.patient_id === patientId);
    
    if (patient) {
      setSelectedPatientModal(patient);
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
  const fetchMyPatients = async () => {
    try {
      const token = localStorage.getItem('healthcareToken');
      const today = new Date().toISOString().split('T')[0];
      
      console.log('Fetching my patients for date:', today);
      
      const response = await fetch(`http://localhost:5000/api/healthcare/my-patients-queue?date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('My patients data received:', data);
        console.log('Number of patients:', data.patients?.length || 0);
        console.log('Summary:', data.summary);
        
        setMyPatients(data.patients || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch my patients:', response.status, errorData);
        setMyPatients([]);
      }
    } catch (error) {
      console.error('Failed to fetch my patients:', error);
      setMyPatients([]);
    }
  };

  const fetchPatientHistory = async (patientId, page = 1) => {
    try {
      setHistoryLoading(true);
      const token = localStorage.getItem('healthcareToken');
      
      const response = await fetch(`http://localhost:5000/api/healthcare/patient-history/${patientId}?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedPatient(data.patient);
        setPatientHistory(data.visitHistory || []);
        setHistoryPagination(data.pagination);
      } else {
        setPatientHistory([]);
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error('Failed to fetch patient history:', error);
      setPatientHistory([]);
    } finally {
      setHistoryLoading(false);
    }
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
        
        // UPDATED: Get overall lab results count from dashboard stats endpoint
        const today = new Date().toISOString().split('T')[0];
        const statsResponse = await fetch(`http://localhost:5000/api/healthcare/dashboard-stats?date=${today}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          
          // Use the server-provided total completed lab results count
          setDashboardData(prev => ({
            ...prev,
            todayStats: {
              myPatients: statsData.stats.myPatientsToday || 0,
              labResults: statsData.stats.totalLabResults || 0  // Overall completed results
            }
          }));
        } else {
          // Fallback to zero if stats endpoint fails
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
        // Refresh both queue and patient data to reflect changes
        await fetchPatientQueue();
        if (currentPage === 'patients') {
          await fetchMyPatients();
        }
      }
    } catch (error) {
      console.error('Failed to update queue status:', error);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      window.location.replace('/healthcare-login');
    }
  };

  const getMenuItems = () => {
    return [
      { id: 'overview', icon: '📊', label: 'Dashboard Overview', description: 'Daily statistics and activities' },
      { id: 'patients', icon: '👥', label: 'My Patients', description: 'Today\'s consultations only' },
      { id: 'overall-patients', icon: '👤', label: 'Overall Patient', description: 'All registered patients' },
      { id: 'lab-orders', icon: '🧪', label: 'Lab Orders', description: 'Laboratory test requests' }
    ];
  };

// Replace the renderLabOrdersPage function in healthcaredashboard.js
const renderLabOrdersPage = () => (
  <div className="healthcare-page-content">
    <div className="healthcare-page-header">
      <h2>Laboratory Management</h2>
      <p>Manage laboratory test requests and review submitted results</p>
    </div>

    <div className="healthcare-lab-tabs">
      <div className="healthcare-tab-buttons">
        <button 
          className={`healthcare-tab-btn ${activeLabTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveLabTab('all')}
        >
          All Lab Orders ({allLabData.length})
        </button>
        <button 
          className={`healthcare-tab-btn ${activeLabTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveLabTab('pending')}
        >
          Pending Upload ({allLabData.filter(item => item.status === 'pending').length})
        </button>
        <button 
          className={`healthcare-tab-btn ${activeLabTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveLabTab('completed')}
        >
          Completed ({allLabData.filter(item => item.status === 'completed' && item.hasResult).length})
        </button>
      </div>

      <div className="healthcare-lab-actions">
        <button 
          onClick={async () => {
            try {
              setLabDataLoading(true);
              await fetchLabRequests();
              await fetchLabResults();
              
              const combinedData = labRequests.map(request => ({
                ...request,
                hasResult: request.labResult !== null,
                resultData: request.labResult || null
              }));
              
              setAllLabData(combinedData);
            } catch (error) {
              console.error('Refresh failed:', error);
            } finally {
              setLabDataLoading(false);
            }
          }}
          className="healthcare-action-btn"
          disabled={labDataLoading}
        >
          {labDataLoading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>
    </div>

    {labDataLoading ? (
      <div className="healthcare-loading-container">
        <div className="healthcare-loading-spinner"></div>
        <p>Loading laboratory data...</p>
      </div>
    ) : (
      <div className="healthcare-lab-results-section">
        {getFilteredLabData().length === 0 ? (
          <div className="healthcare-no-data">
            <div className="healthcare-no-data-icon">🧪</div>
            <p>No {activeLabTab === 'all' ? 'lab orders' : activeLabTab === 'pending' ? 'pending requests' : 'completed results'} found</p>
            {activeLabTab === 'all' && (
              <button 
                onClick={() => setShowLabRequestModal(true)}
                className="healthcare-action-btn"
              >
                Create First Lab Request
              </button>
            )}
          </div>
        ) : (
          <div className="healthcare-lab-results-grid">
            {getFilteredLabData().map((item) => (
              <div key={item.request_id} className={`healthcare-lab-result-card ${item.status}`}>
                <div className="healthcare-lab-result-header">
                  <div className="healthcare-lab-info">
                    <h4>{item.test_name}</h4>
                    <div className="healthcare-lab-meta">
                      <span className="healthcare-request-id">#{item.request_id}</span>
                      <span className={`healthcare-lab-status ${item.status}`}>
                        {item.status === 'pending' ? 
                          (item.uploadedFileCount > 0 ? 
                            `Partial (${item.uploadedFileCount}/${item.expectedFileCount})` : 
                            'Awaiting Upload'
                          ) : 
                          item.status === 'completed' ? 'All Results Available' : 
                          item.status}
                      </span>
                      {item.hasMultipleTests && (
                        <span className="healthcare-test-count">
                          {item.expectedFileCount} tests requested
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* UPDATED: Show summary info and View Details button only */}
                  <div className="healthcare-lab-actions">
                    {item.hasResult && item.resultData && (
                      <>
                        <span className="healthcare-files-indicator">
                          {item.resultData.isMultiple ? 
                            `${item.resultData.totalFiles} files` : 
                            '1 file'
                          }
                        </span>
                        <button 
                          onClick={() => {
                            setSelectedLabResult(item);
                            setShowLabResultModal(true);
                          }}
                          className="healthcare-view-result-btn"
                          title="View all uploaded results"
                        >
                          View Details
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="healthcare-lab-result-content">
                  <div className="healthcare-patient-info">
                    <div className="healthcare-patient-details">
                      <strong>{item.patient?.name}</strong>
                      <span>ID: {item.patient?.patient_id}</span>
                      <span>{item.patient?.age}y, {item.patient?.sex}</span>
                    </div>
                    <div className="healthcare-contact-info">
                      <span>{item.patient?.contact_no}</span>
                    </div>
                  </div>

                  <div className="healthcare-lab-details">
                    <div className="healthcare-lab-detail-row">
                      <span>Test Type:</span>
                      <span>{item.test_type}</span>
                    </div>
                    <div className="healthcare-lab-detail-row">
                      <span>Priority:</span>
                      <span className={`priority ${item.priority}`}>{item.priority}</span>
                    </div>
                    <div className="healthcare-lab-detail-row">
                      <span>Requested:</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="healthcare-lab-detail-row">
                      <span>Due Date:</span>
                      <span>{new Date(item.due_date).toLocaleDateString()}</span>
                    </div>
                    {item.instructions && (
                      <div className="healthcare-lab-instructions">
                        <strong>Instructions:</strong> {item.instructions}
                      </div>
                    )}
                  </div>

                  {/* UPDATED: Show only summary result info */}
                  {item.hasResult && item.resultData && (
                    <div className="healthcare-result-summary">
                      <div className="healthcare-result-header">
                        <strong>Results Submitted</strong>
                        <span className="healthcare-upload-date">
                          {new Date(item.resultData.upload_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="healthcare-result-summary-content">
                        {item.resultData.isMultiple ? (
                          <p>{item.resultData.totalFiles} files uploaded. Click "View Details" to see all files.</p>
                        ) : (
                          <p>1 file uploaded: {item.resultData.file_name}</p>
                        )}
                        
                        {item.uploadedFileCount < item.expectedFileCount && (
                          <div className="healthcare-incomplete-notice">
                            <span className="healthcare-warning-icon">⚠️</span>
                            <span className="healthcare-warning-text">
                              Incomplete: {item.uploadedFileCount}/{item.expectedFileCount} files uploaded
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {item.status === 'pending' && (
                    <div className="healthcare-pending-notice">
                      <div className="healthcare-pending-icon">⏳</div>
                      <div className="healthcare-pending-text">
                        <strong>Waiting for patient to upload result</strong>
                        <small>Patient will receive notification to upload their lab result</small>
                      </div>
                    </div>
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
              <h3>Today's Patients</h3>
              <div className="healthcare-stat-number">{dashboardData.todayStats.myPatients}</div>
              <small>
                {dashboardData.todayStats.breakdown ? 
                  `${dashboardData.todayStats.breakdown.consulted} consulted, ${dashboardData.todayStats.breakdown.inQueue} in queue` :
                  'Consulted + Queued today'
                }
              </small>
            </div>
          </div>

          <div className="healthcare-stat-card">
            <div className="healthcare-stat-icon">👤</div>
            <div className="healthcare-stat-content">
              <h3>Overall Patient</h3>
              <div className="healthcare-stat-number">{totalPatients}</div>
              <small>Total registered</small>
            </div>
          </div>

          <div className="healthcare-stat-card">
            <div className="healthcare-stat-icon">🧪</div>
            <div className="healthcare-stat-content">
              <h3>Lab Results</h3>
              <div className="healthcare-stat-number">{dashboardData.todayStats.labResults}</div>
              <small>Total completed results</small>
            </div>
          </div>
        </div>

        <div className="healthcare-content-grid">
          <div className="healthcare-queue-section">
            <h3>Patient Queue ({patientQueue.length})</h3>
            {queueLoading ? (
              <div className="healthcare-loading-spinner"></div>
            ) : (
              <div className="healthcare-queue-list">
                {patientQueue.length === 0 ? (
                  <div className="healthcare-queue-empty">
                    <p>No patients in queue</p>
                  </div>
                ) : (
                  patientQueue.map((item) => (
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
                        {item.status === 'waiting' && (
                          <button 
                            onClick={() => updateQueueStatus(item.queue_id, 'in_progress')}
                            className="healthcare-action-btn start"
                          >
                            Start Consultation
                          </button>
                        )}
                        {item.status === 'in_progress' && (
                          <button 
                            onClick={() => updateQueueStatus(item.queue_id, 'completed')}
                            className="healthcare-action-btn complete"
                          >
                            Mark Complete
                          </button>
                        )}
                        <div className={`healthcare-queue-status ${item.status} ${item.diagnosedByMe ? 'my-patient' : ''}`}>
                          {item.status === 'waiting' ? '⏳ Waiting' : 
                           item.status === 'in_progress' ? '🔄 In Progress' : 
                           item.diagnosedByMe ? '✅ Done (My Patient)' : '✅ Done'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Rest of the content remains the same */}
          <div className="healthcare-activity-section">
            <h3>Quick Actions</h3>
            <div className="healthcare-quick-actions">
              <button 
                onClick={fetchPatientQueue} 
                className="healthcare-action-btn"
                disabled={queueLoading}
              >
                🔄 Refresh Queue
              </button>
              <button 
                onClick={() => setCurrentPage('overall-patients')}
                className="healthcare-action-btn"
              >
                👥 View All Patients
              </button>
              <button className="healthcare-action-btn">💊 New Prescription</button>
              <button 
                onClick={() => setCurrentPage('lab-orders')}
                className="healthcare-action-btn"
              >
                🧪 Order Lab Test
              </button>
              <button 
                onClick={() => setCurrentPage('patients')}
                className="healthcare-action-btn"
              >
                📋 Today's Patient History
              </button>
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

const renderMyPatientsPage = () => (
  <div className="healthcare-page-content">
    <div className="healthcare-page-header">
      <h2>Today's Patient History</h2>
      <p>Patients consulted and scheduled for consultation today - {staffInfo.department}</p>
    </div>

    <div className="healthcare-patients-layout">
      {/* Patient List */}
      <div className="healthcare-patients-list">
        <div className="healthcare-patients-header">
          <h3>Today's Patients ({myPatients.length})</h3>
          <div className="healthcare-patients-summary">
            <span>In Queue: {myPatients.filter(p => p.isInQueue).length}</span>
            <span>Completed: {myPatients.filter(p => !p.isInQueue).length}</span>
          </div>
          <button 
            onClick={fetchMyPatients}
            className="healthcare-refresh-btn"
          >
            🔄 Refresh
          </button>
        </div>
        
        {myPatients.length === 0 ? (
          <div className="healthcare-no-patients">
            <div className="healthcare-no-data-icon">👥</div>
            <h4>No patients found</h4>
            <p>No patients in queue or completed consultations for today.</p>
          </div>
        ) : (
          <div className="healthcare-patient-cards">
            {/* In Queue Patients First */}
            {myPatients.filter(patient => patient.isInQueue).map((patient) => (
              <div 
                key={`queue-${patient.patient_id}`}
                className={`healthcare-patient-card queue-patient ${selectedPatient?.patient_id === patient.patient_id ? 'active' : ''}`}
                onClick={() => fetchPatientHistory(patient.patient_id)}
              >
                <div className="healthcare-patient-info">
                  <div className="healthcare-patient-name">
                    {patient.name} 
                    <span className="queue-indicator">#{patient.queueNumber}</span>
                  </div>
                  <div className="healthcare-patient-id">{patient.patient_id}</div>
                  <div className="healthcare-patient-details">
                    {patient.age} years old, {patient.sex}
                  </div>
                  <div className="healthcare-patient-contact">{patient.contact_no}</div>
                  <div className="patient-symptoms">
                    <strong>Symptoms:</strong> {patient.lastSymptoms}
                  </div>
                </div>
                <div className="healthcare-patient-status">
                  <div className="healthcare-visit-time">
                    Scheduled: {new Date(`1970-01-01T${patient.visitTime}`).toLocaleTimeString()}
                  </div>
                  <div className={`healthcare-queue-status ${patient.queueStatus}`}>
                    {patient.queueStatus === 'waiting' ? '⏳ Waiting' : 
                     patient.queueStatus === 'in_progress' ? '🔄 In Progress' : patient.queueStatus}
                  </div>
                </div>
                {patient.queueStatus === 'in_progress' && (
                  <div className="current-consultation">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatientForLab(patient);
                        setShowLabRequestModal(true);
                      }}
                      className="healthcare-action-btn lab-request"
                    >
                      🧪 Request Lab
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {/* Separator if both exist */}
            {myPatients.filter(patient => patient.isInQueue).length > 0 && 
             myPatients.filter(patient => !patient.isInQueue).length > 0 && (
              <div className="patients-separator">
                <h4>Completed Today</h4>
              </div>
            )}
            
            {/* Completed Patients */}
            {myPatients.filter(patient => !patient.isInQueue).map((patient) => (
              <div 
                key={`completed-${patient.patient_id}`}
                className={`healthcare-patient-card completed-patient ${selectedPatient?.patient_id === patient.patient_id ? 'active' : ''}`}
                onClick={() => fetchPatientHistory(patient.patient_id)}
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
                  <div className="healthcare-last-visit">
                    Completed: {new Date(`1970-01-01T${patient.visitTime}`).toLocaleTimeString()}
                  </div>
                  <div className={`healthcare-queue-status ${patient.queueStatus}`}>
                    ✅ Completed
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

<div className="healthcare-history-timeline">
  {patientHistory.map((visit) => (
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

        {/* Department Information */}
        {visit.queue && visit.queue.length > 0 && (
          <div className="healthcare-department-info">
            <span className="department-badge">
              🏥 {visit.queue[0].department.name}
            </span>
            <span className="queue-info">Queue #{visit.queue[0].queue_no}</span>
          </div>
        )}

        <div className="healthcare-visit-details">
          <div className="healthcare-symptoms">
            <strong>Chief Complaint:</strong> {visit.symptoms}
          </div>

          {visit.diagnosis && visit.diagnosis.length > 0 && (
            <div className="healthcare-diagnoses">
              <strong>Diagnoses:</strong>
              {visit.diagnosis.map((diag) => (
                <div key={diag.diagnosis_id} className="healthcare-diagnosis-item">
                  <div className="diagnosis-header">
                    <span className={`diagnosis-type ${diag.diagnosis_type}`}>
                      {diag.diagnosis_type}
                    </span>
                    <span className={`diagnosis-severity ${diag.severity}`}>
                      {diag.severity}
                    </span>
                  </div>
                  <div className="diagnosis-desc">{diag.diagnosis_description}</div>
                  {diag.notes && (
                    <div className="diagnosis-notes">
                      <strong>Notes:</strong> {diag.notes}
                    </div>
                  )}
                  {/* Enhanced Doctor Information */}
                  {diag.healthStaff && (
                    <div className="diagnosis-doctor-enhanced">
                      <div className="doctor-info-card">
                        <div className="doctor-avatar">👨‍⚕️</div>
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

          {/* Lab Request Information */}
          {visit.labRequest && visit.labRequest.length > 0 && (
            <div className="healthcare-lab-requests">
              <strong>Lab Requests:</strong>
              {visit.labRequest.map((labReq, idx) => (
                <div key={idx} className="lab-request-item">
                  <span className="lab-test-type">{labReq.test_type}</span>
                  <span className={`lab-status ${labReq.status}`}>{labReq.status}</span>
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
      </div>
    </div>
  );

  const getFilteredOverallPatients = () => {
  if (!patientSearchTerm.trim()) {
    return overallPatients;
  }
  
  return overallPatients.filter(patient => 
    patient.patient_id.toLowerCase().includes(patientSearchTerm.toLowerCase().trim())
  );
};

  const renderOverallPatientsPage = () => {
    const filteredPatients = getFilteredOverallPatients();
    
    return (
      <div className="healthcare-page-content">
        <div className="healthcare-page-header">
          <h2>Overall Patient</h2>
          <p>All registered patients in the system ({totalPatients} total)</p>
        </div>

        {/* Search Bar */}
        <div className="healthcare-search-section">
          <div className="healthcare-search-container">
            <div className="healthcare-search-input-wrapper">
              <input
                type="text"
                placeholder="Search by Patient ID (e.g., PAT123456)"
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                className="healthcare-search-input"
              />
              <span className="healthcare-search-icon">🔍</span>
            </div>
            {patientSearchTerm && (
              <button 
                onClick={() => setPatientSearchTerm('')}
                className="healthcare-clear-search"
              >
                Clear
              </button>
            )}
          </div>
          {patientSearchTerm && (
            <div className="healthcare-search-results-info">
              Showing {filteredPatients.length} of {totalPatients} patients
            </div>
          )}
        </div>

        {overallLoading ? (
          <div className="healthcare-loading-container">
            <div className="healthcare-loading-spinner"></div>
            <p>Loading all patients...</p>
          </div>
        ) : (
          <div className="healthcare-overall-patients">
            <div className="healthcare-patients-table-container">
              <table className="healthcare-patients-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Sex</th>
                    <th>Contact</th>
                    <th>Registration Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="healthcare-no-data">
                        <div className="healthcare-no-data-icon">👥</div>
                        <p>
                          {patientSearchTerm 
                            ? `No patients found with ID containing "${patientSearchTerm}"`
                            : 'No patients found'
                          }
                        </p>
                        {patientSearchTerm && (
                          <button 
                            onClick={() => setPatientSearchTerm('')}
                            className="healthcare-action-btn"
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
                        className="healthcare-table-row"
                        onClick={() => fetchPatientModal(patient.patient_id)}
                      >
                        <td>
                          <span className="healthcare-patient-id-highlight">
                            {patientSearchTerm ? (
                              patient.patient_id.split(new RegExp(`(${patientSearchTerm})`, 'gi')).map((part, index) =>
                                part.toLowerCase() === patientSearchTerm.toLowerCase() ? (
                                  <mark key={index} className="healthcare-search-highlight">{part}</mark>
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
                              className="healthcare-view-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchPatientModal(patient.patient_id);
                              }}
                            >
                              View Details
                            </button>
                            <button 
                              className="healthcare-diagnosis-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPatientForDiagnosis(patient);
                                setShowDiagnosisModal(true);
                              }}
                            >
                              Diagnosis
                            </button>
                            <button 
                              className="healthcare-lab-request-btn"
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
          </div>
        )}

        {/* Patient Details Modal - existing modal code remains the same */}
        {selectedPatientModal && (
          <div className="healthcare-modal-overlay" onClick={() => setSelectedPatientModal(null)}>
            <div className="healthcare-modal" onClick={(e) => e.stopPropagation()}>
              <div className="healthcare-modal-header">
                <h3>Patient Information</h3>
                <button 
                  className="healthcare-modal-close"
                  onClick={() => setSelectedPatientModal(null)}
                >
                  ✕
                </button>
              </div>
              
              {modalLoading ? (
                <div className="healthcare-modal-loading">
                  <div className="healthcare-loading-spinner"></div>
                  <p>Loading patient details...</p>
                </div>
              ) : (
                <div className="healthcare-modal-content">
                  <div className="healthcare-modal-section">
                    <h4>Personal Information</h4>
                    <div className="healthcare-modal-grid">
                      <div><strong>Patient ID:</strong> {selectedPatientModal.patient_id}</div>
                      <div><strong>Name:</strong> {selectedPatientModal.name}</div>
                      <div><strong>Age:</strong> {selectedPatientModal.age} years</div>
                      <div><strong>Sex:</strong> {selectedPatientModal.sex}</div>
                      <div><strong>Birthday:</strong> {new Date(selectedPatientModal.birthday).toLocaleDateString()}</div>
                      <div><strong>Registration:</strong> {new Date(selectedPatientModal.registration_date).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="healthcare-modal-section">
                    <h4>Contact Information</h4>
                    <div className="healthcare-modal-grid">
                      <div><strong>Phone:</strong> {selectedPatientModal.contact_no}</div>
                      <div><strong>Email:</strong> {selectedPatientModal.email}</div>
                      <div><strong>Address:</strong> {selectedPatientModal.address}</div>
                    </div>
                  </div>

                  {selectedPatientModal.emergencyContact && selectedPatientModal.emergencyContact.length > 0 && (
                    <div className="healthcare-modal-section">
                      <h4>Emergency Contact</h4>
                      <div className="healthcare-modal-grid">
                        <div><strong>Name:</strong> {selectedPatientModal.emergencyContact[0].name}</div>
                        <div><strong>Relationship:</strong> {selectedPatientModal.emergencyContact[0].relationship}</div>
                        <div><strong>Phone:</strong> {selectedPatientModal.emergencyContact[0].contact_number}</div>
                      </div>
                    </div>
                  )}

                  <div className="healthcare-modal-actions">
                    <button 
                      className="healthcare-modal-btn primary"
                      onClick={() => {
                        setSelectedPatientModal(null);
                        fetchPatientHistory(selectedPatientModal.patient_id);
                        setCurrentPage('patients');
                      }}
                    >
                      View Medical History
                    </button>
                    <button 
                      className="healthcare-modal-btn"
                      onClick={() => setSelectedPatientModal(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCurrentPage = () => {
    if (currentPage === 'overview') {
      return renderOverview();
    } else if (currentPage === 'patients') {
      return renderMyPatientsPage();
    } else if (currentPage === 'overall-patients') {
      return renderOverallPatientsPage();
    } else if (currentPage === 'lab-orders') {
      return renderLabOrdersPage();
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
          <span className="healthcare-mobile-title">CLICARE Healthcare</span>
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
              <h1>CLICARE</h1>
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

      {/* Lab Request Modal */}
      {showLabRequestModal && (
        <div className="healthcare-modal-overlay">
          <div className="healthcare-modal">
            <div className="healthcare-modal-header">
              <h3>Create Lab Request</h3>
              <button 
                onClick={() => {
                  setShowLabRequestModal(false);
                  setSelectedPatientForLab(null);
                  setLabRequestForm({
                    test_name: '',
                    test_type: '',
                    priority: 'normal',
                    instructions: '',
                    due_date: ''
                  });
                }}
                className="healthcare-modal-close"
              >
                ✕
              </button>
            </div>
            
            <div className="healthcare-modal-content">
            <div className="healthcare-form-group">
              <label>Select Patient: *</label>
              <select 
                value={selectedPatientForLab?.patient_id || ''}
                onChange={(e) => {
                  const allAvailablePatients = [...(myPatients || []), ...(overallPatients || [])];
                  const patient = allAvailablePatients.find(p => p.patient_id === e.target.value);
                  setSelectedPatientForLab(patient);
                }}
                className="healthcare-form-select"
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

            {/* Multiple Tests Section */}
            <div className="healthcare-form-group">
              <label>Requested Tests: *</label>
              <div className="healthcare-tests-container">
                {labRequestForm.test_requests.map((test, index) => (
                  <div key={index} className="healthcare-test-item">
                    <div className="healthcare-test-header">
                      <h4>Test {index + 1}</h4>
                      {labRequestForm.test_requests.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeTestFromRequest(index)}
                          className="healthcare-remove-test-btn"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="healthcare-test-fields">
                      <div className="healthcare-form-group">
                        <label>Test Name: *</label>
                        <input 
                          type="text"
                          value={test.test_name}
                          onChange={(e) => updateTestInRequest(index, 'test_name', e.target.value)}
                          placeholder="e.g., Complete Blood Count, Chest X-Ray"
                          className="healthcare-form-input"
                          required
                        />
                      </div>

                      <div className="healthcare-form-group">
                        <label>Test Type: *</label>
                        <select 
                          value={test.test_type}
                          onChange={(e) => updateTestInRequest(index, 'test_type', e.target.value)}
                          className="healthcare-form-select"
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
                  className="healthcare-add-test-btn"
                >
                  + Add Another Test
                </button>
              </div>
            </div>

            {/* Rest of the form fields remain the same */}
            <div className="healthcare-form-group">
              <label>Priority:</label>
              <select 
                value={labRequestForm.priority}
                onChange={(e) => setLabRequestForm(prev => ({
                  ...prev, 
                  priority: e.target.value
                }))}
                className="healthcare-form-select"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT (Immediate)</option>
              </select>
            </div>

            <div className="healthcare-form-group">
              <label>Due Date: *</label>
              <input 
                type="date"
                value={labRequestForm.due_date}
                onChange={(e) => setLabRequestForm(prev => ({
                  ...prev, 
                  due_date: e.target.value
                }))}
                min={new Date().toISOString().split('T')[0]}
                className="healthcare-form-input"
                required
              />
            </div>

            <div className="healthcare-form-group">
              <label>Special Instructions:</label>
              <textarea 
                value={labRequestForm.instructions}
                onChange={(e) => setLabRequestForm(prev => ({
                  ...prev, 
                  instructions: e.target.value
                }))}
                placeholder="Any special instructions for the patient or lab..."
                className="healthcare-form-textarea"
                rows="3"
              />
            </div>
          </div>

            <div className="healthcare-modal-actions">
              <button 
                onClick={() => {
                  setShowLabRequestModal(false);
                  setSelectedPatientForLab(null);
                  setLabRequestForm({
                    test_name: '',
                    test_type: '',
                    priority: 'normal',
                    instructions: '',
                    due_date: ''
                  });
                }}
                className="healthcare-modal-btn secondary"
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
                className="healthcare-modal-btn primary"
              >
                Create Request
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Modal */}
      {showDiagnosisModal && (
        <div className="healthcare-modal-overlay">
          <div className="healthcare-modal">
            <div className="healthcare-modal-header">
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
                className="healthcare-modal-close"
              >
                ✕
              </button>
            </div>
            
            <div className="healthcare-modal-content">
              {selectedPatientForDiagnosis && (
                <div className="healthcare-selected-patient-info">
                  <h4>Patient: {selectedPatientForDiagnosis.name}</h4>
                  <p>ID: {selectedPatientForDiagnosis.patient_id} | {selectedPatientForDiagnosis.age}y, {selectedPatientForDiagnosis.sex}</p>
                </div>
              )}

              <div className="healthcare-form-group">
                <label>Diagnosis Description: *</label>
                <textarea 
                  value={diagnosisForm.diagnosis_description}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    diagnosis_description: e.target.value
                  }))}
                  placeholder="Enter the primary diagnosis..."
                  className="healthcare-form-textarea"
                  rows="4"
                  required
                />
              </div>

              <div className="healthcare-form-group">
                <label>Diagnosis Code (ICD-10):</label>
                <input 
                  type="text"
                  value={diagnosisForm.diagnosis_code}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    diagnosis_code: e.target.value
                  }))}
                  placeholder="e.g., Z00.00, M79.1"
                  className="healthcare-form-input"
                />
              </div>

              <div className="healthcare-form-group">
                <label>Diagnosis Type:</label>
                <select 
                  value={diagnosisForm.diagnosis_type}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    diagnosis_type: e.target.value
                  }))}
                  className="healthcare-form-select"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="differential">Differential</option>
                  <option value="provisional">Provisional</option>
                </select>
              </div>

              <div className="healthcare-form-group">
                <label>Severity:</label>
                <select 
                  value={diagnosisForm.severity}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    severity: e.target.value
                  }))}
                  className="healthcare-form-select"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="healthcare-form-group">
                <label>Additional Notes:</label>
                <textarea 
                  value={diagnosisForm.notes}
                  onChange={(e) => setDiagnosisForm(prev => ({
                    ...prev, 
                    notes: e.target.value
                  }))}
                  placeholder="Treatment recommendations, follow-up instructions, etc."
                  className="healthcare-form-textarea"
                  rows="3"
                />
              </div>
            </div>

            <div className="healthcare-modal-actions">
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
                className="healthcare-modal-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={createDiagnosis}
                disabled={!selectedPatientForDiagnosis || !diagnosisForm.diagnosis_description.trim()}
                className="healthcare-modal-btn primary"
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


export default HealthcareDashboard;