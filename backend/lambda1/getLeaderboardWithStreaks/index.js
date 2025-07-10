const { Client } = require('pg');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  try {
    const query = event.queryStringParameters || {};
    const role = query.role;
    const heightMin = parseInt(query.heightMin, 10);
    const heightMax = parseInt(query.heightMax, 10);
    const country = query.country;
    const sport = query.sport;
    const position = query.position;
    const ageMin = parseInt(query.ageMin, 10);
    const ageMax = parseInt(query.ageMax, 10);
    const timeFrame = query.timeFrame || 'all';
    const sortBy = query.sortBy || 'xpTotal';
    const sortOrder = query.sortOrder || 'DESC';
    const limit = parseInt(query.limit || '20', 10);
    const offset = parseInt(query.offset || '0', 10);

    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Build separate filter conditions for athletes and coaches
    const buildAthleteFilters = () => {
      const conditions = [];
      const params = [];
      let paramCount = 1;

      // Height filtering
      if (!isNaN(heightMin)) {
        conditions.push(`CAST(u.height AS INTEGER) >= $${paramCount}`);
        params.push(heightMin);
        paramCount++;
      }
      if (!isNaN(heightMax)) {
        conditions.push(`CAST(u.height AS INTEGER) <= $${paramCount}`);
        params.push(heightMax);
        paramCount++;
      }
      // Country filtering
      if (country) {
        conditions.push(`u.country ILIKE $${paramCount}`);
        params.push(`%${country}%`);
        paramCount++;
      }
      // Sport filtering
      if (sport) {
        conditions.push(`LOWER(u.sport) = LOWER($${paramCount})`);
        params.push(sport);
        paramCount++;
      }
      // Position filtering
      if (position) {
        conditions.push(`u.position ILIKE $${paramCount}`);
        params.push(`%${position}%`);
        paramCount++;
      }
      // Gender filtering
      if (query.gender) {
        conditions.push(`LOWER(u.gender) = LOWER($${paramCount})`);
        params.push(query.gender);
        paramCount++;
      }
      // Age filtering
      if (!isNaN(ageMin) || !isNaN(ageMax)) {
        const currentDate = new Date();
        if (!isNaN(ageMin)) {
          const maxBirthDate = new Date(currentDate.getFullYear() - ageMin, currentDate.getMonth(), currentDate.getDate());
          conditions.push(`u.date_of_birth <= $${paramCount}`);
          params.push(maxBirthDate.toISOString());
          paramCount++;
        }
        if (!isNaN(ageMax)) {
          const minBirthDate = new Date(currentDate.getFullYear() - ageMax - 1, currentDate.getMonth(), currentDate.getDate());
          conditions.push(`u.date_of_birth >= $${paramCount}`);
          params.push(minBirthDate.toISOString());
          paramCount++;
        }
      }
      // Role filtering for athletes
      if (role) {
        conditions.push(`LOWER(u.role) = LOWER($${paramCount})`);
        params.push(role);
        paramCount++;
      } else {
        conditions.push(`(u.role = 'athlete' OR u.role IS NULL)`);
      }

      return { conditions, params, paramCount };
    };

    const buildCoachFilters = () => {
      const conditions = [];
      const params = [];
      let paramCount = 1;

      // Country filtering
      if (country) {
        conditions.push(`u.country ILIKE $${paramCount}`);
        params.push(`%${country}%`);
        paramCount++;
      }
      // Sport filtering
      if (sport) {
        conditions.push(`LOWER(u.sport) = LOWER($${paramCount})`);
        params.push(sport);
        paramCount++;
      }
      // Role filtering for coaches
      conditions.push(`LOWER(u.role) = LOWER($${paramCount})`);
      params.push('coach');
      paramCount++;

      return { conditions, params, paramCount };
    };

    // Validate sortBy parameter
    const validSortFields = ['xpTotal', 'height', 'challengesSubmitted', 'coachApprovals', 'challengesCreated', 'challengesApproved', 'name'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'xpTotal';
    const validSortOrders = ['ASC', 'DESC'];
    const orderDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    let orderByClause;
    if (sortField === 'height') {
      orderByClause = `ORDER BY CAST(u.height AS INTEGER) ${orderDirection}`;
    } else {
      orderByClause = `ORDER BY "${sortField}" ${orderDirection}`;
    }

    let leaderboardQuery;
    if (role === 'coach') {
      const coachFilters = buildCoachFilters();
      leaderboardQuery = `
        SELECT 
          u.id, 
          u.name, 
          u.profile_picture_url AS "profilePictureUrl", 
          u.xp_total AS "xpTotal", 
          u.height, 
          u.weight, 
          u.country, 
          u.sport, 
          u.position, 
          u.date_of_birth AS "dateOfBirth",
          u.role,
          u.current_streak AS "current_streak",
          0 AS "challengesSubmitted",
          0 AS "coachApprovals",
          COALESCE(challenges_created.count, 0) AS "challengesCreated",
          COALESCE(challenges_approved.count, 0) AS "challengesApproved"
        FROM users u
        LEFT JOIN (
          SELECT coach_id, COUNT(*) AS count
          FROM challenges
          GROUP BY coach_id
        ) AS challenges_created ON u.id::text = challenges_created.coach_id
        LEFT JOIN (
          SELECT c.coach_id, COUNT(*) AS count
          FROM challenges c
          JOIN challenge_submissions cs ON c.id = cs.challenge_id
          WHERE cs.status = 'approved'
          GROUP BY c.coach_id
        ) AS challenges_approved ON u.id::text = challenges_approved.coach_id
        WHERE ${coachFilters.conditions.join(' AND ')}
        ${orderByClause} LIMIT $${coachFilters.paramCount} OFFSET $${coachFilters.paramCount + 1}
      `;
      coachFilters.params.push(limit, offset);
      queryParams = coachFilters.params;
    } else {
      const athleteFilters = buildAthleteFilters();
      let joinTimeFilter = '';
      let timeFrameParamCount = athleteFilters.paramCount;
      
      if (timeFrame !== 'all') {
        const now = new Date();
        let startDate;
        switch (timeFrame) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = null;
        }
        if (startDate) {
          joinTimeFilter = `AND cs.submitted_at >= $${timeFrameParamCount}`;
          athleteFilters.params.push(startDate.toISOString());
          timeFrameParamCount++;
        }
      }
      
      let whereClause = athleteFilters.conditions.length > 0 ? athleteFilters.conditions.join(' AND ') : '1=1';
      leaderboardQuery = `
        SELECT 
          u.id, 
          u.name, 
          u.profile_picture_url AS "profilePictureUrl", 
          u.xp_total AS "xpTotal", 
          u.height, 
          u.weight, 
          u.country, 
          u.sport, 
          u.position, 
          u.date_of_birth AS "dateOfBirth",
          u.role,
          u.current_streak AS "current_streak",
          COALESCE(COUNT(cs.id), 0) AS "challengesSubmitted",
          COALESCE(COUNT(CASE WHEN cs.status = 'approved' THEN cs.id END), 0) AS "coachApprovals",
          0 AS "challengesCreated",
          0 AS "challengesApproved"
        FROM users u
        LEFT JOIN challenge_submissions cs ON u.id = cs.athlete_id ${joinTimeFilter}
        WHERE ${whereClause}
        GROUP BY u.id, u.name, u.profile_picture_url, u.xp_total, u.height, u.weight, u.country, u.sport, u.position, u.date_of_birth, u.role, u.current_streak
      `;
      leaderboardQuery += ` ${orderByClause} LIMIT $${timeFrameParamCount} OFFSET $${timeFrameParamCount + 1}`;
      athleteFilters.params.push(limit, offset);
      queryParams = athleteFilters.params;
    }

    let result;
    try {
      result = await client.query(leaderboardQuery, queryParams);
    } catch (dbError) {
      await client.end();
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Internal server error', message: dbError.message })
      };
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ leaderboard: result.rows })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};



