/* ============================================================
   SPACE ROBOTIC 3D HERO
   Three.js (r128). Wireframe rotating cyber-globe + starfield.
   With UnrealBloom Post-Processing
   ============================================================ */
(function () {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030613, 0.04);

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 10;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  // --- POST-PROCESSING ---
  const renderScene = new THREE.RenderPass(scene, camera);
  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    1.5, // strength
    0.4, // radius
    0.85 // threshold
  );
  bloomPass.strength = 1.8;
  bloomPass.radius = 0.5;
  bloomPass.threshold = 0.1;

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  const group = new THREE.Group();
  scene.add(group);

  function placeGlobe() { group.position.x = innerWidth > 820 ? 3.5 : 0; }
  placeGlobe();

  /* --- Cyber Globe --- */
  const geo = new THREE.IcosahedronGeometry(3.5, 2);
  
  // Wireframe material with neon glow
  const mat = new THREE.MeshBasicMaterial({ 
    color: 0x00f3ff, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.15 
  });
  
  const globe = new THREE.Mesh(geo, mat);
  group.add(globe);

  // Inner dark core to hide back wireframes slightly
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x030613 });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 2), coreMat);
  group.add(core);

  // Outer orbital rings
  const ringGeo = new THREE.RingGeometry(4.5, 4.52, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = Math.PI / 2;
  group.add(ring1);

  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring2.rotation.y = Math.PI / 2;
  group.add(ring2);

  /* --- Starfield / Data particles --- */
  const COUNT = 1500;
  const pPos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT * 3; i++) {
    pPos[i] = (Math.random() - 0.5) * 40;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ size: 0.05, color: 0x7dd3fc, transparent: true, opacity: 0.8 })
  );
  scene.add(particles);

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  addEventListener("mousemove", (e) => {
    mouse.targetX = (e.clientX / innerWidth - 0.5) * 2;
    mouse.targetY = (e.clientY / innerHeight - 0.5) * 2;
  });
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    placeGlobe();
  });

  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();

    // Rotate globe and rings
    globe.rotation.y = t * 0.2;
    globe.rotation.x = t * 0.1;
    ring1.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.2;
    ring1.rotation.y = Math.cos(t * 0.3) * 0.2;
    ring2.rotation.y = Math.PI / 2 + Math.cos(t * 0.4) * 0.2;
    ring2.rotation.x = Math.sin(t * 0.6) * 0.2;

    // Slowly rotate starfield
    particles.rotation.y = t * 0.02;
    particles.rotation.x = t * 0.01;

    // Smooth mouse easing
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Parallax on camera
    camera.position.x += (mouse.x * 2 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    // Use composer instead of renderer
    composer.render();
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ============================================================
   Custom cursor (crosshair style)
   ============================================================ */
(function () {
  const dot = document.querySelector(".cursor");
  const ring = document.querySelector(".cursor-ring");
  if (!dot || !ring || matchMedia("(hover: none)").matches) return;

  dot.style.width = '4px';
  dot.style.height = '4px';
  dot.style.background = '#00f3ff';
  dot.style.boxShadow = '0 0 10px #00f3ff';
  
  ring.style.border = '1px dashed rgba(0,243,255,0.6)';
  ring.style.borderRadius = '0';
  ring.style.transition = 'width 0.2s, height 0.2s, transform 0.1s linear';

  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });
  (function loop() {
    rx += (mx - rx) * 0.3; ry += (my - ry) * 0.3;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%) rotate(${rx % 90}deg)`;
    requestAnimationFrame(loop);
  })();

  document.querySelectorAll("a, button, .hud-panel").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ring.style.width = '60px';
      ring.style.height = '60px';
      ring.style.borderColor = '#00f3ff';
      ring.style.background = 'rgba(0,243,255,0.05)';
      document.body.style.cursor = 'crosshair';
    });
    el.addEventListener("mouseleave", () => {
      ring.style.width = '40px';
      ring.style.height = '40px';
      ring.style.borderColor = 'rgba(0,243,255,0.5)';
      ring.style.background = 'transparent';
    });
  });
})();

/* ============================================================
   Scroll reveal & HUD elements
   ============================================================ */
(function () {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { 
      if (e.isIntersecting) { 
        e.target.classList.add("in"); 
        io.unobserve(e.target); 
      } 
    }),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

/* ============================================================
   3D tilt on HUD panels
   ============================================================ */
(function () {
  document.querySelectorAll(".hud-panel").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(1000px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-5px) scale(1.02)`;
      card.style.boxShadow = `${-px * 20}px ${py * 20}px 30px rgba(0, 243, 255, 0.1)`;
    });
    card.addEventListener("mouseleave", () => { 
      card.style.transform = ""; 
      card.style.boxShadow = "";
    });
  });
})();
