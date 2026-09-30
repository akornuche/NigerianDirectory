"""
Fixed Content Crawler for Nigerian Schools
==========================================
Uses website extraction as primary source, then falls back to search engines.
Integrates with the new search engine and database modules.
"""

import os
import re
import json
import time
import random
import logging
from datetime import datetime
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import requests
from typing import Dict, List, Optional, Tuple, Any

# Import our fixed modules
from search_engines import search_web, get_search_stats
from database import db_manager
from website_extractor import WebsiteExtractor
from retry_handler import retry_handler, retry_on_network_error
from circuit_breaker import system_breakers, with_circuit_breaker
from error_reporter import error_reporter
from content_quality import ContentQualityManager
from seo_optimizer import SEOOptimizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('content_crawler.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ContentCrawler:
    """
    Crawls web content for Nigerian schools using multiple sources
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        
        # Initialize website extractor
        self.website_extractor = WebsiteExtractor()
        
        # Initialize content quality manager
        self.quality_manager = ContentQualityManager()
        
        # Initialize SEO optimizer
        self.seo_optimizer = SEOOptimizer()
        
        self.stats = {
            'total_processed': 0,
            'enriched': 0,
            'failed': 0,
            'insufficient_data': 0,
            'website_primary': 0,
            'website_supplementary': 0,
            'search_only': 0,
            'quality_rejected': 0,
            'quality_review': 0,
            'duplicate_rejected': 0,
            'seo_optimized': 0
        }
        
        # Content quality thresholds
        self.min_content_length = 100
        self.min_sources = 2
        
        # Nigerian education keywords for content validation
        self.education_keywords = [
            'school', 'education', 'student', 'academic', 'curriculum', 
            'examination', 'waec', 'jamb', 'neco', 'primary', 'secondary',
            'university', 'college', 'diploma', 'degree', 'nigeria', 'nigerian'
        ]
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common unwanted patterns
        text = re.sub(r'(cookie|privacy policy|terms|subscribe|newsletter)', '', text, flags=re.IGNORECASE)
        
        # Ensure proper sentence endings
        text = re.sub(r'([.!?])\s*([A-Z])', r'\1 \2', text)
        
        return text
    
    def extract_website_content(self, url: str) -> Dict[str, str]:
        """Extract content directly from school website"""
        content = {
            'history': '',
            'academics': '',
            'campus': '',
            'student_life': '',
            'facilities': [],
            'achievements': []
        }
        
        try:
            response = self.session.get(url, timeout=15)
            if response.status_code != 200:
                return content
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove unwanted elements
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'menu']):
                tag.decompose()
            
            # Find main content area
            main_content = (
                soup.find('main') or 
                soup.find('article') or 
                soup.find(class_=re.compile(r'content|main|body', re.I)) or
                soup.find('body')
            )
            
            if not main_content:
                return content
            
            # Extract different types of content
            text = main_content.get_text(separator=' ', strip=True)
            text = self.clean_text(text)
            
            # Categorize content based on keywords
            if any(keyword in text.lower() for keyword in ['history', 'founded', 'established', 'began']):
                content['history'] = text[:500]
            
            if any(keyword in text.lower() for keyword in ['academic', 'curriculum', 'program', 'subject']):
                content['academics'] = text[:500]
            
            if any(keyword in text.lower() for keyword in ['campus', 'facility', 'building', 'infrastructure']):
                content['campus'] = text[:500]
            
            if any(keyword in text.lower() for keyword in ['student', 'club', 'activity', 'sport']):
                content['student_life'] = text[:500]
            
            logger.info(f"✅ Website content extracted from {url}")
            self.stats['website_crawled'] += 1
            
        except Exception as e:
            logger.error(f"❌ Error extracting from website {url}: {e}")
        
        return content
    
    def search_for_school_content(self, school_name: str, state: str, city: str = None) -> List[Dict[str, Any]]:
        """Search for school content across multiple engines"""
        search_results = []
        
        # Create search queries
        queries = [
            f'"{school_name}" {state} Nigeria school history',
            f'"{school_name}" Nigeria academic programs',
            f'"{school_name}" {state} facilities campus',
            f'"{school_name}" Nigeria achievements awards',
            f'{school_name} {city or state} school information'
        ]
        
        for query in queries:
            try:
                logger.info(f"🔍 Searching: {query}")
                results = search_web(query, max_results=5)
                
                for result in results:
                    if result.confidence > 0.6:  # Only high-confidence results
                        search_results.append({
                            'title': result.title,
                            'url': result.url,
                            'snippet': result.snippet,
                            'confidence': result.confidence,
                            'source': result.source,
                            'query': query
                        })
                
                # Rate limiting between queries
                time.sleep(random.uniform(1.0, 2.0))
                
            except Exception as e:
                logger.error(f"❌ Search error for query '{query}': {e}")
        
        # Sort by confidence and deduplicate
        unique_results = {}
        for result in search_results:
            url = result['url']
            if url not in unique_results or result['confidence'] > unique_results[url]['confidence']:
                unique_results[url] = result
        

        return list(unique_results.values())
    
    def extract_content_from_search_results(self, search_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract content from search result pages"""
        extracted_content = {
            'history': [],
            'academics': [],
            'campus': [],
            'student_life': [],
            'sources': []
        }
        
        for result in search_results[:10]:  # Limit to top 10 results
            try:
                url = result['url']
                logger.info(f"📄 Extracting content from: {url}")
                
                response = self.session.get(url, timeout=10)
                if response.status_code != 200:
                    continue
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Remove unwanted elements
                for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                    tag.decompose()
                
                # Get main content — try semantic elements first, fall back to body
                main_content = (soup.find('main') or soup.find('article') or
                                soup.find(id=re.compile(r'content|main|article', re.I)) or
                                soup.find(class_=re.compile(r'content|main|article|entry', re.I)) or
                                soup.find('body'))
                if not main_content:
                    continue
                
                # Extract ALL substantial paragraphs (no class filter — most pages don't use those classes)
                all_paragraphs = []
                for p in main_content.find_all('p'):
                    text = p.get_text(separator=' ', strip=True)
                    # Filter out very short paragraphs and coordinate/metadata noise
                    if len(text) > 60 and not text.startswith('Coordinates:') and '°' not in text[:30]:
                        all_paragraphs.append(text)
                
                if not all_paragraphs:
                    continue
                
                # Assign paragraphs to sections by keyword relevance
                history_kw = ['history', 'founded', 'established', 'inaugurated', 'origin', 'began', 'colonial', 'missionary', 'years ago', 'century', 'tradition']
                academic_kw = ['academic', 'curriculum', 'program', 'subject', 'science', 'arts', 'waec', 'neco', 'jamb', 'result', 'department', 'course', 'teacher', 'learning', 'education']
                campus_kw = ['campus', 'facility', 'facilities', 'laboratory', 'library', 'hostel', 'dormitory', 'building', 'field', 'hall', 'block', 'classroom', 'infrastructure']
                life_kw = ['student', 'club', 'society', 'sport', 'activity', 'activities', 'extracurricular', 'debate', 'cultural', 'fellowship', 'scout', 'cadet', 'house']
                
                for para in all_paragraphs:
                    para_lower = para.lower()
                    score = {
                        'history': sum(1 for k in history_kw if k in para_lower),
                        'academics': sum(1 for k in academic_kw if k in para_lower),
                        'campus': sum(1 for k in campus_kw if k in para_lower),
                        'student_life': sum(1 for k in life_kw if k in para_lower),
                    }
                    best = max(score, key=score.get)
                    if score[best] > 0:
                        current = ' '.join(extracted_content[best])
                        if len(current) < 800:
                            extracted_content[best].append(para[:400])
                    else:
                        # Generic school content — put in history as overview
                        if 'school' in para_lower or 'college' in para_lower:
                            if len(' '.join(extracted_content['history'])) < 800:
                                extracted_content['history'].append(para[:400])
                
                # Add source
                extracted_content['sources'].append({
                    'url': url,
                    'title': result['title'],
                    'type': 'web_search',
                    'confidence': result['confidence'],
                    'accessed_at': datetime.now().isoformat()
                })
                
                time.sleep(random.uniform(0.5, 1.0))  # Rate limiting
                
            except Exception as e:
                logger.error(f"❌ Error extracting from {result['url']}: {e}")
        
        return extracted_content
    
    def synthesize_content(self, website_content: Dict[str, str], 
                          search_content: Dict[str, Any], 
                          school_name: str) -> Dict[str, Any]:
        """Synthesize content from multiple sources"""
        synthesized = {
            'enriched_history': '',
            'enriched_academics': '',
            'enriched_campus_info': '',
            'enriched_student_life': '',
            'content_sources': search_content.get('sources', [])
        }
        
        # Combine history content
        history_parts = []
        if website_content.get('history'):
            history_parts.append(website_content['history'])
        if search_content.get('history'):
            history_parts.extend(search_content['history'][:2])  # Max 2 search results
        
        if history_parts:
            synthesized['enriched_history'] = f"{school_name} has a rich educational heritage. " + " ".join(history_parts)
        
        # Combine academic content
        academic_parts = []
        if website_content.get('academics'):
            academic_parts.append(website_content['academics'])
        if search_content.get('academics'):
            academic_parts.extend(search_content['academics'][:2])
        
        if academic_parts:
            synthesized['enriched_academics'] = f"Academic programs at {school_name} include: " + " ".join(academic_parts)
        
        # Combine campus content
        campus_parts = []
        if website_content.get('campus'):
            campus_parts.append(website_content['campus'])
        if search_content.get('campus'):
            campus_parts.extend(search_content['campus'][:2])
        
        if campus_parts:
            synthesized['enriched_campus_info'] = f"The {school_name} campus features: " + " ".join(campus_parts)
        
        # Combine student life content
        life_parts = []
        if website_content.get('student_life'):
            life_parts.append(website_content['student_life'])
        if search_content.get('student_life'):
            life_parts.extend(search_content['student_life'][:2])
        
        if life_parts:
            synthesized['enriched_student_life'] = f"Student life at {school_name} encompasses: " + " ".join(life_parts)
        
        return synthesized
    
    def evaluate_content_quality(self, content: Dict[str, Any]) -> float:
        """
        Evaluate the quality of extracted content (0-1 score)
        """
        if not content:
            return 0.0
        
        score = 0.0
        
        # Content length scoring
        for field in ['enriched_history', 'enriched_academics', 'enriched_campus_info', 'enriched_student_life']:
            field_content = content.get(field, '')
            if field_content:
                length = len(field_content)
                if length > 300:
                    score += 0.2
                elif length > 150:
                    score += 0.1
                elif length > 50:
                    score += 0.05
        
        # Source quality scoring
        sources = content.get('content_sources', [])
        if sources:
            official_sources = sum(1 for s in sources if s.get('type') == 'official_website')
            score += min(0.2, official_sources * 0.1)
        
        # Key facts bonus
        facts = content.get('key_facts', {})
        if facts:
            score += min(0.1, len(facts) * 0.02)
        
        return min(1.0, score)
    
    def _log_progress_health(self, current: int, total: int):
        """Log progress and system health periodically"""
        logger.info(f"📊 Progress: {current}/{total} ({current/total*100:.1f}%)")
        
        # System health
        health = system_breakers.get_system_health()
        logger.info(f"🏥 System Health: {health['overall_status']} "
                   f"(Open circuits: {health['open_circuits']})")
        
        # Error summary
        if error_reporter.session_errors:
            recent_errors = len([e for e in error_reporter.session_errors 
                               if (datetime.now() - datetime.fromisoformat(e['timestamp'])).seconds < 600])
            logger.info(f"⚠️ Recent errors (10min): {recent_errors}")
            
            if recent_errors > 5:
                recommendations = error_reporter.get_recovery_recommendations()
                logger.warning("💡 Recommendations:")
                for rec in recommendations[:2]:  # Show top 2 recommendations
                    logger.warning(f"   {rec}")
        
        # Performance stats
        if hasattr(self, 'stats'):
            success_rate = self.stats['enriched'] / max(1, self.stats['total_processed'])
            logger.info(f"📈 Success Rate: {success_rate*100:.1f}% "
                       f"({self.stats['enriched']}/{self.stats['total_processed']})")
    
    
    def synthesize_multi_source_content(self, website_content: Dict[str, Any], 
                                      search_content: Dict[str, Any], 
                                      school_name: str) -> Dict[str, Any]:
        """
        Synthesize content from website (priority) and search sources
        """
        synthesized = {
            'enriched_history': '',
            'enriched_academics': '',
            'enriched_campus_info': '',
            'enriched_student_life': '',
            'content_sources': []
        }
        
        # Prioritize website content, supplement with search content
        for field in ['enriched_history', 'enriched_academics', 'enriched_campus_info', 'enriched_student_life']:
            content_parts = []
            
            # Add website content first (highest priority)
            website_field = website_content.get(field, '')
            if website_field:
                content_parts.append(website_field)
            
            # Add search content if website content is insufficient
            if len(website_field) < 200:  # Threshold for supplementation
                search_field = self.get_search_content_for_field(field, search_content)
                if search_field:
                    content_parts.append(search_field)
            
            # Combine content
            if content_parts:
                synthesized[field] = ' '.join(content_parts)[:800]  # Limit total length
        
        # Combine sources
        synthesized['content_sources'] = website_content.get('content_sources', [])
        synthesized['content_sources'].extend(search_content.get('sources', []))
        
        return synthesized
    
    def get_search_content_for_field(self, field: str, search_content: Dict[str, Any]) -> str:
        """
        Get search content appropriate for a specific field, joining all found paragraphs
        """
        field_mapping = {
            'enriched_history': ['history'],
            'enriched_academics': ['academics'],
            'enriched_campus_info': ['campus'],
            'enriched_student_life': ['student_life']
        }
        
        search_keys = field_mapping.get(field, [])
        
        for key in search_keys:
            content_list = search_content.get(key, [])
            if content_list:
                # Join all paragraphs for richer content, up to 800 chars
                combined = ' '.join(p for p in content_list if isinstance(p, str))
                return combined[:800]
        
        return ""
    
    def validate_content_quality(self, content: Dict[str, Any]) -> bool:
        """
        Validate that the final content meets minimum quality standards
        """
        if not content:
            return False
        
        # Check for minimum content in at least 2 categories
        content_categories = [
            content.get('enriched_history', ''),
            content.get('enriched_academics', ''),
            content.get('enriched_campus_info', ''),
            content.get('enriched_student_life', '')
        ]
        
        substantial_content = sum(1 for cat in content_categories if len(cat) > 100)
        
        # Must have substantial content in at least 2 categories
        return substantial_content >= 2
    
    @with_circuit_breaker('network')
    def crawl_school_content(self, school: Dict[str, Any]) -> bool:
        """
        Crawl and save content for a single school
        Uses website extraction as primary source, search engines as fallback
        """
        school_id = school['id']
        school_name = school['name']
        state = school['state']
        city = school.get('city', '')
        website = school.get('website')
        
        logger.info(f"🔍 Processing: {school_name} ({state})")
        
        try:
            final_content = {
                'enriched_history': '',
                'enriched_academics': '',
                'enriched_campus_info': '',
                'enriched_student_life': '',
                'content_sources': []
            }
            
            website_content = {}
            search_content = {}
            
            # Step 1: Extract from school website if available (PRIMARY SOURCE)
            if website:
                logger.info(f"🌐 Extracting from website: {website}")
                website_result = self.website_extractor.extract_school_website(school_name, website)
                
                if website_result['success']:
                    website_content = website_result['content']
                    logger.info(f"✅ Website extraction successful - {website_result['pages_processed']} pages")
                    self.stats['website_primary'] += 1
                else:
                    logger.warning(f"❌ Website extraction failed: {website_result.get('error')}")
            
            # Step 2: Evaluate if we need search engine supplementation
            website_quality = self.evaluate_content_quality(website_content)
            need_search_supplementation = (
                not website or 
                website_quality < 0.7 or  # Website content quality threshold
                len(website_content.get('enriched_history', '')) < 200 or
                len(website_content.get('enriched_academics', '')) < 200
            )
            
            # Step 3: Search for additional content if needed (FALLBACK SOURCE)
            if need_search_supplementation:
                logger.info(f"🔎 Supplementing with search engine content")
                search_results = self.search_for_school_content(school_name, state, city)
                
                if search_results:
                    search_content = self.extract_content_from_search_results(search_results)
                    logger.info(f"🔍 Search supplementation: {len(search_content.get('sources', []))} sources")
                    
                    if website:
                        self.stats['website_supplementary'] += 1
                    else:
                        self.stats['search_only'] += 1
            
            # Step 4: Synthesize content from both sources (website prioritized)
            final_content = self.synthesize_multi_source_content(
                website_content, search_content, school_name
            )
            
            # Step 5: Validate content quality and check for duplicates
            logger.info(f"🔍 Validating content quality for {school_name}")
            quality_result = self.quality_manager.process_school_content(school_id, final_content)
            
            if quality_result['action'] == 'reject':
                if quality_result['duplicate_issues']:
                    logger.warning(f"❌ Content rejected due to duplicates: {school_name}")
                    self.stats['duplicate_rejected'] += 1
                else:
                    logger.warning(f"❌ Content rejected due to low quality: {school_name}")
                    self.stats['quality_rejected'] += 1
                return False
            
            elif quality_result['action'] == 'review':
                logger.warning(f"⚠️ Content needs review: {school_name} (Score: {quality_result['overall_quality_score']:.2f})")
                self.stats['quality_review'] += 1
                
                # For now, we'll still save content that needs review but log it
                if quality_result['recommendations']:
                    logger.info(f"💡 Quality recommendations for {school_name}:")
                    for rec in quality_result['recommendations'][:3]:
                        logger.info(f"   • {rec}")
            
            # Step 6: Validate final content meets minimum standards
            if not self.validate_content_quality(final_content):
                logger.warning(f"❌ Final content quality insufficient for {school_name}")
                self.stats['insufficient_data'] += 1
                return False
            
            # Step 7: Generate SEO optimization
            logger.info(f"🎯 Generating SEO optimization for {school_name}")
            seo_data = self.seo_optimizer.optimize_content_for_seo(school, final_content)
            
            logger.info(f"📊 SEO Score: {seo_data['seo_score']:.1f}/100")
            if seo_data['seo_score'] >= 80:
                logger.info(f"✅ Excellent SEO optimization achieved")
            elif seo_data['seo_score'] >= 60:
                logger.info(f"⚠️ Good SEO optimization, some improvements possible")
            else:
                logger.warning(f"❌ SEO optimization needs improvement")
            
            # Add SEO data to final content for database storage
            # NOTE: frontend reads meta_title / meta_description (not seo_title / seo_meta_description)
            final_content.update({
                'meta_title': seo_data['titles'].get('main', ''),
                'meta_description': seo_data['meta_description'],
                'seo_keywords': ','.join(seo_data['keywords'].get('primary', [])[:10]),
                'seo_structured_data': json.dumps(seo_data['structured_data']),
                'seo_url_slug': seo_data['url_slug'],
                'seo_score': seo_data['seo_score']
            })
            
            self.stats['seo_optimized'] += 1
            
            # Step 8: Save to database
            logger.info(f"💾 Saving enriched content for {school_name}")
            success = db_manager.update_school_enrichment(school_id, final_content)
            
            if success:
                logger.info(f"✅ Successfully enriched: {school_name}")
                self.stats['enriched'] += 1
                return True
            else:
                logger.error(f"❌ Failed to save content for {school_name}")
                self.stats['failed'] += 1
                return False
        
        except Exception as e:
            error_id = error_reporter.record_error(
                e, 
                context="content_crawler",
                school_name=school_name,
                school_id=school_id,
                additional_data={
                    'state': state,
                    'city': city,
                    'website': website,
                    'processing_step': 'unknown'
                }
            )
            logger.error(f"❌ Error processing {school_name} (ID: {error_id}): {e}")
            self.stats['failed'] += 1
            return False
        
        finally:
            self.stats['total_processed'] += 1
    
    def run_batch_crawl(self, limit: int = None, offset: int = 0) -> Dict[str, int]:
        """
        Run content crawling for multiple schools
        """
        logger.info("🚀 Starting content crawler")
        logger.info("=" * 60)
        
        # Get schools needing enrichment
        schools = db_manager.get_schools_for_enrichment(limit=limit or 50, offset=offset)
        
        if not schools:
            logger.info("✅ No schools need enrichment!")
            return self.stats
        
        logger.info(f"📊 Found {len(schools)} schools needing enrichment")
        
        for i, school in enumerate(schools, 1):
            logger.info(f"\n[{i}/{len(schools)}] Processing school...")
            
            try:
                # Check system health before processing
                health = system_breakers.get_system_health()
                if health['overall_status'] == 'critical':
                    logger.error("🚨 System health critical - stopping crawler")
                    error_reporter.record_error(
                        Exception("System health critical"), 
                        context="system_health_check",
                        additional_data=health
                    )
                    break
                
                success = self.crawl_school_content(school)
                
                # Adaptive rate limiting based on success/failure
                if success:
                    delay = random.uniform(2.0, 4.0)
                    self.stats['last_success_time'] = time.time()
                else:
                    # Increase delay after failures
                    delay = random.uniform(3.0, 6.0)
                    consecutive_failures = getattr(self, 'consecutive_failures', 0) + 1
                    
                    if consecutive_failures > 5:
                        logger.warning(f"⚠️ {consecutive_failures} consecutive failures - increasing delays")
                        delay = min(delay * 1.5, 30.0)  # Cap at 30 seconds
                    
                    setattr(self, 'consecutive_failures', consecutive_failures)
                
                # Reset consecutive failures on success
                if success:
                    setattr(self, 'consecutive_failures', 0)
                
                time.sleep(delay)
                
                # Periodic health check and error reporting
                if i % 10 == 0:  # Every 10 schools
                    self._log_progress_health(i, len(schools))
                    
            except KeyboardInterrupt:
                logger.info("🛑 Crawling interrupted by user")
                break
            except Exception as e:
                error_reporter.record_error(
                    e, 
                    context="batch_processing",
                    additional_data={'school_index': i, 'total_schools': len(schools)}
                )
                logger.error(f"❌ Unexpected error in batch processing: {e}")
                continue
        
        # Print final statistics
        logger.info("\n" + "=" * 60)
        logger.info("📊 CRAWLING COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Total Processed: {self.stats['total_processed']}")
        logger.info(f"Successfully Enriched: {self.stats['enriched']}")
        logger.info(f"Failed: {self.stats['failed']}")
        logger.info(f"Insufficient Data: {self.stats['insufficient_data']}")
        logger.info(f"Website Primary: {self.stats['website_primary']}")
        logger.info(f"Website Supplementary: {self.stats['website_supplementary']}")
        logger.info(f"Search Only: {self.stats['search_only']}")
        logger.info(f"Quality Rejected: {self.stats['quality_rejected']}")
        logger.info(f"Quality Review Needed: {self.stats['quality_review']}")
        logger.info(f"Duplicate Rejected: {self.stats['duplicate_rejected']}")
        logger.info(f"SEO Optimized: {self.stats['seo_optimized']}")
        
        # Print website extractor stats
        website_stats = self.website_extractor.get_stats()
        logger.info(f"\nWebsite Extraction Stats:")
        logger.info(f"  Websites Processed: {website_stats['websites_processed']}")
        logger.info(f"  Pages Extracted: {website_stats['pages_extracted']}")
        logger.info(f"  Content Sections: {website_stats['content_sections_found']}")
        
        # Print SEO statistics
        if self.stats['seo_optimized'] > 0:
            logger.info(f"\n🎯 SEO Optimization Stats:")
            logger.info(f"  Schools SEO Optimized: {self.stats['seo_optimized']}")
            logger.info(f"  SEO Coverage: {self.stats['seo_optimized']/max(1,self.stats['enriched'])*100:.1f}%")
        
        # Print content quality report
        logger.info(f"\n📊 Content Quality Report:")
        quality_report = self.quality_manager.generate_quality_report()
        for line in quality_report.split('\n'):
            logger.info(f"  {line}" if line.strip() else "")
        
        # Print search engine stats
        logger.info("\nSearch Engine Performance:")
        search_stats = get_search_stats()
        for engine, data in search_stats.items():
            logger.info(f"  {engine}: {data['success_rate']} ({data['status']})")
        
        # Print system health and error analysis
        logger.info("\n🏥 System Health:")
        health = system_breakers.get_system_health()
        logger.info(f"  Overall Status: {health['overall_status']}")
        logger.info(f"  Open Circuits: {health['open_circuits']}")
        
        # Error analysis
        if error_reporter.session_errors:
            logger.info(f"\n⚠️ Error Analysis:")
            analysis = error_reporter.get_error_analysis()
            logger.info(f"  Total Errors: {analysis['summary']['total_errors']}")
            logger.info(f"  Error Rate: {analysis['summary']['error_rate_per_minute']:.2f}/min")
            logger.info(f"  Schools Affected: {analysis['summary']['schools_affected']}")
            
            # Save error report
            error_reporter.save_to_file()
            logger.info(f"  📄 Error report saved to {error_reporter.log_file}")
            
            # Show recovery recommendations
            recommendations = error_reporter.get_recovery_recommendations()
            if len(recommendations) > 1:  # More than just "healthy" message
                logger.info(f"\n💡 Recovery Recommendations:")
                for rec in recommendations[:3]:  # Top 3 recommendations
                    logger.info(f"  {rec}")
        else:
            logger.info(f"\n✅ No errors recorded - system performed excellently!")
        
        return self.stats


def main():
    """Main entry point for the crawler"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Nigerian Schools Content Crawler')
    parser.add_argument('--limit', type=int, help='Limit number of schools to process')
    parser.add_argument('--offset', type=int, default=0, help='Offset for school processing')
    parser.add_argument('--school-id', type=int, help='Process specific school by ID')
    
    args = parser.parse_args()
    
    crawler = ContentCrawler()
    
    if args.school_id:
        # Process single school
        school = {'id': args.school_id, 'name': 'Test School', 'state': 'Lagos'}
        crawler.crawl_school_content(school)
    else:
        # Process batch
        crawler.run_batch_crawl(limit=args.limit, offset=args.offset)


if __name__ == "__main__":
    main()