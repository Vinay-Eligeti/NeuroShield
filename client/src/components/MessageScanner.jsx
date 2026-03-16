import { useState, useRef } from 'react'
import Tesseract from 'tesseract.js'

// ============================================
// Shared JSON structure template
// ============================================
const JSON_STRUCTURE = `{
  "riskScore": <number 0-100>,
  "status": "<Safe | Suspicious | Critical Scam>",
  "statusCode": "<safe | suspicious | critical>",
  "scamCategory": "<category string>",
  "shortExplanation": "<2-3 sentence explanation>",
  "detectedPatterns": [
    {
      "category": "<authority|arrest|payment|urgency|isolation>",
      "label": "<human readable label>",
      "severity": "<low|warning|critical>",
      "matchedKeywords": ["<keyword1>", "<keyword2>"],
      "score": <0-100>
    }
  ],
  "categoryScores": {
    "authority": { "label": "Authority Impersonation", "description": "Impersonation of law enforcement or government agencies", "score": <0-100>, "matchedKeywords": [], "matchCount": <n>, "weight": 25 },
    "arrest": { "label": "Fake Arrest Language", "description": "Threats of arrest or legal consequences", "score": <0-100>, "matchedKeywords": [], "matchCount": <n>, "weight": 25 },
    "payment": { "label": "Payment Demand", "description": "Requests for money transfers or financial information", "score": <0-100>, "matchedKeywords": [], "matchCount": <n>, "weight": 20 },
    "urgency": { "label": "Urgency Signals", "description": "Creating artificial time pressure", "score": <0-100>, "matchedKeywords": [], "matchCount": <n>, "weight": 15 },
    "isolation": { "label": "Isolation Tactics", "description": "Attempts to prevent the victim from seeking help", "score": <0-100>, "matchedKeywords": [], "matchCount": <n>, "weight": 15 }
  },
  "explanations": [
    { "category": "<category label>", "text": "<explanation>", "severity": "<info|warning|critical>" }
  ],
  "actions": [
    { "id": <n>, "text": "<action text>", "icon": "<emoji>", "priority": "<critical|high|medium>" }
  ],
  "totalPatternsFound": <number>,
  "messageLengthAnalyzed": <number>
}`

const BASE_RULES = `Rules:
- riskScore 0-40 = safe, 40-70 = suspicious, 70-100 = critical
- Always provide at least 3 actions for any risk level
- Each category score should be 0 if no patterns match that category
- Be thorough in keyword detection — list actual words from the content`

// ============================================
// System prompts per mode
// ============================================
const TEXT_SYSTEM_PROMPT = `You are a cybersecurity scam detection AI. Analyze the following message and determine if it is a scam (phishing, OTP request, financial fraud, digital arrest scam, urgency manipulation, authority impersonation).

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences, just raw JSON):
${JSON_STRUCTURE}

${BASE_RULES}
- For safe messages, still provide general safety tips as actions
- messageLengthAnalyzed should be the character count of the input message
`

const URL_SYSTEM_PROMPT = `You are a cybersecurity AI specialized in detecting phishing and malicious URLs. Analyze the following URL for phishing indicators, domain spoofing, suspicious redirects, and scam patterns.

Check for:
- Domain spoofing (misspelled brand names like "g00gle.com", "amaz0n.net")
- Suspicious TLDs (.xyz, .tk, .ml, .ga, .top, .buzz, .click)
- Excessive subdomains or path obfuscation
- Known phishing URL patterns (login pages, account verification, prize claims)
- URL shortener abuse (bit.ly, tinyurl redirecting to scams)
- Fake payment gateway or banking URLs
- Data harvesting forms disguised as legitimate sites
- IP address based URLs instead of domain names
- Suspicious query parameters (token, redirect, verify, confirm)

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences, just raw JSON):
${JSON_STRUCTURE}

${BASE_RULES}
- For safe URLs, still provide general browsing safety tips as actions
- scamCategory should describe the type: "Phishing URL", "Domain Spoofing", "Malicious Redirect", "Safe URL", etc.
- matchedKeywords should contain suspicious URL components you detected
- messageLengthAnalyzed should be the length of the URL
`

const IMAGE_SYSTEM_PROMPT = `You are a cybersecurity AI specialized in detecting scams from text extracted from images using OCR. The text was extracted from an uploaded image. Analyze it for scam or suspicious content such as:
- fake payment receipts or UPI transaction screenshots
- bank phishing warnings or OTP requests
- job scam posters with unrealistic salary offers
- investment scam advertisements or crypto schemes
- delivery payment scams or customs clearance frauds
- QR payment scam instructions
- extortion, blackmail, or threat messages
- lottery or prize scam announcements

If the extracted text is very short, garbled, or contains no suspicious content, return a LOW risk score with category "Safe Image".

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences, just raw JSON):
${JSON_STRUCTURE}

${BASE_RULES}
- For safe images, still provide general safety tips as actions
- matchedKeywords should contain actual words/phrases found in the extracted text
- If no text could be extracted or text is meaningless, return riskScore 5 with status "Safe" and scamCategory "Safe Image"
`

// ============================================
// Helpers
// ============================================
const GROQ_TEXT_MODEL = 'llama-3.1-8b-instant'

const URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/

function detectInputType(text) {
  if (!text || !text.trim()) return null
  const trimmed = text.trim()
  // Check if the entire input is a single URL (no other text around it)
  if (URL_REGEX.test(trimmed) && !trimmed.includes(' ') && !trimmed.includes('\n')) {
    return 'url'
  }
  return 'text'
}

function containsURL(text) {
  // Check if text contains any URL-like patterns
  return /(?:https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g.test(text)
}

function isOnlyURL(text) {
  const trimmed = text.trim()
  return URL_REGEX.test(trimmed) && !trimmed.includes(' ') && !trimmed.includes('\n')
}

const SAFE_IMAGE_RESULT = {
  riskScore: 5,
  status: 'Safe',
  statusCode: 'safe',
  scamCategory: 'Safe Image',
  shortExplanation: 'No readable text was detected in this image. The image appears safe, but always verify suspicious content manually.',
  detectedPatterns: [],
  categoryScores: {
    authority: { label: 'Authority Impersonation', description: 'Impersonation of law enforcement or government agencies', score: 0, matchedKeywords: [], matchCount: 0, weight: 25 },
    arrest: { label: 'Fake Arrest Language', description: 'Threats of arrest or legal consequences', score: 0, matchedKeywords: [], matchCount: 0, weight: 25 },
    payment: { label: 'Payment Demand', description: 'Requests for money transfers or financial information', score: 0, matchedKeywords: [], matchCount: 0, weight: 20 },
    urgency: { label: 'Urgency Signals', description: 'Creating artificial time pressure', score: 0, matchedKeywords: [], matchCount: 0, weight: 15 },
    isolation: { label: 'Isolation Tactics', description: 'Attempts to prevent the victim from seeking help', score: 0, matchedKeywords: [], matchCount: 0, weight: 15 }
  },
  explanations: [{ category: 'Image Analysis', text: 'No readable text was found in the uploaded image. If the image contains visual-only scam content (like QR codes), please describe it in text mode for analysis.', severity: 'info' }],
  actions: [
    { id: 1, text: 'If unsure, do not act on the image content.', icon: '🛑', priority: 'high' },
    { id: 2, text: 'Verify the source of the image before trusting it.', icon: '🔍', priority: 'medium' },
    { id: 3, text: 'Report suspicious images at cybercrime.gov.in', icon: '🌐', priority: 'medium' }
  ],
  totalPatternsFound: 0,
  messageLengthAnalyzed: 0
}

// ============================================
// Component
// ============================================
export default function MessageScanner({ onResult, existingResult, onReset }) {
  const [message, setMessage] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [quickResult, setQuickResult] = useState(null)
  const [mode, setMode] = useState('text') // 'text', 'url', or 'image'
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [ocrProgress, setOcrProgress] = useState('')
  const [detectedType, setDetectedType] = useState(null) // auto-detected type indicator
  const fileInputRef = useRef(null)

  // ---- Auto-detect input type on text change ----
  const handleTextChange = (e) => {
    const val = e.target.value
    setMessage(val)
    setError(null)

    if (mode !== 'image') {
      const detected = detectInputType(val)
      setDetectedType(detected)

      // Auto-switch mode based on detection
      if (detected === 'url' && mode !== 'url') {
        setMode('url')
      } else if (detected === 'text' && mode === 'url') {
        setMode('text')
      }
    }
  }

  // ---- Validation ----
  const validateInput = () => {
    const trimmed = message.trim()

    if (mode === 'text') {
      if (!trimmed) return 'Please enter a message to analyze.'
      if (isOnlyURL(trimmed)) return 'This looks like a URL. Switch to URL mode or paste plain text only.'
      return null
    }

    if (mode === 'url') {
      if (!trimmed) return 'Please enter a URL to analyze.'
      if (!URL_REGEX.test(trimmed)) return 'Please enter a valid URL (e.g. https://example.com).'
      if (trimmed.includes(' ') || trimmed.includes('\n')) return 'URL input must be a single URL with no spaces or line breaks.'
      return null
    }

    if (mode === 'image') {
      if (!imageFile) return 'Please upload an image to analyze.'
      return null
    }

    return null
  }

  // ---- Image handling ----
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (PNG, JPG, JPEG only)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 10MB.')
      return
    }

    setError(null)
    setImageFile(file)
    setMessage('') // Clear text when image is selected

    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setOcrProgress('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---- Mode switching ----
  const switchMode = (newMode) => {
    if (isAnalyzing) return
    setMode(newMode)
    setError(null)
    setDetectedType(null)

    if (newMode === 'image') {
      setMessage('')
    } else {
      setImageFile(null)
      setImagePreview(null)
      setOcrProgress('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ---- Result processing ----
  const processResult = (textContent, sourceLength) => {
    let parsed
    try {
      const cleanedText = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleanedText)
    } catch (parseErr) {
      throw new Error('Failed to parse AI response. Please try again.')
    }

    parsed.messageLengthAnalyzed = parsed.messageLengthAnalyzed || sourceLength || 0
    parsed.totalPatternsFound = parsed.totalPatternsFound ||
      (parsed.detectedPatterns?.reduce((sum, p) => sum + (p.matchedKeywords?.length || 0), 0) || 0)

    setQuickResult({
      riskScore: parsed.riskScore,
      statusCode: parsed.statusCode,
      status: parsed.status,
      scamCategory: parsed.scamCategory,
      shortExplanation: parsed.shortExplanation
    })

    if (onResult) onResult(parsed)
  }

  // ---- Groq API call ----
  const callGroqAPI = async (apiKey, systemPrompt, userContent) => {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: GROQ_TEXT_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          temperature: 0.2,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        })
      }
    )

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || `API Error: ${response.status}`)
    }

    const data = await response.json()
    const textContent = data.choices?.[0]?.message?.content
    if (!textContent) throw new Error('No response received from Groq API')
    return textContent
  }

  // ---- OCR extraction ----
  const extractTextFromImage = async (imageSource) => {
    setOcrProgress('Initializing OCR engine...')

    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setOcrProgress(`Extracting text... ${Math.round((m.progress || 0) * 100)}%`)
        } else if (m.status === 'loading language traineddata') {
          setOcrProgress('Loading language data...')
        }
      }
    })

    setOcrProgress('Text extraction complete!')
    return (result.data.text || '').replace(/\s+/g, ' ').trim()
  }

  // ---- Main analyze handler ----
  const handleAnalyze = async () => {
    // Validate
    const validationError = validateInput()
    if (validationError) {
      setError(validationError)
      return
    }

    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) {
      setError('Groq API key not found. Please set VITE_GROQ_API_KEY in your .env file.')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setQuickResult(null)
    setOcrProgress('')

    try {
      if (mode === 'text') {
        // Text mode — plain text scam detection
        const result = await callGroqAPI(apiKey, TEXT_SYSTEM_PROMPT, message)
        processResult(result, message.length)

      } else if (mode === 'url') {
        // URL mode — phishing detection
        const urlInput = message.trim()
        const userMessage = `Analyze this URL for phishing and scam indicators:\n\n${urlInput}`
        const result = await callGroqAPI(apiKey, URL_SYSTEM_PROMPT, userMessage)
        processResult(result, urlInput.length)

      } else if (mode === 'image') {
        // Image mode — OCR → text → scam detection
        const extractedText = await extractTextFromImage(imagePreview)

        if (!extractedText || extractedText.length < 3) {
          processResult(JSON.stringify(SAFE_IMAGE_RESULT), 0)
          return
        }

        setOcrProgress('Sending extracted text to AI for scam analysis...')
        const userMessage = `The following text was extracted from an uploaded image using OCR. Analyze it for scam content:\n\n---\n${extractedText}\n---`
        const result = await callGroqAPI(apiKey, IMAGE_SYSTEM_PROMPT, userMessage)
        processResult(result, extractedText.length)
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze. Please try again.')
    } finally {
      setIsAnalyzing(false)
      setOcrProgress('')
    }
  }

  const handleReset = () => {
    setMessage('')
    setQuickResult(null)
    setError(null)
    setImageFile(null)
    setImagePreview(null)
    setOcrProgress('')
    setDetectedType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (onReset) onReset()
  }

  const getStatusColor = (sc) => {
    switch (sc) {
      case 'critical': return 'var(--critical)'
      case 'suspicious': return 'var(--suspicious)'
      default: return 'var(--safe)'
    }
  }

  const getStatusEmoji = (sc) => {
    switch (sc) {
      case 'critical': return '🚨'
      case 'suspicious': return '⚠️'
      default: return '✅'
    }
  }

  const canAnalyze = mode === 'image' ? imageFile : message.trim()

  const getModeLabel = () => {
    switch (mode) {
      case 'url': return '🔗 Analyze URL'
      case 'image': return '🖼️ Analyze Image'
      default: return '🤖 Analyze Message'
    }
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="message-scanner" id="scanner">
      <div className="scanner-header">
        <div className="scanner-icon">🤖</div>
        <div>
          <h3>AI-Powered Message Scanner</h3>
          <p>Powered by Groq AI — text, URL, and image scam detection</p>
        </div>
        <div className="scanner-badge">
          <span className="pulse-dot"></span>
          AI Active
        </div>
      </div>

      {!quickResult && !existingResult ? (
        <>
          {/* Mode Toggle — 3 buttons */}
          <div className="scanner-mode-toggle">
            <button
              className={`mode-btn ${mode === 'text' ? 'active' : ''}`}
              onClick={() => switchMode('text')}
              disabled={isAnalyzing}
            >
              💬 Text Message
            </button>
            <button
              className={`mode-btn ${mode === 'url' ? 'active' : ''}`}
              onClick={() => switchMode('url')}
              disabled={isAnalyzing}
            >
              🔗 URL Check
            </button>
            <button
              className={`mode-btn ${mode === 'image' ? 'active' : ''}`}
              onClick={() => switchMode('image')}
              disabled={isAnalyzing}
            >
              🖼️ Image Scan
            </button>
          </div>

          {/* Auto-detection indicator */}
          {mode !== 'image' && detectedType && detectedType !== mode && (
            <div className="scanner-auto-detect">
              💡 Detected as <strong>{detectedType === 'url' ? 'URL' : 'text'}</strong> — auto-switched to {detectedType === 'url' ? 'URL Check' : 'Text Message'} mode
            </div>
          )}

          {mode === 'image' ? (
            /* Image Upload */
            <div className="scanner-image-upload">
              {!imagePreview ? (
                <div
                  className="image-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('dragover') }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('dragover')
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleImageSelect({ target: { files: [file] } })
                  }}
                >
                  <div className="dropzone-icon">📷</div>
                  <p className="dropzone-title">Upload Suspicious Image</p>
                  <p className="dropzone-subtitle">Click to browse or drag & drop</p>
                  <p className="dropzone-hint">Supports PNG, JPG, JPEG • Max 10MB</p>
                </div>
              ) : (
                <div className="image-preview-wrapper">
                  <img src={imagePreview} alt="Uploaded for analysis" className="image-preview" />
                  <button className="image-remove-btn" onClick={removeImage} disabled={isAnalyzing}>
                    ✕ Remove
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            /* Text / URL Input — shared textarea */
            <textarea
              className="message-textarea"
              id="scanner-input"
              placeholder={mode === 'url'
                ? 'Paste a suspicious URL here...\n\nExample: https://secure-login-verify.example.xyz/account?token=abc123'
                : 'Paste a suspicious message here for AI analysis...\n\nExample: "This is Inspector Sharma from CBI. Your Aadhaar has been used in money laundering. A warrant has been issued. Transfer ₹50,000 via UPI immediately or face digital arrest. Don\'t tell anyone."'
              }
              value={message}
              onChange={handleTextChange}
              maxLength={mode === 'url' ? 2048 : 10000}
              disabled={isAnalyzing}
              rows={mode === 'url' ? 3 : undefined}
            />
          )}

          <div className="input-footer">
            <span className="char-count">
              {mode === 'image'
                ? imageFile
                  ? `${imageFile.name} (${(imageFile.size / 1024).toFixed(0)} KB)`
                  : 'No image selected'
                : mode === 'url'
                  ? `${message.length} / 2,048`
                  : `${message.length} / 10,000`
              }
            </span>
            <button
              className="analyze-btn scanner-analyze-btn"
              id="scanner-analyze-btn"
              onClick={handleAnalyze}
              disabled={!canAnalyze || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="btn-spinner"></span>
                  Analyzing with AI...
                </>
              ) : getModeLabel()}
            </button>
          </div>

          {isAnalyzing && (
            <div className="scanner-loading">
              <div className="scanner-loading-steps">
                {mode === 'text' && (
                  <>
                    <div className="scanner-step active"><span className="step-dot"></span> Sending text to Groq AI...</div>
                    <div className="scanner-step"><span className="step-dot"></span> Detecting scam patterns...</div>
                    <div className="scanner-step"><span className="step-dot"></span> Calculating risk score...</div>
                  </>
                )}
                {mode === 'url' && (
                  <>
                    <div className="scanner-step active"><span className="step-dot"></span> Analyzing URL structure...</div>
                    <div className="scanner-step"><span className="step-dot"></span> Checking for phishing indicators...</div>
                    <div className="scanner-step"><span className="step-dot"></span> Calculating risk score...</div>
                  </>
                )}
                {mode === 'image' && (
                  <>
                    <div className={`scanner-step ${ocrProgress ? 'active' : ''}`}>
                      <span className="step-dot"></span> {ocrProgress || 'Preparing OCR engine...'}
                    </div>
                    <div className={`scanner-step ${ocrProgress.includes('Sending') ? 'active' : ''}`}>
                      <span className="step-dot"></span> Analyzing extracted text for scam patterns...
                    </div>
                    <div className="scanner-step"><span className="step-dot"></span> Calculating risk score...</div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ---- Result Display (unchanged) ---- */
        <div className="scanner-result">
          <div className="scanner-result-header" style={{ borderColor: getStatusColor(quickResult?.statusCode || existingResult?.statusCode) }}>
            <div className="scanner-result-score" style={{ color: getStatusColor(quickResult?.statusCode || existingResult?.statusCode) }}>
              <span className="scanner-score-emoji">{getStatusEmoji(quickResult?.statusCode || existingResult?.statusCode)}</span>
              <span className="scanner-score-number">{quickResult?.riskScore ?? existingResult?.riskScore}</span>
              <span className="scanner-score-label">/ 100 Risk</span>
            </div>
            <div className={`risk-status-badge ${quickResult?.statusCode || existingResult?.statusCode}`}>
              {quickResult?.status || existingResult?.status}
            </div>
          </div>

          {(quickResult?.scamCategory) && (
            <div className="scanner-category">
              <span className="scanner-category-label">Scam Category:</span>
              <span className="scanner-category-value">{quickResult.scamCategory}</span>
            </div>
          )}

          {(quickResult?.shortExplanation) && (
            <div className="scanner-explanation">
              <p>{quickResult.shortExplanation}</p>
            </div>
          )}

          <div className="scanner-actions">
            <button className="scanner-detail-btn" onClick={() => {
              const el = document.querySelector('.results-page')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}>
              📊 View Full Analysis
            </button>
            <button className="scanner-reset-btn" onClick={handleReset}>
              🔄 Scan Another Message
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="scanner-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
