/**
 * Nexus Storage Manager
 * Provides centralized storage management for all Nexus components.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from './error-handler.js';

// Define storage keys
const STORAGE_KEYS = {
  SETTINGS: 'nexus_settings',
  KNOWLEDGE_NODES: 'nexus_knowledge_nodes',
  KNOWLEDGE_EDGES: 'nexus_knowledge_edges',
  KNOWLEDGE_META: 'nexus_knowledge_meta',
  MODELS_INFO: 'nexus_models_info',
  DATA_VERSION: 'nexus_data_version'
};

// Current data version for migrations
const CURRENT_DATA_VERSION = 1;

/**
 * Storage Manager class
 * Handles saving, loading, and migrating data using Chrome's storage API
 */
export class StorageManager {
  constructor() {
    // Use sync storage for settings, local storage for everything else
    this.syncStorage = chrome.storage.sync;
    this.localStorage = chrome.storage.local;
    
    // Cache settings for faster access
    this.settingsCache = null;
    
    // Bind methods
    this.getSettings = this.getSettings.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
    this.getKnowledgeNodes = this.getKnowledgeNodes.bind(this);
    this.getKnowledgeEdges = this.getKnowledgeEdges.bind(this);
    this.saveKnowledgeNode = this.saveKnowledgeNode.bind(this);
    this.saveKnowledgeEdge = this.saveKnowledgeEdge.bind(this);
    this.deleteKnowledgeNode = this.deleteKnowledgeNode.bind(this);
    this.deleteKnowledgeEdge = this.deleteKnowledgeEdge.bind(this);
    this.clearAllData = this.clearAllData.bind(this);
    this.exportAllData = this.exportAllData.bind(this);
    this.importData = this.importData.bind(this);
    this.getUsageStatistics = this.getUsageStatistics.bind(this);
    this.migrateDataIfNeeded = this.migrateDataIfNeeded.bind(this);
  }

  /**
   * Initialize default settings
   */
  async initializeDefaultSettings() {
    try {
      const settings = await this.getSettings();
      
      // If settings already exist, don't override
      if (settings && Object.keys(settings).length > 0) {
        return settings;
      }
      
      // Define default settings
      const defaultSettings = {
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
      
      // Save default settings
      await this.saveSettings(defaultSettings);
      
      // Initialize knowledge metadata
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_META]: {
          nodeCount: 0,
          edgeCount: 0,
          lastUpdated: Date.now(),
          version: CURRENT_DATA_VERSION
        }
      });
      
      // Set data version
      await this.localStorage.set({
        [STORAGE_KEYS.DATA_VERSION]: CURRENT_DATA_VERSION
      });
      
      return defaultSettings;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to initialize default settings',
        error,
        context: 'StorageManager.initializeDefaultSettings',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      throw error;
    }
  }

  /**
   * Get settings from storage
   */
  async getSettings() {
    try {
      // Return cached settings if available
      if (this.settingsCache) {
        return { ...this.settingsCache };
      }
      
      // Get settings from storage
      const result = await this.syncStorage.get(STORAGE_KEYS.SETTINGS);
      const settings = result[STORAGE_KEYS.SETTINGS] || {};
      
      // Cache settings
      this.settingsCache = { ...settings };
      
      return settings;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to get settings',
        error,
        context: 'StorageManager.getSettings',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      throw error;
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings(settings) {
    try {
      // Validate settings object
      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings object');
      }
      
      // Save to storage
      await this.syncStorage.set({
        [STORAGE_KEYS.SETTINGS]: settings
      });
      
      // Update cache
      this.settingsCache = { ...settings };
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to save settings',
        error,
        context: 'StorageManager.saveSettings',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { settings }
      });
      
      throw error;
    }
  }

  /**
   * Get all knowledge nodes
   */
  async getKnowledgeNodes() {
    try {
      const result = await this.localStorage.get(STORAGE_KEYS.KNOWLEDGE_NODES);
      return result[STORAGE_KEYS.KNOWLEDGE_NODES] || [];
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to get knowledge nodes',
        error,
        context: 'StorageManager.getKnowledgeNodes',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      throw error;
    }
  }

  /**
   * Get all knowledge edges
   */
  async getKnowledgeEdges() {
    try {
      const result = await this.localStorage.get(STORAGE_KEYS.KNOWLEDGE_EDGES);
      return result[STORAGE_KEYS.KNOWLEDGE_EDGES] || [];
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to get knowledge edges',
        error,
        context: 'StorageManager.getKnowledgeEdges',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      throw error;
    }
  }

  /**
   * Save a knowledge node
   */
  async saveKnowledgeNode(node) {
    try {
      // Validate node
      if (!node || !node.id) {
        throw new Error('Invalid knowledge node');
      }
      
      // Get existing nodes
      const nodes = await this.getKnowledgeNodes();
      
      // Check if node already exists
      const existingIndex = nodes.findIndex(n => n.id === node.id);
      
      if (existingIndex >= 0) {
        // Update existing node
        nodes[existingIndex] = {
          ...nodes[existingIndex],
          ...node,
          updatedAt: Date.now()
        };
      } else {
        // Add new node with creation timestamp
        nodes.push({
          ...node,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        
        // Update metadata
        await this.updateKnowledgeMeta({ nodeCount: nodes.length });
      }
      
      // Save to storage
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_NODES]: nodes
      });
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to save knowledge node',
        error,
        context: 'StorageManager.saveKnowledgeNode',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { nodeId: node?.id }
      });
      
      throw error;
    }
  }

  /**
   * Save a knowledge edge (connection between nodes)
   */
  async saveKnowledgeEdge(edge) {
    try {
      // Validate edge
      if (!edge || !edge.id || !edge.source || !edge.target) {
        throw new Error('Invalid knowledge edge');
      }
      
      // Get existing edges
      const edges = await this.getKnowledgeEdges();
      
      // Check if edge already exists
      const existingIndex = edges.findIndex(e => e.id === edge.id);
      
      if (existingIndex >= 0) {
        // Update existing edge
        edges[existingIndex] = {
          ...edges[existingIndex],
          ...edge,
          updatedAt: Date.now()
        };
      } else {
        // Add new edge with creation timestamp
        edges.push({
          ...edge,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        
        // Update metadata
        await this.updateKnowledgeMeta({ edgeCount: edges.length });
      }
      
      // Save to storage
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_EDGES]: edges
      });
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to save knowledge edge',
        error,
        context: 'StorageManager.saveKnowledgeEdge',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { edgeId: edge?.id }
      });
      
      throw error;
    }
  }

  /**
   * Delete a knowledge node
   */
  async deleteKnowledgeNode(nodeId) {
    try {
      // Get existing nodes
      const nodes = await this.getKnowledgeNodes();
      
      // Filter out the node to delete
      const filteredNodes = nodes.filter(node => node.id !== nodeId);
      
      // If no nodes were removed, node doesn't exist
      if (filteredNodes.length === nodes.length) {
        return false;
      }
      
      // Save filtered nodes
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_NODES]: filteredNodes
      });
      
      // Update metadata
      await this.updateKnowledgeMeta({ nodeCount: filteredNodes.length });
      
      // Remove any edges connected to this node
      await this.deleteEdgesForNode(nodeId);
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to delete knowledge node',
        error,
        context: 'StorageManager.deleteKnowledgeNode',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { nodeId }
      });
      
      throw error;
    }
  }

  /**
   * Delete a knowledge edge
   */
  async deleteKnowledgeEdge(edgeId) {
    try {
      // Get existing edges
      const edges = await this.getKnowledgeEdges();
      
      // Filter out the edge to delete
      const filteredEdges = edges.filter(edge => edge.id !== edgeId);
      
      // If no edges were removed, edge doesn't exist
      if (filteredEdges.length === edges.length) {
        return false;
      }
      
      // Save filtered edges
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_EDGES]: filteredEdges
      });
      
      // Update metadata
      await this.updateKnowledgeMeta({ edgeCount: filteredEdges.length });
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to delete knowledge edge',
        error,
        context: 'StorageManager.deleteKnowledgeEdge',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { edgeId }
      });
      
      throw error;
    }
  }

  /**
   * Delete all edges connected to a node
   */
  async deleteEdgesForNode(nodeId) {
    try {
      // Get existing edges
      const edges = await this.getKnowledgeEdges();
      
      // Filter out edges connected to the node
      const filteredEdges = edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      );
      
      // If no edges were removed, no connections to this node
      if (filteredEdges.length === edges.length) {
        return false;
      }
      
      // Save filtered edges
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_EDGES]: filteredEdges
      });
      
      // Update metadata
      await this.updateKnowledgeMeta({ edgeCount: filteredEdges.length });
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to delete edges for node',
        error,
        context: 'StorageManager.deleteEdgesForNode',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { nodeId }
      });
      
      throw error;
    }
  }

  /**
   * Update knowledge metadata
   */
  async updateKnowledgeMeta(updates) {
    try {
      // Get current metadata
      const result = await this.localStorage.get(STORAGE_KEYS.KNOWLEDGE_META);
      const meta = result[STORAGE_KEYS.KNOWLEDGE_META] || {
        nodeCount: 0,
        edgeCount: 0,
        lastUpdated: Date.now(),
        version: CURRENT_DATA_VERSION
      };
      
      // Update metadata
      const updatedMeta = {
        ...meta,
        ...updates,
        lastUpdated: Date.now()
      };
      
      // Save updated metadata
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_META]: updatedMeta
      });
      
      return updatedMeta;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to update knowledge metadata',
        error,
        context: 'StorageManager.updateKnowledgeMeta',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      // Don't throw error for metadata updates
      return null;
    }
  }

  /**
   * Clear all knowledge data
   */
  async clearAllData() {
    try {
      // Clear knowledge nodes and edges
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_NODES]: [],
        [STORAGE_KEYS.KNOWLEDGE_EDGES]: []
      });
      
      // Reset metadata
      await this.updateKnowledgeMeta({
        nodeCount: 0,
        edgeCount: 0
      });
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to clear all data',
        error,
        context: 'StorageManager.clearAllData',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      throw error;
    }
  }

  /**
   * Export all knowledge data
   */
  async exportAllData() {
    try {
      // Get all data
      const [nodes, edges, meta, settings] = await Promise.all([
        this.getKnowledgeNodes(),
        this.getKnowledgeEdges(),
        this.localStorage.get(STORAGE_KEYS.KNOWLEDGE_META),
        this.getSettings()
      ]);
      
      // Create export object
      const exportData = {
        nodes,
        edges,
        meta: meta[STORAGE_KEYS.KNOWLEDGE_META] || {},
        settings,
        exportDate: Date.now(),
        version: CURRENT_DATA_VERSION
      };
      
      return exportData;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to export data',
        error,
        context: 'StorageManager.exportAllData',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      throw error;
    }
  }

  /**
   * Import knowledge data
   */
  async importData(importData) {
    try {
      // Validate import data
      if (!importData || !importData.nodes || !Array.isArray(importData.nodes)) {
        throw new Error('Invalid import data');
      }
      
      // Get existing data
      const [existingNodes, existingEdges] = await Promise.all([
        this.getKnowledgeNodes(),
        this.getKnowledgeEdges()
      ]);
      
      // Create node ID map for deduplication
      const existingNodeIds = new Set(existingNodes.map(node => node.id));
      
      // Filter out duplicate nodes
      const newNodes = importData.nodes.filter(node => !existingNodeIds.has(node.id));
      
      // Create edge ID map for deduplication
      const existingEdgeIds = new Set(existingEdges.map(edge => edge.id));
      
      // Filter out duplicate edges and edges referencing non-existent nodes
      const newEdges = (importData.edges || []).filter(edge => {
        // Check if edge already exists
        if (existingEdgeIds.has(edge.id)) {
          return false;
        }
        
        // Check if source and target nodes exist
        const sourceExists = existingNodeIds.has(edge.source) || 
                            newNodes.some(node => node.id === edge.source);
        
        const targetExists = existingNodeIds.has(edge.target) || 
                            newNodes.some(node => node.id === edge.target);
        
        return sourceExists && targetExists;
      });
      
      // Merge data
      const mergedNodes = [...existingNodes, ...newNodes];
      const mergedEdges = [...existingEdges, ...newEdges];
      
      // Save merged data
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_NODES]: mergedNodes,
        [STORAGE_KEYS.KNOWLEDGE_EDGES]: mergedEdges
      });
      
      // Update metadata
      await this.updateKnowledgeMeta({
        nodeCount: mergedNodes.length,
        edgeCount: mergedEdges.length
      });
      
      return {
        nodesAdded: newNodes.length,
        edgesAdded: newEdges.length,
        totalNodes: mergedNodes.length,
        totalEdges: mergedEdges.length
      };
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to import data',
        error,
        context: 'StorageManager.importData',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getUsageStatistics() {
    try {
      // Get all data
      const [nodes, edges, meta] = await Promise.all([
        this.getKnowledgeNodes(),
        this.getKnowledgeEdges(),
        this.localStorage.get(STORAGE_KEYS.KNOWLEDGE_META)
      ]);
      
      // Calculate sizes
      const nodesSize = new Blob([JSON.stringify(nodes)]).size;
      const edgesSize = new Blob([JSON.stringify(edges)]).size;
      const metaSize = new Blob([JSON.stringify(meta)]).size;
      const totalSize = nodesSize + edgesSize + metaSize;
      
      return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        bytesUsed: totalSize,
        lastUpdated: meta[STORAGE_KEYS.KNOWLEDGE_META]?.lastUpdated || Date.now()
      };
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to get usage statistics',
        error,
        context: 'StorageManager.getUsageStatistics',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      // Return default stats on error
      return {
        nodeCount: 0,
        edgeCount: 0,
        bytesUsed: 0,
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Migrate data if needed
   */
  async migrateDataIfNeeded(previousVersion) {
    try {
      // Get current data version
      const result = await this.localStorage.get(STORAGE_KEYS.DATA_VERSION);
      const dataVersion = result[STORAGE_KEYS.DATA_VERSION] || 0;
      
      // If already at current version, no migration needed
      if (dataVersion >= CURRENT_DATA_VERSION) {
        return false;
      }
      
      // Perform migrations based on version
      if (dataVersion === 0) {
        // Initial migration
        await this.migrateToV1();
      }
      
      // Update data version
      await this.localStorage.set({
        [STORAGE_KEYS.DATA_VERSION]: CURRENT_DATA_VERSION
      });
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to migrate data',
        error,
        context: 'StorageManager.migrateDataIfNeeded',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { previousVersion }
      });
      
      throw error;
    }
  }

  /**
   * Migrate data to version 1 format
   */
  async migrateToV1() {
    try {
      // Get existing data
      const [nodes, edges] = await Promise.all([
        this.getKnowledgeNodes(),
        this.getKnowledgeEdges()
      ]);
      
      // Add timestamps to nodes and edges if missing
      const now = Date.now();
      
      const updatedNodes = nodes.map(node => ({
        ...node,
        createdAt: node.createdAt || now,
        updatedAt: node.updatedAt || now
      }));
      
      const updatedEdges = edges.map(edge => ({
        ...edge,
        createdAt: edge.createdAt || now,
        updatedAt: edge.updatedAt || now
      }));
      
      // Save updated data
      await this.localStorage.set({
        [STORAGE_KEYS.KNOWLEDGE_NODES]: updatedNodes,
        [STORAGE_KEYS.KNOWLEDGE_EDGES]: updatedEdges
      });
      
      // Initialize metadata if missing
      await this.updateKnowledgeMeta({
        nodeCount: updatedNodes.length,
        edgeCount: updatedEdges.length,
        version: 1
      });
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to migrate to V1',
        error,
        context: 'StorageManager.migrateToV1',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR
      });
      
      throw error;
    }
  }
}

// Create singleton instance
export default StorageManager;
