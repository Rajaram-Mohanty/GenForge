import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <h2><Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>Gen<span style={{ color: '#f97316' }}>Forge</span></Link></h2>
        </div>
        <div className="nav-menu">
          {isAuthenticated ? (
            <>
              <span className="nav-user">Welcome, {user?.username}!</span>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <button onClick={handleLogout} className="btn btn-outline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/signup" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
