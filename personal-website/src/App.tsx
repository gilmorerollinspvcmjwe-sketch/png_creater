import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import Navbar from './components/common/Navbar'
import Footer from './components/common/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Resume from './pages/Resume'
import AIKnowledge from './pages/AIKnowledge'
import AICopilot from './pages/AICopilot'
import VibeCoding from './pages/VibeCoding'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Prompts from './pages/Prompts'
import Contact from './pages/Contact'

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/knowledge" element={<AIKnowledge />} />
            <Route path="/copilot" element={<AICopilot />} />
            <Route path="/vibe-coding" element={<VibeCoding />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}

export default App