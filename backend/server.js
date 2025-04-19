const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

// Apply CORS middleware
app.use(cors());
app.use(express.json());

// Configure SSL based on environment variable
let sslConfig;
if (process.env.PGSSL === 'require') {
    sslConfig = { rejectUnauthorized: false };
} else if (process.env.PGSSL === 'true') {
    sslConfig = true;
} else if (process.env.PGSSL === 'false') {
    sslConfig = false;
} else {
    // Default for Aiven databases
    sslConfig = { rejectUnauthorized: false };
}

// Create a database connection pool
const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: sslConfig,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
});

// Test the database connection on startup
pool.query('SELECT NOW()')
    .then(() => {
        console.log('Database connection successful');
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
    });

// Add a health check endpoint
app.get('/', async (req, res) => {
    try {
        // Test the database connection
        const result = await pool.query('SELECT NOW() as time');
        res.json({
            status: 'ok',
            database: 'connected',
            message: 'Server is running and connected to the database'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            message: 'Server is running but database connection failed'
        });
    }
});

// Ensure the table exists
app.use(async (req, res, next) => {
    if (req.path === '/api/add-channel') {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS channel_fetch_queue (
                    id SERIAL PRIMARY KEY,
                    channel_id TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed BOOLEAN DEFAULT FALSE
                )
            `);
            next();
        } catch (err) {
            console.error('Database setup error:', err.message);
            res.status(500).json({ error: 'Database setup error' });
        }
    } else {
        next();
    }
});

app.post('/api/add-channel', async (req, res) => {
    const { channelId } = req.body;

    if (!channelId || !channelId.startsWith('UC')) {
        return res.status(400).json({ error: 'Invalid or missing channelId' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO channel_fetch_queue (channel_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING *',
            [channelId]
        );

        if (result.rowCount === 0) {
            return res.status(200).json({ message: 'Channel ID already exists' });
        }

        res.status(201).json({ message: 'Inserted', data: result.rows[0] });
    } catch (err) {
        console.error('Database error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
