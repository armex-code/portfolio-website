/* ============================================================
   3D HERO — morphing iridescent blob + particle field
   Three.js (r128). Vertices displaced by layered trig "noise"
   each frame → organic liquid motion. MeshNormalMaterial gives
   the iridescent rainbow surface. Mouse-parallax camera.
   ============================================================ */
(function () {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 7;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const group = new THREE.Group();
  scene.add(group);
  // push the blob toward the right so hero text stays readable on the left
  function placeBlob() { group.position.x = innerWidth > 820 ? 2.6 : 0; }
  placeBlob();

  /* --- morphing blob --- */
  const DETAIL = innerWidth > 820 ? 5 : 4;
  const geo = new THREE.IcosahedronGeometry(2.1, DETAIL);
  const base = Float32Array.from(geo.attributes.position.array); // pristine copy
  const blob = new THREE.Mesh(geo, new THREE.MeshNormalMaterial({ flatShading: false }));
  group.add(blob);

  // faint wireframe shell for depth
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.2, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.05 })
  );
  group.add(shell);

  function noise(x, y, z, t) {
    return (
      Math.sin(x * 1.3 + t) * 0.5 +
      Math.sin(y * 1.7 + t * 1.2) * 0.3 +
      Math.sin(z * 1.1 + t * 0.8) * 0.4 +
      Math.sin((x + y) * 0.9 + t * 0.6) * 0.3
    );
  }

  /* --- particles --- */
  const COUNT = 900;
  const pPos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT * 3; i++) pPos[i] = (Math.random() - 0.5) * 30;
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ size: 0.045, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })
  );
  scene.add(particles);

  const mouse = { x: 0, y: 0 };
  addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / innerHeight - 0.5) * 2;
  });
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    placeBlob();
  });

  const pos = geo.attributes.position;
  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime() * 0.45;

    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3;
      const x = base[ix], y = base[ix + 1], z = base[ix + 2];
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len, ny = y / len, nz = z / len;
      const d = len + noise(nx * 1.6, ny * 1.6, nz * 1.6, t) * 0.42;
      pos.array[ix] = nx * d;
      pos.array[ix + 1] = ny * d;
      pos.array[ix + 2] = nz * d;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    group.rotation.y = t * 0.5;
    group.rotation.x = Math.sin(t * 0.3) * 0.2;
    shell.rotation.y = -t * 0.3;
    particles.rotation.y = t * 0.04;

    camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 0.9 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ============================================================
   Custom cursor (dot + lerping ring, grows over interactives)
   ============================================================ */
(function () {
  const dot = document.querySelector(".cursor");
  const ring = document.querySelector(".cursor-ring");
  if (!dot || !ring || matchMedia("(hover: none)").matches) return;

  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });
  (function loop() {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();

  document.querySelectorAll("a, button, [data-tilt]").forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("hover"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hover"));
  });
})();

/* ============================================================
   Scroll reveal
   ============================================================ */
(function () {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

/* ============================================================
   3D tilt on project cards
   ============================================================ */
(function () {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
})();

/* ============================================================
   Magnetic buttons — gently pull toward the cursor
   ============================================================ */
(function () {
  if (matchMedia("(hover: none)").matches) return;
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });
})();

/* ============================================================
   Tiny easter-egg button → emoji confetti burst
   ============================================================ */
function partyTime() {
  const emojis = ["✨", "🚀", "🔥", "💫", "🌀", "⚡", "🪐", "💚"];
  for (let i = 0; i < 46; i++) {
    const s = document.createElement("span");
    s.textContent = emojis[(Math.random() * emojis.length) | 0];
    s.style.cssText =
      "position:fixed;left:" + (Math.random() * 100) + "vw;top:-40px;font-size:" +
      (14 + Math.random() * 24) + "px;z-index:9990;pointer-events:none;transition:transform 2.4s ease-in,opacity 2.4s;";
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      s.style.transform = "translateY(112vh) rotate(" + (Math.random() * 720 - 360) + "deg)";
      s.style.opacity = "0";
    });
    setTimeout(() => s.remove(), 2600);
  }
}
