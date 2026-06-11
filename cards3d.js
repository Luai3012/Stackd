/* ============================================
   STACKD — 3D GLASS CARDS
   Three.js scene replacing the hero visual
   Matches the ad: thick glass slabs, subsurface
   green glow, perspective stacking, mouse tilt
============================================ */

(function() {
  const container = document.getElementById('hero-3d-canvas')
  if (!container) return

  // Wait for Three.js to load
  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded')
    return
  }

  const W = container.clientWidth
  const H = container.clientHeight

  // Scene
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
  camera.position.set(0, 0, 7)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  container.appendChild(renderer.domElement)

  // Mouse tracking
  let mx = 0, my = 0
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2
    my = -(e.clientY / window.innerHeight - 0.5) * 2
  })

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.15)
  scene.add(ambientLight)

  // Main green point light — emanates from behind/below like the ad
  const greenLight = new THREE.PointLight(0x00D87F, 8, 12)
  greenLight.position.set(0, -1, 2)
  scene.add(greenLight)

  // Rim light
  const rimLight = new THREE.PointLight(0x00D87F, 3, 15)
  rimLight.position.set(-3, 3, 1)
  scene.add(rimLight)

  // Secondary cool fill
  const fillLight = new THREE.PointLight(0x0a4433, 2, 20)
  fillLight.position.set(3, -2, -2)
  scene.add(fillLight)

  // Helper: create a glass card mesh
  function makeCard(w, h, depth, color, emissive, opacity) {
    const geo = new THREE.BoxGeometry(w, h, depth, 1, 1, 1)
    const mat = new THREE.MeshPhysicalMaterial({
      color: color,
      emissive: emissive,
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      thickness: depth * 2,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      envMapIntensity: 1.5,
      ior: 1.5,
    })
    return new THREE.Mesh(geo, mat)
  }

  // Helper: create a canvas texture for card text
  function makeTextTexture(lines, options = {}) {
    const {
      width = 512,
      height = 256,
      bgColor = 'rgba(0,0,0,0)',
      textColor = '#ffffff',
      accentColor = '#00D87F',
      labelColor = 'rgba(255,255,255,0.5)',
    } = options

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    // Background
    ctx.clearRect(0, 0, width, height)

    // Subtle glass inner glow
    const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width*0.6)
    grad.addColorStop(0, 'rgba(0,216,127,0.06)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // Text rendering
    lines.forEach(line => {
      ctx.font = `${line.weight || '700'} ${line.size || 32}px "DM Sans", "Inter", sans-serif`
      ctx.fillStyle = line.accent ? accentColor : line.label ? labelColor : textColor
      ctx.textAlign = line.align || 'left'
      ctx.letterSpacing = line.tracking || '0px'
      ctx.fillText(line.text, line.x, line.y)
    })

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }

  // Create card group
  const cardGroup = new THREE.Group()
  scene.add(cardGroup)

  // === CARD 1 — MAIN: Commission Discrepancy (front, center, tilted) ===
  const card1 = makeCard(3.2, 1.8, 0.12, 0x0a2a1a, 0x003322, 0.75)
  const tex1 = makeTextTexture([
    { text: 'COMMISSION DISCREPANCY', size: 28, weight: '700', x: 30, y: 60, tracking: '2px' },
    { text: 'DETECTED', size: 28, weight: '700', x: 30, y: 100, tracking: '2px' },
    { text: '+$4,820', size: 72, weight: '800', accent: true, x: 30, y: 200, align: 'left' },
  ], { width: 640, height: 256, accentColor: '#00D87F' })

  card1.material.map = tex1
  card1.material.needsUpdate = true
  card1.position.set(0, 0.4, 1.2)
  card1.rotation.x = -0.12
  card1.rotation.y = 0.08

  // Edge highlight on card1 — brighter rim
  const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.2, 1.8, 0.12))
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x00D87F, transparent: true, opacity: 0.4 })
  const edges1 = new THREE.LineSegments(edgeGeo, edgeMat)
  card1.add(edges1)

  // Green glow mesh behind card1
  const glowGeo = new THREE.PlaneGeometry(4.5, 2.8)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x00D87F,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  })
  const glowPlane = new THREE.Mesh(glowGeo, glowMat)
  glowPlane.position.set(0, 0, 0.8)

  // Actual glow via point light directly behind
  const card1Glow = new THREE.PointLight(0x00D87F, 6, 6)
  card1Glow.position.set(0, 0, 0.6)
  scene.add(card1Glow)

  cardGroup.add(card1)

  // === CARD 2 — Commission Gap (right, tilted back) ===
  const card2 = makeCard(2.2, 1.1, 0.1, 0x1a0a08, 0x220800, 0.65)
  const tex2 = makeTextTexture([
    { text: 'COMMISSION GAP', size: 22, weight: '600', x: 24, y: 50, label: true, tracking: '1px' },
    { text: '-$320', size: 64, weight: '800', x: 24, y: 130, align: 'left' },
  ], { width: 512, height: 192, textColor: '#FF6B35', accentColor: '#FF6B35' })
  card2.material.map = tex2
  card2.material.color.setHex(0x1a0c0a)
  card2.material.emissive.setHex(0x220a06)
  card2.position.set(1.8, -0.3, 0.2)
  card2.rotation.x = -0.05
  card2.rotation.y = -0.25

  const edgeGeo2 = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 1.1, 0.1))
  const edgeMat2 = new THREE.LineBasicMaterial({ color: 0xFF6B35, transparent: true, opacity: 0.3 })
  card2.add(new THREE.LineSegments(edgeGeo2, edgeMat2))
  cardGroup.add(card2)

  // === CARD 3 — Closed Won (left, behind) ===
  const card3 = makeCard(2.4, 1.0, 0.09, 0x0a0f0a, 0x071207, 0.55)
  const tex3 = makeTextTexture([
    { text: 'CLOSED WON', size: 20, weight: '600', x: 24, y: 44, label: true, tracking: '1px' },
    { text: '$12,500', size: 58, weight: '700', x: 24, y: 120, align: 'left' },
  ], { width: 512, height: 192 })
  card3.material.map = tex3
  card3.position.set(-1.9, -0.7, -0.4)
  card3.rotation.x = 0.05
  card3.rotation.y = 0.3
  cardGroup.add(card3)

  // === CARD 4 — Quota Progress (right bottom) ===
  const card4 = makeCard(2.0, 1.0, 0.09, 0x0a0f0a, 0x071207, 0.55)
  const tex4 = makeTextTexture([
    { text: 'QUOTA PROGRESS', size: 18, weight: '600', x: 24, y: 40, label: true, tracking: '1px' },
    { text: '68%', size: 64, weight: '800', x: 24, y: 120, align: 'left' },
  ], { width: 512, height: 192 })
  card4.material.map = tex4
  card4.position.set(2.0, -1.2, -0.2)
  card4.rotation.x = 0.08
  card4.rotation.y = -0.2
  cardGroup.add(card4)

  // === CARD 5 — Pending (bottom center, furthest back) ===
  const card5 = makeCard(2.2, 0.9, 0.08, 0x0a0f0a, 0x071207, 0.45)
  const tex5 = makeTextTexture([
    { text: 'PENDING', size: 18, weight: '600', x: 24, y: 38, label: true, tracking: '1px' },
    { text: '$640', size: 52, weight: '700', x: 24, y: 108, align: 'left' },
  ], { width: 512, height: 160 })
  card5.material.map = tex5
  card5.position.set(-0.3, -1.4, -0.8)
  card5.rotation.x = 0.12
  card5.rotation.y = 0.05
  cardGroup.add(card5)

  // Particle system — floating green dust
  const particleCount = 120
  const particleGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 8
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleMat = new THREE.PointsMaterial({
    color: 0x00D87F,
    size: 0.025,
    transparent: true,
    opacity: 0.5,
  })
  const particles = new THREE.Points(particleGeo, particleMat)
  scene.add(particles)

  // Animation
  let frame = 0
  let targetRotX = 0, targetRotY = 0
  let currentRotX = 0, currentRotY = 0

  function animate() {
    frame++
    requestAnimationFrame(animate)

    // Mouse-tracked group rotation — smooth lerp
    targetRotY = mx * 0.25
    targetRotX = my * 0.15
    currentRotX += (targetRotX - currentRotX) * 0.06
    currentRotY += (targetRotY - currentRotY) * 0.06

    cardGroup.rotation.x = currentRotX
    cardGroup.rotation.y = currentRotY

    // Breathe — subtle float
    cardGroup.position.y = Math.sin(frame * 0.008) * 0.06

    // Card1 glow breathe
    card1Glow.intensity = 5 + Math.sin(frame * 0.02) * 1.5

    // Particle drift
    particles.rotation.y = frame * 0.001
    particles.rotation.x = frame * 0.0005

    // Green light follows mouse
    greenLight.position.x = mx * 2
    greenLight.position.y = my * 1.5

    renderer.render(scene, camera)
  }

  animate()

  // Resize
  window.addEventListener('resize', () => {
    const W = container.clientWidth
    const H = container.clientHeight
    camera.aspect = W / H
    camera.updateProjectionMatrix()
    renderer.setSize(W, H)
  })

})()
