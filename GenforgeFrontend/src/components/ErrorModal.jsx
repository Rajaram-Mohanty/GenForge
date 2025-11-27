import { useEffect } from 'react'

const ErrorModal = ({ isOpen, error, onClose, onUpdateApiKey }) => {
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.id === 'errorModal') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  let message = 'An error occurred while processing your request.'
  
  if (error && error.includes('API_QUOTA_EXCEEDED')) {
    message = 'API quota exceeded. Please update your API key or try again later.'
  } else if (error && error.includes('INVALID_API_KEY')) {
    message = 'Invalid API key. Please update your API key.'
  } else if (error && error.includes('API_ERROR')) {
    message = error.replace('API_ERROR: ', '')
  } else if (error) {
    message = error
  }

  return (
    <div id="errorModal" className="modal" style={{ display: 'block' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Error</h3>
          <span className="close" id="closeErrorModal" onClick={onClose}>&times;</span>
        </div>
        <div className="modal-body">
          <p id="errorMessage">{message}</p>
          <div className="modal-actions">
            <button 
              id="updateApiKeyFromErrorBtn" 
              className="btn btn-primary"
              onClick={() => {
                onClose()
                onUpdateApiKey()
              }}
            >
              Update API Key
            </button>
            <button 
              id="closeErrorBtn" 
              className="btn btn-outline"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorModal

