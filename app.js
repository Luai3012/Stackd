/* ============================================
   STACKD APP JS v3
   Full product with sidebar nav, commission
   center, AI workspace, performance tab
============================================ */

const SUPABASE_URL = 'https://vklkrgzizqjxpwqskyjh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbGtyZ3ppenFqeHB3cXNreWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTg2NTUsImV4cCI6MjA5NjU3NDY1NX0.cPV8iCRxhOZ8aML1y6GGRhrvz8QDjDHw9tkqKIo709A'
const PADDLE_CLIENT_TOKEN = 'live_056052c80b254a9355e68c3b0a5'
const PADDLE_PRICES = { pro: 'pri_01ktpq347vsgkzx5w53r1f1fph', career: 'pri_01ktpq7py8m99rq5gyseg87086' }

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUser = null
let deals = []
let compPlan = null
let userPlan = 'free'
let currentTool = null
let allDeals = []

/* ============================================ INIT */
async function init() {
  // Auth canvas animation
  startAuthCanvas()

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

  // Post-upgrade
  if (window.location.search.includes('upgraded=true')) {
    setTimeout(async () => {
      await loadSubscription()
      showToast('Welcome to Stackd Pro!', 'success')
      window.history.replaceState({}, '', window.location.pathname)
    }, 2000)
  }

  const upgradeIntent = localStorage.getItem('upgrade_intent')
  if (upgradeIntent) { localStorage.removeItem('upgrade_intent'); setTimeout(() => openUpgradeModal(upgradeIntent), 1500) }
}

/* ============================================ AUTH CANVAS */
function startAuthCanvas() {
  const canvas = document.getElementById('auth-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const pts = Array.from({length: 60}, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3,
    r: Math.random()*1.5+0.3, phase: Math.random()*Math.PI*2,
    green: Math.random()>0.7
  }))
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height)
    // grid
    ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=0.5
    for(let x=0;x<canvas.width;x+=54){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke()}
    for(let y=0;y<canvas.height;y+=54){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}
    // particles
    pts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.phase+=0.015
      if(p.x<0||p.x>canvas.width)p.vx*=-1
      if(p.y<0||p.y>canvas.height)p.vy*=-1
      const a=(Math.sin(p.phase)*0.2+0.3)*(p.green?0.6:0.2)
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
      ctx.fillStyle=p.green?`rgba(0,216,127,${a})`:`rgba(255,255,255,${a})`
      ctx.fill()
    })
    requestAnimationFrame(draw)
  }
  draw()
}

/* ============================================ SCREENS */
function showScreen(name) {
  document.getElementById('auth-screen').style.display = name==='auth' ? 'block' : 'none'
  document.getElementById('reset-screen').style.display = name==='reset' ? 'block' : 'none'
  document.getElementById('app-screen').style.display = name==='app' ? 'flex' : 'none'
}

function showAuthTab(tab) {
  ;['login','signup','forgot'].forEach(t => {
    document.getElementById('form-'+t).style.display = t===tab ? 'block' : 'none'
    const el = document.getElementById('tab-'+t)
    if(el) el.classList.toggle('active', t===tab)
  })
  document.getElementById('auth-error').textContent = ''
  document.getElementById('auth-success').textContent = ''
}

/* ============================================ AUTH */
async function signUp() {
  const name = document.getElementById('signup-name').value.trim()
  const email = document.getElementById('signup-email').value.trim()
  const password = document.getElementById('signup-password').value
  const errorEl = document.getElementById('auth-error')
  const successEl = document.getElementById('auth-success')
  errorEl.textContent = ''; successEl.textContent = ''
  if(!name||!email||!password){errorEl.textContent='Please fill in all fields.';return}
  if(password.length<6){errorEl.textContent='Password must be at least 6 characters.';return}
  const {error} = await db.auth.signUp({email, password, options:{data:{full_name:name}}})
  if(error){errorEl.textContent=error.message}
  else{successEl.textContent='Account created! Sign in below.';showAuthTab('login')}
}

async function signIn() {
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  const errorEl = document.getElementById('auth-error')
  errorEl.textContent = ''
  if(!email||!password){errorEl.textContent='Please enter your email and password.';return}
  const {error} = await db.auth.signInWithPassword({email, password})
  if(error) errorEl.textContent = error.message
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
  if(!email){errorEl.textContent='Please enter your email.';return}
  const {error} = await db.auth.resetPasswordForEmail(email, {redirectTo: window.location.origin+'/app.html'})
  if(error) errorEl.textContent = error.message
  else successEl.textContent = 'Reset link sent! Check your inbox.'
}

async function updatePassword() {
  const password = document.getElementById('new-password').value
  const confirm = document.getElementById('confirm-password').value
  const errorEl = document.getElementById('reset-error')
  const successEl = document.getElementById('reset-success')
  errorEl.textContent = ''; successEl.textContent = ''
  if(!password||!confirm){errorEl.textContent='Please fill in both fields.';return}
  if(password.length<6){errorEl.textContent='Password must be at least 6 characters.';return}
  if(password!==confirm){errorEl.textContent='Passwords do not match.';return}
  const {error} = await db.auth.updateUser({password})
  if(error) errorEl.textContent = error.message
  else{successEl.textContent='Password updated! Signing you in...';setTimeout(()=>{showScreen('app');loadApp()},1500)}
}

async function confirmDeleteAccount() {
  if(!confirm('Delete your account and all data? This cannot be undone.'))return
  await db.auth.signOut()
  showToast('Account deleted.')
  showScreen('auth')
}

/* ============================================ LOAD APP */
async function loadApp() {
  showScreen('app')
  showTab('dashboard')

  if(window.Paddle) Paddle.Initialize({token: PADDLE_CLIENT_TOKEN})

  const {data: profile} = await db.from('profiles').select('full_name').eq('id', currentUser.id).single()
  const name = profile?.full_name || currentUser.email?.split('@')[0] || 'User'

  document.getElementById('welcome-title').textContent = `Welcome back, ${name.split(' ')[0]}.`
  document.getElementById('sidebar-name').textContent = name
  document.getElementById('sidebar-avatar').textContent = name.charAt(0).toUpperCase()
  document.getElementById('settings-name').value = name
  document.getElementById('settings-email').value = currentUser.email || ''
  document.getElementById('sync-label').textContent = 'Synced'

  await loadSubscription()
  await loadCompPlan()
  await loadDeals()
}

/* ============================================ TAB NAVIGATION */
function showTab(tab) {
  const tabs = ['dashboard','commission','performance','workspace','settings']
  tabs.forEach(t => {
    const el = document.getElementById('tab-'+t)
    const nav = document.getElementById('nav-'+t)
    if(el) el.style.display = t===tab ? 'flex' : 'none'
    if(nav) nav.classList.toggle('active', t===tab)
  })
  if(tab==='commission') renderCommissionTab()
  if(tab==='performance') renderPerformanceTab()
  if(tab==='workspace') renderWorkspaceTab()
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open')
}

/* ============================================ SUBSCRIPTION */
async function loadSubscription() {
  const {data} = await db.from('subscriptions').select('plan,status').eq('user_id', currentUser.id).single()
  userPlan = data?.plan || 'free'

  const chip = document.getElementById('sidebar-plan')
  if(chip) {
    chip.textContent = userPlan.charAt(0).toUpperCase() + userPlan.slice(1)
    chip.className = 'plan-chip ' + userPlan
  }

  const planName = document.getElementById('settings-plan-name')
  const planDesc = document.getElementById('settings-plan-desc')
  if(planName) planName.textContent = userPlan.charAt(0).toUpperCase() + userPlan.slice(1) + ' plan'
  if(planDesc) {
    const descs = {free:'Up to 5 deals per month',pro:'Unlimited deals + AI features',career:'Everything in Pro + career coaching'}
    planDesc.textContent = descs[userPlan] || ''
  }

  // Lock career tools
  document.querySelectorAll('.career-tool').forEach(el => {
    if(userPlan!=='career'){
      el.title = 'Available on Career plan'
      el.addEventListener('click', e => { e.stopPropagation(); openUpgradeModal('career') }, {capture:true})
    }
  })
}

/* ============================================ COMP PLAN */
async function loadCompPlan() {
  const {data} = await db.from('comp_plans').select('*').eq('user_id', currentUser.id).single()
  if(data) {
    compPlan = data
    document.getElementById('setup-banner').style.display = 'none'
    document.getElementById('settings-rate').value = data.commission_rate
    document.getElementById('settings-quota').value = data.quota_target
    document.getElementById('settings-currency').value = data.currency || 'USD'
  } else {
    document.getElementById('setup-banner').style.display = 'block'
  }
}

async function saveCompPlan() {
  const rate = parseFloat(document.getElementById('setup-rate').value)
  const quota = parseFloat(document.getElementById('setup-quota').value)
  if(!rate||!quota){showToast('Please enter both rate and quota.','error');return}
  const payload = {user_id: currentUser.id, commission_rate: rate, quota_target: quota}
  compPlan ? await db.from('comp_plans').update(payload).eq('user_id', currentUser.id)
           : await db.from('comp_plans').insert(payload)
  showToast('Comp plan saved!','success')
  await loadCompPlan()
  await loadDeals()
}

/* ============================================ DEALS */
async function loadDeals() {
  const {data, error} = await db.from('deals').select('*').eq('user_id', currentUser.id).order('created_at', {ascending:false})
  if(error){console.error(error);return}
  deals = data || []
  allDeals = [...deals]
  renderAll()
}

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
  const btn = document.getElementById('save-btn')

  if(!name||!value){errorEl.textContent='Deal name and value are required.';return}

  // Free plan limit
  if(userPlan==='free' && deals.length>=5){
    errorEl.textContent=''
    openUpgradeModal('pro')
    showToast('Free plan limited to 5 deals. Upgrade to Pro for unlimited.','error')
    return
  }

  btn.textContent = 'Saving...'
  btn.disabled = true

  const {error} = await db.from('deals').insert({
    user_id: currentUser.id, name, client,
    deal_value: value, commission_rate: rate,
    amount_received: received, status, closed_date: date, notes
  })

  btn.textContent = 'Save deal'
  btn.disabled = false

  if(error){errorEl.textContent=error.message;return}

  ;['f-name','f-client','f-value','f-rate','f-received','f-notes'].forEach(id=>document.getElementById(id).value='')
  document.getElementById('f-status').value='pending'
  document.getElementById('f-date').value=''
  errorEl.textContent=''
  toggleAddForm()
  showToast('Deal saved!','success')
  await loadDeals()
}

async function deleteDeal(id) {
  if(!confirm('Delete this deal?'))return
  await db.from('deals').delete().eq('id', id)
  showToast('Deal deleted.')
  await loadDeals()
}

function filterDeals(q) {
  if(!q.trim()){deals=[...allDeals];renderDealsTable();return}
  const lower = q.toLowerCase()
  deals = allDeals.filter(d => d.name?.toLowerCase().includes(lower) || d.client?.toLowerCase().includes(lower))
  renderDealsTable()
}

function exportCSV() {
  if(!deals.length){showToast('No deals to export.','error');return}
  const headers = ['Name','Client','Deal Value','Commission Rate','Expected','Received','Gap','Status','Date']
  const rows = deals.map(d => [d.name,d.client||'',d.deal_value,d.commission_rate+'%',Math.round(d.expected_commission),d.amount_received,Math.round(d.gap),d.status,d.closed_date||''])
  const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv],{type:'text/csv'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href=url; a.download='stackd-deals.csv'; a.click()
  URL.revokeObjectURL(url)
  showToast('Exported!','success')
}

/* ============================================ RENDER ALL */
function renderAll() {
  renderMetrics()
  renderDealsTable()
  renderAlerts()
  renderPayoutTimeline()
  renderSimulator()
  renderHeaderKPI()
}

/* ============================================ METRICS */
function renderMetrics() {
  const totalExp = deals.reduce((s,d)=>s+(d.expected_commission||0),0)
  const totalRec = deals.reduce((s,d)=>s+(d.amount_received||0),0)
  const totalGap = Math.max(totalExp-totalRec, 0)
  const totalVal = deals.reduce((s,d)=>s+(d.deal_value||0),0)
  const pending = deals.filter(d=>d.status==='pending').length
  const disputed = deals.filter(d=>d.status==='disputed').length
  const quota = compPlan?.quota_target || 0
  const pct = quota>0 ? Math.min(Math.round((totalVal/quota)*100),100) : 0

  setText('m-expected', '$'+Math.round(totalExp).toLocaleString())
  setText('m-received', '$'+Math.round(totalRec).toLocaleString())
  setText('m-gap', '$'+Math.round(totalGap).toLocaleString())
  setText('m-quota', pct+'%')

  const deltaRec = document.getElementById('m-received-delta')
  if(deltaRec){
    deltaRec.textContent = pending ? pending+' payout'+(pending>1?'s':'')+' pending' : 'All accounted for'
    deltaRec.className = 'metric-delta '+(pending?'down':'up')
  }

  const deltaGap = document.getElementById('m-gap-delta')
  if(deltaGap){
    deltaGap.textContent = disputed ? disputed+' disputed deal'+(disputed>1?'s':'') : 'No disputes'
    deltaGap.className = 'metric-delta '+(disputed?'down':'up')
  }

  const bar = document.getElementById('quota-bar')
  if(bar) bar.style.width = pct+'%'
  setText('quota-closed', '$'+Math.round(totalVal).toLocaleString()+' closed')
  setText('quota-target', quota>0 ? 'Target: $'+Math.round(quota).toLocaleString() : 'Set quota')
}

function renderHeaderKPI() {
  const totalExp = deals.reduce((s,d)=>s+(d.expected_commission||0),0)
  const totalVal = deals.reduce((s,d)=>s+(d.deal_value||0),0)
  const quota = compPlan?.quota_target || 0
  const pct = quota>0 ? Math.round((totalVal/quota)*100) : 0
  setText('h-expected', '$'+Math.round(totalExp).toLocaleString())
  setText('h-attainment', pct+'%')

  // Commission tab YTD
  setText('ytd-earnings', '$'+Math.round(totalExp).toLocaleString())
  setText('ytd-projected', '$'+Math.round(totalExp*(12/new Date().getMonth()||1)).toLocaleString())
}

/* ============================================ DEALS TABLE */
function renderDealsTable() {
  const tbody = document.getElementById('deals-tbody')
  if(!tbody) return

  if(!deals.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">
      <div class="empty-state">
        <span class="ms empty-icon">receipt_long</span>
        <div class="empty-title">No deals logged yet</div>
        <div class="empty-sub">Click "Log deal" to add your first deal</div>
      </div>
    </td></tr>`
    return
  }

  tbody.innerHTML = deals.map(d => {
    const exp = Math.round(d.expected_commission)
    const gap = Math.round(d.gap)
    const badgeClass = {closed:'badge-closed',pending:'badge-pending',disputed:'badge-disputed'}[d.status] || 'badge-forecast'
    const gapHtml = gap>0 ? `<span class="deal-gap-pos">-$${gap.toLocaleString()}</span>` : `<span class="deal-gap-ok">✓</span>`
    return `<tr>
      <td><div class="deal-name">${escHtml(d.name)}</div><div class="deal-client">${escHtml(d.client||'')}</div></td>
      <td><span class="deal-amount">$${Math.round(d.deal_value).toLocaleString()}</span></td>
      <td><span class="deal-comm">${d.commission_rate}%</span></td>
      <td><span class="deal-amount">$${exp.toLocaleString()}</span></td>
      <td><span class="deal-amount">$${Math.round(d.amount_received).toLocaleString()}</span></td>
      <td><span class="deal-status-badge ${badgeClass}">${d.status}</span></td>
      <td>${gapHtml}</td>
      <td><button class="deal-delete-btn" onclick="deleteDeal('${d.id}')"><span class="ms">delete</span></button></td>
    </tr>`
  }).join('')
}

/* ============================================ ALERTS */
function renderAlerts() {
  const list = document.getElementById('alerts-list')
  if(!list) return

  const disputed = deals.filter(d=>d.status==='disputed'&&d.gap>0)
  const pending = deals.filter(d=>d.status==='pending')

  if(!disputed.length&&!pending.length){
    list.innerHTML = `<div class="no-alerts"><span class="ms">check_circle</span>All clear — no gaps detected</div>`
    return
  }

  list.innerHTML = [
    ...disputed.map(d=>`
      <div class="alert-item danger">
        <div class="alert-dot danger"></div>
        <div>
          <div class="alert-title">Gap — "${escHtml(d.name)}"</div>
          <div class="alert-desc">Paid $${Math.round(d.amount_received).toLocaleString()}, expected $${Math.round(d.expected_commission).toLocaleString()} — shortfall $${Math.round(d.gap).toLocaleString()}</div>
          <button class="alert-btn" onclick="openDisputeFromAlert('${d.id}')">Draft dispute email →</button>
        </div>
      </div>`),
    ...pending.map(d=>`
      <div class="alert-item">
        <div class="alert-dot warn"></div>
        <div>
          <div class="alert-title">Pending — "${escHtml(d.name)}"</div>
          <div class="alert-desc">$${Math.round(d.expected_commission).toLocaleString()} expected from ${escHtml(d.client||'client')}</div>
        </div>
      </div>`)
  ].join('')
}

/* ============================================ PAYOUT TIMELINE */
function renderPayoutTimeline() {
  const el = document.getElementById('payout-timeline')
  if(!el) return

  const pending = deals.filter(d=>d.status==='pending').slice(0,3)
  if(!pending.length){
    el.innerHTML = `<div class="no-alerts"><span class="ms">hourglass_empty</span>No pending payouts</div>`
    return
  }

  el.innerHTML = `<div class="timeline-line"></div>` + pending.map((d,i)=>`
    <div class="timeline-item">
      <div class="timeline-dot ${i===0?'active':''}">
        <div class="timeline-dot-inner"></div>
      </div>
      <div class="timeline-content">
        <div class="timeline-content-row">
          <span class="timeline-date">${escHtml(d.name)}</span>
          <span class="timeline-amount">$${Math.round(d.expected_commission).toLocaleString()}</span>
        </div>
        <div class="timeline-desc">${escHtml(d.client||'')} · ${d.status}</div>
      </div>
    </div>`).join('')
}

/* ============================================ SIMULATOR */
function renderSimulator() {
  updateSimulator()
}

function syncSimSlider(val) {
  document.getElementById('sim-value').value = val
  updateSimulator()
}

function updateSimulator() {
  const val = parseFloat(document.getElementById('sim-value')?.value) || 0
  const slider = document.getElementById('sim-slider')
  if(slider && slider.value != val) slider.value = Math.min(Math.max(val,10000),500000)

  const rate = compPlan?.commission_rate || 8
  const quota = compPlan?.quota_target || 0
  const comm = val * (rate/100)
  const totalVal = deals.reduce((s,d)=>s+(d.deal_value||0),0)
  const newTotal = totalVal + val
  const newPct = quota>0 ? Math.round((newTotal/quota)*100) : 0
  const totalExp = deals.reduce((s,d)=>s+(d.expected_commission||0),0)

  setText('sim-comm', '$'+Math.round(comm).toLocaleString())
  setText('sim-quota', quota>0 ? newPct+'%' : 'Set quota first')
  setText('sim-total', '$'+Math.round(totalExp+comm).toLocaleString())
}

/* ============================================ COMMISSION TAB */
function renderCommissionTab() {
  // Commission table
  const tbody = document.getElementById('commission-tbody')
  if(!tbody) return
  if(!deals.length){
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row"><div class="empty-state"><span class="ms empty-icon">payments</span><div class="empty-title">No deals yet</div></div></td></tr>`
    return
  }
  tbody.innerHTML = deals.map(d=>{
    const exp = Math.round(d.expected_commission)
    const isMultiplied = userPlan==='pro' || userPlan==='career'
    const badgeClass = {closed:'badge-closed',pending:'badge-pending',disputed:'badge-disputed'}[d.status]||'badge-forecast'
    return `<tr>
      <td><div class="deal-name">${escHtml(d.name)}</div><div class="deal-client">${escHtml(d.client||'')}</div></td>
      <td class="deal-amount">$${Math.round(d.deal_value).toLocaleString()}</td>
      <td class="deal-comm">${d.commission_rate}% ($${exp.toLocaleString()})</td>
      <td style="color:var(--green);font-size:12px;">${isMultiplied?'+ Pro plan':'—'}</td>
      <td class="text-right deal-amount" style="font-weight:700;">$${exp.toLocaleString()}</td>
      <td class="text-center"><span class="deal-status-badge ${badgeClass}">${d.status}</span></td>
    </tr>`
  }).join('')

  // Accelerator progress
  const totalVal = deals.reduce((s,d)=>s+(d.deal_value||0),0)
  const quota = compPlan?.quota_target || 0
  const pct = quota>0 ? Math.min(Math.round((totalVal/quota)*100),100) : 0
  const disputed = deals.filter(d=>d.status==='disputed')
  const disputeGap = disputed.reduce((s,d)=>s+(d.gap||0),0)

  setText('accel-closed', '$'+Math.round(totalVal).toLocaleString()+' closed')
  setText('accel-target', 'Target: $'+Math.round(quota).toLocaleString())
  const accelFill = document.getElementById('accel-fill')
  if(accelFill) accelFill.style.width = pct+'%'

  setText('dispute-count', disputed.length+' dispute'+(disputed.length!==1?'s':''))
  setText('dispute-gap', '$'+Math.round(disputeGap).toLocaleString()+' at risk')
  const disputeFill = document.getElementById('dispute-fill')
  if(disputeFill) disputeFill.style.width = Math.min(disputed.length*20, 100)+'%'
}

/* ============================================ PERFORMANCE TAB */
function renderPerformanceTab() {
  // Waterfall
  const stages = [
    {label:'Discovery', val: deals.length * 120000, color:'rgba(122,122,122,0.3)'},
    {label:'Demo', val: deals.length * 90000, color:'rgba(91,185,194,0.3)'},
    {label:'Proposal', val: deals.length * 65000, color:'rgba(98,223,125,0.3)'},
    {label:'Commit', val: deals.filter(d=>d.status==='pending').reduce((s,d)=>s+d.deal_value,0), color:'rgba(0,216,127,0.4)'},
    {label:'Closed Won', val: deals.filter(d=>d.status==='closed').reduce((s,d)=>s+d.deal_value,0), color:'var(--green)'}
  ]

  const maxVal = Math.max(...stages.map(s=>s.val), 1)
  const barsEl = document.getElementById('waterfall-bars')
  const labelsEl = document.getElementById('waterfall-labels')
  if(!barsEl||!labelsEl) return

  barsEl.innerHTML = stages.map(s=>{
    const h = Math.max(Math.round((s.val/maxVal)*100), 4)
    const display = s.val>=1000000 ? '$'+(s.val/1000000).toFixed(1)+'M' : '$'+(s.val/1000).toFixed(0)+'k'
    return `<div class="waterfall-bar-wrap">
      <div class="waterfall-bar-val">${display}</div>
      <div class="waterfall-bar" style="height:${h}%;background:${s.color};border:0.5px solid ${s.color.replace('0.3','0.6').replace('0.4','0.8')}"></div>
    </div>`
  }).join('')

  labelsEl.innerHTML = stages.map(s=>`<div class="waterfall-label">${s.label}</div>`).join('')

  // Key stats
  const statsEl = document.getElementById('perf-stats')
  if(statsEl) {
    const totalVal = deals.reduce((s,d)=>s+(d.deal_value||0),0)
    const totalExp = deals.reduce((s,d)=>s+(d.expected_commission||0),0)
    const avgDeal = deals.length>0 ? Math.round(totalVal/deals.length) : 0
    const quota = compPlan?.quota_target || 0
    const pct = quota>0 ? Math.round((totalVal/quota)*100) : 0
    const accuracy = deals.length>0 ? Math.round((deals.filter(d=>d.gap===0||!d.gap).length/deals.length)*100) : 100

    const stats = [
      {label:'Total deals logged', val: deals.length, class:''},
      {label:'Total revenue generated', val: '$'+totalVal.toLocaleString(), class:'green'},
      {label:'Total commissions expected', val: '$'+Math.round(totalExp).toLocaleString(), class:'green'},
      {label:'Average deal size', val: '$'+avgDeal.toLocaleString(), class:''},
      {label:'Quota attainment', val: pct+'%', class: pct>=100?'green':pct>=75?'':'orange'},
      {label:'Commission accuracy', val: accuracy+'%', class: accuracy>=100?'green':accuracy>=90?'':'orange'},
    ]

    statsEl.innerHTML = stats.map(s=>`
      <div class="perf-stat-row">
        <span class="perf-stat-label">${s.label}</span>
        <span class="perf-stat-val ${s.class}">${s.val}</span>
      </div>`).join('')
  }
}

/* ============================================ AI WORKSPACE */
function renderWorkspaceTab() {
  // Career readiness based on plan and deals
  const readiness = userPlan==='career' ? Math.min(deals.length*10+50, 100) : userPlan==='pro' ? 40 : 20
  setText('career-readiness', readiness+'%')
  const bar = document.getElementById('career-bar')
  if(bar) bar.style.width = readiness+'%'
}

function selectTool(tool) {
  currentTool = tool
  // Update active state
  document.querySelectorAll('.tool-card').forEach(el=>el.classList.remove('active'))
  const btn = document.getElementById('tool-'+tool)
  if(btn) btn.classList.add('active')

  // Reset output
  document.getElementById('editor-output').style.display = 'none'
  document.getElementById('editor-loading').style.display = 'none'
  document.getElementById('editor-inputs').style.display = 'flex'

  const titles = {
    dispute:'Commission Dispute Email',
    raise:'Raise Request Email',
    report:'Performance Report',
    interview:'Interview Coach',
    star:'STAR Answer Generator',
    linkedin:'LinkedIn Profile Audit',
    negotiation:'Salary Negotiation Script'
  }
  setText('active-tool-name', titles[tool] || tool)

  // Build input form
  const inputsEl = document.getElementById('editor-inputs')
  inputsEl.innerHTML = buildToolInputs(tool)
}

function buildToolInputs(tool) {
  if(tool==='dispute') {
    const d = deals.find(d=>d.status==='disputed'&&d.gap>0) || deals[0]
    return `
      <div class="editor-input-grid">
        <div class="form-field"><label class="form-label">Deal name</label><input type="text" id="ti-deal" value="${d?escHtml(d.name):''}" placeholder="Deal name" /></div>
        <div class="form-field"><label class="form-label">Client</label><input type="text" id="ti-client" value="${d?escHtml(d.client||''):''}" placeholder="Client name" /></div>
        <div class="form-field"><label class="form-label">Expected ($)</label><input type="number" id="ti-expected" value="${d?Math.round(d.expected_commission):''}" /></div>
        <div class="form-field"><label class="form-label">Received ($)</label><input type="number" id="ti-received" value="${d?Math.round(d.amount_received):''}" /></div>
      </div>
      <div class="form-field"><label class="form-label">Tone</label><select id="ti-tone"><option>Professional and measured</option><option>Firm and assertive</option><option>Polite and collaborative</option></select></div>`
  }
  if(tool==='raise') {
    const totalVal = deals.reduce((s,d)=>s+(d.deal_value||0),0)
    const quota = compPlan?.quota_target||0
    const pct = quota>0?Math.round((totalVal/quota)*100):0
    return `
      <div class="editor-input-grid">
        <div class="form-field"><label class="form-label">Your role</label><input type="text" id="ti-role" placeholder="e.g. BD Associate" /></div>
        <div class="form-field"><label class="form-label">Time since last raise</label><input type="text" id="ti-time" placeholder="e.g. 14 months" /></div>
        <div class="form-field"><label class="form-label">Quota attainment</label><input type="text" id="ti-quota" value="${pct}%" /></div>
        <div class="form-field"><label class="form-label">Total revenue generated</label><input type="text" id="ti-revenue" value="$${Math.round(totalVal).toLocaleString()}" /></div>
      </div>
      <div class="form-field"><label class="form-label">Additional context</label><input type="text" id="ti-context" placeholder="e.g. Landed 3 enterprise accounts, exceeded quota..." /></div>`
  }
  if(tool==='report') {
    return `<div class="form-field"><label class="form-label">Period</label><select id="ti-period"><option>This month</option><option>This quarter</option><option>This year</option><option>All time</option></select></div>
      <p style="font-size:13px;color:var(--text-2);">Claude will generate a full performance report using your deal data. Click Generate to proceed.</p>`
  }
  if(tool==='interview') {
    return `
      <div class="editor-input-grid">
        <div class="form-field"><label class="form-label">Role applying for <span class="req">*</span></label><input type="text" id="ti-role" placeholder="e.g. Account Executive" /></div>
        <div class="form-field"><label class="form-label">Company</label><input type="text" id="ti-company" placeholder="e.g. Salesforce" /></div>
        <div class="form-field"><label class="form-label">Years of experience</label><input type="text" id="ti-exp" placeholder="e.g. 5 years" /></div>
        <div class="form-field"><label class="form-label">Your background</label><input type="text" id="ti-bg" placeholder="e.g. BD in hospitality, transitioning to tech" /></div>
      </div>
      <div class="form-field"><label class="form-label">Job description highlights <span class="req">*</span></label><input type="text" id="ti-jd" placeholder="e.g. Hunter role, SaaS, enterprise clients, $1M+ quota" /></div>`
  }
  if(tool==='star') {
    return `
      <div class="editor-input-grid">
        <div class="form-field"><label class="form-label">Your role at the time</label><input type="text" id="ti-role" placeholder="e.g. BD Associate" /></div>
        <div class="form-field"><label class="form-label">Interviewing for</label><input type="text" id="ti-target" placeholder="e.g. Account Executive" /></div>
      </div>
      <div class="form-field"><label class="form-label">Describe the situation <span class="req">*</span></label><input type="text" id="ti-situation" placeholder="e.g. Lost a major account, had to win them back in 90 days" /></div>`
  }
  if(tool==='linkedin') {
    return `
      <div class="editor-input-grid">
        <div class="form-field"><label class="form-label">Current role</label><input type="text" id="ti-role" placeholder="e.g. BD Associate, Marriott" /></div>
        <div class="form-field"><label class="form-label">Target roles</label><input type="text" id="ti-target" placeholder="e.g. Account Executive, SaaS" /></div>
        <div class="form-field"><label class="form-label">Key achievements</label><input type="text" id="ti-ach" placeholder="e.g. Grew pipeline 40%, managed $2M in accounts" /></div>
        <div class="form-field"><label class="form-label">Tone</label><select id="ti-tone"><option>Professional but personable</option><option>Bold and confident</option><option>Warm and approachable</option></select></div>
      </div>
      <div class="form-field"><label class="form-label">Current summary (optional)</label><input type="text" id="ti-current" placeholder="Paste your existing LinkedIn About section" /></div>`
  }
  if(tool==='negotiation') {
    return `
      <div class="editor-input-grid">
        <div class="form-field"><label class="form-label">Role offered</label><input type="text" id="ti-role" placeholder="e.g. Account Executive" /></div>
        <div class="form-field"><label class="form-label">Company</label><input type="text" id="ti-company" placeholder="e.g. Salesforce" /></div>
        <div class="form-field"><label class="form-label">Offered salary <span class="req">*</span></label><input type="text" id="ti-offered" placeholder="e.g. $60,000" /></div>
        <div class="form-field"><label class="form-label">Your target <span class="req">*</span></label><input type="text" id="ti-target" placeholder="e.g. $70,000" /></div>
        <div class="form-field"><label class="form-label">Current salary</label><input type="text" id="ti-current" placeholder="e.g. $55,000" /></div>
        <div class="form-field"><label class="form-label">Your strengths</label><input type="text" id="ti-strengths" placeholder="e.g. Exceeded quota 3 years running" /></div>
      </div>`
  }
  return '<p style="color:var(--text-2);">Tool not found.</p>'
}

async function generateFromTool() {
  if(!currentTool){showToast('Select a tool first.','error');return}

  // Career tools require career plan
  const careerTools = ['interview','star','linkedin','negotiation']
  if(careerTools.includes(currentTool) && userPlan!=='career'){
    openUpgradeModal('career')
    return
  }

  // Build data
  let data = {}
  try {
    if(currentTool==='dispute') {
      data = {
        dealName: document.getElementById('ti-deal')?.value||'the deal',
        client: document.getElementById('ti-client')?.value||'',
        expected: document.getElementById('ti-expected')?.value||0,
        received: document.getElementById('ti-received')?.value||0,
        gap: (document.getElementById('ti-expected')?.value||0)-(document.getElementById('ti-received')?.value||0),
        tone: document.getElementById('ti-tone')?.value||'professional'
      }
    } else if(currentTool==='raise') {
      data = {
        totalRevenue: document.getElementById('ti-revenue')?.value||'$0',
        quotaAttainment: document.getElementById('ti-quota')?.value||'0%',
        dealCount: deals.length,
        avgDealSize: deals.length>0?'$'+Math.round(deals.reduce((s,d)=>s+d.deal_value,0)/deals.length).toLocaleString():'$0',
        role: document.getElementById('ti-role')?.value||'Sales Professional',
        timeSinceRaise: document.getElementById('ti-time')?.value||'over 12 months',
        context: document.getElementById('ti-context')?.value||''
      }
    } else if(currentTool==='report') {
      const totalVal = deals.reduce((s,d)=>s+(d.deal_value||0),0)
      const totalExp = deals.reduce((s,d)=>s+(d.expected_commission||0),0)
      const totalRec = deals.reduce((s,d)=>s+(d.amount_received||0),0)
      const quota = compPlan?.quota_target||0
      const topDeal = [...deals].sort((a,b)=>b.deal_value-a.deal_value)[0]
      data = {
        totalDeals: deals.length,
        totalRevenue: Math.round(totalVal).toLocaleString(),
        totalExpected: Math.round(totalExp).toLocaleString(),
        totalReceived: Math.round(totalRec).toLocaleString(),
        totalGap: Math.round(Math.max(totalExp-totalRec,0)).toLocaleString(),
        quotaTarget: Math.round(quota).toLocaleString(),
        quotaAttainment: quota>0?Math.round((totalVal/quota)*100):0,
        disputedDeals: deals.filter(d=>d.status==='disputed').length,
        pendingDeals: deals.filter(d=>d.status==='pending').length,
        topDeal: topDeal?`${topDeal.name} ($${Math.round(topDeal.deal_value).toLocaleString()})`:'N/A',
        period: document.getElementById('ti-period')?.value||'this month'
      }
    } else if(currentTool==='interview') {
      data = {
        role: document.getElementById('ti-role')?.value||'',
        company: document.getElementById('ti-company')?.value||'',
        jobDescription: document.getElementById('ti-jd')?.value||'',
        background: document.getElementById('ti-bg')?.value||'',
        experience: document.getElementById('ti-exp')?.value||''
      }
    } else if(currentTool==='star') {
      data = {
        situation: document.getElementById('ti-situation')?.value||'',
        role: document.getElementById('ti-role')?.value||'',
        targetRole: document.getElementById('ti-target')?.value||''
      }
    } else if(currentTool==='linkedin') {
      data = {
        currentSummary: document.getElementById('ti-current')?.value||'Write from scratch',
        currentRole: document.getElementById('ti-role')?.value||'',
        targetRole: document.getElementById('ti-target')?.value||'',
        achievements: document.getElementById('ti-ach')?.value||'',
        tone: document.getElementById('ti-tone')?.value||'professional'
      }
    } else if(currentTool==='negotiation') {
      data = {
        offeredSalary: document.getElementById('ti-offered')?.value||'',
        targetSalary: document.getElementById('ti-target')?.value||'',
        role: document.getElementById('ti-role')?.value||'',
        company: document.getElementById('ti-company')?.value||'',
        currentSalary: document.getElementById('ti-current')?.value||'',
        strengths: document.getElementById('ti-strengths')?.value||''
      }
    }
  } catch(e) { console.error(e) }

  // Show loading
  document.getElementById('editor-inputs').style.display = 'none'
  document.getElementById('editor-output').style.display = 'none'
  document.getElementById('editor-loading').style.display = 'flex'

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({type: currentTool, data})
    })
    const json = await response.json()
    if(!response.ok||json.error) throw new Error(json.error||'Generation failed')

    document.getElementById('editor-loading').style.display = 'none'
    document.getElementById('editor-output').style.display = 'flex'
    document.getElementById('editor-output-content').innerHTML = formatAIResult(json.result)
  } catch(err) {
    document.getElementById('editor-loading').style.display = 'none'
    document.getElementById('editor-inputs').style.display = 'flex'
    showToast(err.message||'Generation failed. Try again.','error')
  }
}

function copyResult() {
  const el = document.getElementById('editor-output-content')
  if(!el) return
  navigator.clipboard.writeText(el.innerText||el.textContent).then(()=>showToast('Copied!','success'))
}

function printResult() {
  const el = document.getElementById('editor-output-content')
  if(!el) return
  const w = window.open('','_blank')
  w.document.write(`<!DOCTYPE html><html><head><title>Stackd Report</title><style>body{font-family:Inter,sans-serif;max-width:700px;margin:3rem auto;padding:0 2rem;color:#1a1a1a;line-height:1.75;font-size:14px;} h1{font-size:22px;margin-bottom:0.5rem;} .meta{font-size:12px;color:#888;margin-bottom:2rem;padding-bottom:1rem;border-bottom:1px solid #eee;} .ai-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#009955;margin:1.5rem 0 0.5rem;padding-bottom:0.4rem;border-bottom:1px solid #eee;} p{margin-bottom:0.75rem;}</style></head><body><h1>Stackd Report</h1><div class="meta">Generated ${new Date().toLocaleDateString()}</div>${el.innerHTML}</body></html>`)
  w.document.close()
  setTimeout(()=>w.print(),400)
}

function regenerateResult() {
  document.getElementById('editor-output').style.display = 'none'
  document.getElementById('editor-inputs').style.display = 'flex'
}

function formatAIResult(text) {
  if(!text) return ''
  let html = text
  html = html.replace(/^(\d+\.\s+)([^\n]+)/gm, (m,n,t)=>`<div class="ai-section-title">${n}${t}</div>`)
  html = html.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
  html = html.replace(/^[\-•]\s+(.+)/gm,'<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>(\n|$))+/gs, m=>`<ul>${m}</ul>`)
  html = html.replace(/\n\n+/g,'</p><p>')
  html = html.replace(/\n/g,'<br>')
  if(!html.startsWith('<')) html = `<p>${html}</p>`
  return html
}

function openDisputeFromAlert(dealId) {
  const deal = deals.find(d=>d.id===dealId)
  if(!deal) return
  showTab('workspace')
  setTimeout(()=>{
    selectTool('dispute')
    setTimeout(()=>{
      if(document.getElementById('ti-deal')) document.getElementById('ti-deal').value = deal.name
      if(document.getElementById('ti-client')) document.getElementById('ti-client').value = deal.client||''
      if(document.getElementById('ti-expected')) document.getElementById('ti-expected').value = Math.round(deal.expected_commission)
      if(document.getElementById('ti-received')) document.getElementById('ti-received').value = Math.round(deal.amount_received)
    },100)
  },100)
}

/* ============================================ SETTINGS */
async function saveSettings() {
  const name = document.getElementById('settings-name').value.trim()
  const rate = parseFloat(document.getElementById('settings-rate').value)
  const quota = parseFloat(document.getElementById('settings-quota').value)
  const currency = document.getElementById('settings-currency').value
  const newPassword = document.getElementById('settings-password').value

  if(name) {
    await db.from('profiles').update({full_name:name}).eq('id', currentUser.id)
    document.getElementById('sidebar-name').textContent = name
    document.getElementById('sidebar-avatar').textContent = name.charAt(0).toUpperCase()
  }

  if(rate&&quota) {
    const payload = {user_id:currentUser.id, commission_rate:rate, quota_target:quota, currency}
    compPlan ? await db.from('comp_plans').update(payload).eq('user_id', currentUser.id)
             : await db.from('comp_plans').insert(payload)
    await loadCompPlan()
  }

  if(newPassword) {
    if(newPassword.length<6){showToast('Password must be at least 6 characters.','error');return}
    const {error} = await db.auth.updateUser({password:newPassword})
    if(error){showToast(error.message,'error');return}
    document.getElementById('settings-password').value=''
  }

  showToast('Settings saved!','success')
  await loadDeals()
}

/* ============================================ UPGRADE */
function openUpgradeModal(plan) {
  if(!window.Paddle){loadPaddleScript(()=>openUpgradeModal(plan));return}
  Paddle.Checkout.open({
    items:[{priceId:PADDLE_PRICES[plan],quantity:1}],
    customer:{email:currentUser.email},
    settings:{displayMode:'overlay',theme:'dark',successUrl:window.location.href+'?upgraded=true'}
  })
}

function loadPaddleScript(cb) {
  if(window.Paddle){cb();return}
  const s = document.createElement('script')
  s.src='https://cdn.paddle.com/paddle/v2/paddle.js'
  s.onload=()=>{Paddle.Initialize({token:PADDLE_CLIENT_TOKEN});cb()}
  document.head.appendChild(s)
}

/* ============================================ FORM HELPERS */
function toggleAddForm() {
  const form = document.getElementById('add-form')
  const isOpen = form.style.display!=='none'
  form.style.display = isOpen ? 'none' : 'block'
  if(!isOpen) setTimeout(()=>document.getElementById('f-name')?.focus(),50)
}

/* ============================================ UTILITIES */
function setText(id, text) {
  const el = document.getElementById(id)
  if(el) el.textContent = text
}

function showToast(msg, type='') {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.className = 'toast show '+(type||'')
  setTimeout(()=>t.className='toast', 2800)
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

/* ============================================ START */
init()
