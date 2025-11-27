import { Link } from 'react-router-dom'

const DashboardNavbar = ({ onMenuClick, onApiKeyClick }) => {
  return (
    <nav className="navbar dashboard-nav">
      <div className="nav-container">
        <div className="options">
          <div className="nav-logo">
            <h3>
              <Link to="/" style={{textDecoration: 'none', color: 'inherit'}}>
                GenForge
              </Link>
            </h3>
          </div>
          <div className="nav-chats" onClick={onMenuClick} style={{cursor: 'pointer', marginLeft: '1rem', position: 'relative', top: '2.5px'}}>
            <i className="fas fa-bars fa-lg"></i>
          </div>
        </div>
        <div className="nav-api-key" onClick={onApiKeyClick} style={{cursor: 'pointer', marginLeft: '1rem', position: 'relative', top: '2.5px'}}>
          <i className="fas fa-key fa-lg"></i>
        </div>
      </div>
    </nav>
  )
}

export default DashboardNavbar
