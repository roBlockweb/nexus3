/**
 * Nexus Text Cleaner
 * Provides utilities for cleaning and normalizing text content.
 * 
 * Version 3.0.0
 */

/**
 * Clean text content by removing excessive whitespace, normalizing line breaks, etc.
 * @param {string} text - The text to clean
 * @returns {string} Cleaned text
 */
export function cleanText(text) {
  if (!text) return '';
  
  // Normalize whitespace and line breaks
  let cleaned = text
    .replace(/\r\n/g, '\n')    // Convert Windows line breaks to Unix
    .replace(/\r/g, '\n')      // Convert Mac line breaks to Unix
    .replace(/\t/g, ' ')       // Convert tabs to spaces
    .replace(/\n{3,}/g, '\n\n')// Limit consecutive line breaks to 2
    .replace(/ {2,}/g, ' ');   // Collapse multiple spaces to single
  
  // Remove common boilerplate text
  cleaned = removeBoilerplate(cleaned);
  
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  
  // Ensure line breaks before headings
  cleaned = cleaned.replace(/([^\n])(#{1,6} )/g, '$1\n\n$2');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Remove common boilerplate text from web pages
 * @param {string} text - The text to process
 * @returns {string} Text with boilerplate removed
 */
function removeBoilerplate(text) {
  // Common cookie consent messages
  text = text.replace(/(?:This website|We|Our site) uses cookies.*?(?:privacy policy|cookie policy|accept|settings).*/gi, '');
  
  // Newsletter sign up forms
  text = text.replace(/Sign up (?:for|to) our newsletter.*?(?:email|subscribe).*/gi, '');
  
  // GDPR/Privacy notices
  text = text.replace(/(?:We value|Read|View) our (?:privacy|cookie) policy.*/gi, '');
  
  // Copyright notices
  text = text.replace(/(?:©|Copyright) 20\d\d?(?:-20\d\d)?(?: All Rights Reserved)?.*/gi, '');
  
  // Social media prompts
  text = text.replace(/(?:Follow|Share|Like) (?:us|this) on (?:Facebook|Twitter|Instagram|LinkedIn).*/gi, '');
  
  // Comment sections headers
  text = text.replace(/(?:Leave a comment|Comments \(\d+\)|Add your comment).*/gi, '');
  
  // Navigation text
  text = text.replace(/(?:Skip to content|Main Menu|Navigation|Home|Back to top).*/gi, '');
  
  return text;
}

/**
 * Remove duplicate paragraphs from text
 * @param {string} text - The text to process
 * @returns {string} Text with duplicate paragraphs removed
 */
export function removeDuplicateParagraphs(text) {
  if (!text) return '';
  
  // Split text into paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  
  // Filter out exact duplicates
  const uniqueParagraphs = [];
  const seenParagraphs = new Set();
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    
    // Skip empty paragraphs
    if (!trimmed) {
      continue;
    }
    
    // Skip very short paragraphs (likely navigation or UI elements)
    if (trimmed.length < 20) {
      uniqueParagraphs.push(trimmed);
      continue;
    }
    
    // Check for exact match
    if (!seenParagraphs.has(trimmed)) {
      seenParagraphs.add(trimmed);
      uniqueParagraphs.push(trimmed);
    }
  }
  
  // Rejoin paragraphs
  return uniqueParagraphs.join('\n\n');
}

/**
 * Extract keywords from text based on frequency and importance
 * @param {string} text - The text to analyze
 * @param {number} count - Max number of keywords to extract
 * @returns {string[]} Array of extracted keywords
 */
export function extractKeywords(text, count = 10) {
  if (!text) return [];
  
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
    'at', 'from', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'of', 'in', 'on', 'is', 'are', 'was', 'were', 'be', 'been',
    'has', 'have', 'had', 'do', 'does', 'did', 'can', 'could', 'will',
    'would', 'should', 'must', 'that', 'this', 'these', 'those', 'there',
    'their', 'some', 'all', 'many', 'any', 'most', 'more', 'other', 'such'
  ]);
  
  // Normalize text
  const normalized = text.toLowerCase();
  
  // Split into words
  const words = normalized.match(/\b[a-z]{3,}\b/g) || [];
  
  // Count word frequencies
  const wordCounts = {};
  
  for (const word of words) {
    if (!stopWords.has(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }
  
  // Sort by frequency
  const sortedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(entry => entry[0]);
  
  return sortedWords;
}

/**
 * Extract sentences from text
 * @param {string} text - The text to process
 * @returns {string[]} Array of sentences
 */
export function extractSentences(text) {
  if (!text) return [];
  
  // Split text by sentence boundaries
  // This is a simplified approach; a more robust NLP solution would be better
  const sentenceRegex = /[.!?]+["']?\s+/g;
  const sentences = text.split(sentenceRegex)
    .map(s => s.trim())
    .filter(s => s.length > 10); // Filter out very short segments
  
  return sentences;
}

/**
 * Calculate the reading level (complexity) of text
 * @param {string} text - The text to analyze
 * @returns {Object} Analysis of text complexity
 */
export function calculateReadingLevel(text) {
  if (!text) {
    return {
      fleschKincaidGrade: 0,
      averageWordLength: 0,
      averageSentenceLength: 0,
      complexity: 'unknown'
    };
  }
  
  // Get sentences
  const sentences = extractSentences(text);
  const sentenceCount = sentences.length || 1;
  
  // Get words
  const words = text.match(/\b\w+\b/g) || [];
  const wordCount = words.length || 1;
  
  // Get syllables (very approximate)
  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countSyllables(word);
  }
  
  // Calculate Flesch-Kincaid Grade Level
  const fleschKincaidGrade = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;
  
  // Calculate average word length
  const totalChars = words.reduce((sum, word) => sum + word.length, 0);
  const averageWordLength = totalChars / wordCount;
  
  // Calculate average sentence length
  const averageSentenceLength = wordCount / sentenceCount;
  
  // Determine complexity level
  let complexity = 'medium';
  if (fleschKincaidGrade < 6) {
    complexity = 'simple';
  } else if (fleschKincaidGrade > 12) {
    complexity = 'complex';
  }
  
  return {
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
    averageWordLength: Math.round(averageWordLength * 10) / 10,
    averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
    complexity
  };
}

/**
 * Count syllables in a word (approximation)
 * @param {string} word - The word to count syllables in
 * @returns {number} Syllable count
 */
function countSyllables(word) {
  word = word.toLowerCase();
  
  // Return 1 for very short words
  if (word.length <= 3) {
    return 1;
  }
  
  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g) || [];
  let count = vowelGroups.length;
  
  // Adjust for silent 'e' at the end
  if (word.endsWith('e')) {
    count--;
  }
  
  // Ensure minimum count of 1
  return Math.max(1, count);
}

export default {
  cleanText,
  removeDuplicateParagraphs,
  extractKeywords,
  extractSentences,
  calculateReadingLevel
};
