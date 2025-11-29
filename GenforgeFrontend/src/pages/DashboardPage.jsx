import { useEffect, useState } from 'react'
import '../styles/dashboard.css'
import DashboardNavbar from '../components/DashboardNavbar'
import ProjectSidebar from '../components/ProjectSidebar'
import ApiKeyModal from '../components/ApiKeyModal'
import ErrorModal from '../components/ErrorModal'
import SplitContainer from '../components/SplitContainer'
import { useProject } from '../contexts/ProjectContext'

const DashboardPage = () => {
  const {
    projects,
    currentProject,
    loading,
    fetchProjects,
    createProject,
    fetchProject,
    setCurrentProject
  } = useProject()

  const [showSidebar, setShowSidebar] = useState(false)
  const [showApiModal, setShowApiModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [prompt, setPrompt] = useState('')
  const [creating, setCreating] = useState(false)
  const [showSplitView, setShowSplitView] = useState(false)
  const [tempMessages, setTempMessages] = useState([])

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (currentProject) {
      setTempMessages([])
      setShowSplitView(true)
    }
  }, [currentProject])

  const handleCreateProject = async (value) => {
    const promptValue = (value ?? prompt).trim()
    if (!promptValue) return { success: false, error: 'Prompt is required' }

    // Immediately show split view with smooth transition (like EJS version)
    setShowSplitView(true)
    setCreating(true)
    setTempMessages([
      {
        role: 'user',
        content: `🚀 Starting to build your application: "${promptValue}"`,
        timestamp: new Date()
      },
      {
        role: 'agent',
        content: '⏳ Generating your application...',
        timestamp: new Date()
      }
    ])
    setPrompt('')

    try {
      const result = await createProject(promptValue)
      if (result.success) {
        // createProject already sets currentProject, but ensure it's loaded
        if (result.project && result.project._id) {
          setShowSidebar(false)
          setCreating(false)
          setTempMessages([])
          return { success: true, project: result.project }
        }
      } else {
        // Handle API errors - hide split view on error
        if (result.error) {
          if (result.error.includes('API_QUOTA_EXCEEDED') || 
              result.error.includes('INVALID_API_KEY') || 
              result.error.includes('API_ERROR')) {
            setErrorMessage(result.error)
            setShowErrorModal(true)
            setShowSplitView(false) // Hide split view on error
            setTempMessages([])
          }
        }
      }
      setCreating(false)
      return result
    } catch (error) {
      console.error('Error creating project:', error)
      const errorMsg = error.message || 'Failed to create project'
      if (errorMsg.includes('API_QUOTA_EXCEEDED') || 
          errorMsg.includes('INVALID_API_KEY') || 
          errorMsg.includes('API_ERROR')) {
        setErrorMessage(errorMsg)
        setShowErrorModal(true)
      }
      setShowSplitView(false) // Hide split view on error
      setTempMessages([])
      setCreating(false)
      return { success: false, error: errorMsg }
    }
  }

  const handleSelectProject = async (project) => {
    // Don't reload if already selected
    if (currentProject && currentProject._id === project._id) {
      setShowSidebar(false)
      return
    }
    
    try {
      const res = await fetchProject(project._id)
      if (res.success) {
        setShowSidebar(false)
      } else {
        console.error('Failed to load project:', res.error)
        alert(`Failed to load project: ${res.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error loading project:', error)
      alert(`Error loading project: ${error.message || 'Unknown error'}`)
    }
  }

  const handleNewProject = () => {
    setCurrentProject(null)
    setPrompt('')
    setTempMessages([])
    setShowSplitView(false) // Reset split view when starting new project
  }

  return (
    <div className="dashboard-root">
      <DashboardNavbar 
        onMenuClick={() => setShowSidebar(true)} 
        onApiKeyClick={() => setShowApiModal(true)} 
      />

      <ProjectSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        projects={projects}
        currentProject={currentProject}
        onProjectSelect={handleSelectProject}
        onNewProject={handleNewProject}
        loading={loading}
      />

      <ApiKeyModal isOpen={showApiModal} onClose={() => setShowApiModal(false)} />
      
      <ErrorModal 
        isOpen={showErrorModal} 
        error={errorMessage}
        onClose={() => {
          setShowErrorModal(false)
          setErrorMessage('')
        }}
        onUpdateApiKey={() => {
          setShowErrorModal(false)
          setShowApiModal(true)
        }}
      />

      <div className="dashboard-container" id="dashboardContainer">
        <div 
          className="dashboard-header" 
          id="dashboardHeader"
          style={{ display: (!currentProject && !showSplitView) ? 'flex' : 'none' }}
        >
          <h1>Build amazing applications with AI assistance</h1>
          <div className="prompt-section" id="promptSection">
            <div className="prompt-input-container">
              <input
                type="text"
                id="promptInput"
                className="prompt-input-field"
                placeholder="Enter your application prompt here..."
                maxLength="500"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={creating}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !creating && prompt.trim()) {
                    handleCreateProject()
                  }
                }}
              />
              <button
                type="button"
                id="submitPrompt"
                className="btn btn-primary prompt-submit-btn"
                onClick={() => handleCreateProject()}
                disabled={creating || !prompt.trim()}
              >
                <i className="fas fa-rocket"></i>
                {creating ? 'Building...' : 'Build App'}
              </button>
            </div>
            <div className="prompt-examples">
              <p>Try: "Create a todo app with React" or "Build a weather dashboard"</p>
            </div>
          </div>
        </div>
        
        {(currentProject || showSplitView) && (
          <SplitContainer 
            currentProject={currentProject}
            onProjectCreate={handleCreateProject}
            tempMessages={tempMessages}
            isGenerating={!currentProject && creating}
            isActive={showSplitView || !!currentProject}
          />
        )}
      </div>
    </div>
  )
}

export default DashboardPage
