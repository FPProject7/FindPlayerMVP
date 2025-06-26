# Profile URL System Guide

## Overview

The profile URL system allows users to visit profiles using either a user ID or a name. The system is designed to be flexible and handle various name formats.

## URL Format

```
http://localhost:5173/profile/<name>
```

Where `<name>` can be:
- A user's name (e.g., "John Doe")
- A user ID (UUID format)
- Various name formats (see examples below)

## How It Works

### 1. Frontend Processing
- The frontend receives the URL parameter and decodes it using `decodeURIComponent`
- It checks if the parameter is a UUID (user ID) or a name
- If it's a UUID, it queries by user ID
- If it's a name, it queries by username

### 2. Backend Processing (Lambda Function)
The `getInfoUser.js` Lambda function handles name-based queries with the following logic:

1. **Normalization**: The input name is normalized:
   - Trimmed of whitespace
   - Converted to lowercase
   - Multiple spaces, hyphens, or underscores are replaced with single spaces

2. **Multiple Search Patterns**: The function tries multiple search patterns:
   - Exact normalized match
   - Name with no spaces
   - Name with hyphens instead of spaces
   - Name with underscores instead of spaces
   - Name with all separators removed

## Examples

### Input Names and Their Normalized Forms

| Input | Normalized | URL |
|-------|------------|-----|
| "John Doe" | "john doe" | `/profile/john%20doe` |
| "john-doe" | "john doe" | `/profile/john%20doe` |
| "john_doe" | "john doe" | `/profile/john%20doe` |
| "JOHN DOE" | "john doe" | `/profile/john%20doe` |
| "JohnDoe" | "johndoe" | `/profile/johndoe` |
| "john   doe" | "john doe" | `/profile/john%20doe` |

### Database Query Examples

The Lambda function will find a user with name "John Doe" using any of these inputs:
- "John Doe"
- "john doe"
- "johndoe"
- "john-doe"
- "john_doe"
- "JOHN DOE"

## Testing

You can test the name lookup functionality using the test script:

```bash
cd backend
node test_name_lookup.js
```

This will test various name formats against your database.

## Troubleshooting

### Common Issues

1. **Profile Not Found**: 
   - Check if the user exists in the database
   - Verify the name spelling
   - Try different name formats (with/without spaces, hyphens, etc.)

2. **URL Encoding Issues**:
   - Make sure special characters are properly URL-encoded
   - The frontend automatically handles URL decoding

3. **Case Sensitivity**:
   - The system is case-insensitive, so "John Doe" and "john doe" will match

### Debugging

1. Check the browser console for logs showing:
   - Original profileUserId
   - Decoded profileUserId
   - API responses

2. Check the Lambda function logs for:
   - Search patterns being used
   - Database query results

## Best Practices

1. **URL Creation**: Use the utility functions in `profileUrlUtils.js` to create consistent URLs
2. **Name Storage**: Store names in a consistent format in the database
3. **Testing**: Test with various name formats to ensure compatibility
4. **Error Handling**: Provide clear error messages when profiles are not found 