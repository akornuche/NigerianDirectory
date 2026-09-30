"""
Circuit Breaker Implementation
=============================
Implements circuit breaker pattern to prevent cascade failures
and protect external services during system-wide issues.
"""

import time
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
from threading import Lock

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing fast
    HALF_OPEN = "half_open"  # Testing recovery

class CircuitBreaker:
    """
    Circuit breaker to handle repeated failures gracefully
    """
    
    def __init__(self, 
                 failure_threshold: int = 5,
                 recovery_timeout: int = 60,
                 expected_exception: type = Exception):
        """
        Initialize circuit breaker
        
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before trying recovery
            expected_exception: Exception type to monitor
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        # State tracking
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
        self.lock = Lock()
        
        # Statistics
        self.stats = {
            'total_calls': 0,
            'failed_calls': 0,
            'successful_calls': 0,
            'circuit_opened_count': 0,
            'last_opened': None,
            'state_changes': []
        }
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection
        """
        with self.lock:
            self.stats['total_calls'] += 1
            
            # Check if circuit is open
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self._set_state(CircuitState.HALF_OPEN)
                else:
                    raise Exception(f"Circuit breaker is OPEN. Last failure: {self.last_failure_time}")
        
        # Execute the function
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
            
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    def _on_success(self):
        """Handle successful execution"""
        with self.lock:
            self.failure_count = 0
            if self.state == CircuitState.HALF_OPEN:
                self._set_state(CircuitState.CLOSED)
            
            self.stats['successful_calls'] += 1
    
    def _on_failure(self):
        """Handle failed execution"""
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = datetime.now()
            self.stats['failed_calls'] += 1
            
            if self.failure_count >= self.failure_threshold:
                if self.state != CircuitState.OPEN:
                    self._set_state(CircuitState.OPEN)
                    self.stats['circuit_opened_count'] += 1
                    self.stats['last_opened'] = self.last_failure_time.isoformat()
                    logger.warning(f"🚫 Circuit breaker OPENED after {self.failure_count} failures")
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if not self.last_failure_time:
            return True
        
        time_since_failure = (datetime.now() - self.last_failure_time).seconds
        return time_since_failure >= self.recovery_timeout
    
    def _set_state(self, new_state: CircuitState):
        """Change circuit breaker state"""
        if self.state != new_state:
            old_state = self.state
            self.state = new_state
            
            self.stats['state_changes'].append({
                'from_state': old_state.value,
                'to_state': new_state.value,
                'timestamp': datetime.now().isoformat(),
                'failure_count': self.failure_count
            })
            
            logger.info(f"🔄 Circuit breaker state: {old_state.value} -> {new_state.value}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics"""
        with self.lock:
            return {
                **self.stats,
                'current_state': self.state.value,
                'failure_count': self.failure_count,
                'last_failure': self.last_failure_time.isoformat() if self.last_failure_time else None,
                'success_rate': self.stats['successful_calls'] / max(1, self.stats['total_calls'])
            }
    
    def force_open(self):
        """Manually open the circuit"""
        with self.lock:
            self._set_state(CircuitState.OPEN)
    
    def force_close(self):
        """Manually close the circuit"""
        with self.lock:
            self.failure_count = 0
            self._set_state(CircuitState.CLOSED)


class SystemCircuitBreakers:
    """
    Manages circuit breakers for different system components
    """
    
    def __init__(self):
        self.breakers = {}
        self._create_default_breakers()
    
    def _create_default_breakers(self):
        """Create circuit breakers for system components"""
        
        # Network operations (websites, search engines)
        self.breakers['network'] = CircuitBreaker(
            failure_threshold=10,
            recovery_timeout=300,  # 5 minutes
            expected_exception=(ConnectionError, TimeoutError, Exception)
        )
        
        # Database operations
        self.breakers['database'] = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=120,  # 2 minutes
            expected_exception=(Exception,)
        )
        
        # Search engine operations
        self.breakers['search'] = CircuitBreaker(
            failure_threshold=8,
            recovery_timeout=600,  # 10 minutes
            expected_exception=(Exception,)
        )
        
        # Image download operations
        self.breakers['images'] = CircuitBreaker(
            failure_threshold=15,
            recovery_timeout=180,  # 3 minutes
            expected_exception=(Exception,)
        )
    
    def get_breaker(self, component: str) -> CircuitBreaker:
        """Get circuit breaker for component"""
        if component not in self.breakers:
            # Create default breaker for unknown components
            self.breakers[component] = CircuitBreaker()
        
        return self.breakers[component]
    
    def execute_with_breaker(self, component: str, func: Callable, *args, **kwargs) -> Any:
        """Execute function with appropriate circuit breaker"""
        breaker = self.get_breaker(component)
        return breaker.call(func, *args, **kwargs)
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health based on circuit breaker states"""
        health = {
            'overall_status': 'healthy',
            'components': {},
            'total_failures': 0,
            'total_successes': 0
        }
        
        open_circuits = 0
        
        for name, breaker in self.breakers.items():
            stats = breaker.get_stats()
            health['components'][name] = {
                'state': stats['current_state'],
                'success_rate': stats['success_rate'],
                'failure_count': stats['failure_count'],
                'total_calls': stats['total_calls']
            }
            
            health['total_failures'] += stats['failed_calls']
            health['total_successes'] += stats['successful_calls']
            
            if breaker.state == CircuitState.OPEN:
                open_circuits += 1
        
        # Determine overall status
        if open_circuits > 0:
            health['overall_status'] = 'degraded' if open_circuits < len(self.breakers) else 'critical'
        
        health['open_circuits'] = open_circuits
        
        return health
    
    def reset_all(self):
        """Reset all circuit breakers"""
        for breaker in self.breakers.values():
            breaker.force_close()
        
        logger.info("🔄 All circuit breakers reset")


# Global circuit breaker system
system_breakers = SystemCircuitBreakers()


# Convenience functions
def with_circuit_breaker(component: str):
    """Decorator to add circuit breaker protection"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            return system_breakers.execute_with_breaker(component, func, *args, **kwargs)
        return wrapper
    return decorator


if __name__ == "__main__":
    # Test circuit breaker
    import random
    
    print("Testing Circuit Breaker")
    print("=" * 30)
    
    # Create test breaker
    breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=2)
    
    def unreliable_function():
        """Function that fails randomly"""
        if random.random() < 0.7:  # 70% failure rate
            raise ConnectionError("Simulated failure")
        return "Success!"
    
    # Test multiple calls
    for i in range(10):
        try:
            result = breaker.call(unreliable_function)
            print(f"Call {i+1}: {result}")
        except Exception as e:
            print(f"Call {i+1}: Failed - {e}")
        
        time.sleep(0.5)
    
    # Print statistics
    print(f"\nCircuit Breaker Stats:")
    stats = breaker.get_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # Test system health
    print(f"\nSystem Health:")
    health = system_breakers.get_system_health()
    print(f"  Overall: {health['overall_status']}")
    print(f"  Open circuits: {health['open_circuits']}")