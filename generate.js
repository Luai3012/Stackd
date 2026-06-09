// ============================================
// STACKD — AI SERVERLESS FUNCTION
// Vercel serverless endpoint — keeps your
// Anthropic API key safe on the server side
// ============================================

export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORS headers so your frontend can call this
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { type, data } = req.body

  if (!type || !data) {
    return res.status(400).json({ error: 'Missing type or data' })
  }

  // Build the prompt based on feature type
  let prompt = ''

  if (type === 'dispute') {
    prompt = `You are a professional workplace communication assistant. Write a clear, professional, and assertive but measured email from a sales professional to their manager disputing a commission discrepancy.

Details:
- Deal name: ${data.dealName}
- Client: ${data.client || 'the client'}
- Expected commission: $${data.expected}
- Amount received: $${data.received}
- Shortfall: $${data.gap}
- Tone preference: ${data.tone || 'professional and measured'}

Write only the email body — no subject line, no meta commentary. Start with "Hi [Manager's name]," and end with a professional sign-off. Keep it factual, specific, and solution-focused. Do not be aggressive. The goal is to open a conversation and get the discrepancy resolved, not to accuse anyone.`

  } else if (type === 'raise') {
    prompt = `You are a professional workplace communication assistant. Write a compelling, data-backed email from a sales professional to their manager requesting a salary raise or commission rate increase.

Performance details:
- Total revenue generated: $${data.totalRevenue}
- Quota attainment: ${data.quotaAttainment}%
- Number of deals closed: ${data.dealCount}
- Average deal size: $${data.avgDealSize}
- Time since last raise: ${data.timeSinceRaise || 'over 12 months'}
- Current role: ${data.role || 'Sales / BD professional'}
- Additional context: ${data.context || 'Consistent performance above quota'}

Write only the email body — no subject line, no meta commentary. Start with "Hi [Manager's name]," and end with a professional sign-off. Make it confident but not arrogant. Lead with impact and numbers. Request a specific meeting to discuss rather than demanding an immediate answer. Keep it under 250 words.`

  } else if (type === 'report') {
    prompt = `You are a professional sales performance analyst. Write a concise, well-structured performance summary report for a sales professional based on their deal data.

Performance data:
- Total deals closed: ${data.totalDeals}
- Total revenue generated: $${data.totalRevenue}
- Total expected commission: $${data.totalExpected}
- Total commission received: $${data.totalReceived}
- Commission gap: $${data.totalGap}
- Quota target: $${data.quotaTarget}
- Quota attainment: ${data.quotaAttainment}%
- Disputed deals: ${data.disputedDeals}
- Pending deals: ${data.pendingDeals}
- Top deal: ${data.topDeal || 'N/A'}
- Period: ${data.period || 'Current period'}

Write a professional performance report with the following sections:
1. Executive summary (2-3 sentences)
2. Key achievements (bullet points)
3. Commission accuracy (brief analysis of gaps if any)
4. Areas to watch (pending/disputed items)
5. Outlook (forward-looking statement)

Keep the tone positive and professional. Use specific numbers throughout. This report may be used in performance reviews or job interviews. Format it cleanly with clear section headers.`

  } else {
    return res.status(400).json({ error: 'Unknown feature type' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Anthropic API error:', error)
      return res.status(500).json({ error: 'AI generation failed. Please try again.' })
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || ''

    return res.status(200).json({ result: text })

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
