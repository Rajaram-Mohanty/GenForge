import { useState } from 'react'
import { Link } from 'react-router-dom'

const AuthForm = ({ mode, onSubmit, error, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    remember: false
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }


  return (
    <div className="auth-form-container">
      <div className="auth-tabs">
        <Link 
          to="/login" 
          className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
        >
          <i className="fas fa-sign-in-alt"></i>
          Login
        </Link>
        <Link 
          to="/signup" 
          className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
        >
          <i className="fas fa-user-plus"></i>
          Sign Up
        </Link>
      </div>
      
      {error && (
        <div className="auth-error">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="auth-form">
        {mode === 'signup' && (
          <div className="form-group">
            <label htmlFor="name">
              <i className="fas fa-user"></i>
              Full Name
            </label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              value={formData.name}
              onChange={handleChange}
              required 
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="email">
            <i className="fas fa-envelope"></i>
            Email Address
          </label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            value={formData.email}
            onChange={handleChange}
            required 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">
            <i className="fas fa-lock"></i>
            Password
          </label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            value={formData.password}
            onChange={handleChange}
            required 
            minLength={mode === 'signup' ? 6 : undefined}
          />
        </div>
        
        {mode === 'login' && (
          <div className="form-options">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                name="remember" 
                checked={formData.remember}
                onChange={handleChange}
              />
              <span className="checkmark"></span>
              Remember me
            </label>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>
        )}
        
        <button 
          type="submit" 
          className="auth-submit"
          disabled={loading}
        >
          <i className={`fas fa-${mode === 'login' ? 'sign-in-alt' : 'user-plus'}`}></i>
          {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
        </button>
      </form>
      
      <div className="auth-divider">
        <span>or continue with</span>
      </div>
      
      <div className="social-auth">
        <button className="social-btn google">
          <i className="fab fa-google"></i>
          Google
        </button>
        <button className="social-btn github">
          <i className="fab fa-github"></i>
          GitHub
        </button>
      </div>
      
      <div className="auth-footer">
        {mode === 'login' ? (
          <p>Don't have an account? <Link to="/signup" className="auth-switch">Sign up for free</Link></p>
        ) : (
          <p>Already have an account? <Link to="/login" className="auth-switch">Sign in</Link></p>
        )}
      </div>

    </div>
  )
}

export default AuthForm
