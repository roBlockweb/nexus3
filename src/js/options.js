/**
 * Nexus Options Page Script
 * Handles the extension options UI and configuration.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from './core/error-handler.js';
import { StorageManager } from './core/storage-manager.js';
import { formatDate } from './ui/formatters.js';

// Initialize services
const storageManager = new StorageManager();

// Constants
const DEFAULT_SETTINGS = {
  captureMethod: 'auto',
  aiProcessingLevel: 'balanced',
  maxStorageSize: 50, // In MB
  autoCapture: false,
  notificationsEnabled: true,
  debugMode: false,
  keyboardShortcuts: {
    captureContent: 'Ctrl+Shift+S',
    quickSearch: 'Ctrl+Shift+F'
  },
  appearance: {
    theme: 'system',
    accentColor: '#4a90e2',
    fontSize: 'medium'
  },
  hardware: {
    useGPU: 'auto',
    maxMemoryUsage: 75 // Percentage
  }
};

// Current settings
let currentSettings = { ...DEFAULT_SETTINGS };
let errorLogs = [];

// Document load event listener
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize tabs
    initializeTabs();
    
    // Load saved settings
    await loadSettings();
    
    // Initialize form fields
    initializeFormFields();
    
    // Initialize action buttons
    initializeActionButtons();
    
    // Load error logs
    await loadErrorLogs();
    
    // Show success message if coming from save
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('saved') === 'true') {
      showStatusMessage('Settings saved successfully', 'success');
    }
  } catch (error) {
    errorHandler.handleError({
      message: 'Error initializing options page',
      error,
      context: 'options initialization',
      category: ErrorCategory.UI,
      level: ErrorLevel.ERROR
    });
    
    showStatusMessage('Failed to load settings', 'error');
  }
});

/**
 * Initialize tab navigation
 */
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Hide all tabs initially
  tabContents.forEach(content => {
    content.style.display = 'none';
  });
  
  // Show the first tab by default
  if (tabContents.length > 0) {
    tabContents[0].style.display = 'block';
    tabButtons[0]?.classList.add('active');
  }
  
  // Add click event listeners to tab buttons
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // Update active button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show selected tab content
      tabContents.forEach(content => {
        const contentId = content.getAttribute('data-tab');
        content.style.display = contentId === tabId ? 'block' : 'none';
      });
    });
  });
}

/**
 * Load saved settings
 */
async function loadSettings() {
  try {
    const savedSettings = await storageManager.getSettings();
    
    // Merge with defaults
    currentSettings = {
      ...DEFAULT_SETTINGS,
      ...savedSettings
    };
    
    return currentSettings;
  } catch (error) {
    errorHandler.handleError({
      message: 'Error loading settings',
      error,
      context: 'loadSettings',
      category: ErrorCategory.STORAGE,
      level: ErrorLevel.ERROR
    });
    
    throw error;
  }
}

/**
 * Load error logs
 */
async function loadErrorLogs() {
  try {
    // Send message to get error logs
    chrome.runtime.sendMessage(
      { action: 'getErrorLogs', data: { limit: 100 } },
      (response) => {
        if (response && response.success) {
          errorLogs = response.data || [];
          renderErrorLogs();
        }
      }
    );
  } catch (error) {
    console.error('Failed to load error logs:', error);
  }
}

/**
 * Initialize form fields with current settings
 */
function initializeFormFields() {
  // Capture Method
  const captureMethodEl = document.getElementById('capture-method');
  if (captureMethodEl) {
    captureMethodEl.value = currentSettings.captureMethod || 'auto';
  }
  
  // AI Processing Level
  const aiLevelEl = document.getElementById('ai-processing-level');
  if (aiLevelEl) {
    aiLevelEl.value = currentSettings.aiProcessingLevel || 'balanced';
  }
  
  // Storage Limit
  const storageLimitEl = document.getElementById('storage-limit');
  if (storageLimitEl) {
    storageLimitEl.value = currentSettings.maxStorageSize || 50;
  }
  
  // Auto Capture Toggle
  const autoCaptureEl = document.getElementById('auto-capture');
  if (autoCaptureEl) {
    autoCaptureEl.checked = currentSettings.autoCapture || false;
  }
  
  // Notifications Toggle
  const notificationsEl = document.getElementById('notifications-enabled');
  if (notificationsEl) {
    notificationsEl.checked = currentSettings.notificationsEnabled !== false;
  }
  
  // Debug Mode Toggle
  const debugModeEl = document.getElementById('debug-mode');
  if (debugModeEl) {
    debugModeEl.checked = currentSettings.debugMode || false;
  }
  
  // Theme selector
  const themeEl = document.getElementById('theme');
  if (themeEl) {
    themeEl.value = currentSettings.appearance?.theme || 'system';
  }
  
  // Accent Color
  const accentColorEl = document.getElementById('accent-color');
  if (accentColorEl) {
    accentColorEl.value = currentSettings.appearance?.accentColor || '#4a90e2';
  }
  
  // Font Size
  const fontSizeEl = document.getElementById('font-size');
  if (fontSizeEl) {
    fontSizeEl.value = currentSettings.appearance?.fontSize || 'medium';
  }
  
  // Hardware - GPU usage
  const useGpuEl = document.getElementById('use-gpu');
  if (useGpuEl) {
    useGpuEl.value = currentSettings.hardware?.useGPU || 'auto';
  }
  
  // Hardware - Memory usage
  const memoryUsageEl = document.getElementById('max-memory');
  if (memoryUsageEl) {
    memoryUsageEl.value = currentSettings.hardware?.maxMemoryUsage || 75;
  }
  
  // Update the memory usage label
  updateMemoryUsageLabel();
}

/**
 * Update the memory usage label
 */
function updateMemoryUsageLabel() {
  const memoryUsageEl = document.getElementById('max-memory');
  const memoryValueEl = document.getElementById('memory-value');
  
  if (memoryUsageEl && memoryValueEl) {
    memoryValueEl.textContent = `${memoryUsageEl.value}%`;
    
    memoryUsageEl.addEventListener('input', () => {
      memoryValueEl.textContent = `${memoryUsageEl.value}%`;
    });
  }
}

/**
 * Initialize action buttons
 */
function initializeActionButtons() {
  // Save button
  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.addEventListener('click', handleSaveSettings);
  }
  
  // Reset button
  const resetButton = document.getElementById('reset-button');
  if (resetButton) {
    resetButton.addEventListener('click', handleResetSettings);
  }
  
  // Clear data button
  const clearDataButton = document.getElementById('clear-data-button');
  if (clearDataButton) {
    clearDataButton.addEventListener('click', handleClearData);
  }
  
  // Export data button
  const exportButton = document.getElementById('export-data-button');
  if (exportButton) {
    exportButton.addEventListener('click', handleExportData);
  }
  
  // Import data button
  const importButton = document.getElementById('import-data-button');
  if (importButton) {
    importButton.addEventListener('click', handleImportData);
  }
  
  // Clear error logs button
  const clearLogsButton = document.getElementById('clear-logs-button');
  if (clearLogsButton) {
    clearLogsButton.addEventListener('click', handleClearErrorLogs);
  }
}

/**
 * Handle save settings action
 */
async function handleSaveSettings() {
  try {
    // Show saving indicator
    showStatusMessage('Saving settings...', 'info');
    
    // Collect settings from the form
    const newSettings = collectFormSettings();
    
    // Save settings
    await storageManager.saveSettings(newSettings);
    
    // Update current settings
    currentSettings = newSettings;
    
    // Notify other parts of the extension
    chrome.runtime.sendMessage({ action: 'settingsUpdated', data: newSettings });
    
    // Show success message
    showStatusMessage('Settings saved successfully!', 'success');
    
    // Reload the page to apply theme changes
    setTimeout(() => {
      window.location.href = 'options.html?saved=true';
    }, 1000);
  } catch (error) {
    errorHandler.handleError({
      message: 'Error saving settings',
      error,
      context: 'handleSaveSettings',
      category: ErrorCategory.STORAGE,
      level: ErrorLevel.ERROR
    });
    
    showStatusMessage('Failed to save settings', 'error');
  }
}

/**
 * Collect settings from the form
 */
function collectFormSettings() {
  const settings = { ...currentSettings };
  
  // Capture Method
  const captureMethodEl = document.getElementById('capture-method');
  if (captureMethodEl) {
    settings.captureMethod = captureMethodEl.value;
  }
  
  // AI Processing Level
  const aiLevelEl = document.getElementById('ai-processing-level');
  if (aiLevelEl) {
    settings.aiProcessingLevel = aiLevelEl.value;
  }
  
  // Storage Limit
  const storageLimitEl = document.getElementById('storage-limit');
  if (storageLimitEl) {
    settings.maxStorageSize = parseInt(storageLimitEl.value, 10);
  }
  
  // Auto Capture Toggle
  const autoCaptureEl = document.getElementById('auto-capture');
  if (autoCaptureEl) {
    settings.autoCapture = autoCaptureEl.checked;
  }
  
  // Notifications Toggle
  const notificationsEl = document.getElementById('notifications-enabled');
  if (notificationsEl) {
    settings.notificationsEnabled = notificationsEl.checked;
  }
  
  // Debug Mode Toggle
  const debugModeEl = document.getElementById('debug-mode');
  if (debugModeEl) {
    settings.debugMode = debugModeEl.checked;
  }
  
  // Theme
  const themeEl = document.getElementById('theme');
  if (themeEl) {
    settings.appearance = {
      ...settings.appearance,
      theme: themeEl.value
    };
  }
  
  // Accent Color
  const accentColorEl = document.getElementById('accent-color');
  if (accentColorEl) {
    settings.appearance = {
      ...settings.appearance,
      accentColor: accentColorEl.value
    };
  }
  
  // Font Size
  const fontSizeEl = document.getElementById('font-size');
  if (fontSizeEl) {
    settings.appearance = {
      ...settings.appearance,
      fontSize: fontSizeEl.value
    };
  }
  
  // Hardware - GPU usage
  const useGpuEl = document.getElementById('use-gpu');
  if (useGpuEl) {
    settings.hardware = {
      ...settings.hardware,
      useGPU: useGpuEl.value
    };
  }
  
  // Hardware - Memory usage
  const memoryUsageEl = document.getElementById('max-memory');
  if (memoryUsageEl) {
    settings.hardware = {
      ...settings.hardware,
      maxMemoryUsage: parseInt(memoryUsageEl.value, 10)
    };
  }
  
  return settings;
}

/**
 * Handle reset settings action
 */
async function handleResetSettings() {
  if (confirm('Reset all settings to default values? This cannot be undone.')) {
    try {
      // Reset to defaults
      await storageManager.saveSettings(DEFAULT_SETTINGS);
      
      // Update current settings
      currentSettings = { ...DEFAULT_SETTINGS };
      
      // Refresh the form
      initializeFormFields();
      
      // Notify other parts of the extension
      chrome.runtime.sendMessage({ action: 'settingsUpdated', data: currentSettings });
      
      // Show success message
      showStatusMessage('Settings reset to defaults', 'success');
    } catch (error) {
      errorHandler.handleError({
        message: 'Error resetting settings',
        error,
        context: 'handleResetSettings',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      showStatusMessage('Failed to reset settings', 'error');
    }
  }
}

/**
 * Handle clear data action
 */
async function handleClearData() {
  if (confirm('Clear all your knowledge data? This will remove all captured content and cannot be undone.')) {
    try {
      // Show clearing indicator
      showStatusMessage('Clearing data...', 'info');
      
      // Send message to clear all knowledge data
      chrome.runtime.sendMessage(
        { action: 'clearAllData' },
        (response) => {
          if (response && response.success) {
            showStatusMessage('All data cleared successfully', 'success');
          } else {
            showStatusMessage('Failed to clear data', 'error');
          }
        }
      );
    } catch (error) {
      errorHandler.handleError({
        message: 'Error clearing data',
        error,
        context: 'handleClearData',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      showStatusMessage('Failed to clear data', 'error');
    }
  }
}

/**
 * Handle export data action
 */
async function handleExportData() {
  try {
    // Show exporting indicator
    showStatusMessage('Preparing data export...', 'info');
    
    // Send message to export all data
    chrome.runtime.sendMessage(
      { action: 'exportAllData' },
      (response) => {
        if (response && response.success) {
          // Create a download link
          const blob = new Blob([JSON.stringify(response.data, null, 2)], {
            type: 'application/json'
          });
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nexus-data-export-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
          
          showStatusMessage('Data exported successfully', 'success');
        } else {
          showStatusMessage('Failed to export data', 'error');
        }
      }
    );
  } catch (error) {
    errorHandler.handleError({
      message: 'Error exporting data',
      error,
      context: 'handleExportData',
      category: ErrorCategory.STORAGE,
      level: ErrorLevel.ERROR
    });
    
    showStatusMessage('Failed to export data', 'error');
  }
}

/**
 * Handle import data action
 */
async function handleImportData() {
  try {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    
    // Handle file selection
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        // Read the file
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          try {
            // Parse the JSON
            const data = JSON.parse(e.target.result);
            
            // Validate the data format
            if (!data || !data.nodes || !Array.isArray(data.nodes)) {
              showStatusMessage('Invalid data format', 'error');
              return;
            }
            
            // Confirm import
            if (confirm(`Import ${data.nodes.length} knowledge nodes? This will merge with your existing data.`)) {
              // Show importing indicator
              showStatusMessage('Importing data...', 'info');
              
              // Send message to import data
              chrome.runtime.sendMessage(
                { action: 'importData', data },
                (response) => {
                  if (response && response.success) {
                    showStatusMessage('Data imported successfully', 'success');
                  } else {
                    showStatusMessage('Failed to import data', 'error');
                  }
                }
              );
            }
          } catch (error) {
            showStatusMessage('Error processing file: Invalid JSON', 'error');
          }
        };
        
        reader.readAsText(file);
      } catch (error) {
        showStatusMessage('Error reading file', 'error');
      }
    });
    
    // Trigger the file selection dialog
    fileInput.click();
  } catch (error) {
    errorHandler.handleError({
      message: 'Error importing data',
      error,
      context: 'handleImportData',
      category: ErrorCategory.STORAGE,
      level: ErrorLevel.ERROR
    });
    
    showStatusMessage('Failed to import data', 'error');
  }
}

/**
 * Handle clear error logs action
 */
async function handleClearErrorLogs() {
  if (confirm('Clear all error logs? This cannot be undone.')) {
    try {
      // Send message to clear error logs
      chrome.runtime.sendMessage(
        { action: 'clearErrorLogs' },
        (response) => {
          if (response && response.success) {
            // Clear the local error logs
            errorLogs = [];
            renderErrorLogs();
            
            showStatusMessage('Error logs cleared', 'success');
          } else {
            showStatusMessage('Failed to clear error logs', 'error');
          }
        }
      );
    } catch (error) {
      console.error('Error clearing error logs:', error);
      showStatusMessage('Failed to clear error logs', 'error');
    }
  }
}

/**
 * Render error logs in the UI
 */
function renderErrorLogs() {
  const logsContainer = document.getElementById('error-logs');
  if (!logsContainer) return;
  
  if (errorLogs.length === 0) {
    logsContainer.innerHTML = '<div class="empty-state">No error logs found.</div>';
    return;
  }
  
  // Create a table for the logs
  const table = document.createElement('table');
  table.className = 'logs-table';
  
  // Add table header
  table.innerHTML = `
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Level</th>
        <th>Category</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  `;
  
  const tbody = table.querySelector('tbody');
  
  // Add log entries
  errorLogs.forEach(log => {
    const row = document.createElement('tr');
    row.className = `log-row log-level-${log.level}`;
    
    row.innerHTML = `
      <td>${formatDate(log.timestamp)}</td>
      <td>${log.level.toUpperCase()}</td>
      <td>${log.category}</td>
      <td>${log.message}</td>
    `;
    
    // Add click event to show details
    row.addEventListener('click', () => {
      showLogDetails(log);
    });
    
    tbody.appendChild(row);
  });
  
  // Replace the container contents
  logsContainer.innerHTML = '';
  logsContainer.appendChild(table);
}

/**
 * Show detailed information about a log entry
 */
function showLogDetails(log) {
  // Create a modal for the log details
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  // Format the stack trace
  const stack = log.stack ? `<pre>${log.stack}</pre>` : '<em>No stack trace available</em>';
  
  // Format metadata
  let metadata = '<em>No metadata available</em>';
  if (log.metadata && Object.keys(log.metadata).length > 0) {
    metadata = '<pre>' + JSON.stringify(log.metadata, null, 2) + '</pre>';
  }
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close">&times;</span>
      <h3>Error Details</h3>
      
      <div class="detail-item">
        <strong>Timestamp:</strong> ${formatDate(log.timestamp)}
      </div>
      
      <div class="detail-item">
        <strong>Level:</strong> ${log.level.toUpperCase()}
      </div>
      
      <div class="detail-item">
        <strong>Category:</strong> ${log.category}
      </div>
      
      <div class="detail-item">
        <strong>Context:</strong> ${log.context || 'Unknown'}
      </div>
      
      <div class="detail-item">
        <strong>Message:</strong> ${log.message}
      </div>
      
      <div class="detail-item">
        <strong>Stack Trace:</strong>
        ${stack}
      </div>
      
      <div class="detail-item">
        <strong>Metadata:</strong>
        ${metadata}
      </div>
    </div>
  `;
  
  // Add to the document
  document.body.appendChild(modal);
  
  // Add close event
  const closeButton = modal.querySelector('.modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }
  
  // Close on click outside
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

/**
 * Show a status message to the user
 */
function showStatusMessage(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = 'block';
  
  // Hide after a delay
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}
