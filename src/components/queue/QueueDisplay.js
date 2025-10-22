import React, { useState, useEffect } from 'react';
import './QueueDisplay.css';

const QueueDisplay = ({ departmentId }) => {
  const [departmentName, setDepartmentName] = useState('');
  const [currentPatient, setCurrentPatient] = useState(null);
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Update clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Fetch queue data every 5 seconds
  useEffect(() => {
    const fetchQueueData = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/queue/display/${departmentId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch queue data');
        }

        const result = await response.json();
        
        if (result.success) {
          setDepartmentName(result.departmentName);
          setCurrentPatient(result.current);
          setWaitingPatients(result.waiting);
          setError('');
        } else {
          setError(result.error || 'Unknown error');
        }
      } catch (err) {
        console.error('Queue fetch error:', err);
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };

    fetchQueueData(); // Initial fetch
    const interval = setInterval(fetchQueueData, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [departmentId]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="queue-display-fullscreen queue-loading">
        <div className="queue-loading-spinner"></div>
        <p>Loading Queue Display...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="queue-display-fullscreen queue-error">
        <div className="queue-error-icon">⚠️</div>
        <h2>Connection Error</h2>
        <p>{error}</p>
        <p className="queue-error-hint">Please check your network connection</p>
      </div>
    );
  }

  return (
    <div className="queue-display-fullscreen">
      {/* Header */}
      <div className="queue-header">
        <div className="queue-header-left">
          <div className="queue-hospital-logo">🏥</div>
          <div className="queue-hospital-info">
            <h1 className="queue-hospital-name">CliCare Hospital</h1>
            <h2 className="queue-department-name">{departmentName} Department</h2>
          </div>
        </div>
        <div className="queue-header-right">
          <div className="queue-datetime">
            <div className="queue-time">{formatTime(currentTime)}</div>
            <div className="queue-date">{formatDate(currentTime)}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="queue-main-content">
        {/* Now Serving Section */}
        <div className="queue-now-serving">
          <div className="queue-section-title">NOW SERVING</div>
          {currentPatient ? (
            <div className="queue-current-display">
              <div className="queue-current-number">
                #{String(currentPatient.queue_no).padStart(3, '0')}
              </div>
              <div className="queue-current-label">Please proceed to consultation room</div>
            </div>
          ) : (
            <div className="queue-no-patient">
              <div className="queue-no-patient-icon">💤</div>
              <div className="queue-no-patient-text">No patient in consultation</div>
            </div>
          )}
        </div>

        {/* Waiting Queue Section */}
        <div className="queue-waiting-section">
          <div className="queue-section-title">
            WAITING QUEUE ({waitingPatients.length})
          </div>
          
          {waitingPatients.length > 0 ? (
            <div className="queue-waiting-grid">
              {waitingPatients.slice(0, 8).map((patient, index) => (
                <div 
                  key={patient.queue_id} 
                  className={`queue-waiting-card ${index === 0 ? 'next-patient' : ''}`}
                >
                  <div className="queue-waiting-number">
                    #{String(patient.queue_no).padStart(3, '0')}
                  </div>
                  <div className="queue-waiting-time">
                    {patient.wait_minutes} min
                  </div>
                  {index === 0 && (
                    <div className="queue-next-badge">NEXT</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="queue-no-waiting">
              <div className="queue-no-waiting-icon">✓</div>
              <div className="queue-no-waiting-text">No patients waiting</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="queue-footer">
        <div className="queue-footer-message">
          <span className="queue-footer-icon">ℹ️</span>
          Please wait for your number to be called. Thank you for your patience.
        </div>
        <div className="queue-footer-stats">
          <div className="queue-stat-item">
            <span className="queue-stat-label">Total Waiting:</span>
            <span className="queue-stat-value">{waitingPatients.length}</span>
          </div>
          {waitingPatients.length > 0 && (
            <div className="queue-stat-item">
              <span className="queue-stat-label">Avg. Wait:</span>
              <span className="queue-stat-value">
                {Math.floor(
                  waitingPatients.reduce((sum, p) => sum + p.wait_minutes, 0) / 
                  waitingPatients.length
                )} min
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="queue-refresh-indicator">
        <div className="queue-refresh-dot"></div>
        Auto-refreshing
      </div>
    </div>
  );
};

export default QueueDisplay;