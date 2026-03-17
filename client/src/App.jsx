import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import ProcessingScreen from './components/ProcessingScreen'
import RiskResult from './components/RiskResult'
import ThreatBreakdown from './components/ThreatBreakdown'
import ScamFlowVisualization from './components/ScamFlowVisualization'
import ExplanationSection from './components/ExplanationSection'
import ActionChecklist from './components/ActionChecklist'
import HowItWorks from './components/HowItWorks'
import FeaturesSection from './components/FeaturesSection'
import Footer from './components/Footer'
import DeepfakeMonitor from './pages/DeepfakeMonitor'

// ---- Home page (original scam text analyzer) --------------------------------
function HomePage() {
  const [message, setMessage] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    if (!message.trim()) return
    setIsAnalyzing(true)
    setError(null)
    setResult(null)
    try {
      const [response] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        }),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ])
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Analysis failed')
      }
      setResult(await response.json())
    } catch (err) {
      setError(err.message || 'Failed to analyze message. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="page-content">
      {isAnalyzing && <ProcessingScreen />}
      {!result ? (
        <>
          <HeroSection
            message={message}
            setMessage={setMessage}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            error={error}
          />
          <HowItWorks />
          <FeaturesSection />
        </>
      ) : (
        <div className="results-page">
          <div className="container">
            <button className="back-btn" onClick={handleReset}>
              ← Analyze Another Message
            </button>
            <RiskResult result={result} />
            <ThreatBreakdown patterns={result.detectedPatterns} categoryScores={result.categoryScores} />
            <ScamFlowVisualization categoryScores={result.categoryScores} />
            <ExplanationSection explanations={result.explanations} />
            <ActionChecklist actions={result.actions} riskScore={result.riskScore} />
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}

// ---- Root app with routing --------------------------------------------------
function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/monitor" element={<DeepfakeMonitor />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
