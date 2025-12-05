import { useState, useEffect, useRef } from 'react'
import { apiService } from '../services/apiService'
import { useAuth } from '../contexts/AuthContext'

const ApiKeyModal = ({ isOpen, onClose, mode = 'update', onApiKeySaved }) => {
  const { checkAuthStatus } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // Handle click outside to close (only in update mode, not add mode)
    const handleClickOutside = (e) => {
      if (e.target.id === 'apiKeyModal' && mode !== 'add') {
        handleClose()
      }
    }

    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Only allow closing by clicking outside in update mode
      if (mode !== 'add') {
        document.addEventListener('click', handleClickOutside)
      }
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
      if (mode !== 'add') {
        document.removeEventListener('click', handleClickOutside)
      }
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, mode])

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
        // Refresh user data to update hasApiKey status
        if (checkAuthStatus) {
          await checkAuthStatus()
        }
        // Notify parent component that API key was saved
        if (onApiKeySaved) {
          onApiKeySaved()
        }
        alert(mode === 'add' ? 'API key saved successfully!' : 'API key updated successfully!')
        // Clear form and close modal - bypass handleClose check since API key is now saved
        setApiKey('')
        setError('')
        setSuccess('')
        onClose()
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
    // In "add" mode, prevent closing until API key is saved
    if (mode === 'add') {
      return
    }
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
          <h3>{mode === 'add' ? 'Add API Key' : 'Update API Key'}</h3>
          {/* Only show close button in update mode, not in add mode */}
          {mode !== 'add' && (
            <span className="close" id="closeApiKeyModal" onClick={handleClose}>&times;</span>
          )}
        </div>
        <div className="modal-body">
          <p>
            {mode === 'add'
              ? 'Please add your Gemini API key to start generating projects:'
              : 'Please enter your new Gemini API key:'}
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <a
              href="https://aistudio.google.com/api-keys?_gl=1*1ped2n0*_ga*MTIzMDQ4MjIwMS4xNzY0MzExNzAw*_ga_P1DBVKWT6V*czE3NjQ2OTc5MTEkbzUkZzAkdDE3NjQ2OTc5MTEkajYwJGwwJGgzMzQyNzM3NzE"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                padding: '0.4rem 0.8rem',
                textDecoration: 'none',
                color: 'var(--primary-color)',
                borderColor: 'var(--primary-color)'
              }}
            >
              <i className="fas fa-external-link-alt"></i> Get Gemini Key
            </a>
          </div>
          <div className="input-group" style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <input
              type={showPassword ? "text" : "password"}
              id="apiKeyInput"
              placeholder="Enter your API key here..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              ref={inputRef}
              style={{ width: '100%', paddingRight: '40px', marginBottom: 0 }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading && apiKey.trim()) {
                  handleSubmit(e)
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

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
              {loading
                ? (mode === 'add' ? 'Saving...' : 'Updating...')
                : (mode === 'add' ? 'Save API Key' : 'Update API Key')}
            </button>
            {mode !== 'add' && (
              <button
                id="cancelApiKeyBtn"
                className="btn btn-outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div >
  )
}

export default ApiKeyModal
