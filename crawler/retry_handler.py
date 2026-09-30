"""
Comprehensive Error Handling and Retry Logic
============================================
Provides robust retry mechanisms with exponential backoff for the Nigerian Directory crawler.
Handles network errors, rate limits, temporary failures, and provides detailed error tracking.
"""

import time
import random
import logging
from typing import Callable, Any, Dict, Optional, List, Tuple
from functools import wraps
from datetime import datetime, timedelta
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import psycopg2
from psycopg2 import OperationalError, InterfaceError, DatabaseError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RetryConfig:
    """Configuration for retry behavior"""
    
    def __init__(self):
        # Network retry settings
        self.max_retries = 3
        self.backoff_factor = 2.0
        self.base_delay = 1.0
        self.max_delay = 60.0
        self.jitter_range = 0.1
        
        # Database retry settings
        self.db_max_retries = 5
        self.db_backoff_factor = 1.5
        self.db_base_delay = 2.0
        
        # Rate limiting settings
        self.rate_limit_delay = 30.0
        self.rate_limit_max_retries = 3
        
        # Timeout settings
        self.request_timeout = 30.0
        self.connection_timeout = 15.0
        
    def get_delay(self, attempt: int, base_delay: float = None, backoff_factor: float = None) -> float:
        """Calculate delay with exponential backoff and jitter"""
        base = base_delay or self.base_delay
        factor = backoff_factor or self.backoff_factor
        
        # Calculate exponential backoff
        delay = base * (factor ** attempt)
        
        # Apply maximum delay limit
        delay = min(delay, self.max_delay)
        
        # Add jitter to avoid thundering herd
        jitter = random.uniform(-self.jitter_range, self.jitter_range)
        delay = delay * (1 + jitter)
        
        return max(0.1, delay)  # Minimum 0.1 second delay


class ErrorTracker:
    """Tracks errors and failure patterns for analysis"""
    
    def __init__(self):
        self.errors = []
        self.error_counts = {}
        self.consecutive_failures = 0
        self.last_success_time = None
        
    def record_error(self, error: Exception, context: str = "", url: str = ""):
        """Record an error occurrence"""
        error_info = {
            'timestamp': datetime.now(),
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context,
            'url': url
        }
        
        self.errors.append(error_info)
        
        # Update error counts
        error_key = f"{error_info['error_type']}:{context}"
        self.error_counts[error_key] = self.error_counts.get(error_key, 0) + 1
        
        self.consecutive_failures += 1
        
        logger.warning(f"❌ Error recorded: {error_info['error_type']} in {context}")
    
    def record_success(self, context: str = ""):
        """Record a successful operation"""
        self.consecutive_failures = 0
        self.last_success_time = datetime.now()
        logger.debug(f"✅ Success recorded for {context}")
    
    def should_circuit_break(self, max_consecutive_failures: int = 10) -> bool:
        """Determine if circuit breaker should activate"""
        return self.consecutive_failures >= max_consecutive_failures
    
    def get_error_summary(self) -> Dict[str, Any]:
        """Get summary of error patterns"""
        if not self.errors:
            return {'total_errors': 0, 'error_types': {}, 'consecutive_failures': 0}
        
        recent_errors = [e for e in self.errors if e['timestamp'] > datetime.now() - timedelta(hours=1)]
        
        return {
            'total_errors': len(self.errors),
            'recent_errors': len(recent_errors),
            'error_types': dict(self.error_counts),
            'consecutive_failures': self.consecutive_failures,
            'last_success': self.last_success_time.isoformat() if self.last_success_time else None
        }


class RetryHandler:
    """Main retry handler with comprehensive error management"""
    
    def __init__(self, config: RetryConfig = None):
        self.config = config or RetryConfig()
        self.error_tracker = ErrorTracker()
        self.session = self._create_robust_session()
        
    def _create_robust_session(self) -> requests.Session:
        """Create a requests session with built-in retry logic"""
        session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=self.config.max_retries,
            backoff_factor=self.config.backoff_factor,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS"],
            raise_on_status=False
        )
        
        # Mount adapter with retry strategy
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        # Set timeouts
        session.timeout = (self.config.connection_timeout, self.config.request_timeout)
        
        return session
    
    def with_retry(self, 
                   max_retries: int = None, 
                   exceptions: Tuple = None,
                   backoff_factor: float = None,
                   context: str = ""):
        """Decorator for adding retry logic to functions"""
        
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs) -> Any:
                return self.execute_with_retry(
                    func, 
                    *args, 
                    max_retries=max_retries,
                    exceptions=exceptions,
                    backoff_factor=backoff_factor,
                    context=context or func.__name__,
                    **kwargs
                )
            return wrapper
        return decorator
    
    def execute_with_retry(self, 
                          func: Callable, 
                          *args, 
                          max_retries: int = None,
                          exceptions: Tuple = None,
                          backoff_factor: float = None,
                          context: str = "",
                          **kwargs) -> Any:
        """Execute a function with retry logic"""
        
        max_retries = max_retries or self.config.max_retries
        exceptions = exceptions or (Exception,)
        
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                # Check circuit breaker
                if self.error_tracker.should_circuit_break():
                    raise Exception("Circuit breaker activated - too many consecutive failures")
                
                result = func(*args, **kwargs)
                
                # Record success
                self.error_tracker.record_success(context)
                
                return result
                
            except exceptions as e:
                last_exception = e
                
                # Record error
                self.error_tracker.record_error(e, context)
                
                # Check if this is the last attempt
                if attempt >= max_retries:
                    logger.error(f"❌ Final attempt failed for {context}: {e}")
                    break
                
                # Handle specific error types
                delay = self._get_error_specific_delay(e, attempt, backoff_factor)
                
                logger.warning(f"⚠️ Attempt {attempt + 1}/{max_retries + 1} failed for {context}: {e}")
                logger.info(f"⏰ Retrying in {delay:.1f} seconds...")
                
                time.sleep(delay)
        
        # All retries exhausted
        raise last_exception
    
    def _get_error_specific_delay(self, error: Exception, attempt: int, backoff_factor: float = None) -> float:
        """Get delay based on error type"""
        
        # Rate limit errors - longer delay
        if self._is_rate_limit_error(error):
            return self.config.rate_limit_delay + random.uniform(5, 15)
        
        # Network errors - standard exponential backoff
        if self._is_network_error(error):
            return self.config.get_delay(attempt, backoff_factor=backoff_factor)
        
        # Database errors - shorter backoff
        if self._is_database_error(error):
            return self.config.get_delay(attempt, self.config.db_base_delay, self.config.db_backoff_factor)
        
        # Default exponential backoff
        return self.config.get_delay(attempt, backoff_factor=backoff_factor)
    
    def _is_rate_limit_error(self, error: Exception) -> bool:
        """Check if error is due to rate limiting"""
        error_indicators = [
            "rate limit", "too many requests", "429", "quota exceeded",
            "request limit", "throttle", "rate exceeded"
        ]
        
        error_str = str(error).lower()
        return any(indicator in error_str for indicator in error_indicators)
    
    def _is_network_error(self, error: Exception) -> bool:
        """Check if error is network-related"""
        network_errors = [
            requests.ConnectionError,
            requests.Timeout,
            requests.HTTPError,
            ConnectionError,
            TimeoutError
        ]
        
        return any(isinstance(error, err_type) for err_type in network_errors)
    
    def _is_database_error(self, error: Exception) -> bool:
        """Check if error is database-related"""
        db_errors = [
            OperationalError,
            InterfaceError,
            DatabaseError
        ]
        
        return any(isinstance(error, err_type) for err_type in db_errors)
    
    def safe_request(self, method: str, url: str, **kwargs) -> Optional[requests.Response]:
        """Make a safe HTTP request with comprehensive error handling"""
        
        def make_request():
            response = self.session.request(method, url, **kwargs)
            
            # Check for rate limiting
            if response.status_code == 429:
                raise requests.HTTPError(f"Rate limited: {response.status_code}")
            
            # Check for server errors
            if response.status_code >= 500:
                raise requests.HTTPError(f"Server error: {response.status_code}")
            
            # Check for client errors (except 404 which might be expected)
            if 400 <= response.status_code < 500 and response.status_code != 404:
                raise requests.HTTPError(f"Client error: {response.status_code}")
            
            return response
        
        try:
            return self.execute_with_retry(
                make_request,
                context=f"{method} {url}",
                exceptions=(requests.RequestException, ConnectionError, TimeoutError)
            )
        except Exception as e:
            logger.error(f"❌ Request failed after all retries: {method} {url} - {e}")
            return None
    
    def safe_database_operation(self, operation: Callable, *args, **kwargs) -> Any:
        """Execute database operation with retry logic"""
        
        return self.execute_with_retry(
            operation,
            *args,
            max_retries=self.config.db_max_retries,
            exceptions=(OperationalError, InterfaceError, DatabaseError, ConnectionError),
            context="database_operation",
            **kwargs
        )
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get statistics about retry session performance"""
        return {
            'config': {
                'max_retries': self.config.max_retries,
                'base_delay': self.config.base_delay,
                'max_delay': self.config.max_delay
            },
            'errors': self.error_tracker.get_error_summary()
        }


# Global retry handler instance
retry_handler = RetryHandler()

# Convenience decorators for common use cases
def retry_on_network_error(max_retries: int = 3):
    """Decorator for network operations with retry"""
    return retry_handler.with_retry(
        max_retries=max_retries,
        exceptions=(requests.RequestException, ConnectionError, TimeoutError),
        context="network_operation"
    )

def retry_on_database_error(max_retries: int = 5):
    """Decorator for database operations with retry"""
    return retry_handler.with_retry(
        max_retries=max_retries,
        exceptions=(OperationalError, InterfaceError, DatabaseError, ConnectionError),
        context="database_operation"
    )

def retry_with_backoff(max_retries: int = 3, backoff_factor: float = 2.0):
    """General retry decorator with configurable backoff"""
    return retry_handler.with_retry(
        max_retries=max_retries,
        backoff_factor=backoff_factor,
        context="general_operation"
    )


if __name__ == "__main__":
    # Test the retry handler
    print("Testing Retry Handler")
    print("=" * 40)
    
    handler = RetryHandler()
    
    # Test network retry
    @retry_on_network_error(max_retries=2)
    def test_network():
        print("Testing network operation...")
        # Simulate failure for first few attempts
        if handler.error_tracker.consecutive_failures < 1:
            raise requests.ConnectionError("Simulated network error")
        return "Success!"
    
    # Test database retry  
    @retry_on_database_error(max_retries=2)
    def test_database():
        print("Testing database operation...")
        # Simulate failure for first few attempts
        if handler.error_tracker.consecutive_failures < 1:
            raise OperationalError("Simulated database error")
        return "Database success!"
    
    try:
        result = test_network()
        print(f"✅ Network test result: {result}")
    except Exception as e:
        print(f"❌ Network test failed: {e}")
    
    try:
        result = test_database()
        print(f"✅ Database test result: {result}")
    except Exception as e:
        print(f"❌ Database test failed: {e}")
    
    # Print statistics
    print(f"\n📊 Session Statistics:")
    stats = handler.get_session_stats()
    print(f"  Errors: {stats['errors']}")