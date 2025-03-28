/**
 * Nexus Knowledge Graph
 * Manages the knowledge graph structure and operations.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from './error-handler.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

/**
 * Knowledge Graph class
 * Manages the storage and retrieval of knowledge nodes and connections
 */
export class KnowledgeGraph {
  constructor(storageManager) {
    if (!storageManager) {
      throw new Error('StorageManager is required for KnowledgeGraph');
    }
    
    this.storageManager = storageManager;
    this.nodeMemo = new Map(); // In-memory cache for frequently accessed nodes
    
    // Bind methods
    this.addNode = this.addNode.bind(this);
    this.getNode = this.getNode.bind(this);
    this.updateNode = this.updateNode.bind(this);
    this.deleteNode = this.deleteNode.bind(this);
    this.addEdge = this.addEdge.bind(this);
    this.getEdge = this.getEdge.bind(this);
    this.deleteEdge = this.deleteEdge.bind(this);
    this.search = this.search.bind(this);
    this.getConnectedNodes = this.getConnectedNodes.bind(this);
    this.getNodesForInsight = this.getNodesForInsight.bind(this);
    this.addInsightNode = this.addInsightNode.bind(this);
    this.getStatistics = this.getStatistics.bind(this);
  }

  /**
   * Clear the node memory cache
   */
  clearCache() {
    this.nodeMemo.clear();
  }

  /**
   * Add a new node to the knowledge graph
   */
  async addNode(nodeData) {
    try {
      if (!nodeData) {
        throw new Error('Node data is required');
      }
      
      // Generate a unique ID if not provided
      const nodeId = nodeData.id || uuidv4();
      
      // Create the node object
      const node = {
        id: nodeId,
        title: nodeData.title || 'Untitled',
        content: nodeData.content || {},
        url: nodeData.url || null,
        timestamp: nodeData.timestamp || Date.now(),
        source: nodeData.source || 'manual',
        metadata: nodeData.metadata || {},
        categories: nodeData.categories || [],
        tags: nodeData.tags || [],
        preview: this.generatePreview(nodeData)
      };
      
      // Save the node
      await this.storageManager.saveKnowledgeNode(node);
      
      // Add to cache
      this.nodeMemo.set(nodeId, node);
      
      // Create automatic connections if specified
      if (nodeData.autoConnect && Array.isArray(nodeData.autoConnect)) {
        for (const targetId of nodeData.autoConnect) {
          await this.addEdge({
            source: nodeId,
            target: targetId,
            type: 'auto-connected',
            weight: 0.5
          });
        }
      }
      
      return nodeId;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to add knowledge node',
        error,
        context: 'KnowledgeGraph.addNode',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { title: nodeData?.title }
      });
      
      throw error;
    }
  }

  /**
   * Generate a preview for the node
   */
  generatePreview(nodeData) {
    try {
      const preview = {};
      
      // Add title
      preview.title = nodeData.title || 'Untitled';
      
      // Add summary if available, or generate from content
      if (nodeData.content?.summary) {
        preview.summary = nodeData.content.summary;
      } else if (typeof nodeData.content?.text === 'string') {
        // Take the first 150 characters as summary
        preview.summary = nodeData.content.text.substring(0, 150) + (nodeData.content.text.length > 150 ? '...' : '');
      } else {
        preview.summary = 'No preview available';
      }
      
      // Add keywords/entities
      preview.keywords = nodeData.content?.entities?.map(e => e.name).slice(0, 5) || [];
      
      // Add source and date
      preview.source = nodeData.source || 'manual';
      preview.date = nodeData.timestamp || Date.now();
      
      return preview;
    } catch (error) {
      // Fall back to a simple preview on error
      return {
        title: nodeData.title || 'Untitled',
        summary: 'Preview generation failed',
        keywords: [],
        source: nodeData.source || 'manual',
        date: nodeData.timestamp || Date.now()
      };
    }
  }

  /**
   * Get a node by ID
   */
  async getNode(nodeId) {
    try {
      if (!nodeId) {
        throw new Error('Node ID is required');
      }
      
      // Check cache first
      if (this.nodeMemo.has(nodeId)) {
        return this.nodeMemo.get(nodeId);
      }
      
      // Get all nodes from storage
      const nodes = await this.storageManager.getKnowledgeNodes();
      
      // Find the node with the matching ID
      const node = nodes.find(n => n.id === nodeId);
      
      if (!node) {
        return null;
      }
      
      // Add to cache for future access
      this.nodeMemo.set(nodeId, node);
      
      return node;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to get knowledge node',
        error,
        context: 'KnowledgeGraph.getNode',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { nodeId }
      });
      
      throw error;
    }
  }

  /**
   * Update an existing node
   */
  async updateNode(nodeId, updates) {
    try {
      if (!nodeId) {
        throw new Error('Node ID is required');
      }
      
      // Get the existing node
      const node = await this.getNode(nodeId);
      
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      
      // Apply updates
      const updatedNode = {
        ...node,
        ...updates,
        id: nodeId, // Ensure ID remains the same
        updatedAt: Date.now()
      };
      
      // Regenerate preview if content changed
      if (updates.content || updates.title) {
        updatedNode.preview = this.generatePreview(updatedNode);
      }
      
      // Save the updated node
      await this.storageManager.saveKnowledgeNode(updatedNode);
      
      // Update cache
      this.nodeMemo.set(nodeId, updatedNode);
      
      return updatedNode;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to update knowledge node',
        error,
        context: 'KnowledgeGraph.updateNode',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { nodeId }
      });
      
      throw error;
    }
  }

  /**
   * Delete a node
   */
  async deleteNode(nodeId) {
    try {
      if (!nodeId) {
        throw new Error('Node ID is required');
      }
      
      // Delete from storage
      const result = await this.storageManager.deleteKnowledgeNode(nodeId);
      
      // Remove from cache
      this.nodeMemo.delete(nodeId);
      
      return result;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to delete knowledge node',
        error,
        context: 'KnowledgeGraph.deleteNode',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { nodeId }
      });
      
      throw error;
    }
  }

  /**
   * Add a new edge (connection between nodes)
   */
  async addEdge(edgeData) {
    try {
      if (!edgeData || !edgeData.source || !edgeData.target) {
        throw new Error('Edge must have source and target node IDs');
      }
      
      // Check if source and target nodes exist
      const sourceNode = await this.getNode(edgeData.source);
      const targetNode = await this.getNode(edgeData.target);
      
      if (!sourceNode) {
        throw new Error(`Source node not found: ${edgeData.source}`);
      }
      
      if (!targetNode) {
        throw new Error(`Target node not found: ${edgeData.target}`);
      }
      
      // Generate a unique ID if not provided
      const edgeId = edgeData.id || `${edgeData.source}-${edgeData.target}-${uuidv4().substring(0, 8)}`;
      
      // Create the edge object
      const edge = {
        id: edgeId,
        source: edgeData.source,
        target: edgeData.target,
        type: edgeData.type || 'related',
        label: edgeData.label || '',
        weight: edgeData.weight ?? 1.0,
        bidirectional: edgeData.bidirectional ?? false,
        metadata: edgeData.metadata || {},
        timestamp: edgeData.timestamp || Date.now()
      };
      
      // Save the edge
      await this.storageManager.saveKnowledgeEdge(edge);
      
      return edgeId;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to add knowledge edge',
        error,
        context: 'KnowledgeGraph.addEdge',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { source: edgeData?.source, target: edgeData?.target }
      });
      
      throw error;
    }
  }

  /**
   * Get an edge by ID
   */
  async getEdge(edgeId) {
    try {
      if (!edgeId) {
        throw new Error('Edge ID is required');
      }
      
      // Get all edges from storage
      const edges = await this.storageManager.getKnowledgeEdges();
      
      // Find the edge with the matching ID
      return edges.find(e => e.id === edgeId) || null;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to get knowledge edge',
        error,
        context: 'KnowledgeGraph.getEdge',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { edgeId }
      });
      
      throw error;
    }
  }

  /**
   * Delete an edge
   */
  async deleteEdge(edgeId) {
    try {
      if (!edgeId) {
        throw new Error('Edge ID is required');
      }
      
      return await this.storageManager.deleteKnowledgeEdge(edgeId);
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to delete knowledge edge',
        error,
        context: 'KnowledgeGraph.deleteEdge',
        category: ErrorCategory.STORAGE,
        level: ErrorLevel.ERROR,
        metadata: { edgeId }
      });
      
      throw error;
    }
  }

  /**
   * Search for nodes based on a query
   */
  async search(query, options = {}) {
    try {
      // Default options
      const searchOptions = {
        limit: options.limit || 20,
        offset: options.offset || 0,
        sortBy: options.sortBy || 'relevance',
        order: options.order || 'desc',
        searchIn: options.searchIn || ['title', 'content', 'categories', 'tags'],
        ...options
      };
      
      // Get all nodes
      const nodes = await this.storageManager.getKnowledgeNodes();
      
      let results = [];
      
      if (!query || query.trim() === '') {
        // No query, return all nodes sorted by timestamp
        results = [...nodes];
        
        // Apply default sorting (by timestamp)
        results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      } else {
        // Normalize query
        const normalizedQuery = query.trim().toLowerCase();
        const queryTerms = normalizedQuery.split(/\s+/);
        
        // Score each node based on query match
        results = nodes.map(node => {
          let score = 0;
          const matchDetails = {};
          
          // Check title match
          if (searchOptions.searchIn.includes('title') && node.title) {
            const titleLower = node.title.toLowerCase();
            const titleMatch = queryTerms.filter(term => titleLower.includes(term)).length;
            const titleScore = titleMatch * 3; // Title matches have higher weight
            
            if (titleScore > 0) {
              score += titleScore;
              matchDetails.title = titleScore;
            }
          }
          
          // Check content match
          if (searchOptions.searchIn.includes('content') && node.content) {
            // Check summary first
            if (node.content.summary) {
              const summaryLower = node.content.summary.toLowerCase();
              const summaryMatch = queryTerms.filter(term => summaryLower.includes(term)).length;
              const summaryScore = summaryMatch * 2; // Summary matches have high weight
              
              if (summaryScore > 0) {
                score += summaryScore;
                matchDetails.summary = summaryScore;
              }
            }
            
            // Check full text content
            if (node.content.text) {
              const textLower = node.content.text.toLowerCase();
              const textMatch = queryTerms.filter(term => textLower.includes(term)).length;
              
              if (textMatch > 0) {
                score += textMatch;
                matchDetails.text = textMatch;
              }
            }
            
            // Check entities
            if (node.content.entities && Array.isArray(node.content.entities)) {
              const entityMatch = node.content.entities.filter(entity => 
                queryTerms.some(term => entity.name.toLowerCase().includes(term))
              ).length;
              
              if (entityMatch > 0) {
                score += entityMatch * 1.5; // Entity matches have medium weight
                matchDetails.entities = entityMatch;
              }
            }
          }
          
          // Check categories
          if (searchOptions.searchIn.includes('categories') && node.categories && Array.isArray(node.categories)) {
            const categoryMatch = node.categories.filter(category => 
              queryTerms.some(term => category.toLowerCase().includes(term))
            ).length;
            
            if (categoryMatch > 0) {
              score += categoryMatch * 2; // Category matches have high weight
              matchDetails.categories = categoryMatch;
            }
          }
          
          // Check tags
          if (searchOptions.searchIn.includes('tags') && node.tags && Array.isArray(node.tags)) {
            const tagMatch = node.tags.filter(tag => 
              queryTerms.some(term => tag.toLowerCase().includes(term))
            ).length;
            
            if (tagMatch > 0) {
              score += tagMatch * 2.5; // Tag matches have highest weight
              matchDetails.tags = tagMatch;
            }
          }
          
          // URL matches
          if (searchOptions.searchIn.includes('url') && node.url) {
            const urlLower = node.url.toLowerCase();
            const urlMatch = queryTerms.filter(term => urlLower.includes(term)).length;
            
            if (urlMatch > 0) {
              score += urlMatch; // URL matches have low weight
              matchDetails.url = urlMatch;
            }
          }
          
          return {
            node,
            score,
            matchDetails
          };
        });
        
        // Filter out nodes with zero score
        results = results.filter(result => result.score > 0);
        
        // Sort by score
        results.sort((a, b) => b.score - a.score);
      }
      
      // Apply sorting (if not by relevance)
      if (searchOptions.sortBy !== 'relevance') {
        const sortBy = searchOptions.sortBy;
        const order = searchOptions.order === 'asc' ? 1 : -1;
        
        results.sort((a, b) => {
          const aValue = this.getNestedProperty(a.node, sortBy) || 0;
          const bValue = this.getNestedProperty(b.node, sortBy) || 0;
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return order * aValue.localeCompare(bValue);
          }
          
          return order * (aValue - bValue);
        });
      }
      
      // Apply pagination
      const paginatedResults = results.slice(
        searchOptions.offset, 
        searchOptions.offset + searchOptions.limit
      );
      
      // Format results
      return {
        total: results.length,
        offset: searchOptions.offset,
        limit: searchOptions.limit,
        results: paginatedResults.map(result => ({
          ...result.node,
          score: result.score,
          matchDetails: result.matchDetails
        }))
      };
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to search knowledge nodes',
        error,
        context: 'KnowledgeGraph.search',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.ERROR,
        metadata: { query, options }
      });
      
      // Return empty results on error
      return {
        total: 0,
        offset: options.offset || 0,
        limit: options.limit || 20,
        results: []
      };
    }
  }

  /**
   * Helper to get a nested property from an object
   */
  getNestedProperty(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }

  /**
   * Get nodes connected to a specific node
   */
  async getConnectedNodes(nodeId, options = {}) {
    try {
      if (!nodeId) {
        throw new Error('Node ID is required');
      }
      
      // Default options
      const connectionOptions = {
        depth: options.depth || 1,
        limit: options.limit || 50,
        edgeTypes: options.edgeTypes || null,
        direction: options.direction || 'both', // 'in', 'out', or 'both'
        includeSelf: options.includeSelf || false
      };
      
      // Get all edges
      const edges = await this.storageManager.getKnowledgeEdges();
      
      // Find edges connected to the node
      const connectedEdges = edges.filter(edge => {
        if (connectionOptions.edgeTypes && !connectionOptions.edgeTypes.includes(edge.type)) {
          return false;
        }
        
        if (connectionOptions.direction === 'out') {
          return edge.source === nodeId;
        } else if (connectionOptions.direction === 'in') {
          return edge.target === nodeId;
        } else {
          return edge.source === nodeId || edge.target === nodeId;
        }
      });
      
      // Set to track already visited nodes
      const visited = new Set();
      if (!connectionOptions.includeSelf) {
        visited.add(nodeId);
      }
      
      // Array of connected nodes with their connection info
      const connectedNodes = [];
      
      // Process each depth level
      let currentDepth = 1;
      let nodesToProcess = [nodeId];
      
      while (currentDepth <= connectionOptions.depth && nodesToProcess.length > 0) {
        const nextNodesToProcess = [];
        
        // Process each node at current depth
        for (const currentId of nodesToProcess) {
          // If including the root node and this is the first level
          if (connectionOptions.includeSelf && currentDepth === 1 && currentId === nodeId) {
            const node = await this.getNode(currentId);
            if (node) {
              connectedNodes.push({
                node,
                edge: null,
                depth: 0,
                direction: null
              });
            }
          }
          
          // Find edges connected to this node
          const nodeEdges = connectedEdges.filter(edge => 
            edge.source === currentId || edge.target === currentId
          );
          
          // Process each edge
          for (const edge of nodeEdges) {
            // Determine the connected node ID
            const connectedId = edge.source === currentId ? edge.target : edge.source;
            
            // Skip if already visited
            if (visited.has(connectedId)) {
              continue;
            }
            
            // Mark as visited
            visited.add(connectedId);
            
            // Get the connected node
            const connectedNode = await this.getNode(connectedId);
            
            if (connectedNode) {
              // Add to results
              connectedNodes.push({
                node: connectedNode,
                edge,
                depth: currentDepth,
                direction: edge.source === currentId ? 'out' : 'in'
              });
              
              // Add to next level of nodes to process
              nextNodesToProcess.push(connectedId);
            }
            
            // Limit the number of connected nodes
            if (connectionOptions.limit && connectedNodes.length >= connectionOptions.limit) {
              return connectedNodes;
            }
          }
        }
        
        // Update for next depth level
        nodesToProcess = nextNodesToProcess;
        currentDepth++;
      }
      
      return connectedNodes;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to get connected nodes',
        error,
        context: 'KnowledgeGraph.getConnectedNodes',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.ERROR,
        metadata: { nodeId, options }
      });
      
      return [];
    }
  }

  /**
   * Get nodes for generating insights
   */
  async getNodesForInsight(options = {}) {
    try {
      const insightOptions = {
        nodeIds: options.nodeIds || [],
        categories: options.categories || [],
        tags: options.tags || [],
        timeRange: options.timeRange || null,
        limit: options.limit || 20,
        ...options
      };
      
      // If specific nodes are requested, fetch those directly
      if (insightOptions.nodeIds && insightOptions.nodeIds.length > 0) {
        const nodes = [];
        
        for (const nodeId of insightOptions.nodeIds) {
          const node = await this.getNode(nodeId);
          if (node) {
            nodes.push(node);
          }
        }
        
        return nodes;
      }
      
      // Otherwise, search based on criteria
      let searchQuery = '';
      
      // Build query from categories and tags
      if (insightOptions.categories && insightOptions.categories.length > 0) {
        searchQuery += insightOptions.categories.join(' ');
      }
      
      if (insightOptions.tags && insightOptions.tags.length > 0) {
        searchQuery += ' ' + insightOptions.tags.join(' ');
      }
      
      // Search for nodes
      const searchResults = await this.search(searchQuery, {
        limit: insightOptions.limit,
        sortBy: 'timestamp',
        order: 'desc',
        searchIn: ['categories', 'tags', 'title', 'content']
      });
      
      // Filter by time range if specified
      let filteredResults = searchResults.results;
      
      if (insightOptions.timeRange) {
        const now = Date.now();
        const rangeStart = now - insightOptions.timeRange;
        
        filteredResults = filteredResults.filter(node => 
          node.timestamp >= rangeStart && node.timestamp <= now
        );
      }
      
      return filteredResults;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to get nodes for insight',
        error,
        context: 'KnowledgeGraph.getNodesForInsight',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.ERROR,
        metadata: { options }
      });
      
      return [];
    }
  }

  /**
   * Add an insight node and connect it to related nodes
   */
  async addInsightNode(insightData) {
    try {
      if (!insightData || !insightData.content) {
        throw new Error('Insight data is required');
      }
      
      // Create the insight node
      const insightNode = {
        title: insightData.title || 'Generated Insight',
        content: insightData.content,
        source: 'insight',
        categories: insightData.categories || ['insight'],
        tags: insightData.tags || [],
        metadata: {
          ...insightData.metadata,
          insightType: insightData.insightType || 'general',
          generatedFrom: insightData.generatedFrom || []
        }
      };
      
      // Add the node
      const insightId = await this.addNode(insightNode);
      
      // Connect to related nodes
      if (insightData.relatedNodes && Array.isArray(insightData.relatedNodes)) {
        for (const relatedId of insightData.relatedNodes) {
          await this.addEdge({
            source: insightId,
            target: relatedId,
            type: 'insight',
            label: 'Generated from',
            bidirectional: true
          });
        }
      }
      
      return insightId;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to add insight node',
        error,
        context: 'KnowledgeGraph.addInsightNode',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.ERROR,
        metadata: { title: insightData?.title }
      });
      
      throw error;
    }
  }

  /**
   * Get statistics about the knowledge graph
   */
  async getStatistics() {
    try {
      // Get nodes and edges
      const [nodes, edges] = await Promise.all([
        this.storageManager.getKnowledgeNodes(),
        this.storageManager.getKnowledgeEdges()
      ]);
      
      // Calculate categories distribution
      const categoriesCounts = {};
      nodes.forEach(node => {
        (node.categories || []).forEach(category => {
          categoriesCounts[category] = (categoriesCounts[category] || 0) + 1;
        });
      });
      
      // Calculate source distribution
      const sourceCounts = {};
      nodes.forEach(node => {
        const source = node.source || 'unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      
      // Calculate time distribution (by month)
      const timeDistribution = {};
      nodes.forEach(node => {
        const date = new Date(node.timestamp);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        timeDistribution[month] = (timeDistribution[month] || 0) + 1;
      });
      
      // Calculate edge type distribution
      const edgeTypeCounts = {};
      edges.forEach(edge => {
        const type = edge.type || 'unknown';
        edgeTypeCounts[type] = (edgeTypeCounts[type] || 0) + 1;
      });
      
      // Calculate node connection statistics
      const connectionStats = {
        min: Number.MAX_SAFE_INTEGER,
        max: 0,
        avg: 0,
        isolated: 0
      };
      
      const connectionCounts = new Map();
      
      // Count connections for each node
      edges.forEach(edge => {
        // Count source node connections
        const sourceCount = connectionCounts.get(edge.source) || 0;
        connectionCounts.set(edge.source, sourceCount + 1);
        
        // Count target node connections
        const targetCount = connectionCounts.get(edge.target) || 0;
        connectionCounts.set(edge.target, targetCount + 1);
      });
      
      // Find isolated nodes (no connections)
      const connectedNodeIds = new Set([...connectionCounts.keys()]);
      const isolatedCount = nodes.filter(node => !connectedNodeIds.has(node.id)).length;
      
      // Calculate connection statistics
      if (connectionCounts.size > 0) {
        const counts = Array.from(connectionCounts.values());
        connectionStats.min = Math.min(...counts);
        connectionStats.max = Math.max(...counts);
        connectionStats.avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
        connectionStats.isolated = isolatedCount;
      } else if (nodes.length > 0) {
        // All nodes are isolated
        connectionStats.min = 0;
        connectionStats.max = 0;
        connectionStats.avg = 0;
        connectionStats.isolated = nodes.length;
      } else {
        // No nodes
        connectionStats.min = 0;
        connectionStats.max = 0;
        connectionStats.avg = 0;
        connectionStats.isolated = 0;
      }
      
      return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        categoriesDistribution: categoriesCounts,
        sourceDistribution: sourceCounts,
        timeDistribution: timeDistribution,
        edgeTypeDistribution: edgeTypeCounts,
        connectionStats,
        lastUpdated: Date.now()
      };
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to get knowledge graph statistics',
        error,
        context: 'KnowledgeGraph.getStatistics',
        category: ErrorCategory.EXTENSION,
        level: ErrorLevel.ERROR
      });
      
      // Return empty statistics on error
      return {
        nodeCount: 0,
        edgeCount: 0,
        categoriesDistribution: {},
        sourceDistribution: {},
        timeDistribution: {},
        edgeTypeDistribution: {},
        connectionStats: {
          min: 0,
          max: 0,
          avg: 0,
          isolated: 0
        },
        lastUpdated: Date.now()
      };
    }
  }
}

// Export class
export default KnowledgeGraph;
