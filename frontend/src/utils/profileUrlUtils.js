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
 * Create a profile URL for a user with role
 * @param {string} name - The user's name
 * @param {string} role - The user's role (athlete, coach, scout)
 * @returns {string} - Full profile URL
 */
export const createProfileUrl = (name, role) => {
  const encodedName = encodeProfileName(name);
  const roleLower = (role || 'athlete').toLowerCase();
  return `/profile/${roleLower}/${encodedName}`;
};

/**
 * Extract name and role from a profile URL
 * @param {string} url - The profile URL
 * @returns {object} - Object with name and role
 */
export const extractProfileInfoFromUrl = (url) => {
  const match = url.match(/\/profile\/([^\/]+)\/(.+)$/);
  if (match) {
    return {
      role: match[1],
      name: decodeProfileName(match[2])
    };
  }
  return { role: null, name: '' };
};

/**
 * Extract name from a profile URL (legacy support)
 * @param {string} url - The profile URL
 * @returns {string} - The decoded name
 */
export const extractNameFromProfileUrl = (url) => {
  const info = extractProfileInfoFromUrl(url);
  return info.name;
};

/**
 * Examples of how names are handled:
 * 
 * "John Doe" (athlete) -> "/profile/athlete/john%20doe"
 * "Jane Smith" (coach) -> "/profile/coach/jane%20smith"
 * "Bob Wilson" (scout) -> "/profile/scout/bob%20wilson"
 * "john-doe" (athlete) -> "/profile/athlete/john%20doe" 
 * "john_doe" (coach) -> "/profile/coach/john%20doe"
 * "JOHN DOE" (scout) -> "/profile/scout/john%20doe"
 * "JohnDoe" (athlete) -> "/profile/athlete/johndoe"
 * 
 * All these variations will match the same user in the database
 * because the Lambda function normalizes them to the same format.
 */ 