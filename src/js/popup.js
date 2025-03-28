/**
 * Nexus Popup Script
 * Handles the extension popup UI and functionality.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from './core/error-handler.js';
import { StorageManager } from './core/storage-manager.js';
import { formatDate, truncateText } from './ui/formatters.js';

// Initialize services
const storageManager = new StorageManager();

// Initialize UI state
let activeTab = 'home';
let searchQuery = '';
let recentNodes = [];
let systemStatus = null;

// Document load event listener
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize UI components
    initializeTabNavigation();
    initializeButtons();
    initializeSearchField();
    
    // Load initial data
    await loadRecentNodes();
    await loadSystemStatus();
    
    // Show the home tab
    showTab('home');
  } catch (error) {
    errorHandler.handleError({
      message: 'Error initializing popup',
      error,
      context: 'popup initialization',
      category: ErrorCategory.UI,
      level: ErrorLevel.ERROR
    });
    
    // Show error in the UI
    showErrorMessage('Failed to initialize the popup. Please try again.');
  }
});

/**
 * Initialize tab navigation
 */
function initializeTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      showTab(tabId);
    });
  });
}

/**
 * Show a specific tab
 */
function showTab(tabId) {
  // Update active tab
  activeTab = tabId;
  
  // Update tab button states
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    const buttonTabId = button.getAttribute('data-tab');
    button.classList.toggle('active', buttonTabId === tabId);
  });
  
  // Show the selected tab content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    const contentTabId = content.getAttribute('data-tab');
    content.style.display = contentTabId === tabId ? 'block' : 'none';
  });
  
  // Perform tab-specific initialization
  if (tabId === 'home') {
    loadRecentNodes();
  } else if (tabId === 'search') {
    focusSearchField();
  } else if (tabId === 'status') {
    loadSystemStatus();
  }
}

/**
 * Initialize action buttons
 */
function initializeButtons() {
  // Capture page button
  const captureButton = document.getElementById('capture-button');
  if (captureButton) {
    captureButton.addEventListener('click', handleCapturePage);
  }
  
  // View knowledge map button
  const mapButton = document.getElementById('knowledge-map-button');
  if (mapButton) {
    mapButton.addEventListener('click', handleViewKnowledgeMap);
  }
  
  // Open options button
  const optionsButton = document.getElementById('options-button');
  if (optionsButton) {
    optionsButton.addEventListener('click', handleOpenOptions);
  }
  
  // Generate insights button
  const insightsButton = document.getElementById('generate-insights-button');
  if (insightsButton) {
    insightsButton.addEventListener('click', handleGenerateInsights);
  }
}

/**
 * Initialize search functionality
 */
function initializeSearchField() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      searchQuery = event.target.value.trim();
    });
    
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && searchQuery) {
        handleSearch();
      }
    });
    
    const searchButton = document.getElementById('search-button');
    if (searchButton) {
      searchButton.addEventListener('click', () => {
        if (searchQuery) {
          handleSearch();
        }
      });
    }
  }
}

/**
 * Focus the search input field
 */
function focusSearchField() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.focus();
  }
}

/**
 * Load recent knowledge nodes
 */
async function loadRecentNodes() {
  try {
    const recentNodesContainer = document.getElementById('recent-nodes');
    if (!recentNodesContainer) return;
    
    // Show loading indicator
    recentNodesContainer.innerHTML = '<div class="loading">Loading recent data...</div>';
    
    // Get recent nodes from the background script
    chrome.runtime.sendMessage(
      { action: 'searchKnowledge', data: { limit: 5, sortBy: 'timestamp', order: 'desc' } },
      (response) => {
        if (response && response.success) {
          recentNodes = response.data || [];
          renderRecentNodes(recentNodesContainer);
        } else {
          recentNodesContainer.innerHTML = '<div class="error">Failed to load recent data.</div>';
        }
      }
    );
  } catch (error) {
    errorHandler.handleError({
      message: 'Error loading recent nodes',
      error,
      context: 'loadRecentNodes',
      category: ErrorCategory.UI,
      level: ErrorLevel.ERROR
    });
    
    const recentNodesContainer = document.getElementById('recent-nodes');
    if (recentNodesContainer) {
      recentNodesContainer.innerHTML = '<div class="error">Failed to load recent data.</div>';
    }
  }
}

/**
 * Render recent knowledge nodes in the UI
 */
function renderRecentNodes(container) {
  if (recentNodes.length === 0) {
    container.innerHTML = '<div class="empty-state">No captured content yet. Use the "Capture Page" button to start building your knowledge network.</div>';
    return;
  }
  
  const nodesList = document.createElement('ul');
  nodesList.className = 'nodes-list';
  
  recentNodes.forEach(node => {
    const nodeItem = document.createElement('li');
    nodeItem.className = 'node-item';
    
    // Create node content
    nodeItem.innerHTML = `
      <div class="node-title">${truncateText(node.title, 40)}</div>
      <div class="node-meta">
        <span class="node-date">${formatDate(node.timestamp)}</span>
        <span class="node-categories">${(node.categories || []).join(', ')}</span>
      </div>
    `;
    
    // Add click event to open the node
    nodeItem.addEventListener('click', () => {
      openNodeInViewer(node.id);
    });
    
    nodesList.appendChild(nodeItem);
  });
  
  container.innerHTML = '';
  container.appendChild(nodesList);
}

/**
 * Load system status
 */
async function loadSystemStatus() {
  try {
    const statusContainer = document.getElementById('system-status');
    if (!statusContainer) return;
    
    // Show loading indicator
    statusContainer.innerHTML = '<div class="loading">Loading system status...</div>';
    
    // Get system status from the background script
    chrome.runtime.sendMessage(
      { action: 'getSystemStatus' },
      (response) => {
        if (response && response.success) {
          systemStatus = response.data || {};
          renderSystemStatus(statusContainer);
        } else {
          statusContainer.innerHTML = '<div class="error">Failed to load system status.</div>';
        }
      }
    );
  } catch (error) {
    errorHandler.handleError({
      message: 'Error loading system status',
      error,
      context: 'loadSystemStatus',
      category: ErrorCategory.UI,
      level: ErrorLevel.ERROR
    });
    
    const statusContainer = document.getElementById('system-status');
    if (statusContainer) {
      statusContainer.innerHTML = '<div class="error">Failed to load system status.</div>';
    }
  }
}

/**
 * Render system status in the UI
 */
function renderSystemStatus(container) {
  if (!systemStatus) {
    container.innerHTML = '<div class="error">System status information not available.</div>';
    return;
  }
  
  const { hardware, models, storage } = systemStatus;
  
  container.innerHTML = `
    <div class="status-section">
      <h3>Hardware Capabilities</h3>
      <div class="status-item">
        <span class="status-label">Processor:</span>
        <span class="status-value">${hardware.cpuInfo || 'Unknown'}</span>
      </div>
      <div class="status-item">
        <span class="status-label">GPU Available:</span>
        <span class="status-value">${hardware.gpuAvailable ? 'Yes' : 'No'}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Current Mode:</span>
        <span class="status-value">${hardware.gpuActive ? 'GPU Accelerated' : 'CPU Only'}</span>
      </div>
    </div>
    
    <div class="status-section">
      <h3>Storage Usage</h3>
      <div class="status-item">
        <span class="status-label">Knowledge Nodes:</span>
        <span class="status-value">${storage.nodeCount || 0}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Storage Used:</span>
        <span class="status-value">${formatStorageSize(storage.bytesUsed || 0)}</span>
      </div>
    </div>
    
    <div class="status-section">
      <h3>AI Models</h3>
      <ul class="model-list">
        ${renderModelsList(models)}
      </ul>
    </div>
  `;
}

/**
 * Render a list of loaded AI models
 */
function renderModelsList(models) {
  if (!models || models.length === 0) {
    return '<li class="model-item">No models loaded</li>';
  }
  
  return models.map(model => `
    <li class="model-item">
      <span class="model-name">${model.name}</span>
      <span class="model-version">v${model.version}</span>
      <span class="model-size">${formatStorageSize(model.sizeBytes)}</span>
    </li>
  `).join('');
}

/**
 * Format storage size in bytes to a human-readable format
 */
function formatStorageSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Handle capture page action
 */
async function handleCapturePage() {
  try {
    // Show loading state
    const captureButton = document.getElementById('capture-button');
    if (captureButton) {
      captureButton.disabled = true;
      captureButton.textContent = 'Capturing...';
    }
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    // Send message to the content script to extract page content
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'extractPageContent' },
      (contentResponse) => {
        if (chrome.runtime.lastError) {
          // Handle case where content script is not available
          showStatusMessage('Unable to access page content. Refresh the page and try again.', 'error');
          resetCaptureButton();
          return;
        }
        
        if (contentResponse && contentResponse.success) {
          // Send the extracted content to the background script
          chrome.runtime.sendMessage(
            { 
              action: 'extractContent', 
              data: contentResponse.data 
            },
            (processingResponse) => {
              if (processingResponse && processingResponse.success) {
                showStatusMessage('Page captured successfully!', 'success');
                
                // Refresh the recent nodes
                loadRecentNodes();
              } else {
                showStatusMessage('Failed to process page content.', 'error');
              }
              
              resetCaptureButton();
            }
          );
        } else {
          showStatusMessage('Failed to extract page content.', 'error');
          resetCaptureButton();
        }
      }
    );
  } catch (error) {
    errorHandler.handleError({
      message: 'Error capturing page',
      error,
      context: 'handleCapturePage',
      category: ErrorCategory.UI,
      level: ErrorLevel.ERROR
    });
    
    showStatusMessage('Error capturing page content.', 'error');
    resetCaptureButton();
  }
}

/**
 * Reset the capture button to its default state
 */
function resetCaptureButton() {
  const captureButton = document.getElementById('capture-button');
  if (captureButton) {
    captureButton.disabled = false;
    captureButton.textContent = 'Capture Page';
  }
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

/**
 * Show an error message in the UI
 */
function showErrorMessage(message) {
  const errorContainer = document.getElementById('error-container');
  if (!errorContainer) return;
  
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
}

/**
 * Handle view knowledge map action
 */
function handleViewKnowledgeMap() {
  // Open the knowledge map page in a new tab
  chrome.tabs.create({ url: chrome.runtime.getURL('html/knowledge-map.html') });
}

/**
 * Handle open options action
 */
function handleOpenOptions() {
  chrome.runtime.openOptionsPage();
}

/**
 * Handle generate insights action
 */
function handleGenerateInsights() {
  // Open the insights page
  chrome.tabs.create({ url: chrome.runtime.getURL('html/insights.html') });
}

/**
 * Handle search action
 */
function handleSearch() {
  if (!searchQuery) return;
  
  // Open the search results page with the query
  chrome.tabs.create({ 
    url: chrome.runtime.getURL(`html/search.html?q=${encodeURIComponent(searchQuery)}`) 
  });
}

/**
 * Open a knowledge node in the viewer
 */
function openNodeInViewer(nodeId) {
  chrome.tabs.create({ 
    url: chrome.runtime.getURL(`html/node-viewer.html?id=${encodeURIComponent(nodeId)}`) 
  });
}
