/*********************************
 * CONFIG
 *********************************/
const API_URL ="https://cuuwn5g36ybgmup2fdff6nt6wa0jmgxl.lambda-url.us-east-1.on.aws" //"https://7ecbew75qx4bkaxeiez4et37su0tisqt.lambda-url.us-east-1.on.aws" //"https://64craal7zd.execute-api.us-east-1.amazonaws.com/prod"; // "https://7ecbew75qx4bkaxeiez4et37su0tisqt.lambda-url.us-east-1.on.aws/"
const chatContainer = document.getElementById("chat-container");
const sendBtn = document.getElementById("send-button");
const input = document.getElementById("user-input");
const fileInput = document.getElementById("file-input");
const filePreview = document.getElementById("file-preview");
// currently selected files and index of chosen ad image
let currentFiles = [];
const chatWidget = document.getElementById('chat-widget');
const chatToggle = document.getElementById('chat-toggle');
const closeChatBtn = document.getElementById('close-chat');

/*********************************
 * UTILITIES
 *********************************/
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function cleanText(text = "") {
  try {
    if (text.trim().startsWith("{")) {
      const parsed = JSON.parse(text);
      if (parsed.response) {
        text = parsed.response;
      }
    }
  } catch (e) {
    // ignore if not JSON
  }
  return text.replace(/[#*]/g, "").trim();
}

const ALLOWED_TYPES = ['image/', 'application/pdf', 'audio/', 'video/'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function clearFilePreview() {
  if (filePreview) filePreview.innerHTML = "";
}

function syncInputFiles() {
  if (!fileInput) return;

  try {
    const dt = new DataTransfer();
    currentFiles.forEach((file) => dt.items.add(file));
    fileInput.files = dt.files;
  } catch (e) {
    if (!currentFiles.length) {
      fileInput.value = "";
    }
  }
}

function renderAllFilePreviews() {
  if (!filePreview) return;
  clearFilePreview();

  currentFiles.forEach((file, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'file-item';

    // Preview (image thumb or filename)
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);
      img.alt = file.name;
      img.style.maxWidth = '120px';
      img.style.maxHeight = '80px';
      img.style.objectFit = 'cover';
      wrap.appendChild(img);
    } else {
      const label = document.createElement('span');
      label.textContent = file.name;
      wrap.appendChild(label);
    }

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-remove';
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', `Remove ${file.name}`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      removeFileAt(index);
    });

    wrap.appendChild(removeBtn);
    filePreview.appendChild(wrap);
  });
}
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    // Filter files with your existing constraints
    const filtered = files.filter(f => {
      const isAllowed = ALLOWED_TYPES.some(t => f.type.startsWith(t));
      if (!isAllowed) alert(`File type not allowed: ${f.name}`);
      const isTooLarge = f.size > MAX_FILE_SIZE;
      if (isTooLarge) alert(`File too large (max 10MB): ${f.name}`);
      return isAllowed && !isTooLarge;
    });

    // Merge with existing currentFiles (optional: dedupe)
    currentFiles = [...currentFiles, ...filtered];

    // Re-render preview and sync input
    renderAllFilePreviews();
    syncInputFiles();

    // If nothing remains, clear the raw input value to allow re-selecting the same file
    if (!currentFiles.length) {
      fileInput.value = '';
    }
  });
}

function removeFileAt(index) {
  currentFiles.splice(index, 1);
  renderAllFilePreviews();
  syncInputFiles();
}

/*********************************
 * WELCOME MESSAGE
 *********************************/
function showWelcome() {
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'message agent-message';

    const avatar = document.createElement('div');
    avatar.className = 'avatar bot-avatar';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = `
        <h4>Welcome! How can I help you today?</h4>
        <p>I can assist with coverage, payments, claims, and more.</p>
        <div class="quick-replies">
            <button data-msg="Coverage & Benefits">Coverage & Benefits</button>
            <button data-msg="Premium Payments">Premium Payments</button>
            <button data-msg="Claims & reimbursements">Claims & Reimbursements</button>
        </div>
    `;
    
    content.querySelectorAll(".quick-replies button").forEach(btn => {
        btn.onclick = () => {
            input.value = btn.dataset.msg;
            sendMessage();
        };
    });

    welcomeMessage.appendChild(avatar);
    welcomeMessage.appendChild(content);
    chatContainer.appendChild(welcomeMessage);
}

/*********************************
 * MESSAGE RENDERERS
 *********************************/
function renderUserMessage(text) {
  const msg = document.createElement("div");
  msg.className = "message user-message";
  
  const avatar = document.createElement("div");
  avatar.className = "avatar user-avatar";
  avatar.textContent = "U"; // Placeholder for user avatar

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;

  msg.appendChild(content);
  msg.appendChild(avatar);
  return msg;
}

function createAgentMessageContainer(innerHTML) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'message agent-message';

    const avatar = document.createElement('div');
    avatar.className = 'avatar bot-avatar';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = innerHTML;

    messageWrapper.appendChild(avatar);
    messageWrapper.appendChild(content);
    
    return messageWrapper;
}

function renderFSMResponse({ title, message, nextMessage = [], quickReplies = [], links = [] }) {
  let html = "";
  if (title) html += `<h4>${cleanText(title)}</h4>`;
  if (message) html += `<p>${cleanText(message).replace(/\n/g, "<br>")}</p>`;

  if (links && links.length) {
    html += `<div class="link-section">`;
    links.forEach(link => {
      html += `<p><a href="${link.url}" target="_blank" rel="noopener">${cleanText(link.link_text)}</a></p>`;
    });
    html += `</div>`;
  }

  if (Array.isArray(nextMessage) && nextMessage.length) {
    nextMessage.forEach(item => {
      html += `<p>${item.url ? `<a href="${item.url}" target="_blank" rel="noopener">${cleanText(item.text)}</a>` : cleanText(item.text)}</p>`;
    });
  }

  if (quickReplies.length) {
    html += `<div class="quick-replies">${quickReplies.map(qr => `<button data-msg="${qr}">${qr}</button>`).join("")}</div>`;
  }

  const card = createAgentMessageContainer(html);
  card.querySelectorAll(".quick-replies button").forEach(btn => {
    btn.onclick = () => {
      input.value = btn.dataset.msg;
      sendMessage();
    };
  });
  return card;
}

function renderAgentMessage(payload) {
  if (payload.type === 'FAQ' || payload.nodeId) {
    return renderFSMResponse(payload);
  }

  let bodyText = payload.message || payload.body || "";
  bodyText = cleanText(bodyText).replace(/\n/g, "<br>");
  bodyText = bodyText.replace(/-\s(.+?)<br>/g, "<li>$1</li>");
  if (bodyText.includes("<li>")) bodyText = `<ul>${bodyText}</ul>`;

  let html = `<div>${bodyText}</div>`;

  if (payload.links && payload.links.length) {
    html += `<div class="link-section" style="margin-top: 15px;">`;
    payload.links.forEach(link => {
      html += `<p><a href="${link.url}" target="_blank" rel="noopener" class="faq-link">${cleanText(link.link_text)}</a></p>`;
    });
    html += `</div>`;
  }

  if (payload.quickReplies && payload.quickReplies.length) {
    html += `<div class="quick-replies" style="margin-top: 15px;">${payload.quickReplies.map(qr => `<button data-msg="${qr}">${qr}</button>`).join("")}</div>`;
  }

  const card = createAgentMessageContainer(html);
  card.querySelectorAll(".quick-replies button").forEach(btn => {
    btn.onclick = () => {
      input.value = btn.dataset.msg;
      sendMessage();
    };
  });
  return card;
}

/*********************************
 * HISTORY
 *********************************/
async function loadHistory() {
  try {
    const res = await fetch(`${API_URL}/history`);
    const data = await res.json();
    const history = data.messages || [];

    if (!history.length) {
      showWelcome();
      scrollToBottom();
      return;
    }

    const toggle = document.createElement("div");
    toggle.className = "history-toggle";
    toggle.textContent = "📜 View previous conversations";

    const historyContainer = document.createElement("div");
    historyContainer.style.display = "none";

    history.forEach(item => {
      if (item.role === "user") {
        historyContainer.appendChild(renderUserMessage(item.content));
      } else {
        historyContainer.appendChild(renderAgentMessage({ body: item.content }));
      }
    });

    toggle.onclick = () => {
      const isOpen = historyContainer.style.display === "block";
      historyContainer.style.display = isOpen ? "none" : "block";
      toggle.textContent = isOpen ? "📜 View previous conversations" : "🔽 Hide previous conversations";
      scrollToBottom();
    };

    chatContainer.appendChild(toggle);
    chatContainer.appendChild(historyContainer);
  } catch (e) {
    showWelcome();
  }
  scrollToBottom();
}

function showTyping() {
  if (document.getElementById("typing-indicator")) return;
  const typing = document.createElement("div");
  typing.id = "typing-indicator";
  typing.className = "message agent-message";
  typing.innerHTML = `
    <div class="avatar bot-avatar"></div>
    <div class="message-content">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  chatContainer.appendChild(typing);
  scrollToBottom();
}

function hideTyping() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

function getUserId() {
  let tokens = localStorage.getItem("cognito_tokens");
  if (tokens) {
    try {
      const parsed = JSON.parse(tokens);
      const payload = JSON.parse(atob(parsed.id_token.split(".")[1]));
      return payload.sub;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function generateUserId() {
  let userId = localStorage.getItem("anonymous_user_id");
  if (!userId) {
    userId = 'user-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("anonymous_user_id", userId);
  }
  return userId;
}

function getConversationId() {
  let conversationId = localStorage.getItem("conversation_id");
  if (!conversationId) {
    conversationId = 'conv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("conversation_id", conversationId);
  }
  return conversationId;
}

/*********************************
 * SEND MESSAGE
 *********************************/
async function sendMessage() {
  const text = input.value.trim();
  if (!text && !currentFiles.length) return;

  let userMsg = text || "";
  if (currentFiles.length) {
    const names = currentFiles.map(f => f.name).join(', ');
    userMsg = userMsg ? `${userMsg}\n[Attached: ${names}]` : `[Attached: ${names}]`;
  }

  chatContainer.appendChild(renderUserMessage(userMsg));
  input.value = "";
  scrollToBottom();
  showTyping();

  try {
    const form = new FormData();
    form.append('userId', getUserId() || generateUserId());
    form.append('conversationId', getConversationId());
    form.append('message', text);
    form.append('channel', 'web');
    form.append('locale', 'en-US');
    currentFiles.forEach(f => form.append('attachments', f));

    const res = await fetch(API_URL, { method: 'POST', body: form });
    const data = await res.json();
    
    hideTyping();
    chatContainer.appendChild(renderAgentMessage(data.reply || data));

    if (fileInput) {
      fileInput.value = '';
      clearFilePreview();
      currentFiles = [];
    }
  } catch (e) {
    hideTyping();
    chatContainer.appendChild(renderAgentMessage({ body: 'Unable to reach the service. Please try again.' }));
  }
  scrollToBottom();
}

/*********************************
 * EVENTS
 *********************************/
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

/*********************************
 * INIT
 *********************************/
loadHistory();

if (chatToggle) {
  chatToggle.addEventListener('click', () => {
    chatWidget.classList.toggle('open');
    chatWidget.classList.toggle('closed');
    if (chatWidget.classList.contains('open')) {
      setTimeout(() => input.focus(), 200);
    }
  });
}

if (closeChatBtn) {
  closeChatBtn.addEventListener('click', () => {
    chatWidget.classList.remove('open');
    chatWidget.classList.add('closed');
  });
}

// Set initial state
chatWidget.classList.add('closed');
chatWidget.classList.remove('open');

// close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && chatWidget && chatWidget.classList.contains('open')) {
    chatWidget.classList.remove('open');
    chatWidget.classList.add('closed');
  }
});
