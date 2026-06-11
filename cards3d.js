(function() {
  const container = document.getElementById('hero-3d-canvas')
  if (!container || typeof THREE === 'undefined') return

  // Wait a frame so container has its final dimensions
  requestAnimationFrame(function() {

  const W = container.clientWidth || 560
  const H = container.clientHeight || 580

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100)
  camera.position.set(0, 0, 7.5)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.sortObjects = true
  container.appendChild(renderer.domElement)
  renderer.domElement.style.cursor = 'pointer'
  renderer.domElement.addEventListener('click', () => window.location.href = 'app.html')

  // ── CANVAS HELPERS ───────────────────────────────────
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y)
    ctx.closePath()
  }

  function makeTex(drawFn, pw, ph) {
    const s = 2
    const cv = document.createElement('canvas')
    cv.width = pw * s; cv.height = ph * s
    const ctx = cv.getContext('2d')
    ctx.scale(s, s)
    drawFn(ctx, pw, ph)
    const t = new THREE.CanvasTexture(cv)
    t.needsUpdate = true
    return t
  }

  // Dark glass look — barely-there tint, readable text
  function glassBase(ctx, w, h, tintHex) {
    // Near-opaque dark fill — this is what keeps text readable
    ctx.fillStyle = 'rgba(4,14,10,0.91)'
    rr(ctx, 0, 0, w, h, 20)
    ctx.fill()

    // Very subtle tinted gradient overlay — just a hint, not a flood
    const ov = ctx.createLinearGradient(0, 0, w, h)
    ov.addColorStop(0, tintHex + '14') // 8% opacity
    ov.addColorStop(1, tintHex + '06') // 2% opacity
    rr(ctx, 0, 0, w, h, 20)
    ctx.fillStyle = ov
    ctx.fill()

    // Specular gleam — top-left bright streak
    const gl = ctx.createLinearGradient(0, 0, w * 0.6, h * 0.45)
    gl.addColorStop(0, 'rgba(255,255,255,0.09)')
    gl.addColorStop(0.5, 'rgba(255,255,255,0.03)')
    gl.addColorStop(1, 'rgba(255,255,255,0)')
    rr(ctx, 0, 0, w * 0.6, h * 0.45, 20)
    ctx.fillStyle = gl
    ctx.fill()

    // Top edge bright rim
    const rim = ctx.createLinearGradient(0, 0, 0, h)
    rim.addColorStop(0, tintHex + 'CC')   // 80% at top
    rim.addColorStop(0.08, tintHex + '33') // 20% quick fade
    rim.addColorStop(1, tintHex + '0A')    // ~4% at bottom
    ctx.strokeStyle = rim
    ctx.lineWidth = 1.2
    rr(ctx, 0.6, 0.6, w - 1.2, h - 1.2, 19.4)
    ctx.stroke()
  }

  function label(ctx, text, x, y, size, color, alpha) {
    ctx.font = `600 ${size}px "DM Sans","Inter",sans-serif`
    ctx.fillStyle = color || 'rgba(255,255,255,0.45)'
    ctx.globalAlpha = alpha || 1
    ctx.fillText(text, x, y)
    ctx.globalAlpha = 1
  }

  function bigNum(ctx, text, x, y, size, color) {
    ctx.font = `800 ${size}px "DM Sans","Inter",sans-serif`
    ctx.fillStyle = color || '#ffffff'
    ctx.fillText(text, x, y)
  }

  function divider(ctx, y, w) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(w - 20, y); ctx.stroke()
  }

  function dot(ctx, x, y, color) {
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  function pill(ctx, text, x, y, bg, fg) {
    ctx.font = '600 10px "DM Sans","Inter",sans-serif'
    const tw = ctx.measureText(text).width
    const pw = tw + 14, ph = 16
    ctx.fillStyle = bg
    rr(ctx, x, y - 12, pw, ph, 8)
    ctx.fill()
    ctx.fillStyle = fg
    ctx.fillText(text, x + 7, y)
  }

  function progressBar(ctx, x, y, totalW, h, pct, color) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    rr(ctx, x, y, totalW, h, h/2); ctx.fill()
    ctx.fillStyle = color
    rr(ctx, x, y, totalW * pct, h, h/2); ctx.fill()
  }

  // ── CARD TEXTURES ────────────────────────────────────

  // Card 1: Full pay slip — the hero card
  function drawCard1(ctx, w, h) {
    glassBase(ctx, w, h, '#00D87F')

    // Header row
    label(ctx, 'Alex M.', 24, 34, 14, '#ffffff', 1)
    label(ctx, 'BD Associate · Q3 2026', 24, 52, 11, 'rgba(255,255,255,0.45)')
    // Live dot + label top right
    dot(ctx, w - 70, 26, '#00D87F')
    label(ctx, 'tracking live', w - 60, 30, 10, '#00D87F')

    divider(ctx, 62, w)

    // Big number
    label(ctx, 'YOU ARE OWED', 24, 88, 10, 'rgba(255,255,255,0.38)')
    bigNum(ctx, '$4,820', 22, 150, 62, '#ffffff')
    label(ctx, 'across 4 deals this month', 24, 168, 11, 'rgba(255,255,255,0.4)')

    divider(ctx, 178, w)

    // Deal lines
    const deals = [
      { name: 'Acme Corp renewal', amt: '+$3,200', color: '#00D87F', dotColor: '#00D87F' },
      { name: 'Marriott MENA Q3', amt: '+$1,480', color: '#00D87F', dotColor: '#00D87F' },
      { name: 'F&B Partnership Q2', amt: '−$320', color: '#FF6B35', dotColor: '#FF6B35', tag: 'gap' },
      { name: 'Corporate travel', amt: '$640', color: 'rgba(255,255,255,0.3)', dotColor: 'rgba(255,255,255,0.2)', tag: 'pending' },
    ]
    deals.forEach((d, i) => {
      const y = 202 + i * 28
      dot(ctx, 30, y - 4, d.dotColor)
      label(ctx, d.name, 44, y, 12, 'rgba(255,255,255,0.7)')
      // Amount right-aligned
      ctx.font = '700 12px "DM Sans","Inter",sans-serif'
      ctx.fillStyle = d.color
      ctx.textAlign = 'right'
      ctx.fillText(d.amt, w - (d.tag ? 50 : 20), y)
      ctx.textAlign = 'left'
      if (d.tag === 'gap') pill(ctx, 'gap', w - 44, y, 'rgba(255,107,53,0.18)', '#FF6B35')
      if (d.tag === 'pending') pill(ctx, 'pending', w - 58, y, 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0.4)')
      if (i < 3) divider(ctx, y + 10, w)
    })

    divider(ctx, 315, w)

    // Footer: quota bar + gap note
    label(ctx, 'QUOTA', 24, 334, 9, 'rgba(255,255,255,0.35)')
    progressBar(ctx, 70, 325, w - 90, 6, 0.68, '#00D87F')
    label(ctx, '68%', w - 16, 334, 10, '#00D87F')
    ctx.textAlign = 'right'

    label(ctx, '$320 gap detected', 24, 354, 10, 'rgba(255,107,53,0.9)')

    // Draft dispute button
    const btnX = w - 130, btnY = 342, btnW = 108, btnH = 20
    ctx.fillStyle = 'rgba(0,216,127,0.12)'
    rr(ctx, btnX, btnY, btnW, btnH, 10); ctx.fill()
    ctx.strokeStyle = 'rgba(0,216,127,0.35)'; ctx.lineWidth = 0.8
    rr(ctx, btnX, btnY, btnW, btnH, 10); ctx.stroke()
    ctx.font = '600 10px "DM Sans","Inter",sans-serif'
    ctx.fillStyle = '#00D87F'; ctx.textAlign = 'center'
    ctx.fillText('draft dispute →', btnX + btnW/2, btnY + 13)
    ctx.textAlign = 'left'
  }

  // Card 2: Commission Gap
  function drawCard2(ctx, w, h) {
    glassBase(ctx, w, h, '#FF6B35')
    label(ctx, 'COMMISSION GAP', 22, 36, 10, 'rgba(255,255,255,0.4)')
    bigNum(ctx, '−$320', 20, 108, 58, '#FF6B35')
    divider(ctx, 120, w)
    label(ctx, 'F&B Partnership Q2', 22, 140, 12, 'rgba(255,255,255,0.55)')
    label(ctx, 'Paid $1,360 · Owed $1,680', 22, 158, 10, 'rgba(255,255,255,0.35)')
    label(ctx, '1 of 1 disputes active', 22, 174, 10, 'rgba(255,107,53,0.8)')
  }

  // Card 3: Closed Won
  function drawCard3(ctx, w, h) {
    glassBase(ctx, w, h, '#00D87F')
    label(ctx, 'CLOSED WON', 22, 34, 10, 'rgba(255,255,255,0.4)')
    bigNum(ctx, '$12,500', 20, 102, 54, '#ffffff')
    divider(ctx, 112, w)
    label(ctx, 'Acme Corp renewal', 22, 132, 12, 'rgba(255,255,255,0.6)')
    label(ctx, '+$3,200 commission', 22, 150, 10, '#00D87F')
    label(ctx, 'Marriott MENA Q3', 22, 166, 12, 'rgba(255,255,255,0.6)')
    label(ctx, '+$1,480 commission', 22, 184, 10, '#00D87F')
  }

  // Card 4: Quota Progress
  function drawCard4(ctx, w, h) {
    glassBase(ctx, w, h, '#00D87F')
    label(ctx, 'QUOTA PROGRESS', 22, 34, 10, 'rgba(255,255,255,0.4)')
    bigNum(ctx, '68%', 20, 104, 62, '#00D87F')
    divider(ctx, 114, w)
    progressBar(ctx, 22, 126, w - 44, 8, 0.68, '#00D87F')
    label(ctx, '$12,500 of $18,400 target', 22, 152, 10, 'rgba(255,255,255,0.4)')
    label(ctx, 'On track for Q3', 22, 168, 10, 'rgba(0,216,127,0.7)')
  }

  // Card 5: Pending
  function drawCard5(ctx, w, h) {
    glassBase(ctx, w, h, '#00D87F')
    label(ctx, 'PENDING', 22, 32, 10, 'rgba(255,255,255,0.4)')
    bigNum(ctx, '$640', 20, 96, 54, 'rgba(255,255,255,0.65)')
    divider(ctx, 106, w)
    label(ctx, 'Corporate travel block', 22, 126, 12, 'rgba(255,255,255,0.55)')
    label(ctx, 'Awaiting confirmation', 22, 144, 10, 'rgba(255,255,255,0.3)')
  }

  // ── CARD MESH FACTORY ────────────────────────────────
  function makeCard(cw, ch, depth, drawFn, texW, texH, glowHex) {
    const group = new THREE.Group()

    // Face — MeshBasicMaterial, always bright, no lighting dependency
    const faceTex = makeTex(drawFn, texW, texH)
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(cw, ch),
      new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, opacity: 0.98 })
    )
    face.position.z = depth / 2 + 0.002
    group.add(face)

    // Thin side edges — glowing slivers
    const ec = new THREE.Color(glowHex)
    const edgeMat = () => new THREE.MeshBasicMaterial({ color: ec, transparent: true, opacity: 0.5 })
    ;[
      { g: new THREE.PlaneGeometry(depth, ch), p: [cw/2,0,0], r: [0,Math.PI/2,0] },
      { g: new THREE.PlaneGeometry(depth, ch), p: [-cw/2,0,0], r: [0,-Math.PI/2,0] },
      { g: new THREE.PlaneGeometry(cw, depth), p: [0,ch/2,0], r: [-Math.PI/2,0,0] },
      { g: new THREE.PlaneGeometry(cw, depth), p: [0,-ch/2,0], r: [Math.PI/2,0,0] },
    ].forEach(s => {
      const m = new THREE.Mesh(s.g, edgeMat())
      m.position.set(...s.p); m.rotation.set(...s.r)
      group.add(m)
    })

    // Back — dark glass
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(cw, ch),
      new THREE.MeshBasicMaterial({ color: 0x020c07, transparent: true, opacity: 0.85 })
    )
    back.position.z = -depth / 2 - 0.001
    back.rotation.y = Math.PI
    group.add(back)

    // No halo plane — glow is edge-only to avoid rectangular cutoff artifact

    group._face = face
    group._faceMat = face.material
    group._haloMat = null  // no halo plane
    group._edgeMats = group.children.slice(1, 5).map(c => c.material)
    group._hovered = 0
    group._baseZ = 0
    group._glowHex = glowHex

    return group
  }

  // ── BUILD SCENE ──────────────────────────────────────
  const cardGroup = new THREE.Group()
  scene.add(cardGroup)

  const c1 = makeCard(3.6, 2.15, 0.13, drawCard1, 580, 380, 0x00D87F)
  c1.position.set(0, 0.5, 1.4); c1.rotation.set(-0.1, 0.07, 0.02)
  c1._baseZ = 1.4; cardGroup.add(c1)

  const c2 = makeCard(2.5, 1.3, 0.11, drawCard2, 400, 208, 0xFF6B35)
  c2.position.set(2.05, -0.15, 0.35); c2.rotation.set(-0.03,-0.3,0.01)
  c2._baseZ = 0.35; cardGroup.add(c2)

  const c3 = makeCard(2.65, 1.25, 0.1, drawCard3, 424, 200, 0x00D87F)
  c3.position.set(-2.1, -0.65, -0.3); c3.rotation.set(0.04,0.33,-0.01)
  c3._baseZ = -0.3; cardGroup.add(c3)

  const c4 = makeCard(2.2, 1.2, 0.1, drawCard4, 352, 192, 0x00D87F)
  c4.position.set(2.1, -1.2, -0.1); c4.rotation.set(0.07,-0.24,0)
  c4._baseZ = -0.1; cardGroup.add(c4)

  const c5 = makeCard(2.35, 1.0, 0.09, drawCard5, 376, 160, 0x00D87F)
  c5.position.set(-0.3, -1.55, -0.7); c5.rotation.set(0.12,0.04,0)
  c5._baseZ = -0.7; cardGroup.add(c5)

  const allCards = [c1, c2, c3, c4, c5]

  // ── HOVER ────────────────────────────────────────────
  const raycaster = new THREE.Raycaster()
  const m2 = new THREE.Vector2()
  let hovered = null

  renderer.domElement.addEventListener('mousemove', e => {
    const r = renderer.domElement.getBoundingClientRect()
    m2.x = ((e.clientX - r.left) / r.width) * 2 - 1
    m2.y = -((e.clientY - r.top) / r.height) * 2 + 1
    raycaster.setFromCamera(m2, camera)
    const faces = allCards.map(c => c._face)
    const hits = raycaster.intersectObjects(faces)
    hovered = hits.length ? hits[0].object.parent : null
  })
  renderer.domElement.addEventListener('mouseleave', () => hovered = null)

  // ── PARTICLES ────────────────────────────────────────
  const pg = new THREE.BufferGeometry()
  const pp = new Float32Array(180*3)
  for (let i=0;i<180;i++){pp[i*3]=(Math.random()-.5)*10;pp[i*3+1]=(Math.random()-.5)*8;pp[i*3+2]=(Math.random()-.5)*5}
  pg.setAttribute('position', new THREE.BufferAttribute(pp,3))
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({
    color:0x00D87F, size:0.022, transparent:true, opacity:0.45,
    blending:THREE.AdditiveBlending, depthWrite:false
  })))

  // ── ANIMATE ──────────────────────────────────────────
  let mx=0,my=0,crx=0,cry=0,f=0
  document.addEventListener('mousemove', e => {
    mx=(e.clientX/window.innerWidth-.5)*2
    my=-(e.clientY/window.innerHeight-.5)*2
  })

  function animate() {
    f++; requestAnimationFrame(animate)
    crx += (my*.17-crx)*.055
    cry += (mx*.25-cry)*.055
    cardGroup.rotation.x = crx
    cardGroup.rotation.y = cry
    cardGroup.position.y = Math.sin(f*.007)*.08

    allCards.forEach(card => {
      const target = card === hovered ? 1 : 0
      card._hovered += (target - card._hovered) * 0.1
      const h = card._hovered

      // Edge glow — bright on hover, dim at rest
      card._edgeMats.forEach(m => {
        m.opacity = 0.3 + h * 0.7
      })

      // Face — very slightly brighter/more opaque on hover
      card._faceMat.opacity = 0.95 + h * 0.04

      // Scale + lift
      const s = 1 + h * 0.06
      card.scale.set(s, s, s)
      card.position.z += (card._baseZ + h * 1.2 - card.position.z) * 0.1

      // Render order — hovered card always draws on top
      const ro = h > 0.05 ? 999 : 0
      card.traverse(obj => {
        obj.renderOrder = ro
        if(obj.material) obj.material.depthTest = ro === 0
      })
    })

    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('resize', () => {
    const nw=container.clientWidth, nh=container.clientHeight
    camera.aspect=nw/nh; camera.updateProjectionMatrix(); renderer.setSize(nw,nh)
  })

  }) // end requestAnimationFrame
})()
