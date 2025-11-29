import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthForm from '../components/AuthForm'

const LoginPage = () => {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (formData) => {
    setLoading(true)
    setError('')
    
    try {
      const result = await login(formData.email, formData.password)
      if (result.success) {
        // If user doesn't have an API key, show the Add API Key modal
        if (!result.hasApiKey) {
          navigate('/dashboard', { state: { showAddApiKey: true } })
        } else {
          navigate('/dashboard')
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

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="bg-gradient-1"></div>
        <div className="bg-gradient-2"></div>
        <div className="bg-gradient-3"></div>
      </div>
      
      <div className="auth-content">
        <div className="auth-header">
          <Link to="/" className="back-home">
            <i className="fas fa-arrow-left"></i>
            Back to Home
          </Link>
        </div>
        
        <div className="auth-card">
          <div className="auth-logo">
            <h1><Link to="/" style={{textDecoration: 'none', color: 'inherit'}}>GenForge</Link></h1>
            <p>AI-Powered Development Platform</p>
          </div>
          
          <AuthForm
            mode="login"
            onSubmit={handleSubmit}
            error={error}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default LoginPage
