-- Check if starred_players table exists and create it if it doesn't
DO $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'starred_players') THEN
        -- Create the table with correct schema
        CREATE TABLE starred_players (
            id SERIAL PRIMARY KEY,
            scout_id VARCHAR(255) NOT NULL,
            athlete_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (scout_id, athlete_id)
        );
        
        -- Add foreign key constraints if users table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE starred_players 
            ADD CONSTRAINT fk_starred_players_scout 
            FOREIGN KEY (scout_id) REFERENCES users(id) ON DELETE CASCADE;
            
            ALTER TABLE starred_players 
            ADD CONSTRAINT fk_starred_players_athlete 
            FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'starred_players table created successfully';
    ELSE
        -- Check if the columns are the correct type
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'starred_players' 
            AND column_name = 'scout_id' 
            AND data_type = 'integer'
        ) THEN
            -- Alter the table to change column types
            ALTER TABLE starred_players ALTER COLUMN scout_id TYPE VARCHAR(255);
            ALTER TABLE starred_players ALTER COLUMN athlete_id TYPE VARCHAR(255);
            RAISE NOTICE 'starred_players table columns updated to VARCHAR(255)';
        ELSE
            RAISE NOTICE 'starred_players table already exists with correct schema';
        END IF;
    END IF;
END $$; 