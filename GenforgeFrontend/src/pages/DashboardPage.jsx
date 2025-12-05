import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import '../styles/dashboard.css'
import DashboardNavbar from '../components/DashboardNavbar'
import ProjectSidebar from '../components/ProjectSidebar'
import ApiKeyModal from '../components/ApiKeyModal'
import ErrorModal from '../components/ErrorModal'
import SplitContainer from '../components/SplitContainer'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'

const DashboardPage = () => {
  const {
    projects,
    currentProject,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    fetchProject,
    setCurrentProject
  } = useProject()
  const { user, loading: authLoading } = useAuth()

  const [showSidebar, setShowSidebar] = useState(false)
  const [showApiModal, setShowApiModal] = useState(false)
  const [apiModalMode, setApiModalMode] = useState('update')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [prompt, setPrompt] = useState('')
  const [creating, setCreating] = useState(false)
  const [showSplitView, setShowSplitView] = useState(false)
  const [tempMessages, setTempMessages] = useState([])
  const [hasCheckedApiKey, setHasCheckedApiKey] = useState(false)
  const location = useLocation()

  useEffect(() => {
    fetchProjects()
  }, [])

  // Check if user has API key on mount or when user changes
  // Check if user has API key on mount or when user changes
  useEffect(() => {
    // Wait for user data to be loaded
    if (authLoading) return

    // If navigated from signup/login with explicit instruction to show modal
    if (location.state?.showAddApiKey && !hasCheckedApiKey) {
      setApiModalMode('add')
      setShowApiModal(true)
      setHasCheckedApiKey(true)
      return
    }

    if (user) {
      // If user doesn't have API key and modal is not already shown, show it
      if (!user.hasApiKey && !showApiModal && !hasCheckedApiKey) {
        setApiModalMode('add')
        setShowApiModal(true)
        setHasCheckedApiKey(true)
      } else if (user.hasApiKey && showApiModal && apiModalMode === 'add') {
        // If user now has API key and we're in add mode, close the modal
        setShowApiModal(false)
      }
    }
  }, [user, authLoading, location.state, showApiModal, apiModalMode, hasCheckedApiKey])



  useEffect(() => {
    if (currentProject) {
      setTempMessages([])
      setShowSplitView(true)
    }
  }, [currentProject])

  const handleCreateProject = async (value) => {
    const promptValue = (value ?? prompt).trim()
    if (!promptValue) return { success: false, error: 'Prompt is required' }

    // Check if user has API key before proceeding
    if (!user?.hasApiKey) {
      // Show "Add API Key" modal if user doesn't have one
      setApiModalMode('add')
      setShowApiModal(true)
      return { success: false, error: 'API key required' }
    }

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
        // Stop generating message immediately on error
        setCreating(false)
        setShowSplitView(false)
        setTempMessages([])

        // Handle API errors
        if (result.error) {
          if (result.error.includes('API_QUOTA_EXCEEDED') ||
            result.error.includes('INVALID_API_KEY') ||
            result.error.includes('API_ERROR') ||
            result.error.includes('MISSING_API_KEY')) {
            // If missing API key, show add modal instead of error modal
            if (result.error.includes('MISSING_API_KEY')) {
              setApiModalMode('add')
              setShowApiModal(true)
            } else {
              // Extract error message (remove error type prefix if present)
              const errorMsg = result.error.includes(':')
                ? result.error.split(':').slice(1).join(':').trim()
                : result.error
              setErrorMessage(result.error) // Keep full error for error type detection
              setShowErrorModal(true)
            }
          } else {
            // Other errors
            setErrorMessage(result.error)
            setShowErrorModal(true)
          }
        }
      }
      return result
    } catch (error) {
      console.error('Error creating project:', error)
      // Stop generating message immediately on error
      setCreating(false)
      setShowSplitView(false)
      setTempMessages([])

      const errorMsg = error.message || 'Failed to create project'
      if (errorMsg.includes('API_QUOTA_EXCEEDED') ||
        errorMsg.includes('INVALID_API_KEY') ||
        errorMsg.includes('API_ERROR')) {
        setErrorMessage(errorMsg)
        setShowErrorModal(true)
      } else if (errorMsg.includes('MISSING_API_KEY')) {
        // If missing API key, show add modal
        setApiModalMode('add')
        setShowApiModal(true)
      } else {
        setErrorMessage(errorMsg)
        setShowErrorModal(true)
      }
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
        onApiKeyClick={() => {
          setApiModalMode('update')
          setShowApiModal(true)
        }}
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

      <ApiKeyModal
        isOpen={showApiModal}
        onClose={() => {
          // Always allow closing - the modal itself prevents closing in add mode until saved
          setShowApiModal(false)
        }}
        mode={apiModalMode}
        onApiKeySaved={async () => {
          // After API key is saved, refresh user data and close modal
          // The user state will be updated via checkAuthStatus in the modal
          // Force close the modal after a short delay to ensure state is updated
          setTimeout(() => {
            setShowApiModal(false)
          }, 100)
        }}
      />

      <ErrorModal
        isOpen={showErrorModal}
        error={errorMessage}
        onClose={() => {
          setShowErrorModal(false)
          setErrorMessage('')
        }}
        onUpdateApiKey={() => {
          setShowErrorModal(false)
          setApiModalMode('update')
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
              <p>Design an interactive todo application or an elegant weather dashboard</p>
            </div>
          </div>
        </div>

        {(currentProject || showSplitView) && (
          <SplitContainer
            currentProject={currentProject}
            onProjectCreate={handleCreateProject}
            onProjectUpdate={updateProject}
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
