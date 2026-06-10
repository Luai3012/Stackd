// ============================================
// STACKD — AI SERVERLESS FUNCTION
// Vercel serverless endpoint — keeps your
// Anthropic API key safe on the server side
// ============================================

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORS headers so your frontend can call this
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { type, data } = req.body

  if (!type || !data) {
    return res.status(400).json({ error: 'Missing type or data' })
  }

  // Verify user is authenticated and on a paid plan
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.split(' ')[1]
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  // Verify the JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }

  // Check subscription plan — free users cannot use AI
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const plan = sub?.plan || 'free'
  if (plan === 'free') {
    return res.status(403).json({ error: 'AI features require a Pro or Career plan' })
  }

  // Career-only tools
  const careerTools = ['interview', 'star', 'linkedin', 'negotiation']
  if (careerTools.includes(type) && plan !== 'career') {
    return res.status(403).json({ error: 'This feature requires the Career plan' })
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

  } else if (type === 'interview') {
    prompt = `You are an expert career coach specialising in sales and business development roles. A professional is preparing for a job interview and needs help answering common interview questions tailored to their background.

Job details:
- Role applying for: ${data.role}
- Company: ${data.company || 'the company'}
- Job description highlights: ${data.jobDescription}
- Candidate background: ${data.background || 'Sales and BD professional with experience in hospitality and luxury sectors'}
- Years of experience: ${data.experience || 'several years'}

Generate answers to these three most important interview questions for this role:
1. "Tell me about yourself"
2. "Why do you want this role?"
3. "What is your biggest achievement in sales or BD?"

For each answer:
- Tailor it specifically to the job description provided
- Keep each answer under 200 words
- Make it confident, specific, and authentic
- Use real-sounding language, not corporate buzzwords

Format clearly with the question as a header followed by the answer.`

  } else if (type === 'star') {
    prompt = `You are an expert career coach. Transform the following experience into a perfect STAR format answer for a job interview.

Details provided:
- Situation: ${data.situation}
- Role at the time: ${data.role || 'Sales / BD Professional'}
- Target role applying for: ${data.targetRole || 'Sales or BD role'}

Write a polished STAR answer with these four clearly labeled sections:
1. Situation — set the scene concisely (2-3 sentences)
2. Task — what was your specific responsibility (1-2 sentences)
3. Action — what you did, step by step, focusing on YOUR actions (3-4 sentences)
4. Result — quantified outcome where possible, what you learned (2-3 sentences)

Keep the total answer under 250 words. Make it compelling and specific. Use first person. Sound natural, not rehearsed. This will be used verbatim in a job interview.`

  } else if (type === 'linkedin') {
    prompt = `You are a professional LinkedIn profile writer specialising in sales and business development professionals. Rewrite the following LinkedIn summary to be compelling, keyword-optimised, and authentic.

Current summary:
${data.currentSummary}

Additional context:
- Current role: ${data.currentRole || 'Sales / BD Professional'}
- Target roles: ${data.targetRole || 'Sales, BD, or Account Management roles'}
- Key achievements to highlight: ${data.achievements || 'Revenue generation, relationship building, quota attainment'}
- Tone preference: ${data.tone || 'Professional but personable'}

Write a new LinkedIn About section that:
- Opens with a compelling hook (not "I am a...")
- Highlights specific achievements with numbers where possible
- Communicates what makes this person unique
- Ends with a clear call to action
- Is between 150-220 words
- Uses natural, human language — not AI-sounding prose
- Is optimised for recruiter searches in sales and BD

Write only the About section text, ready to paste directly into LinkedIn.`

  } else if (type === 'negotiation') {
    prompt = `You are an expert salary negotiation coach. Write a professional salary negotiation script for a sales professional who has received a job offer.

Offer details:
- Offered salary: ${data.offeredSalary}
- Target salary: ${data.targetSalary}
- Role: ${data.role || 'Sales / BD role'}
- Company: ${data.company || 'the company'}
- Strengths to leverage: ${data.strengths || 'Strong track record, quota attainment, relevant experience'}
- Current salary: ${data.currentSalary || 'not disclosed'}

Write a negotiation script that includes:
1. Opening — how to start the conversation confidently
2. The ask — how to state the number clearly without apologising
3. Justification — 2-3 specific reasons why the higher number is justified
4. Handling pushback — what to say if they say the budget is fixed
5. Closing — how to end the conversation positively regardless of outcome

Keep it conversational and confident. No grovelling, no over-explaining. This person deserves the number they're asking for — the script should feel that way.`

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
        model: 'claude-sonnet-4-5-20250929',
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
