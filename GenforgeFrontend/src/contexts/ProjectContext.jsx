import { createContext, useContext, useState } from 'react'
import { apiService } from '../services/apiService'

const ProjectContext = createContext()

export const useProject = () => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([])
  const [currentProject, setCurrentProject] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await apiService.getProjects()
      if (response.success) {
        setProjects(response.projects)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      // If backend is not available, just set loading to false
      // This allows the app to work in development mode
      setError(null) // Don't show error for missing backend
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (prompt) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.generateProject(prompt)
      if (response.success) {
        // After creating, fetch the full project data to get files and chats
        const projectId = response.databaseProjectId
        if (projectId) {
          // Fetch the complete project data
          const projectData = await apiService.getProjectData(projectId)
          if (projectData.success && projectData.projectStructure) {
            const projectStructure = projectData.projectStructure
            const formattedProject = {
              _id: projectStructure.id,
              name: projectStructure.projectInfo?.name || `Project ${new Date().toLocaleDateString()}`,
              description: projectStructure.projectInfo?.description || prompt,
              projectType: projectStructure.projectInfo?.projectType || 'web-app',
              status: projectStructure.projectInfo?.status || 'active',
              createdAt: projectStructure.createdAt || new Date(),
              updatedAt: projectStructure.projectInfo?.updatedAt || new Date(),
              files: projectStructure.files || [],
              chats: projectStructure.chats || []
            }
            setProjects(prev => [formattedProject, ...prev])
            setCurrentProject(formattedProject)
            return { success: true, project: formattedProject }
          }
        }
        // Fallback if project data fetch fails
        const newProject = {
          _id: response.databaseProjectId,
          name: `Project ${new Date().toLocaleDateString()}`,
          description: prompt,
          projectType: 'web-app',
          createdAt: new Date(),
          updatedAt: new Date(),
          files: [],
          chats: []
        }
        setProjects(prev => [newProject, ...prev])
        setCurrentProject(newProject)
        return { success: true, project: newProject }
      }
      return { success: false, error: response.error || response.message }
    } catch (error) {
      // Preserve error type and message for proper error handling
      const errorMessage = error.errorMessage || error.message || 'Failed to generate project'
      const errorType = error.errorType || (error.message?.includes(':') ? error.message.split(':')[0] : 'GENERATION_ERROR')
      const fullError = `${errorType}: ${errorMessage}`
      setError(fullError)
      return { success: false, error: fullError }
    } finally {
      setLoading(false)
    }
  }

  const updateProject = async (projectId, prompt) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiService.updateProjectCode(projectId, prompt)

      if (response.success) {
        // Refresh the project to get updated files
        const projectRes = await fetchProject(projectId)
        if (projectRes.success) {
          return { success: true, project: projectRes.project, message: response.message }
        }
      }

      return { success: false, error: response.error || 'Failed to update project' }
    } catch (error) {
      console.error('Update project error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const fetchProject = async (projectId) => {
    try {
      setLoading(true)
      // Use getProjectData which returns formatted project structure like EJS version
      const response = await apiService.getProjectData(projectId)
      if (response.success && response.projectStructure) {
        // Transform projectStructure to match component expectations
        const projectStructure = response.projectStructure
        const formattedProject = {
          _id: projectStructure.id,
          name: projectStructure.projectInfo?.name || 'Untitled Project',
          description: projectStructure.projectInfo?.description || projectStructure.prompt,
          projectType: projectStructure.projectInfo?.projectType || 'web-app',
          status: projectStructure.projectInfo?.status || 'active',
          createdAt: projectStructure.createdAt || new Date(),
          updatedAt: projectStructure.projectInfo?.updatedAt || new Date(),
          // Files from projectStructure
          files: projectStructure.files || [],
          // Chats from projectStructure
          chats: projectStructure.chats || []
        }
        setCurrentProject(formattedProject)
        return { success: true, project: formattedProject }
      }
      return { success: false, error: response.error || 'Failed to load project' }
    } catch (error) {
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const updateFile = async (projectId, filePath, content) => {
    try {
      const response = await apiService.updateFile(projectId, filePath, content)
      if (response.success) {
        // Update the current project's file content
        if (currentProject && currentProject._id === projectId) {
          setCurrentProject(prev => ({
            ...prev,
            files: prev.files.map(file =>
              file.path === filePath
                ? { ...file, content, lastModified: new Date() }
                : file
            )
          }))
        }
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (error) {
      setError(error.message)
      return { success: false, error: error.message }
    }
  }

  const deleteProject = async (projectId) => {
    try {
      const response = await apiService.deleteProject(projectId)
      if (response.success) {
        setProjects(prev => prev.filter(p => p._id !== projectId))
        if (currentProject && currentProject._id === projectId) {
          setCurrentProject(null)
        }
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (error) {
      setError(error.message)
      return { success: false, error: error.message }
    }
  }

  const addChatMessage = async (projectId, role, content) => {
    try {
      const response = await apiService.addChatMessage(projectId, role, content)
      if (response.success) {
        // Update the current project's chat messages
        if (currentProject && currentProject._id === projectId) {
          setCurrentProject(prev => ({
            ...prev,
            chats: [...(prev.chats || []), {
              role,
              content,
              timestamp: new Date()
            }]
          }))
        }
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (error) {
      setError(error.message)
      return { success: false, error: error.message }
    }
  }

  const value = {
    projects,
    currentProject,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    fetchProject,
    updateFile,
    deleteProject,
    addChatMessage,
    setCurrentProject,
    setError
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}
