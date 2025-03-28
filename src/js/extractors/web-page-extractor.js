/**
 * Nexus Web Page Extractor
 * Extracts content from general web pages.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from '../core/error-handler.js';
import { getPageMetadata } from './page-metadata.js';
import { cleanText, removeDuplicateParagraphs } from '../utils/text-cleaner.js';

/**
 * Web Page Extractor class
 * Extracts content from general web pages
 */
export default class WebPageExtractor {
  constructor() {
    this.name = 'WebPageExtractor';
  }
  
  /**
   * Extract content from a web page
   */
  async extract(data) {
    try {
      // Initialize result object
      const result = {
        url: data.url || '',
        title: data.metadata?.title || '',
        metadata: { ...data.metadata },
        text: '',
        html: '',
        images: [],
        links: [],
        extractedAt: Date.now(),
        extractor: this.name
      };
      
      // If content is already provided, use it
      if (data.content?.text) {
        result.text = data.content.text;
        result.html = data.content.html || '';
      } else {
        // Extract content from the page
        const content = await this.extractContent(data);
        result.text = content.text;
        result.html = content.html;
      }
      
      // Clean text content
      result.text = cleanText(result.text);
      result.text = removeDuplicateParagraphs(result.text);
      
      // Extract images
      if (data.content?.images) {
        result.images = data.content.images;
      } else {
        result.images = await this.extractImages(data);
      }
      
      // Extract links
      if (data.content?.links) {
        result.links = data.content.links;
      } else {
        result.links = await this.extractLinks(data);
      }
      
      return result;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to extract web page content',
        error,
        context: 'WebPageExtractor.extract',
        category: ErrorCategory.PARSING,
        level: ErrorLevel.ERROR,
        metadata: { url: data?.url }
      });
      
      // Return basic result on error
      return {
        url: data.url || '',
        title: data.metadata?.title || '',
        metadata: { ...data.metadata },
        text: '',
        html: '',
        images: [],
        links: [],
        extractedAt: Date.now(),
        extractor: this.name,
        error: error.message
      };
    }
  }
  
  /**
   * Extract text content from page data
   */
  async extractContent(data) {
    // Select the main content elements using common patterns
    const mainSelectors = [
      'article',
      'main',
      '.content',
      '.main-content',
      '#content',
      '#main',
      '.article-content',
      '.post-content'
    ];
    
    let mainContent = null;
    
    // Try to find main content container
    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = element;
        break;
      }
    }
    
    // If no main content container found, use body
    if (!mainContent) {
      mainContent = document.body;
    }
    
    // Extract text from main content
    let text = '';
    
    // Get all text nodes, excluding scripts, styles, and hidden elements
    const textNodes = this.getTextNodes(mainContent);
    
    // Convert to paragraphs
    const paragraphs = this.getParagraphsFromTextNodes(textNodes);
    
    // Join paragraphs into text
    text = paragraphs.join('\n\n');
    
    // Get HTML content
    const html = mainContent.innerHTML;
    
    return { text, html };
  }
  
  /**
   * Get all text nodes from an element, excluding scripts, styles, and hidden elements
   */
  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip empty text nodes
          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip nodes in scripts, styles, and hidden elements
          const parent = node.parentElement;
          if (!parent) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (
            parent.tagName === 'SCRIPT' ||
            parent.tagName === 'STYLE' ||
            parent.tagName === 'NOSCRIPT' ||
            window.getComputedStyle(parent).display === 'none' ||
            window.getComputedStyle(parent).visibility === 'hidden'
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
    
    return textNodes;
  }
  
  /**
   * Convert text nodes to paragraphs
   */
  getParagraphsFromTextNodes(textNodes) {
    const paragraphs = [];
    let currentParagraph = '';
    
    for (const node of textNodes) {
      const text = node.textContent.trim();
      if (!text) continue;
      
      const parent = node.parentElement;
      
      // Check if this is a block-level element
      const style = window.getComputedStyle(parent);
      const isBlock = style.display === 'block';
      
      // Check if parent is a heading, paragraph, list item, etc.
      const isNewParagraphElement = /^(H1|H2|H3|H4|H5|H6|P|LI|TD|FIGCAPTION|BLOCKQUOTE)$/.test(parent.tagName);
      
      if (isBlock || isNewParagraphElement) {
        // If we have text in the current paragraph, save it
        if (currentParagraph) {
          paragraphs.push(currentParagraph);
          currentParagraph = '';
        }
        
        // Start a new paragraph
        currentParagraph = text;
      } else {
        // Append to current paragraph with space
        if (currentParagraph) {
          currentParagraph += ' ' + text;
        } else {
          currentParagraph = text;
        }
      }
    }
    
    // Add the last paragraph if not empty
    if (currentParagraph) {
      paragraphs.push(currentParagraph);
    }
    
    return paragraphs;
  }
  
  /**
   * Extract images from page data
   */
  async extractImages(data) {
    try {
      const images = [];
      
      // Get all images in the document
      const imgElements = document.querySelectorAll('img');
      
      for (const img of imgElements) {
        // Skip tiny images (likely icons or tracking pixels)
        if (img.width < 100 || img.height < 100) {
          continue;
        }
        
        // Skip hidden images
        if (
          window.getComputedStyle(img).display === 'none' ||
          window.getComputedStyle(img).visibility === 'hidden'
        ) {
          continue;
        }
        
        // Get image data
        const imageData = {
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height
        };
        
        // Add to images array if not already present
        if (!images.some(i => i.src === imageData.src)) {
          images.push(imageData);
        }
      }
      
      return images;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to extract images',
        error,
        context: 'WebPageExtractor.extractImages',
        category: ErrorCategory.PARSING,
        level: ErrorLevel.WARNING,
        metadata: { url: data?.url }
      });
      
      return [];
    }
  }
  
  /**
   * Extract links from page data
   */
  async extractLinks(data) {
    try {
      const links = [];
      
      // Get all links in the document
      const linkElements = document.querySelectorAll('a');
      
      for (const link of linkElements) {
        // Skip empty links
        if (!link.href || link.href === '#' || link.href.startsWith('javascript:')) {
          continue;
        }
        
        // Skip hidden links
        if (
          window.getComputedStyle(link).display === 'none' ||
          window.getComputedStyle(link).visibility === 'hidden'
        ) {
          continue;
        }
        
        // Get link data
        const linkData = {
          href: link.href,
          text: link.textContent.trim(),
          title: link.title || ''
        };
        
        // Add to links array if not already present and not internal anchor
        if (!links.some(l => l.href === linkData.href) && 
            !linkData.href.startsWith(window.location.origin + window.location.pathname + '#')) {
          links.push(linkData);
        }
      }
      
      return links;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to extract links',
        error,
        context: 'WebPageExtractor.extractLinks',
        category: ErrorCategory.PARSING,
        level: ErrorLevel.WARNING,
        metadata: { url: data?.url }
      });
      
      return [];
    }
  }
}
