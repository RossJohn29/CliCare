// services/printingService.js
export class PrintingService {
  static generatePatientGuidancePacket(registrationResult, patientData, formData) {
    const currentData = patientData || formData;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CliCare Patient Guidance Packet</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          
          .hospital-logo {
            font-size: 24px;
            color: #2563eb;
            margin-bottom: 5px;
          }
          
          .patient-id-section {
            background: #f0f7ff;
            border: 2px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            border-radius: 8px;
          }
          
          .patient-id {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            letter-spacing: 2px;
          }
          
          .section {
            margin: 15px 0;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 6px;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 10px 0;
          }
          
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
          }
          
          .info-label {
            font-weight: bold;
            color: #333;
          }
          
          .info-value {
            color: #666;
          }
          
          .department-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px;
            margin: 10px 0;
            border-radius: 6px;
          }
          
          .department-name {
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          
          .queue-info {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 8px;
            border-radius: 4px;
            margin: 5px 0;
          }
          
          .route-map {
            background: #f9fafb;
            border: 1px solid #d1d5db;
            padding: 15px;
            margin: 15px 0;
            border-radius: 6px;
          }
          
          .route-step {
            display: flex;
            align-items: center;
            margin: 8px 0;
            padding: 5px;
          }
          
          .step-number {
            background: #2563eb;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 10px;
            flex-shrink: 0;
          }
          
          .step-description {
            flex: 1;
          }
          
          .symptoms-list {
            background: #fef2f2;
            border: 1px solid #fecaca;
            padding: 10px;
            border-radius: 6px;
            margin: 10px 0;
          }
          
          .symptom-tag {
            display: inline-block;
            background: #dc2626;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            margin: 2px;
            font-size: 11px;
          }
          
          .footer {
            margin-top: 30px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
            text-align: center;
            font-size: 11px;
            color: #666;
          }
          
          .visit-timestamp {
            text-align: right;
            font-size: 10px;
            color: #666;
            margin-top: 10px;
          }
          
          .emergency-note {
            background: #fef2f2;
            border: 2px solid #dc2626;
            padding: 10px;
            margin: 15px 0;
            border-radius: 6px;
            text-align: center;
          }
          
          .qr-code-placeholder {
            width: 100px;
            height: 100px;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 10px auto;
            font-size: 10px;
            color: #666;
          }
          
          @media print {
            body { print-color-adjust: exact; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital-logo">🏥 CliCare Hospital</div>
          <h2>Patient Guidance Packet</h2>
          <p>Digital Patient Management System</p>
        </div>
        
        <div class="patient-id-section">
          <div>Your Patient ID</div>
          <div class="patient-id">${registrationResult.patientId}</div>
          <div style="margin-top: 10px; font-size: 12px; color: #666;">
            Please keep this ID for all future visits
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Patient Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Name:</span>
              <span class="info-value">${currentData.fullName || currentData.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Age/Sex:</span>
              <span class="info-value">${currentData.age} / ${currentData.sex}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Contact:</span>
              <span class="info-value">${currentData.contactNumber || currentData.contact_no}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">${currentData.email}</span>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Health Information</div>
          <div class="symptoms-list">
            <strong>Selected Symptoms (${currentData.selectedSymptoms.length}):</strong>
            <div style="margin-top: 5px;">
              ${currentData.selectedSymptoms.map(symptom => 
                `<span class="symptom-tag">${symptom}</span>`
              ).join('')}
            </div>
          </div>
          
          ${currentData.duration ? `
            <div class="info-item">
              <span class="info-label">Duration:</span>
              <span class="info-value">${currentData.duration}</span>
            </div>
          ` : ''}
          
          ${currentData.severity ? `
            <div class="info-item">
              <span class="info-label">Severity:</span>
              <span class="info-value">${currentData.severity}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">Department Assignment</div>
          <div class="department-card">
            <div class="department-name">${registrationResult.recommendedDepartment}</div>
            <div class="queue-info">
              <strong>Queue Number:</strong> ${this.generateQueueNumber()}
              <br>
              <strong>Estimated Wait:</strong> ${registrationResult.estimated_wait || '15-30 minutes'}
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Step-by-Step Navigation Route</div>
          <div class="route-map">
            ${this.generateNavigationSteps(registrationResult.recommendedDepartment).map((step, index) => `
              <div class="route-step">
                <div class="step-number">${index + 1}</div>
                <div class="step-description">
                  <strong>${step.location}</strong><br>
                  <span style="font-size: 11px; color: #666;">${step.description}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Hospital Map Reference</div>
          <div style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 6px;">
            <div style="font-size: 48px; margin-bottom: 10px;">🗺️</div>
            <p><strong>Interactive Map Available</strong></p>
            <p style="font-size: 11px; color: #666;">
              Use hospital information kiosks or ask staff for detailed directions
            </p>
          </div>
        </div>
        
        ${currentData.allergies || currentData.medications ? `
          <div class="section">
            <div class="section-title">Important Medical Information</div>
            ${currentData.allergies ? `
              <div class="info-item">
                <span class="info-label">Allergies:</span>
                <span class="info-value" style="color: #dc2626; font-weight: bold;">${currentData.allergies}</span>
              </div>
            ` : ''}
            ${currentData.medications ? `
              <div class="info-item">
                <span class="info-label">Current Medications:</span>
                <span class="info-value">${currentData.medications}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        <div class="emergency-note">
          <strong>⚠️ EMERGENCY NOTE</strong><br>
          In case of medical emergency, proceed immediately to the Emergency Department<br>
          Location: Ground Floor, East Wing
        </div>
        
        <div class="footer">
          <p><strong>Important Reminders:</strong></p>
          <p>• Present this packet at each department</p>
          <p>• Keep your Patient ID for future visits</p>
          <p>• Follow the step-by-step route for efficient service</p>
          <p>• Ask hospital staff if you need assistance</p>
          
          <div class="visit-timestamp">
            Visit Date: ${new Date().toLocaleDateString()} | 
            Time: ${new Date().toLocaleTimeString()} | 
            Visit ID: ${this.generateVisitId()}
          </div>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            margin-right: 10px;
          ">🖨️ Print Packet</button>
          
          <button onclick="window.close()" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
          ">✖️ Close</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Auto-print after a delay to ensure content is loaded
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1000);
    
    return printWindow;
  }
  
  static generateNavigationSteps(department) {
    const departmentRoutes = {
      'Internal Medicine': [
        { location: 'Reception Desk', description: 'Ground Floor - Present this packet and get initial clearance' },
        { location: 'Vital Signs Station', description: 'Ground Floor - Height, weight, blood pressure check' },
        { location: 'Internal Medicine Department', description: '2nd Floor, Room 201-205 - Wait for your queue number' },
        { location: 'Doctor\'s Office', description: 'As directed by nursing staff - Medical consultation' }
      ],
      'Cardiology': [
        { location: 'Reception Desk', description: 'Ground Floor - Present this packet and get initial clearance' },
        { location: 'Vital Signs Station', description: 'Ground Floor - Height, weight, blood pressure, ECG prep' },
        { location: 'Cardiology Department', description: '3rd Floor, Room 301-303 - Wait for your queue number' },
        { location: 'Cardiologist Office', description: 'As directed by nursing staff - Specialized consultation' }
      ],
      'Pediatrics': [
        { location: 'Reception Desk', description: 'Ground Floor - Present this packet and get initial clearance' },
        { location: 'Pediatric Vital Signs', description: 'Ground Floor - Specialized pediatric measurements' },
        { location: 'Pediatrics Department', description: '2nd Floor, Room 206-210 - Child-friendly waiting area' },
        { location: 'Pediatrician Office', description: 'As directed by nursing staff - Child consultation' }
      ]
    };
    
    return departmentRoutes[department] || departmentRoutes['Internal Medicine'];
  }
  
  static generateQueueNumber() {
    return Math.floor(Math.random() * 50) + 1;
  }
  
  static generateVisitId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `V${timestamp}${random}`;
  }
  
  // Alternative method for thermal receipt printers (if available)
  static printThermalReceipt(registrationResult, patientData, formData) {
    const currentData = patientData || formData;
    
    const receiptContent = `
      ================================
      🏥 CLICARE HOSPITAL
      Patient Registration Receipt
      ================================
      
      PATIENT ID: ${registrationResult.patientId}
      
      Name: ${currentData.fullName || currentData.name}
      Age/Sex: ${currentData.age} / ${currentData.sex}
      
      DEPARTMENT: ${registrationResult.recommendedDepartment}
      QUEUE NO: ${this.generateQueueNumber()}
      
      SYMPTOMS:
      ${currentData.selectedSymptoms.join(', ')}
      
      NEXT STEPS:
      1. Go to Reception Desk
      2. Present this receipt
      3. Proceed to ${registrationResult.recommendedDepartment}
      4. Wait for queue number
      
      Visit: ${new Date().toLocaleString()}
      ================================
      Keep this receipt for your visit
      ================================
    `;
    
    // For thermal printers, you would typically use a specific printing library
    // This is a fallback that creates a simple text format
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    receiptWindow.document.write(`
      <html>
      <head><title>Receipt</title></head>
      <body style="font-family: monospace; white-space: pre-wrap; font-size: 12px; margin: 20px;">
        ${receiptContent}
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px;">Print Receipt</button>
        </div>
      </body>
      </html>
    `);
    receiptWindow.document.close();
    
    setTimeout(() => {
      receiptWindow.print();
    }, 500);
    
    return receiptWindow;
  }
  
  // Method to check if printing is supported
  static isPrintingSupported() {
    return typeof window !== 'undefined' && 'print' in window;
  }
  
  // Method to handle print errors
  static handlePrintError(error) {
    console.error('Printing failed:', error);
    alert('Printing failed. Please ask hospital staff for assistance or take a screenshot of your information.');
  }
}