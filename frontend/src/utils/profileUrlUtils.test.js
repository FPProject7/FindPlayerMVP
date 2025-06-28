// Test file for profileUrlUtils.js - can be run with Jest or similar
import { 
  encodeProfileName, 
  decodeProfileName, 
  createProfileUrl, 
  extractProfileInfoFromUrl,
  extractNameFromProfileUrl 
} from './profileUrlUtils.js';

console.log('Testing Profile URL Utilities...\n');

// Test cases for name encoding/decoding
const nameTestCases = [
  { input: "John Doe", expected: "john doe" },
  { input: "jane-smith", expected: "jane smith" },
  { input: "bob_wilson", expected: "bob wilson" },
  { input: "JOHN DOE", expected: "john doe" },
  { input: "JohnDoe", expected: "johndoe" },
  { input: "john   doe", expected: "john doe" },
  { input: "mary-jane_smith", expected: "mary jane smith" },
];

console.log('Testing name encoding/decoding...');
nameTestCases.forEach(({ input, expected }) => {
  const encoded = encodeProfileName(input);
  const decoded = decodeProfileName(encoded);
  
  console.log(`Input: "${input}"`);
  console.log(`  Encoded: "${encoded}"`);
  console.log(`  Decoded: "${decoded}"`);
  console.log(`  Expected: "${expected}"`);
  console.log(`  Match: ${decoded === expected ? '✓' : '✗'}`);
  console.log('---');
});

// Test cases for profile URL creation
const urlTestCases = [
  { name: "John Doe", role: "athlete", expected: "/profile/athlete/john%20doe" },
  { name: "Jane Smith", role: "coach", expected: "/profile/coach/jane%20smith" },
  { name: "Bob Wilson", role: "scout", expected: "/profile/scout/bob%20wilson" },
  { name: "JohnDoe", role: "athlete", expected: "/profile/athlete/johndoe" },
  { name: "mary-jane", role: "coach", expected: "/profile/coach/mary%20jane" },
  { name: "test_user", role: "scout", expected: "/profile/scout/test%20user" },
];

console.log('\nTesting profile URL creation...');
urlTestCases.forEach(({ name, role, expected }) => {
  const url = createProfileUrl(name, role);
  
  console.log(`Name: "${name}", Role: "${role}"`);
  console.log(`  Generated URL: "${url}"`);
  console.log(`  Expected URL: "${expected}"`);
  console.log(`  Match: ${url === expected ? '✓' : '✗'}`);
  console.log('---');
});

// Test cases for URL extraction
const extractionTestCases = [
  { 
    url: "/profile/athlete/john%20doe", 
    expected: { role: "athlete", name: "john doe" } 
  },
  { 
    url: "/profile/coach/jane%20smith", 
    expected: { role: "coach", name: "jane smith" } 
  },
  { 
    url: "/profile/scout/bob%20wilson", 
    expected: { role: "scout", name: "bob wilson" } 
  },
  { 
    url: "/profile/athlete/johndoe", 
    expected: { role: "athlete", name: "johndoe" } 
  },
];

console.log('\nTesting URL extraction...');
extractionTestCases.forEach(({ url, expected }) => {
  const extracted = extractProfileInfoFromUrl(url);
  const nameOnly = extractNameFromProfileUrl(url);
  
  console.log(`URL: "${url}"`);
  console.log(`  Extracted:`, extracted);
  console.log(`  Expected:`, expected);
  console.log(`  Name only: "${nameOnly}"`);
  console.log(`  Match: ${JSON.stringify(extracted) === JSON.stringify(expected) ? '✓' : '✗'}`);
  console.log('---');
});

// Test edge cases
console.log('\nTesting edge cases...');
console.log('Empty name:', createProfileUrl('', 'athlete'));
console.log('Null name:', createProfileUrl(null, 'coach'));
console.log('Undefined role:', createProfileUrl('John Doe'));
console.log('Invalid URL:', extractProfileInfoFromUrl('/invalid/url'));
console.log('Empty URL:', extractProfileInfoFromUrl(''));

// Test role validation scenarios
console.log('\nTesting role validation scenarios...');
const roleValidationTests = [
  {
    url: "/profile/athlete/john%20doe",
    expectedRole: "athlete",
    actualRole: "athlete",
    shouldShowError: false
  },
  {
    url: "/profile/athlete/jane%20smith", 
    expectedRole: "athlete",
    actualRole: "coach",
    shouldShowError: true
  },
  {
    url: "/profile/coach/bob%20wilson",
    expectedRole: "coach", 
    actualRole: "scout",
    shouldShowError: true
  }
];

roleValidationTests.forEach(({ url, expectedRole, actualRole, shouldShowError }) => {
  const extracted = extractProfileInfoFromUrl(url);
  const isRoleMismatch = extracted.role !== actualRole;
  
  console.log(`URL: "${url}"`);
  console.log(`  Expected role: "${expectedRole}", Actual role: "${actualRole}"`);
  console.log(`  Role mismatch: ${isRoleMismatch ? 'Yes' : 'No'}`);
  console.log(`  Should show error: ${shouldShowError ? 'Yes' : 'No'}`);
  console.log('---');
});

console.log('\nAll tests completed!'); 