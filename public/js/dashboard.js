// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize dashboard features
    initializeSidebar();
    initializeSplitFunctionality();
    initializeApiKeyModal();
    fetchAndRenderProjects();
    
    function initializeSidebar() {
        const chatMenuBtn = document.getElementById('chatMenuBtn');
        const chatSidebar = document.getElementById('chatSidebar');
        const closeSidebarBtn = document.getElementById('closeSidebar');
        const newChatBtn = document.getElementById('newChatBtn');
        const chatList = document.getElementById('chatList');
        
        if (chatMenuBtn && chatSidebar) {
            chatMenuBtn.addEventListener('click', function() {
                if (chatSidebar.classList.contains('sidebar-hidden')) {
                    chatSidebar.classList.remove('sidebar-hidden');
                    chatSidebar.classList.add('sidebar-visible');
                    // Refresh projects when opening the sidebar
                    fetchAndRenderProjects();
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

        // New chat button functionality
        if (newChatBtn) {
            newChatBtn.addEventListener('click', function() {
                // Close the sidebar first
                if (chatSidebar) {
                    chatSidebar.classList.remove('sidebar-visible');
                    chatSidebar.classList.add('sidebar-hidden');
                }
                
                // Reset to dashboard view
                resetToDashboard();
            });
        }

        // Project click handling - load project data or delete project
        if (chatList) {
            chatList.addEventListener('click', function(e) {
                // Check if delete button was clicked
                if (e.target.closest('.delete-project-btn')) {
                    e.stopPropagation(); // Prevent project loading
                    const deleteBtn = e.target.closest('.delete-project-btn');
                    const projectId = deleteBtn.getAttribute('data-project-id');
                    if (projectId) {
                        deleteProject(projectId);
                    }
                    return;
                }
                
                // Otherwise, load project data
                const item = e.target.closest('[data-project-id]');
                if (!item) return;
                const projectId = item.getAttribute('data-project-id');
                if (!projectId) return;
                
                // Load project data and display in split view
                loadProjectFromDatabase(projectId);
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

    // Fetch user's projects and render in sidebar
    function fetchAndRenderProjects() {
        const chatList = document.getElementById('chatList');
        if (!chatList) return;
        // Temporary loading state
        chatList.innerHTML = '<li>Loading projects...</li>';

        fetch('/api/projects', { method: 'GET' })
            .then(async (resp) => {
                if (!resp.ok) {
                    const data = await resp.json().catch(() => ({}));
                    const message = data && data.error ? data.error : `HTTP ${resp.status}`;
                    throw new Error(message);
                }
                return resp.json();
            })
            .then((data) => {
                if (!data || !data.success || !Array.isArray(data.projects)) {
                    chatList.innerHTML = '<li>Failed to load projects.</li>';
                    return;
                }
                if (data.projects.length === 0) {
                    chatList.innerHTML = '<li>No projects yet.</li>';
                    return;
                }
                // Render list
                chatList.innerHTML = '';
                data.projects.forEach((p) => {
                    const li = document.createElement('li');
                    li.setAttribute('data-project-id', p._id || p.id || '');
                    li.style.cursor = 'pointer';
                    li.innerHTML = `
                        <div style="display:flex; align-items:center; gap:0.5rem; width:100%;">
                            <i class="fas fa-folder"></i>
                            <div style="display:flex; flex-direction:column; flex:1;">
                                <span style="font-weight:600;">${escapeHtml(p.name || 'Untitled Project')}</span>
                                <span style="font-size:0.8rem; opacity:0.8;">${formatDate(p.updatedAt || p.createdAt)}</span>
                            </div>
                            <button class="delete-project-btn" data-project-id="${p._id || p.id || ''}" title="Delete Project">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    chatList.appendChild(li);
                });
            })
            .catch((err) => {
                console.error('Failed to fetch projects:', err);
                chatList.innerHTML = `<li>Failed to load projects: ${escapeHtml(String(err && err.message || err))}</li>`;
            });
    }

    function formatDate(dateStr) {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString();
        } catch {
            return '';
        }
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

    // Function to load project data from database
    async function loadProjectFromDatabase(projectId) {
        try {
            // Highlight the clicked project item
            const projectItems = document.querySelectorAll('[data-project-id]');
            projectItems.forEach(item => {
                if (item.getAttribute('data-project-id') === projectId) {
                    item.classList.add('loading');
                    item.style.opacity = '0.6';
                } else {
                    item.classList.remove('active', 'loading');
                    item.style.opacity = '1';
                }
            });

            // Show loading state
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="chat-message chat-message-info"><div class="message-content"><span class="message-text">Loading project...</span></div></div>';
            }

            // Fetch project data from database
            const response = await fetch(`/api/project-data/${projectId}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load project');
            }

            const projectStructure = data.projectStructure;
            
            // Activate split view if not already active
            activateSplitView();
            
            // Clear chat messages and load project chats
            clearChatMessages();
            if (projectStructure.chats && projectStructure.chats.length > 0) {
                projectStructure.chats.forEach(chat => {
                    addChatMessage(chat.content, chat.role === 'user' ? 'user' : 'agent');
                });
            } else {
                addChatMessage(`Loaded project: ${projectStructure.projectInfo.name}`, 'info');
            }

            // Initialize virtual file system with project files
            if (projectStructure.files && projectStructure.files.length > 0) {
                try {
                    if (window.initializeProject) {
                        window.initializeProject(projectId, projectStructure.files);
                    }
                } catch (e) {
                    console.warn('initializeProject failed:', e);
                }
            } else {
                addChatMessage('No files found in this project.', 'info');
            }

            // Update project info in the interface if needed
            updateProjectInfo(projectStructure.projectInfo);

            // Mark project as active and remove loading state
            projectItems.forEach(item => {
                if (item.getAttribute('data-project-id') === projectId) {
                    item.classList.remove('loading');
                    item.classList.add('active');
                    item.style.opacity = '1';
                }
            });

            // Close sidebar after loading
            const chatSidebar = document.getElementById('chatSidebar');
            if (chatSidebar) {
                chatSidebar.classList.remove('sidebar-visible');
                chatSidebar.classList.add('sidebar-hidden');
            }

            console.log('✅ Project loaded successfully:', projectStructure.projectInfo.name);

        } catch (error) {
            console.error('Failed to load project:', error);
            clearChatMessages();
            addChatMessage(`Error loading project: ${error.message}`, 'error');
            
            // Remove loading state on error
            const projectItems = document.querySelectorAll('[data-project-id]');
            projectItems.forEach(item => {
                if (item.getAttribute('data-project-id') === projectId) {
                    item.classList.remove('loading');
                    item.style.opacity = '1';
                }
            });
        }
    }

    // Function to update project info in the interface
    function updateProjectInfo(projectInfo) {
        // Update any project info displays if they exist
        const projectTitle = document.querySelector('.project-title');
        if (projectTitle) {
            projectTitle.textContent = projectInfo.name;
        }

        const projectDescription = document.querySelector('.project-description');
        if (projectDescription) {
            projectDescription.textContent = projectInfo.description || 'No description';
        }

        // Store current project info for reference
        window.currentProject = projectInfo;
    }

    // Function to reset interface to dashboard view
    function resetToDashboard() {
        const dashboardHeader = document.getElementById('dashboardHeader');
        const splitContainer = document.getElementById('splitContainer');
        const chatMessages = document.getElementById('chatMessages');
        const promptInput = document.getElementById('promptInput');
        const promptInputSplit = document.getElementById('promptInputSplit');
        
        // Show dashboard header
        if (dashboardHeader) {
            dashboardHeader.style.display = 'flex';
        }
        
        // Hide split container
        if (splitContainer) {
            splitContainer.classList.remove('active');
        }
        
        // Clear chat messages
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // Clear prompt inputs
        if (promptInput) {
            promptInput.value = '';
        }
        if (promptInputSplit) {
            promptInputSplit.value = '';
        }
        
        // Reset active project in sidebar
        const projectItems = document.querySelectorAll('[data-project-id]');
        projectItems.forEach(item => {
            item.classList.remove('active', 'loading');
            item.style.opacity = '1';
        });
        
        // Reset current project
        window.currentProject = null;
        if (window.currentProjectId) {
            window.currentProjectId = null;
        }
        
        // Reset file system if available
        if (window.currentFiles) {
            window.currentFiles = {};
        }
        
        // Focus on main prompt input
        if (promptInput) {
            promptInput.focus();
        }
        
        console.log('✅ Dashboard reset - ready for new project');
    }

    // Function to delete a project with confirmation
    async function deleteProject(projectId) {
        try {
            // Find the project name for confirmation dialog
            const projectItem = document.querySelector(`[data-project-id="${projectId}"]`);
            const projectName = projectItem ? projectItem.querySelector('span').textContent : 'this project';
            
            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to delete "${projectName}"?\n\nThis action cannot be undone and will permanently remove the project and all its files.`);
            
            if (!confirmed) {
                return;
            }
            
            // Show loading state on the delete button
            const deleteBtn = document.querySelector(`.delete-project-btn[data-project-id="${projectId}"]`);
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                deleteBtn.disabled = true;
            }
            
            // Send delete request to server
            const response = await fetch(`/api/project/${projectId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remove the project item from the sidebar
                if (projectItem) {
                    projectItem.remove();
                }
                
                // If this was the currently loaded project, reset to dashboard
                if (window.currentProjectId === projectId) {
                    resetToDashboard();
                }
                
                // Check if there are no projects left
                const remainingProjects = document.querySelectorAll('[data-project-id]');
                const chatList = document.getElementById('chatList');
                if (remainingProjects.length === 0 && chatList) {
                    chatList.innerHTML = '<li>No projects yet.</li>';
                }
                
                console.log('✅ Project deleted successfully');
                
                // Show success message
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    addChatMessage(`✅ Project "${projectName}" has been deleted successfully.`, 'success');
                }
            } else {
                throw new Error(data.error || 'Failed to delete project');
            }
            
        } catch (error) {
            console.error('Failed to delete project:', error);
            
            // Reset delete button
            const deleteBtn = document.querySelector(`.delete-project-btn[data-project-id="${projectId}"]`);
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.disabled = false;
            }
            
            // Show error message
            alert(`Failed to delete project: ${error.message}`);
        }
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
    - Database project loading
    - New chat button for fresh start
    - Project deletion with confirmation
    
    Start building by entering a prompt in the input field, clicking on an existing project, or use the + button to start fresh!
    `);
});