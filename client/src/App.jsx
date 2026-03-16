import { useState } from 'react'
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

function App() {
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
      // Add a minimum delay to show the processing animation
      const [response] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        }),
        new Promise(resolve => setTimeout(resolve, 3000))
      ])

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Analysis failed')
      }

      const data = await response.json()
      setResult(data)
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
    <>
      <Navbar />
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
    </>
  )
}

export default App
