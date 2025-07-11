const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('Premium expiry check started:', new Date().toISOString());
  
  try {
    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Database connected successfully');

    // First, let's add a premium_start_date column if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS premium_start_date TIMESTAMP
      `);
      console.log('Ensured premium_start_date column exists');
    } catch (alterError) {
      console.log('Column already exists or error adding column:', alterError.message);
    }

    // Update premium_start_date for users who are premium but don't have a start date
    await client.query(`
      UPDATE users 
      SET premium_start_date = updated_at 
      WHERE is_premium_member = true 
      AND premium_start_date IS NULL
    `);

    // Find users whose premium membership has expired (5 minutes from premium start)
    const expiredUsersResult = await client.query(
      `SELECT id, name, email, premium_start_date, updated_at 
       FROM users 
       WHERE is_premium_member = true 
       AND premium_start_date < NOW() - INTERVAL '5 minutes'`
    );

    const expiredUsers = expiredUsersResult.rows;
    console.log(`Found ${expiredUsers.length} users with expired premium membership`);

    if (expiredUsers.length > 0) {
      // Reset premium membership for expired users
      const userIds = expiredUsers.map(user => user.id);
      const placeholders = userIds.map((_, index) => `$${index + 1}`).join(',');
      
      const resetResult = await client.query(
        `UPDATE users 
         SET is_premium_member = false, 
             premium_start_date = NULL,
             updated_at = NOW() 
         WHERE id IN (${placeholders})`,
        userIds
      );

      console.log(`Reset premium membership for ${resetResult.rowCount} users`);
      
      // Log the expired users for monitoring
      expiredUsers.forEach(user => {
        console.log(`Premium expired for user: ${user.name} (${user.email}) - Started: ${user.premium_start_date}`);
      });
    }

    await client.end();
    console.log('Premium expiry check completed successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Premium expiry check completed',
        expiredUsersCount: expiredUsers.length,
        processedUsers: expiredUsers.map(u => ({ 
          id: u.id, 
          name: u.name, 
          email: u.email,
          premiumStartDate: u.premium_start_date
        }))
      })
    };
  } catch (error) {
    console.error('Error in premium expiry check:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing premium expiry',
        error: error.message
      })
    };
  }
}; 