import { useState } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'

const ProjectSidebar = ({ isOpen, onClose, projects, currentProject, onProjectSelect, onNewProject, loading }) => {
  const { deleteProject } = useProject()
  const { logout } = useAuth()
  const [deletingId, setDeletingId] = useState(null)

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this project?')) {
      setDeletingId(projectId)
      try {
        await deleteProject(projectId)
        if (currentProject && currentProject._id === projectId) {
          onNewProject()
        }
      } catch (error) {
        console.error('Failed to delete project:', error)
      } finally {
        setDeletingId(null)
      }
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div 
      id="chatSidebar" 
      className={isOpen ? 'sidebar-visible' : 'sidebar-hidden'}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '20%',
        height: '100%',
        background: '#1e293b',
        color: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
        zIndex: 1000,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h3><i className="fas fa-folder-open"></i> Your Projects</h3>
          <div className="sidebar-header-actions">
            <button 
              id="newChatBtn" 
              className="new-chat-btn" 
              title="Start New Chat"
              onClick={onNewProject}
            >
              <i className="fas fa-plus"></i>
            </button>
            <button id="closeSidebar" className="sidebar-close-btn" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <ul id="chatList">
          {loading ? (
            <li className="loading">
              <i className="fas fa-spinner fa-spin"></i>
              Loading projects...
            </li>
          ) : projects.length === 0 ? (
            <li>No projects yet.</li>
          ) : (
            projects.map((project) => (
              <li
                key={project._id}
                className={currentProject?._id === project._id ? 'active' : ''}
                onClick={() => onProjectSelect(project)}
                style={{
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                    {project.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button 
                  className="delete-project-btn"
                  onClick={(e) => handleDeleteProject(project._id, e)}
                  disabled={deletingId === project._id}
                  title="Delete Project"
                >
                  {deletingId === project._id ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-trash"></i>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
      
      <div className="nav-menu">
        <button 
          type="button" 
          className="btn btn-outline" 
          onClick={async () => {
            await handleLogout()
            window.location.href = '/'
          }}
        >
          <i className="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </div>
    </div>
  )
}

export default ProjectSidebar
