/**
 * Nexus Article Extractor
 * Specialized extractor for article-type content with enhanced metadata.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from '../core/error-handler.js';
import { cleanText, removeDuplicateParagraphs, calculateReadingLevel } from '../utils/text-cleaner.js';
import WebPageExtractor from './web-page-extractor.js';

/**
 * Article Extractor class
 * Extends the basic web page extractor with article-specific functionality
 */
export default class ArticleExtractor extends WebPageExtractor {
  constructor() {
    super();
    this.name = 'ArticleExtractor';
  }
  
  /**
   * Extract content from an article
   */
  async extract(data) {
    try {
      // Get base extraction from web page extractor
      const baseResult = await super.extract(data);
      
      // Add article-specific extraction
      const articleResult = {
        ...baseResult,
        extractor: this.name,
        article: {
          headline: this.extractHeadline(data),
          author: this.extractAuthor(data),
          publishDate: this.extractPublishDate(data),
          modifiedDate: this.extractModifiedDate(data),
          publisher: this.extractPublisher(data),
          section: this.extractSection(data),
          readingTime: this.calculateReadingTime(baseResult.text),
          readingLevel: calculateReadingLevel(baseResult.text),
          featuredImage: this.extractFeaturedImage(data),
          comments: this.extractComments(data)
        }
      };
      
      return articleResult;
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to extract article content',
        error,
        context: 'ArticleExtractor.extract',
        category: ErrorCategory.PARSING,
        level: ErrorLevel.ERROR,
        metadata: { url: data?.url }
      });
      
      // Fall back to base extraction if article extraction fails
      const baseResult = await super.extract(data);
      return {
        ...baseResult,
        extractor: this.name
      };
    }
  }
  
  /**
   * Extract headline (separate from page title)
   */
  extractHeadline(data) {
    // Use existing metadata if available
    if (data.metadata?.headline) {
      return data.metadata.headline;
    }
    
    // Try to find headline in HTML
    const headlineSelectors = [
      'h1',
      '.headline',
      '.article-title',
      '.post-title',
      '.entry-title',
      '[itemprop="headline"]'
    ];
    
    for (const selector of headlineSelectors) {
      const headlineElement = document.querySelector(selector);
      if (headlineElement && headlineElement.textContent.trim()) {
        return headlineElement.textContent.trim();
      }
    }
    
    // Fall back to title from metadata
    return data.metadata?.title || '';
  }
  
  /**
   * Extract article author
   */
  extractAuthor(data) {
    // Use existing metadata if available
    if (data.metadata?.author) {
      return data.metadata.author;
    }
    
    // Try to find author in HTML
    const authorSelectors = [
      '[rel="author"]',
      '.author',
      '.byline',
      '.article-author',
      '.post-author',
      '[itemprop="author"]',
      '.meta-author'
    ];
    
    for (const selector of authorSelectors) {
      const authorElement = document.querySelector(selector);
      if (authorElement && authorElement.textContent.trim()) {
        return authorElement.textContent.trim()
          .replace(/^by\s+/i, '') // Remove "By " prefix
          .replace(/^author[:\s]+/i, ''); // Remove "Author: " prefix
      }
    }
    
    return '';
  }
  
  /**
   * Extract publish date
   */
  extractPublishDate(data) {
    // Use existing metadata if available
    if (data.metadata?.publishedDate) {
      return data.metadata.publishedDate;
    }
    
    // Try to find publish date in meta tags
    const publishDateMeta = document.querySelector('meta[property="article:published_time"]');
    if (publishDateMeta && publishDateMeta.content) {
      try {
        return new Date(publishDateMeta.content).getTime();
      } catch (e) {
        // Ignore invalid date
      }
    }
    
    // Try to find publish date in HTML
    const dateSelectors = [
      '[itemprop="datePublished"]',
      '.published-date',
      '.article-date',
      '.post-date',
      '.entry-date',
      '.meta-date',
      'time'
    ];
    
    for (const selector of dateSelectors) {
      const dateElement = document.querySelector(selector);
      if (dateElement) {
        // Check for datetime attribute first
        if (dateElement.hasAttribute('datetime')) {
          try {
            return new Date(dateElement.getAttribute('datetime')).getTime();
          } catch (e) {
            // Ignore invalid date
          }
        }
        
        // Try parsing the text content
        if (dateElement.textContent.trim()) {
          try {
            return new Date(dateElement.textContent.trim()).getTime();
          } catch (e) {
            // Ignore invalid date
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract modified date
   */
  extractModifiedDate(data) {
    // Use existing metadata if available
    if (data.metadata?.modifiedDate) {
      return data.metadata.modifiedDate;
    }
    
    // Try to find modified date in meta tags
    const modifiedDateMeta = document.querySelector('meta[property="article:modified_time"]');
    if (modifiedDateMeta && modifiedDateMeta.content) {
      try {
        return new Date(modifiedDateMeta.content).getTime();
      } catch (e) {
        // Ignore invalid date
      }
    }
    
    // Try to find modified date in HTML
    const dateSelectors = [
      '[itemprop="dateModified"]',
      '.modified-date',
      '.updated-date'
    ];
    
    for (const selector of dateSelectors) {
      const dateElement = document.querySelector(selector);
      if (dateElement) {
        // Check for datetime attribute first
        if (dateElement.hasAttribute('datetime')) {
          try {
            return new Date(dateElement.getAttribute('datetime')).getTime();
          } catch (e) {
            // Ignore invalid date
          }
        }
        
        // Try parsing the text content
        if (dateElement.textContent.trim()) {
          try {
            return new Date(dateElement.textContent.trim()).getTime();
          } catch (e) {
            // Ignore invalid date
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract publisher
   */
  extractPublisher(data) {
    // Use existing metadata if available
    if (data.metadata?.publisher) {
      return data.metadata.publisher;
    }
    
    // Try to find publisher in meta tags
    const publisherMeta = document.querySelector('meta[property="og:site_name"]');
    if (publisherMeta && publisherMeta.content) {
      return publisherMeta.content;
    }
    
    // Try to find publisher in HTML
    const publisherSelectors = [
      '[itemprop="publisher"]',
      '.publisher',
      '.site-name',
      '.site-title'
    ];
    
    for (const selector of publisherSelectors) {
      const publisherElement = document.querySelector(selector);
      if (publisherElement && publisherElement.textContent.trim()) {
        return publisherElement.textContent.trim();
      }
    }
    
    // Extract from domain name
    try {
      const hostname = new URL(data.url).hostname;
      return hostname
        .replace(/^www\./, '')
        .split('.')
        .slice(0, -1)
        .join('.');
    } catch (e) {
      // Ignore URL parsing errors
    }
    
    return '';
  }
  
  /**
   * Extract article section/category
   */
  extractSection(data) {
    // Try to find section in meta tags
    const sectionMeta = document.querySelector('meta[property="article:section"]');
    if (sectionMeta && sectionMeta.content) {
      return sectionMeta.content;
    }
    
    // Try to find section in HTML
    const sectionSelectors = [
      '[itemprop="articleSection"]',
      '.section',
      '.category',
      '.article-category',
      '.post-category'
    ];
    
    for (const selector of sectionSelectors) {
      const sectionElement = document.querySelector(selector);
      if (sectionElement && sectionElement.textContent.trim()) {
        return sectionElement.textContent.trim();
      }
    }
    
    // Try breadcrumbs
    const breadcrumbs = document.querySelectorAll('.breadcrumbs a, .breadcrumb a, nav[aria-label="Breadcrumb"] a');
    if (breadcrumbs.length > 1) {
      // Skip the first (usually "Home") and use the second
      const secondBreadcrumb = breadcrumbs[1];
      if (secondBreadcrumb && secondBreadcrumb.textContent.trim()) {
        return secondBreadcrumb.textContent.trim();
      }
    }
    
    return '';
  }
  
  /**
   * Calculate reading time based on word count
   */
  calculateReadingTime(text) {
    if (!text) return 0;
    
    // Count words (average reading speed is ~200-250 words per minute)
    const wordCount = text.trim().split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
    
    return readingTimeMinutes;
  }
  
  /**
   * Extract featured image
   */
  extractFeaturedImage(data) {
    // Try OpenGraph image
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && ogImage.content) {
      return {
        url: ogImage.content,
        alt: '',
        width: null,
        height: null
      };
    }
    
    // Try Twitter image
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage && twitterImage.content) {
      return {
        url: twitterImage.content,
        alt: '',
        width: null,
        height: null
      };
    }
    
    // Try featured image selectors
    const imageSelectors = [
      '.featured-image img',
      '.post-thumbnail img',
      '.article-image img',
      '.hero-image img',
      'article img:first-of-type'
    ];
    
    for (const selector of imageSelectors) {
      const imageElement = document.querySelector(selector);
      if (imageElement && imageElement.src) {
        return {
          url: imageElement.src,
          alt: imageElement.alt || '',
          width: imageElement.width || null,
          height: imageElement.height || null
        };
      }
    }
    
    return null;
  }
  
  /**
   * Extract comments if available
   */
  extractComments(data) {
    // Try to find comments section
    const commentSelectors = [
      '#comments',
      '.comments',
      '.comment-list',
      '.comments-area'
    ];
    
    let commentsElement = null;
    
    for (const selector of commentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        commentsElement = element;
        break;
      }
    }
    
    if (!commentsElement) {
      return {
        count: 0,
        comments: []
      };
    }
    
    // Try to find individual comments
    const commentItemSelectors = [
      '.comment',
      '.comment-item',
      '.comment-body',
      'article.comment'
    ];
    
    let commentItems = [];
    
    for (const selector of commentItemSelectors) {
      const items = commentsElement.querySelectorAll(selector);
      if (items.length > 0) {
        commentItems = Array.from(items);
        break;
      }
    }
    
    // Extract comment data
    const comments = commentItems.map(item => {
      // Extract author
      const authorElement = item.querySelector('.comment-author, .author, [itemprop="creator"]');
      const author = authorElement ? authorElement.textContent.trim() : 'Anonymous';
      
      // Extract date
      const dateElement = item.querySelector('.comment-date, .date, time, [itemprop="dateCreated"]');
      let date = null;
      
      if (dateElement) {
        if (dateElement.hasAttribute('datetime')) {
          try {
            date = new Date(dateElement.getAttribute('datetime')).getTime();
          } catch (e) {
            // Ignore invalid date
          }
        } else if (dateElement.textContent.trim()) {
          try {
            date = new Date(dateElement.textContent.trim()).getTime();
          } catch (e) {
            // Ignore invalid date
          }
        }
      }
      
      // Extract content
      const contentElement = item.querySelector('.comment-content, .comment-text, .content, [itemprop="text"]');
      const content = contentElement ? contentElement.textContent.trim() : '';
      
      return {
        author,
        date,
        content
      };
    });
    
    return {
      count: comments.length,
      comments
    };
  }
}
