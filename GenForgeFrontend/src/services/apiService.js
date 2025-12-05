import axios from 'axios'

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:8080' : ''

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth headers if needed
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Do not force redirect here; let route guards handle it
    // if (error.response?.status === 401) {
    //   window.location.href = '/login'
    // }
    return Promise.reject(error)
  }
)

export const apiService = {
  // Authentication endpoints
  login: async (email, password) => {
    try {
      const response = await api.post('/login', { email, password })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed')
    }
  },

  signup: async (name, email, password) => {
    try {
      const response = await api.post('/signup', { name, email, password })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Signup failed')
    }
  },

  logout: async () => {
    try {
      await api.post('/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }
  },

  getUser: async () => {
    try {
      const response = await api.get('/api/user')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get user')
    }
  },

  // Project endpoints
  getProjects: async () => {
    try {
      const response = await api.get('/api/projects')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch projects')
    }
  },

  getProject: async (projectId) => {
    try {
      const response = await api.get(`/api/project/${projectId}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch project')
    }
  },

  getProjectData: async (projectId) => {
    try {
      const response = await api.get(`/api/project-data/${projectId}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch project data')
    }
  },

  generateProject: async (prompt) => {
    try {
      const response = await api.post(`/api/generate-prompt?prompt=${encodeURIComponent(prompt)}`)
      return response.data
    } catch (error) {
      // Extract error information from response
      const errorData = error.response?.data
      const errorMessage = errorData?.message || errorData?.error || 'Failed to generate project'
      const errorType = errorData?.error || 'GENERATION_ERROR'

      // Create error with both type and message for proper handling
      const fullError = new Error(`${errorType}: ${errorMessage}`)
      fullError.errorType = errorType
      fullError.errorMessage = errorMessage
      throw fullError
    }
  },

  updateProjectCode: async (projectId, prompt) => {
    try {
      const response = await api.post('/api/chat/update-code', {
        projectId,
        prompt
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update project code')
    }
  },

  updateFile: async (projectId, filePath, content) => {
    try {
      const response = await api.post(`/api/update-file/${projectId}`, {
        filePath,
        content
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update file')
    }
  },

  downloadProjectZip: async (projectId) => {
    try {
      const response = await api.get(`/api/project/${projectId}/download`, {
        responseType: 'blob'
      })
      return response
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to download project')
    }
  },

  deleteProject: async (projectId) => {
    try {
      const response = await api.delete(`/api/project/${projectId}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete project')
    }
  },

  addChatMessage: async (projectId, role, content) => {
    try {
      const response = await api.post(`/api/project/${projectId}/chat`, {
        role,
        content
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to add chat message')
    }
  },

  updateApiKey: async (apiKey) => {
    try {
      const response = await api.post('/api/update-api-key', { apiKey })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update API key')
    }
  }
}
