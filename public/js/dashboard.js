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
        
        // Add click event to the main submit button to trigger split
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const prompt = promptInput.value.trim();
                
                if (!prompt) {
                    alert('Please enter a description for your application');
                    promptInput.focus();
                    return;
                }
                
                // Trigger split view
                activateSplitView();
                
                // Set the prompt in the split view input
                setTimeout(() => {
                    if (promptInputSplit) {
                        promptInputSplit.value = prompt;
                        promptInputSplit.focus();
                    }
                }, 300);
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
        
        // Create URL with prompt as query parameter
        const url = `/api/generate-prompt?prompt=${encodeURIComponent(prompt)}`;
        
        // Send POST request
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Server response:', data);
            
            // Handle successful response
            if (data.success) {
                // Display messages from agent
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(message => {
                        addChatMessage(message, 'agent');
                    });
                }
                
                // Add final success message
                addChatMessage(data.finalMessage || '✅ Application generated successfully!', 'success');
                
                // Initialize project in right panel
                if (data.projectStructure && data.projectStructure.files) {
                    if (window.initializeProject) {
                        window.initializeProject(data.projectId, data.projectStructure.files);
                    }
                }
                
            } else {
                // Handle API errors
                if (data.error === 'API_QUOTA_EXCEEDED' || data.error === 'INVALID_API_KEY') {
                    handleApiError({ message: data.error });
                } else {
                    addChatMessage(`❌ Error: ${data.message || data.error || 'Failed to generate application'}`, 'error');
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            handleApiError(error);
        })
        .finally(() => {
            // Restore button state
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
    
    Start building by entering a prompt in the input field!
    `);
});