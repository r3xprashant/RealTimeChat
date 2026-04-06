-- SQL to create the necessary tables in your Neon PostgreSQL database

-- Users Table
CREATE TABLE IF NOT EXISTS chat_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table (for chat history between users)
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES chat_users(id),
    receiver_id INT REFERENCES chat_users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_users ON chat_users(username);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(sender_id, receiver_id);
