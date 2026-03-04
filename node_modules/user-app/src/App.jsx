import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-950 text-white">
            <h1 className="text-4xl font-bold">Smart Waste Management User App</h1>
            <Link to="/landing-page" className="rounded-lg bg-green-500 px-6 py-3 font-semibold text-neutral-950 hover:bg-green-400">
              View Landing Page
            </Link>
          </div>
        } />
        <Route path="/landing-page" element={<LandingPage />} />
      </Routes>
    </Router>
  )
}

export default App
