require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Checking tables...");
        const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
        console.log("Tables:", res.rows);
        
        console.log("Inserting...");
        const res2 = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            ['testuser' + Date.now(), 'pwd']
        );
        console.log("Insert result:", res2.rows);
    } catch (e) {
        console.error("ERROR:");
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
