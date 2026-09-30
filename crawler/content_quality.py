"""
Content Quality Validation and Deduplication System
==================================================
Ensures high-quality, unique content across the Nigerian Directory.
Prevents duplicate content, validates information accuracy, and maintains SEO standards.
"""

import re
import json
import hashlib
import logging
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime
from difflib import SequenceMatcher
from collections import Counter, defaultdict
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

# Try to download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    try:
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)
    except Exception:
        pass  # Continue without NLTK features if download fails

logger = logging.getLogger(__name__)

class ContentQualityValidator:
    """
    Validates content quality based on multiple criteria
    """
    
    def __init__(self):
        # Quality thresholds
        self.min_content_length = 100
        self.max_content_length = 2000
        self.min_sentence_count = 3
        self.min_word_count = 20
        self.max_repetition_ratio = 0.3
        
        # Educational content indicators
        self.education_keywords = [
            'school', 'education', 'student', 'academic', 'curriculum', 'teacher',
            'learning', 'study', 'course', 'program', 'degree', 'certificate',
            'examination', 'grade', 'class', 'lesson', 'subject', 'faculty',
            'department', 'university', 'college', 'secondary', 'primary'
        ]
        
        # Quality indicators
        self.quality_keywords = [
            'established', 'founded', 'history', 'mission', 'vision', 'excellence',
            'achievement', 'award', 'recognition', 'facility', 'campus', 'library'
        ]
        
        # Spam/low-quality indicators
        self.spam_indicators = [
            'click here', 'buy now', 'free trial', 'limited time', 'act now',
            'special offer', 'guaranteed', 'no risk', 'money back', 'instant',
            '!!!', 'URGENT', 'AMAZING', 'INCREDIBLE'
        ]
        
        # Nigerian context keywords
        self.nigerian_context = [
            'nigeria', 'nigerian', 'lagos', 'abuja', 'kano', 'ibadan', 'port harcourt',
            'kaduna', 'benin', 'maiduguri', 'zaria', 'aba', 'jos', 'ilorin',
            'ogun', 'oyo', 'osun', 'ondo', 'ekiti', 'cross river', 'rivers',
            'bayelsa', 'delta', 'edo', 'anambra', 'imo', 'abia', 'ebonyi',
            'enugu', 'benue', 'kogi', 'kwara', 'nassarawa', 'plateau', 'taraba',
            'adamawa', 'borno', 'yobe', 'gombe', 'bauchi', 'jigawa', 'katsina',
            'kano', 'kebbi', 'sokoto', 'zamfara'
        ]
        
        # Initialize stemmer for text analysis
        try:
            self.stemmer = PorterStemmer()
            self.stopwords = set(stopwords.words('english'))
        except Exception:
            self.stemmer = None
            self.stopwords = set()
    
    def validate_content_quality(self, content: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Comprehensive content quality validation
        """
        if not content or not isinstance(content, str):
            return {
                'is_valid': False,
                'quality_score': 0.0,
                'issues': ['Empty or invalid content'],
                'recommendations': ['Provide substantial content']
            }
        
        content = content.strip()
        validation_result = {
            'is_valid': True,
            'quality_score': 0.0,
            'issues': [],
            'recommendations': [],
            'metrics': {},
            'content_hash': self._generate_content_hash(content)
        }
        
        # Basic metrics
        metrics = self._calculate_basic_metrics(content)
        validation_result['metrics'] = metrics
        
        # Quality checks
        checks = [
            self._check_length(content, metrics),
            self._check_readability(content, metrics),
            self._check_educational_relevance(content),
            self._check_nigerian_context(content),
            self._check_spam_indicators(content),
            self._check_repetition(content),
            self._check_information_density(content),
            self._check_grammar_quality(content)
        ]
        
        # Aggregate results
        total_score = 0.0
        for check in checks:
            if check['issues']:
                validation_result['issues'].extend(check['issues'])
            if check['recommendations']:
                validation_result['recommendations'].extend(check['recommendations'])
            total_score += check['score']
        
        validation_result['quality_score'] = min(1.0, total_score / len(checks))
        validation_result['is_valid'] = (
            validation_result['quality_score'] >= 0.6 and 
            len(validation_result['issues']) <= 2
        )
        
        return validation_result
    
    def _calculate_basic_metrics(self, content: str) -> Dict[str, Any]:
        """Calculate basic content metrics"""
        
        # Basic counts
        char_count = len(content)
        word_count = len(content.split())
        
        # Sentence analysis
        try:
            sentences = sent_tokenize(content)
            sentence_count = len(sentences)
            avg_sentence_length = word_count / max(1, sentence_count)
        except Exception:
            # Fallback without NLTK
            sentences = re.split(r'[.!?]+', content)
            sentences = [s.strip() for s in sentences if s.strip()]
            sentence_count = len(sentences)
            avg_sentence_length = word_count / max(1, sentence_count)
        
        # Unique word ratio
        words = content.lower().split()
        unique_words = len(set(words))
        unique_word_ratio = unique_words / max(1, word_count)
        
        return {
            'char_count': char_count,
            'word_count': word_count,
            'sentence_count': sentence_count,
            'avg_sentence_length': avg_sentence_length,
            'unique_word_ratio': unique_word_ratio,
            'sentences': sentences
        }
    
    def _check_length(self, content: str, metrics: Dict) -> Dict[str, Any]:
        """Check content length appropriateness"""
        score = 0.0
        issues = []
        recommendations = []
        
        char_count = metrics['char_count']
        word_count = metrics['word_count']
        
        if char_count < self.min_content_length:
            issues.append(f"Content too short ({char_count} chars, minimum {self.min_content_length})")
            recommendations.append("Add more detailed information about the school")
            score = 0.2
        elif char_count > self.max_content_length:
            issues.append(f"Content too long ({char_count} chars, maximum {self.max_content_length})")
            recommendations.append("Condense content to essential information")
            score = 0.7
        else:
            score = 1.0
        
        if word_count < self.min_word_count:
            issues.append(f"Insufficient word count ({word_count} words, minimum {self.min_word_count})")
            score = min(score, 0.3)
        
        return {'score': score, 'issues': issues, 'recommendations': recommendations}
    
    def _check_readability(self, content: str, metrics: Dict) -> Dict[str, Any]:
        """Check content readability"""
        score = 0.8  # Base score
        issues = []
        recommendations = []
        
        avg_sentence_length = metrics['avg_sentence_length']
        sentence_count = metrics['sentence_count']
        
        # Check sentence count
        if sentence_count < self.min_sentence_count:
            issues.append(f"Too few sentences ({sentence_count}, minimum {self.min_sentence_count})")
            recommendations.append("Break information into more sentences")
            score -= 0.3
        
        # Check average sentence length
        if avg_sentence_length > 25:
            issues.append(f"Sentences too long (avg {avg_sentence_length:.1f} words)")
            recommendations.append("Use shorter, clearer sentences")
            score -= 0.2
        elif avg_sentence_length < 5:
            issues.append(f"Sentences too short (avg {avg_sentence_length:.1f} words)")
            recommendations.append("Provide more detailed sentences")
            score -= 0.1
        
        return {'score': max(0.0, score), 'issues': issues, 'recommendations': recommendations}
    
    def _check_educational_relevance(self, content: str) -> Dict[str, Any]:
        """Check relevance to educational content"""
        content_lower = content.lower()
        
        # Count educational keywords
        education_matches = sum(1 for keyword in self.education_keywords 
                              if keyword in content_lower)
        
        quality_matches = sum(1 for keyword in self.quality_keywords 
                            if keyword in content_lower)
        
        total_matches = education_matches + quality_matches
        
        if total_matches >= 5:
            score = 1.0
            issues = []
            recommendations = []
        elif total_matches >= 3:
            score = 0.7
            issues = []
            recommendations = ["Add more educational context and details"]
        elif total_matches >= 1:
            score = 0.4
            issues = ["Limited educational relevance"]
            recommendations = ["Include more school-specific information", "Add details about programs and facilities"]
        else:
            score = 0.1
            issues = ["Content lacks educational context"]
            recommendations = ["Rewrite to focus on educational aspects", "Include school mission, programs, and achievements"]
        
        return {'score': score, 'issues': issues, 'recommendations': recommendations}
    
    def _check_nigerian_context(self, content: str) -> Dict[str, Any]:
        """Check Nigerian geographic and cultural context"""
        content_lower = content.lower()
        
        # Count Nigerian context matches
        context_matches = sum(1 for keyword in self.nigerian_context 
                             if keyword in content_lower)
        
        if context_matches >= 3:
            score = 1.0
            issues = []
            recommendations = []
        elif context_matches >= 1:
            score = 0.8
            issues = []
            recommendations = ["Add more location-specific details"]
        else:
            score = 0.3
            issues = ["Limited Nigerian context"]
            recommendations = ["Include location information", "Add Nigerian educational system context"]
        
        return {'score': score, 'issues': issues, 'recommendations': recommendations}
    
    def _check_spam_indicators(self, content: str) -> Dict[str, Any]:
        """Check for spam and low-quality indicators"""
        content_lower = content.lower()
        
        # Count spam indicators
        spam_matches = sum(1 for indicator in self.spam_indicators 
                          if indicator.lower() in content_lower)
        
        # Check excessive capitalization
        caps_ratio = sum(1 for c in content if c.isupper()) / max(1, len(content))
        
        # Check excessive punctuation
        punct_ratio = sum(1 for c in content if c in '!?') / max(1, len(content))
        
        score = 1.0
        issues = []
        recommendations = []
        
        if spam_matches > 0:
            score -= spam_matches * 0.3
            issues.append(f"Contains {spam_matches} spam indicators")
            recommendations.append("Remove promotional language")
        
        if caps_ratio > 0.1:
            score -= 0.2
            issues.append(f"Excessive capitalization ({caps_ratio:.1%})")
            recommendations.append("Use normal capitalization")
        
        if punct_ratio > 0.05:
            score -= 0.1
            issues.append(f"Excessive exclamation/question marks ({punct_ratio:.1%})")
            recommendations.append("Use punctuation sparingly")
        
        return {'score': max(0.0, score), 'issues': issues, 'recommendations': recommendations}
    
    def _check_repetition(self, content: str) -> Dict[str, Any]:
        """Check for excessive repetition"""
        words = content.lower().split()
        
        if not words:
            return {'score': 0.0, 'issues': ['No content to analyze'], 'recommendations': []}
        
        # Calculate word frequency
        word_freq = Counter(words)
        total_words = len(words)
        
        # Find most repeated words (excluding common words)
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'}
        
        repeated_words = []
        for word, count in word_freq.items():
            if word not in common_words and len(word) > 3:
                repetition_ratio = count / total_words
                if repetition_ratio > self.max_repetition_ratio:
                    repeated_words.append((word, count, repetition_ratio))
        
        score = 1.0
        issues = []
        recommendations = []
        
        if repeated_words:
            score = 0.5
            for word, count, ratio in repeated_words[:3]:  # Show top 3
                issues.append(f"'{word}' repeated {count} times ({ratio:.1%})")
            recommendations.append("Vary vocabulary and reduce repetition")
            recommendations.append("Use synonyms and rephrase repeated concepts")
        
        return {'score': score, 'issues': issues, 'recommendations': recommendations}
    
    def _check_information_density(self, content: str) -> Dict[str, Any]:
        """Check information density and substance"""
        
        # Count informative elements
        informative_patterns = [
            r'\b(established|founded|since)\s+\d{4}',  # Founding year
            r'\b\d+\s+(students?|pupils?)',  # Student count
            r'\b(offers?|provides?|teaches?)\b.*\b(programs?|courses?|subjects?)',  # Programs
            r'\b(located|situated)\s+in\b',  # Location info
            r'\b(facilities?|buildings?|libraries?|laboratories?)',  # Facilities
            r'\b(accredited|certified|approved)\s+by\b',  # Accreditation
        ]
        
        info_elements = 0
        for pattern in informative_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                info_elements += 1
        
        # Calculate density score
        words = len(content.split())
        density_score = info_elements / max(1, words / 50)  # Elements per 50 words
        
        if density_score >= 0.8:
            score = 1.0
            issues = []
            recommendations = []
        elif density_score >= 0.4:
            score = 0.7
            issues = []
            recommendations = ["Add more specific details and facts"]
        else:
            score = 0.3
            issues = ["Low information density"]
            recommendations = [
                "Include specific facts (founding year, student count, etc.)",
                "Add details about programs and facilities",
                "Mention accreditation and achievements"
            ]
        
        return {'score': score, 'issues': issues, 'recommendations': recommendations}
    
    def _check_grammar_quality(self, content: str) -> Dict[str, Any]:
        """Basic grammar and language quality check"""
        
        # Simple grammar checks
        issues = []
        recommendations = []
        score = 1.0
        
        # Check for basic sentence structure
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        incomplete_sentences = 0
        for sentence in sentences:
            words = sentence.split()
            if len(words) < 3:  # Very short sentences might be incomplete
                incomplete_sentences += 1
        
        if incomplete_sentences > len(sentences) * 0.3:
            score -= 0.2
            issues.append(f"{incomplete_sentences} potentially incomplete sentences")
            recommendations.append("Review sentence structure and completeness")
        
        # Check capitalization
        if content and not content[0].isupper():
            score -= 0.1
            issues.append("Content should start with capital letter")
            recommendations.append("Capitalize the first word")
        
        return {'score': max(0.0, score), 'issues': issues, 'recommendations': recommendations}
    
    def _generate_content_hash(self, content: str) -> str:
        """Generate hash for content deduplication"""
        # Normalize content for hashing
        normalized = re.sub(r'\s+', ' ', content.lower().strip())
        return hashlib.md5(normalized.encode()).hexdigest()


class ContentDeduplicator:
    """
    Detects and handles duplicate content across schools
    """
    
    def __init__(self):
        self.content_hashes = {}  # hash -> [school_ids]
        self.similarity_threshold = 0.8
        self.partial_similarity_threshold = 0.6
        
    def check_duplicate(self, content: str, school_id: int, content_type: str) -> Dict[str, Any]:
        """Check if content is duplicate or too similar to existing content"""
        
        if not content:
            return {
                'is_duplicate': False,
                'similarity_score': 0.0,
                'similar_schools': [],
                'action': 'accept'
            }
        
        # Generate content hash
        content_hash = self._generate_normalized_hash(content)
        
        result = {
            'is_duplicate': False,
            'similarity_score': 0.0,
            'similar_schools': [],
            'content_hash': content_hash,
            'action': 'accept'
        }
        
        # Check exact duplicates
        hash_key = f"{content_type}:{content_hash}"
        if hash_key in self.content_hashes:
            existing_schools = self.content_hashes[hash_key]
            if school_id not in existing_schools:
                result.update({
                    'is_duplicate': True,
                    'similarity_score': 1.0,
                    'similar_schools': existing_schools,
                    'action': 'reject'
                })
                return result
        
        # Check similarity to existing content
        max_similarity = 0.0
        most_similar_schools = []
        
        for existing_hash_key, existing_schools in self.content_hashes.items():
            if existing_hash_key.startswith(f"{content_type}:"):
                existing_hash = existing_hash_key.split(":", 1)[1]
                similarity = self._calculate_similarity(content, existing_hash)
                
                if similarity > max_similarity:
                    max_similarity = similarity
                    most_similar_schools = existing_schools
        
        result['similarity_score'] = max_similarity
        result['similar_schools'] = most_similar_schools
        
        # Determine action based on similarity
        if max_similarity >= self.similarity_threshold:
            result['is_duplicate'] = True
            result['action'] = 'reject'
        elif max_similarity >= self.partial_similarity_threshold:
            result['action'] = 'review'  # Needs human review or content enhancement
        
        # Register this content
        if result['action'] == 'accept':
            if hash_key not in self.content_hashes:
                self.content_hashes[hash_key] = []
            if school_id not in self.content_hashes[hash_key]:
                self.content_hashes[hash_key].append(school_id)
        
        return result
    
    def _generate_normalized_hash(self, content: str) -> str:
        """Generate normalized hash for similarity comparison"""
        # Normalize content: lowercase, remove extra spaces, basic punctuation
        normalized = re.sub(r'[^\w\s]', '', content.lower())
        normalized = re.sub(r'\s+', ' ', normalized.strip())
        
        # Remove very common words for better similarity detection
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        words = [w for w in normalized.split() if w not in common_words]
        normalized = ' '.join(words)
        
        return hashlib.md5(normalized.encode()).hexdigest()
    
    def _calculate_similarity(self, content1: str, hash2: str) -> float:
        """Calculate similarity between content and existing hash"""
        # For now, use a simple approach - in production, you might want more sophisticated NLP
        hash1 = self._generate_normalized_hash(content1)
        
        # Compare hashes (this is a simplified similarity measure)
        if hash1 == hash2:
            return 1.0
        
        # Calculate character-level similarity
        similarity = SequenceMatcher(None, hash1, hash2).ratio()
        return similarity
    
    def get_duplicate_report(self) -> Dict[str, Any]:
        """Generate report of duplicate content patterns"""
        
        duplicates = {}
        for hash_key, school_ids in self.content_hashes.items():
            if len(school_ids) > 1:
                content_type = hash_key.split(":", 1)[0]
                if content_type not in duplicates:
                    duplicates[content_type] = []
                duplicates[content_type].append({
                    'hash': hash_key.split(":", 1)[1],
                    'school_count': len(school_ids),
                    'school_ids': school_ids
                })
        
        return {
            'total_content_items': len(self.content_hashes),
            'duplicate_groups': duplicates,
            'duplicate_count': sum(len(groups) for groups in duplicates.values())
        }


class ContentQualityManager:
    """
    Main manager for content quality validation and deduplication
    """
    
    def __init__(self):
        self.validator = ContentQualityValidator()
        self.deduplicator = ContentDeduplicator()
        self.processed_schools = set()
        
    def process_school_content(self, school_id: int, content_dict: Dict[str, str]) -> Dict[str, Any]:
        """Process all content for a school"""
        
        results = {
            'school_id': school_id,
            'overall_quality_score': 0.0,
            'is_acceptable': True,
            'content_results': {},
            'duplicate_issues': {},
            'recommendations': [],
            'action': 'accept'
        }
        
        content_types = ['enriched_history', 'enriched_academics', 'enriched_campus_info', 'enriched_student_life']
        total_score = 0.0
        valid_content_count = 0
        
        for content_type in content_types:
            content = content_dict.get(content_type, '')
            
            if not content:
                continue
            
            # Validate quality
            quality_result = self.validator.validate_content_quality(content, {'school_id': school_id})
            
            # Check for duplicates
            duplicate_result = self.deduplicator.check_duplicate(content, school_id, content_type)
            
            results['content_results'][content_type] = {
                'quality': quality_result,
                'duplicate_check': duplicate_result
            }
            
            # Aggregate scores
            if quality_result['is_valid']:
                total_score += quality_result['quality_score']
                valid_content_count += 1
            
            # Track duplicate issues
            if duplicate_result['is_duplicate']:
                results['duplicate_issues'][content_type] = duplicate_result
            
            # Collect recommendations
            results['recommendations'].extend(quality_result.get('recommendations', []))
        
        # Calculate overall quality
        if valid_content_count > 0:
            results['overall_quality_score'] = total_score / valid_content_count
        
        # Determine final action
        has_critical_duplicates = any(
            dup['action'] == 'reject' 
            for dup in results['duplicate_issues'].values()
        )
        
        low_quality = results['overall_quality_score'] < 0.5
        
        if has_critical_duplicates:
            results['action'] = 'reject'
            results['is_acceptable'] = False
        elif low_quality or results['duplicate_issues']:
            results['action'] = 'review'
            results['is_acceptable'] = False
        
        # Mark as processed
        self.processed_schools.add(school_id)
        
        return results
    
    def generate_quality_report(self) -> str:
        """Generate comprehensive quality report"""
        
        duplicate_report = self.deduplicator.get_duplicate_report()
        
        report = []
        report.append("📊 CONTENT QUALITY REPORT")
        report.append("=" * 50)
        
        report.append(f"\n🏫 Processed Schools: {len(self.processed_schools)}")
        report.append(f"📝 Total Content Items: {duplicate_report['total_content_items']}")
        report.append(f"🔄 Duplicate Groups: {duplicate_report['duplicate_count']}")
        
        if duplicate_report['duplicate_groups']:
            report.append(f"\n📋 Duplicate Content by Type:")
            for content_type, groups in duplicate_report['duplicate_groups'].items():
                report.append(f"  {content_type}: {len(groups)} duplicate groups")
                for group in groups[:3]:  # Show top 3
                    report.append(f"    • {group['school_count']} schools with same content")
        
        return "\n".join(report)


if __name__ == "__main__":
    # Test the content quality system
    print("Testing Content Quality Validation System")
    print("=" * 50)
    
    # Initialize systems
    manager = ContentQualityManager()
    
    # Test content samples
    test_contents = {
        'good_content': {
            'enriched_history': "St. Augustine's College was established in 1948 in Lagos, Nigeria. The school was founded by Catholic missionaries with the mission to provide quality education to Nigerian students. Over the decades, it has grown to become one of the leading secondary schools in Lagos State, producing notable alumni in various fields including medicine, law, and engineering.",
            'enriched_academics': "The school offers a comprehensive curriculum including Sciences, Arts, and Commercial subjects. Students can pursue subjects like Physics, Chemistry, Biology, Mathematics, English Language, Literature, Government, Economics, and Accounting. The school maintains high academic standards with qualified teachers and modern laboratory facilities."
        },
        'poor_content': {
            'enriched_history': "Good school. Very nice. Students like it.",
            'enriched_academics': "They teach subjects. Many subjects available. Good teaching."
        },
        'duplicate_content': {
            'enriched_history': "St. Augustine's College was established in 1948 in Lagos, Nigeria. The school was founded by Catholic missionaries with the mission to provide quality education to Nigerian students.",  # Similar to good_content
            'enriched_academics': "Science and Arts subjects are offered with qualified teachers."
        }
    }
    
    # Test each content
    for test_name, content_dict in test_contents.items():
        print(f"\n🧪 Testing: {test_name}")
        print("-" * 30)
        
        result = manager.process_school_content(len(manager.processed_schools) + 1, content_dict)
        
        print(f"Overall Quality Score: {result['overall_quality_score']:.2f}")
        print(f"Action: {result['action']}")
        print(f"Acceptable: {result['is_acceptable']}")
        
        if result['duplicate_issues']:
            print(f"Duplicate Issues: {len(result['duplicate_issues'])}")
        
        if result['recommendations']:
            print(f"Top Recommendations:")
            for rec in result['recommendations'][:3]:
                print(f"  • {rec}")
    
    # Generate final report
    print(f"\n{manager.generate_quality_report()}")