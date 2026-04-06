require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'stellar_secret_key_123';

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Neon
});

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// --- Auth Routes ---

// Signup
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO chat_users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.status(201).json({ token, user });
    } catch (err) {
        console.error('Signup Error:', err);
        if (err.code === '23505') return res.status(400).json({ error: 'Username already exists' });
        res.status(500).json({ error: 'Server error during signup' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM chat_users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username FROM chat_users ORDER BY username ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get Messages between two users
app.get('/api/messages/:userId1/:userId2', async (req, res) => {
    const { userId1, userId2 } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM chat_messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC',
            [userId1, userId2]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// --- Socket.io ---

const users = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    console.log(`🟢 Connection Attempt: ${socket.id}`);

    socket.on('register', (userId) => {
        users.set(userId, socket.id);
        console.log(`👤 User ${userId} registered with socket ${socket.id}`);
    });

    // Private Message
    socket.on('private message', async ({ to, text, senderId }) => {
        console.log(`📩 PM from ${senderId} to ${to}: ${text}`);
        
        // Save to DB (Optional, but recommended)
        try {
            await pool.query(
                'INSERT INTO chat_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)',
                [senderId, to, text]
            );
        } catch (err) {
            console.error('Error saving message:', err);
        }

        const receiverSocketId = users.get(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('private message', { from: senderId, text });
        }
    });

    socket.on('typing', ({ to, from }) => {
        const receiverSocketId = users.get(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing', from);
        }
    });

    socket.on('stop typing', (to) => {
        const receiverSocketId = users.get(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('stop typing');
        }
    });

    socket.on('disconnect', () => {
        for (let [uid, sid] of users.entries()) {
            if (sid === socket.id) {
                users.delete(uid);
                break;
            }
        }
        console.log(`🔴 Socket Disconnected: ${socket.id}`);
    });
});

const PORT = 5500;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Stellar Chat v2 live at http://localhost:${PORT}\n`);
});

module.exports = app;
