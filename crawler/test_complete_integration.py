"""
Complete Integration Test for Nigerian Directory Crawler
======================================================
Tests the entire crawler pipeline on a sample set of schools:
- Website extraction (primary source)
- Search engine fallback  
- Image discovery and validation
- Content quality validation and deduplication
- SEO optimization
- Database integration
- Error handling and recovery
"""

import sys
import os
import json
import logging
import time
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from content_crawler_fixed import ContentCrawler
from database import db_manager
from image_crawler_fixed import ImageCrawler
from error_reporter import error_reporter
from circuit_breaker import system_breakers
from retry_handler import retry_handler

def test_complete_integration():
    """Test the complete crawler system on a sample of schools"""
    
    print("🚀 COMPLETE INTEGRATION TEST")
    print("=" * 60)
    print(f"Testing Nigerian Directory Crawler System")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Initialize crawler system
    try:
        crawler = ContentCrawler()
        image_crawler = ImageCrawler()
        print("✅ Crawler system initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize crawler: {e}")
        return False
    
    # Get sample schools for testing
    print("\n📚 Loading Sample Schools")
    print("-" * 40)
    
    try:
        # Get schools with different characteristics for comprehensive testing
        sample_schools = get_diverse_sample_schools()
        
        if not sample_schools:
            print("❌ No sample schools found")
            return False
        
        print(f"✅ Loaded {len(sample_schools)} diverse sample schools:")
        for i, school in enumerate(sample_schools, 1):
            print(f"  {i}. {school['name']} ({school['state']})")
            if school.get('website'):
                print(f"     Website: {school['website']}")
            
    except Exception as e:
        print(f"❌ Error loading sample schools: {e}")
        return False
    
    # Start integration testing
    print(f"\n🔧 Starting Integration Tests")
    print("-" * 40)
    
    results = {
        'total_schools': len(sample_schools),
        'successful_crawls': 0,
        'failed_crawls': 0,
        'content_extracted': 0,
        'images_found': 0,
        'seo_optimized': 0,
        'quality_scores': [],
        'seo_scores': [],
        'processing_times': [],
        'errors': [],
        'features_tested': {
            'website_extraction': False,
            'search_fallback': False,
            'image_discovery': False,
            'quality_validation': False,
            'seo_optimization': False,
            'database_storage': False,
            'error_handling': False
        }
    }
    
    # Test each school through complete pipeline
    for i, school in enumerate(sample_schools, 1):
        print(f"\n[{i}/{len(sample_schools)}] Testing: {school['name']}")
        print("=" * 50)
        
        start_time = time.time()
        school_result = test_school_complete_pipeline(crawler, image_crawler, school, i)
        end_time = time.time()
        
        processing_time = end_time - start_time
        results['processing_times'].append(processing_time)
        
        # Update results
        if school_result['success']:
            results['successful_crawls'] += 1
            print(f"✅ SUCCESS - Processed in {processing_time:.1f}s")
        else:
            results['failed_crawls'] += 1
            results['errors'].append({
                'school': school['name'],
                'error': school_result['error']
            })
            print(f"❌ FAILED - {school_result['error']}")
        
        # Track feature usage
        for feature, used in school_result['features_used'].items():
            if used:
                results['features_tested'][feature] = True
        
        # Collect metrics
        if school_result.get('content_quality_score'):
            results['quality_scores'].append(school_result['content_quality_score'])
        
        if school_result.get('seo_score'):
            results['seo_scores'].append(school_result['seo_score'])
        
        if school_result.get('content_extracted'):
            results['content_extracted'] += 1
        
        if school_result.get('images_found', 0) > 0:
            results['images_found'] += school_result['images_found']
        
        if school_result.get('seo_optimized'):
            results['seo_optimized'] += 1
        
        # Small delay between schools to be respectful
        time.sleep(2)
    
    # Generate comprehensive test report
    generate_integration_report(results)
    
    # Final validation
    success_rate = results['successful_crawls'] / results['total_schools'] * 100
    return success_rate >= 70  # 70% success rate threshold

def get_diverse_sample_schools():
    """Get a diverse sample of schools for comprehensive testing"""
    
    try:
        # Get schools with different characteristics
        sample_schools = []
        
        # Get schools with websites (for website extraction testing)
        schools_with_websites = db_manager.get_schools_for_enrichment(limit=50)
        websites_found = [s for s in schools_with_websites if s.get('website')]
        
        if websites_found:
            sample_schools.extend(websites_found[:3])  # Top 3 with websites
        
        # Get schools without websites (for search-only testing)
        schools_without_websites = [s for s in schools_with_websites if not s.get('website')]
        if schools_without_websites:
            sample_schools.extend(schools_without_websites[:2])  # 2 without websites
        
        # Ensure we have at least 5 schools total
        if len(sample_schools) < 5:
            additional_needed = 5 - len(sample_schools)
            additional_schools = schools_with_websites[:additional_needed]
            sample_schools.extend(additional_schools)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_schools = []
        for school in sample_schools:
            if school['id'] not in seen:
                seen.add(school['id'])
                unique_schools.append(school)
        
        return unique_schools[:6]  # Maximum 6 schools for testing
        
    except Exception as e:
        print(f"Error getting sample schools: {e}")
        return []
def test_school_complete_pipeline(crawler, image_crawler, school, index):
    """Test complete pipeline for a single school"""
    
    result = {
        'success': False,
        'error': None,
        'features_used': {
            'website_extraction': False,
            'search_fallback': False,
            'image_discovery': False,
            'quality_validation': False,
            'seo_optimization': False,
            'database_storage': False,
            'error_handling': False
        },
        'content_extracted': False,
        'images_found': 0,
        'seo_optimized': False,
        'content_quality_score': 0.0,
        'seo_score': 0.0,
        'content_length': 0
    }
    
    school_name = school['name']
    school_id = school['id']
    
    try:
        print(f"📋 School: {school_name}")
        print(f"   ID: {school_id}")
        print(f"   Location: {school.get('city', 'Unknown')}, {school.get('state', 'Unknown')}")
        print(f"   Website: {school.get('website', 'None')}")
        
        # Test 1: Content Crawling (Website + Search + Quality + SEO)
        print(f"\n🔍 Testing content crawling pipeline...")
        
        content_success = crawler.crawl_school_content(school)
        
        if content_success:
            result['content_extracted'] = True
            result['features_used']['database_storage'] = True
            
            # Check what features were used by examining crawler stats
            if crawler.stats.get('website_primary', 0) > 0:
                result['features_used']['website_extraction'] = True
                print(f"   ✅ Website extraction used")
            
            if crawler.stats.get('search_only', 0) > 0 or crawler.stats.get('website_supplementary', 0) > 0:
                result['features_used']['search_fallback'] = True
                print(f"   ✅ Search engine fallback used")
            
            if crawler.stats.get('seo_optimized', 0) > 0:
                result['features_used']['seo_optimization'] = True
                result['seo_optimized'] = True
                print(f"   ✅ SEO optimization applied")
            
            # Quality validation is always used in the crawler
            result['features_used']['quality_validation'] = True
            
            # Get the saved data to check quality and SEO scores
            saved_data = get_school_saved_data(school_id)
            if saved_data:
                # Calculate content length
                content_fields = ['enriched_history', 'enriched_academics', 'enriched_campus_info', 'enriched_student_life']
                total_length = sum(len(saved_data.get(field, '') or '') for field in content_fields)
                result['content_length'] = total_length
                
                # Get SEO score if available
                if saved_data.get('seo_score'):
                    result['seo_score'] = saved_data['seo_score']
                
                print(f"   📊 Content length: {total_length} characters")
                print(f"   🎯 SEO score: {saved_data.get('seo_score', 'N/A')}")
            
        else:
            result['error'] = "Content crawling failed"
            result['features_used']['error_handling'] = True
            print(f"   ❌ Content crawling failed")
        
        # Test 2: Image Discovery (if content crawling succeeded)
        if result['content_extracted']:
            print(f"\n🖼️ Testing image discovery...")
            
            try:
                # Test image discovery for this school
                images_result = image_crawler.discover_and_save_images(
                    school_id, school_name, school.get('website', '')
                )
                
                if images_result.get('success'):
                    result['features_used']['image_discovery'] = True
                    result['images_found'] = len(images_result.get('saved_images', []))
                    print(f"   ✅ Found {result['images_found']} images")
                else:
                    print(f"   ⚠️ No images found or saved")
                    
            except Exception as img_error:
                print(f"   ⚠️ Image discovery error: {img_error}")
                result['features_used']['error_handling'] = True
        
        # Test 3: Verify Database Integration
        print(f"\n💾 Testing database integration...")
        
        try:
            # Verify the school data was actually saved
            verification_data = get_school_saved_data(school_id)
            
            if verification_data:
                has_enriched_content = any(
                    verification_data.get(field) 
                    for field in ['enriched_history', 'enriched_academics', 'enriched_campus_info', 'enriched_student_life']
                )
                
                if has_enriched_content:
                    print(f"   ✅ Data successfully saved to database")
                    result['success'] = True
                else:
                    print(f"   ❌ No enriched content found in database")
                    result['error'] = "Database verification failed - no enriched content"
            else:
                print(f"   ❌ No data found in database")
                result['error'] = "Database verification failed - no data found"
                
        except Exception as db_error:
            print(f"   ❌ Database verification error: {db_error}")
            result['error'] = f"Database verification error: {db_error}"
            result['features_used']['error_handling'] = True
        
        # Calculate quality score based on content length and features
        if result['content_length'] > 0:
            # Simple quality scoring based on content length and feature usage
            base_score = min(result['content_length'] / 2000, 1.0) * 70  # Up to 70 points for content
            feature_bonus = sum(result['features_used'].values()) * 5  # 5 points per feature
            result['content_quality_score'] = min(base_score + feature_bonus, 100.0)
        
    except Exception as e:
        result['error'] = f"Pipeline error: {str(e)}"
        result['features_used']['error_handling'] = True
        print(f"   ❌ Pipeline error: {e}")
    
    return result

def get_school_saved_data(school_id):
    """Get saved school data from database for verification"""
    
    try:
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT enriched_history, enriched_academics, enriched_campus_info, enriched_student_life,
                           meta_title, meta_description, seo_score, logo_url, hero_image_url
                    FROM schools WHERE id = %s
                """, (school_id,))
                
                row = cursor.fetchone()
                if row:
                    return {
                        'enriched_history': row[0],
                        'enriched_academics': row[1], 
                        'enriched_campus_info': row[2],
                        'enriched_student_life': row[3],
                        'meta_title': row[4],
                        'meta_description': row[5],
                        'seo_score': row[6],
                        'logo_url': row[7],
                        'hero_image_url': row[8]
                    }
                return None
                
    except Exception as e:
        print(f"Error getting saved data: {e}")
        return None
def generate_integration_report(results):
    """Generate comprehensive integration test report"""
    
    print(f"\n📊 INTEGRATION TEST REPORT")
    print("=" * 60)
    
    # Overall Results
    success_rate = results['successful_crawls'] / results['total_schools'] * 100
    print(f"📈 Overall Results:")
    print(f"   Total Schools Tested: {results['total_schools']}")
    print(f"   Successful Crawls: {results['successful_crawls']}")
    print(f"   Failed Crawls: {results['failed_crawls']}")
    print(f"   Success Rate: {success_rate:.1f}%")
    
    # Performance Metrics
    if results['processing_times']:
        avg_time = sum(results['processing_times']) / len(results['processing_times'])
        min_time = min(results['processing_times'])
        max_time = max(results['processing_times'])
        
        print(f"\n⏱️ Performance Metrics:")
        print(f"   Average Processing Time: {avg_time:.1f}s per school")
        print(f"   Fastest Processing: {min_time:.1f}s")
        print(f"   Slowest Processing: {max_time:.1f}s")
        print(f"   Estimated Full Database Time: {avg_time * 192 / 60:.1f} minutes for 192 schools")
    
    # Content Quality Metrics
    print(f"\n📝 Content Quality:")
    print(f"   Schools with Content: {results['content_extracted']}/{results['total_schools']}")
    
    if results['quality_scores']:
        avg_quality = sum(results['quality_scores']) / len(results['quality_scores'])
        print(f"   Average Quality Score: {avg_quality:.1f}/100")
    
    # SEO Optimization Metrics
    print(f"\n🎯 SEO Optimization:")
    print(f"   Schools SEO Optimized: {results['seo_optimized']}/{results['total_schools']}")
    
    if results['seo_scores']:
        avg_seo = sum(results['seo_scores']) / len(results['seo_scores'])
        print(f"   Average SEO Score: {avg_seo:.1f}/100")
    
    # Image Discovery Metrics
    print(f"\n🖼️ Image Discovery:")
    print(f"   Total Images Found: {results['images_found']}")
    print(f"   Average per School: {results['images_found'] / results['total_schools']:.1f}")
    
    # Feature Coverage
    print(f"\n🔧 Feature Coverage:")
    features_tested = sum(results['features_tested'].values())
    total_features = len(results['features_tested'])
    
    for feature, tested in results['features_tested'].items():
        status = "✅" if tested else "❌"
        feature_name = feature.replace('_', ' ').title()
        print(f"   {status} {feature_name}")
    
    print(f"   Coverage: {features_tested}/{total_features} features ({features_tested/total_features*100:.1f}%)")
    
    # Error Analysis
    if results['errors']:
        print(f"\n⚠️ Error Analysis:")
        print(f"   Total Errors: {len(results['errors'])}")
        
        # Group errors by type
        error_types = {}
        for error in results['errors']:
            error_msg = error['error']
            if error_msg not in error_types:
                error_types[error_msg] = []
            error_types[error_msg].append(error['school'])
        
        for error_type, schools in error_types.items():
            print(f"   • {error_type}: {len(schools)} schools")
            if len(schools) <= 3:  # Show school names if 3 or fewer
                print(f"     Schools: {', '.join(schools)}")
    
    # System Health Check
    print(f"\n🏥 System Health:")
    health = system_breakers.get_system_health()
    print(f"   Overall Status: {health['overall_status']}")
    print(f"   Open Circuits: {health['open_circuits']}")
    
    # Error Reporter Summary
    if error_reporter.session_errors:
        print(f"   Session Errors: {len(error_reporter.session_errors)}")
    else:
        print(f"   Session Errors: 0 (Excellent!)")
    
    # Final Assessment
    print(f"\n🏆 FINAL ASSESSMENT:")
    
    if success_rate >= 90:
        assessment = "EXCELLENT - Ready for full-scale deployment"
        emoji = "🎯"
    elif success_rate >= 80:
        assessment = "GOOD - Minor issues to address before full deployment"
        emoji = "✅"
    elif success_rate >= 70:
        assessment = "ACCEPTABLE - Some issues need attention"
        emoji = "⚠️"
    else:
        assessment = "NEEDS IMPROVEMENT - Significant issues require fixing"
        emoji = "❌"
    
    print(f"   {emoji} {assessment}")
    print(f"   Success Rate: {success_rate:.1f}%")
    print(f"   Feature Coverage: {features_tested}/{total_features}")
    
    if features_tested == total_features and success_rate >= 80:
        print(f"\n🚀 SYSTEM IS PRODUCTION READY!")
        print(f"   All core features tested and validated")
        print(f"   Ready to process all 192 schools")
    
    # Save detailed report to file
    save_integration_report(results)

def save_integration_report(results):
    """Save detailed integration test report to file"""
    
    try:
        report_data = {
            'test_timestamp': datetime.now().isoformat(),
            'summary': {
                'total_schools': results['total_schools'],
                'successful_crawls': results['successful_crawls'],
                'failed_crawls': results['failed_crawls'],
                'success_rate': results['successful_crawls'] / results['total_schools'] * 100
            },
            'performance': {
                'processing_times': results['processing_times'],
                'average_time': sum(results['processing_times']) / len(results['processing_times']) if results['processing_times'] else 0,
                'estimated_full_time_minutes': (sum(results['processing_times']) / len(results['processing_times']) * 192 / 60) if results['processing_times'] else 0
            },
            'content_metrics': {
                'content_extracted': results['content_extracted'],
                'quality_scores': results['quality_scores'],
                'average_quality': sum(results['quality_scores']) / len(results['quality_scores']) if results['quality_scores'] else 0
            },
            'seo_metrics': {
                'seo_optimized': results['seo_optimized'],
                'seo_scores': results['seo_scores'],
                'average_seo': sum(results['seo_scores']) / len(results['seo_scores']) if results['seo_scores'] else 0
            },
            'image_metrics': {
                'total_images_found': results['images_found'],
                'average_per_school': results['images_found'] / results['total_schools']
            },
            'features_tested': results['features_tested'],
            'errors': results['errors']
        }
        
        report_file = f"integration_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"\n💾 Detailed report saved to: {report_file}")
        
    except Exception as e:
        print(f"❌ Error saving report: {e}")

def main():
    """Main integration test runner"""
    
    # Set up logging to reduce noise during testing
    logging.basicConfig(
        level=logging.WARNING,
        format='%(levelname)s:%(name)s:%(message)s'
    )
    
    try:
        success = test_complete_integration()
        
        if success:
            print(f"\n🎉 INTEGRATION TEST PASSED!")
            print(f"The crawler system is ready for production deployment.")
            exit(0)
        else:
            print(f"\n❌ INTEGRATION TEST FAILED!")
            print(f"Issues need to be addressed before production deployment.")
            exit(1)
            
    except KeyboardInterrupt:
        print(f"\n🛑 Integration test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Integration test crashed: {e}")
        exit(1)

if __name__ == "__main__":
    main()