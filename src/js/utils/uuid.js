/**
 * UUID Generation Utility
 * Generates RFC4122 version 4 compliant UUID.
 * 
 * Version 3.0.0
 */

/**
 * Generate a RFC4122 version 4 compliant UUID
 * @returns {string} A UUID string
 */
export function v4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a short UUID (8 characters)
 * Useful for cases where a full UUID is not necessary
 * @returns {string} A short UUID string
 */
export function shortId() {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Check if a string is a valid UUID v4
 * @param {string} uuid - The string to validate
 * @returns {boolean} True if the string is a valid UUID v4
 */
export function isValidUUID(uuid) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

export default {
  v4,
  shortId,
  isValidUUID
};
