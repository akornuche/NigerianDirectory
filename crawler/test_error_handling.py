"""
Test the comprehensive error handling and retry system
"""

import sys
import os
import logging
import time

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from content_crawler_fixed import ContentCrawler
from retry_handler import retry_handler
from circuit_breaker import system_breakers
from error_reporter import error_reporter

def test_error_handling():
    """Test the integrated error handling system"""
    
    print("🧪 Testing Comprehensive Error Handling System")
    print("=" * 60)
    
    # Test 1: Retry Handler
    print("\n1️⃣ Testing Retry Handler")
    print("-" * 30)
    
    attempt_count = 0
    
    @retry_handler.with_retry(max_retries=3, context="test_function")
    def unreliable_function():
        nonlocal attempt_count
        attempt_count += 1
        print(f"   Attempt {attempt_count}")
        
        if attempt_count < 3:
            raise ConnectionError("Simulated failure")
        return f"Success after {attempt_count} attempts!"
    
    try:
        result = unreliable_function()
        print(f"✅ Result: {result}")
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    # Test 2: Circuit Breaker
    print("\n2️⃣ Testing Circuit Breaker")
    print("-" * 30)
    
    # Get network circuit breaker
    network_breaker = system_breakers.get_breaker('network')
    
    # Simulate multiple failures to open circuit
    for i in range(6):
        try:
            def failing_operation():
                raise ConnectionError("Network failure")
            
            network_breaker.call(failing_operation)
        except Exception as e:
            print(f"   Call {i+1}: {e}")
    
    # Check circuit state
    stats = network_breaker.get_stats()
    print(f"✅ Circuit state: {stats['current_state']}")
    
    # Test 3: Error Reporter
    print("\n3️⃣ Testing Error Reporter")
    print("-" * 30)
    
    # Record some test errors
    try:
        raise ValueError("Invalid data format")
    except Exception as e:
        error_id = error_reporter.record_error(
            e, 
            context="data_validation",
            school_name="Test School A",
            school_id=100
        )
        print(f"   Recorded error: {error_id}")
    
    try:
        raise ConnectionError("Network timeout")
    except Exception as e:
        error_id = error_reporter.record_error(
            e, 
            context="network_operation",
            school_name="Test School B", 
            school_id=101,
            url="https://test-school.edu.ng"
        )
        print(f"   Recorded error: {error_id}")
    
    # Generate error analysis
    analysis = error_reporter.get_error_analysis()
    print(f"✅ Errors recorded: {analysis['summary']['total_errors']}")
    print(f"   Categories: {analysis['categories']}")
    
    # Test 4: System Health
    print("\n4️⃣ Testing System Health")
    print("-" * 30)
    
    health = system_breakers.get_system_health()
    print(f"✅ Overall status: {health['overall_status']}")
    print(f"   Open circuits: {health['open_circuits']}")
    print(f"   Total failures: {health['total_failures']}")
    
    # Test 5: Recovery Recommendations
    print("\n5️⃣ Testing Recovery Recommendations")
    print("-" * 30)
    
    recommendations = error_reporter.get_recovery_recommendations()
    print("✅ Recommendations:")
    for i, rec in enumerate(recommendations[:3], 1):
        print(f"   {i}. {rec}")
    
    # Test 6: Enhanced Content Crawler
    print("\n6️⃣ Testing Enhanced Content Crawler")
    print("-" * 30)
    
    # Create crawler with error handling
    crawler = ContentCrawler()
    
    # Test with a school that might have issues
    test_school = {
        'id': 999,
        'name': 'Test Error School',
        'state': 'Lagos',
        'city': 'Lagos',
        'website': 'https://nonexistent-school-website-12345.com'  # This should fail
    }
    
    print(f"   Testing with problematic school: {test_school['name']}")
    
    # This should trigger various error handling mechanisms
    success = crawler.crawl_school_content(test_school)
    print(f"✅ Crawling result: {'Success' if success else 'Failed (expected)'}")
    
    # Final statistics
    print(f"\n📊 Final Statistics:")
    print(f"   Crawler stats: {crawler.stats}")
    
    retry_stats = retry_handler.get_session_stats()
    print(f"   Retry handler errors: {retry_stats['errors']['total_errors']}")
    
    print(f"\n🏥 Final System Health:")
    final_health = system_breakers.get_system_health()
    for component, status in final_health['components'].items():
        print(f"   {component}: {status['state']} (success rate: {status['success_rate']:.2f})")
    
    # Generate final error report
    print(f"\n📄 Error Report:")
    if error_reporter.session_errors:
        print(error_reporter.generate_report())
        
        # Save error report to file
        error_reporter.save_to_file()
        print(f"\n💾 Error report saved to: {error_reporter.log_file}")
    else:
        print("No errors recorded in this session")

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s:%(name)s:%(message)s'
    )
    
    test_error_handling()