"""
CliCare - Chatbot Performance Testing
python test3_chatbot.py
"""

import requests
import pandas as pd
import numpy as np
import json
import time
from datetime import datetime, timedelta
import os

# ============================================================================
# CONFIGURATION
# ============================================================================

API_BASE = "http://localhost:5000"
OUTPUT_DIR = "chatbot_test_results/performance"

# ⚠️ AGGRESSIVE RATE LIMITING CONFIGURATION
DELAY_BETWEEN_REQUESTS = 8  # seconds (7.5 requests per minute - SAFE)
MAX_REQUESTS_PER_MINUTE = 7  # Conservative limit (Gemini free tier: 15 RPM)
RETRY_ATTEMPTS = 3
EXPONENTIAL_BACKOFF_BASE = 45  # Start with 45s wait on rate limit

# Test credentials
TEST_ADMIN = {
    "healthadminid": "ADMIN001",
    "password": "admin123"
}

# Track requests for rate limiting
request_log = []

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_output_dir():
    """Create output directory"""
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    print(f"📁 Output directory: {OUTPUT_DIR}")

def print_header(title):
    """Print section header"""
    print("\n" + "="*80)
    print(title.center(80))
    print("="*80 + "\n")

def smart_rate_limit():
    """
    AGGRESSIVE rate limiting with multiple safety layers
    Prevents Gemini API quota exhaustion
    """
    global request_log
    
    now = datetime.now()
    
    # Remove requests older than 1 minute
    one_minute_ago = now - timedelta(minutes=1)
    request_log = [ts for ts in request_log if ts > one_minute_ago]
    
    # Check if we hit the limit
    if len(request_log) >= MAX_REQUESTS_PER_MINUTE:
        oldest = min(request_log)
        wait_time = 60 - (now - oldest).total_seconds()
        
        if wait_time > 0:
            print(f"⏳ Rate limit protection: Waiting {wait_time:.1f}s...", end=' ', flush=True)
            time.sleep(wait_time + 2)  # +2s safety buffer
            print("✓")
            request_log.clear()
    
    # Add current request timestamp
    request_log.append(now)
    
    # Mandatory delay between ALL requests
    print(f"⏱️  Rate limit delay: {DELAY_BETWEEN_REQUESTS}s...", end=' ', flush=True)
    time.sleep(DELAY_BETWEEN_REQUESTS)
    print("✓")

def make_request(endpoint, method="GET", data=None, headers=None, retry_count=0):
    """
    Make API request with rate limiting and retry logic
    """
    try:
        url = f"{API_BASE}/{endpoint}"
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=45)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=45)
        
        # Handle rate limit (429)
        if response.status_code == 429:
            if retry_count < RETRY_ATTEMPTS:
                wait_time = EXPONENTIAL_BACKOFF_BASE * (2 ** retry_count)
                print(f"\n🚨 Rate limit! Waiting {wait_time}s (Attempt {retry_count + 1}/{RETRY_ATTEMPTS})")
                time.sleep(wait_time)
                return make_request(endpoint, method, data, headers, retry_count + 1)
            else:
                print(f"\n❌ Rate limit exceeded after {RETRY_ATTEMPTS} attempts")
                return None
        
        # ✅ NEW: Handle 503 (Service Unavailable)
        if response.status_code == 503:
            if retry_count < RETRY_ATTEMPTS:
                wait_time = 10 * (retry_count + 1)  # 10s, 20s, 30s
                print(f"\n⚠️  AI overloaded (503). Waiting {wait_time}s (Attempt {retry_count + 1}/{RETRY_ATTEMPTS})")
                time.sleep(wait_time)
                return make_request(endpoint, method, data, headers, retry_count + 1)
            else:
                print(f"\n❌ AI service unavailable after {RETRY_ATTEMPTS} attempts")
                return None
        
        if response.status_code in [200, 201]:
            return response.json()
        else:
            print(f"\n⚠️  API Error: {response.status_code}")
            return None
            
    except requests.exceptions.Timeout:
        print(f"\n⚠️  Timeout")
        return None
    except Exception as e:
        print(f"\n⚠️  Error: {e}")
        return None
    
def authenticate():
    """Authenticate admin"""
    print("🔐 Authenticating...")
    
    result = make_request(
        "api/admin/login",
        method="POST",
        data=TEST_ADMIN
    )
    
    if result and result.get('success'):
        print(f"✅ Authenticated as: {result.get('admin', {}).get('name')}")
        return result.get('token')
    else:
        print("❌ Authentication failed")
        return None

# ============================================================================
# TEST QUERIES
# ============================================================================

def get_test_queries():
    """
    30 diverse test queries (reduced from 51 for rate limit safety)
    """
    return [
        # Simple queries (10)
        {"query": "How many patients visited today?", "category": "Basic Stats", "expected_keywords": ["patient", "today"]},
        {"query": "Show me today's appointments", "category": "Appointments", "expected_keywords": ["appointment", "today"]},
        {"query": "How many doctors are online?", "category": "Staff Info", "expected_keywords": ["doctor", "online", "consultant"]},
        {"query": "What is the busiest department?", "category": "Department", "expected_keywords": ["department", "busy"]},
        {"query": "Show current queue status", "category": "Queue", "expected_keywords": ["queue", "waiting"]},
        {"query": "What is today's patient count?", "category": "Basic Stats", "expected_keywords": ["patient", "count", "today"]},
        {"query": "How many lab tests today?", "category": "Lab Stats", "expected_keywords": ["lab", "test", "today"]},
        {"query": "What is the average wait time?", "category": "Wait Time", "expected_keywords": ["wait", "time", "average"]},
        {"query": "Show me active consultations", "category": "Consultations", "expected_keywords": ["consultation", "active"]},
        {"query": "Emergency department statistics", "category": "Department", "expected_keywords": ["emergency", "department"]},
        
        # Medium queries (10)
        {"query": "Show me fever trends this week", "category": "Health Trends", "expected_keywords": ["fever", "trend", "week"]},
        {"query": "What are the top 5 diagnoses?", "category": "Diagnosis", "expected_keywords": ["diagnosis", "top", "common"]},
        {"query": "Show patient demographics", "category": "Demographics", "expected_keywords": ["demographic", "age", "patient"]},
        {"query": "Which symptoms are most common?", "category": "Symptoms", "expected_keywords": ["symptom", "common"]},
        {"query": "Monthly appointment patterns", "category": "Trends", "expected_keywords": ["appointment", "pattern", "month"]},
        {"query": "Show me surgical cases", "category": "Surgery", "expected_keywords": ["surgery", "surgical", "case"]},
        {"query": "Pediatric patient trends", "category": "Pediatrics", "expected_keywords": ["pediatric", "children", "trend"]},
        {"query": "Department utilization rates", "category": "Utilization", "expected_keywords": ["department", "utilization"]},
        {"query": "Show me lab test results summary", "category": "Lab Analysis", "expected_keywords": ["lab", "result", "summary"]},
        {"query": "Maternity ward statistics", "category": "Maternity", "expected_keywords": ["maternity", "ward"]},
        
        # Complex queries (10)
        {"query": "Compare pediatric vs adult patients", "category": "Comparison", "expected_keywords": ["pediatric", "adult", "compare"]},
        {"query": "Analyze patient flow patterns by hour", "category": "Flow Analysis", "expected_keywords": ["patient", "flow", "hour"]},
        {"query": "What departments need more resources?", "category": "Resource Analysis", "expected_keywords": ["department", "resource"]},
        {"query": "Compare this month to last month", "category": "Temporal Comparison", "expected_keywords": ["month", "compare"]},
        {"query": "Identify bottlenecks in patient processing", "category": "Process Analysis", "expected_keywords": ["bottleneck", "patient"]},
        {"query": "Generate monthly performance report", "category": "Reporting", "expected_keywords": ["performance", "report", "month"]},
        {"query": "Analyze seasonal health patterns", "category": "Seasonal Analysis", "expected_keywords": ["seasonal", "pattern"]},
        {"query": "Cross-reference symptoms with age groups", "category": "Correlation", "expected_keywords": ["symptom", "age"]},
        {"query": "Predict tomorrow's patient volume", "category": "Prediction", "expected_keywords": ["predict", "patient", "volume"]},
        {"query": "Optimize department scheduling", "category": "Optimization", "expected_keywords": ["optimize", "schedule", "department"]},
    ]

# ============================================================================
# SIMPLIFIED EVALUATION
# ============================================================================

def evaluate_response(response, test_case):
    """
    SIMPLIFIED evaluation - no confusion matrix
    Just checks: Did it give a helpful response?
    """
    if response is None:
        return {
            'understood': False,
            'helpful': False,
            'relevant': False,
            'response_quality': 'Failed'
        }
    
    text = response.get('textResponse', '').lower()
    
    # Check 1: Did AI understand? (response length > 30 chars)
    understood = len(text) > 30
    
    # Check 2: Is it relevant? (contains expected keywords)
    expected_keywords = test_case.get('expected_keywords', [])
    relevant = any(keyword in text for keyword in expected_keywords)
    
    # Check 3: Is it helpful? (not a rejection)
    rejection_phrases = [
        'cannot provide', 'unable to', 'not available',
        'insufficient data', 'unclear request', 'invalid query'
    ]
    not_rejected = not any(phrase in text for phrase in rejection_phrases)
    helpful = understood and not_rejected
    
    # Overall quality
    if understood and relevant and helpful:
        quality = 'Excellent'
    elif understood and helpful:
        quality = 'Good'
    elif understood:
        quality = 'Poor'
    else:
        quality = 'Failed'
    
    return {
        'understood': understood,
        'helpful': helpful,
        'relevant': relevant,
        'response_quality': quality
    }

# ============================================================================
# MAIN TEST
# ============================================================================

def test_chatbot_performance(token):
    """
    Test chatbot performance with aggressive rate limiting
    """
    print_header("CHATBOT PERFORMANCE TESTING")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get hospital data for context
    print("📊 Fetching hospital data...")
    dashboard = make_request("api/admin/dashboard-stats", headers=headers)
    
    if not dashboard:
        print("❌ Cannot get hospital data")
        return None
    
    print(f"✅ Hospital data loaded")
    
    # Get test queries
    queries = get_test_queries()
    total = len(queries)
    
    print(f"\n🤖 Testing {total} queries with AGGRESSIVE rate limiting")
    print(f"⏱️  Estimated time: ~{(total * DELAY_BETWEEN_REQUESTS) / 60:.1f} minutes")
    print(f"🛡️  Rate limit: {MAX_REQUESTS_PER_MINUTE} requests/minute")
    print(f"⏳ Delay per request: {DELAY_BETWEEN_REQUESTS}s")
    print(f"🔄 Retry attempts: {RETRY_ATTEMPTS}\n")
    
    input("Press ENTER to start testing (this will take a while)...")
    
    results = []
    response_times = []
    
    for idx, test_case in enumerate(queries, 1):
        print(f"\n[{idx}/{total}] {test_case['query'][:50]}...")
        
        # APPLY RATE LIMITING BEFORE REQUEST
        smart_rate_limit()
        
        # Make request
        start = time.time()
        
        ai_response = make_request(
            "api/admin/analyze-data",
            method="POST",
            data={
                "query": test_case['query'],
                "hospitalData": dashboard.get('stats', {})
            },
            headers=headers
        )
        
        response_time = (time.time() - start) * 1000
        response_times.append(response_time)
        
        # Evaluate response
        evaluation = evaluate_response(ai_response, test_case)
        
        # Print result
        if evaluation['response_quality'] == 'Excellent':
            print(f"✅ Excellent ({response_time:.0f}ms)")
        elif evaluation['response_quality'] == 'Good':
            print(f"✅ Good ({response_time:.0f}ms)")
        elif evaluation['response_quality'] == 'Poor':
            print(f"⚠️  Poor ({response_time:.0f}ms)")
        else:
            print(f"❌ Failed ({response_time:.0f}ms)")
        
        # Store result
        results.append({
            'test_case': idx,
            'query': test_case['query'],
            'category': test_case['category'],
            'understood': evaluation['understood'],
            'helpful': evaluation['helpful'],
            'relevant': evaluation['relevant'],
            'response_quality': evaluation['response_quality'],
            'response_time_ms': response_time,
            'under_5s': response_time <= 5000
        })
    
    # Calculate metrics
    df = pd.DataFrame(results)
    
    helpful_count = df['helpful'].sum()
    understood_count = df['understood'].sum()
    under_5s_count = df['under_5s'].sum()
    
    qra = (helpful_count / total * 100)
    nlur = (understood_count / total * 100)
    avg_time = np.mean(response_times)
    time_compliance = (under_5s_count / total * 100)
    
    # Print results
    print_header("PERFORMANCE TEST RESULTS")
    
    print(f"Total Queries: {total}")
    print(f"Understood: {understood_count}")
    print(f"Helpful Responses: {helpful_count}")
    print(f"Under 5 seconds: {under_5s_count}")
    
    print(f"\n📊 QUERY RESPONSE ACCURACY (QRA):")
    print(f"   Formula: (Helpful Responses / Total) × 100")
    print(f"   Result: {qra:.2f}%")
    print(f"   Target: ≥85%")
    print(f"   Status: {'✅ PASS' if qra >= 85 else '❌ FAIL'}")
    
    print(f"\n📊 NATURAL LANGUAGE UNDERSTANDING (NLUR):")
    print(f"   Formula: (Understood / Total) × 100")
    print(f"   Result: {nlur:.2f}%")
    print(f"   Target: ≥90%")
    print(f"   Status: {'✅ PASS' if nlur >= 90 else '❌ FAIL'}")
    
    print(f"\n⏱️  RESPONSE TIME:")
    print(f"   Average: {avg_time:.2f}ms")
    print(f"   Compliance: {time_compliance:.2f}%")
    print(f"   Target: ≤5000ms")
    print(f"   Status: {'✅ PASS' if avg_time <= 5000 else '❌ FAIL'}")
    
    # Export results
    df.to_csv(f"{OUTPUT_DIR}/performance_results.csv", index=False)
    
    # Summary by category
    category_summary = df.groupby('category').agg({
        'helpful': 'mean',
        'understood': 'mean',
        'response_time_ms': 'mean'
    }).reset_index()
    category_summary.columns = ['Category', 'Helpful_Rate', 'Understanding_Rate', 'Avg_Response_Time']
    category_summary['Helpful_Rate'] *= 100
    category_summary['Understanding_Rate'] *= 100
    category_summary.to_csv(f"{OUTPUT_DIR}/category_summary.csv", index=False)
    
    # Save summary
    summary = {
        'test_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'total_queries': total,
        'qra': qra,
        'nlur': nlur,
        'avg_response_time_ms': avg_time,
        'time_compliance': time_compliance,
        'status': 'PASS' if (qra >= 85 and nlur >= 90 and avg_time <= 5000) else 'FAIL'
    }
    
    with open(f"{OUTPUT_DIR}/summary.json", 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n✅ Results saved to: {OUTPUT_DIR}/")
    
    return summary

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    print_header("CLICARE - CHATBOT PERFORMANCE TESTING")
    print("🎯 Tests: Response Quality, Speed, Understanding")
    print("🛡️  WITH AGGRESSIVE RATE LIMITING")
    print(f"\n⚠️  This will take ~{(len(get_test_queries()) * DELAY_BETWEEN_REQUESTS) / 60:.1f} minutes")
    print("⚠️  DO NOT interrupt the test - it's designed to prevent rate limits")
    
    create_output_dir()
    
    # Authenticate
    token = authenticate()
    if not token:
        print("\n❌ Cannot proceed without authentication")
        exit(1)
    
    # Run test
    try:
        result = test_chatbot_performance(token)
        
        if result:
            print_header("TEST COMPLETED")
            print(f"✅ Overall Status: {result['status']}")
            print(f"📁 Results: {OUTPUT_DIR}/")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()