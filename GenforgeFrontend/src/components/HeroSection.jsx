import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const HeroSection = () => {
  const { isAuthenticated } = useAuth()

  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            Build Applications with 
            <span className="gradient-text"> AI Power</span>
          </h1>
          <p className="hero-subtitle">
            Transform your ideas into fully functional applications using the power of AI. 
            Generate, download, and deploy complete project structures with just a prompt.
          </p>
          <div className="hero-buttons">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-large">
                <i className="fas fa-rocket"></i>
                Start Building
              </Link>
            ) : (
              <Link to="/signup" className="btn btn-primary btn-large">
                <i className="fas fa-rocket"></i>
                Get Started Free
              </Link>
            )}
            <a href="#features" className="btn btn-outline btn-large">
              <i className="fas fa-play"></i>
              Watch Demo
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-card">
            <div className="code-preview">
              <div className="code-header">
                <div className="code-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="code-title">Generated Code</span>
              </div>
              <div className="code-content">
                <div className="code-line">
                  <span className="code-keyword">const</span> 
                  <span className="code-variable"> app</span> = 
                  <span className="code-function"> express</span>();
                </div>
                <div className="code-line">
                  <span className="code-keyword">app</span>.<span className="code-function">get</span>(<span className="code-string">'/'</span>, (req, res) =&gt; &#123;
                </div>
                <div className="code-line indent">
                  res.<span className="code-function">render</span>(<span className="code-string">'index'</span>);
                </div>
                <div className="code-line">&#125;);</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
