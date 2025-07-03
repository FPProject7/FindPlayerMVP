const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    // For AppSync, the search string comes in event.arguments.query
    const searchQuery = event.arguments?.query;
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    // Use ILIKE for case-insensitive search in PostgreSQL
    const sql = `
      SELECT id, name, email, profile_picture_url, role
      FROM users
      WHERE name ILIKE $1 OR email ILIKE $1
      ORDER BY name ASC
      LIMIT 10;
    `;
    const values = [`%${searchQuery}%`];
    const result = await client.query(sql, values);
    await client.end();

    // Return as array of user objects
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      profile_picture_url: row.profile_picture_url,
      role: row.role,
    }));
  } catch (err) {
    console.error('Error in searchUsers:', err);
    throw new Error('Internal server error');
  }
}; 