// XP milestones for leveling (matches backend awardExperiencePoints.js)
export const LEVEL_MILESTONES = [
  0,    // Level 0
  50,   // Level 1
  200,  // Level 2
  500,  // Level 3
  1000, // Level 4
  1750, // Level 5
  2850, // Level 6
  4350, // Level 7
  6350, // Level 8
  8950, // Level 9
  12250, // Level 10
  16350, // Level 11
  21350, // Level 12
  27350, // Level 13
  34550, // Level 14
  43050, // Level 15
  53050, // Level 16
  64550, // Level 17
  77550, // Level 18
  92550, // Level 19
  109550 // Level 20 (Max/Prestige)
];

/**
 * Get the user's level based on their total XP
 * @param {number} xp - Total experience points
 * @returns {number} Current level (1-based)
 */
export function getLevelFromXP(xp) {
  let level = 1;
  for (let i = 0; i < LEVEL_MILESTONES.length; i++) {
    if (xp >= LEVEL_MILESTONES[i]) level = i + 1;
    else break;
  }
  return level;
}

/**
 * Get XP progress percentage for the current level
 * @param {number} xp - Total experience points
 * @returns {number} Progress percentage (0-100)
 */
export function getXPProgress(xp) {
  const currentLevel = getLevelFromXP(xp);
  
  // If at max level, return 100%
  if (currentLevel >= LEVEL_MILESTONES.length) {
    return 100;
  }
  
  const currentLevelXP = LEVEL_MILESTONES[currentLevel - 1];
  const nextLevelXP = LEVEL_MILESTONES[currentLevel];
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  
  return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
}

/**
 * Get XP needed for the next level
 * @param {number} xp - Total experience points
 * @returns {number} XP needed for next level, or 0 if at max level
 */
export function getXPNeededForNextLevel(xp) {
  const currentLevel = getLevelFromXP(xp);
  
  if (currentLevel >= LEVEL_MILESTONES.length) {
    return 0; // Already at max level
  }
  
  const nextLevelXP = LEVEL_MILESTONES[currentLevel];
  return nextLevelXP - xp;
}

/**
 * Get XP progress details for display
 * @param {number} xp - Total experience points
 * @returns {object} Object with level, progress percentage, and XP details
 */
export function getXPDetails(xp) {
  const level = getLevelFromXP(xp);
  const progress = getXPProgress(xp);
  const xpNeeded = getXPNeededForNextLevel(xp);
  
  return {
    level,
    progress,
    xpNeeded,
    xpTotal: xp
  };
}

/**
 * Calculate age from date of birth
 * @param {string} dateOfBirth - Date of birth string
 * @returns {string|number} Age in years or 'N/A' if invalid
 */
export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 'N/A';
  
  try {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    // Check if the date is valid
    if (isNaN(birthDate.getTime())) {
      return 'N/A';
    }
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // If age is negative (future date) or unreasonably high, return N/A
    if (age < 0 || age > 120) {
      return 'N/A';
    }
    
    return age;
  } catch (error) {
    return 'N/A';
  }
}

// Conversion functions
const inchesToCm = (inches) => Math.round(inches * 2.54);
const cmToInches = (cm) => Math.round(cm / 2.54);
const lbsToKg = (lbs) => Math.round(lbs * 0.453592);
const kgToLbs = (kg) => Math.round(kg / 0.453592);

// Format height for display
const formatHeightImperial = (inches) => {
  const feet = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${feet}'${inch}"`;
};

const formatHeightMetric = (cm) => {
  const meters = Math.floor(cm / 100);
  const remainingCm = cm % 100;
  return `${meters}m ${remainingCm}cm`;
};

/**
 * Format height in inches to feet/inches and cm (e.g., 6'0" (183 cm))
 * @param {number} height - Height in inches
 * @param {boolean} useMetric - Whether to display in metric units
 * @returns {string} Formatted height string
 */
export function formatHeight(height, useMetric = false) {
  if (!height) return 'N/A';
  if (useMetric) {
    return formatHeightMetric(inchesToCm(height));
  }
  return formatHeightImperial(height);
}

/**
 * Format weight in lbs to lbs and kg (e.g., 190 lbs (86 kg))
 * @param {number} weight - Weight in lbs
 * @param {boolean} useMetric - Whether to display in metric units
 * @returns {string} Formatted weight string
 */
export function formatWeight(weight, useMetric = false) {
  if (!weight) return 'N/A';
  if (useMetric) {
    return `${lbsToKg(weight)} kg`;
  }
  return `${weight} lbs`;
} 