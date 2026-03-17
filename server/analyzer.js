/**
 * NeuroShield – Scam Detection Analyzer
 * Analyzes WhatsApp messages for digital arrest scam patterns.
 */

const PATTERN_CATEGORIES = {
  authority: {
    label: 'Authority Impersonation',
    description: 'Impersonation of law enforcement or government agencies',
    weight: 25,
    keywords: [
      'cbi', 'enforcement directorate', 'ed ', 'police', 'dcp', 'inspector',
      'commissioner', 'ips officer', 'supreme court', 'high court', 'narcotics',
      'customs', 'income tax', 'rbi', 'reserve bank', 'government officer',
      'cyber cell', 'crime branch', 'ncb', 'interpol', 'ministry', 'thana',
      'investigation officer', 'senior officer', 'law enforcement',
      'pulis', 'adhikari', 'mantralaya', 'vibhaga', 'vachak'
    ]
  },
  arrest: {
    label: 'Fake Arrest Language',
    description: 'Threats of arrest or legal consequences',
    weight: 25,
    keywords: [
      'arrest', 'warrant', 'fir', 'legal action', 'digital arrest',
      'jail', 'imprisonment', 'custody', 'detain', 'summon',
      'non-bailable', 'criminal case', 'charge sheet', 'prosecution',
      'court order', 'penalty', 'section 420', 'ipc', 'crpc',
      'money laundering', 'pmla', 'hawala', 'suspicious transaction',
      'narcotics found', 'parcel seized', 'contraband', 'illegal',
      'giraftar', 'hiraasat', 'kaidi', 'nyayalaya', 'shikayat', 'dhara 144',
      'case registered', 'complaint filed', 'drugs mil gaye', 'parcel pakda gaya'
    ]
  },
  payment: {
    label: 'Payment Demand',
    description: 'Requests for money transfers or financial information',
    weight: 20,
    keywords: [
      'upi', 'transfer', 'pay', 'deposit', 'bank account',
      'google pay', 'phonepe', 'paytm', 'neft', 'rtgs', 'imps',
      'send money', 'account number', 'ifsc', 'refundable',
      'security deposit', 'fine', 'settlement amount', 'clearance fee',
      'paisa', 'rupaye', 'transfer karein', 'khata number', 'surakshit',
      'bhej do', 'jama karein', 'fine bhariye', 'pesua',
      'wire transfer', 'crypto', 'bitcoin'
    ]
  },
  urgency: {
    label: 'Urgency Signals',
    description: 'Creating artificial time pressure',
    weight: 15,
    keywords: [
      'immediately', 'urgent', 'act now', 'right now', 'hurry',
      'within 24 hours', 'within 1 hour', 'time is running out',
      'turant', 'jaldi', 'abhi', 'der mat karo', 'samay nahi hai',
      'akhiri mauka', 'warning', 'emergency', 'jaldi se',
      'time-sensitive', 'countdown'
    ]
  },
  isolation: {
    label: 'Isolation Tactics',
    description: 'Attempts to prevent the victim from seeking help',
    weight: 15,
    keywords: [
      'don\'t tell', 'do not tell', 'don\'t inform', 'keep secret',
      'stay on the call', 'don\'t hang up', 'do not disconnect',
      'don\'t share', 'confidential matter', 'classified',
      'under surveillance', 'being monitored', 'don\'t contact anyone',
      'tell no one', 'between us', 'private matter', 'sensitive case',
      'gag order', 'court order not to disclose', 'stay on video call',
      'keep camera on', 'don\'t leave', 'anyone else', 'family',
      'don\'t call police', 'we are watching'
    ]
  }
};

const EXPLANATIONS_MAP = {
  authority: [
    'Real law enforcement agencies never contact citizens via WhatsApp or video calls for investigations.',
    'Government officials do not ask for personal information through messaging apps.',
    'No legitimate officer will claim to be from CBI/ED and contact you directly on WhatsApp.'
  ],
  arrest: [
    '"Digital arrest" is NOT a legitimate legal term in India — it does not exist in Indian law.',
    'You cannot be "arrested" over a phone or video call. Physical presence is legally required.',
    'Real warrants are served in person by authorized officers, never via WhatsApp messages.'
  ],
  payment: [
    'Real law enforcement NEVER demands UPI payments, bank transfers, or cryptocurrency.',
    'No fine, bail, or settlement is ever collected via Google Pay, PhonePe, or Paytm.',
    'Any request for money during a "legal investigation" is a guaranteed scam.'
  ],
  urgency: [
    'Scammers create artificial urgency to prevent you from thinking clearly.',
    'Legitimate legal processes take time and follow proper procedures — there is no "24-hour deadline."',
    'Panic is the scammer\'s primary weapon. Staying calm exposes their tactics.'
  ],
  isolation: [
    'Scammers isolate victims to prevent them from getting advice that would expose the fraud.',
    'No real officer will ever say "don\'t tell your family" — this is a manipulation tactic.',
    'Being told to "stay on the call" or "keep your camera on" is a hallmark of digital arrest scams.'
  ]
};

const ACTION_ITEMS = [
  { id: 1, text: 'End the call or close the chat immediately.', icon: '🚫', priority: 'critical' },
  { id: 2, text: 'Do NOT send any money under any circumstances.', icon: '💰', priority: 'critical' },
  { id: 3, text: 'Call the Cybercrime Helpline: 1930', icon: '📞', priority: 'critical' },
  { id: 4, text: 'Block the sender on WhatsApp.', icon: '🔒', priority: 'high' },
  { id: 5, text: 'Report the scam at cybercrime.gov.in', icon: '🌐', priority: 'high' },
  { id: 6, text: 'Inform your family and friends about the attempt.', icon: '👨‍👩‍👧‍👦', priority: 'medium' },
  { id: 7, text: 'Take screenshots of the conversation as evidence.', icon: '📸', priority: 'medium' },
  { id: 8, text: 'File a report with your local police station.', icon: '🏛️', priority: 'medium' },
  { id: 9, text: 'Change passwords if you shared any personal info.', icon: '🔑', priority: 'high' },
  { id: 10, text: 'Alert your bank if you shared financial details.', icon: '🏦', priority: 'critical' }
];

function analyzeMessage(message) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return {
      riskScore: 0,
      status: 'Safe',
      statusCode: 'safe',
      detectedPatterns: [],
      explanations: [],
      actions: [],
      categoryScores: {},
      totalPatternsFound: 0,
      messageLengthAnalyzed: 0
    };
  }

  const normalizedMessage = message.toLowerCase().trim();
  const detectedPatterns = [];
  const categoryScores = {};
  const explanations = [];
  let totalWeightedScore = 0;

  // Analyze each category
  for (const [categoryKey, category] of Object.entries(PATTERN_CATEGORIES)) {
    const matchedKeywords = [];

    for (const keyword of category.keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = normalizedMessage.match(regex);
      if (matches) {
        matchedKeywords.push({
          keyword,
          count: matches.length
        });
      }
    }

    // Calculate category score (0-100 for individual category)
    let categoryMatchScore = 0;
    if (matchedKeywords.length > 0) {
      // Base score from number of unique keywords matched
      categoryMatchScore = Math.min(100, (matchedKeywords.length / category.keywords.length) * 100 * 5);
      // Boost for multiple occurrences of same keyword
      const totalOccurrences = matchedKeywords.reduce((sum, m) => sum + m.count, 0);
      if (totalOccurrences > matchedKeywords.length) {
        categoryMatchScore = Math.min(100, categoryMatchScore * 1.2);
      }
    }

    categoryScores[categoryKey] = {
      label: category.label,
      description: category.description,
      score: Math.round(categoryMatchScore),
      matchedKeywords: matchedKeywords.map(m => m.keyword),
      matchCount: matchedKeywords.length,
      weight: category.weight
    };

    if (matchedKeywords.length > 0) {
      detectedPatterns.push({
        category: categoryKey,
        label: category.label,
        severity: categoryMatchScore > 70 ? 'critical' : categoryMatchScore > 40 ? 'warning' : 'low',
        matchedKeywords: matchedKeywords.map(m => m.keyword),
        score: Math.round(categoryMatchScore)
      });

      // Add relevant explanations
      const categoryExplanations = EXPLANATIONS_MAP[categoryKey];
      if (categoryExplanations) {
        const numExplanations = categoryMatchScore > 60 ? 2 : 1;
        explanations.push(...categoryExplanations.slice(0, numExplanations).map(text => ({
          category: category.label,
          text,
          severity: categoryMatchScore > 70 ? 'critical' : categoryMatchScore > 40 ? 'warning' : 'info'
        })));
      }

      // Add weighted contribution to total score
      totalWeightedScore += (categoryMatchScore / 100) * category.weight;
    }
  }

  // Normalize risk score to 0-100
  const maxPossibleWeight = Object.values(PATTERN_CATEGORIES).reduce((sum, c) => sum + c.weight, 0);
  let riskScore = Math.round((totalWeightedScore / maxPossibleWeight) * 100);

  // Boost if multiple categories detected (multi-vector attack)
  const categoriesDetected = detectedPatterns.length;
  if (categoriesDetected >= 4) {
    riskScore = Math.min(100, Math.round(riskScore * 1.3));
  } else if (categoriesDetected >= 3) {
    riskScore = Math.min(100, Math.round(riskScore * 1.2));
  } else if (categoriesDetected >= 2) {
    riskScore = Math.min(100, Math.round(riskScore * 1.1));
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  // Determine status
  let status, statusCode;
  if (riskScore >= 70) {
    status = 'Critical Scam';
    statusCode = 'critical';
  } else if (riskScore >= 40) {
    status = 'Suspicious';
    statusCode = 'suspicious';
  } else {
    status = 'Safe';
    statusCode = 'safe';
  }

  // Determine which actions to recommend based on risk
  let actions;
  if (riskScore >= 70) {
    actions = ACTION_ITEMS;
  } else if (riskScore >= 40) {
    actions = ACTION_ITEMS.filter(a => a.priority === 'critical' || a.priority === 'high');
  } else {
    actions = ACTION_ITEMS.filter(a => a.priority === 'critical').slice(0, 3);
  }

  return {
    riskScore,
    status,
    statusCode,
    detectedPatterns,
    explanations,
    actions,
    categoryScores,
    totalPatternsFound: detectedPatterns.reduce((sum, p) => sum + p.matchedKeywords.length, 0),
    messageLengthAnalyzed: message.length
  };
}

module.exports = { analyzeMessage };
