const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false }
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
        console.error('DB insert error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
