/**
 * Nexus Service Worker
 * Background script that manages the extension's lifecycle and core functionality.
 * 
 * Version 3.0.0
 */

import { StorageManager } from './core/storage-manager.js';
import { KnowledgeGraph } from './core/knowledge-graph.js';
import errorHandler, { ErrorCategory, ErrorLevel } from './core/error-handler.js';
import { ModelManager } from './ai/model-manager.js';
import { SystemMonitor } from './core/system-monitor.js';

// Initialize core services
const storageManager = new StorageManager();
const knowledgeGraph = new KnowledgeGraph(storageManager);
const modelManager = new ModelManager();
const systemMonitor = new SystemMonitor();

// Set up system monitoring and adapt to hardware capabilities
systemMonitor.init().then(() => {
  modelManager.adaptToHardware(systemMonitor.getCapabilities());
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const safeMessageHandler = errorHandler.createSafeFunction(
    async (message, sender) => {
      const { action, data } = message;
      
      switch (action) {
        case 'extractContent':
          // Extract content from the current page
          const result = await processExtraction(data, sender.tab);
          return { success: true, data: result };
          
        case 'searchKnowledge':
          // Search the knowledge graph
          const searchResults = await knowledgeGraph.search(data.query, data.options);
          return { success: true, data: searchResults };
          
        case 'getKnowledgeStats':
          // Get statistics about the knowledge graph
          const stats = await knowledgeGraph.getStatistics();
          return { success: true, data: stats };
          
        case 'generateInsights':
          // Generate AI insights from the knowledge graph
          const insights = await generateInsights(data);
          return { success: true, data: insights };
          
        case 'getSystemStatus':
          // Get current system status
          const status = {
            hardware: systemMonitor.getCapabilities(),
            models: modelManager.getLoadedModels(),
            storage: await storageManager.getUsageStatistics()
          };
          return { success: true, data: status };
          
        default:
          return { success: false, error: 'Unknown action' };
      }
    },
    'service-worker message handler',
    { category: ErrorCategory.EXTENSION, recoverable: true, fallbackValue: { success: false, error: 'Internal error' } }
  );
  
  // Process the message and send response
  safeMessageHandler(message, sender)
    .then(response => sendResponse(response))
    .catch(error => {
      console.error('Error in message handler:', error);
      sendResponse({ success: false, error: 'Internal error' });
    });
  
  // Return true to indicate that the response will be sent asynchronously
  return true;
});

/**
 * Process content extraction from a web page
 */
async function processExtraction(data, tab) {
  try {
    // Get the appropriate extractor based on page data
    const { getExtractor } = await import('./extractors/extractor-factory.js');
    const extractor = getExtractor(data);
    
    // Extract structured data
    const extractedData = await extractor.extract(data);
    
    // Process with AI to enhance and categorize
    const enhancedData = await modelManager.processExtractedContent(extractedData);
    
    // Store in knowledge graph
    const nodeId = await knowledgeGraph.addNode({
      title: extractedData.title || tab.title,
      url: tab.url,
      content: enhancedData,
      timestamp: Date.now(),
      source: 'webpage',
      tabId: tab.id
    });
    
    return {
      nodeId,
      summary: enhancedData.summary,
      categories: enhancedData.categories,
      entities: enhancedData.entities
    };
  } catch (error) {
    errorHandler.handleError({
      message: 'Failed to extract content',
      error,
      context: 'processExtraction',
      category: ErrorCategory.PARSING,
      level: ErrorLevel.ERROR,
      metadata: { url: tab?.url }
    });
    
    throw error;
  }
}

/**
 * Generate insights from the knowledge graph using AI
 */
async function generateInsights(data) {
  try {
    // Get relevant nodes from the knowledge graph
    const nodes = await knowledgeGraph.getNodesForInsight(data);
    
    // Generate insights using the AI model
    const insights = await modelManager.generateInsights(nodes, data.options);
    
    // Store the insights in the knowledge graph if requested
    if (data.saveInsights) {
      await knowledgeGraph.addInsightNode(insights);
    }
    
    return insights;
  } catch (error) {
    errorHandler.handleError({
      message: 'Failed to generate insights',
      error,
      context: 'generateInsights',
      category: ErrorCategory.AI,
      level: ErrorLevel.ERROR,
      metadata: data
    });
    
    throw error;
  }
}

// Handle extension installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason === 'install') {
      // First-time installation
      await storageManager.initializeDefaultSettings();
      await showOnboarding();
    } else if (details.reason === 'update') {
      // Extension was updated
      await storageManager.migrateDataIfNeeded(details.previousVersion);
      
      // Show update notes for major/minor version changes, not for patch versions
      const previousVersion = details.previousVersion.split('.');
      const currentVersion = chrome.runtime.getManifest().version.split('.');
      
      if (previousVersion[0] !== currentVersion[0] || previousVersion[1] !== currentVersion[1]) {
        await showUpdateNotes(details.previousVersion);
      }
    }
  } catch (error) {
    errorHandler.handleError({
      message: 'Error during extension installation/update',
      error,
      context: 'onInstalled handler',
      category: ErrorCategory.EXTENSION,
      level: ErrorLevel.ERROR,
      metadata: { details }
    });
  }
});

/**
 * Show the onboarding page for new users
 */
async function showOnboarding() {
  const url = chrome.runtime.getURL('html/onboarding.html');
  await chrome.tabs.create({ url });
}

/**
 * Show update notes when extension is updated
 */
async function showUpdateNotes(previousVersion) {
  const url = chrome.runtime.getURL(`html/update-notes.html?from=${previousVersion}`);
  await chrome.tabs.create({ url });
}

// Log that the service worker has started
console.log(`Nexus service worker initialized (v${chrome.runtime.getManifest().version})`);
