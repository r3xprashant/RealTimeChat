// Connect to the server running on the same origin
const socket = io();

const input = document.getElementById('input');
const messagesList = document.getElementById('messages');
const messagesContainer = document.getElementById('messages-container');
const typingIndicator = document.getElementById('typing-indicator');

// Generate a random ID for this session to distinguish 'Me' from 'Other'
const myId = 'user_' + Math.random().toString(36).substr(2, 9);

// Handle sending messages
function sendMessage(event) {
    if (event) event.preventDefault();

    const msg = input.value.trim();
    if (msg) {
        socket.emit('chat message', {
            text: msg,
            senderId: myId
        });
        input.value = '';
        input.focus();
        socket.emit('stop typing');
    }
}

// Receive and display messages
socket.on('chat message', (data) => {
    const li = document.createElement('li');
    li.textContent = data.text;

    // If senderId matches myId, it's my message (right side)
    if (data.senderId === myId) {
        li.classList.add('me');
    } else {
        li.classList.add('other');
    }

    messagesList.appendChild(li);
    scrollToBottom();
});

// Auto-scroll to latest message
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Typing Indicator Logic
let typingTimeout;

input.addEventListener('input', () => {
    socket.emit('typing', 'Friend'); // Send 'typing' event to others

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop typing');
    }, 1500);
});

// Show when the other person is typing
socket.on('typing', (user) => {
    typingIndicator.textContent = '✍️ ' + user + ' is typing...';
});

// Clear typing indicator
socket.on('stop typing', () => {
    typingIndicator.textContent = '';
});

// Connection & Status Logic
const statusDot = document.querySelector('.dot');
const statusText = document.querySelector('.status-indicator span:last-child');

socket.on('connect', () => {
    console.log('Connected! Session ID:', myId);
    if (statusDot) {
        statusDot.style.background = '#10b981';
        statusDot.style.boxShadow = '0 0 8px #10b981';
    }
    if (statusText) statusText.textContent = 'Connected (Port 5500)';
});

socket.on('disconnect', () => {
    console.warn('Disconnected!');
    if (statusDot) {
        statusDot.style.background = '#ef4444';
        statusDot.style.boxShadow = '0 0 8px #ef4444';
    }
    if (statusText) statusText.textContent = 'Searching for server...';
    typingIndicator.textContent = '';
});

// Initial state
if (statusText) statusText.textContent = 'Connecting...';
