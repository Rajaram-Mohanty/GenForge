import { useState, useEffect } from 'react'
import { useProject } from '../contexts/ProjectContext'
import FileExplorer from './FileExplorer'
import CodeEditor from './CodeEditor'
import ChatPanel from './ChatPanel'
import ProjectHeader from './ProjectHeader'

const ProjectWorkspace = ({ project }) => {
  const { fetchProject, updateFile } = useProject()
  const [selectedFile, setSelectedFile] = useState(null)
  const [projectData, setProjectData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProjectData()
  }, [project._id])

  const loadProjectData = async () => {
    try {
      setLoading(true)
      const result = await fetchProject(project._id)
      if (result.success) {
        setProjectData(result.project)
        // Select the first file if available
        if (result.project.files && result.project.files.length > 0) {
          setSelectedFile(result.project.files[0])
        }
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  const handleFileUpdate = async (filePath, content) => {
    try {
      const result = await updateFile(project._id, filePath, content)
      if (result.success) {
        // Update local state
        setProjectData(prev => ({
          ...prev,
          files: prev.files.map(file => 
            file.path === filePath 
              ? { ...file, content, lastModified: new Date() }
              : file
          )
        }))
        
        // Update selected file if it's the one being edited
        if (selectedFile && selectedFile.path === filePath) {
          setSelectedFile(prev => ({ ...prev, content }))
        }
      }
    } catch (error) {
      console.error('Failed to update file:', error)
    }
  }

  if (loading) {
    return (
      <div className="workspace-loading">
        <div className="loading-spinner"></div>
        <p>Loading project...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="workspace-error">
        <h3>Error loading project</h3>
        <p>{error}</p>
        <button onClick={loadProjectData} className="btn btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="split-container">
      <div className="left-panel">
        <FileExplorer
          files={projectData?.files || []}
          directories={projectData?.directories || []}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
        />
      </div>
      
      <div className="panel-divider">
        <div className="divider-handle">
          <div className="divider-line"></div>
          <div className="divider-grip">
            <i className="fas fa-grip-vertical"></i>
          </div>
        </div>
      </div>
      
      <div className="right-panel">
        <ProjectHeader project={project} />
        <CodeEditor
          file={selectedFile}
          onFileUpdate={handleFileUpdate}
        />
        <ChatPanel
          projectId={project._id}
          chats={projectData?.chats || []}
        />
      </div>
    </div>
  )
}

export default ProjectWorkspace
