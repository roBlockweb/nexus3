/**
 * Nexus Content Script
 * Runs on web pages to extract knowledge and provide in-page functionality.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from './core/error-handler.js';
import { getPageMetadata } from './extractors/page-metadata.js';
import { getPageContent } from './extractors/page-content.js';

// Initialize error handler
errorHandler.setDebugMode(false); // Set to true for development

// Store whether the mini-UI has been injected
let uiInjected = false;

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const safeMessageHandler = errorHandler.createSafeFunction(
    async (message) => {
      const { action, data } = message;
      
      switch (action) {
        case 'extractPageContent':
          // Extract content from the current page
          const content = await extractPageContent();
          return { success: true, data: content };
          
        case 'showMiniUI':
          // Show the mini UI for quick actions
          await injectMiniUI();
          return { success: true };
          
        case 'hideMiniUI':
          // Hide the mini UI
          removeMiniUI();
          return { success: true };
          
        case 'highlightContent':
          // Highlight specific content on the page
          highlightContent(data.selectors, data.color);
          return { success: true };
          
        default:
          return { success: false, error: 'Unknown action' };
      }
    },
    'content-script message handler',
    { category: ErrorCategory.EXTENSION, recoverable: true, fallbackValue: { success: false, error: 'Internal error' } }
  );
  
  // Process message and send response
  safeMessageHandler(message)
    .then(response => sendResponse(response))
    .catch(error => {
      console.error('Error in content script:', error);
      sendResponse({ success: false, error: 'Internal error' });
    });
  
  // Return true to indicate async response
  return true;
});

/**
 * Extract content from the current page
 */
async function extractPageContent() {
  try {
    // Get metadata like title, description, author, etc.
    const metadata = getPageMetadata();
    
    // Get the main content of the page
    const content = getPageContent();
    
    return {
      url: window.location.href,
      metadata,
      content,
      timestamp: Date.now()
    };
  } catch (error) {
    errorHandler.handleError({
      message: 'Failed to extract page content',
      error,
      context: 'extractPageContent',
      category: ErrorCategory.PARSING,
      level: ErrorLevel.ERROR,
      metadata: { url: window.location.href }
    });
    
    throw error;
  }
}

/**
 * Inject the mini UI for quick actions
 */
async function injectMiniUI() {
  if (uiInjected) return;
  
  try {
    // Create the mini UI container
    const container = document.createElement('div');
    container.id = 'nexus-mini-ui';
    container.className = 'nexus-ui-container';
    
    // Load and inject the mini UI HTML
    const response = await fetch(chrome.runtime.getURL('html/mini-ui.html'));
    const html = await response.text();
    container.innerHTML = html;
    
    // Inject CSS
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = chrome.runtime.getURL('css/mini-ui.css');
    document.head.appendChild(style);
    
    // Add the container to the page
    document.body.appendChild(container);
    
    // Set up event handlers for the mini UI
    setupMiniUIEvents(container);
    
    uiInjected = true;
  } catch (error) {
    errorHandler.handleError({
      message: 'Failed to inject mini UI',
      error,
      context: 'injectMiniUI',
      category: ErrorCategory.UI,
      level: ErrorLevel.ERROR
    });
    
    throw error;
  }
}

/**
 * Set up event handlers for the mini UI
 */
function setupMiniUIEvents(container) {
  // Close button
  const closeButton = container.querySelector('.nexus-close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      removeMiniUI();
    });
  }
  
  // Capture button
  const captureButton = container.querySelector('.nexus-capture-button');
  if (captureButton) {
    captureButton.addEventListener('click', async () => {
      try {
        // Extract page content
        const content = await extractPageContent();
        
        // Send to background script for processing
        chrome.runtime.sendMessage({
          action: 'extractContent',
          data: content
        }, (response) => {
          if (response && response.success) {
            // Show success message
            showNotification('Content captured successfully', 'success');
          } else {
            // Show error message
            showNotification('Failed to capture content', 'error');
          }
        });
      } catch (error) {
        errorHandler.handleError({
          message: 'Error in capture button handler',
          error,
          context: 'captureButtonHandler',
          category: ErrorCategory.UI,
          level: ErrorLevel.ERROR
        });
        
        showNotification('An error occurred', 'error');
      }
    });
  }
  
  // Other UI event handlers can be added here
}

/**
 * Remove the mini UI from the page
 */
function removeMiniUI() {
  const container = document.getElementById('nexus-mini-ui');
  if (container) {
    container.remove();
    uiInjected = false;
  }
  
  // Also remove the CSS
  const style = document.querySelector('link[href*="mini-ui.css"]');
  if (style) {
    style.remove();
  }
}

/**
 * Show a notification message
 */
function showNotification(message, type = 'info') {
  // Check if a notification container exists, create if not
  let notifContainer = document.getElementById('nexus-notification-container');
  
  if (!notifContainer) {
    notifContainer = document.createElement('div');
    notifContainer.id = 'nexus-notification-container';
    document.body.appendChild(notifContainer);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `nexus-notification nexus-notification-${type}`;
  notification.textContent = message;
  
  // Add to container
  notifContainer.appendChild(notification);
  
  // Remove after a delay
  setTimeout(() => {
    notification.classList.add('nexus-notification-hide');
    
    // Remove from DOM after animation
    setTimeout(() => {
      notification.remove();
      
      // Remove container if empty
      if (notifContainer.children.length === 0) {
        notifContainer.remove();
      }
    }, 300);
  }, 3000);
}

/**
 * Highlight content on the page
 */
function highlightContent(selectors, color = 'rgba(255, 255, 0, 0.3)') {
  try {
    if (!Array.isArray(selectors)) {
      selectors = [selectors];
    }
    
    // Create a style element for the highlights
    const highlightStyle = document.createElement('style');
    highlightStyle.id = 'nexus-highlights';
    
    // Generate CSS for highlights
    const css = selectors.map((selector, index) => {
      return `.nexus-highlight-${index} { background-color: ${color} !important; transition: background-color 0.3s ease; }`;
    }).join('\n');
    
    highlightStyle.textContent = css;
    document.head.appendChild(highlightStyle);
    
    // Apply highlight classes to matching elements
    selectors.forEach((selector, index) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.classList.add(`nexus-highlight-${index}`);
        });
      } catch (e) {
        console.warn(`Invalid selector: ${selector}`, e);
      }
    });
    
    // Remove highlights after a delay
    setTimeout(() => {
      removeHighlights();
    }, 5000);
  } catch (error) {
    errorHandler.handleError({
      message: 'Failed to highlight content',
      error,
      context: 'highlightContent',
      category: ErrorCategory.UI,
      level: ErrorLevel.WARNING,
      metadata: { selectors }
    });
  }
}

/**
 * Remove all highlights from the page
 */
function removeHighlights() {
  // Remove the highlight style
  const highlightStyle = document.getElementById('nexus-highlights');
  if (highlightStyle) {
    highlightStyle.remove();
  }
  
  // Remove all highlight classes
  const highlightedElements = document.querySelectorAll('[class*="nexus-highlight-"]');
  highlightedElements.forEach(el => {
    const classList = el.className.split(' ');
    const newClassList = classList.filter(cls => !cls.startsWith('nexus-highlight-'));
    el.className = newClassList.join(' ');
  });
}

// Add keyboard shortcut listener for quick capture (Ctrl+Shift+S)
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'S') {
    chrome.runtime.sendMessage({ action: 'extractContent', data: { url: window.location.href } });
    
    // Show a quick notification
    showNotification('Capturing page content...', 'info');
    
    // Prevent the default browser save dialog
    event.preventDefault();
  }
});

// Log that the content script has initialized
console.log('Nexus content script initialized');
