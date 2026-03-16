import { useState } from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import MessageScanner from './components/MessageScanner'
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

  // Legacy rule-based analysis via backend
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

  // Gemini AI result handler
  const handleGeminiResult = (geminiResult) => {
    setResult(geminiResult)
    // Scroll to results after a short delay
    setTimeout(() => {
      const el = document.querySelector('.results-page')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 200)
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
            <HeroSection />

            {/* AI-Powered Scanner Section */}
            <section className="scanner-section" id="ai-scanner">
              <div className="container">
                <div className="scanner-section-intro">
                  <h2>
                    <span className="gradient-text">AI-Powered</span> Analysis
                  </h2>
                  <p>Use Google Gemini AI for deeper, context-aware scam detection beyond keyword matching</p>
                </div>
                <MessageScanner
                  onResult={handleGeminiResult}
                  existingResult={null}
                  onReset={handleReset}
                />
              </div>
            </section>

            <HowItWorks />
            <FeaturesSection />
          </>
        ) : (
          <div className="results-page">
            <div className="container">
              <button className="back-btn" onClick={handleReset}>
                ← Analyze Another Message
              </button>

              {/* Inline scanner summary at top of results */}
              <MessageScanner
                onResult={handleGeminiResult}
                existingResult={result}
                onReset={handleReset}
              />

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
