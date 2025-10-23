// QRconfirmation.js
import React, { useEffect, useState } from 'react';

const QRConfirmation = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrDataString = sessionStorage.getItem('qrCodeData');
        
        if (qrDataString) {
          const data = JSON.parse(qrDataString);
          setQrData(data);
          
          const qrString = JSON.stringify({
            type: 'mobile_registration',
            tempRegId: data.tempRegId || sessionStorage.getItem('tempRegId'),
            tempPatientId: data.tempPatientId || sessionStorage.getItem('tempPatientId'),
            patientName: data.patientName || sessionStorage.getItem('patientName'),
            department: data.department,
            scheduledDate: data.scheduledDate,
            timestamp: data.timestamp || new Date().toISOString()
          });
          
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
          setQrCodeUrl(qrUrl);
          
        } else {
          const tempRegId = sessionStorage.getItem('tempRegId');
          const tempPatientId = sessionStorage.getItem('tempPatientId');
          const patientName = sessionStorage.getItem('patientName');
          
          if (tempRegId && tempPatientId && patientName) {
            const fallbackData = {
              tempRegId: tempRegId,
              tempPatientId: tempPatientId,
              patientName: patientName,
              department: 'General Practice',
              scheduledDate: new Date().toISOString().split('T')[0],
              symptoms: 'Health Assessment Completed'
            };
            
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
          } else {
            throw new Error('No registration data found. Please complete your registration first.');
          }
        }
        
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(generateQR, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleShare = () => {
    if (navigator.share && qrCodeUrl) {
      navigator.share({
        title: 'CLICARE Registration QR Code',
        text: `Patient: ${qrData?.patientName}\nDepartment: ${qrData?.department}`,
        url: qrCodeUrl
      });
    }
  };

  const handleQRImageError = () => {
    setError('Failed to load QR code image. Please try again.');
  };

  if (loading) {
    return (
      <div className="mobile-qr-confirmation">
        <div className="qr-loading">
          <div className="loading-spinner"></div>
          <p>Generating your QR code...</p>
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
              onClick={() => window.location.href = '/web-appointment'}
              className="retry-btn"
            >
              Back to Health Assessment
            </button>
            <button 
              onClick={() => window.location.href = '/web-registration'}
              className="restart-btn"
            >
              Start New Registration
            </button>
          </div>
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
          onError={handleQRImageError}
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
          onClick={handleShare}
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
    </div>
  );
};

export default QRConfirmation;