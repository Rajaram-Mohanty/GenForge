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

        {/* Feature 2 - Instant Download & Deploy */}
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
              <div className="deploy-options">
                <div className="deploy-option">
                  <i className="fab fa-github"></i>
                  <span>GitHub</span>
                </div>
                <div className="deploy-option">
                  <i className="fas fa-cloud"></i>
                  <span>Vercel</span>
                </div>
                <div className="deploy-option">
                  <i className="fab fa-aws"></i>
                  <span>AWS</span>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-content">
            <div className="feature-icon">
              <i className="fas fa-rocket"></i>
            </div>
            <h3>Instant Download & Deploy</h3>
            <p>
              Get your complete project structure instantly. Download as a ZIP file or deploy 
              directly to popular platforms like Vercel, Netlify, or AWS. No complex setup 
              required - just click and deploy.
            </p>
            <div className="feature-highlights">
              <span className="highlight">One-Click Deploy</span>
              <span className="highlight">Multiple Platforms</span>
              <span className="highlight">Zero Configuration</span>
            </div>
          </div>
        </div>

        {/* Feature 3 - Smart Project Templates */}
        <div className="feature-item feature-left">
          <div className="feature-content">
            <div className="feature-icon">
              <i className="fas fa-layer-group"></i>
            </div>
            <h3>Smart Project Templates</h3>
            <p>
              Choose from a growing library of production-ready templates or let our AI 
              create custom architectures based on your specific needs. From simple landing 
              pages to complex full-stack applications.
            </p>
            <div className="feature-highlights">
              <span className="highlight">50+ Templates</span>
              <span className="highlight">Custom Architecture</span>
              <span className="highlight">Full-Stack Ready</span>
            </div>
          </div>
          <div className="feature-visual">
            <div className="templates-demo">
              <div className="template-grid">
                <div className="template-card">
                  <i className="fas fa-shopping-cart"></i>
                  <span>E-commerce</span>
                </div>
                <div className="template-card active">
                  <i className="fas fa-blog"></i>
                  <span>Blog</span>
                </div>
                <div className="template-card">
                  <i className="fas fa-chart-bar"></i>
                  <span>Dashboard</span>
                </div>
                <div className="template-card">
                  <i className="fas fa-gamepad"></i>
                  <span>Game</span>
                </div>
              </div>
              <div className="template-preview">
                <div className="preview-header">Blog Template</div>
                <div className="preview-content">
                  <div className="preview-line"></div>
                  <div className="preview-line short"></div>
                  <div className="preview-line"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
