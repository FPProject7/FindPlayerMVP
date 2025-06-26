// Test file for levelUtils.js - can be run with Jest or similar
import { getLevelFromXP, getXPProgress, getXPDetails, LEVEL_MILESTONES } from './levelUtils';

// Test cases for XP calculations
const testCases = [
  { xp: 0, expectedLevel: 1, expectedProgress: 0 },
  { xp: 5, expectedLevel: 1, expectedProgress: 50 }, // 5/10 = 50%
  { xp: 10, expectedLevel: 2, expectedProgress: 0 }, // Just reached level 2
  { xp: 17, expectedLevel: 2, expectedProgress: 46.67 }, // 7/15 = 46.67%
  { xp: 25, expectedLevel: 3, expectedProgress: 0 }, // Just reached level 3
  { xp: 37, expectedLevel: 3, expectedProgress: 48 }, // 12/25 = 48%
  { xp: 50, expectedLevel: 4, expectedProgress: 0 }, // Just reached level 4
  { xp: 75, expectedLevel: 4, expectedProgress: 50 }, // 25/50 = 50%
  { xp: 100, expectedLevel: 5, expectedProgress: 0 }, // Just reached level 5
  { xp: 150, expectedLevel: 5, expectedProgress: 50 }, // 50/100 = 50%
  { xp: 10000, expectedLevel: 17, expectedProgress: 100 }, // Max level
];

console.log('Testing XP calculations...');

testCases.forEach(({ xp, expectedLevel, expectedProgress }) => {
  const actualLevel = getLevelFromXP(xp);
  const actualProgress = getXPProgress(xp);
  const details = getXPDetails(xp);
  
  console.log(`XP: ${xp}`);
  console.log(`  Expected Level: ${expectedLevel}, Actual: ${actualLevel}`);
  console.log(`  Expected Progress: ${expectedProgress}%, Actual: ${actualProgress.toFixed(2)}%`);
  console.log(`  Details:`, details);
  console.log('---');
});

// Test edge cases
console.log('\nTesting edge cases...');
console.log('Negative XP:', getXPDetails(-5));
console.log('Very high XP:', getXPDetails(50000));
console.log('Exact milestone XP:', getXPDetails(100)); 