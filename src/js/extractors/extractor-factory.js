/**
 * Nexus Extractor Factory
 * Creates appropriate extractors based on content type.
 * 
 * Version 3.0.0
 */

import errorHandler, { ErrorCategory, ErrorLevel } from '../core/error-handler.js';
import WebPageExtractor from './web-page-extractor.js';
import ArticleExtractor from './article-extractor.js';
import CodeExtractor from './code-extractor.js';
import PDFExtractor from './pdf-extractor.js';

/**
 * Get the appropriate extractor for a given page/content
 */
export function getExtractor(data) {
  try {
    const url = data.url || '';
    const contentType = data.contentType || '';
    const metadata = data.metadata || {};
    
    // Check if PDF
    if (url.endsWith('.pdf') || contentType.includes('application/pdf')) {
      return new PDFExtractor();
    }
    
    // Check if code repository or code file
    if (isCodePage(url, metadata)) {
      return new CodeExtractor();
    }
    
    // Check if article
    if (isArticlePage(metadata)) {
      return new ArticleExtractor();
    }
    
    // Default to web page extractor
    return new WebPageExtractor();
  } catch (error) {
    errorHandler.handleError({
      message: 'Error creating content extractor',
      error,
      context: 'getExtractor',
      category: ErrorCategory.PARSING,
      level: ErrorLevel.ERROR,
      metadata: { url: data?.url }
    });
    
    // Fall back to web page extractor
    return new WebPageExtractor();
  }
}

/**
 * Check if the page is a code page
 */
function isCodePage(url, metadata) {
  // Check URL patterns for code repositories
  const codeRepoPatterns = [
    /github\.com\/[\w-]+\/[\w-]+/,
    /gitlab\.com\/[\w-]+\/[\w-]+/,
    /bitbucket\.org\/[\w-]+\/[\w-]+/
  ];
  
  if (codeRepoPatterns.some(pattern => pattern.test(url))) {
    return true;
  }
  
  // Check file extensions for code files
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
    '.go', '.rb', '.php', '.html', '.css', '.json', '.xml', '.yaml', '.yml'
  ];
  
  if (codeExtensions.some(ext => url.endsWith(ext))) {
    return true;
  }
  
  // Check if page has code elements
  if (metadata.hasCodeBlocks || metadata.isCodeRepository) {
    return true;
  }
  
  return false;
}

/**
 * Check if the page is an article
 */
function isArticlePage(metadata) {
  // Check for article schema or metadata
  if (metadata.type === 'article' || metadata.isArticle) {
    return true;
  }
  
  // Check if page has article elements
  if (metadata.hasArticleElements) {
    return true;
  }
  
  // Check for publisher or author information
  if (metadata.publisher || metadata.author) {
    return true;
  }
  
  return false;
}

export default { getExtractor };
