// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize dashboard features
    initializeSidebar();
    initializeSplitFunctionality();
    initializeApiKeyModal();
    
    function initializeSidebar() {
        const chatMenuBtn = document.getElementById('chatMenuBtn');
        const chatSidebar = document.getElementById('chatSidebar');
        const closeSidebarBtn = document.getElementById('closeSidebar');
        
        if (chatMenuBtn && chatSidebar) {
            chatMenuBtn.addEventListener('click', function() {
                if (chatSidebar.classList.contains('sidebar-hidden')) {
                    chatSidebar.classList.remove('sidebar-hidden');
                    chatSidebar.classList.add('sidebar-visible');
                } else {
                    chatSidebar.classList.remove('sidebar-visible');
                    chatSidebar.classList.add('sidebar-hidden');
                }
            });
        }
        
        if (closeSidebarBtn && chatSidebar) {
            closeSidebarBtn.addEventListener('click', function() {
                chatSidebar.classList.remove('sidebar-visible');
                chatSidebar.classList.add('sidebar-hidden');
            });
        }
    }
    
    function initializeSplitFunctionality() {
        const submitBtn = document.getElementById('submitPrompt');
        const submitBtnSplit = document.getElementById('submitPromptSplit');
        const promptInput = document.getElementById('promptInput');
        const promptInputSplit = document.getElementById('promptInputSplit');
        
        // Initialize panel divider functionality
        initializePanelDivider();
        
        // Add click event to the main submit button to trigger split and send prompt
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const prompt = promptInput.value.trim();
                
                if (!prompt) {
                    alert('Please enter a description for your application');
                    promptInput.focus();
                    return;
                }
                
                // Clear the input field
                promptInput.value = '';
                
                // Trigger split view
                activateSplitView();
                
                // Set the prompt in the split view input
                setTimeout(() => {
                    if (promptInputSplit) {
                        promptInputSplit.value = prompt;
                        promptInputSplit.focus();
                    }
                }, 300);
                
                // Send the prompt to Gemini immediately
                sendPromptRequest(prompt);
            });
        }
        
        // Handle the split view submit button
        if (submitBtnSplit && promptInputSplit) {
            submitBtnSplit.addEventListener('click', function() {
                const prompt = promptInputSplit.value.trim();
                
                if (!prompt) {
                    alert('Please enter a description for your application');
                    promptInputSplit.focus();
                    return;
                }
                
                // Send request to server with the prompt
                sendPromptRequest(prompt);
            });
            
            // Enter key support for split prompt input
            promptInputSplit.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    submitBtnSplit.click();
                }
            });
        }
    }
    
    function activateSplitView() {
        const dashboardHeader = document.getElementById('dashboardHeader');
        const splitContainer = document.getElementById('splitContainer');
        
        if (dashboardHeader && splitContainer) {
            // Hide the dashboard header completely
            dashboardHeader.style.display = 'none';
            
            // Show split container with animation
            splitContainer.classList.add('active');
        }
    }
    
    // Function to add chat message
    function addChatMessage(message, type = 'info') {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message chat-message-${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-text">${message}</span>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to clear chat messages
    function clearChatMessages() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }
    
    // Function to send GET request with prompt
    function sendPromptRequest(prompt) {
        // Show loading state
        const submitBtn = document.getElementById('submitPromptSplit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Building...';
        submitBtn.disabled = true;
        
        // Clear previous messages
        clearChatMessages();
        
        // Add initial message
        addChatMessage(`🚀 Starting to build your application: "${prompt}"`, 'user');
        
        // Non-streaming request to backend
        fetch(`/api/generate-prompt?prompt=${encodeURIComponent(prompt)}`, {
            method: 'POST'
        })
        .then(async (resp) => {
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                const message = data && data.error ? data.error : `HTTP ${resp.status}`;
                throw new Error(message);
            }
            return resp.json();
        })
        .then((data) => {
            // Render messages and basic summary
            if (Array.isArray(data.messages)) {
                data.messages.forEach(m => addChatMessage(m, 'agent'));
            }
            addChatMessage('✅ Generation complete.', 'success');

            // Initialize virtual file system in the UI
            if (data && data.success && data.projectId && data.projectStructure && Array.isArray(data.projectStructure.files)) {
                try {
                    if (window.initializeProject) {
                        window.initializeProject(data.projectId, data.projectStructure.files);
                    }
                } catch (e) {
                    console.warn('initializeProject failed:', e);
                }
            }

            // Optionally reflect file operations in editor if available
            if (Array.isArray(data.fileOperations) && window.appendToEditor) {
                // Best-effort: show any text content from write_file ops
                data.fileOperations.forEach(op => {
                    if (op && op.type === 'write_file' && typeof op.content === 'string') {
                        window.appendToEditor(`\n\n${op.content}`, 'plaintext');
                    }
                });
            }
        })
        .catch((err) => {
            handleApiError({ message: String(err && err.message || err) });
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    }
    
    // Function to initialize API key modal
    function initializeApiKeyModal() {
        const apiKeyBtn = document.getElementById('apiKeyBtn');
        const apiKeyModal = document.getElementById('apiKeyModal');
        const closeApiKeyModal = document.getElementById('closeApiKeyModal');
        const cancelApiKeyBtn = document.getElementById('cancelApiKeyBtn');
        const updateApiKeyBtn = document.getElementById('updateApiKeyBtn');
        const apiKeyInput = document.getElementById('apiKeyInput');

        // Open API key modal
        apiKeyBtn.addEventListener('click', function() {
            apiKeyModal.style.display = 'block';
            apiKeyInput.focus();
        });

        // Close modal functions
        function closeModal() {
            apiKeyModal.style.display = 'none';
            apiKeyInput.value = '';
        }

        closeApiKeyModal.addEventListener('click', closeModal);
        cancelApiKeyBtn.addEventListener('click', closeModal);

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === apiKeyModal) {
                closeModal();
            }
        });

        // Update API key
        updateApiKeyBtn.addEventListener('click', function() {
            const newApiKey = apiKeyInput.value.trim();
            if (!newApiKey) {
                alert('Please enter a valid API key');
                return;
            }

            // Send API key update request
            fetch('/api/update-api-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: newApiKey })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('API key updated successfully!');
                    closeModal();
                } else {
                    alert('Failed to update API key: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error updating API key:', error);
                alert('Failed to update API key. Please try again.');
            });
        });
    }

    // Function to handle API errors
    function handleApiError(error) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        const closeErrorModal = document.getElementById('closeErrorModal');
        const closeErrorBtn = document.getElementById('closeErrorBtn');
        const updateApiKeyFromErrorBtn = document.getElementById('updateApiKeyFromErrorBtn');

        let message = 'An error occurred while processing your request.';
        
        if (error.message && error.message.includes('API_QUOTA_EXCEEDED')) {
            message = 'API quota exceeded. Please update your API key or try again later.';
        } else if (error.message && error.message.includes('INVALID_API_KEY')) {
            message = 'Invalid API key. Please update your API key.';
        } else if (error.message && error.message.includes('API_ERROR')) {
            message = error.message.replace('API_ERROR: ', '');
        }

        errorMessage.textContent = message;
        errorModal.style.display = 'block';

        // Close modal functions
        function closeErrorModalFunc() {
            errorModal.style.display = 'none';
        }

        closeErrorModal.addEventListener('click', closeErrorModalFunc);
        closeErrorBtn.addEventListener('click', closeErrorModalFunc);

        // Update API key from error modal
        updateApiKeyFromErrorBtn.addEventListener('click', function() {
            errorModal.style.display = 'none';
            document.getElementById('apiKeyModal').style.display = 'block';
            document.getElementById('apiKeyInput').focus();
        });

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === errorModal) {
                closeErrorModalFunc();
            }
        });
    }

    // Function to initialize panel divider functionality
    function initializePanelDivider() {
        const divider = document.getElementById('panelDivider');
        const leftPanel = document.querySelector('.left-panel');
        const rightPanel = document.querySelector('.right-panel');
        
        if (!divider || !leftPanel || !rightPanel) {
            console.warn('Panel divider elements not found');
            return;
        }
        
        let isDragging = false;
        let startX = 0;
        let startLeftWidth = 0;
        
        // Mouse events for dragging
        divider.addEventListener('mousedown', function(e) {
            isDragging = true;
            startX = e.clientX;
            startLeftWidth = leftPanel.offsetWidth;
            
            divider.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const newLeftWidth = Math.max(300, Math.min(startLeftWidth + deltaX, window.innerWidth * 0.7));
            
            leftPanel.style.width = newLeftWidth + 'px';
            leftPanel.style.flex = 'none';
            
            // Ensure right panel takes remaining space
            rightPanel.style.flex = '1';
        });
        
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                divider.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
        
        // Touch events for mobile devices
        divider.addEventListener('touchstart', function(e) {
            isDragging = true;
            startX = e.touches[0].clientX;
            startLeftWidth = leftPanel.offsetWidth;
            
            divider.classList.add('dragging');
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            
            const deltaX = e.touches[0].clientX - startX;
            const newLeftWidth = Math.max(300, Math.min(startLeftWidth + deltaX, window.innerWidth * 0.7));
            
            leftPanel.style.width = newLeftWidth + 'px';
            leftPanel.style.flex = 'none';
            
            // Ensure right panel takes remaining space
            rightPanel.style.flex = '1';
            
            e.preventDefault();
        });
        
        document.addEventListener('touchend', function() {
            if (isDragging) {
                isDragging = false;
                divider.classList.remove('dragging');
                document.body.style.userSelect = '';
            }
        });
        
        // Double-click to reset to default size
        divider.addEventListener('dblclick', function() {
            leftPanel.style.width = '';
            leftPanel.style.flex = '1';
            rightPanel.style.flex = '1';
        });
        
        console.log('✅ Panel divider initialized');
    }

    // Console message
    console.log(`
    🚀 GenForge Dashboard Ready!
    
    Features:
    - Split view functionality
    - Sidebar navigation
    - Prompt input handling
    - Chat-like message display
    - Virtual file system integration
    - API key management
    - Draggable panel divider
    
    Start building by entering a prompt in the input field!
    `);
});