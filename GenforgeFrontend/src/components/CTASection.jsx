import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const CTASection = () => {
  const { isAuthenticated } = useAuth()

  return (
    <section className="cta">
      <div className="container">
        <div className="cta-content">
          <h2>Ready to Transform Your Development Process?</h2>
          <p>Join thousands of developers who are building faster with AI</p>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-large">
              <i className="fas fa-arrow-right"></i>
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/signup" className="btn btn-primary btn-large">
              <i className="fas fa-arrow-right"></i>
              Start Building for Free
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

export default CTASection
