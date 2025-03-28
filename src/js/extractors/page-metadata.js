/**
 * Nexus Page Metadata Extractor
 * Extracts metadata from web pages including OpenGraph, Twitter Cards, and more.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from '../core/error-handler.js';

/**
 * Extract metadata from the current page
 */
export function getPageMetadata() {
  try {
    // Initialize metadata
    const metadata = {
      title: '',
      description: '',
      keywords: [],
      author: '',
      publisher: '',
      publishedDate: null,
      modifiedDate: null,
      language: '',
      type: 'webpage',
      favicon: '',
      readingTimeMinutes: 0,
      ogTags: {},
      twitterTags: {},
      jsonLD: [],
      canonicalUrl: '',
      hasArticleElements: false,
      hasCodeBlocks: false
    };
    
    // Extract title
    metadata.title = getTitle();
    
    // Extract description
    metadata.description = getDescription();
    
    // Extract keywords
    metadata.keywords = getKeywords();
    
    // Extract author
    metadata.author = getAuthor();
    
    // Extract dates
    const dates = getDates();
    metadata.publishedDate = dates.published;
    metadata.modifiedDate = dates.modified;
    
    // Extract language
    metadata.language = getLanguage();
    
    // Extract type
    metadata.type = getType();
    
    // Extract favicon
    metadata.favicon = getFavicon();
    
    // Extract reading time
    metadata.readingTimeMinutes = estimateReadingTime();
    
    // Extract social tags
    metadata.ogTags = getOpenGraphTags();
    metadata.twitterTags = getTwitterTags();
    
    // Extract JSON-LD
    metadata.jsonLD = getJsonLD();
    
    // Extract canonical URL
    metadata.canonicalUrl = getCanonicalUrl();
    
    // Check for special page types
    metadata.hasArticleElements = checkForArticleElements();
    metadata.hasCodeBlocks = checkForCodeBlocks();
    
    return metadata;
  } catch (error) {
    errorHandler.handleError({
      message: 'Failed to extract page metadata',
      error,
      context: 'getPageMetadata',
      category: ErrorCategory.PARSING,
      level: ErrorLevel.WARNING
    });
    
    // Return basic metadata on error
    return {
      title: document.title || '',
      description: '',
      type: 'webpage'
    };
  }
}

/**
 * Get page title from various sources
 */
function getTitle() {
  // Try OpenGraph title first
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && ogTitle.content) {
    return ogTitle.content;
  }
  
  // Try Twitter title
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle && twitterTitle.content) {
    return twitterTitle.content;
  }
  
  // Try document title
  if (document.title) {
    return document.title;
  }
  
  // Try h1 heading
  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent) {
    return h1.textContent.trim();
  }
  
  return '';
}

/**
 * Get page description from various sources
 */
function getDescription() {
  // Try OpenGraph description first
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && ogDesc.content) {
    return ogDesc.content;
  }
  
  // Try Twitter description
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc && twitterDesc.content) {
    return twitterDesc.content;
  }
  
  // Try meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && metaDesc.content) {
    return metaDesc.content;
  }
  
  return '';
}

/**
 * Get page keywords
 */
function getKeywords() {
  // Try meta keywords
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords && metaKeywords.content) {
    return metaKeywords.content
      .split(',')
      .map(keyword => keyword.trim())
      .filter(Boolean);
  }
  
  return [];
}

/**
 * Get page author
 */
function getAuthor() {
  // Try meta author
  const metaAuthor = document.querySelector('meta[name="author"]');
  if (metaAuthor && metaAuthor.content) {
    return metaAuthor.content;
  }
  
  // Try OpenGraph author
  const ogAuthor = document.querySelector('meta[property="og:author"]');
  if (ogAuthor && ogAuthor.content) {
    return ogAuthor.content;
  }
  
  // Try schema.org author
  const schemaAuthor = document.querySelector('[itemprop="author"]');
  if (schemaAuthor) {
    if (schemaAuthor.content) {
      return schemaAuthor.content;
    }
    if (schemaAuthor.textContent) {
      return schemaAuthor.textContent.trim();
    }
  }
  
  // Try article:author
  const articleAuthor = document.querySelector('meta[property="article:author"]');
  if (articleAuthor && articleAuthor.content) {
    return articleAuthor.content;
  }
  
  return '';
}

/**
 * Get published and modified dates
 */
function getDates() {
  const dates = {
    published: null,
    modified: null
  };
  
  // Try published date
  const publishedMeta = document.querySelector('meta[property="article:published_time"]');
  if (publishedMeta && publishedMeta.content) {
    try {
      dates.published = new Date(publishedMeta.content).getTime();
    } catch (e) {
      // Ignore invalid date
    }
  }
  
  // Try schema.org published date
  if (!dates.published) {
    const schemaPublished = document.querySelector('[itemprop="datePublished"]');
    if (schemaPublished && schemaPublished.content) {
      try {
        dates.published = new Date(schemaPublished.content).getTime();
      } catch (e) {
        // Ignore invalid date
      }
    }
  }
  
  // Try modified date
  const modifiedMeta = document.querySelector('meta[property="article:modified_time"]');
  if (modifiedMeta && modifiedMeta.content) {
    try {
      dates.modified = new Date(modifiedMeta.content).getTime();
    } catch (e) {
      // Ignore invalid date
    }
  }
  
  // Try schema.org modified date
  if (!dates.modified) {
    const schemaModified = document.querySelector('[itemprop="dateModified"]');
    if (schemaModified && schemaModified.content) {
      try {
        dates.modified = new Date(schemaModified.content).getTime();
      } catch (e) {
        // Ignore invalid date
      }
    }
  }
  
  return dates;
}

/**
 * Get page language
 */
function getLanguage() {
  // Try html lang attribute
  const htmlLang = document.documentElement.lang;
  if (htmlLang) {
    return htmlLang;
  }
  
  // Try meta content-language
  const metaLang = document.querySelector('meta[http-equiv="content-language"]');
  if (metaLang && metaLang.content) {
    return metaLang.content;
  }
  
  return '';
}

/**
 * Get page type
 */
function getType() {
  // Try OpenGraph type
  const ogType = document.querySelector('meta[property="og:type"]');
  if (ogType && ogType.content) {
    return ogType.content;
  }
  
  // Check for article elements
  if (checkForArticleElements()) {
    return 'article';
  }
  
  // Check for code blocks
  if (checkForCodeBlocks()) {
    return 'code';
  }
  
  return 'webpage';
}

/**
 * Get favicon URL
 */
function getFavicon() {
  // Try icon link
  const iconLink = document.querySelector('link[rel="icon"]');
  if (iconLink && iconLink.href) {
    return iconLink.href;
  }
  
  // Try shortcut icon link
  const shortcutIconLink = document.querySelector('link[rel="shortcut icon"]');
  if (shortcutIconLink && shortcutIconLink.href) {
    return shortcutIconLink.href;
  }
  
  // Try apple touch icon
  const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleTouchIcon && appleTouchIcon.href) {
    return appleTouchIcon.href;
  }
  
  // Default to /favicon.ico
  return new URL('/favicon.ico', window.location.origin).href;
}

/**
 * Estimate reading time based on content length
 */
function estimateReadingTime() {
  try {
    // Get main content element
    const mainElement = document.querySelector('main, article, .content, #content, .article, .post');
    
    // If no main element, use body
    const contentElement = mainElement || document.body;
    
    // Get text content
    const text = contentElement.textContent || '';
    
    // Count words (average reading speed is ~200-250 words per minute)
    const wordCount = text.trim().split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200);
    
    return readingTimeMinutes;
  } catch (error) {
    return 0;
  }
}

/**
 * Get OpenGraph tags
 */
function getOpenGraphTags() {
  const ogTags = {};
  
  // Get all og: meta tags
  const ogMetaTags = document.querySelectorAll('meta[property^="og:"]');
  
  ogMetaTags.forEach(tag => {
    const property = tag.getAttribute('property');
    if (property && tag.content) {
      const propName = property.replace('og:', '');
      ogTags[propName] = tag.content;
    }
  });
  
  return ogTags;
}

/**
 * Get Twitter Card tags
 */
function getTwitterTags() {
  const twitterTags = {};
  
  // Get all twitter: meta tags
  const twitterMetaTags = document.querySelectorAll('meta[name^="twitter:"]');
  
  twitterMetaTags.forEach(tag => {
    const name = tag.getAttribute('name');
    if (name && tag.content) {
      const propName = name.replace('twitter:', '');
      twitterTags[propName] = tag.content;
    }
  });
  
  return twitterTags;
}

/**
 * Get JSON-LD structured data
 */
function getJsonLD() {
  const result = [];
  
  // Get all JSON-LD script tags
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  
  jsonLdScripts.forEach(script => {
    try {
      const json = JSON.parse(script.textContent);
      result.push(json);
    } catch (e) {
      // Ignore invalid JSON
    }
  });
  
  return result;
}

/**
 * Get canonical URL
 */
function getCanonicalUrl() {
  // Try canonical link
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink && canonicalLink.href) {
    return canonicalLink.href;
  }
  
  // Try OpenGraph URL
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl && ogUrl.content) {
    return ogUrl.content;
  }
  
  return window.location.href;
}

/**
 * Check if the page has article elements
 */
function checkForArticleElements() {
  // Check for article tag
  if (document.querySelector('article')) {
    return true;
  }
  
  // Check for article metadata
  if (document.querySelector('meta[property="article:published_time"]')) {
    return true;
  }
  
  // Check for article-specific classes
  const articleClasses = [
    '.post',
    '.article',
    '.blog-post',
    '.entry',
    '.news-item',
    '.story'
  ];
  
  for (const className of articleClasses) {
    if (document.querySelector(className)) {
      return true;
    }
  }
  
  // Check for article schema
  if (document.querySelector('[itemtype*="Article"]')) {
    return true;
  }
  
  // Check if og:type is article
  const ogType = document.querySelector('meta[property="og:type"]');
  if (ogType && ogType.content === 'article') {
    return true;
  }
  
  return false;
}

/**
 * Check if the page has code blocks
 */
function checkForCodeBlocks() {
  // Check for code tags
  if (document.querySelectorAll('pre code').length > 0) {
    return true;
  }
  
  // Check for syntax highlighting elements
  const codeElements = [
    '.highlight',
    '.code',
    '.syntax',
    '.prettyprint',
    '.hljs'
  ];
  
  for (const className of codeElements) {
    if (document.querySelector(className)) {
      return true;
    }
  }
  
  // Check for code repository indicators
  if (
    document.querySelector('.github-corner') ||
    document.querySelector('.gitlab-corner') ||
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('gitlab.io')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Get page content
 */
export function getPageContent() {
  try {
    // Initialize content
    const content = {
      text: '',
      html: '',
      images: [],
      links: [],
      tables: []
    };
    
    // Try to find main content element
    const mainElement = document.querySelector('main, article, .content, #content, .article, .post');
    
    // If no main element, use body
    const contentElement = mainElement || document.body;
    
    // Get text content
    content.text = contentElement.textContent || '';
    
    // Get HTML content
    content.html = contentElement.innerHTML || '';
    
    // Get images
    const images = contentElement.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && img.width > 100 && img.height > 100) {
        content.images.push({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height
        });
      }
    });
    
    // Get links
    const links = contentElement.querySelectorAll('a');
    links.forEach(link => {
      if (link.href && !link.href.startsWith('javascript:')) {
        content.links.push({
          href: link.href,
          text: link.textContent.trim(),
          title: link.title || ''
        });
      }
    });
    
    // Get tables
    const tables = contentElement.querySelectorAll('table');
    tables.forEach(table => {
      const tableData = {
        caption: '',
        headers: [],
        rows: []
      };
      
      // Get caption
      const caption = table.querySelector('caption');
      if (caption) {
        tableData.caption = caption.textContent.trim();
      }
      
      // Get headers
      const headerRow = table.querySelector('thead tr');
      if (headerRow) {
        const headers = headerRow.querySelectorAll('th');
        headers.forEach(th => {
          tableData.headers.push(th.textContent.trim());
        });
      }
      
      // Get rows
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          rowData.push(cell.textContent.trim());
        });
        tableData.rows.push(rowData);
      });
      
      content.tables.push(tableData);
    });
    
    return content;
  } catch (error) {
    errorHandler.handleError({
      message: 'Failed to extract page content',
      error,
      context: 'getPageContent',
      category: ErrorCategory.PARSING,
      level: ErrorLevel.WARNING
    });
    
    // Return empty content on error
    return {
      text: '',
      html: '',
      images: [],
      links: [],
      tables: []
    };
  }
}

export default { getPageMetadata, getPageContent };
