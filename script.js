const socket = io();

// UI Elements
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authToggle = document.getElementById('auth-toggle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const userList = document.getElementById('user-list');
const myUsernameDisplay = document.getElementById('my-username');
const logoutBtn = document.getElementById('logout-btn');

const chatHeaderName = document.querySelector('.chat-header h2');
const messagesList = document.getElementById('messages');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('input');
const typingIndicator = document.getElementById('typing-indicator');

// State
let currentUser = JSON.parse(localStorage.getItem('user'));
let selectedUserId = null;
let isSignup = false;

// Initialization
if (currentUser) {
    showChat();
}

// --- Auth Logic ---

authToggle.onclick = (e) => {
    e.preventDefault();
    isSignup = !isSignup;
    authTitle.textContent = isSignup ? 'Create Account' : 'Welcome Back';
    authSubtitle.textContent = isSignup ? 'Join Stellar Chat' : 'Login to start chatting';
    authSubmitBtn.textContent = isSignup ? 'Sign Up' : 'Login';
    authToggle.textContent = isSignup ? 'Login' : 'Sign Up';
    document.getElementById('auth-toggle-text').firstChild.textContent = isSignup ? 'Already have an account? ' : "Don't have an account? ";
};

authForm.onsubmit = async (e) => {
    e.preventDefault();
    const endpoint = isSignup ? '/api/signup' : '/api/login';
    const credentials = {
        username: usernameInput.value,
        password: passwordInput.value
    };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            showChat();
        } else {
            alert(data.error || 'Authentication failed');
        }
    } catch (err) {
        console.error('Auth error:', err);
        alert('Server unreachable');
    }
};

function showChat() {
    authOverlay.classList.add('hidden');
    myUsernameDisplay.textContent = currentUser.username;
    socket.emit('register', currentUser.id);
    fetchUsers();
}

logoutBtn.onclick = () => {
    localStorage.clear();
    location.reload();
};

// --- User List ---

async function fetchUsers() {
    try {
        const res = await fetch('/api/users');
        const users = await res.json();
        
        userList.innerHTML = '';
        users.forEach(user => {
            if (user.id === currentUser.id) return;

            const li = document.createElement('li');
            li.className = 'user-item';
            li.innerHTML = `
                <div class="user-avatar">${user.username[0].toUpperCase()}</div>
                <div class="user-info">
                    <h4>${user.username}</h4>
                    <p>Start a conversation</p>
                </div>
            `;
            li.onclick = () => selectUser(user);
            userList.appendChild(li);
        });
    } catch (err) {
        console.error('Fetch users error:', err);
    }
}

async function selectUser(user) {
    selectedUserId = user.id;
    chatHeaderName.textContent = `Chat with ${user.username}`;
    messagesList.innerHTML = ''; 
    
    // Highlight active user in list
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('h4').textContent === user.username) {
            item.classList.add('active');
        }
    });

    // Fetch History
    try {
        const res = await fetch(`/api/messages/${currentUser.id}/${selectedUserId}`);
        const messages = await res.json();
        messages.forEach(msg => {
            addMessage(msg.content, msg.sender_id === currentUser.id ? 'me' : 'other');
        });
    } catch (err) {
        console.error('History fetch error:', err);
    }

    messageInput.focus();
}

// --- Chat Logic ---

function sendMessage(e) {
    if (e) e.preventDefault();
    if (!selectedUserId) return alert('Select a user to chat with!');

    const text = messageInput.value.trim();
    if (text) {
        socket.emit('private message', {
            to: selectedUserId,
            text: text,
            senderId: currentUser.id
        });

        // Add to UI immediately
        addMessage(text, 'me');
        messageInput.value = '';
        socket.emit('stop typing', selectedUserId);
    }
}

socket.on('private message', (data) => {
    // Only show if the message is from the currently selected user
    if (data.from === selectedUserId) {
        addMessage(data.text, 'other');
    } else {
        // Optional: Show notification on sidebar
        console.log('New message from user:', data.from);
    }
});

function addMessage(text, type) {
    const li = document.createElement('li');
    li.textContent = text;
    li.className = type;
    messagesList.appendChild(li);
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Typing Indicator logic
let typingTimeout;
messageInput.addEventListener('input', () => {
    if (!selectedUserId) return;

    socket.emit('typing', { to: selectedUserId, from: currentUser.username });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop typing', selectedUserId);
    }, 1500);
});

socket.on('typing', (username) => {
    typingIndicator.textContent = `✍️ ${username} is typing...`;
});

socket.on('stop typing', () => {
    typingIndicator.textContent = '';
});
