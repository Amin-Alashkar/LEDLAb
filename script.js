const API_BASE_URL = 'http://192.168.1.146:8080';
const GET_MESSAGE_ENDPOINT = `${API_BASE_URL}/message`;
const POST_MESSAGE_ENDPOINT = `${API_BASE_URL}/message`;

const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const demoBtn = document.getElementById('demo-btn');
const serverResponse = document.getElementById('server-response');
const connectionDot = document.getElementById('connection-dot');
const connectionText = document.getElementById('connection-text');
const apiStatus = document.getElementById('api-status');
const deviceStatus = document.getElementById('device-status');
const lastSentTime = document.getElementById('last-sent-time');
const charCount = document.getElementById('char-count');
const ledStripPreview = document.querySelector('.led-strip-preview');
const playPreviewBtn = document.getElementById('play-preview');
const resetPreviewBtn = document.getElementById('reset-preview');
const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
const refreshMessagesBtn = document.getElementById('refresh-messages');
const clearHistoryBtn = document.getElementById('clear-history');
const recentMessages = document.getElementById('recent-messages');
const apiDocsBtn = document.getElementById('api-docs-btn');
const simulateDeviceBtn = document.getElementById('simulate-device-btn');

let isConnected = false;
let autoRefreshInterval = null;
let recentMessagesList = [];
let ledAnimationInterval = null;
let isAnimating = false;

const letterToLedIndex = {
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8,
    'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16,
    'R': 17, 'S': 18, 'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    createLedStrip();
    setupEventListeners();
    loadRecentMessages();
    checkConnection();
    updateCharCount();
}

function setupEventListeners() {
    messageInput.addEventListener('input', updateCharCount);
    
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    sendBtn.addEventListener('click', sendMessage);
    clearBtn.addEventListener('click', clearInput);
    demoBtn.addEventListener('click', loadDemoMessage);
    playPreviewBtn.addEventListener('click', playLedAnimation);
    resetPreviewBtn.addEventListener('click', resetLedPreview);
    refreshMessagesBtn.addEventListener('click', fetchLastMessage);
    clearHistoryBtn.addEventListener('click', clearMessageHistory);
    apiDocsBtn.addEventListener('click', showApiDocs);
    simulateDeviceBtn.addEventListener('click', simulateDevicePolling);
    
    autoRefreshToggle.addEventListener('change', toggleAutoRefresh);
}

async function checkConnection() {
    try {
        const response = await fetch(GET_MESSAGE_ENDPOINT);
        
        if (response.ok) {
            setConnectionStatus(true);
            apiStatus.textContent = 'Connected';
            apiStatus.style.color = '#06d6a0';
        } else {
            setConnectionStatus(false);
            apiStatus.textContent = 'Error';
            apiStatus.style.color = '#e63946';
        }
    } catch (error) {
        setConnectionStatus(false);
        apiStatus.textContent = 'Disconnected';
        apiStatus.style.color = '#e63946';
    }
}

function setConnectionStatus(connected) {
    isConnected = connected;
    
    if (connected) {
        connectionDot.className = 'dot connected';
        connectionText.textContent = 'Connected';
        connectionText.style.color = '#06d6a0';
        deviceStatus.textContent = 'Ready';
        deviceStatus.style.color = '#06d6a0';
    } else {
        connectionDot.className = 'dot disconnected';
        connectionText.textContent = 'Disconnected';
        connectionText.style.color = '#e63946';
        deviceStatus.textContent = 'Offline';
        deviceStatus.style.color = '#e63946';
    }
}

async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text) {
        showResponse('Please enter a message.', 'error');
        messageInput.focus();
        return;
    }
    
    setButtonLoading(sendBtn, true);
    
    try {
        const response = await fetch(POST_MESSAGE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        });
        
        if (response.ok) {
            const data = await response.json();
            showResponse(`Message sent: "${data.last_message}"`, 'success');
            
            addRecentMessage(text);
            
            updateLastSentTime();
            
            updateLedPreview(text);
            
            messageInput.value = '';
            updateCharCount();
            
            setConnectionStatus(true);
        } else {
            showResponse(`Error: ${response.status}`, 'error');
        }
    } catch (error) {
        showResponse('Connection error', 'error');
        setConnectionStatus(false);
    } finally {
        setButtonLoading(sendBtn, false);
    }
}

async function fetchLastMessage() {
    try {
        const response = await fetch(GET_MESSAGE_ENDPOINT);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.last_message) {
                updateLedPreview(data.last_message);
                setConnectionStatus(true);
            }
        }
    } catch (error) {
        setConnectionStatus(false);
    }
}

function createLedStrip() {
    ledStripPreview.innerHTML = '';
    
    for (let i = 0; i < 26; i++) {
        const led = document.createElement('div');
        led.className = 'led';
        ledStripPreview.appendChild(led);
    }
}

function updateLedPreview(message) {
    resetLedPreview();
    
    if (!message) return;
    
    const chars = message.toUpperCase().split('');
    
    chars.forEach((char, index) => {
        setTimeout(() => {
            if (char >= 'A' && char <= 'Z') {
                const ledIndex = letterToLedIndex[char];
                if (ledIndex !== undefined) {
                    lightLed(ledIndex, 'letter');
                }
            } else if (char >= '0' && char <= '9') {
                const num = parseInt(char);
                if (num >= 1 && num <= 26) {
                    for (let i = 0; i < num; i++) {
                        setTimeout(() => {
                            lightLed(i, 'sequence');
                        }, i * 100);
                    }
                }
            } else if (char !== ' ') {
                flashAllLeds();
            }
        }, index * 300);
    });
}

function lightLed(index, type = 'letter') {
    const leds = document.querySelectorAll('.led');
    if (index >= 0 && index < leds.length) {
        leds[index].classList.add(type === 'sequence' ? 'sequence' : 'on');
    }
}

function flashAllLeds() {
    const leds = document.querySelectorAll('.led');
    
    leds.forEach(led => {
        led.classList.add('special');
    });
    
    setTimeout(() => {
        leds.forEach(led => {
            led.className = 'led';
        });
    }, 500);
}

function resetLedPreview() {
    const leds = document.querySelectorAll('.led');
    leds.forEach(led => {
        led.className = 'led';
    });
}

function playLedAnimation() {
    if (isAnimating) {
        stopLedAnimation();
        playPreviewBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        isAnimating = false;
        return;
    }
    
    const message = messageInput.value.trim() || "TEST";
    isAnimating = true;
    playPreviewBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    
    resetLedPreview();
    
    const chars = message.toUpperCase().split('');
    let currentChar = 0;
    
    ledAnimationInterval = setInterval(() => {
        if (currentChar >= chars.length) {
            currentChar = 0;
            resetLedPreview();
        }
        
        const char = chars[currentChar];
        
        if (char >= 'A' && char <= 'Z') {
            const ledIndex = letterToLedIndex[char];
            if (ledIndex !== undefined) {
                lightLed(ledIndex, 'letter');
            }
        } else if (char >= '0' && char <= '9') {
            const num = parseInt(char);
            if (num >= 1 && num <= 26) {
                for (let i = 0; i < num; i++) {
                    setTimeout(() => {
                        lightLed(i, 'sequence');
                    }, i * 100);
                }
            }
        } else if (char !== ' ') {
            flashAllLeds();
        }
        
        currentChar++;
    }, 800);
}

function stopLedAnimation() {
    if (ledAnimationInterval) {
        clearInterval(ledAnimationInterval);
        ledAnimationInterval = null;
    }
    resetLedPreview();
}

function showResponse(message, type = 'info') {
    serverResponse.className = 'response-box';
    
    if (type === 'success') {
        serverResponse.classList.add('success');
    } else if (type === 'error') {
        serverResponse.classList.add('error');
    }
    
    const icon = type === 'success' ? 'fas fa-check' : 
                 type === 'error' ? 'fas fa-times' : 'fas fa-info';
    
    serverResponse.innerHTML = `
        <p><i class="${icon}"></i> ${message}</p>
        <small>${new Date().toLocaleTimeString()}</small>
    `;
}

function updateCharCount() {
    const count = messageInput.value.length;
    charCount.textContent = `${count}/100`;
    
    if (count > 80) {
        charCount.style.color = '#e63946';
    } else if (count > 50) {
        charCount.style.color = '#ffd60a';
    } else {
        charCount.style.color = '#4cc9f0';
    }
}

function clearInput() {
    messageInput.value = '';
    updateCharCount();
    messageInput.focus();
    showResponse('Input cleared', 'success');
}

function loadDemoMessage() {
    const demoMessages = [
        "HELLO",
        "TEST 123",
        "LED DEMO",
        "ABC 123"
    ];
    
    const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
    messageInput.value = randomMessage;
    updateCharCount();
    updateLedPreview(randomMessage);
    showResponse(`Demo: "${randomMessage}"`, 'success');
}

function toggleAutoRefresh() {
    if (autoRefreshToggle.checked) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
}

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(fetchLastMessage, 5000);
    showResponse('Auto-refresh on', 'success');
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    showResponse('Auto-refresh off', 'info');
}

function updateLastSentTime() {
    const now = new Date();
    lastSentTime.textContent = now.toLocaleTimeString();
}

function addRecentMessage(message) {
    const messageObj = {
        text: message,
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
    };
    
    recentMessagesList.unshift(messageObj);
    
    if (recentMessagesList.length > 5) {
        recentMessagesList = recentMessagesList.slice(0, 5);
    }
    
    localStorage.setItem('messages', JSON.stringify(recentMessagesList));
    
    updateRecentMessagesDisplay();
}

function loadRecentMessages() {
    const saved = localStorage.getItem('messages');
    if (saved) {
        try {
            recentMessagesList = JSON.parse(saved);
            updateRecentMessagesDisplay();
        } catch (e) {
            console.error('Error loading messages:', e);
        }
    }
}

function updateRecentMessagesDisplay() {
    if (recentMessagesList.length === 0) {
        recentMessages.innerHTML = '<p class="empty">No messages</p>';
        return;
    }
    
    let html = '';
    recentMessagesList.forEach((msg, index) => {
        html += `
            <div class="message-item">
                <div class="message-content">${msg.text}</div>
                <div class="message-time">${msg.date} ${msg.time}</div>
            </div>
        `;
    });
    
    recentMessages.innerHTML = html;
}

function clearMessageHistory() {
    recentMessagesList = [];
    localStorage.removeItem('messages');
    updateRecentMessagesDisplay();
    showResponse('History cleared', 'success');
}

function showApiDocs() {
    const docs = `
        <h3>API Documentation</h3>
        <p><strong>URL:</strong> ${API_BASE_URL}</p>
        <p><code>GET /message</code> - Get last message</p>
        <p><code>POST /message</code> - Send message</p>
        <p>POST data: {"text": "message"}</p>
    `;
    
    showResponse(docs, 'info');
}

function simulateDevicePolling() {
    showResponse('Simulating device...', 'info');
    
    let count = 0;
    const simInterval = setInterval(() => {
        count++;
        fetchLastMessage();
        
        if (count >= 3) {
            clearInterval(simInterval);
            showResponse('Simulation complete', 'success');
        }
    }, 1000);
}

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}
