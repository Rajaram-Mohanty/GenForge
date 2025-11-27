import { useState, useEffect, useRef } from 'react'
import { apiService } from '../services/apiService'

const ApiKeyModal = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // Handle click outside to close
    const handleClickOutside = (e) => {
      if (e.target.id === 'apiKeyModal') {
        handleClose()
      }
    }

    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('click', handleClickOutside)
      // Focus input when modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!apiKey.trim()) {
      alert('Please enter a valid API key')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await apiService.updateApiKey(apiKey.trim())
      if (result.success) {
        alert('API key updated successfully!')
        handleClose()
      } else {
        setError(result.error || 'Failed to update API key')
      }
    } catch (error) {
      console.error('Error updating API key:', error)
      setError(error.message || 'Failed to update API key. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setApiKey('')
    setError('')
    setSuccess('')
    onClose()
  }

  return (
    <div 
      id="apiKeyModal" 
      className="modal"
      style={{ display: isOpen ? 'block' : 'none' }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3>Update API Key</h3>
          <span className="close" id="closeApiKeyModal" onClick={handleClose}>&times;</span>
        </div>
        <div className="modal-body">
          <p>Please enter your new Gemini API key:</p>
          <input 
            type="text" 
            id="apiKeyInput" 
            placeholder="Enter your API key here..." 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            ref={inputRef}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading && apiKey.trim()) {
                handleSubmit(e)
              }
            }}
          />
          
          {error && (
            <div className="error-message" style={{ 
              color: '#ef4444', 
              marginBottom: '1rem',
              padding: '0.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '0.25rem',
              fontSize: '0.9rem'
            }}>
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}
          
          {success && (
            <div className="success-message" style={{ 
              color: '#10b981', 
              marginBottom: '1rem',
              padding: '0.5rem',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '0.25rem',
              fontSize: '0.9rem'
            }}>
              <i className="fas fa-check-circle"></i> {success}
            </div>
          )}
          
          <div className="modal-actions">
            <button 
              id="updateApiKeyBtn" 
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || !apiKey.trim()}
            >
              {loading ? 'Updating...' : 'Update API Key'}
            </button>
            <button 
              id="cancelApiKeyBtn" 
              className="btn btn-outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiKeyModal
