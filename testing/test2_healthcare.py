"""
CliCare Objective 2 - Healthcare Provider Interface Testing (COMPREHENSIVE)
Run: python test2_healthcare.py
"""

import requests
import pandas as pd
import numpy as np
import json
import time
from datetime import datetime, timedelta
import os
import matplotlib.pyplot as plt
import seaborn as sns

# ============================================================================
# CONFIGURATION
# ============================================================================

API_BASE = "http://localhost:5000"
OUTPUT_DIR = "objective2_comprehensive_results/healthcare_interface"

# Test configuration
COMPREHENSIVE_TEST = True
CLEANUP_AFTER_TEST = True

# Sample test credentials (healthcare provider)
TEST_STAFF_CREDENTIALS = {
    "staffId": "DOC001",
    "password": "doctor123"
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_output_directory():
    """Create output directory for test results"""
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

def print_section_header(title):
    """Print formatted section header"""
    print("\n" + "="*80)
    print(title.center(80))
    print("="*80 + "\n")

def make_api_request(endpoint, method="GET", data=None, headers=None):
    """Make API request with error handling"""
    try:
        url = f"{API_BASE}/{endpoint}"
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method == "PATCH":
            response = requests.patch(url, json=data, headers=headers, timeout=30)
        
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

def authenticate_staff():
    """Authenticate healthcare provider and get token"""
    print("Authenticating healthcare provider...")
    
    result = make_api_request(
        "api/staff/login",
        method="POST",
        data=TEST_STAFF_CREDENTIALS
    )
    
    if result and result.get('success'):
        print(f"✅ Authenticated as: {result.get('staff', {}).get('name', 'Unknown')}")
        return result.get('token'), result.get('staff')
    else:
        print("❌ Authentication failed")
        return None, None

def create_test_patient(token, index):
    """Create a test patient for lab testing"""
    timestamp = int(time.time() * 1000000) + (index * 1000)
    
    patient_data = {
        "name": f"Healthcare Interface Test Patient {index} {timestamp}",
        "birthday": "1985-05-15",
        "age": 39,
        "sex": "Female" if index % 2 == 0 else "Male",
        "address": f"Test Address {index}, Test City",
        "contact_no": f"09{(timestamp % 900000000) + 100000000}",
        "email": f"healthcaretest{timestamp}@testclicare.com",
        "emergency_contact_name": f"Emergency Contact {index}",
        "emergency_contact_relationship": "Spouse",
        "emergency_contact_no": f"09{((timestamp + 999) % 900000000) + 100000000}",
        "symptoms": ["Fever", "Cough"],
        "duration": "3 days",
        "severity": "Moderate"
    }
    
    result = make_api_request("api/patient/register", method="POST", data=patient_data)
    
    if result and result.get('success'):
        return result.get('patient'), result.get('visit')
    
    return None, None

# ============================================================================
# HEALTHCARE PROVIDER INTERFACE TESTING
# ============================================================================

def test_lab_request_generation(token, staff_data):
    """
    Test Lab Request Generation Success Rate (LRGSR)
    Target: ≥98%
    Formula: (Successful Lab Request Creations / Total Lab Request Attempts) × 100
    """
    print_section_header("3.1.4.2.1 LAB REQUEST GENERATION SUCCESS RATE (LRGSR)")
    
    total_attempts = 50
    successful_requests = 0
    failed_requests = []
    results = []
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test data: Various lab test types
    test_types = [
        "Complete Blood Count (CBC)",
        "Blood Chemistry",
        "Urinalysis",
        "Lipid Profile",
        "Thyroid Function Test",
        "Liver Function Test",
        "Kidney Function Test",
        "Blood Glucose Test",
        "HbA1c Test",
        "X-ray"
    ]
    
    print(f"Testing {total_attempts} lab request creation attempts...")
    
    for i in range(total_attempts):
        print(f"Test {i+1}/{total_attempts}: ", end='')
        
        # Create test patient
        patient, visit = create_test_patient(token, i)
        
        if not patient:
            print("❌ Patient creation failed")
            failed_requests.append({
                'test_case': i+1,
                'reason': 'Patient creation failed',
                'success': False
            })
            continue
        
        # Create lab request
        test_type = test_types[i % len(test_types)]
        lab_request_data = {
            "patient_id": patient['patient_id'],
            "test_name": test_type,
            "test_type": test_type,
            "priority": "normal" if i % 3 != 0 else "urgent",
            "instructions": f"Test instructions for case {i+1}",
            "due_date": (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d')
        }
        
        start_time = time.time()
        result = make_api_request(
            "api/healthcare/lab-requests",
            method="POST",
            data=lab_request_data,
            headers=headers
        )
        processing_time = (time.time() - start_time) * 1000  # Convert to ms
        
        if result and result.get('success'):
            successful_requests += 1
            print(f"✅ Success ({processing_time:.0f}ms)")
            
            results.append({
                'test_case': i+1,
                'patient_id': patient['patient_id'],
                'test_type': test_type,
                'priority': lab_request_data['priority'],
                'request_id': result.get('labRequest', {}).get('request_id'),
                'processing_time_ms': processing_time,
                'success': True,
                'status': 'Created successfully'
            })
        else:
            print(f"❌ Failed")
            failed_requests.append({
                'test_case': i+1,
                'patient_id': patient['patient_id'] if patient else None,
                'test_type': test_type,
                'success': False,
                'reason': 'API error'
            })
        
        time.sleep(0.5)
    
    # Calculate LRGSR
    lrgsr = (successful_requests / total_attempts * 100) if total_attempts > 0 else 0
    avg_processing_time = np.mean([r['processing_time_ms'] for r in results]) if results else 0
    
    # Print results
    print(f"\n{'='*80}")
    print("LAB REQUEST GENERATION RESULTS")
    print(f"{'='*80}")
    print(f"Total Attempts: {total_attempts}")
    print(f"Successful Requests: {successful_requests}")
    print(f"Failed Requests: {len(failed_requests)}")
    print(f"\n📊 LRGSR CALCULATION:")
    print(f"Formula: (Successful Lab Request Creations / Total Lab Request Attempts) × 100")
    print(f"Computation: ({successful_requests} / {total_attempts}) × 100")
    print(f"Result: {lrgsr:.2f}%")
    print(f"Target: ≥98%")
    print(f"Status: {'✅ PASS' if lrgsr >= 98 else '❌ FAIL'}")
    print(f"\nAverage Processing Time: {avg_processing_time:.2f}ms (Target: ≤3000ms)")
    print(f"Processing Time Status: {'✅ PASS' if avg_processing_time <= 3000 else '❌ FAIL'}")
    
    # Export results
    results_df = pd.DataFrame(results)
    results_df.to_csv(f"{OUTPUT_DIR}/lab_request_generation_results.csv", index=False)
    
    if failed_requests:
        failed_df = pd.DataFrame(failed_requests)
        failed_df.to_csv(f"{OUTPUT_DIR}/lab_request_generation_failures.csv", index=False)
    
    return {
        'lrgsr': lrgsr,
        'successful': successful_requests,
        'total': total_attempts,
        'avg_processing_time': avg_processing_time,
        'results': results
    }

def test_patient_history_retrieval(token, staff_data, lab_results):
    """
    Test Patient History Retrieval Accuracy (PHRA)
    Target: ≥99%
    Formula: (Correct Patient Records Retrieved / Total Retrieval Requests) × 100
    """
    print_section_header("3.1.4.2.2 PATIENT HISTORY RETRIEVAL ACCURACY (PHRA)")
    
    total_requests = 50
    correct_retrievals = 0
    results = []
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get patient IDs from lab request results
    patient_ids = [r['patient_id'] for r in lab_results['results'][:total_requests]]
    
    print(f"Testing {total_requests} patient history retrieval requests...")
    
    for i, patient_id in enumerate(patient_ids):
        print(f"Test {i+1}/{total_requests}: ", end='')
        
        start_time = time.time()
        result = make_api_request(
            f"api/healthcare/patient-history/{patient_id}",
            headers=headers
        )
        retrieval_time = (time.time() - start_time) * 1000
        
        if result and result.get('success'):
            patient_data = result.get('patient')
            visit_history = result.get('visitHistory', [])
            
            # Verify correct patient retrieved
            is_correct = (patient_data.get('patient_id') == patient_id)
            
            if is_correct:
                correct_retrievals += 1
                print(f"✅ Correct ({retrieval_time:.0f}ms)")
            else:
                print(f"❌ Wrong patient data")
            
            results.append({
                'test_case': i+1,
                'patient_id': patient_id,
                'retrieved_correctly': is_correct,
                'visit_count': len(visit_history),
                'retrieval_time_ms': retrieval_time,
                'data_access_time_under_3s': retrieval_time <= 3000
            })
        else:
            print(f"❌ Retrieval failed")
            results.append({
                'test_case': i+1,
                'patient_id': patient_id,
                'retrieved_correctly': False,
                'visit_count': 0,
                'retrieval_time_ms': retrieval_time,
                'data_access_time_under_3s': False
            })
        
        time.sleep(1.0)
    
    # Calculate PHRA
    phra = (correct_retrievals / total_requests * 100) if total_requests > 0 else 0
    avg_retrieval_time = np.mean([r['retrieval_time_ms'] for r in results])
    access_time_compliance = sum(1 for r in results if r['data_access_time_under_3s']) / total_requests * 100
    
    # Print results
    print(f"\n{'='*80}")
    print("PATIENT HISTORY RETRIEVAL RESULTS")
    print(f"{'='*80}")
    print(f"Total Requests: {total_requests}")
    print(f"Correct Retrievals: {correct_retrievals}")
    print(f"\n📊 PHRA CALCULATION:")
    print(f"Formula: (Correct Patient Records Retrieved / Total Retrieval Requests) × 100")
    print(f"Computation: ({correct_retrievals} / {total_requests}) × 100")
    print(f"Result: {phra:.2f}%")
    print(f"Target: ≥99%")
    print(f"Status: {'✅ PASS' if phra >= 99 else '❌ FAIL'}")
    print(f"\nAverage Retrieval Time: {avg_retrieval_time:.2f}ms")
    print(f"Data Access Time Compliance: {access_time_compliance:.2f}% (Target: ≤3000ms)")
    print(f"Access Time Status: {'✅ PASS' if avg_retrieval_time <= 3000 else '❌ FAIL'}")
    
    # Export results
    results_df = pd.DataFrame(results)
    results_df.to_csv(f"{OUTPUT_DIR}/patient_history_retrieval_results.csv", index=False)
    
    return {
        'phra': phra,
        'correct': correct_retrievals,
        'total': total_requests,
        'avg_retrieval_time': avg_retrieval_time,
        'access_time_compliance': access_time_compliance
    }

def create_healthcare_interface_visualizations(lrgsr_results, phra_results):
    """Create healthcare interface performance visualization"""
    
    plt.style.use('default')
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. Healthcare Interface Performance Metrics
    metrics = ['Lab Request\nGeneration', 'Patient History\nRetrieval', 'Processing\nTime', 'Access Time\nCompliance']
    values = [
        lrgsr_results['lrgsr'],
        phra_results['phra'],
        100 - (lrgsr_results['avg_processing_time'] / 3000 * 100),  # Processing time performance
        phra_results['access_time_compliance']
    ]
    targets = [98, 99, 100, 100]
    
    x_pos = np.arange(len(metrics))
    bars1 = ax1.bar(x_pos, values, alpha=0.8, color='#4DB6AC', label='Actual')
    ax1.plot(x_pos, targets, 'ro-', label='Target', linewidth=2)
    ax1.set_xlabel('Metrics', fontsize=12, fontweight='bold')
    ax1.set_ylabel('Performance (%)', fontsize=12, fontweight='bold')
    ax1.set_title('Healthcare Provider Interface Performance', fontsize=14, fontweight='bold')
    ax1.set_xticks(x_pos)
    ax1.set_xticklabels(metrics)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Add value labels on bars
    for bar, value in zip(bars1, values):
        ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f'{value:.1f}%', ha='center', va='bottom', fontweight='bold')
    
    # 2. Lab Request Generation by Test Type
    if lrgsr_results['results']:
        test_types = [r['test_type'] for r in lrgsr_results['results']]
        type_counts = pd.Series(test_types).value_counts()
        
        bars2 = ax2.bar(range(len(type_counts)), type_counts.values, alpha=0.8, color='#80CBC4')
        ax2.set_xlabel('Lab Test Type', fontsize=12, fontweight='bold')
        ax2.set_ylabel('Number of Requests', fontsize=12, fontweight='bold')
        ax2.set_title('Lab Requests by Test Type', fontsize=14, fontweight='bold')
        ax2.set_xticks(range(len(type_counts)))
        ax2.set_xticklabels(type_counts.index, rotation=45, ha='right')
        ax2.grid(True, alpha=0.3)
        
        for bar, value in zip(bars2, type_counts.values):
            ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                    f'{value}', ha='center', va='bottom', fontweight='bold')
    
    # 3. Processing Time Distribution
    if lrgsr_results['results']:
        processing_times = [r['processing_time_ms'] for r in lrgsr_results['results']]
        ax3.hist(processing_times, bins=20, alpha=0.7, color='#B2DFDB', edgecolor='black')
        ax3.axvline(x=3000, color='red', linestyle='--', linewidth=2, label='Target (3000ms)')
        ax3.set_xlabel('Processing Time (ms)', fontsize=12, fontweight='bold')
        ax3.set_ylabel('Frequency', fontsize=12, fontweight='bold')
        ax3.set_title('Lab Request Processing Time Distribution', fontsize=14, fontweight='bold')
        ax3.legend()
        ax3.grid(True, alpha=0.3)
    
    # 4. Overall System Health Gauge
    overall_score = np.mean([lrgsr_results['lrgsr'], phra_results['phra']])
    
    # Create a gauge-like visualization
    theta = np.linspace(0, np.pi, 100)
    r = np.ones_like(theta)
    
    ax4.plot(theta, r, 'k-', linewidth=2)
    ax4.fill_between(theta, 0, r, alpha=0.3, color='lightgray')
    
    # Color zones
    if overall_score >= 98:
        color = 'green'
        zone = 'Excellent'
    elif overall_score >= 95:
        color = 'yellow'
        zone = 'Good'
    elif overall_score >= 90:
        color = 'orange'
        zone = 'Fair'
    else:
        color = 'red'
        zone = 'Poor'
    
    # Add score indicator
    score_angle = (overall_score / 100) * np.pi
    ax4.plot([score_angle, score_angle], [0, 1], color=color, linewidth=4)
    ax4.text(np.pi/2, 0.5, f'{overall_score:.1f}%\n{zone}', 
             ha='center', va='center', fontsize=14, fontweight='bold')
    ax4.set_xlim(0, np.pi)
    ax4.set_ylim(0, 1.2)
    ax4.set_title('Overall Healthcare Interface Health', fontsize=14, fontweight='bold')
    ax4.axis('off')
    
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/healthcare_interface_visualization.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"✅ Healthcare interface visualization saved to {OUTPUT_DIR}/healthcare_interface_visualization.png")

def generate_healthcare_interface_report(lrgsr_results, phra_results):
    """Generate comprehensive healthcare interface report"""
    print_section_header("HEALTHCARE PROVIDER INTERFACE - COMPREHENSIVE REPORT")
    
    # Calculate overall system performance
    total_metrics = 4
    passed_metrics = 0
    
    # Count passed metrics
    if lrgsr_results['lrgsr'] >= 98: passed_metrics += 1
    if phra_results['phra'] >= 99: passed_metrics += 1
    if lrgsr_results['avg_processing_time'] <= 3000: passed_metrics += 1
    if phra_results['avg_retrieval_time'] <= 3000: passed_metrics += 1
    
    overall_pass_rate = (passed_metrics / total_metrics * 100)
    
    # Create executive summary
    executive_summary = {
        'test_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'healthcare_interface': {
            'lrgsr': lrgsr_results['lrgsr'],
            'phra': phra_results['phra'],
            'avg_processing_time': lrgsr_results['avg_processing_time'],
            'avg_retrieval_time': phra_results['avg_retrieval_time'],
            'access_time_compliance': phra_results['access_time_compliance'],
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
    with open(f"{OUTPUT_DIR}/healthcare_interface_executive_summary.json", 'w') as f:
        json.dump(executive_summary, f, indent=2)
    
    # Create metrics summary
    metrics_summary = pd.DataFrame([{
        'Metric': 'Lab Request Generation Success Rate (LRGSR)',
        'Formula': '(Successful Lab Request Creations / Total Lab Request Attempts) × 100',
        'Target (%)': '≥98',
        'Result (%)': f"{lrgsr_results['lrgsr']:.2f}",
        'Interpretation': 'PASS' if lrgsr_results['lrgsr'] >= 98 else 'FAIL'
    }, {
        'Metric': 'Patient History Retrieval Accuracy (PHRA)',
        'Formula': '(Correct Patient Records Retrieved / Total Retrieval Requests) × 100',
        'Target (%)': '≥99',
        'Result (%)': f"{phra_results['phra']:.2f}",
        'Interpretation': 'PASS' if phra_results['phra'] >= 99 else 'FAIL'
    }, {
        'Metric': 'Average Processing Time',
        'Formula': 'Mean processing time for lab requests',
        'Target (ms)': '≤3000',
        'Result (ms)': f"{lrgsr_results['avg_processing_time']:.2f}",
        'Interpretation': 'PASS' if lrgsr_results['avg_processing_time'] <= 3000 else 'FAIL'
    }, {
        'Metric': 'Data Access Time Compliance',
        'Formula': '(Requests under 3s / Total Requests) × 100',
        'Target (%)': '100',
        'Result (%)': f"{phra_results['access_time_compliance']:.2f}",
        'Interpretation': 'PASS' if phra_results['access_time_compliance'] >= 95 else 'FAIL'
    }])
    
    metrics_summary.to_csv(f"{OUTPUT_DIR}/metrics_summary.csv", index=False)
    
    # Print final report
    print(f"\n{'='*80}")
    print("HEALTHCARE PROVIDER INTERFACE - FINAL TEST RESULTS")
    print(f"{'='*80}")
    print(f"Test Date: {executive_summary['test_date']}")
    print(f"\n📊 LAB REQUEST GENERATION:")
    print(f"  Success Rate (LRGSR): {executive_summary['healthcare_interface']['lrgsr']:.2f}% (Target: ≥98%)")
    print(f"  Average Processing Time: {executive_summary['healthcare_interface']['avg_processing_time']:.2f}ms (Target: ≤3000ms)")
    print(f"\n📊 PATIENT HISTORY RETRIEVAL:")
    print(f"  Accuracy (PHRA): {executive_summary['healthcare_interface']['phra']:.2f}% (Target: ≥99%)")
    print(f"  Average Retrieval Time: {executive_summary['healthcare_interface']['avg_retrieval_time']:.2f}ms (Target: ≤3000ms)")
    print(f"  Access Time Compliance: {executive_summary['healthcare_interface']['access_time_compliance']:.2f}%")
    print(f"\n🎯 OVERALL SYSTEM PERFORMANCE:")
    print(f"  Metrics Passed: {executive_summary['overall_performance']['passed_metrics']}/{executive_summary['overall_performance']['total_metrics']}")
    print(f"  Overall Pass Rate: {executive_summary['overall_performance']['pass_rate']:.2f}%")
    print(f"  System Status: {executive_summary['overall_performance']['status']}")
    
    return executive_summary

def cleanup_healthcare_interface_test_data():
    """Clean up healthcare interface test data from database"""
    print("\n🧹 Cleaning up healthcare interface test data...")
    
    cleanup_sql = """
    -- Clean up healthcare interface test patients and lab requests
    DELETE FROM lab_requests WHERE patient_id IN (
        SELECT id FROM outpatient WHERE name LIKE '%Healthcare Interface Test Patient%'
    );
    
    DELETE FROM queue WHERE visit_id IN (
        SELECT visit_id FROM visit WHERE patient_id IN (
            SELECT id FROM outpatient WHERE name LIKE '%Healthcare Interface Test Patient%'
        )
    );
    
    DELETE FROM visit WHERE patient_id IN (
        SELECT id FROM outpatient WHERE name LIKE '%Healthcare Interface Test Patient%'
    );
    
    DELETE FROM emergency_contact WHERE patient_id IN (
        SELECT id FROM outpatient WHERE name LIKE '%Healthcare Interface Test Patient%'
    );
    
    DELETE FROM outpatient WHERE name LIKE '%Healthcare Interface Test Patient%';
    """
    
    with open(f"{OUTPUT_DIR}/healthcare_interface_cleanup_sql.sql", 'w') as f:
        f.write(cleanup_sql)
    
    print(f"✅ Healthcare interface cleanup SQL saved to {OUTPUT_DIR}/healthcare_interface_cleanup_sql.sql")
    print("💡 Run the SQL commands to clean up test data from your database")

def run_comprehensive_healthcare_interface_tests():
    """Run all healthcare provider interface tests"""
    
    print("\n" + "="*80)
    print("CLICARE OBJECTIVE 2 - HEALTHCARE PROVIDER INTERFACE TESTING")
    print("="*80)
    print(f"Testing against: {API_BASE}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Output directory: {OUTPUT_DIR}")
    
    # Create output directories
    create_output_directory()
    
    # Check backend connectivity
    print("\n🔍 Checking backend connectivity...")
    health_check = make_api_request("api/health")
    if not health_check:
        print("❌ Backend not reachable. Please ensure your server is running.")
        return
    
    print(f"✅ Backend is online: {health_check.get('message', 'OK')}")
    
    # Authenticate
    token, staff_data = authenticate_staff()
    if not token:
        print("\n❌ Authentication failed. Please check credentials.")
        return None
    
    try:
        print("\n🚀 Starting healthcare provider interface testing...")
        
        # Run tests
        lrgsr_results = test_lab_request_generation(token, staff_data)
        phra_results = test_patient_history_retrieval(token, staff_data, lrgsr_results)
        
        # Generate comprehensive report
        final_report = generate_healthcare_interface_report(lrgsr_results, phra_results)
        
        # Generate visualization
        try:
            create_healthcare_interface_visualizations(lrgsr_results, phra_results)
        except Exception as e:
            print(f"⚠️ Visualization generation failed: {e}")
        
        # Print completion message
        print(f"\n{'='*80}")
        print("✅ HEALTHCARE PROVIDER INTERFACE TESTS COMPLETED SUCCESSFULLY")
        print(f"{'='*80}")
        print(f"\n📊 Final Results Summary:")
        print(f"   • Overall Pass Rate: {final_report['overall_performance']['pass_rate']:.2f}%")
        print(f"   • System Status: {final_report['overall_performance']['status']}")
        print(f"\n📁 All results saved to: {OUTPUT_DIR}/")
        print(f"   • Lab Request Results: {OUTPUT_DIR}/lab_request_generation_results.csv")
        print(f"   • Patient History Results: {OUTPUT_DIR}/patient_history_retrieval_results.csv")
        print(f"   • Metrics Summary: {OUTPUT_DIR}/metrics_summary.csv")
        print(f"   • Executive Summary: {OUTPUT_DIR}/healthcare_interface_executive_summary.json")
        print(f"   • Performance Chart: {OUTPUT_DIR}/healthcare_interface_visualization.png")
        
        print(f"\n📋 Documentation Tables Generated:")
        print(f"   • Table 3.1.4.2.1: Lab Request Generation Performance")
        print(f"   • Table 3.1.4.2.2: Patient History Retrieval Performance")
        print(f"   • Healthcare Provider Interface Metrics Summary")
        
        print(f"\n💡 Next Steps:")
        print(f"   1. Review metrics_summary.csv for detailed performance data")
        print(f"   2. Check performance visualization for charts")
        print(f"   3. Use data for research documentation")
        print(f"   4. Clean up test data from database if needed")
        
        if CLEANUP_AFTER_TEST:
            cleanup_healthcare_interface_test_data()
        
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
        print("CLICARE OBJECTIVE 2 - HEALTHCARE PROVIDER INTERFACE TESTING")
        print("="*80)
        print("\n📋 This comprehensive test suite will:")
        print("   ✓ Test Lab Request Generation Success Rate (LRGSR)")
        print("   ✓ Test Patient History Retrieval Accuracy (PHRA)")
        print("   ✓ Test data access time compliance (≤3 seconds)")
        print("   ✓ Generate comprehensive performance metrics")
        print("   ✓ Export all required tables and documentation")
        
        print(f"\n📊 Test Coverage:")
        print(f"   • Lab Request Generation: 50 test cases")
        print(f"   • Patient History Retrieval: 50 test cases")
        print(f"   • Various lab test types and priorities")
        print(f"   • Processing time measurements")
        print(f"   • Total: 100+ healthcare interface test cases")
        
        print(f"\n🎯 Target Metrics:")
        print(f"   • Lab Request Generation Success Rate (LRGSR): ≥98%")
        print(f"   • Patient History Retrieval Accuracy (PHRA): ≥99%")
        print(f"   • Data access time: ≤3 seconds")
        print(f"   • Processing time compliance")
        
        if CLEANUP_AFTER_TEST:
            print("\n⚠️  Note: Test data will be created in your database.")
            print("   Cleanup SQL will be provided after testing.")
        
        print("\n" + "="*80)
        input("Press ENTER to start healthcare provider interface testing (or Ctrl+C to cancel)...")
        
        # Run comprehensive tests
        final_report = run_comprehensive_healthcare_interface_tests()
        
        if final_report:
            print("\n" + "="*80)
            print("✅ HEALTHCARE PROVIDER INTERFACE TESTING COMPLETED SUCCESSFULLY")
            print("="*80)
            print(f"\n🎯 FINAL RESULTS:")
            print(f"   • Overall System Pass Rate: {final_report['overall_performance']['pass_rate']:.2f}%")
            print(f"   • Healthcare Interface Status: {final_report['healthcare_interface']['status']}")
            
            print(f"\n📁 Complete Documentation Package:")
            print(f"   • All test results: {OUTPUT_DIR}/")
            print(f"   • Performance metrics: All required tables generated")
            print(f"   • Visualizations: Charts and graphs included")
            
            print(f"\n💡 Research Documentation Ready:")
            print(f"   • Lab Request Generation: {OUTPUT_DIR}/lab_request_generation_results.csv")
            print(f"   • Patient History Retrieval: {OUTPUT_DIR}/patient_history_retrieval_results.csv")
            print(f"   • Metrics Summary: {OUTPUT_DIR}/metrics_summary.csv")
            print(f"   • Performance Chart: {OUTPUT_DIR}/healthcare_interface_visualization.png")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error during testing: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Common issues:")
        print("   • Ensure backend server is running (node server.js)")
        print("   • Check database connectivity")
        print("   • Verify API endpoints are accessible")
        print("   • Check staff credentials in TEST_STAFF_CREDENTIALS")
        print("   • Close any CSV files that might be open")