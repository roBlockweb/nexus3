/**
 * Nexus System Monitor
 * Monitors system capabilities and adapts Nexus behavior accordingly.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from './error-handler.js';
import { StorageManager } from './storage-manager.js';
import * as tf from '@tensorflow/tfjs';

// Default hardware configuration
const DEFAULT_CAPABILITIES = {
  cpuInfo: 'Unknown',
  memoryInfo: {
    jsHeapSizeLimit: 0,
    totalJSHeapSize: 0,
    usedJSHeapSize: 0
  },
  gpuAvailable: false,
  gpuInfo: null,
  gpuActive: false,
  concurrency: 4, // Default concurrency
  deviceType: 'desktop',
  batteryStatus: null
};

/**
 * System Monitor class
 * Detects hardware capabilities and provides recommendations
 */
export class SystemMonitor {
  constructor() {
    this.capabilities = { ...DEFAULT_CAPABILITIES };
    this.storageManager = new StorageManager();
    this.tfBackend = null;
    this.initialized = false;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.detectCPU = this.detectCPU.bind(this);
    this.detectGPU = this.detectGPU.bind(this);
    this.detectMemory = this.detectMemory.bind(this);
    this.detectBattery = this.detectBattery.bind(this);
    this.detectDeviceType = this.detectDeviceType.bind(this);
    this.getCapabilities = this.getCapabilities.bind(this);
    this.switchToGPU = this.switchToGPU.bind(this);
    this.switchToCPU = this.switchToCPU.bind(this);
  }

  /**
   * Initialize system monitoring
   */
  async init() {
    try {
      if (this.initialized) {
        return this.capabilities;
      }
      
      // Load user hardware preferences
      const settings = await this.storageManager.getSettings();
      const userHardwarePref = settings?.hardware?.useGPU || 'auto';
      
      // Detect basic hardware capabilities
      await Promise.all([
        this.detectCPU(),
        this.detectMemory(),
        this.detectBattery(),
        this.detectDeviceType()
      ]);
      
      // Detect GPU capabilities (if not explicitly disabled by user)
      if (userHardwarePref !== 'disabled') {
        await this.detectGPU();
      }
      
      // Determine optimal backend based on capabilities and user preference
      await this.setOptimalBackend(userHardwarePref);
      
      this.initialized = true;
      return this.capabilities;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error initializing system monitor',
        error,
        context: 'SystemMonitor.init',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.ERROR
      });
      
      // Fall back to CPU mode on error
      this.capabilities.gpuActive = false;
      this.tfBackend = 'cpu';
      
      return this.capabilities;
    }
  }

  /**
   * Detect CPU information
   */
  async detectCPU() {
    try {
      // Unfortunately, detailed CPU info isn't available in browsers
      // We'll use the navigator object to get some basic information
      
      const cpuCores = navigator.hardwareConcurrency || 4;
      
      this.capabilities.cpuInfo = `${cpuCores} logical cores`;
      this.capabilities.concurrency = Math.max(1, Math.floor(cpuCores / 2));
      
      return this.capabilities.cpuInfo;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error detecting CPU',
        error,
        context: 'SystemMonitor.detectCPU',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.WARNING
      });
      
      // Use default values
      this.capabilities.cpuInfo = 'Unknown';
      this.capabilities.concurrency = 2;
      
      return this.capabilities.cpuInfo;
    }
  }

  /**
   * Detect GPU capabilities
   */
  async detectGPU() {
    try {
      // Check if WebGL is available
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        this.capabilities.gpuAvailable = false;
        return false;
      }
      
      // Get GPU info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        
        this.capabilities.gpuInfo = {
          vendor,
          renderer
        };
      } else {
        // Fallback if debug info isn't available
        this.capabilities.gpuInfo = {
          vendor: 'Unknown',
          renderer: 'WebGL-compatible GPU'
        };
      }
      
      // Check for WebGL 2 support
      const gl2 = canvas.getContext('webgl2');
      const hasWebGL2 = !!gl2;
      
      // Check compute capability
      try {
        // Test TensorFlow.js WebGL backend
        await tf.setBackend('webgl');
        
        // Create and run a small tensor operation to verify
        const a = tf.tensor1d([1, 2, 3]);
        const b = tf.tensor1d([4, 5, 6]);
        const result = tf.add(a, b);
        await result.data();
        
        // Clean up tensors
        tf.dispose([a, b, result]);
        
        // GPU is available for TensorFlow.js
        this.capabilities.gpuAvailable = true;
      } catch (tfError) {
        console.warn('GPU available but TensorFlow.js WebGL backend failed:', tfError);
        this.capabilities.gpuAvailable = false;
      }
      
      // Store WebGL version information
      this.capabilities.gpuInfo.webgl2Support = hasWebGL2;
      
      return this.capabilities.gpuAvailable;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error detecting GPU',
        error,
        context: 'SystemMonitor.detectGPU',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.WARNING
      });
      
      this.capabilities.gpuAvailable = false;
      this.capabilities.gpuInfo = null;
      
      return false;
    }
  }

  /**
   * Detect memory information
   */
  async detectMemory() {
    try {
      // Get memory info if available
      if (window.performance && window.performance.memory) {
        this.capabilities.memoryInfo = {
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          usedJSHeapSize: window.performance.memory.usedJSHeapSize
        };
      } else {
        // Approximate memory based on navigator.deviceMemory if available
        const deviceMemory = navigator.deviceMemory || 4; // Default to 4GB if not available
        
        this.capabilities.memoryInfo = {
          jsHeapSizeLimit: deviceMemory * 1024 * 1024 * 1024, // Approximate heap limit
          totalJSHeapSize: 0,
          usedJSHeapSize: 0
        };
      }
      
      return this.capabilities.memoryInfo;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error detecting memory',
        error,
        context: 'SystemMonitor.detectMemory',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.WARNING
      });
      
      // Use default values
      this.capabilities.memoryInfo = {
        jsHeapSizeLimit: 2147483648, // 2GB default
        totalJSHeapSize: 0,
        usedJSHeapSize: 0
      };
      
      return this.capabilities.memoryInfo;
    }
  }

  /**
   * Detect battery status
   */
  async detectBattery() {
    try {
      // Check if Battery API is available
      if (!navigator.getBattery) {
        return null;
      }
      
      const battery = await navigator.getBattery();
      
      this.capabilities.batteryStatus = {
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
      
      // Listen for battery changes
      battery.addEventListener('chargingchange', () => {
        this.capabilities.batteryStatus.charging = battery.charging;
        this.optimizeForBatteryStatus();
      });
      
      battery.addEventListener('levelchange', () => {
        this.capabilities.batteryStatus.level = battery.level;
        this.optimizeForBatteryStatus();
      });
      
      return this.capabilities.batteryStatus;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error detecting battery',
        error,
        context: 'SystemMonitor.detectBattery',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.WARNING
      });
      
      // Battery info not available
      this.capabilities.batteryStatus = null;
      
      return null;
    }
  }

  /**
   * Detect device type (desktop, mobile, tablet)
   */
  detectDeviceType() {
    try {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Check if mobile device
      const isMobile = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent);
      
      if (isMobile) {
        // Check if tablet
        const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
        
        this.capabilities.deviceType = isTablet ? 'tablet' : 'mobile';
      } else {
        this.capabilities.deviceType = 'desktop';
      }
      
      return this.capabilities.deviceType;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error detecting device type',
        error,
        context: 'SystemMonitor.detectDeviceType',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.WARNING
      });
      
      // Default to desktop
      this.capabilities.deviceType = 'desktop';
      
      return this.capabilities.deviceType;
    }
  }

  /**
   * Optimize based on battery status
   */
  optimizeForBatteryStatus() {
    // Only applies if battery information is available
    if (!this.capabilities.batteryStatus) {
      return;
    }
    
    const { charging, level } = this.capabilities.batteryStatus;
    
    // If battery is low and not charging, switch to CPU mode to save power
    if (!charging && level < 0.2) {
      this.switchToCPU();
    } else if (charging && this.capabilities.gpuAvailable) {
      // If charging and GPU is available, switch to GPU mode
      this.switchToGPU();
    }
  }

  /**
   * Set the optimal backend based on capabilities and user preference
   */
  async setOptimalBackend(userPreference) {
    try {
      // Determine the backend to use
      let useGPU = false;
      
      if (userPreference === 'enabled') {
        // User explicitly enabled GPU
        useGPU = this.capabilities.gpuAvailable;
      } else if (userPreference === 'disabled') {
        // User explicitly disabled GPU
        useGPU = false;
      } else {
        // Auto mode - decide based on device capabilities
        useGPU = this.capabilities.gpuAvailable &&
                 this.capabilities.deviceType === 'desktop' &&
                 (!this.capabilities.batteryStatus || 
                  this.capabilities.batteryStatus.charging || 
                  this.capabilities.batteryStatus.level > 0.3);
      }
      
      // Set the appropriate backend
      if (useGPU) {
        await this.switchToGPU();
      } else {
        await this.switchToCPU();
      }
      
      return this.tfBackend;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error setting optimal backend',
        error,
        context: 'SystemMonitor.setOptimalBackend',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.ERROR
      });
      
      // Fall back to CPU
      await this.switchToCPU();
      
      return this.tfBackend;
    }
  }

  /**
   * Switch to GPU mode
   */
  async switchToGPU() {
    try {
      if (!this.capabilities.gpuAvailable) {
        return false;
      }
      
      await tf.setBackend('webgl');
      this.tfBackend = 'webgl';
      this.capabilities.gpuActive = true;
      
      // Configure WebGL for performance
      const webglBackend = tf.getBackend();
      if (webglBackend === 'webgl') {
        // Get settings
        const settings = await this.storageManager.getSettings();
        const maxMemoryUsage = settings?.hardware?.maxMemoryUsage || 75;
        
        // Set memory usage limit
        tf.env().set('WEBGL_CPU_FORWARD', false);
        
        // Calculate memory limit based on device capability and user settings
        const memLimit = Math.floor(this.capabilities.memoryInfo.jsHeapSizeLimit * (maxMemoryUsage / 100));
        
        // Set memory limit
        tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
        tf.env().set('WEBGL_PACK', true);
        
        console.log('GPU mode activated with TensorFlow.js WebGL backend');
      }
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error switching to GPU mode',
        error,
        context: 'SystemMonitor.switchToGPU',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.ERROR
      });
      
      // Fall back to CPU
      await this.switchToCPU();
      
      return false;
    }
  }

  /**
   * Switch to CPU mode
   */
  async switchToCPU() {
    try {
      await tf.setBackend('cpu');
      this.tfBackend = 'cpu';
      this.capabilities.gpuActive = false;
      
      // Configure CPU for best performance
      tf.env().set('WEBGL_CPU_FORWARD', true);
      
      // Set number of threads based on available cores
      tf.env().set('WASM_HAS_SIMD_SUPPORT', true);
      tf.env().set('WASM_HAS_MULTITHREAD_SUPPORT', true);
      
      console.log('CPU mode activated with TensorFlow.js CPU backend');
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Error switching to CPU mode',
        error,
        context: 'SystemMonitor.switchToCPU',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.ERROR
      });
      
      return false;
    }
  }

  /**
   * Get current hardware capabilities
   */
  getCapabilities() {
    return { ...this.capabilities };
  }

  /**
   * Check if a specific capability meets minimum requirements
   */
  meetsRequirement(requirement) {
    switch (requirement) {
      case 'gpu':
        return this.capabilities.gpuAvailable;
        
      case 'webgl2':
        return this.capabilities.gpuInfo?.webgl2Support || false;
        
      case 'highMemory':
        return this.capabilities.memoryInfo.jsHeapSizeLimit >= 4294967296; // 4GB
        
      case 'multiCore':
        return navigator.hardwareConcurrency > 2;
        
      case 'desktop':
        return this.capabilities.deviceType === 'desktop';
        
      case 'mobileOrTablet':
        return this.capabilities.deviceType === 'mobile' || this.capabilities.deviceType === 'tablet';
        
      default:
        return false;
    }
  }
}

// Create singleton instance
export default SystemMonitor;
