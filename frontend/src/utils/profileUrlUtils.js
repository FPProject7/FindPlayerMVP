/**
 * Utility functions for handling profile URLs
 */

/**
 * Encode a name for use in a profile URL
 * @param {string} name - The user's name
 * @returns {string} - URL-safe encoded name
 */
export const encodeProfileName = (name) => {
  if (!name) return '';
  
  // Normalize the name: trim, lowercase, replace multiple spaces/hyphens/underscores with single space
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[-\s_]+/g, ' ');
  
  // Encode for URL (handles spaces, special characters, etc.)
  return encodeURIComponent(normalized);
};

/**
 * Decode a name from a profile URL
 * @param {string} encodedName - The encoded name from the URL
 * @returns {string} - Decoded name
 */
export const decodeProfileName = (encodedName) => {
  if (!encodedName) return '';
  
  try {
    return decodeURIComponent(encodedName);
  } catch (error) {
    console.error('Error decoding profile name:', error);
    return encodedName; // Return original if decoding fails
  }
};

/**
 * Create a profile URL for a user
 * @param {string} name - The user's name
 * @returns {string} - Full profile URL
 */
export const createProfileUrl = (name) => {
  const encodedName = encodeProfileName(name);
  return `/profile/${encodedName}`;
};

/**
 * Extract name from a profile URL
 * @param {string} url - The profile URL
 * @returns {string} - The decoded name
 */
export const extractNameFromProfileUrl = (url) => {
  const match = url.match(/\/profile\/(.+)$/);
  if (match) {
    return decodeProfileName(match[1]);
  }
  return '';
};

/**
 * Examples of how names are handled:
 * 
 * "John Doe" -> "/profile/john%20doe"
 * "john-doe" -> "/profile/john%20doe" 
 * "john_doe" -> "/profile/john%20doe"
 * "JOHN DOE" -> "/profile/john%20doe"
 * "JohnDoe" -> "/profile/johndoe"
 * 
 * All these variations will match the same user in the database
 * because the Lambda function normalizes them to the same format.
 */ 