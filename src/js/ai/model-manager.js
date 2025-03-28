/**
 * Nexus Model Manager
 * Manages TensorFlow.js models for AI capabilities.
 * 
 * Version 3.0.0
 */

import * as tf from '@tensorflow/tfjs';
import errorHandler, { ErrorCategory, ErrorLevel } from '../core/error-handler.js';
import { StorageManager } from '../core/storage-manager.js';

// Model definitions
const MODELS = {
  ENTITY_RECOGNITION: {
    name: 'Entity Recognition',
    version: '1.0',
    type: 'nlp',
    path: 'models/entity-recognition',
    sizeBytes: 2560000,
    requirements: {
      minHeapSize: 50 * 1024 * 1024, // 50MB minimum heap
      preferGPU: true
    }
  },
  TEXT_EMBEDDING: {
    name: 'Text Embedding',
    version: '1.0',
    type: 'nlp',
    path: 'models/text-embedding',
    sizeBytes: 19800000,
    requirements: {
      minHeapSize: 100 * 1024 * 1024, // 100MB minimum heap
      preferGPU: true
    }
  },
  SUMMARIZATION: {
    name: 'Summarization',
    version: '1.0',
    type: 'nlp',
    path: 'models/summarization',
    sizeBytes: 6700000,
    requirements: {
      minHeapSize: 80 * 1024 * 1024, // 80MB minimum heap
      preferGPU: true
    }
  },
  CATEGORY_CLASSIFIER: {
    name: 'Category Classifier',
    version: '1.0',
    type: 'nlp',
    path: 'models/category-classifier',
    sizeBytes: 3400000,
    requirements: {
      minHeapSize: 50 * 1024 * 1024, // 50MB minimum heap
      preferGPU: false
    }
  },
  RELATIONSHIP_EXTRACTOR: {
    name: 'Relationship Extractor',
    version: '1.0',
    type: 'nlp',
    path: 'models/relationship-extractor',
    sizeBytes: 5100000,
    requirements: {
      minHeapSize: 70 * 1024 * 1024, // 70MB minimum heap
      preferGPU: true
    }
  }
};

/**
 * Model Manager class
 * Manages loading, caching, and running of TensorFlow.js models
 */
export class ModelManager {
  constructor() {
    this.loadedModels = new Map();
    this.modelLoadPromises = new Map();
    this.isInitialized = false;
    this.storageManager = new StorageManager();
    this.hardwareCapabilities = null;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.loadModel = this.loadModel.bind(this);
    this.unloadModel = this.unloadModel.bind(this);
    this.adaptToHardware = this.adaptToHardware.bind(this);
    this.processExtractedContent = this.processExtractedContent.bind(this);
    this.generateInsights = this.generateInsights.bind(this);
    this.getLoadedModels = this.getLoadedModels.bind(this);
  }

  /**
   * Initialize the model manager
   */
  async init() {
    try {
      if (this.isInitialized) {
        return;
      }
      
      // Load settings to determine which models to autoload
      const settings = await this.storageManager.getSettings();
      const aiLevel = settings?.aiProcessingLevel || 'balanced';
      
      // Determine which models to autoload based on AI level
      const modelsToAutoload = this.getModelsForAILevel(aiLevel);
      
      // Pre-load essential models in the background
      for (const modelName of modelsToAutoload) {
        this.loadModel(modelName, true); // true = background loading
      }
      
      this.isInitialized = true;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to initialize model manager',
        error,
        context: 'ModelManager.init',
        category: ErrorCategory.AI,
        level: ErrorLevel.ERROR
      });
    }
  }

  /**
   * Get models to autoload based on AI processing level
   */
  getModelsForAILevel(aiLevel) {
    switch (aiLevel) {
      case 'minimal':
        // Only load essential models
        return ['ENTITY_RECOGNITION', 'CATEGORY_CLASSIFIER'];
        
      case 'balanced':
        // Load standard set of models
        return ['ENTITY_RECOGNITION', 'CATEGORY_CLASSIFIER', 'TEXT_EMBEDDING'];
        
      case 'full':
        // Load all models
        return ['ENTITY_RECOGNITION', 'TEXT_EMBEDDING', 'SUMMARIZATION', 
                'CATEGORY_CLASSIFIER', 'RELATIONSHIP_EXTRACTOR'];
        
      default:
        // Default to balanced
        return ['ENTITY_RECOGNITION', 'CATEGORY_CLASSIFIER', 'TEXT_EMBEDDING'];
    }
  }

  /**
   * Adapt model loading to hardware capabilities
   */
  adaptToHardware(capabilities) {
    this.hardwareCapabilities = capabilities;
    
    // Adjust model loading behavior based on hardware
    if (capabilities.deviceType === 'mobile' || capabilities.deviceType === 'tablet') {
      // On mobile devices, prefer lighter models
      this.preferLightweightModels = true;
    } else {
      this.preferLightweightModels = false;
    }
    
    // Log adaptation
    console.log(`Adapting AI models to hardware: ${capabilities.gpuActive ? 'GPU' : 'CPU'} mode, ${capabilities.deviceType} device`);
    
    return capabilities;
  }

  /**
   * Load a model
   * @param {string} modelName - Name of the model to load (from MODELS keys)
   * @param {boolean} backgroundLoading - Whether to load in the background
   * @returns {Promise<tf.GraphModel>} The loaded model
   */
  async loadModel(modelName, backgroundLoading = false) {
    try {
      // Check if model is already loaded
      if (this.loadedModels.has(modelName)) {
        return this.loadedModels.get(modelName);
      }
      
      // Check if model is currently loading
      if (this.modelLoadPromises.has(modelName)) {
        return this.modelLoadPromises.get(modelName);
      }
      
      // Check if model exists
      const model = MODELS[modelName];
      if (!model) {
        throw new Error(`Unknown model: ${modelName}`);
      }
      
      // Check hardware requirements
      if (this.hardwareCapabilities) {
        const memoryInfo = this.hardwareCapabilities.memoryInfo;
        
        // Check if device has enough memory
        if (memoryInfo.jsHeapSizeLimit < model.requirements.minHeapSize) {
          // If not enough memory, throw error if not background loading
          if (!backgroundLoading) {
            throw new Error(`Insufficient memory for model ${modelName}: ` +
                          `Requires ${model.requirements.minHeapSize / (1024 * 1024)}MB, ` +
                          `available ${memoryInfo.jsHeapSizeLimit / (1024 * 1024)}MB`);
          } else {
            // For background loading, just log warning and don't load
            console.warn(`Skipping autoload of model ${modelName} due to insufficient memory`);
            return null;
          }
        }
        
        // Check if GPU should be used
        if (model.requirements.preferGPU && !this.hardwareCapabilities.gpuActive) {
          console.warn(`Loading model ${modelName} on CPU mode, performance may be suboptimal`);
        }
      }
      
      // Create a loading promise
      const loadPromise = (async () => {
        try {
          // Show indicator if not background loading
          if (!backgroundLoading) {
            // TODO: Show loading indicator in UI
          }
          
          // Load the model from the extension's files
          const modelPath = chrome.runtime.getURL(model.path + '/model.json');
          const loadedModel = await tf.loadGraphModel(modelPath);
          
          // Warm up the model with a simple prediction
          const inputRank = loadedModel.inputs[0].shape.length;
          const inputShape = new Array(inputRank).fill(1);
          const warmupTensor = tf.ones(inputShape);
          
          await loadedModel.predict(warmupTensor);
          
          // Clean up warmup tensor
          warmupTensor.dispose();
          
          // Store in loaded models
          this.loadedModels.set(modelName, loadedModel);
          
          // Remove from loading promises
          this.modelLoadPromises.delete(modelName);
          
          console.log(`Model loaded: ${model.name} v${model.version}`);
          
          return loadedModel;
        } catch (error) {
          // Remove from loading promises on error
          this.modelLoadPromises.delete(modelName);
          
          errorHandler.handleError({
            message: `Failed to load model: ${model.name}`,
            error,
            context: 'ModelManager.loadModel',
            category: ErrorCategory.AI,
            level: ErrorLevel.ERROR,
            metadata: { modelName }
          });
          
          throw error;
        } finally {
          // Hide indicator if not background loading
          if (!backgroundLoading) {
            // TODO: Hide loading indicator in UI
          }
        }
      })();
      
      // Store the loading promise
      this.modelLoadPromises.set(modelName, loadPromise);
      
      return loadPromise;
    } catch (error) {
      errorHandler.handleError({
        message: `Error initiating model load: ${modelName}`,
        error,
        context: 'ModelManager.loadModel',
        category: ErrorCategory.AI,
        level: ErrorLevel.ERROR,
        metadata: { modelName }
      });
      
      throw error;
    }
  }

  /**
   * Unload a model to free memory
   */
  async unloadModel(modelName) {
    try {
      // Check if model is loaded
      if (!this.loadedModels.has(modelName)) {
        return true; // Already unloaded
      }
      
      // Get the model
      const model = this.loadedModels.get(modelName);
      
      // Dispose the model to free memory
      if (model && model.dispose) {
        model.dispose();
      }
      
      // Remove from loaded models
      this.loadedModels.delete(modelName);
      
      console.log(`Model unloaded: ${MODELS[modelName]?.name || modelName}`);
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: `Failed to unload model: ${modelName}`,
        error,
        context: 'ModelManager.unloadModel',
        category: ErrorCategory.AI,
        level: ErrorLevel.WARNING,
        metadata: { modelName }
      });
      
      return false;
    }
  }

  /**
   * Process extracted content with AI models
   */
  async processExtractedContent(content) {
    try {
      // Load settings to determine processing level
      const settings = await this.storageManager.getSettings();
      const aiLevel = settings?.aiProcessingLevel || 'balanced';
      
      // Initialize result object
      const processed = {
        ...content,
        entities: [],
        categories: [],
        summary: '',
        keywords: [],
        sentiment: null,
        processed: true,
        processingLevel: aiLevel,
        timestamp: Date.now()
      };
      
      // Get text to process
      const text = content.text || '';
      
      if (!text || text.trim().length === 0) {
        return processed; // Nothing to process
      }
      
      // Process based on AI level
      if (aiLevel === 'minimal') {
        // Minimal processing: just basic categorization
        await this.extractCategories(text, processed);
      } else if (aiLevel === 'balanced') {
        // Balanced processing: categories, entities, keywords
        await Promise.all([
          this.extractEntities(text, processed),
          this.extractCategories(text, processed),
          this.extractKeywords(text, processed)
        ]);
      } else if (aiLevel === 'full') {
        // Full processing: everything including summarization and sentiment
        await Promise.all([
          this.extractEntities(text, processed),
          this.extractCategories(text, processed),
          this.extractKeywords(text, processed),
          this.generateSummary(text, processed),
          this.analyzeSentiment(text, processed)
        ]);
      }
      
      return processed;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to process extracted content',
        error,
        context: 'ModelManager.processExtractedContent',
        category: ErrorCategory.AI,
        level: ErrorLevel.ERROR,
        metadata: { contentLength: content?.text?.length }
      });
      
      // Return original content on error
      return {
        ...content,
        processed: false,
        processingError: error.message
      };
    }
  }

  /**
   * Extract entities from text
   */
  async extractEntities(text, result) {
    try {
      // Load entity recognition model
      const model = await this.loadModel('ENTITY_RECOGNITION');
      
      if (!model) {
        result.entities = [];
        return;
      }
      
      // TODO: Implement actual entity extraction using TensorFlow.js model
      // For now, use a simple placeholder implementation
      const entities = [
        { name: 'Entity1', type: 'PERSON', confidence: 0.95 },
        { name: 'Entity2', type: 'ORGANIZATION', confidence: 0.87 }
      ];
      
      result.entities = entities;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to extract entities',
        error,
        context: 'ModelManager.extractEntities',
        category: ErrorCategory.AI,
        level: ErrorLevel.WARNING
      });
      
      result.entities = [];
    }
  }

  /**
   * Extract categories from text
   */
  async extractCategories(text, result) {
    try {
      // Load category classifier model
      const model = await this.loadModel('CATEGORY_CLASSIFIER');
      
      if (!model) {
        result.categories = [];
        return;
      }
      
      // TODO: Implement actual category classification using TensorFlow.js model
      // For now, use a simple placeholder implementation
      const categories = ['Technology', 'Science'];
      
      result.categories = categories;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to extract categories',
        error,
        context: 'ModelManager.extractCategories',
        category: ErrorCategory.AI,
        level: ErrorLevel.WARNING
      });
      
      result.categories = [];
    }
  }

  /**
   * Extract keywords from text
   */
  async extractKeywords(text, result) {
    try {
      // Use text embedding model for keyword extraction
      const model = await this.loadModel('TEXT_EMBEDDING');
      
      if (!model) {
        result.keywords = [];
        return;
      }
      
      // TODO: Implement actual keyword extraction using TensorFlow.js model
      // For now, use a simple placeholder implementation
      const keywords = ['keyword1', 'keyword2', 'keyword3'];
      
      result.keywords = keywords;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to extract keywords',
        error,
        context: 'ModelManager.extractKeywords',
        category: ErrorCategory.AI,
        level: ErrorLevel.WARNING
      });
      
      result.keywords = [];
    }
  }

  /**
   * Generate summary from text
   */
  async generateSummary(text, result) {
    try {
      // Load summarization model
      const model = await this.loadModel('SUMMARIZATION');
      
      if (!model) {
        result.summary = '';
        return;
      }
      
      // TODO: Implement actual summarization using TensorFlow.js model
      // For now, use a simple placeholder implementation
      const summary = 'This is a placeholder summary of the content.';
      
      result.summary = summary;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to generate summary',
        error,
        context: 'ModelManager.generateSummary',
        category: ErrorCategory.AI,
        level: ErrorLevel.WARNING
      });
      
      result.summary = '';
    }
  }

  /**
   * Analyze sentiment in text
   */
  async analyzeSentiment(text, result) {
    try {
      // Use text embedding model for sentiment analysis
      const model = await this.loadModel('TEXT_EMBEDDING');
      
      if (!model) {
        result.sentiment = null;
        return;
      }
      
      // TODO: Implement actual sentiment analysis using TensorFlow.js model
      // For now, use a simple placeholder implementation
      const sentiment = {
        score: 0.65, // Range: -1 to 1
        label: 'positive',
        confidence: 0.78
      };
      
      result.sentiment = sentiment;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to analyze sentiment',
        error,
        context: 'ModelManager.analyzeSentiment',
        category: ErrorCategory.AI,
        level: ErrorLevel.WARNING
      });
      
      result.sentiment = null;
    }
  }

  /**
   * Generate insights from knowledge nodes
   */
  async generateInsights(nodes, options = {}) {
    try {
      // Default options
      const insightOptions = {
        type: options.type || 'general',
        maxResults: options.maxResults || 3,
        ...options
      };
      
      // Check if we have nodes to analyze
      if (!nodes || nodes.length === 0) {
        return {
          insights: [],
          type: insightOptions.type,
          timestamp: Date.now(),
          success: false,
          error: 'No data to generate insights from'
        };
      }
      
      // Generate different types of insights based on the type
      let insights = [];
      
      switch (insightOptions.type) {
        case 'connections':
          insights = await this.generateConnectionInsights(nodes, insightOptions);
          break;
          
        case 'trends':
          insights = await this.generateTrendInsights(nodes, insightOptions);
          break;
          
        case 'summary':
          insights = await this.generateSummaryInsights(nodes, insightOptions);
          break;
          
        case 'general':
        default:
          insights = await this.generateGeneralInsights(nodes, insightOptions);
      }
      
      return {
        insights,
        type: insightOptions.type,
        nodeCount: nodes.length,
        timestamp: Date.now(),
        success: true
      };
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to generate insights',
        error,
        context: 'ModelManager.generateInsights',
        category: ErrorCategory.AI,
        level: ErrorLevel.ERROR,
        metadata: { nodeCount: nodes?.length, type: options?.type }
      });
      
      return {
        insights: [],
        type: options?.type || 'general',
        timestamp: Date.now(),
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate general insights
   */
  async generateGeneralInsights(nodes, options) {
    // TODO: Implement actual insight generation
    // For now, use placeholders
    return [
      {
        title: 'Common Theme',
        content: 'These nodes share technology-related themes.',
        confidence: 0.85
      },
      {
        title: 'Suggested Connection',
        content: 'Consider exploring the relationship between topics A and B.',
        confidence: 0.75
      }
    ];
  }

  /**
   * Generate connection insights
   */
  async generateConnectionInsights(nodes, options) {
    // TODO: Implement actual connection insight generation
    // For now, use placeholders
    return [
      {
        title: 'Strong Connection',
        content: 'Nodes X and Y have strong topical similarities.',
        confidence: 0.88
      }
    ];
  }

  /**
   * Generate trend insights
   */
  async generateTrendInsights(nodes, options) {
    // TODO: Implement actual trend insight generation
    // For now, use placeholders
    return [
      {
        title: 'Emerging Topic',
        content: 'Topic Z is appearing more frequently in recent content.',
        confidence: 0.72
      }
    ];
  }

  /**
   * Generate summary insights
   */
  async generateSummaryInsights(nodes, options) {
    // TODO: Implement actual summary insight generation
    // For now, use placeholders
    return [
      {
        title: 'Content Summary',
        content: 'These nodes primarily cover technological developments with a focus on AI and machine learning.',
        confidence: 0.81
      }
    ];
  }

  /**
   * Get information about currently loaded models
   */
  getLoadedModels() {
    const loadedModelsInfo = [];
    
    for (const [modelName, model] of this.loadedModels.entries()) {
      const modelInfo = MODELS[modelName];
      
      if (modelInfo) {
        loadedModelsInfo.push({
          name: modelInfo.name,
          version: modelInfo.version,
          type: modelInfo.type,
          sizeBytes: modelInfo.sizeBytes
        });
      }
    }
    
    return loadedModelsInfo;
  }
}

// Create singleton instance
export default ModelManager;