"""
Production Crawler for Nigerian Directory
========================================
Final production crawler to process all 192 schools at scale.
"""

import sys
import os
import json
import logging
import time
import signal
from datetime import datetime, timedelta
from threading import Event

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from content_crawler_fixed import ContentCrawler
from image_crawler_fixed import ImageCrawler
from database import db_manager
from error_reporter import error_reporter
from circuit_breaker import system_breakers

# Global flag for graceful shutdown
shutdown_event = Event()

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    print(f"\n🛑 Shutdown signal received (signal {signum})")
    shutdown_event.set()

def crawl_all_schools():
    """Crawl all schools in production mode"""
    
    print("🚀 NIGERIAN DIRECTORY PRODUCTION CRAWLER")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Set up optimized logging for production
    log_filename = f'production_crawl_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
    file_handler = logging.FileHandler(log_filename, mode='w', encoding='utf-8')
    file_handler.setLevel(logging.INFO)
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)
    fmt = logging.Formatter('%(asctime)s %(levelname)s:%(name)s:%(message)s')
    file_handler.setFormatter(fmt)
    stream_handler.setFormatter(fmt)
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers.clear()
    root_logger.addHandler(file_handler)
    root_logger.addHandler(stream_handler)
    print(f'📝 Logging to: {log_filename}', flush=True)
    
    logger = logging.getLogger('production_crawler')
    
    # Initialize crawlers
    try:
        content_crawler = ContentCrawler()
        image_crawler = ImageCrawler()
        logger.info("✅ Crawlers initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize crawlers: {e}")
        return False
    
    # Get all schools that need enrichment
    logger.info("📚 Loading schools from database...")
    
    try:
        all_schools = db_manager.get_schools_for_enrichment(limit=500)
        if not all_schools:
            logger.error("❌ No schools found in database")
            return False
        
        logger.info(f"✅ Loaded {len(all_schools)} schools for processing")
        
    except Exception as e:
        logger.error(f"❌ Error loading schools: {e}")
        return False
    
    # Production crawling with progress tracking
    results = {
        'total_schools': len(all_schools),
        'processed': 0,
        'successful_content': 0,
        'successful_images': 0,
        'failed': 0,
        'start_time': datetime.now(),
        'errors': []
    }
    
    logger.info(f"🔧 Starting production crawl of {results['total_schools']} schools...")
    
    # Process schools in batches with progress reporting
    batch_size = 10
    
    for i in range(0, len(all_schools), batch_size):
        # Check for shutdown signal
        if shutdown_event.is_set():
            logger.info("🛑 Graceful shutdown requested")
            break
        
        batch_schools = all_schools[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(all_schools) + batch_size - 1) // batch_size
        
        logger.info(f"📦 Processing Batch {batch_num}/{total_batches} ({len(batch_schools)} schools)")
        
        for school in batch_schools:
            if shutdown_event.is_set():
                break
                
            results['processed'] += 1
            
            school_start = time.time()
            school_success = process_single_school(content_crawler, image_crawler, school, results, logger)
            school_end = time.time()
            
            # Progress reporting
            progress = results['processed'] / results['total_schools'] * 100
            elapsed = datetime.now() - results['start_time']
            avg_time = elapsed.total_seconds() / results['processed']
            eta = results['start_time'] + timedelta(seconds=avg_time * results['total_schools'])
            
            if results['processed'] % 5 == 0:  # Report every 5 schools
                logger.info(f"📊 Progress: {results['processed']}/{results['total_schools']} "
                           f"({progress:.1f}%) - ETA: {eta.strftime('%H:%M:%S')}")
        
        # Batch completion
        logger.info(f"✅ Batch {batch_num} completed")
        
        # Health check and system status
        health = system_breakers.get_system_health()
        if health['open_circuits'] > 0:
            logger.warning(f"⚠️ System health check: {health['open_circuits']} open circuits")
        
        # Short pause between batches to be respectful
        if not shutdown_event.is_set() and i + batch_size < len(all_schools):
            time.sleep(2)
    
    # Final report
    generate_production_report(results, logger)
    
    return results['successful_content'] > 0

def process_single_school(content_crawler, image_crawler, school, results, logger):
    """Process a single school through the complete pipeline"""
    
    school_name = school['name']
    school_id = school['id']
    
    try:
        logger.debug(f"🔍 Processing: {school_name}")
        
        # Step 1: Content crawling (website + search + quality + SEO)
        content_success = content_crawler.crawl_school_content(school)
        
        if content_success:
            results['successful_content'] += 1
            logger.debug(f"✅ Content: {school_name}")
            
            # Step 2: Image discovery and processing
            try:
                images_result = image_crawler.discover_and_save_images(
                    school_id, school_name, school.get('website', '')
                )
                
                if images_result.get('success') and images_result.get('saved_images'):
                    results['successful_images'] += 1
                    logger.debug(f"🖼️ Images: {school_name} ({len(images_result['saved_images'])} found)")
                    
            except Exception as img_error:
                logger.debug(f"⚠️ Images failed for {school_name}: {img_error}")
            
            return True
            
        else:
            results['failed'] += 1
            logger.warning(f"❌ Failed: {school_name}")
            results['errors'].append({
                'school': school_name,
                'error': 'Content crawling failed'
            })
            return False
            
    except Exception as e:
        results['failed'] += 1
        error_msg = str(e)[:100]  # Truncate long errors
        logger.error(f"💥 Error processing {school_name}: {error_msg}")
        results['errors'].append({
            'school': school_name,
            'error': error_msg
        })
        return False

def generate_production_report(results, logger):
    """Generate comprehensive production crawl report"""
    
    end_time = datetime.now()
    total_time = end_time - results['start_time']
    
    logger.info("\n" + "=" * 60)
    logger.info("📊 PRODUCTION CRAWL COMPLETE")
    logger.info("=" * 60)
    
    # Overall statistics
    success_rate = results['successful_content'] / results['total_schools'] * 100 if results['total_schools'] > 0 else 0
    image_rate = results['successful_images'] / results['total_schools'] * 100 if results['total_schools'] > 0 else 0
    
    logger.info(f"📈 Overall Results:")
    logger.info(f"   Total Schools: {results['total_schools']}")
    logger.info(f"   Processed: {results['processed']}")
    logger.info(f"   Content Success: {results['successful_content']} ({success_rate:.1f}%)")
    logger.info(f"   Image Success: {results['successful_images']} ({image_rate:.1f}%)")
    logger.info(f"   Failed: {results['failed']}")
    
    # Performance metrics
    logger.info(f"\n⏱️ Performance:")
    logger.info(f"   Total Time: {total_time}")
    logger.info(f"   Average per School: {total_time.total_seconds() / results['processed']:.1f}s")
    
    # System health
    health = system_breakers.get_system_health()
    logger.info(f"\n🏥 Final System Health: {health['overall_status']}")
    
    # Error summary
    if results['errors']:
        logger.info(f"\n⚠️ Errors: {len(results['errors'])} total")
        # Group similar errors
        error_counts = {}
        for error in results['errors']:
            error_type = error['error']
            error_counts[error_type] = error_counts.get(error_type, 0) + 1
        
        for error_type, count in error_counts.items():
            logger.info(f"   • {error_type}: {count} schools")
    
    # Final assessment
    if success_rate >= 80:
        logger.info(f"\n🎯 SUCCESS: {success_rate:.1f}% success rate - Production deployment successful!")
    elif success_rate >= 60:
        logger.info(f"\n⚠️ PARTIAL SUCCESS: {success_rate:.1f}% success rate - Some issues to review")
    else:
        logger.info(f"\n❌ NEEDS ATTENTION: {success_rate:.1f}% success rate - Significant issues occurred")
    
    # Save detailed report
    save_production_report(results, end_time)

def save_production_report(results, end_time):
    """Save detailed production report to JSON file"""
    
    try:
        report_data = {
            'crawl_session': {
                'start_time': results['start_time'].isoformat(),
                'end_time': end_time.isoformat(),
                'duration_seconds': (end_time - results['start_time']).total_seconds()
            },
            'statistics': {
                'total_schools': results['total_schools'],
                'processed': results['processed'],
                'successful_content': results['successful_content'],
                'successful_images': results['successful_images'],
                'failed': results['failed'],
                'success_rate': results['successful_content'] / results['total_schools'] * 100,
                'image_rate': results['successful_images'] / results['total_schools'] * 100
            },
            'errors': results['errors'][:50],  # First 50 errors
            'system_health': system_breakers.get_system_health(),
            'error_statistics': error_reporter.get_session_statistics()
        }
        
        report_file = f"production_crawl_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"\n💾 Detailed report saved: {report_file}")
        
    except Exception as e:
        print(f"❌ Error saving report: {e}")

def main():
    """Main production crawler entry point"""
    
    try:
        success = crawl_all_schools()
        
        if success:
            print(f"\n🎉 PRODUCTION CRAWL COMPLETED SUCCESSFULLY!")
            exit(0)
        else:
            print(f"\n❌ PRODUCTION CRAWL COMPLETED WITH ISSUES!")
            exit(1)
            
    except KeyboardInterrupt:
        print(f"\n🛑 Production crawl interrupted by user")
        shutdown_event.set()
        exit(1)
    except Exception as e:
        print(f"\n💥 Production crawl crashed: {e}")
        exit(1)

if __name__ == "__main__":
    main()