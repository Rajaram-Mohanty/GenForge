import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import FeaturesSection from '../components/FeaturesSection'
import CTASection from '../components/CTASection'

import '../styles/home.css'
import '../styles/navbar.css'

const HomePage = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="home-page">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <CTASection />

    </div>
  )
}

export default HomePage
