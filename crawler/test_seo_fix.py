"""
Test SEO Optimizer Fix
=====================
Quick test to validate the list/string error is fixed.
"""

import sys
import os
import logging

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from seo_optimizer import SEOOptimizer

def test_seo_fix():
    """Test SEO optimizer with problematic data"""
    print("🎯 Testing SEO Optimizer Fix")
    print("=" * 30)
    
    # Suppress logs
    logging.basicConfig(level=logging.ERROR)
    
    try:
        seo = SEOOptimizer()
        
        # Test with problematic school data
        test_school = {
            'id': 1,
            'name': 'Abeokuta Grammar School',
            'city': 'Abeokuta',
            'state': 'Ogun',
            'website': ''
        }
        
        # Test content that might cause issues
        test_content = {
            'enriched_history': 'Founded in 1908, Abeokuta Grammar School is one of Nigeria\'s oldest secondary schools.',
            'enriched_academics': 'The school offers WAEC and JAMB preparation with subjects in science, arts, and commercial.',
            'enriched_campus_info': 'Located in Abeokuta with modern facilities including laboratories and library.',
            'enriched_student_life': 'Active student community with sports and academic competitions.'
        }
        
        print("⚡ Running SEO optimization...")
        
        # This should not throw the "sequence item" error
        seo_result = seo.optimize_content_for_seo(test_school, test_content)
        
        if seo_result and 'seo_score' in seo_result:
            print(f"✅ SEO optimization successful!")
            print(f"   Score: {seo_result['seo_score']:.1f}/100")
            print(f"   Keywords: {len(seo_result.get('keywords', {}).get('primary', []))} primary")
            print(f"   AI Descriptions: {len(seo_result.get('ai_descriptions', {}))}")
            print(f"   Structured Data: {seo_result.get('structured_data', {}).get('@type', 'None')}")
            return True
        else:
            print("❌ SEO optimization returned invalid data")
            return False
            
    except Exception as e:
        print(f"❌ SEO optimization failed: {e}")
        return False

if __name__ == "__main__":
    success = test_seo_fix()
    if success:
        print(f"\n🎉 SEO OPTIMIZER IS FIXED!")
    exit(0 if success else 1)