import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AIScannerPage from './pages/AIScannerPage.jsx'
import MarketplacePage from './pages/MarketplacePage.jsx'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/landing-page" element={<LandingPage />} />
        <Route path="/ai-scanner" element={<AIScannerPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
      </Routes>
    </Router>
  )
}

export default App
