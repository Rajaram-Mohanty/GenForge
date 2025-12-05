const FeaturesSection = () => {
  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-header">
          <h2>Powerful Features for Modern Development</h2>
          <p>Everything you need to build, deploy, and scale your applications</p>
        </div>

        {/* Feature 1 - AI-Powered Code Generation */}
        <div className="feature-item feature-left">
          <div className="feature-content">
            <div className="feature-icon">
              <i className="fas fa-brain"></i>
            </div>
            <h3>AI-Powered Code Generation</h3>
            <p>
              Transform natural language descriptions into complete, production-ready applications.
              Our advanced AI understands your requirements and generates clean, efficient code
              following best practices and modern development patterns.
            </p>
            <div className="feature-highlights">
              <span className="highlight">React & Node.js</span>
              <span className="highlight">TypeScript Support</span>
              <span className="highlight">Best Practices</span>
            </div>
          </div>
          <div className="feature-visual">
            <div className="ai-demo">
              <div className="prompt-input">
                <i className="fas fa-magic"></i>
                <span>"Create a todo app with drag and drop"</span>
              </div>
              <div className="arrow-down">
                <i className="fas fa-arrow-down"></i>
              </div>
              <div className="generated-files">
                <div className="file-item">
                  <i className="fab fa-react"></i>
                  <span>TodoApp.jsx</span>
                </div>
                <div className="file-item">
                  <i className="fas fa-server"></i>
                  <span>server.js</span>
                </div>
                <div className="file-item">
                  <i className="fas fa-palette"></i>
                  <span>styles.css</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 - Instant Download */}
        <div className="feature-item feature-right">
          <div className="feature-visual">
            <div className="deploy-demo">
              <div className="download-box">
                <i className="fas fa-download"></i>
                <span>Download Project</span>
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-content">
            <div className="feature-icon">
              <i className="fas fa-rocket"></i>
            </div>
            <h3>Instant Download</h3>
            <p>
              Get your complete project structure instantly. Download as a ZIP file and start
              working on it immediately. No complex setup required - just click and download.
            </p>
            <div className="feature-highlights">
              <span className="highlight">One-Click Download</span>
              <span className="highlight">Complete Source Code</span>
              <span className="highlight">Zero Configuration</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
