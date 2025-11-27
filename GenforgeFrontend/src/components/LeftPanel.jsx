import { useState, useEffect, useRef } from 'react'

const LeftPanel = ({ currentProject, onProjectCreate, width }) => {
  const [messages, setMessages] = useState([])
  const [promptInput, setPromptInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatMessagesRef = useRef(null)

  useEffect(() => {
    if (currentProject && currentProject.chats) {
      // Transform chats to match message format
      const formattedMessages = currentProject.chats.map(chat => ({
        role: chat.role === 'assistant' ? 'agent' : chat.role, // Map assistant to agent for display
        content: chat.content || chat.message || '',
        timestamp: chat.timestamp || chat.createdAt || new Date()
      }))
      setMessages(formattedMessages)
    } else {
      setMessages([])
    }
  }, [currentProject])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmitPrompt = async () => {
    if (!promptInput.trim() || isLoading) return

    const promptValue = promptInput.trim()
    
    // Add initial user message matching EJS version
    const userMessage = {
      role: 'user',
      content: `🚀 Starting to build your application: "${promptValue}"`,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setPromptInput('')
    setIsLoading(true)

    try {
      const result = await onProjectCreate(promptValue)
      
      if (result.success) {
        // Messages from the generation are already in the project's chats array
        // They will be loaded when currentProject updates
        // Just add completion message
        const successMessage = {
          role: 'agent',
          content: '✅ Generation complete.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, successMessage])
      } else {
        const errorMessage = {
          role: 'agent',
          content: `Error: ${result.error || 'Failed to create project'}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage = {
        role: 'agent',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitPrompt()
    }
  }

  return (
    <div 
      className="left-panel" 
      id="leftPanel"
      style={{ width: `${width}%` }}
    >
      {/* Chat Messages Container */}
      <div className="chat-messages-container" id="chatMessagesContainer">
        <div className="chat-messages" id="chatMessages" ref={chatMessagesRef}>
          {messages.length === 0 ? (
            <div className="chat-message chat-message-info">
              <div className="message-content">
                <div className="message-text">
                  Welcome! Start by entering a prompt to create your application.
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index}
                className={`chat-message ${
                  message.role === 'user' ? 'chat-message-user' : 
                  message.role === 'agent' ? 'chat-message-agent' :
                  message.content.includes('Error') ? 'chat-message-error' :
                  'chat-message-success'
                }`}
              >
                <div className="message-content">
                  <div className="message-text">
                    {message.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="chat-message chat-message-info">
              <div className="message-content">
                <div className="message-text">
                  <i className="fas fa-spinner fa-spin"></i> Generating your application...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Prompt Input Section */}
      <div className="prompt-section-split" id="promptSectionSplit">
        <div className="prompt-input-container">
          <input 
            type="text" 
            id="promptInputSplit" 
            className="prompt-input-field" 
            placeholder="Enter your application prompt here..."
            maxLength="500"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button 
            type="button" 
            id="submitPromptSplit" 
            className="btn btn-primary prompt-submit-btn"
            onClick={handleSubmitPrompt}
            disabled={isLoading || !promptInput.trim()}
          >
            <i className="fas fa-rocket"></i>
            Build App
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeftPanel
