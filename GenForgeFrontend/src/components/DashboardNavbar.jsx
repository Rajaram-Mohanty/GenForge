import { Link } from 'react-router-dom'

const DashboardNavbar = ({ onMenuClick, onApiKeyClick }) => {
  return (
    <nav className="navbar dashboard-nav">
      <div className="nav-container">
        <div className="options">
          <div className="nav-logo">
            <h3>
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                Gen<span style={{ color: '#f97316' }}>Forge</span>
              </Link>
            </h3>
          </div>
          <div className="nav-chats" onClick={onMenuClick} style={{ cursor: 'pointer', marginLeft: '1rem', position: 'relative', top: '2.5px' }}>
            <i className="fas fa-bars fa-lg"></i>
          </div>
        </div>
        <div
          className="nav-api-key"
          onClick={onApiKeyClick}
          style={{
            cursor: 'pointer',
            marginLeft: '1rem',
            position: 'relative',
            top: '2.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f97316',
            padding: '6px 12px',
            borderRadius: '6px',
            color: 'white',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(249, 115, 22, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ea580c'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(249, 115, 22, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f97316'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(249, 115, 22, 0.2)'
          }}
        >
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>API Key</span>
          <i className="fas fa-key" style={{ fontSize: '0.9rem' }}></i>
        </div>
      </div>
    </nav >
  )
}

export default DashboardNavbar
