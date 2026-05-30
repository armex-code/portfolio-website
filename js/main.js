/* ============================================================
   3D HERO — Three.js particle field + rotating wireframe core
   Mouse-reactive camera, runs on the #bg-canvas behind content
   ============================================================ */
(function () {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.06);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 9;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  /* --- floating particle field --- */
  const COUNT = 1400;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT * 3; i++) positions[i] = (Math.random() - 0.5) * 26;
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.05, color: 0x7c5cff, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* --- glowing wireframe icosahedron core --- */
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.4, 1),
    new THREE.MeshBasicMaterial({ color: 0x19e3c2, wireframe: true, transparent: true, opacity: 0.55 })
  );
  scene.add(core);

  const coreInner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 0),
    new THREE.MeshBasicMaterial({ color: 0xff4d8d, wireframe: true, transparent: true, opacity: 0.35 })
  );
  scene.add(coreInner);

  /* --- mouse parallax --- */
  const mouse = { x: 0, y: 0 };
  addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / innerHeight - 0.5) * 2;
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();
    particles.rotation.y = t * 0.04;
    particles.rotation.x = t * 0.02;
    core.rotation.x = t * 0.25;
    core.rotation.y = t * 0.18;
    coreInner.rotation.x = -t * 0.3;
    coreInner.rotation.y = -t * 0.22;
    const s = 1 + Math.sin(t * 1.5) * 0.04;
    core.scale.setScalar(s);

    camera.position.x += (mouse.x * 1.6 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 1.2 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ============================================================
   Scroll reveal
   ============================================================ */
(function () {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

/* ============================================================
   Card 3D tilt on hover (pointer-based)
   ============================================================ */
(function () {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-8px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
})();

/* ============================================================
   Tiny easter-egg button → emoji confetti burst
   ============================================================ */
function partyTime() {
  const emojis = ["✨", "🚀", "🔥", "💜", "🌀", "⚡", "🪐", "💫"];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement("span");
    s.textContent = emojis[(Math.random() * emojis.length) | 0];
    s.style.cssText =
      "position:fixed;left:" + (Math.random() * 100) + "vw;top:-40px;font-size:" +
      (14 + Math.random() * 22) + "px;z-index:999;pointer-events:none;transition:transform 2.2s ease-in,opacity 2.2s;";
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      s.style.transform = "translateY(110vh) rotate(" + (Math.random() * 720 - 360) + "deg)";
      s.style.opacity = "0";
    });
    setTimeout(() => s.remove(), 2400);
  }
}
