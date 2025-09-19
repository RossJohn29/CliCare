// Fixed MobileQRConfirmation.js
import React, { useEffect, useState } from 'react';

const MobileQRConfirmation = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        // Debug: Log all session storage items
        const allSessionData = {
          qrCodeData: sessionStorage.getItem('qrCodeData'),
          tempRegId: sessionStorage.getItem('tempRegId'),
          tempPatientId: sessionStorage.getItem('tempPatientId'),
          patientName: sessionStorage.getItem('patientName'),
          registrationSuccess: sessionStorage.getItem('registrationSuccess')
        };
        
        console.log('All Session Storage Data:', allSessionData);
        setDebugInfo(JSON.stringify(allSessionData, null, 2));

        const qrDataString = sessionStorage.getItem('qrCodeData');
        
        if (qrDataString) {
          console.log('Found qrCodeData in session storage');
          const data = JSON.parse(qrDataString);
          console.log('Parsed QR data:', data);
          setQrData(data);
          
          // Generate QR code using a simple approach (no external library)
          const qrString = JSON.stringify({
            type: 'mobile_registration',
            tempRegId: data.tempRegId || sessionStorage.getItem('tempRegId'),
            tempPatientId: data.tempPatientId || sessionStorage.getItem('tempPatientId'),
            patientName: data.patientName || sessionStorage.getItem('patientName'),
            department: data.department,
            scheduledDate: data.scheduledDate,
            timestamp: data.timestamp || new Date().toISOString()
          });
          
          console.log('QR String to encode:', qrString);
          
          // Use Google Charts QR API as fallback
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
          setQrCodeUrl(qrUrl);
          console.log('QR Code generated successfully');
          
        } else {
          // Enhanced fallback: Try to reconstruct data from individual session items
          console.log('No qrCodeData found, trying to reconstruct...');
          
          const tempRegId = sessionStorage.getItem('tempRegId');
          const tempPatientId = sessionStorage.getItem('tempPatientId');
          const patientName = sessionStorage.getItem('patientName');
          
          if (tempRegId && tempPatientId && patientName) {
            const fallbackData = {
              tempRegId: tempRegId,
              tempPatientId: tempPatientId,
              patientName: patientName,
              department: 'General Practice', // Default
              scheduledDate: new Date().toISOString().split('T')[0],
              symptoms: 'Health Assessment Completed'
            };
            
            console.log('Using fallback data:', fallbackData);
            setQrData(fallbackData);
            
            const qrString = JSON.stringify({
              type: 'mobile_registration',
              tempRegId: fallbackData.tempRegId,
              tempPatientId: fallbackData.tempPatientId,
              patientName: fallbackData.patientName,
              department: fallbackData.department,
              scheduledDate: fallbackData.scheduledDate,
              timestamp: new Date().toISOString()
            });
            
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
            setQrCodeUrl(qrUrl);
            console.log('QR Code generated with fallback data');
          } else {
            throw new Error('No registration data found in session storage. Missing: ' + 
              (!tempRegId ? 'tempRegId ' : '') + 
              (!tempPatientId ? 'tempPatientId ' : '') + 
              (!patientName ? 'patientName' : ''));
          }
        }
        
      } catch (error) {
        console.error('QR generation error:', error);
        setError(error.message);
        setDebugInfo(prev => prev + '\nError: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to ensure session storage is populated
    const timer = setTimeout(generateQR, 100);
    return () => clearTimeout(timer);
  }, []);

  // Show debug info in development
  const showDebug = process.env.NODE_ENV === 'development' || 
                   window.location.hostname === 'localhost' || 
                   window.location.search.includes('debug=true');

  if (loading) {
    return (
      <div className="mobile-qr-confirmation">
        <div className="qr-loading">
          <div className="loading-spinner"></div>
          <p>Generating your QR code...</p>
          {showDebug && (
            <div style={{marginTop: '20px', padding: '10px', background: '#f0f0f0', fontSize: '12px'}}>
              <strong>Debug Info:</strong>
              <pre>{debugInfo}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-qr-confirmation">
        <div className="qr-error">
          <h2>Unable to Generate QR Code</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button 
              onClick={() => window.location.href = '/mobile-health-assessment'}
              className="retry-btn"
            >
              Back to Health Assessment
            </button>
            <button 
              onClick={() => window.location.href = '/mobile-patient-registration'}
              className="restart-btn"
            >
              Start New Registration
            </button>
          </div>
          
          {showDebug && (
            <div style={{marginTop: '20px', padding: '10px', background: '#ffe6e6', border: '1px solid #ff9999'}}>
              <strong>Debug Information:</strong>
              <pre style={{fontSize: '11px', whiteSpace: 'pre-wrap'}}>{debugInfo}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-qr-confirmation">
      <div className="qr-header">
        <h1>Registration Complete!</h1>
        <p>Present this QR code at the hospital</p>
      </div>
      
      <div className="qr-code-container">
        <img 
          src={qrCodeUrl} 
          alt="Registration QR Code"
          onError={(e) => {
            console.error('QR image failed to load:', e);
            setError('Failed to load QR code image. Please try again.');
          }}
        />
        <p>Scan this code at the registration desk</p>
      </div>
      
      {qrData && (
        <div className="appointment-details">
          <h3>Registration Summary</h3>
          <div className="detail-item">
            <strong>Patient:</strong> {qrData.patientName}
          </div>
          <div className="detail-item">
            <strong>Department:</strong> {qrData.department}
          </div>
          <div className="detail-item">
            <strong>Date:</strong> {qrData.scheduledDate}
          </div>
          {qrData.symptoms && (
            <div className="detail-item">
              <strong>Symptoms:</strong> {qrData.symptoms}
            </div>
          )}
          <div className="detail-item">
            <strong>Temp ID:</strong> {qrData.tempPatientId}
          </div>
        </div>
      )}

      <div className="qr-actions">
        <button 
          onClick={() => window.print()}
          className="print-btn"
        >
          📄 Print QR Code
        </button>
        <button 
          onClick={() => {
            if (navigator.share && qrCodeUrl) {
              navigator.share({
                title: 'CLICARE Registration QR Code',
                text: `Patient: ${qrData?.patientName}\nDepartment: ${qrData?.department}`,
                url: qrCodeUrl
              });
            }
          }}
          className="share-btn"
        >
          📤 Share
        </button>
      </div>

      <div className="help-section">
        <h4>Next Steps:</h4>
        <ol>
          <li>Arrive at the hospital at your scheduled time</li>
          <li>Go to the registration desk</li>
          <li>Show this QR code to the staff</li>
          <li>Wait for your queue number to be called</li>
        </ol>
      </div>

      {/* Debug panel for development */}
      {showDebug && (
        <div style={{marginTop: '20px', padding: '10px', background: '#f9f9f9', border: '1px solid #ddd', fontSize: '12px'}}>
          <strong>Debug Information:</strong>
          <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
            {debugInfo}
          </pre>
        </div>
      )}
    </div>
  );
};

export default MobileQRConfirmation;