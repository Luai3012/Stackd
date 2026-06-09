// ============================================
// STACKD — APP LOGIC v3
// ============================================

const SUPABASE_URL = 'https://vklkrgzizqjxpwqskyjh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbGtyZ3ppenFqeHB3cXNreWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTg2NTUsImV4cCI6MjA5NjU3NDY1NX0.cPV8iCRxhOZ8aML1y6GGRhrvz8QDjDHw9tkqKIo709A'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUser = null
let deals = []
let compPlan = null

// ============================================
// INIT
// ============================================
async function init() {
  const hash = window.location.hash
  if (hash && hash.includes('type=recovery')) { showScreen('reset'); return }

  const { data: { session } } = await db.auth.getSession()
  if (session) { currentUser = session.user; await loadApp() }
  else { showScreen('auth') }

  db.auth.onAuthStateChange(async (_event, session) => {
    if (_event === 'PASSWORD_RECOVERY') { showScreen('reset'); return }
    if (session) { currentUser = session.user; await loadApp() }
    else { currentUser = null; showScreen('auth') }
  })
}

// ============================================
// SCREENS
// ============================================
function showScreen(name) {
  document.getElementById('auth-screen').style.display = name === 'auth' ? 'block' : 'none'
  document.getElementById('reset-screen').style.display = name === 'reset' ? 'block' : 'none'
  document.getElementById('app-screen').style.display = name === 'app' ? 'block' : 'none'
}

function showAuthTab(tab) {
  ;['login','signup','forgot'].forEach(t => {
    document.getElementById('form-' + t).style.display = t === tab ? 'block' : 'none'
    const el = document.getElementById('tab-' + t)
    if (el) el.classList.toggle('active', t === tab)
  })
  document.getElementById('auth-error').textContent = ''
  document.getElementById('auth-success').textContent = ''
}

function showAppTab(tab) {
  ;['dashboard','settings'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === tab ? 'block' : 'none'
    document.getElementById('nav-' + t).classList.toggle('active', t === tab)
  })
}

function toggleAppNav() {
  document.getElementById('app-nav-links').classList.toggle('open')
  document.getElementById('app-nav-toggle').classList.toggle('open')
}

// ============================================
// AUTH
// ============================================
async function signUp() {
  const name = document.getElementById('signup-name').value.trim()
  const email = document.getElementById('signup-email').value.trim()
  const password = document.getElementById('signup-password').value
  const errorEl = document.getElementById('auth-error')
  const successEl = document.getElementById('auth-success')
  errorEl.textContent = ''; successEl.textContent = ''
  if (!name || !email || !password) { errorEl.textContent = 'Please fill in all fields.'; return }
  if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return }
  const { error } = await db.auth.signUp({ email, password, options: { data: { full_name: name } } })
  if (error) { errorEl.textContent = error.message }
  else { successEl.textContent = 'Account created! Sign in below.'; showAuthTab('login') }
}

async function signIn() {
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  const errorEl = document.getElementById('auth-error')
  errorEl.textContent = ''
  if (!email || !password) { errorEl.textContent = 'Please enter your email and password.'; return }
  const { error } = await db.auth.signInWithPassword({ email, password })
  if (error) errorEl.textContent = error.message
}

async function signOut() {
  await db.auth.signOut()
  showScreen('auth')
}

async function sendPasswordReset() {
  const email = document.getElementById('forgot-email').value.trim()
  const errorEl = document.getElementById('auth-error')
  const successEl = document.getElementById('auth-success')
  errorEl.textContent = ''; successEl.textContent = ''
  if (!email) { errorEl.textContent = 'Please enter your email.'; return }
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/app.html' })
  if (error) errorEl.textContent = error.message
  else successEl.textContent = 'Reset link sent! Check your inbox.'
}

async function updatePassword() {
  const password = document.getElementById('new-password').value
  const confirm = document.getElementById('confirm-password').value
  const errorEl = document.getElementById('reset-error')
  const successEl = document.getElementById('reset-success')
  errorEl.textContent = ''; successEl.textContent = ''
  if (!password || !confirm) { errorEl.textContent = 'Please fill in both fields.'; return }
  if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return }
  if (password !== confirm) { errorEl.textContent = 'Passwords do not match.'; return }
  const { error } = await db.auth.updateUser({ password })
  if (error) errorEl.textContent = error.message
  else { successEl.textContent = 'Password updated! Signing you in...'; setTimeout(() => { showScreen('app'); loadApp() }, 1500) }
}

async function confirmDeleteAccount() {
  if (!confirm('Delete your account and all data? This cannot be undone.')) return
  await db.auth.signOut()
  showToast('Account deleted. See you around.', 'success')
  showScreen('auth')
}

// ============================================
// LOAD APP
// ============================================
async function loadApp() {
  showScreen('app')
  showAppTab('dashboard')

  const { data: profile } = await db.from('profiles').select('full_name').eq('id', currentUser.id).single()
  if (profile?.full_name) {
    document.getElementById('nav-user').textContent = profile.full_name
    document.getElementById('settings-name').value = profile.full_name
  }
  document.getElementById('settings-email').value = currentUser.email || ''

  await loadCompPlan()
  await loadDeals()
}

// ============================================
// COMP PLAN
// ============================================
async function loadCompPlan() {
  const { data } = await db.from('comp_plans').select('*').eq('user_id', currentUser.id).single()
  if (data) {
    compPlan = data
    document.getElementById('setup-banner').style.display = 'none'
    document.getElementById('settings-rate').value = data.commission_rate
    document.getElementById('settings-quota').value = data.quota_target
    document.getElementById('settings-currency').value = data.currency || 'USD'
  } else {
    document.getElementById('setup-banner').style.display = 'block'
    document.getElementById('setup-quota').focus()
  }
}

async function saveCompPlan() {
  const rate = parseFloat(document.getElementById('setup-rate').value)
  const quota = parseFloat(document.getElementById('setup-quota').value)
  if (!rate || !quota) { showToast('Please enter both rate and quota.', 'error'); return }
  const payload = { user_id: currentUser.id, commission_rate: rate, quota_target: quota }
  compPlan ? await db.from('comp_plans').update(payload).eq('user_id', currentUser.id)
           : await db.from('comp_plans').insert(payload)
  showToast('Comp plan saved!')
  await loadCompPlan()
  renderMetrics()
}

async function saveSettings() {
  const name = document.getElementById('settings-name').value.trim()
  const rate = parseFloat(document.getElementById('settings-rate').value)
  const quota = parseFloat(document.getElementById('settings-quota').value)
  const currency = document.getElementById('settings-currency').value
  const newPassword = document.getElementById('settings-password').value

  if (name) {
    await db.from('profiles').update({ full_name: name }).eq('id', currentUser.id)
    document.getElementById('nav-user').textContent = name
  }

  if (rate && quota) {
    const payload = { user_id: currentUser.id, commission_rate: rate, quota_target: quota, currency }
    compPlan ? await db.from('comp_plans').update(payload).eq('user_id', currentUser.id)
             : await db.from('comp_plans').insert(payload)
    await loadCompPlan()
  }

  if (newPassword) {
    if (newPassword.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return }
    const { error } = await db.auth.updateUser({ password: newPassword })
    if (error) { showToast(error.message, 'error'); return }
    document.getElementById('settings-password').value = ''
  }

  showToast('Settings saved!')
  await loadDeals()
}

// ============================================
// DEALS — LOAD
// ============================================
async function loadDeals() {
  const { data, error } = await db
    .from('deals').select('*').eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return }
  deals = data || []
  renderDeals()
  renderMetrics()
  renderAlerts()
}

// ============================================
// DEALS — ADD
// ============================================
async function addDeal() {
  const name = document.getElementById('f-name').value.trim()
  const client = document.getElementById('f-client').value.trim()
  const value = parseFloat(document.getElementById('f-value').value)
  const rate = parseFloat(document.getElementById('f-rate').value) || compPlan?.commission_rate || 8
  const received = parseFloat(document.getElementById('f-received').value) || 0
  const status = document.getElementById('f-status').value
  const date = document.getElementById('f-date').value || new Date().toISOString().split('T')[0]
  const notes = document.getElementById('f-notes').value.trim()
  const errorEl = document.getElementById('form-error')
  const btn = document.getElementById('save-deal-btn')

  if (!name || !value) { errorEl.textContent = 'Deal name and value are required.'; return }

  btn.textContent = 'Saving...'
  btn.disabled = true

  const { error } = await db.from('deals').insert({
    user_id: currentUser.id, name, client,
    deal_value: value, commission_rate: rate,
    amount_received: received, status, closed_date: date, notes
  })

  btn.textContent = 'Save deal'
  btn.disabled = false

  if (error) { errorEl.textContent = error.message; return }

  ;['f-name','f-client','f-value','f-rate','f-received','f-notes'].forEach(id => { document.getElementById(id).value = '' })
  document.getElementById('f-status').value = 'pending'
  document.getElementById('f-date').value = ''
  errorEl.textContent = ''
  toggleAddForm()
  showToast('Deal saved!')
  await loadDeals()
}

// ============================================
// DEALS — DELETE
// ============================================
async function deleteDeal(id) {
  if (!confirm('Delete this deal? This cannot be undone.')) return
  await db.from('deals').delete().eq('id', id)
  showToast('Deal deleted.')
  await loadDeals()
}

// ============================================
// EXPORT CSV
// ============================================
function exportCSV() {
  if (!deals.length) { showToast('No deals to export.', 'error'); return }
  const headers = ['Name','Client','Deal Value','Commission Rate','Expected Commission','Amount Received','Gap','Status','Date','Notes']
  const rows = deals.map(d => [
    d.name, d.client || '', d.deal_value, d.commission_rate + '%',
    Math.round(d.expected_commission), d.amount_received,
    Math.round(d.gap), d.status, d.closed_date || '', d.notes || ''
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'stackd-deals.csv'; a.click()
  URL.revokeObjectURL(url)
  showToast('Exported!')
}

// ============================================
// RENDER — METRICS
// ============================================
function renderMetrics() {
  const totalExp = deals.reduce((s, d) => s + (d.expected_commission || 0), 0)
  const totalRec = deals.reduce((s, d) => s + (d.amount_received || 0), 0)
  const totalGap = Math.max(totalExp - totalRec, 0)
  const totalVal = deals.reduce((s, d) => s + (d.deal_value || 0), 0)
  const pending = deals.filter(d => d.status === 'pending').length
  const disputed = deals.filter(d => d.status === 'disputed').length
  const quota = compPlan?.quota_target || 0
  const pct = quota > 0 ? Math.round((totalVal / quota) * 100) : 0

  document.getElementById('m-expected').textContent = '$' + Math.round(totalExp).toLocaleString()
  document.getElementById('m-received').textContent = '$' + Math.round(totalRec).toLocaleString()
  document.getElementById('m-gap').textContent = '$' + Math.round(totalGap).toLocaleString()
  document.getElementById('m-quota').textContent = pct + '%'

  const subRec = document.getElementById('m-received-sub')
  subRec.textContent = pending ? `${pending} payout${pending > 1 ? 's' : ''} pending` : 'All accounted for'
  subRec.className = 'metric-sub ' + (pending ? 'warning' : 'positive')

  const subGap = document.getElementById('m-gap-sub')
  subGap.textContent = disputed ? `${disputed} disputed deal${disputed > 1 ? 's' : ''}` : 'No disputes'
  subGap.className = 'metric-sub ' + (disputed ? 'negative' : 'positive')

  const subQuota = document.getElementById('m-quota-sub')
  subQuota.textContent = quota > 0 ? `of $${Math.round(quota).toLocaleString()} target` : 'Set up comp plan'

  document.getElementById('quota-bar').style.width = Math.min(pct, 100) + '%'
  document.getElementById('quota-closed-label').textContent = '$' + Math.round(totalVal).toLocaleString() + ' closed'
  document.getElementById('quota-target-label').textContent = quota > 0 ? 'Target: $' + Math.round(quota).toLocaleString() : 'No quota set'
}

// ============================================
// RENDER — DEALS
// ============================================
function renderDeals() {
  const body = document.getElementById('deals-body')

  if (!deals.length) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No deals logged yet</div>
        <div class="empty-state-sub">Hit "Log deal" above to add your first deal and start tracking your commissions.</div>
      </div>`
    return
  }

  body.innerHTML = deals.map(d => {
    const exp = Math.round(d.expected_commission)
    const gap = Math.round(d.gap)
    const badgeClass = { closed: 'badge-closed', pending: 'badge-pending', disputed: 'badge-disputed' }[d.status] || ''
    const gapDisplay = gap > 0
      ? `<span class="gap-positive">-$${gap.toLocaleString()}</span>`
      : `<span class="gap-zero">✓</span>`
    return `
      <div class="deal-row">
        <div>
          <div class="deal-name">${escHtml(d.name)}</div>
          <div class="deal-client">${escHtml(d.client || '')}</div>
        </div>
        <div>$${Math.round(d.deal_value).toLocaleString()}</div>
        <div>$${exp.toLocaleString()}</div>
        <div>$${Math.round(d.amount_received).toLocaleString()}</div>
        <div><span class="badge ${badgeClass}">${d.status}</span></div>
        <div>${gapDisplay}</div>
        <div><button class="delete-btn" onclick="deleteDeal('${d.id}')" title="Delete deal">✕</button></div>
      </div>`
  }).join('')
}

// ============================================
// RENDER — ALERTS
// ============================================
function renderAlerts() {
  const disputed = deals.filter(d => d.status === 'disputed' && d.gap > 0)
  const pending = deals.filter(d => d.status === 'pending')
  const section = document.getElementById('alerts-section')
  const list = document.getElementById('alerts-list')

  if (!disputed.length && !pending.length) { section.style.display = 'none'; return }

  section.style.display = 'block'
  list.innerHTML = [
    ...disputed.map(d => `
      <div class="alert-item">
        <span class="alert-icon">⚠️</span>
        <div class="alert-body">
          <div class="alert-title">Commission gap — "${escHtml(d.name)}"</div>
          <div class="alert-desc">You were paid $${Math.round(d.amount_received).toLocaleString()} but expected $${Math.round(d.expected_commission).toLocaleString()} — a shortfall of $${Math.round(d.gap).toLocaleString()}.</div>
          <div class="alert-actions">
            <button class="btn-alert" onclick="draftDispute('${escHtml(d.name)}', ${Math.round(d.gap)}, ${Math.round(d.amount_received)}, ${Math.round(d.expected_commission)})">Draft dispute message</button>
          </div>
        </div>
      </div>`),
    ...pending.map(d => `
      <div class="alert-item">
        <span class="alert-icon">🕐</span>
        <div class="alert-body">
          <div class="alert-title">Payout pending — "${escHtml(d.name)}"</div>
          <div class="alert-desc">$${Math.round(d.expected_commission).toLocaleString()} expected from ${escHtml(d.client || 'client')}. Not yet received.</div>
        </div>
      </div>`)
  ].join('')
}

// ============================================
// DISPUTE MESSAGE
// ============================================
function draftDispute(dealName, gap, received, expected) {
  const msg = `Hi [Manager's name],\n\nI wanted to flag a discrepancy on my commission for "${dealName}".\n\nBased on my records, my expected commission was $${expected.toLocaleString()}, but I received $${received.toLocaleString()} — a gap of $${gap.toLocaleString()}.\n\nI've double-checked this against my deal log and wanted to bring it to your attention in case it's a processing error. Could we find 10 minutes to reconcile this, or I'm happy to share my records directly?\n\nThanks,\n[Your name]`
  const textarea = document.createElement('textarea')
  textarea.value = msg
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  showToast('Dispute message copied to clipboard!')
}

// ============================================
// UTILITIES
// ============================================
function toggleAddForm() {
  const form = document.getElementById('add-form')
  const isOpen = form.style.display !== 'none'
  form.style.display = isOpen ? 'none' : 'block'
  if (!isOpen) document.getElementById('f-name').focus()
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast')
  toast.textContent = msg
  toast.className = 'toast show ' + type
  setTimeout(() => { toast.className = 'toast' }, 2800)
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// Sticky nav scroll effect
window.addEventListener('scroll', () => {
  document.getElementById('app-nav').classList.toggle('scrolled', window.scrollY > 4)
})

init()
