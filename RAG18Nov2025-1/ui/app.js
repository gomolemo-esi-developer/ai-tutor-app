const API_BASE = 'http://localhost:8000/api';

let documents = [];
let selectedDocumentIds = [];
let chatHistory = [];

// DOM Elements
const documentList = document.getElementById('documentList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const selectedCount = document.getElementById('selectedCount');
const selectAllButton = document.getElementById('selectAll');
const modelName = document.getElementById('modelName');
const statusIndicator = document.getElementById('statusIndicator');
const inputHint = document.getElementById('inputHint');

// Initialize
async function init() {
    await loadDocuments();
    await loadConfig();
    setupEventListeners();
}

// Load available documents
async function loadDocuments() {
    try {
        console.log('Fetching documents from:', `${API_BASE}/documents`);
        const response = await fetch(`${API_BASE}/documents`);
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Documents received:', data);
        documents = data;
        renderDocuments();
    } catch (error) {
        documentList.innerHTML = `
            <div class="loading" style="color: var(--danger)">
                ❌ Failed to load documents. Error: ${error.message}
            </div>
        `;
        console.error('Error loading documents:', error);
    }
}

// Load system configuration
async function loadConfig() {
    try {
        const response = await fetch('http://localhost:8000/health/config');
        const config = await response.json();
        modelName.textContent = config.llm_model || 'Unknown';
        statusIndicator.style.color = 'var(--success)';
    } catch (error) {
        modelName.textContent = 'Offline';
        statusIndicator.style.color = 'var(--danger)';
        console.error('Error loading config:', error);
    }
}

// Render document checkboxes
function renderDocuments() {
    console.log('Rendering documents:', documents);
    
    if (!documents || documents.length === 0) {
        documentList.innerHTML = '<div class="loading">No documents available</div>';
        return;
    }

    // Check if there's an error in the response
    if (documents[0] && documents[0].error) {
        documentList.innerHTML = `
            <div class="loading" style="color: var(--danger)">
                ❌ Error: ${documents[0].error}
            </div>
        `;
        return;
    }

    documentList.innerHTML = documents.map(doc => `
        <div class="document-item" data-id="${doc.id}">
            <input 
                type="checkbox" 
                id="doc-${doc.id}" 
                value="${doc.id}"
                onchange="toggleDocument('${doc.id}')"
            >
            <label for="doc-${doc.id}">${doc.name}</label>
        </div>
    `).join('');

    updateSelectedCount();
}

// Toggle document selection
function toggleDocument(docId) {
    const checkbox = document.getElementById(`doc-${docId}`);
    const item = document.querySelector(`.document-item[data-id="${docId}"]`);
    
    if (checkbox.checked) {
        selectedDocumentIds.push(docId);
        item.classList.add('selected');
    } else {
        selectedDocumentIds = selectedDocumentIds.filter(id => id !== docId);
        item.classList.remove('selected');
    }
    
    updateSelectedCount();
    updateSendButton();
}

// Update selected count display
function updateSelectedCount() {
    const count = selectedDocumentIds.length;
    selectedCount.textContent = `${count} selected`;
    
    if (count === 0) {
        inputHint.textContent = 'Select at least one document to start chatting';
    } else if (count === 1) {
        const doc = documents.find(d => d.id === selectedDocumentIds[0]);
        inputHint.textContent = `Searching in: ${doc.name}`;
    } else {
        inputHint.textContent = `Searching in ${count} documents`;
    }
}

// Update send button state
function updateSendButton() {
    const hasSelection = selectedDocumentIds.length > 0;
    const hasMessage = messageInput.value.trim().length > 0;
    sendButton.disabled = !(hasSelection && hasMessage);
}

// Select/Deselect all documents
selectAllButton.addEventListener('click', () => {
    const allSelected = selectedDocumentIds.length === documents.length;
    
    documents.forEach(doc => {
        const checkbox = document.getElementById(`doc-${doc.id}`);
        const item = document.querySelector(`.document-item[data-id="${doc.id}"]`);
        
        if (allSelected) {
            checkbox.checked = false;
            item.classList.remove('selected');
        } else {
            checkbox.checked = true;
            item.classList.add('selected');
        }
    });
    
    if (allSelected) {
        selectedDocumentIds = [];
        selectAllButton.textContent = 'Select All';
    } else {
        selectedDocumentIds = documents.map(d => d.id);
        selectAllButton.textContent = 'Deselect All';
    }
    
    updateSelectedCount();
    updateSendButton();
});

// Setup event listeners
function setupEventListeners() {
    // Send button
    sendButton.addEventListener('click', sendMessage);
    
    // Enter to send (Shift+Enter for new line)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendButton.disabled) {
                sendMessage();
            }
        }
    });
    
    // Update button state on input
    messageInput.addEventListener('input', () => {
        updateSendButton();
        autoResize();
    });
}

// Auto-resize textarea
function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
}

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || selectedDocumentIds.length === 0) return;
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateSendButton();
    
    // Remove welcome message if present
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
    
    // Add user message
    addMessage('user', message);
    
    // Show typing indicator
    const typingId = addTypingIndicator();
    
    try {
        // Call API
        const response = await fetch(`${API_BASE}/student/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: message,
                document_ids: selectedDocumentIds,
                chat_history: chatHistory
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Add assistant response
        if (data.answer) {
            addMessage('assistant', data.answer, data.response_time);
            
            // Update chat history
            chatHistory.push({ role: 'user', content: message });
            chatHistory.push({ role: 'assistant', content: data.answer });
        } else if (data.error) {
            addMessage('assistant', `Error: ${data.error}`, null);
        }
        
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessage('assistant', '❌ Failed to get response. Please check if the API is running.', null);
        console.error('Error sending message:', error);
    }
}

// Add message to chat
function addMessage(role, content, responseTime = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = role === 'user' ? '👤' : '🤖';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let timeHtml = `<span class="message-time">${time}</span>`;
    if (responseTime) {
        timeHtml = `<span class="message-time">⏱️ ${responseTime.toFixed(2)}s • ${time}</span>`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div>
            <div class="message-content">${escapeHtml(content)}</div>
            ${timeHtml}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Add typing indicator
function addTypingIndicator() {
    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = typingId;
    typingDiv.className = 'message assistant';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return typingId;
}

// Remove typing indicator
function removeTypingIndicator(typingId) {
    const typing = document.getElementById(typingId);
    if (typing) typing.remove();
}

// Scroll to bottom of chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Initialize app
init();

