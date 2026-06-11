(function() {
  const container = document.getElementById('hero-3d-canvas')
  if (!container || typeof THREE === 'undefined') return

  const W = container.clientWidth || 500
  const H = container.clientHeight || 520

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
  camera.position.set(0, 0, 8)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  container.appendChild(renderer.domElement)
  renderer.domElement.style.cursor = 'pointer'
  renderer.domElement.addEventListener('click', () => window.location.href = 'app.html')

  // ── CANVAS TEXTURE HELPER ────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x+r, y)
    ctx.lineTo(x+w-r, y)
    ctx.quadraticCurveTo(x+w, y, x+w, y+r)
    ctx.lineTo(x+w, y+h-r)
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h)
    ctx.lineTo(x+r, y+h)
    ctx.quadraticCurveTo(x, y+h, x, y+h-r)
    ctx.lineTo(x, y+r)
    ctx.quadraticCurveTo(x, y, x+r, y)
    ctx.closePath()
  }

  function makeTex(lines, cw, ch, glowColor) {
    const s = 2 // supersampling
    const canvas = document.createElement('canvas')
    canvas.width = cw * s
    canvas.height = ch * s
    const ctx = canvas.getContext('2d')
    ctx.scale(s, s)

    // Glass fill
    const bg = ctx.createLinearGradient(0, 0, cw, ch)
    bg.addColorStop(0, 'rgba(0,35,20,0.82)')
    bg.addColorStop(1, 'rgba(0,18,10,0.90)')
    roundRect(ctx, 0, 0, cw, ch, 18)
    ctx.fillStyle = bg
    ctx.fill()

    // Inner glow
    const glow = ctx.createRadialGradient(cw*0.35, ch*0.25, 0, cw*0.35, ch*0.25, cw*0.75)
    const gc = glowColor || '#00D87F'
    glow.addColorStop(0, gc.replace(')', ',0.22)').replace('rgb','rgba'))
    glow.addColorStop(0.5, gc.replace(')', ',0.08)').replace('rgb','rgba'))
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    roundRect(ctx, 0, 0, cw, ch, 18)
    ctx.fillStyle = glow
    ctx.fill()

    // Edge rim — bright top, dimmer bottom
    ctx.save()
    roundRect(ctx, 1, 1, cw-2, ch-2, 17)
    ctx.clip()
    const rim = ctx.createLinearGradient(0, 0, 0, ch)
    rim.addColorStop(0, 'rgba(0,255,140,0.55)')
    rim.addColorStop(0.3, 'rgba(0,255,140,0.12)')
    rim.addColorStop(1, 'rgba(0,80,40,0.08)')
    ctx.strokeStyle = rim
    ctx.lineWidth = 1.5
    roundRect(ctx, 0.75, 0.75, cw-1.5, ch-1.5, 17.25)
    ctx.stroke()
    ctx.restore()

    // Specular gleam top-left
    const gleam = ctx.createLinearGradient(0, 0, cw*0.5, ch*0.4)
    gleam.addColorStop(0, 'rgba(255,255,255,0.12)')
    gleam.addColorStop(1, 'rgba(255,255,255,0)')
    roundRect(ctx, 0, 0, cw*0.5, ch*0.45, 18)
    ctx.fillStyle = gleam
    ctx.fill()

    // Text
    lines.forEach(l => {
      ctx.font = `${l.weight||700} ${l.size||32}px "DM Sans","Inter",sans-serif`
      ctx.fillStyle = l.color || '#ffffff'
      ctx.globalAlpha = l.alpha || 1
      ctx.fillText(l.text, l.x, l.y)
      ctx.globalAlpha = 1
    })

    const t = new THREE.CanvasTexture(canvas)
    t.needsUpdate = true
    return t
  }

  // ── CARD FACTORY ─────────────────────────────────────
  // Each card = face plane (canvas texture) + depth box shell
  function makeCard(w, h, depth, lines, glowHex, texW, texH) {
    const group = new THREE.Group()
    const gc = '#' + glowHex.toString(16).padStart(6, '0')

    // Face — bright canvas texture on a MeshBasicMaterial (always bright, no lighting needed)
    const faceMat = new THREE.MeshBasicMaterial({
      map: makeTex(lines, texW || Math.round(w*160), texH || Math.round(h*160), gc),
      transparent: true,
      opacity: 0.96,
    })
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat)
    face.position.z = depth / 2 + 0.001
    group.add(face)

    // Back face (darker)
    const backMat = new THREE.MeshBasicMaterial({
      color: 0x001a0d,
      transparent: true,
      opacity: 0.7,
    })
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), backMat)
    back.position.z = -depth / 2 - 0.001
    back.rotation.y = Math.PI
    group.add(back)

    // Side edges — thin glowing planes
    const edgeColor = new THREE.Color(glowHex)
    const edgeMat = new THREE.MeshBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.6 })
    const sides = [
      { size: [depth, h], pos: [w/2, 0, 0], rot: [0, Math.PI/2, 0] },
      { size: [depth, h], pos: [-w/2, 0, 0], rot: [0, -Math.PI/2, 0] },
      { size: [w, depth], pos: [0, h/2, 0], rot: [-Math.PI/2, 0, 0] },
      { size: [w, depth], pos: [0, -h/2, 0], rot: [Math.PI/2, 0, 0] },
    ]
    sides.forEach(s => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(...s.size), edgeMat.clone())
      m.position.set(...s.pos)
      m.rotation.set(...s.rot)
      group.add(m)
    })

    // Glow halo — large plane behind card, rendered with additive blending
    const haloCanvas = document.createElement('canvas')
    haloCanvas.width = 256; haloCanvas.height = 256
    const hc = haloCanvas.getContext('2d')
    const hg = hc.createRadialGradient(128, 128, 0, 128, 128, 128)
    hg.addColorStop(0, gc.replace(')', ',0.55)').replace('rgb','rgba') )
    hg.addColorStop(0.4, gc.replace(')', ',0.18)').replace('rgb','rgba'))
    hg.addColorStop(1, 'rgba(0,0,0,0)')
    hc.fillStyle = hg
    hc.fillRect(0, 0, 256, 256)
    const haloTex = new THREE.CanvasTexture(haloCanvas)
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.8, h * 2.8), haloMat)
    halo.position.z = depth / 2 - 0.05
    group.add(halo)

    group._haloMat = haloMat
    group._faceMat = faceMat
    group._edgeMats = group.children.slice(2, 6).map(c => c.material)
    group._glowColor = new THREE.Color(glowHex)
    group._hovered = 0

    return group
  }

  // ── BUILD CARDS ──────────────────────────────────────
  const cardGroup = new THREE.Group()
  scene.add(cardGroup)

  // Card 1 — main: Commission Discrepancy Detected
  const c1 = makeCard(3.5, 2.0, 0.14, [
    { text: 'COMMISSION DISCREPANCY', size: 22, weight: 600, color: 'rgba(255,255,255,0.5)', x: 36, y: 58 },
    { text: 'DETECTED', size: 22, weight: 600, color: 'rgba(255,255,255,0.5)', x: 36, y: 90 },
    { text: '+$4,820', size: 88, weight: 800, color: '#00D87F', x: 28, y: 215 },
  ], 0x00D87F, 560, 320)
  c1.position.set(0, 0.55, 1.4)
  c1.rotation.set(-0.1, 0.07, 0.02)
  cardGroup.add(c1)

  // Card 2 — Commission Gap
  const c2 = makeCard(2.4, 1.2, 0.11, [
    { text: 'COMMISSION GAP', size: 18, weight: 600, color: 'rgba(255,255,255,0.45)', x: 28, y: 44 },
    { text: '-$320', size: 72, weight: 800, color: '#FF6B35', x: 24, y: 148 },
  ], 0xFF6B35, 384, 192)
  c2.position.set(2.05, -0.2, 0.35)
  c2.rotation.set(-0.03, -0.3, 0.01)
  cardGroup.add(c2)

  // Card 3 — Closed Won
  const c3 = makeCard(2.6, 1.1, 0.1, [
    { text: 'CLOSED WON', size: 17, weight: 600, color: 'rgba(255,255,255,0.45)', x: 28, y: 42 },
    { text: '$12,500', size: 64, weight: 700, color: '#ffffff', x: 24, y: 130 },
  ], 0x00D87F, 416, 176)
  c3.position.set(-2.1, -0.7, -0.3)
  c3.rotation.set(0.04, 0.33, -0.01)
  cardGroup.add(c3)

  // Card 4 — Quota Progress
  const c4 = makeCard(2.15, 1.1, 0.1, [
    { text: 'QUOTA PROGRESS', size: 16, weight: 600, color: 'rgba(255,255,255,0.45)', x: 26, y: 40 },
    { text: '68%', size: 72, weight: 800, color: '#00D87F', x: 24, y: 138 },
  ], 0x00D87F, 344, 176)
  c4.position.set(2.15, -1.2, -0.1)
  c4.rotation.set(0.07, -0.24, 0)
  cardGroup.add(c4)

  // Card 5 — Pending
  const c5 = makeCard(2.3, 0.95, 0.09, [
    { text: 'PENDING', size: 15, weight: 600, color: 'rgba(255,255,255,0.4)', x: 26, y: 36 },
    { text: '$640', size: 58, weight: 700, color: '#ffffff', x: 24, y: 110 },
  ], 0x00D87F, 368, 152)
  c5.position.set(-0.35, -1.55, -0.7)
  c5.rotation.set(0.12, 0.04, 0)
  cardGroup.add(c5)

  const allCards = [c1, c2, c3, c4, c5]

  // ── HOVER DETECTION ──────────────────────────────────
  const raycaster = new THREE.Raycaster()
  const mouse2D = new THREE.Vector2()
  let hoveredCard = null

  renderer.domElement.addEventListener('mousemove', e => {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse2D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse2D.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse2D, camera)
    // Ray against face planes only (first child of each group)
    const faces = allCards.map(c => c.children[0])
    const hits = raycaster.intersectObjects(faces)
    hoveredCard = hits.length > 0 ? hits[0].object.parent : null
  })
  renderer.domElement.addEventListener('mouseleave', () => hoveredCard = null)

  // ── PARTICLES ────────────────────────────────────────
  const pg = new THREE.BufferGeometry()
  const ppos = new Float32Array(180 * 3)
  for (let i = 0; i < 180; i++) {
    ppos[i*3] = (Math.random()-.5)*10
    ppos[i*3+1] = (Math.random()-.5)*8
    ppos[i*3+2] = (Math.random()-.5)*5
  }
  pg.setAttribute('position', new THREE.BufferAttribute(ppos, 3))
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({
    color: 0x00D87F, size: 0.025, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })))

  // ── MOUSE + ANIMATION ────────────────────────────────
  let mx = 0, my = 0, crx = 0, cry = 0
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - .5) * 2
    my = -(e.clientY / window.innerHeight - .5) * 2
  })

  let f = 0
  const _v3 = new THREE.Vector3()

  function animate() {
    f++
    requestAnimationFrame(animate)

    // Group tilt
    crx += (my * 0.17 - crx) * 0.055
    cry += (mx * 0.25 - cry) * 0.055
    cardGroup.rotation.x = crx
    cardGroup.rotation.y = cry
    cardGroup.position.y = Math.sin(f * 0.007) * 0.08

    // Per-card hover
    allCards.forEach(card => {
      const target = card === hoveredCard ? 1 : 0
      card._hovered += (target - card._hovered) * 0.1

      const h = card._hovered

      // Halo opacity — this is the full card glow
      card._haloMat.opacity = h * 0.9

      // Edge brightness
      card._edgeMats.forEach(m => { m.opacity = 0.6 + h * 0.4 })

      // Scale up slightly
      const s = 1 + h * 0.04
      card.scale.set(s, s, s)

      // Lift toward camera
      const baseZ = card === c1 ? 1.4 : card === c2 ? 0.35 : card === c3 ? -0.3 : card === c4 ? -0.1 : -0.7
      card.position.z += (baseZ + h * 0.35 - card.position.z) * 0.1
    })

    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('resize', () => {
    const nw = container.clientWidth, nh = container.clientHeight
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
    renderer.setSize(nw, nh)
  })

})()
