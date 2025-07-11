const { Pool } = require('pg');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'easyjob_db',
    user: process.env.DB_USER || 'easyjob_user',
    password: process.env.DB_PASSWORD || 'easyjob_password',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Event handlers
pool.on('connect', (client) => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Test the connection
async function testConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        client.release();
        console.log('🔍 Database connection test successful:', result.rows[0].current_time);
        return true;
    } catch (err) {
        console.error('❌ Database connection test failed:', err.message);
        return false;
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down database connection pool...');
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down database connection pool...');
    await pool.end();
    process.exit(0);
});

module.exports = {
    pool,
    testConnection,
    query: (text, params) => pool.query(text, params),
}; 