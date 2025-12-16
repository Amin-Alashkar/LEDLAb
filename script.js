const API_BASE_URL = 'http://192.168.1.146:8080';
const GET_MESSAGE_ENDPOINT = `${API_BASE_URL}/message`;
const POST_MESSAGE_ENDPOINT = `${API_BASE_URL}/message`;
const BAD_WORDS_FILE = 'badwords.txt';

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
let blockedWords = [];

const letterToLedIndex = {
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8,
    'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16,
    'R': 17, 'S': 18, 'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

const ledColors = [
    '#4cc9f0', 
    '#f72585',
    '#7209b7', 
    '#3a86ff',
    '#ff5400', 
    '#ffd60a', 
    '#06d6a0', 
    '#e63946'  
];

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    createParticles();
    
    createLedStrip();
    
    await loadBlockedWords();
    
    await checkConnection();
    
    setupEventListeners();
    
    loadRecentMessages();
    
    if (autoRefreshToggle.checked) {
        startAutoRefresh();
    }
    
    fetchLastMessage();
    
    updateCharCount();
}

async function loadBlockedWords() {
    try {
        const response = await fetch(BAD_WORDS_FILE);
        if (!response.ok) {
            throw new Error(`Failed to load badwords.txt: ${response.status}`);
        }
        
        const text = await response.text();
        blockedWords = text
            .split('\n')
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length > 0);
        
        console.log(`Loaded ${blockedWords.length} blocked words from ${BAD_WORDS_FILE}`);
    } catch (error) {
        console.error('Error loading blocked words:', error);
        blockedWords = ["demogorgon", "vecna", "mindflayer", "upsidedown", "hawkins"];
        console.log('Using default blocked words list');
    }
}

function createParticles() {
    const container = document.getElementById('particles-container');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.animationDelay = `${Math.random() * 15}s`;
        particle.style.animationDuration = `${10 + Math.random() * 20}s`;
        container.appendChild(particle);
    }
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
        const response = await fetch(GET_MESSAGE_ENDPOINT, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            setConnectionStatus(true);
            apiStatus.textContent = 'Connected';
            apiStatus.style.color = '#06d6a0';
        } else {
            setConnectionStatus(false);
            apiStatus.textContent = `Error: ${response.status}`;
            apiStatus.style.color = '#e63946';
        }
    } catch (error) {
        console.error('Connection error:', error);
        setConnectionStatus(false);
        apiStatus.textContent = 'Connection failed';
        apiStatus.style.color = '#e63946';
    }
}

function setConnectionStatus(connected) {
    isConnected = connected;
    
    if (connected) {
        connectionDot.className = 'dot connected';
        connectionText.textContent = 'Secure link established';
        connectionText.style.color = '#06d6a0';
        deviceStatus.textContent = 'Ready for transmission';
        deviceStatus.style.color = '#06d6a0';
    } else {
        connectionDot.className = 'dot disconnected';
        connectionText.textContent = 'Link disrupted';
        connectionText.style.color = '#e63946';
        deviceStatus.textContent = 'Connection failed';
        deviceStatus.style.color = '#e63946';
    }
}

async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text) {
        showResponse('Please enter a message before transmitting.', 'error');
        messageInput.focus();
        return;
    }
    
    const hasBlockedWord = blockedWords.some(word => text.toLowerCase().includes(word));
    
    if (hasBlockedWord) {
        showResponse('Message contains restricted content. Transmission blocked.', 'error');
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
            showResponse(`Transmission successful! LED array displaying: "${data.last_message}"`, 'success');
            
            addRecentMessage(text);
            
            updateLastSentTime();
            
            updateLedPreview(text);
            
            messageInput.value = '';
            updateCharCount();
            
            setConnectionStatus(true);
        } else {
            showResponse(`Transmission error: Server returned status ${response.status}`, 'error');
        }
    } catch (error) {
        console.error('Transmission error:', error);
        showResponse('Error: Could not establish connection to Hawkins Lab.', 'error');
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
        console.error('Error fetching message:', error);
        setConnectionStatus(false);
    }
}

function createLedStrip() {
    ledStripPreview.innerHTML = '';
    
    for (let i = 0; i < 26; i++) {
        const led = document.createElement('div');
        led.className = 'led';
        led.dataset.index = i;
        const letter = String.fromCharCode(65 + i);
        led.title = `LED ${i} (${letter})`;
        ledStripPreview.appendChild(led);
    }
}

function updateLedPreview(message) {
    resetLedPreview();
    
    if (!message) return;
    
    const chars = message.toUpperCase().split('');
    let delay = 0;
    
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
        }, delay * 300);
        
        delay++;
    });
}

function lightLed(index, type = 'letter') {
    const leds = document.querySelectorAll('.led');
    if (index >= 0 && index < leds.length) {
        leds[index].className = 'led';
        
        setTimeout(() => {
            leds[index].classList.add(type === 'sequence' ? 'sequence' : 'on');
            
            const color = ledColors[Math.floor(Math.random() * ledColors.length)];
            leds[index].style.backgroundColor = color;
            leds[index].style.boxShadow = `0 0 15px ${color}, 0 0 30px ${color}`;
        }, 10);
    }
}

function flashAllLeds() {
    const leds = document.querySelectorAll('.led');
    
    leds.forEach(led => {
        led.classList.add('special');
        led.style.backgroundColor = '#ff5400';
        led.style.boxShadow = '0 0 15px #ff5400, 0 0 30px #ff5400';
    });
    
    setTimeout(() => {
        leds.forEach(led => {
            led.className = 'led';
            led.style.backgroundColor = '';
            led.style.boxShadow = '';
        });
    }, 500);
}

function resetLedPreview() {
    const leds = document.querySelectorAll('.led');
    leds.forEach(led => {
        led.className = 'led';
        led.style.backgroundColor = '';
        led.style.boxShadow = '';
    });
}

function playLedAnimation() {
    if (isAnimating) {
        stopLedAnimation();
        playPreviewBtn.innerHTML = '<i class="fas fa-play"></i> Activate Sequence';
        isAnimating = false;
        return;
    }
    
    const message = messageInput.value.trim() || "HAWKINS 117!";
    isAnimating = true;
    playPreviewBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Sequence';
    
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
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                 type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';
    
    serverResponse.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 15px;">
            <i class="${icon}" style="font-size: 2rem; color: ${type === 'success' ? '#06d6a0' : type === 'error' ? '#e63946' : '#4cc9f0'}"></i>
            <div>
                <p style="font-weight: 500; margin-bottom: 8px; font-family: 'Orbitron', sans-serif;">${type === 'error' ? 'TRANSMISSION FAILED' : 'TRANSMISSION SUCCESS'}</p>
                <p>${message}</p>
                <p style="font-size: 0.9rem; color: #aaa; margin-top: 10px;">
                    <i class="fas fa-clock"></i> ${new Date().toLocaleTimeString()}
                </p>
            </div>
        </div>
    `;
}

function updateCharCount() {
    const count = messageInput.value.length;
    charCount.textContent = `${count}/100 characters`;
    
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
    showResponse('Message input cleared', 'success');
}

function loadDemoMessage() {
    const demoMessages = [
        "HAWKINS 117!",
        "THE UPSIDE DOWN",
        "WILL BYERS",
        "ELEVEN IS ALIVE",
        "RUN NOW",
        "DEMOGORGON WARNING",
        "CODE RED ALERT"
    ];
    
    const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
    messageInput.value = randomMessage;
    updateCharCount();
    updateLedPreview(randomMessage);
    showResponse(`Loaded demo sequence: "${randomMessage}"`, 'success');
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
    showResponse('Auto-sync enabled (updating every 5 seconds)', 'success');
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    showResponse('Auto-sync disabled', 'info');
}

function updateLastSentTime() {
    const now = new Date();
    lastSentTime.textContent = now.toLocaleTimeString();
    lastSentTime.style.color = '#06d6a0';
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
    
    localStorage.setItem('strangerLedMessages', JSON.stringify(recentMessagesList));
    
    updateRecentMessagesDisplay();
}

function loadRecentMessages() {
    const saved = localStorage.getItem('strangerLedMessages');
    if (saved) {
        try {
            recentMessagesList = JSON.parse(saved);
            updateRecentMessagesDisplay();
        } catch (e) {
            console.error('Error loading recent messages:', e);
        }
    }
}

function updateRecentMessagesDisplay() {
    if (recentMessagesList.length === 0) {
        recentMessages.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No transmissions recorded</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    recentMessagesList.forEach((msg, index) => {
        html += `
            <div class="message-item">
                <div class="message-content">${escapeHtml(msg.text)}</div>
                <div class="message-time">${msg.date} ${msg.time}</div>
            </div>
        `;
    });
    
    recentMessages.innerHTML = html;
}

function clearMessageHistory() {
    recentMessagesList = [];
    localStorage.removeItem('strangerLedMessages');
    updateRecentMessagesDisplay();
    showResponse('Transmission log cleared', 'success');
}

function showApiDocs() {
    const docs = `
        <h3 style="color: #4cc9f0; margin-bottom: 15px; font-family: 'Orbitron', sans-serif;">HAWKINS LAB PROTOCOL</h3>
        <p><strong>Secure Endpoint:</strong> http://192.168.1.146:8000</p>
        
        <h4 style="color: #4cc9f0; margin-top: 15px;">Transmission Channels:</h4>
        <p><code>GET /message</code> - Retrieve last encoded message</p>
        <p><code>POST /message</code> - Transmit new encoded message</p>
        
        <h4 style="color: #4cc9f0; margin-top: 15px;">POST Transmission Format:</h4>
        <pre><code>{
    "text": "Your encoded message"
}</code></pre>
        
        <h4 style="color: #4cc9f0; margin-top: 15px;">LED Array Integration:</h4>
        <p>The secure device polls the transmission channel every second and displays messages using the Hawkins encoding protocol.</p>
    `;
    
    showResponse(docs, 'info');
}

function simulateDevicePolling() {
    showResponse('Simulating Hawkins Lab device behavior... The device polls for new transmissions every second.', 'info');
    
    let count = 0;
    const simInterval = setInterval(() => {
        count++;
        fetchLastMessage();
        
        if (count >= 3) {
            clearInterval(simInterval);
            showResponse('Device simulation complete. Real device would continue polling every second.', 'success');
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

if (typeof hljs !== 'undefined') {
    hljs.highlightAll();
}