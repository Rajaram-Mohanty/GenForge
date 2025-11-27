import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Loader } from 'lucide-react'
import { useProject } from '../contexts/ProjectContext'

const ChatPanel = ({ projectId, chats = [] }) => {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { addChatMessage } = useProject()
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chats])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage('')
    setIsLoading(true)

    try {
      // Add user message
      await addChatMessage(projectId, 'user', userMessage)
      
      // Here you would typically send the message to the AI and get a response
      // For now, we'll just add a placeholder response
      setTimeout(async () => {
        await addChatMessage(projectId, 'assistant', 'I understand your request. How can I help you with your project?')
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsLoading(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>AI Assistant</h3>
        <p>Ask questions about your project</p>
      </div>
      
      <div className="chat-messages">
        {chats.length === 0 ? (
          <div className="chat-empty">
            <Bot size={48} className="chat-empty-icon" />
            <p>Start a conversation with the AI assistant</p>
            <p className="chat-empty-subtitle">Ask questions about your code or request modifications</p>
          </div>
        ) : (
          chats.map((chat, index) => (
            <div key={index} className={`chat-message ${chat.role}`}>
              <div className="chat-message-avatar">
                {chat.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="chat-message-content">
                <div className="chat-message-text">
                  {chat.content}
                </div>
                <div className="chat-message-time">
                  {formatTimestamp(chat.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="chat-message assistant">
            <div className="chat-message-avatar">
              <Bot size={16} />
            </div>
            <div className="chat-message-content">
              <div className="chat-message-text">
                <Loader size={16} className="loading-spinner" />
                AI is thinking...
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="chat-input">
        <div className="chat-input-container">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about your project..."
            className="chat-input-field"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!message.trim() || isLoading}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatPanel
