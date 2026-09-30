"""
Error Reporting and Analysis System
==================================
Provides comprehensive error tracking, analysis, and reporting
for the Nigerian Directory crawler system.
"""

import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict, Counter
import traceback

logger = logging.getLogger(__name__)

class ErrorReporter:
    """
    Comprehensive error tracking and analysis system
    """
    
    def __init__(self, log_file: str = "crawler_errors.json"):
        self.log_file = Path(log_file)
        self.session_errors = []
        self.error_patterns = defaultdict(int)
        self.school_errors = defaultdict(list)
        
        # Error categories
        self.error_categories = {
            'network': ['ConnectionError', 'Timeout', 'HTTPError', 'requests'],
            'database': ['OperationalError', 'InterfaceError', 'DatabaseError', 'psycopg2'],
            'parsing': ['BeautifulSoup', 'ParseError', 'AttributeError', 'ValueError'],
            'validation': ['ValidationError', 'DataError', 'IntegrityError'],
            'rate_limit': ['429', 'rate limit', 'throttle', 'quota'],
            'auth': ['401', '403', 'Unauthorized', 'Forbidden'],
            'not_found': ['404', 'Not Found', 'DoesNotExist']
        }
        
        # Load existing errors if file exists
        self._load_existing_errors()
    
    def _load_existing_errors(self):
        """Load previous error data"""
        if self.log_file.exists():
            try:
                with open(self.log_file, 'r') as f:
                    data = json.load(f)
                    # Load only recent errors (last 24 hours)
                    cutoff = datetime.now() - timedelta(hours=24)
                    recent_errors = [
                        e for e in data.get('errors', [])
                        if datetime.fromisoformat(e['timestamp']) > cutoff
                    ]
                    logger.info(f"Loaded {len(recent_errors)} recent errors from log file")
            except Exception as e:
                logger.warning(f"Could not load existing error log: {e}")
    
    def record_error(self, 
                    error: Exception,
                    context: str = "",
                    school_name: str = "",
                    school_id: int = None,
                    url: str = "",
                    additional_data: Dict = None) -> str:
        """Record an error with full context"""
        
        error_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(self.session_errors):04d}"
        
        error_data = {
            'id': error_id,
            'timestamp': datetime.now().isoformat(),
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context,
            'school_name': school_name,
            'school_id': school_id,
            'url': url,
            'category': self._categorize_error(error),
            'severity': self._assess_severity(error, context),
            'traceback': traceback.format_exc(),
            'additional_data': additional_data or {}
        }
        
        self.session_errors.append(error_data)
        
        # Update patterns
        error_pattern = f"{error_data['category']}:{error_data['error_type']}"
        self.error_patterns[error_pattern] += 1
        
        # Track school-specific errors
        if school_name:
            self.school_errors[school_name].append(error_id)
        
        logger.error(f"❌ Error {error_id}: {error_data['error_type']} in {context}")
        
        return error_id
    
    def _categorize_error(self, error: Exception) -> str:
        """Categorize error type"""
        error_str = str(error).lower()
        error_type = type(error).__name__.lower()
        
        for category, keywords in self.error_categories.items():
            if any(keyword.lower() in error_str or keyword.lower() in error_type 
                  for keyword in keywords):
                return category
        
        return 'unknown'
    
    def _assess_severity(self, error: Exception, context: str) -> str:
        """Assess error severity"""
        error_str = str(error).lower()
        
        # Critical errors that stop processing
        if any(keyword in error_str for keyword in ['database', 'connection', 'authentication']):
            return 'critical'
        
        # High severity - affects data quality
        if any(keyword in error_str for keyword in ['parsing', 'validation', 'integrity']):
            return 'high'
        
        # Medium severity - affects availability
        if any(keyword in error_str for keyword in ['timeout', 'rate limit', '503', '502']):
            return 'medium'
        
        # Low severity - transient issues
        if any(keyword in error_str for keyword in ['404', 'not found', 'temporary']):
            return 'low'
        
        return 'medium'  # Default
    
    def get_error_analysis(self) -> Dict[str, Any]:
        """Get comprehensive error analysis"""
        
        if not self.session_errors:
            return {'summary': 'No errors recorded in current session'}
        
        # Basic statistics
        total_errors = len(self.session_errors)
        categories = Counter(e['category'] for e in self.session_errors)
        severities = Counter(e['severity'] for e in self.session_errors)
        contexts = Counter(e['context'] for e in self.session_errors)
        
        # Time-based analysis
        error_times = [datetime.fromisoformat(e['timestamp']) for e in self.session_errors]
        first_error = min(error_times)
        last_error = max(error_times)
        duration = (last_error - first_error).total_seconds() / 60  # minutes
        
        # School-specific analysis
        schools_with_errors = len([s for s in self.school_errors.keys() if s])
        
        # Most problematic schools
        problem_schools = sorted(
            [(school, len(errors)) for school, errors in self.school_errors.items() if school],
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        # Error rate analysis
        if duration > 0:
            error_rate = total_errors / duration  # errors per minute
        else:
            error_rate = 0
        
        return {
            'summary': {
                'total_errors': total_errors,
                'duration_minutes': round(duration, 1),
                'error_rate_per_minute': round(error_rate, 2),
                'schools_affected': schools_with_errors,
                'first_error': first_error.isoformat(),
                'last_error': last_error.isoformat()
            },
            'categories': dict(categories),
            'severities': dict(severities),
            'contexts': dict(contexts),
            'most_common_patterns': dict(Counter(self.error_patterns).most_common(10)),
            'problem_schools': problem_schools,
            'recent_errors': [
                {
                    'id': e['id'],
                    'timestamp': e['timestamp'],
                    'type': e['error_type'],
                    'category': e['category'],
                    'severity': e['severity'],
                    'context': e['context'],
                    'school': e['school_name']
                }
                for e in self.session_errors[-10:]  # Last 10 errors
            ]
        }
    
    def get_recovery_recommendations(self) -> List[str]:
        """Get recovery recommendations based on error patterns"""
        recommendations = []
        
        if not self.session_errors:
            return ["No errors detected - system appears healthy"]
        
        analysis = self.get_error_analysis()
        categories = analysis['categories']
        severities = analysis['severities']
        
        # Network issues
        if categories.get('network', 0) > 5:
            recommendations.append(
                "🌐 High network errors detected. Consider: "
                "reducing concurrency, increasing timeouts, checking internet connection"
            )
        
        # Database issues
        if categories.get('database', 0) > 3:
            recommendations.append(
                "🗄️ Database errors detected. Consider: "
                "checking database connectivity, restarting database service, checking disk space"
            )
        
        # Rate limiting
        if categories.get('rate_limit', 0) > 2:
            recommendations.append(
                "⏱️ Rate limiting detected. Consider: "
                "increasing delays between requests, using different IP/proxy, reducing concurrent requests"
            )
        
        # Parsing errors
        if categories.get('parsing', 0) > 10:
            recommendations.append(
                "🔍 Many parsing errors. Consider: "
                "updating selectors, improving content validation, handling edge cases"
            )
        
        # Critical errors
        if severities.get('critical', 0) > 0:
            recommendations.append(
                "🚨 Critical errors present. Consider: "
                "stopping crawler, investigating root cause, checking system resources"
            )
        
        # High error rate
        error_rate = analysis['summary']['error_rate_per_minute']
        if error_rate > 2:
            recommendations.append(
                f"⚡ High error rate ({error_rate:.1f}/min). Consider: "
                "reducing batch size, increasing delays, checking system load"
            )
        
        return recommendations or ["System appears stable - continue monitoring"]
    
    def save_to_file(self):
        """Save error data to file"""
        try:
            data = {
                'generated_at': datetime.now().isoformat(),
                'session_summary': self.get_error_analysis()['summary'],
                'errors': self.session_errors
            }
            
            with open(self.log_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            logger.info(f"Error report saved to {self.log_file}")
            
        except Exception as e:
            logger.error(f"Failed to save error report: {e}")
    
    def generate_report(self) -> str:
        """Generate human-readable error report"""
        analysis = self.get_error_analysis()
        
        if 'summary' in analysis and isinstance(analysis['summary'], str):
            return analysis['summary']
        
        report = []
        report.append("🚨 CRAWLER ERROR REPORT")
        report.append("=" * 50)
        
        # Summary
        summary = analysis['summary']
        report.append(f"📊 Summary:")
        report.append(f"  • Total errors: {summary['total_errors']}")
        report.append(f"  • Duration: {summary['duration_minutes']} minutes")
        report.append(f"  • Error rate: {summary['error_rate_per_minute']} errors/min")
        report.append(f"  • Schools affected: {summary['schools_affected']}")
        
        # Categories
        if analysis['categories']:
            report.append(f"\n📂 Error Categories:")
            for category, count in sorted(analysis['categories'].items(), key=lambda x: x[1], reverse=True):
                report.append(f"  • {category}: {count}")
        
        # Severities
        if analysis['severities']:
            report.append(f"\n⚠️ Error Severities:")
            for severity, count in sorted(analysis['severities'].items(), key=lambda x: x[1], reverse=True):
                report.append(f"  • {severity}: {count}")
        
        # Problem schools
        if analysis['problem_schools']:
            report.append(f"\n🏫 Most Problematic Schools:")
            for school, count in analysis['problem_schools'][:3]:
                report.append(f"  • {school}: {count} errors")
        
        # Recommendations
        recommendations = self.get_recovery_recommendations()
        if recommendations:
            report.append(f"\n💡 Recommendations:")
            for rec in recommendations:
                report.append(f"  • {rec}")
        
        return "\n".join(report)


# Global error reporter
error_reporter = ErrorReporter()


if __name__ == "__main__":
    # Test error reporter
    print("Testing Error Reporter")
    print("=" * 40)
    
    reporter = ErrorReporter()
    
    # Simulate some errors
    try:
        raise ConnectionError("Network timeout")
    except Exception as e:
        reporter.record_error(e, "test_network", "Test School", 1, "http://test.com")
    
    try:
        raise ValueError("Invalid data format")
    except Exception as e:
        reporter.record_error(e, "test_parsing", "Test School", 1)
    
    try:
        raise Exception("Rate limit exceeded")
    except Exception as e:
        reporter.record_error(e, "test_rate_limit", "Another School", 2)
    
    # Generate report
    print(reporter.generate_report())
    
    # Save to file
    reporter.save_to_file()
    print(f"\nError report saved to {reporter.log_file}")