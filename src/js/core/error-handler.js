/**
 * Nexus Error Handling Module
 * Provides centralized error handling for all Nexus components.
 * 
 * Version 3.0.0
 */

// Error severity levels
export const ErrorLevel = {
  INFO: 'info',       // Informational message, not an error
  WARNING: 'warning', // Non-critical error, operation can continue
  ERROR: 'error',     // Critical error, operation failed but system can continue
  FATAL: 'fatal'      // System-breaking error, may require restart
};

// Error categories for better organization
export const ErrorCategory = {
  STORAGE: 'storage',       // Storage-related errors (read/write)
  NETWORK: 'network',       // Network communication errors
  PARSING: 'parsing',       // Data parsing errors
  AI: 'ai',                 // AI/ML-related errors
  UI: 'ui',                 // User interface errors
  SECURITY: 'security',     // Security-related errors
  EXTENSION: 'extension',   // Chrome extension API errors
  UNKNOWN: 'unknown'        // Uncategorized errors
};

/**
 * Error registry to store recent errors for debugging
 */
class ErrorRegistry {
  constructor(maxErrors = 50) {
    this.errors = [];
    this.maxErrors = maxErrors;
  }

  /**
   * Add an error to the registry
   */
  add(error) {
    this.errors.unshift(error);
    
    // Keep registry size manageable
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }
    
    return error;
  }

  /**
   * Get all errors in the registry
   */
  getAll() {
    return [...this.errors];
  }

  /**
   * Get errors filtered by category and/or level
   */
  getFiltered({ category, level, limit } = {}) {
    let filtered = [...this.errors];
    
    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }
    
    if (level) {
      filtered = filtered.filter(e => e.level === level);
    }
    
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered;
  }

  /**
   * Clear all errors from the registry
   */
  clear() {
    this.errors = [];
  }
}

/**
 * Main error handler class
 */
class ErrorHandler {
  constructor() {
    this.registry = new ErrorRegistry();
    this.listeners = [];
    this.debug = false;
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled) {
    this.debug = enabled;
  }

  /**
   * Handle an error with full context
   */
  handleError(errorInfo) {
    const timestamp = Date.now();
    
    // Create standardized error object
    const error = {
      message: errorInfo.message || 'Unknown error',
      originalError: errorInfo.error || null,
      stack: errorInfo.error?.stack || null,
      context: errorInfo.context || 'unknown',
      category: errorInfo.category || ErrorCategory.UNKNOWN,
      level: errorInfo.level || ErrorLevel.ERROR,
      timestamp,
      metadata: errorInfo.metadata || {},
      handled: true
    };
    
    // Add to registry
    this.registry.add(error);
    
    // Log to console in debug mode
    if (this.debug) {
      this.logErrorToConsole(error);
    }
    
    // Notify all listeners
    this.notifyListeners(error);
    
    return error;
  }

  /**
   * Log error to console
   */
  logErrorToConsole(error) {
    const timestamp = new Date(error.timestamp).toISOString();
    const prefix = `[${timestamp}] [${error.level.toUpperCase()}] [${error.category}]`;
    
    if (error.level === ErrorLevel.ERROR || error.level === ErrorLevel.FATAL) {
      console.error(`${prefix} ${error.message}`, {
        context: error.context,
        error: error.originalError,
        metadata: error.metadata
      });
    } else if (error.level === ErrorLevel.WARNING) {
      console.warn(`${prefix} ${error.message}`, {
        context: error.context,
        metadata: error.metadata
      });
    } else {
      console.info(`${prefix} ${error.message}`, {
        context: error.context, 
        metadata: error.metadata
      });
    }
  }

  /**
   * Add an error listener
   */
  addListener(callback) {
    if (typeof callback === 'function' && !this.listeners.includes(callback)) {
      this.listeners.push(callback);
      return true;
    }
    return false;
  }

  /**
   * Remove an error listener
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Notify all listeners about an error
   */
  notifyListeners(error) {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Create a wrapper function with automatic error handling
   */
  createSafeFunction(fn, context, options = {}) {
    const errorHandler = this;
    
    return async function(...args) {
      try {
        return await fn(...args);
      } catch (error) {
        // Handle the error
        errorHandler.handleError({
          message: `Error in ${context}`,
          error,
          context,
          category: options.category || ErrorCategory.UNKNOWN,
          level: options.level || ErrorLevel.ERROR,
          metadata: { args }
        });
        
        // Either return fallback value or rethrow based on recoverable option
        if (options.recoverable) {
          return options.fallbackValue;
        } else {
          throw error;
        }
      }
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10) {
    return this.registry.getFiltered({ limit });
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category, limit) {
    return this.registry.getFiltered({ category, limit });
  }

  /**
   * Get errors by severity level
   */
  getErrorsByLevel(level, limit) {
    return this.registry.getFiltered({ level, limit });
  }

  /**
   * Clear all errors from registry
   */
  clearErrors() {
    this.registry.clear();
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

export default errorHandler;