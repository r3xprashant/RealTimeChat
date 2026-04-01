const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Specifically serve socket.io.js from node_modules for Vercel compatibility
app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist', 'socket.io.js'));
});

// Explicitly serve index.html for the root route using process.cwd()
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log(`\n🟢 User Connected: ${socket.id}`);
    console.log(`Current active connections: ${io.engine.clientsCount}`);

    // Handle chat messages
    socket.on('chat message', (msg) => {
        console.log(`📩 Message from ${socket.id}: ${msg.text}`);
        io.emit('chat message', msg);
    });

    // Handle typing events
    socket.on('typing', (user) => {
        socket.broadcast.emit('typing', user);
    });

    // Handle stop typing events
    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing');
    });

    socket.on('disconnect', () => {
        console.log(`\n🔴 User Disconnected: ${socket.id}`);
        console.log(`Remaining active connections: ${io.engine.clientsCount}`);
    });
});

const PORT = 5500;
const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

server.listen(PORT, '0.0.0.1' === '0.0.0.1' ? '0.0.0.0' : 'localhost', () => {
    const ip = getLocalIP();
    console.log(`\n🚀 Stellar Chat is live!`);
    console.log(`🏠 Local:   http://localhost:${PORT}`);
    console.log(`🌐 Network: http://${ip}:${PORT}\n`);
    console.log(`(Open the Network link in two different devices to chat!)\n`);
});
module.exports = app;
