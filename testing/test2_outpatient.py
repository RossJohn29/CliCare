"""
CliCare Objective 2 - Document Upload Performance Testing
Run: python test2_outpatient.py
"""

import requests
import pandas as pd
import numpy as np
import json
import time
import random
import mimetypes
from datetime import datetime, timedelta
import os
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
from PIL import Image
from pathlib import Path

# ============================================================================
# CONFIGURATION
# ============================================================================

API_BASE = "http://localhost:5000"
OUTPUT_DIR = "objective2_comprehensive_results/document_upload"
SAMPLE_FILES_DIR = "sample_files"  # must contain 'valid' and 'invalid' subfolders

# Test configuration
COMPREHENSIVE_TEST = True
CLEANUP_AFTER_TEST = True
USE_REALISTIC_MODE = True  # Toggle between synthetic and realistic file testing

# Realistic mode settings
MAX_RETRIES = 1
USER_DELAY_RANGE = (0.5, 2.5)  # seconds
UPLOAD_RATE_RANGE_MBPS = (0.5, 5.0)  # MB/s
BASE_LATENCY_RANGE = (0.03, 0.25)  # seconds
TIME_TARGET_MS = 10000  # 10 seconds

# TEST PATIENT CONFIGURATION
TEST_PATIENT = {
    "patientId": "PAT712161759",
    "contactInfo": "cianalejarde.12@gmail.com",
    "contactType": "email"
}

# Valid file extensions for uploads
VALID_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg'}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_output_directory():
    """Create output directory for test results"""
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

def print_section_header(title):
    """Print formatted section header"""
    print("\n" + "="*80)
    print(title.center(80))
    print("="*80 + "\n")

def make_api_request(endpoint, method="GET", data=None, headers=None, files=None, timeout=60):
    """Make API request with error handling"""
    try:
        url = f"{API_BASE}/{endpoint}"
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=timeout)
        elif method == "POST":
            if files:
                response = requests.post(url, data=data, files=files, headers=headers, timeout=timeout)
            else:
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
        
        if response.status_code in [200, 201]:
            return response.json()
        else:
            print(f"⚠️  API Error: {response.status_code} - {response.text[:200]}")
            return None
    except requests.exceptions.Timeout:
        print(f"⚠️  Request timeout for {endpoint}")
        return None
    except Exception as e:
        print(f"⚠️  Request failed: {e}")
        return None

def authenticate_patient():
    """Authenticate patient using OTP and get token"""
    print("\n" + "="*80)
    print("PATIENT AUTHENTICATION")
    print("="*80)
    print(f"\nAuthenticating patient: {TEST_PATIENT['patientId']}")
    print(f"Contact: {TEST_PATIENT['contactInfo']} ({TEST_PATIENT['contactType']})")
    
    # Step 1: Request OTP
    print("\n📧 Step 1: Requesting OTP...")
    otp_result = make_api_request(
        "api/outpatient/send-otp",
        method="POST",
        data=TEST_PATIENT
    )
    
    if not otp_result or not otp_result.get('success'):
        print("❌ Failed to send OTP")
        print(f"Error: {otp_result.get('error') if otp_result else 'Unknown error'}")
        return None, None
    
    print(f"✅ OTP sent successfully to {TEST_PATIENT['contactInfo']}")
    print(f"⏰ OTP expires in: {otp_result.get('expiresIn', 300)} seconds")
    
    # Step 2: Get OTP from user
    print("\n🔐 Step 2: Enter OTP")
    print("=" * 80)
    if TEST_PATIENT['contactType'] == 'email':
        print(f"📧 Check your email at: {TEST_PATIENT['contactInfo']}")
    else:
        print(f"📱 Check your phone: {TEST_PATIENT['contactInfo']}")
    print("=" * 80)
    
    otp = input("\nEnter the 6-digit OTP code: ").strip()
    
    if not otp or len(otp) != 6:
        print("❌ Invalid OTP format. OTP must be 6 digits.")
        return None, None
    
    # Step 3: Verify OTP
    print("\n✅ Step 3: Verifying OTP...")
    verify_result = make_api_request(
        "api/outpatient/verify-otp",
        method="POST",
        data={
            "patientId": TEST_PATIENT["patientId"],
            "contactInfo": TEST_PATIENT["contactInfo"],
            "otp": otp,
            "deviceType": "test_script"
        }
    )
    
    if verify_result and verify_result.get('success'):
        patient = verify_result.get('patient', {})
        print(f"✅ Authentication successful!")
        print(f"👤 Patient: {patient.get('name', 'Unknown')}")
        print(f"🆔 Patient ID: {patient.get('patient_id', 'Unknown')}")
        print(f"📧 Email: {patient.get('email', 'Unknown')}")
        return verify_result.get('token'), patient
    else:
        print("❌ OTP verification failed")
        print(f"Error: {verify_result.get('error') if verify_result else 'Unknown error'}")
        return None, None

# ============================================================================
# REALISTIC MODE HELPERS
# ============================================================================

def human_think_delay():
    """Simulate user think time before an upload"""
    delay = random.uniform(*USER_DELAY_RANGE)
    time.sleep(delay)
    return delay

def simulate_network_delay_seconds(file_size_mb):
    """Simulate network latency based on file size and connection speed"""
    base = random.uniform(*BASE_LATENCY_RANGE)
    upload_rate = random.uniform(*UPLOAD_RATE_RANGE_MBPS)  # MB/s
    transfer_time = file_size_mb / upload_rate
    jitter = random.uniform(-0.1, 0.3) * transfer_time
    delay = max(0.0, base + transfer_time + jitter)
    time.sleep(delay)
    return delay

def file_size_mb_from_path(path):
    """Get file size in MB"""
    return os.path.getsize(path) / (1024 * 1024)

def list_sample_files():
    """List all sample files from valid and invalid directories"""
    valid_dir = Path(SAMPLE_FILES_DIR) / "valid"
    invalid_dir = Path(SAMPLE_FILES_DIR) / "invalid"
    
    valid_files = []
    invalid_files = []
    
    if valid_dir.exists():
        valid_files = sorted([str(p) for p in valid_dir.glob("*") if p.is_file()])
    
    if invalid_dir.exists():
        invalid_files = sorted([str(p) for p in invalid_dir.glob("*") if p.is_file()])
    
    return valid_files, invalid_files

def is_valid_format(path):
    """Check if file has a valid extension"""
    return Path(path).suffix.lower() in VALID_EXTENSIONS

def create_test_lab_request(token, patient_id, index):
    """Create a test lab request for upload testing"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # First, check if patient exists and get their database ID
    patient_result = make_api_request(
        f"api/patient/by-id/{patient_id}",
        headers=headers
    )
    
    if not patient_result or not patient_result.get('success'):
        print(f"❌ Failed to get patient data for {patient_id}")
        return None
    
    # Return a mock lab request for testing
    return {
        'request_id': 1 + index,
        'test_type': 'Complete Blood Count',
        'status': 'pending'
    }

def generate_test_file(filename, file_size_mb=1):
    """Generate synthetic test file content"""
    file_size = int(file_size_mb * 1024 * 1024)
    
    if filename.endswith('.pdf'):
        content = b'%PDF-1.4\n' + b'X' * (file_size - 10) + b'\n%%EOF'
    elif filename.endswith(('.jpg', '.jpeg')):
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = BytesIO()
        img.save(img_bytes, format='JPEG')
        content = img_bytes.getvalue()
        if len(content) < file_size:
            content += b'X' * (file_size - len(content))
    elif filename.endswith('.png'):
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = BytesIO()
        img.save(img_bytes, format='PNG')
        content = img_bytes.getvalue()
        if len(content) < file_size:
            content += b'X' * (file_size - len(content))
    else:
        content = b'X' * file_size
    
    return content

# ============================================================================
# DOCUMENT UPLOAD PERFORMANCE TESTING (COMBINED MODE)
# ============================================================================

def test_document_upload_performance(token, patient_id):
    """
    Test Document Upload Success Rate (DUSR) and File Format Compatibility Rate (FFCR)
    Supports both synthetic and realistic file testing modes
    """
    print_section_header("3.1.4.2.3 DOCUMENT UPLOAD PERFORMANCE (COMBINED MODE)")
    
    total_uploads = 50
    results = []
    headers = {"Authorization": f"Bearer {token}"}
    
    if USE_REALISTIC_MODE:
        print("🎯 REALISTIC MODE: Using sample files from disk")
        valid_files, invalid_files = list_sample_files()
        
        if not valid_files and not invalid_files:
            print(f"⚠️  No sample files found in {SAMPLE_FILES_DIR}/")
            print("   Falling back to synthetic mode...")
            use_realistic = False
        else:
            use_realistic = True
            print(f"   Found {len(valid_files)} valid and {len(invalid_files)} invalid sample files")
            
            # Prepare test sequence: mix valid and invalid files
            all_files = []
            pool_valid = valid_files.copy()
            pool_invalid = invalid_files.copy()
            
            for i in range(total_uploads):
                # 70% chance to pick valid file
                if pool_valid and (random.random() < 0.7 or not pool_invalid):
                    f = random.choice(pool_valid)
                elif pool_invalid:
                    f = random.choice(pool_invalid)
                else:
                    f = random.choice(pool_valid) if pool_valid else None
                
                if f:
                    all_files.append(f)
    else:
        use_realistic = False
        print("🔧 SYNTHETIC MODE: Generating test files")
    
    # Synthetic test scenarios (used if realistic mode is off or no files found)
    synthetic_scenarios = [
        ('test_result.pdf', 'application/pdf', 1, True, 'PDF lab result'),
        ('lab_report.jpg', 'image/jpeg', 2, True, 'JPEG scan'),
        ('scan_result.png', 'image/png', 1.5, True, 'PNG image'),
        ('medical_doc.pdf', 'application/pdf', 3, True, 'Large PDF'),
        ('xray_image.jpg', 'image/jpeg', 4, True, 'Large JPEG'),
        ('ultrasound.png', 'image/png', 2.5, True, 'Ultrasound image'),
        ('blood_test.pdf', 'application/pdf', 0.5, True, 'Small PDF'),
        ('ct_scan.jpg', 'image/jpeg', 5, True, 'CT scan'),
        ('test_file.txt', 'text/plain', 1, False, 'Text file - not allowed'),
        ('result.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1, False, 'Excel - not allowed'),
        ('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1, False, 'Word - not allowed'),
        ('video.mp4', 'video/mp4', 2, False, 'Video - not allowed'),
        ('audio.mp3', 'audio/mpeg', 1, False, 'Audio - not allowed'),
        ('large_file.pdf', 'application/pdf', 9, True, 'Large file near limit'),
        ('very_large.jpg', 'image/jpeg', 11, False, 'File exceeds 10MB'),
        ('tiny_file.pdf', 'application/pdf', 0.1, True, 'Very small file'),
    ]
    
    print(f"\nTesting {total_uploads} document upload attempts...")
    print(f"Patient ID: {patient_id}\n")
    
    for i in range(total_uploads):
        print(f"Test {i+1}/{total_uploads}: ", end='')
        
        # Get or create lab request
        lab_request = create_test_lab_request(token, patient_id, i)
        
        if not lab_request:
            print("❌ Setup failed - no lab request")
            results.append({
                'test_case': i+1,
                'filename': 'N/A',
                'file_format': 'N/A',
                'file_size_mb': 0,
                'should_succeed': False,
                'upload_successful': False,
                'format_compatible': False,
                'upload_time_ms': 0,
                'user_delay_s': 0,
                'simulated_network_delay_ms': 0,
                'measured_request_time_ms': 0,
                'end_to_end_ms': 0,
                'under_10s': False,
                'scenario': 'Setup failed - no lab request',
                'is_system_failure': True,
                'mode': 'realistic' if use_realistic else 'synthetic'
            })
            continue
        
        # REALISTIC MODE: Use actual files
        if use_realistic and i < len(all_files):
            file_path = all_files[i]
            filename = os.path.basename(file_path)
            file_size_mb = file_size_mb_from_path(file_path)
            should_succeed = is_valid_format(file_path)
            mimetype = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
            description = f"Real file: {filename}"
            
            # Simulate user behavior
            user_delay = human_think_delay()
            simulated_network_delay = simulate_network_delay_seconds(file_size_mb)
            
            # Perform upload with retry logic
            attempt = 0
            response = None
            measured_request_time_ms = 0
            success = False
            
            while attempt <= MAX_RETRIES:
                attempt += 1
                try:
                    with open(file_path, 'rb') as fh:
                        files = {
                            'labResultFile': (filename, fh, mimetype)
                        }
                        upload_data = {
                            'labRequestId': str(lab_request['request_id']),
                            'patientId': patient_id
                        }
                        
                        start_time = time.time()
                        result = make_api_request(
                            "api/patient/upload-lab-result",
                            method="POST",
                            data=upload_data,
                            files=files,
                            headers=headers
                        )
                        measured_request_time_ms = (time.time() - start_time) * 1000
                    
                    if result and result.get('success'):
                        success = True
                        break
                    elif attempt <= MAX_RETRIES:
                        backoff = 0.5 * (2 ** (attempt - 1))
                        time.sleep(backoff)
                except Exception as e:
                    print(f"⚠️ Attempt {attempt} failed: {e}")
                    if attempt <= MAX_RETRIES:
                        time.sleep(0.5 * (2 ** (attempt - 1)))
            
            end_to_end_ms = (simulated_network_delay * 1000) + measured_request_time_ms
            
        # SYNTHETIC MODE: Generate test files
        else:
            scenario = synthetic_scenarios[i % len(synthetic_scenarios)]
            filename, mimetype, file_size_mb, should_succeed, description = scenario
            
            user_delay = 0
            simulated_network_delay = 0
            
            # Generate test file
            file_content = generate_test_file(filename, file_size_mb)
            
            files = {
                'labResultFile': (filename, BytesIO(file_content), mimetype)
            }
            
            upload_data = {
                'labRequestId': str(lab_request['request_id']),
                'patientId': patient_id
            }
            
            start_time = time.time()
            result = make_api_request(
                "api/patient/upload-lab-result",
                method="POST",
                data=upload_data,
                files=files,
                headers=headers
            )
            measured_request_time_ms = (time.time() - start_time) * 1000
            
            success = result and result.get('success')
            end_to_end_ms = measured_request_time_ms
        
        # Calculate metrics
        format_compatible = should_succeed == success
        
        if success:
            print(f"✅ Uploaded ({end_to_end_ms:.0f}ms) - {description}")
        else:
            if should_succeed:
                print(f"❌ Failed - {description}")
            else:
                print(f"✅ Rejected (as expected) - {description}")
        
        results.append({
            'test_case': i+1,
            'filename': filename,
            'file_format': mimetype,
            'file_size_mb': file_size_mb,
            'should_succeed': should_succeed,
            'upload_successful': success,
            'format_compatible': format_compatible,
            'upload_time_ms': measured_request_time_ms,
            'user_delay_s': user_delay,
            'simulated_network_delay_ms': int(simulated_network_delay * 1000) if use_realistic else 0,
            'measured_request_time_ms': int(measured_request_time_ms),
            'end_to_end_ms': int(end_to_end_ms),
            'under_10s': end_to_end_ms <= TIME_TARGET_MS,
            'scenario': description,
            'patient_id': patient_id,
            'lab_request_id': lab_request['request_id'],
            'is_system_failure': False,
            'mode': 'realistic' if use_realistic else 'synthetic'
        })
        
        time.sleep(0.5)  # Cooldown between uploads
    
    # Calculate metrics
    total_tests = len(results)
    setup_failures = sum(1 for r in results if r.get('is_system_failure', False))
    valid_tests = [r for r in results if not r.get('is_system_failure', False)]
    
    valid_uploads = [r for r in valid_tests if r['should_succeed']]
    invalid_uploads = [r for r in valid_tests if not r['should_succeed']]
    
    successful_valid_uploads = sum(1 for r in valid_uploads if r['upload_successful'])
    correctly_rejected_invalid = sum(1 for r in invalid_uploads if not r['upload_successful'])
    total_successful_operations = successful_valid_uploads + correctly_rejected_invalid
    
    # DUSR: Success rate for valid formats only
    dusr = (successful_valid_uploads / len(valid_uploads) * 100) if valid_uploads else 0
    
    # FFCR: Correctly handled formats
    ffcr = (total_successful_operations / total_tests * 100)
    
    # Overall system success rate
    overall_success_rate = (total_successful_operations / total_tests * 100)
    
    # Processing time metrics
    valid_upload_times = [r['end_to_end_ms'] for r in valid_tests if r['end_to_end_ms'] > 0]
    avg_upload_time = np.mean(valid_upload_times) if valid_upload_times else 0
    processing_time_compliance = sum(1 for r in valid_tests if r['under_10s']) / len(valid_tests) * 100 if valid_tests else 0
    
    # Print results
    print(f"\n{'='*80}")
    print("DOCUMENT UPLOAD RESULTS")
    print(f"{'='*80}")
    print(f"Mode: {'REALISTIC' if use_realistic else 'SYNTHETIC'}")
    print(f"Total Test Cases: {total_tests}")
    print(f"Setup Failures: {setup_failures}")
    print(f"Valid Tests Executed: {len(valid_tests)}")
    print(f"Valid Format Attempts: {len(valid_uploads)}")
    print(f"Invalid Format Attempts: {len(invalid_uploads)}")
    print(f"Successful Valid Uploads: {successful_valid_uploads}")
    print(f"Correctly Rejected Invalid: {correctly_rejected_invalid}")
    print(f"Total Successful Operations: {total_successful_operations}")
    
    print(f"\n📊 OVERALL SYSTEM PERFORMANCE:")
    print(f"Result: {overall_success_rate:.2f}%")
    print(f"Target: ≥95%")
    print(f"Status: {'✅ PASS' if overall_success_rate >= 95 else '❌ FAIL'}")
    
    print(f"\n📊 DUSR CALCULATION (Valid Uploads Only):")
    print(f"Result: {dusr:.2f}%")
    print(f"Target: ≥95%")
    print(f"Status: {'✅ PASS' if dusr >= 95 else '❌ FAIL'}")
    
    print(f"\n📊 FFCR CALCULATION:")
    print(f"Result: {ffcr:.2f}%")
    print(f"Target: ≥98%")
    print(f"Status: {'✅ PASS' if ffcr >= 98 else '❌ FAIL'}")
    
    print(f"\n📊 PROCESSING PERFORMANCE:")
    print(f"Average Upload Time: {avg_upload_time:.2f}ms (Target: ≤{TIME_TARGET_MS}ms)")
    print(f"Processing Time Compliance: {processing_time_compliance:.2f}%")
    print(f"Status: {'✅ PASS' if avg_upload_time <= TIME_TARGET_MS else '❌ FAIL'}")
    
    # Export results
    results_df = pd.DataFrame(results)
    results_df.to_csv(f"{OUTPUT_DIR}/document_upload_results.csv", index=False)
    
    with open(f"{OUTPUT_DIR}/document_upload_results.json", 'w') as f:
        json.dump({
            'generated_at': datetime.utcnow().isoformat() + 'Z',
            'mode': 'realistic' if use_realistic else 'synthetic',
            'results': results
        }, f, indent=2)
    
    # Create format analysis
    valid_results_df = results_df[~results_df['is_system_failure']]
    if len(valid_results_df) > 0:
        format_analysis = valid_results_df.groupby('file_format').agg({
            'upload_successful': 'sum',
            'format_compatible': 'sum',
            'end_to_end_ms': 'mean',
            'file_size_mb': 'mean'
        }).reset_index()
        
        format_analysis['total_tests'] = valid_results_df.groupby('file_format').size().values
        format_analysis['success_rate'] = (format_analysis['upload_successful'] / format_analysis['total_tests'] * 100)
        format_analysis['compatibility_rate'] = (format_analysis['format_compatible'] / format_analysis['total_tests'] * 100)
        
        format_analysis.to_csv(f"{OUTPUT_DIR}/format_analysis.csv", index=False)
    
    return {
        'dusr': dusr,
        'ffcr': ffcr,
        'overall_success_rate': overall_success_rate,
        'successful': total_successful_operations,
        'total': total_tests,
        'valid_attempts': len(valid_uploads),
        'setup_failures': setup_failures,
        'avg_upload_time': avg_upload_time,
        'processing_time_compliance': processing_time_compliance,
        'system_status': 'PASS' if overall_success_rate >= 95 and ffcr >= 98 and avg_upload_time <= TIME_TARGET_MS else 'FAIL',
        'results': results,
        'mode': 'realistic' if use_realistic else 'synthetic'
    }

def create_document_upload_visualizations(upload_results):
    """Create document upload performance visualization"""
    
    plt.style.use('default')
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
    
    mode = upload_results.get('mode', 'synthetic')
    
    # 1. Document Upload Performance Metrics
    metrics = ['Upload Success\n(DUSR)', 'Format Compatibility\n(FFCR)', 'Processing Time\nCompliance']
    values = [
        upload_results['dusr'],
        upload_results['ffcr'],
        upload_results['processing_time_compliance']
    ]
    targets = [95, 98, 100]
    
    x_pos = np.arange(len(metrics))
    bars1 = ax1.bar(x_pos, values, alpha=0.8, color='#4DB6AC', label='Actual')
    ax1.plot(x_pos, targets, 'ro-', label='Target', linewidth=2)
    ax1.set_xlabel('Metrics', fontsize=12, fontweight='bold')
    ax1.set_ylabel('Performance (%)', fontsize=12, fontweight='bold')
    ax1.set_title(f'Document Upload Performance ({mode.upper()} Mode)', fontsize=14, fontweight='bold')
    ax1.set_xticks(x_pos)
    ax1.set_xticklabels(metrics)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    for bar, value in zip(bars1, values):
        ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f'{value:.1f}%', ha='center', va='bottom', fontweight='bold')
    
    # 2. Upload Success by File Format
    if upload_results['results']:
        results_df = pd.DataFrame(upload_results['results'])
        format_success = results_df.groupby('file_format')['upload_successful'].mean() * 100
        
        bars2 = ax2.bar(range(len(format_success)), format_success.values, alpha=0.8, color='#80CBC4')
        ax2.set_xlabel('File Format', fontsize=12, fontweight='bold')
        ax2.set_ylabel('Success Rate (%)', fontsize=12, fontweight='bold')
        ax2.set_title('Upload Success by File Format', fontsize=14, fontweight='bold')
        ax2.set_xticks(range(len(format_success)))
        ax2.set_xticklabels([fmt.split('/')[-1] for fmt in format_success.index], rotation=45, ha='right')
        ax2.grid(True, alpha=0.3)
        
        for bar, value in zip(bars2, format_success.values):
            ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 2,
                    f'{value:.0f}%', ha='center', va='bottom', fontweight='bold')
    
    # 3. Upload Time Distribution
    if upload_results['results']:
        upload_times = [r['end_to_end_ms'] for r in upload_results['results'] if r['end_to_end_ms'] > 0]
        ax3.hist(upload_times, bins=20, alpha=0.7, color='#B2DFDB', edgecolor='black')
        ax3.axvline(x=TIME_TARGET_MS, color='red', linestyle='--', linewidth=2, label=f'Target ({TIME_TARGET_MS/1000}s)')
        ax3.set_xlabel('Upload Time (ms)', fontsize=12, fontweight='bold')
        ax3.set_ylabel('Frequency', fontsize=12, fontweight='bold')
        ax3.set_title('Upload Time Distribution', fontsize=14, fontweight='bold')
        ax3.legend()
        ax3.grid(True, alpha=0.3)
    
    # 4. File Size vs Upload Time Scatter Plot
    if upload_results['results']:
        file_sizes = [r['file_size_mb'] for r in upload_results['results']]
        upload_times = [r['end_to_end_ms'] for r in upload_results['results']]
        success_colors = ['green' if r['upload_successful'] else 'red' for r in upload_results['results']]
        
        scatter = ax4.scatter(file_sizes, upload_times, c=success_colors, alpha=0.6, s=50)
        ax4.axhline(y=TIME_TARGET_MS, color='red', linestyle='--', linewidth=2, label=f'{TIME_TARGET_MS/1000}s limit')
        ax4.set_xlabel('File Size (MB)', fontsize=12, fontweight='bold')
        ax4.set_ylabel('Upload Time (ms)', fontsize=12, fontweight='bold')
        ax4.set_title('File Size vs Upload Time', fontsize=14, fontweight='bold')
        ax4.legend([f'{TIME_TARGET_MS/1000}s limit', 'Successful', 'Failed'])
        ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/document_upload_visualization.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"✅ Document upload visualization saved to {OUTPUT_DIR}/document_upload_visualization.png")

def generate_document_upload_report(upload_results):
    """Generate comprehensive document upload report"""
    print_section_header("DOCUMENT UPLOAD PERFORMANCE - COMPREHENSIVE REPORT")
    
    # Calculate overall system performance
    total_metrics = 3
    passed_metrics = 0
    
    if upload_results['dusr'] >= 95: passed_metrics += 1
    if upload_results['ffcr'] >= 98: passed_metrics += 1
    if upload_results['avg_upload_time'] <= TIME_TARGET_MS: passed_metrics += 1
    
    overall_pass_rate = (passed_metrics / total_metrics * 100)
    
    # Create executive summary
    executive_summary = {
        'test_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'test_mode': upload_results.get('mode', 'synthetic'),
        'document_upload': {
            'dusr': upload_results['dusr'],
            'ffcr': upload_results['ffcr'],
            'successful_uploads': upload_results['successful'],
            'total_attempts': upload_results['total'],
            'valid_attempts': upload_results['valid_attempts'],
            'avg_upload_time': upload_results['avg_upload_time'],
            'processing_time_compliance': upload_results['processing_time_compliance'],
            'status': 'PASS' if overall_pass_rate >= 80 else 'FAIL'
        },
        'overall_performance': {
            'passed_metrics': passed_metrics,
            'total_metrics': total_metrics,
            'pass_rate': overall_pass_rate,
            'status': 'PASS' if overall_pass_rate >= 80 else 'FAIL'
        }
    }
    
    # Export executive summary
    with open(f"{OUTPUT_DIR}/document_upload_executive_summary.json", 'w') as f:
        json.dump(executive_summary, f, indent=2)
    
    # Create metrics summary
    metrics_summary = pd.DataFrame([{
        'Metric': 'Document Upload Success Rate (DUSR)',
        'Formula': '(Successfully Processed Uploads / Valid Upload Attempts) × 100',
        'Target (%)': '≥95',
        'Result (%)': f"{upload_results['dusr']:.2f}",
        'Interpretation': 'PASS' if upload_results['dusr'] >= 95 else 'FAIL'
    }, {
        'Metric': 'File Format Compatibility Rate (FFCR)',
        'Formula': '(Correctly Handled Formats / Total Upload Attempts) × 100',
        'Target (%)': '≥98',
        'Result (%)': f"{upload_results['ffcr']:.2f}",
        'Interpretation': 'PASS' if upload_results['ffcr'] >= 98 else 'FAIL'
    }, {
        'Metric': 'Average Upload Processing Time',
        'Formula': 'Mean upload time for all attempts',
        'Target (ms)': f'≤{TIME_TARGET_MS}',
        'Result (ms)': f"{upload_results['avg_upload_time']:.2f}",
        'Interpretation': 'PASS' if upload_results['avg_upload_time'] <= TIME_TARGET_MS else 'FAIL'
    }])
    
    metrics_summary.to_csv(f"{OUTPUT_DIR}/metrics_summary.csv", index=False)
    
    # Print final report
    print(f"\n{'='*80}")
    print("DOCUMENT UPLOAD PERFORMANCE - FINAL TEST RESULTS")
    print(f"{'='*80}")
    print(f"Test Date: {executive_summary['test_date']}")
    print(f"Test Mode: {executive_summary['test_mode'].upper()}")
    print(f"\n📊 UPLOAD PERFORMANCE:")
    print(f"  Document Upload Success Rate (DUSR): {executive_summary['document_upload']['dusr']:.2f}% (Target: ≥95%)")
    print(f"  File Format Compatibility Rate (FFCR): {executive_summary['document_upload']['ffcr']:.2f}% (Target: ≥98%)")
    print(f"  Successful Uploads: {executive_summary['document_upload']['successful_uploads']}/{executive_summary['document_upload']['valid_attempts']} valid attempts")
    print(f"  Total Test Cases: {executive_summary['document_upload']['total_attempts']}")
    print(f"\n📊 PROCESSING PERFORMANCE:")
    print(f"  Average Upload Time: {executive_summary['document_upload']['avg_upload_time']:.2f}ms (Target: ≤{TIME_TARGET_MS}ms)")
    print(f"  Processing Time Compliance: {executive_summary['document_upload']['processing_time_compliance']:.2f}%")
    print(f"\n🎯 OVERALL SYSTEM PERFORMANCE:")
    print(f"  Metrics Passed: {executive_summary['overall_performance']['passed_metrics']}/{executive_summary['overall_performance']['total_metrics']}")
    print(f"  Overall Pass Rate: {executive_summary['overall_performance']['pass_rate']:.2f}%")
    print(f"  System Status: {executive_summary['overall_performance']['status']}")
    
    return executive_summary

def run_comprehensive_document_upload_tests():
    """Run all document upload performance tests"""
    
    print("\n" + "="*80)
    print("CLICARE OBJECTIVE 2 - DOCUMENT UPLOAD PERFORMANCE TESTING")
    print("="*80)
    print(f"Testing against: {API_BASE}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Mode: {'REALISTIC (using sample files)' if USE_REALISTIC_MODE else 'SYNTHETIC (generating test files)'}")
    
    # Create output directories
    create_output_directory()
    
    # Check backend connectivity
    print("\n🔍 Checking backend connectivity...")
    health_check = make_api_request("api/health")
    if not health_check:
        print("❌ Backend not reachable. Please ensure your server is running.")
        return
    
    print(f"✅ Backend is online: {health_check.get('message', 'OK')}")
    
    # Authenticate as patient
    token, patient_data = authenticate_patient()
    if not token:
        print("\n❌ Authentication failed. Cannot proceed with testing.")
        print("\n💡 Troubleshooting:")
        print("   1. Verify the patient exists in your database")
        print("   2. Check the patient ID and contact info in TEST_PATIENT configuration")
        print("   3. Ensure email/SMS service is configured")
        print("   4. Check that OTP was sent and entered correctly")
        return None
    
    try:
        print("\n🚀 Starting document upload performance testing...")
        
        # Run tests
        upload_results = test_document_upload_performance(token, patient_data['patient_id'])
        
        # Generate comprehensive report
        final_report = generate_document_upload_report(upload_results)
        
        # Generate visualization
        try:
            create_document_upload_visualizations(upload_results)
        except Exception as e:
            print(f"⚠️ Visualization generation failed: {e}")
        
        # Print completion message
        print(f"\n{'='*80}")
        print("✅ DOCUMENT UPLOAD PERFORMANCE TESTS COMPLETED SUCCESSFULLY")
        print(f"{'='*80}")
        print(f"\n📊 Final Results Summary:")
        print(f"   • Overall Pass Rate: {final_report['overall_performance']['pass_rate']:.2f}%")
        print(f"   • System Status: {final_report['overall_performance']['status']}")
        print(f"   • Test Mode: {final_report['test_mode'].upper()}")
        print(f"\n📁 All results saved to: {OUTPUT_DIR}/")
        print(f"   • Upload Results CSV: {OUTPUT_DIR}/document_upload_results.csv")
        print(f"   • Upload Results JSON: {OUTPUT_DIR}/document_upload_results.json")
        print(f"   • Format Analysis: {OUTPUT_DIR}/format_analysis.csv")
        print(f"   • Metrics Summary: {OUTPUT_DIR}/metrics_summary.csv")
        print(f"   • Executive Summary: {OUTPUT_DIR}/document_upload_executive_summary.json")
        print(f"   • Performance Chart: {OUTPUT_DIR}/document_upload_visualization.png")
        
        return final_report
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Testing interrupted by user")
        return None
    except Exception as e:
        print(f"\n\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return None

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    try:
        print("\n" + "="*80)
        print("CLICARE OBJECTIVE 2 - DOCUMENT UPLOAD PERFORMANCE TESTING")
        print("COMBINED REALISTIC & SYNTHETIC MODE")
        print("="*80)
        print("\n📋 This comprehensive test suite will:")
        print("   ✓ Authenticate as a patient user")
        print("   ✓ Test Document Upload Success Rate (DUSR)")
        print("   ✓ Test File Format Compatibility Rate (FFCR)")
        print(f"   ✓ Test upload processing time compliance (≤{TIME_TARGET_MS/1000} seconds)")
        print("   ✓ Test various file formats and sizes")
        
        if USE_REALISTIC_MODE:
            print("   ✓ Use REALISTIC files from sample_files/ directory")
            print("   ✓ Simulate user behavior (think time, network delays)")
            print("   ✓ Implement retry logic for failed uploads")
        else:
            print("   ✓ Use SYNTHETIC generated test files")
            print("   ✓ Fast execution without network simulation")
        
        print("   ✓ Generate comprehensive performance metrics")
        print("   ✓ Export all required tables and documentation")
        
        print(f"\n📊 Test Coverage:")
        print(f"   • Document Upload: 50 test cases")
        print(f"   • Valid formats: {', '.join(sorted(VALID_EXTENSIONS))}")
        print(f"   • File sizes: 0.1MB to 11MB")
        print(f"   • Edge cases and error scenarios")
        
        print(f"\n🎯 Target Metrics:")
        print(f"   • Document Upload Success Rate (DUSR): ≥95%")
        print(f"   • File Format Compatibility Rate (FFCR): ≥98%")
        print(f"   • Upload processing time: ≤{TIME_TARGET_MS/1000} seconds")
        print(f"   • File size support: up to 10MB")
        
        print(f"\n⚠️  IMPORTANT SETUP REQUIREMENTS:")
        print(f"   1. Create test patient in database:")
        print(f"      Patient ID: {TEST_PATIENT['patientId']}")
        print(f"      Contact: {TEST_PATIENT['contactInfo']}")
        print(f"   2. Ensure email/SMS service is configured")
        print(f"   3. Backend server must be running")
        
        if USE_REALISTIC_MODE:
            print(f"\n📁 REALISTIC MODE REQUIREMENTS:")
            print(f"   • Create directory: {SAMPLE_FILES_DIR}/")
            print(f"   • Add valid files to: {SAMPLE_FILES_DIR}/valid/")
            print(f"     (PDF, PNG, JPG files)")
            print(f"   • Add invalid files to: {SAMPLE_FILES_DIR}/invalid/")
            print(f"     (TXT, DOCX, XLSX, MP4, etc.)")
            print(f"   • Script will automatically mix and test all files")
        
        print("\n" + "="*80)
        input("Press ENTER to start document upload testing (or Ctrl+C to cancel)...")
        
        # Run comprehensive tests
        final_report = run_comprehensive_document_upload_tests()
        
        if final_report:
            print("\n" + "="*80)
            print("✅ DOCUMENT UPLOAD TESTING COMPLETED SUCCESSFULLY")
            print("="*80)
            print(f"\n🎯 FINAL RESULTS:")
            print(f"   • Overall System Pass Rate: {final_report['overall_performance']['pass_rate']:.2f}%")
            print(f"   • Document Upload Status: {final_report['document_upload']['status']}")
            print(f"   • Test Mode: {final_report['test_mode'].upper()}")
            
            print(f"\n📁 Complete Documentation Package:")
            print(f"   • All test results: {OUTPUT_DIR}/")
            print(f"   • Performance metrics: All required tables generated")
            print(f"   • Visualizations: Charts and graphs included")
            print(f"   • Format analysis: Detailed breakdown by file type")
            
            if USE_REALISTIC_MODE:
                print(f"\n🎯 REALISTIC MODE INSIGHTS:")
                print(f"   • User behavior simulation: Included")
                print(f"   • Network latency simulation: Included")
                print(f"   • Retry logic: Enabled (max {MAX_RETRIES} retries)")
                print(f"   • Real file testing: Complete")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error during testing: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Common issues:")
        print("   • Ensure test patient exists in database")
        print("   • Verify patient credentials in TEST_PATIENT configuration")
        print("   • Check email/SMS service is configured")
        print("   • Ensure backend server is running (node server.js)")
        if USE_REALISTIC_MODE:
            print(f"   • Verify sample files exist in {SAMPLE_FILES_DIR}/valid and {SAMPLE_FILES_DIR}/invalid")
            print("   • Check file permissions for reading sample files")