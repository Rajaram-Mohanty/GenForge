import { useState } from 'react'
import { Download, Settings, MoreVertical } from 'lucide-react'

const ProjectHeader = ({ project }) => {
  const [showMenu, setShowMenu] = useState(false)

  const handleDownload = () => {
    // Implement download functionality
    console.log('Download project:', project.name)
  }

  const handleSettings = () => {
    // Implement settings functionality
    console.log('Open project settings')
  }

  return (
    <div className="project-header">
      <div className="project-info">
        <h2 className="project-title">
          {project.name && !project.name.includes('dateOfProjectCreation') 
            ? project.name 
            : (project.description 
                ? project.description.substring(0, 50) + (project.description.length > 50 ? '...' : '')
                : `Project ${new Date(project.createdAt).toLocaleDateString()}`)}
        </h2>
        <p className="project-description">{project.description}</p>
        <div className="project-meta">
          <span className="project-type">{project.projectType}</span>
          <span className="project-date">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <div className="project-actions">
        <button
          onClick={handleDownload}
          className="btn btn-outline btn-sm"
          title="Download project"
        >
          <Download size={16} />
          Download
        </button>
        
        <button
          onClick={handleSettings}
          className="btn btn-outline btn-sm"
          title="Project settings"
        >
          <Settings size={16} />
        </button>
        
        <div className="project-menu">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="btn btn-outline btn-sm"
            title="More options"
          >
            <MoreVertical size={16} />
          </button>
          
          {showMenu && (
            <div className="project-menu-dropdown">
              <button onClick={() => {}}>Rename Project</button>
              <button onClick={() => {}}>Duplicate Project</button>
              <button onClick={() => {}} className="danger">Delete Project</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectHeader
