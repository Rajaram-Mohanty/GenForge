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
    window.location.href = '/'
  }

  return (
    <div
      id="chatSidebar"
      className={`project-sidebar ${isOpen ? 'sidebar-visible' : 'sidebar-hidden'}`}
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
              >
                <div className="project-info">
                  <div className="project-name">
                    {project.name && !project.name.includes('dateOfProjectCreation')
                      ? project.name
                      : (project.description
                        ? project.description.substring(0, 50) + (project.description.length > 50 ? '...' : '')
                        : `Project ${new Date(project.createdAt).toLocaleDateString()}`)}
                  </div>
                  <div className="project-date">
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
          onClick={handleLogout}
          style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <i className="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </div>
    </div>
  )
}

export default ProjectSidebar
