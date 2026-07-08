// Configuration for marked.js (markdown parser)
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
});

// App State
let chatHistory = [];
let isGenerating = false;
const defaultModel = "gemma3:1b";

// DOM Elements
const chatViewport = document.querySelector(".chat-viewport");
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");
const modelSelect = document.getElementById("model-select");
const chatLoading = document.getElementById("chat-loading");
const welcomeContainer = document.getElementById("welcome-container");
const quickPromptBtns = document.querySelectorAll(".quick-prompt-btn");

// Initialize application
function init() {
    // 1. Load chat history from LocalStorage
    const storedHistory = localStorage.getItem("ollama_chat_history");
    if (storedHistory) {
        try {
            chatHistory = JSON.parse(storedHistory);
            if (chatHistory.length > 0) {
                welcomeContainer.classList.add("hidden");
                renderHistory();
            }
        } catch (e) {
            console.error("Failed to parse stored chat history", e);
            chatHistory = [];
        }
    }

    // 2. Event Listeners
    sendBtn.addEventListener("click", handleSend);
    
    // Auto-resize textarea and handle Ctrl+Enter key
    userInput.addEventListener("input", autoResizeTextarea);
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    clearBtn.addEventListener("click", clearChat);

    // Quick prompts helper
    quickPromptBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const prompt = btn.getAttribute("data-prompt");
            userInput.value = prompt;
            autoResizeTextarea();
            handleSend();
        });
    });

    // Scroll to bottom initial
    scrollToBottom();
}

// Auto resize input textarea
function autoResizeTextarea() {
    userInput.style.height = "auto";
    userInput.style.height = (userInput.scrollHeight - 4) + "px";
}

// Render entire stored history
function renderHistory() {
    chatMessages.innerHTML = "";
    chatHistory.forEach(msg => {
        appendMessageUI(msg.role, msg.content);
    });
    scrollToBottom();
}

// Appends message block directly into the UI container
function appendMessageUI(role, content) {
    const isUser = role === "user";
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${role}`;

    // Create message metadata header
    const header = document.createElement("div");
    header.className = "message-header";
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    header.innerHTML = `
        <span class="sender-name">${isUser ? "You" : "Gemma"}</span>
        <span class="message-time">${time}</span>
    `;

    // Create bubble container
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    
    if (isUser) {
        bubble.textContent = content; // User input stays plain text for safety
    } else {
        bubble.innerHTML = marked.parse(content); // AI parses markdown
    }

    wrapper.appendChild(header);
    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);

    // Run syntax highlighting on code blocks
    if (!isUser) {
        bubble.querySelectorAll("pre code").forEach((block) => {
            Prism.highlightElement(block);
        });
    }

    return bubble;
}

// Send handler
async function handleSend() {
    const text = userInput.value.trim();
    if (!text || isGenerating) return;

    // Reset input
    userInput.value = "";
    userInput.style.height = "auto";
    isGenerating = true;
    
    // Hide empty state if it's the first message
    welcomeContainer.classList.add("hidden");

    // Add user message to UI and history state
    appendMessageUI("user", text);
    chatHistory.push({ role: "user", content: text });
    saveHistory();
    scrollToBottom();

    // Show minimalist 3D loader
    chatLoading.classList.remove("hidden");
    scrollToBottom();

    // Prepare receiver bubble for streaming assistant response
    const assistantBubble = appendMessageUI("assistant", "");
    let assistantText = "";

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text,
                history: chatHistory.slice(0, -1), // Send previous history up to current
                model: modelSelect.value
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Server error occurred");
        }

        // Setup SSE reader stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Hide loading spinner as soon as stream starts receiving
        let spinnerHidden = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (!spinnerHidden) {
                chatLoading.classList.add("hidden");
                spinnerHidden = true;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            
            // The last line might be incomplete, keep it in the buffer
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                    const dataStr = trimmed.slice(6);
                    if (dataStr === "[DONE]") {
                        break;
                    }
                    
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.text) {
                            assistantText += parsed.text;
                            // Update assistant content on the fly
                            assistantBubble.innerHTML = marked.parse(assistantText);
                            
                            // Highlight newly typed/updated code blocks
                            assistantBubble.querySelectorAll("pre code").forEach((block) => {
                                Prism.highlightElement(block);
                            });
                            
                            scrollToBottom();
                        } else if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                    } catch (e) {
                        console.error("Error parsing message chunk:", e);
                    }
                }
            }
        }

        // Add assistant's complete response to history
        chatHistory.push({ role: "assistant", content: assistantText });
        saveHistory();

    } catch (error) {
        console.error("Chat error:", error);
        assistantText = `*Error: Failed to fetch response. Make sure Ollama is running (` + error.message + `).*`;
        assistantBubble.innerHTML = marked.parse(assistantText);
    } finally {
        chatLoading.classList.add("hidden");
        isGenerating = false;
        scrollToBottom();
    }
}

// Clear message history
function clearChat() {
    if (confirm("Are you sure you want to clear the conversation?")) {
        chatHistory = [];
        localStorage.removeItem("ollama_chat_history");
        chatMessages.innerHTML = "";
        welcomeContainer.classList.remove("hidden");
    }
}

// Save history to localStorage
function saveHistory() {
    localStorage.setItem("ollama_chat_history", JSON.stringify(chatHistory));
}

// Utility: Scroll to bottom of chat
function scrollToBottom() {
    chatViewport.scrollTop = chatViewport.scrollHeight;
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", init);
