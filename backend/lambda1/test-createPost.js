const { Client } = require('pg');
const AWS = require('aws-sdk');

// Test database connection
async function testDB() {
  console.log('Testing database connection...');
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('Query result:', result.rows[0]);
    
    await client.end();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Test S3 connection
async function testS3() {
  console.log('Testing S3 connection...');
  const s3 = new AWS.S3();
  const bucketName = process.env.POST_IMAGES_BUCKET_NAME || 'findplayer-post-images';
  
  try {
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log('S3 bucket access successful');
    return true;
  } catch (error) {
    console.error('S3 bucket access failed:', error);
    return false;
  }
}

// Test environment variables
function testEnvVars() {
  console.log('Environment variables:');
  console.log('DB_HOST:', process.env.DB_HOST ? 'SET' : 'NOT SET');
  console.log('DB_USER:', process.env.DB_USER ? 'SET' : 'NOT SET');
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
  console.log('DB_NAME:', process.env.DB_NAME ? 'SET' : 'NOT SET');
  console.log('POST_IMAGES_BUCKET_NAME:', process.env.POST_IMAGES_BUCKET_NAME || 'findplayer-post-images');
  console.log('REGION:', process.env.REGION || 'us-east-1');
}

async function runTests() {
  console.log('=== Starting createPost function tests ===');
  
  testEnvVars();
  console.log('');
  
  const dbResult = await testDB();
  console.log('');
  
  const s3Result = await testS3();
  console.log('');
  
  console.log('=== Test Results ===');
  console.log('Database:', dbResult ? 'PASS' : 'FAIL');
  console.log('S3:', s3Result ? 'PASS' : 'FAIL');
}

runTests().catch(console.error); 