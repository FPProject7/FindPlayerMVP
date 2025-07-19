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

    // Find users whose premium membership has expired
    // Athletes: 1 month from premium start
    // Coaches/Scouts: Permanent during launch (no expiry)
    const expiredUsersResult = await client.query(
      `SELECT id, name, email, role, premium_start_date, updated_at 
       FROM users 
       WHERE is_premium_member = true 
       AND role = 'athlete'
       AND premium_start_date < NOW() - INTERVAL '1 month'`
    );

    const expiredUsers = expiredUsersResult.rows;
    console.log(`Found ${expiredUsers.length} athletes with expired premium membership`);

    if (expiredUsers.length > 0) {
      // Reset premium membership for expired athletes only
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

      console.log(`Reset premium membership for ${resetResult.rowCount} athletes`);
      
      // Log the expired users for monitoring
      expiredUsers.forEach(user => {
        console.log(`Premium expired for athlete: ${user.name} (${user.email}) - Started: ${user.premium_start_date}`);
      });
    }

    // Log current premium status for monitoring
    const premiumStatusResult = await client.query(`
      SELECT role, COUNT(*) as count, 
             COUNT(CASE WHEN is_premium_member = true THEN 1 END) as premium_count
      FROM users 
      GROUP BY role
    `);
    
    console.log('Current premium status by role:');
    premiumStatusResult.rows.forEach(row => {
      console.log(`${row.role}: ${row.premium_count}/${row.count} premium users`);
    });

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
          role: u.role,
          premiumStartDate: u.premium_start_date
        })),
        premiumStatus: premiumStatusResult.rows
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