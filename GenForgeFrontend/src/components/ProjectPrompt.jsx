import { useState } from 'react'

const ProjectPrompt = ({ onSubmit, loading }) => {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (prompt.trim()) {
      const result = await onSubmit(prompt.trim())
      if (result.success) {
        setPrompt('')
      }
    }
  }

  const examplePrompts = [
    "Create a todo app with React",
    "Build a weather dashboard",
    "Make a calculator application",
    "Create a blog website",
    "Build a chat application"
  ]

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Build amazing applications with AI assistance</h1>
        
        <div className="prompt-section">
          <form onSubmit={handleSubmit} className="prompt-input-container">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="prompt-input-field"
              placeholder="Enter your application prompt here..."
              maxLength={500}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary prompt-submit-btn"
              disabled={loading || !prompt.trim()}
            >
              <i className="fas fa-rocket"></i>
              {loading ? 'Building...' : 'Build App'}
            </button>
          </form>
          
          <div className="prompt-examples">
            <p>Try: "{examplePrompts[Math.floor(Math.random() * examplePrompts.length)]}"</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectPrompt
