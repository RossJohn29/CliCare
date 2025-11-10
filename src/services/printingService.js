// services/printingService.js

export class PrintingService {
  
  static async fetchFloorPlanImageFromDatabase(department) {
    try {
      const deptResponse = await fetch(`http://localhost:5000/api/department-by-name/${encodeURIComponent(department)}`);
      
      if (!deptResponse.ok) {
        console.warn(`⚠️ Could not find department "${department}" in database`);
        return null;
      }

      const deptResult = await deptResponse.json();
      
      if (!deptResult.success || !deptResult.department) {
        console.warn(`⚠️ No department data found for "${department}"`);
        return null;
      }

      if (!deptResult.department.floor_plan_image) {
        console.warn(`⚠️ No floor plan image configured for department "${department}"`);
        return null;
      }

      // ✅ FIXED: The floor_plan_image is already a full URL from Supabase
      const floorPlanUrl = deptResult.department.floor_plan_image;
      
      console.log(`✅ Successfully fetched floor plan URL for ${department}:`, floorPlanUrl);
      return floorPlanUrl;
      
    } catch (err) {
      console.error('❌ Error fetching floor plan from database:', err.message);
      return null;
    }
  }

  static async generateNavigationSteps(department) {
    try {
      const response = await fetch(`http://localhost:5000/api/navigation-steps-by-name/${encodeURIComponent(department)}`);
      const result = await response.json();
      
      if (!result.success || !result.steps || result.steps.length === 0) {
        console.warn(`⚠️ No navigation steps found for department "${department}"`);
        return [];
      }
      
      console.log(`✅ Successfully fetched ${result.steps.length} navigation steps for ${department}`);
      return result.steps.map(step => ({
        location: step.location_name,
        description: `${step.floor_number} - ${step.description}`,
        floor: step.floor_number,
        rooms: step.room_numbers
      }));
      
    } catch (error) {
      console.error('❌ Navigation steps API failed:', error.message);
      return [];
    }
  }
  
  static generateQueueNumber() {
    return Math.floor(Math.random() * 50) + 1;
  }
  
  static generateVisitId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `DOC${timestamp}${random}`;
  }

  // ✅ FIXED: Main method - now uses iframe instead of window.open()
  static async generatePatientGuidancePacket(registrationResult, patientData, formData) {
    try {
      console.log('🖨️ Starting print generation...');
      
      const currentData = patientData || formData || {};
      const department = registrationResult.recommendedDepartment || 'Unknown Department';
      
      console.log('📋 Patient data:', currentData);
      console.log('🏥 Department:', department);
      
      // Fetch navigation steps and floor plan BEFORE generating HTML
      console.log('🔍 Fetching navigation steps and floor plan...');
      const navigationSteps = await this.generateNavigationSteps(department);
      const floorPlanImage = await this.fetchFloorPlanImageFromDatabase(department);
      
      console.log('✅ Data fetched successfully');
      console.log('📍 Navigation steps:', navigationSteps.length);
      console.log('🗺️ Floor plan:', floorPlanImage ? 'Found' : 'Not found');

      const issueDate = new Date();
      const formattedDate = issueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const formattedTime = issueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // ✅ FIXED: Create iframe instead of window.open()
      console.log('📄 Creating print iframe...');
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);

      const printDoc = printFrame.contentWindow.document;
      
      const printContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>CliCare — Patient Guidance Packet</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
          <style>
            :root {
              --clicare-green: #1a672a;
              --panel-width: 850px;
              --narrow-padding: 0.5in;
              --muted: #6b7280;
            }
            
            html, body {
              height: 100%;
              margin: 0;
              font-family: Inter, Arial, sans-serif;
              background: #f3f4f6;
              color: #111827;
            }
            
            .page-wrap {
              min-height: 100%;
              display: flex;
              align-items: flex-start;
              justify-content: center;
              padding: 40px 20px;
            }
            
            .panel {
              width: 100%;
              max-width: var(--panel-width);
              background: #ffffff;
              box-shadow: 0 8px 30px rgba(0,0,0,0.08);
              border-radius: 8px;
              border: 1px solid rgba(26,103,42,0.06);
              padding: 28px;
              box-sizing: border-box;
            }

            /* Header */
            .header {
              display: flex;
              align-items: center;
              gap: 16px;
              margin-bottom: 18px;
            }
            
            .logo {
              width: 68px;
              height: 68px;
              border-radius: 8px;
              background: linear-gradient(180deg, var(--clicare-green), #144b20);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-weight: 700;
              font-size: 20px;
              box-shadow: 0 3px 10px rgba(26,103,42,0.12);
            }
            
            .title-block {
              flex: 1;
            }
            
            .title {
              font-size: 20px;
              font-weight: 700;
              color: var(--clicare-green);
              letter-spacing: 0.6px;
            }
            
            .subtitle {
              font-size: 12px;
              color: var(--muted);
              margin-top: 4px;
            }

            /* Info boxes */
            .info-grid {
              display: flex;
              gap: 12px;
              margin-top: 14px;
              flex-wrap: wrap;
            }
            
            .info-card {
              flex: 1;
              min-width: 220px;
              border: 1px solid rgba(26,103,42,0.08);
              padding: 12px 14px;
              border-radius: 6px;
              background: #fbfdf9;
            }
            
            .info-label {
              font-size: 11px;
              color: var(--muted);
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.6px;
            }
            
            .info-value {
              margin-top: 6px;
              font-size: 15px;
              font-weight: 600;
              color: #0f172a;
            }

            /* Section headings */
            .section {
              margin-top: 20px;
            }
            
            .section h3 {
              margin: 0;
              font-size: 13px;
              color: var(--clicare-green);
              letter-spacing: 0.8px;
              margin-bottom: 10px;
            }
            
            .section .box {
              border: 1px solid rgba(0,0,0,0.06);
              padding: 14px;
              border-radius: 6px;
              background: #fff;
            }

            /* Navigation steps table */
            .nav-table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .nav-table th {
              background: var(--clicare-green);
              color: #fff;
              padding: 8px 10px;
              text-align: left;
              font-size: 12px;
            }
            
            .nav-table td {
              padding: 10px;
              border-bottom: 1px solid rgba(0,0,0,0.06);
              font-size: 13px;
              color: #111827;
            }

            /* Floor plan preview */
            .floor-plan {
              display: flex;
              gap: 16px;
              align-items: flex-start;
              flex-wrap: wrap;
            }
            
            .floor-plan img {
              max-width: 480px;
              width: 100%;
              height: auto;
              border: 1px solid rgba(0,0,0,0.08);
              border-radius: 6px;
              background: #fff;
              box-shadow: 0 6px 18px rgba(2,6,23,0.04);
            }
            
            .floor-meta {
              flex: 1;
              min-width: 200px;
            }
            
            .muted-note {
              color: var(--muted);
              font-size: 13px;
            }

            /* Medical Information */
            .medical-section .box {
              padding: 14px;
            }
            
            .symptoms-header {
              font-size: 12px;
              font-weight: 700;
              color: var(--clicare-green);
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
              border-bottom: 1px solid rgba(26,103,42,0.1);
              padding-bottom: 5px;
            }
            
            .symptoms-list {
              display: block;
              margin: 10px 0;
            }
            
            .symptom-item {
              display: inline-block;
              background: var(--clicare-green);
              color: #ffffff;
              padding: 6px 12px;
              margin: 3px;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-radius: 4px;
            }

            /* Medical Alert Box */
            .medical-alert {
              border: 3px solid #dc2626;
              background: #fef2f2;
              padding: 15px;
              margin: 20px 0;
              border-radius: 6px;
            }
            
            .alert-header {
              font-size: 12px;
              font-weight: 700;
              color: #dc2626;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
              text-align: center;
            }
            
            .alert-content {
              font-size: 11px;
              color: #000000;
              line-height: 1.5;
            }

            /* Emergency note */
            .emergency-note {
              background: #fef2f2;
              border: 2px solid #dc2626;
              padding: 10px;
              margin: 15px 0;
              border-radius: 6px;
              text-align: center;
            }

            /* No data message */
            .no-data-message {
              background: #f9fafb;
              border: 1px dashed #d1d5db;
              padding: 20px;
              text-align: center;
              border-radius: 6px;
              color: var(--muted);
              font-size: 13px;
            }

            /* Footer metadata */
            .footer-meta {
              display: flex;
              gap: 12px;
              flex-wrap: wrap;
              margin-top: 22px;
              font-size: 13px;
              color: var(--muted);
            }

            /* Responsive */
            @media (max-width: 900px) {
              .panel {
                padding: 18px;
              }
              .floor-plan img {
                max-width: 100%;
              }
            }

            @media print {
              @page {
                margin: 0.5in;
              }
              
              body {
                background: #fff;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .page-wrap {
                padding: 0;
              }
              
              .panel {
                box-shadow: none;
                border: none;
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-wrap">
            <div class="panel" role="main" aria-labelledby="pageTitle">
              <header class="header">
                <div class="logo">CC</div>
                <div class="title-block">
                  <div id="pageTitle" class="title">CliCare Hospital — Patient Guidance Packet</div>
                  <div class="subtitle">Digital Patient Management System</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:12px;color:var(--muted);">Document No.</div>
                  <div style="font-weight:700;color:#0f172a;margin-top:4px;">${this.generateVisitId()}</div>
                </div>
              </header>

              <section class="info-grid" aria-label="Patient identification">
                <div class="info-card" style="flex-basis: 100%;">
                  <div class="info-label">Your Patient ID</div>
                  <div class="info-value" style="font-size: 24px; letter-spacing: 2px; color: var(--clicare-green);">
                    ${registrationResult.patientId}
                  </div>
                  <div style="margin-top: 8px; font-size: 11px; color: var(--muted);">
                    Please keep this ID for all future visits
                  </div>
                </div>
              </section>

              <section class="info-grid" aria-label="Department and queue information">
                <div class="info-card">
                  <div class="info-label">Department</div>
                  <div class="info-value">${department}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Queue Number</div>
                  <div class="info-value">${registrationResult.queue_number || this.generateQueueNumber()}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Estimated Wait</div>
                  <div class="info-value">${registrationResult.estimated_wait || '15-30 minutes'}</div>
                </div>
              </section>

              <section class="section">
                <h3>Patient Information</h3>
                <div class="box">
                  <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:180px">
                      <div class="info-label">Full Name</div>
                      <div class="info-value">${currentData.fullName || currentData.name || '-'}</div>
                    </div>
                    <div style="min-width:120px">
                      <div class="info-label">Age</div>
                      <div class="info-value">${currentData.age || '-'}</div>
                    </div>
                    <div style="min-width:120px">
                      <div class="info-label">Gender</div>
                      <div class="info-value">${currentData.sex || '-'}</div>
                    </div>
                  </div>

                  <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:220px">
                      <div class="info-label">Contact</div>
                      <div class="info-value">${currentData.contactNumber || currentData.contact_no || '-'}</div>
                    </div>
                    <div style="flex:1;min-width:220px">
                      <div class="info-label">Email</div>
                      <div class="info-value">${currentData.email || '-'}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section class="section medical-section">
                <h3>Medical Information Summary</h3>
                <div class="box">
                  <div class="symptoms-header">Reported Symptoms and Conditions (${currentData.selectedSymptoms?.length || 0} Items)</div>
                  <div class="symptoms-list">
                    ${(currentData.selectedSymptoms || []).map(symptom => 
                      `<span class="symptom-item">${symptom}</span>`
                    ).join('')}
                  </div>
                  
                  ${currentData.duration || currentData.severity ? `
                  <div style="margin-top:15px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
                    ${currentData.duration ? `
                    <div>
                      <div class="info-label">Symptom Duration</div>
                      <div class="info-value" style="font-size:13px;margin-top:4px;">${currentData.duration}</div>
                    </div>
                    ` : ''}
                    ${currentData.severity ? `
                    <div>
                      <div class="info-label">Severity Assessment</div>
                      <div class="info-value" style="font-size:13px;margin-top:4px;">${currentData.severity}</div>
                    </div>
                    ` : ''}
                  </div>
                  ` : ''}
                </div>
              </section>

              ${(currentData.allergies && currentData.allergies !== 'None') || (currentData.medications && currentData.medications !== 'None') ? `
                <div class="medical-alert">
                  <div class="alert-header">⚠️ Critical Medical Alert ⚠️</div>
                  <div class="alert-content">
                    ${currentData.allergies && currentData.allergies !== 'None' ? `<strong>KNOWN ALLERGIES:</strong> ${currentData.allergies}<br><br>` : ''}
                    ${currentData.medications && currentData.medications !== 'None' ? `<strong>CURRENT MEDICATIONS:</strong> ${currentData.medications}` : ''}
                  </div>
                </div>
              ` : ''}

              ${floorPlanImage ? `
              <section class="section">
                <h3>Floor Plan Preview</h3>
                <div class="box floor-plan">
                  <img src="${floorPlanImage}" alt="Floor plan for ${department}" loading="eager" crossorigin="anonymous" style="max-width: 100%; height: auto;" />
                  <div class="floor-meta">
                    <div style="font-weight:700;margin-bottom:8px">${department} — Floor Plan</div>
                    <div class="muted-note">Reference this map for efficient navigation to your department.</div>
                  </div>
                </div>
              </section>
              ` : ''}

              <section class="section">
                <h3>Navigation Instructions</h3>
                ${navigationSteps.length > 0 ? `
                <div class="box" style="overflow:auto;max-height:240px">
                  <table class="nav-table" aria-label="Navigation steps">
                    <thead>
                      <tr>
                        <th style="width:6%">#</th>
                        <th style="width:30%">Location</th>
                        <th>Instructions</th>
                        <th style="width:18%">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${navigationSteps.map((step, i) => `
                        <tr>
                          <td style="font-weight:700">${i+1}</td>
                          <td>${step.location || '-'}</td>
                          <td>${step.description || '-'}</td>
                          <td>${(step.floor ? 'Floor: ' + step.floor + (step.rooms ? '<br>Rooms: ' + step.rooms : '') : (step.rooms ? 'Rooms: ' + step.rooms : '-'))}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                ` : `
                <div class="no-data-message">
                  <p><strong>Navigation instructions are not yet configured for this department.</strong></p>
                  <p>Please proceed to the main reception desk for directions to ${department}.</p>
                </div>
                `}
              </section>

              <div class="emergency-note">
                <strong>⚠️ EMERGENCY NOTE</strong><br>
                In case of medical emergency, proceed immediately to the Emergency Department<br>
                Location: Ground Floor, East Wing
              </div>

              <div class="footer-meta">
                <div><strong>Issued:</strong> ${formattedDate} ${formattedTime}</div>
                <div><strong>Reference:</strong> ${this.generateVisitId()}</div>
                <div style="margin-left:auto;color:var(--muted)">CliCare Hospital • Medical Center & Healthcare Institution</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      console.log('📝 Writing content to print frame...');
      printDoc.open();
      printDoc.write(printContent);
      printDoc.close();

      // Wait for images to load before printing
      console.log('⏳ Waiting for content to load...');
      await new Promise((resolve) => {
        if (floorPlanImage) {
          const img = printDoc.querySelector('img');
          if (img) {
            // Add crossorigin attribute to handle Supabase images
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              console.log('✅ Floor plan loaded');
              setTimeout(resolve, 1000); // Increased delay for external images
            };
            img.onerror = (e) => {
              console.warn('⚠️ Floor plan failed to load:', e);
              setTimeout(resolve, 500);
            };
            // Fallback timeout
            setTimeout(resolve, 5000); // Increased timeout for external images
          } else {
            setTimeout(resolve, 500);
          }
        } else {
          setTimeout(resolve, 500);
        }
      });

      console.log('🖨️ Triggering print dialog...');
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();

      // Clean up after printing
      setTimeout(() => {
        document.body.removeChild(printFrame);
        console.log('✅ Print generation completed successfully!');
      }, 1000);
      
      return true;
      
    } catch (error) {
      console.error('❌ Print generation failed:', error);
      this.handlePrintError(error);
      throw error;
    }
  }
  
  // ✅ FIXED: Alternative method for thermal receipt printers
  static printThermalReceipt(registrationResult, patientData, formData) {
    try {
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
        QUEUE NO: ${registrationResult.queue_number || this.generateQueueNumber()}
        
        SYMPTOMS:
        ${(currentData.selectedSymptoms || []).join(', ')}
        
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
      
      // ✅ FIXED: Use iframe instead of window.open()
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);

      const printDoc = printFrame.contentWindow.document;
      
      printDoc.open();
      printDoc.write(`
        <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: monospace;
              white-space: pre-wrap;
              font-size: 12px;
              margin: 20px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>${receiptContent}</body>
        </html>
      `);
      printDoc.close();
      
      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 500);
      
      return true;
      
    } catch (error) {
      this.handlePrintError(error);
      return false;
    }
  }
  
  // Method to check if printing is supported
  static isPrintingSupported() {
    return typeof window !== 'undefined' && 'print' in window;
  }
  
  // Method to handle print errors
  static handlePrintError(error) {
    console.error('Printing failed:', error);
    alert('Printing failed: ' + error.message + '\n\nPlease ask hospital staff for assistance or take a screenshot of your information.');
  }
}