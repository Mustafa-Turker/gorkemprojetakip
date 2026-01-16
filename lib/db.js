import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: false, // Set to true if your database requires SSL (e.g., cloud hosted)
});

// Helper for running queries
export const query = (text, params) => pool.query(text, params);
