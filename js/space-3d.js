/* ============================================================
   AE_SYS // ROVER EXPLORATION SIMULATION
   ------------------------------------------------------------
   An interactive, drivable 3D experience. Pilot a hovering
   LiDAR rover across a neon space grid and discover holographic
   data nodes (About / Skills / Projects / Contact).

   Two modes share one scene:
     · AMBIENT  — cinematic background while the page scrolls
     · EXPLORE  — full-screen playable driving sim with HUD

   Three.js r128 + UnrealBloom. No build step. HTML untouched —
   the launch button + HUD are injected at runtime.
   ============================================================ */
(function () {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const C_CYAN = 0x00f3ff;
  const C_GREEN = 0x00ff88;

  /* ------------------------------------------------------------
     SECTION DATA — each becomes a holographic node in the world.
     Content mirrors the page so the sim is a real navigation tool.
  ------------------------------------------------------------ */
  const SECTIONS = [
    {
      id: "about", code: "SYS.BIO // 0x01", title: "About",
      angle: -Math.PI / 2,
      intro: "I turn code into physical action — bridging software and hardware into autonomous systems.",
      lines: [
        "CS student @ Al Akhawayn University, Ifrane, MA.",
        "Wiring circuits, programming microcontrollers, tuning control loops.",
        "Currently exploring SLAM, LiDAR point clouds & edge AI."
      ]
    },
    {
      id: "skills", code: "SYS.CAP // 0x02", title: "Tech Stack",
      angle: -Math.PI / 6,
      intro: "Systems & capabilities — from low-level C++ to robot dashboards.",
      bars: [
        ["C++ & Python", 90], ["ROS / ROS2", 85], ["Embedded (ESP32/STM32)", 80],
        ["Computer Vision", 75], ["Machine Learning", 70], ["Web & Fullstack", 85]
      ]
    },
    {
      id: "p1", code: "PRJ.01 // ROVER", title: "Autonomous Rover",
      angle: Math.PI / 6, link: "projects/project-one.html",
      intro: "A 4-wheeled robot navigating indoors with LiDAR + ROS SLAM to map unknown spaces.",
      tags: ["ROS", "LiDAR", "C++"]
    },
    {
      id: "p2", code: "PRJ.02 // ARM", title: "Vision-Guided Arm",
      angle: Math.PI / 2, link: "projects/project-two.html",
      intro: "A 6-DOF manipulator using inverse kinematics + OpenCV to identify and sort colored objects.",
      tags: ["Python", "OpenCV", "Hardware"]
    },
    {
      id: "p3", code: "PRJ.03 // MESH", title: "Sensor Mesh Network",
      angle: (5 * Math.PI) / 6, link: "projects/project-three.html",
      intro: "An IoT net of ESP32 nodes streaming environmental data to a live web dashboard.",
      tags: ["ESP32", "WebSockets", "IoT"]
    },
    {
      id: "contact", code: "SYS.NET // UPLINK", title: "Establish Uplink",
      angle: Math.PI + Math.PI / 6,
      intro: "Got a hardware project, a robotics startup, or just want to talk tech?",
      links: [
        ["Ping Me", "mailto:a.elarfaoui@aui.ma"],
        ["GitHub", "https://github.com/armex-code"],
        ["LinkedIn", "https://www.linkedin.com/in/ar-elarfaoui/"]
      ]
    }
  ];
  const NODE_RING = 50;       // how far nodes sit from origin
  const DETECT = 9;           // activation radius

  const tickers = [];         // misc per-frame callbacks (declared early — used by builders below)

  /* ------------------------------------------------------------
     RENDERER / SCENE / CAMERA
  ------------------------------------------------------------ */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040c);
  scene.fog = new THREE.Fog(0x02040c, 55, 240);

  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2000);
  camera.position.set(0, 8, 16);

  // post: bloom makes every emissive surface glow
  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.15, 0.7, 0.55);
  composer.addPass(bloom);

  /* ------------------------------------------------------------
     LIGHTS
  ------------------------------------------------------------ */
  scene.add(new THREE.AmbientLight(0x16344f, 1.1));
  const hemi = new THREE.HemisphereLight(0x2266aa, 0x020308, 0.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0x88ccff, 0.8);
  key.position.set(40, 60, 20);
  scene.add(key);

  /* ------------------------------------------------------------
     STARFIELD
  ------------------------------------------------------------ */
  (function buildStars() {
    const N = 2600;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const a = new THREE.Color(0x9fd8ff), b = new THREE.Color(0x4a7bff);
    for (let i = 0; i < N; i++) {
      const r = 300 + Math.random() * 600;
      const th = Math.random() * TAU, ph = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.6 + 30;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const c = a.clone().lerp(b, Math.random());
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({
      size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false
    }));
    stars.renderOrder = -2;
    scene.add(stars);
  })();

  /* ------------------------------------------------------------
     DISTANT PLANET + RING (the "space" anchor in the sky)
  ------------------------------------------------------------ */
  (function buildPlanet() {
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(60, 48, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0a2f5a, emissive: 0x0b3b6e, emissiveIntensity: 0.6,
        roughness: 0.85, metalness: 0.2
      })
    );
    planet.position.set(-160, 110, -320);
    scene.add(planet);

    // glow halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(72, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x1e6fff, transparent: true, opacity: 0.12, side: THREE.BackSide })
    );
    halo.position.copy(planet.position);
    scene.add(halo);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(80, 120, 90),
      new THREE.MeshBasicMaterial({ color: 0x2a8cff, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    ring.position.copy(planet.position);
    ring.rotation.x = Math.PI / 2.3;
    ring.rotation.y = 0.4;
    scene.add(ring);

    // a smaller moon
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(10, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x335577, emissive: 0x112233, roughness: 1 })
    );
    moon.position.set(180, 150, -280);
    scene.add(moon);
  })();

  /* ------------------------------------------------------------
     INFINITE NEON GRID FLOOR (custom shader, follows the rover)
  ------------------------------------------------------------ */
  const gridUniforms = {
    uTime: { value: 0 },
    uRover: { value: new THREE.Vector3() },
    uColorA: { value: new THREE.Color(0x0066aa) },
    uColorB: { value: new THREE.Color(C_CYAN) }
  };
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: gridUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      extensions: { derivatives: true },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform vec3 uRover;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying vec3 vWorld;
        float gridLayer(vec2 p, float s){
          vec2 c = p / s;
          vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
          float l = min(g.x, g.y);
          return 1.0 - min(l, 1.0);
        }
        void main(){
          vec2 p = vWorld.xz;
          float fine = gridLayer(p, 4.0);
          float bold = gridLayer(p, 20.0);
          float g = max(fine * 0.35, bold);
          float d = distance(p, uRover.xz);
          float fade = smoothstep(150.0, 8.0, d);
          // expanding LiDAR scan ring emitted from the rover
          float ring = sin(d * 0.35 - uTime * 2.2);
          ring = smoothstep(0.92, 1.0, ring) * smoothstep(70.0, 4.0, d);
          vec3 col = mix(uColorA, uColorB, bold);
          col += vec3(0.0, 0.9, 1.0) * ring;
          float a = g * fade + ring * 0.7;
          if (a < 0.012) discard;
          gl_FragColor = vec4(col * (1.4 + ring), a);
        }`
    })
  );
  grid.rotation.x = -Math.PI / 2;
  scene.add(grid);

  /* ------------------------------------------------------------
     FLOATING DEBRIS / ASTEROIDS (parallax atmosphere)
  ------------------------------------------------------------ */
  const debris = [];
  (function buildDebris() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x16344f, emissive: 0x06223a, roughness: 0.7, metalness: 0.4, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + Math.random() * 2.4, 0), mat);
      m.position.set((Math.random() - 0.5) * 220, 6 + Math.random() * 40, (Math.random() - 0.5) * 220);
      m.userData.spin = new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4);
      m.userData.float = Math.random() * TAU;
      scene.add(m);
      debris.push(m);
    }
  })();

  // drifting dust motes
  (function buildDust() {
    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = Math.random() * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.12, color: C_CYAN, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    scene.add(dust);
    dust.userData.tick = (t) => { dust.rotation.y = t * 0.02; };
    tickers.push(dust.userData.tick);
  })();

  /* ------------------------------------------------------------
     THE ROVER — a hovering LiDAR pod the player drives
  ------------------------------------------------------------ */
  const rover = new THREE.Group();          // owns world position + heading
  const body = new THREE.Group();           // owns bank/pitch/bob (visual only)
  rover.add(body);
  scene.add(rover);

  const mMetal = new THREE.MeshStandardMaterial({ color: 0x0c1c2e, metalness: 0.85, roughness: 0.32, emissive: 0x041018 });
  const mGlow = new THREE.MeshBasicMaterial({ color: C_CYAN });
  const mGlowG = new THREE.MeshBasicMaterial({ color: C_GREEN });

  // chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 3.4), mMetal);
  chassis.geometry.translate(0, 0, 0);
  body.add(chassis);
  // beveled nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 4), mMetal);
  nose.rotation.x = Math.PI / 2; nose.rotation.z = Math.PI / 4;
  nose.position.set(0, 0, 2.1); nose.scale.set(1, 0.45, 1);
  body.add(nose);
  // glass dome / cockpit
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 24, 16, 0, TAU, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0a3a55, emissive: 0x0a4f78, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.15, transparent: true, opacity: 0.85 })
  );
  dome.position.set(0, 0.32, 0.2); dome.scale.set(1.1, 0.9, 1.3);
  body.add(dome);
  // glowing reactor core (pulses)
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mGlow);
  core.position.set(0, 0.4, 0.2);
  body.add(core);
  // side fins
  [-1, 1].forEach((s) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 2.0), mMetal);
    fin.position.set(s * 1.55, 0, -0.1);
    body.add(fin);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.8), mGlow);
    strip.position.set(s * 1.7, 0.06, -0.1);
    body.add(strip);
  });
  // spinning LiDAR scanner on top
  const scanner = new THREE.Group();
  scanner.position.set(0, 0.7, 0.2);
  body.add(scanner);
  const scMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.4, 12), mMetal);
  scMast.position.y = 0.2; scanner.add(scMast);
  const scRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 8, 28), mGlow);
  scRing.position.y = 0.45; scRing.rotation.x = Math.PI / 2; scanner.add(scRing);
  const scBeam = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.5),
    new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scBeam.position.y = 0.45; scanner.add(scBeam);
  // 4 hover thrusters (glow scales with throttle)
  const thrusters = [];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.4, 14), mMetal);
    pod.position.set(sx * 1.15, -0.35, sz * 1.25);
    body.add(pod);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.9, 12), new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.set(sx * 1.15, -0.85, sz * 1.25);
    flame.rotation.x = Math.PI; // point down
    body.add(flame);
    thrusters.push(flame);
  });
  // antenna with blinker
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), mMetal);
  antenna.position.set(0.9, 0.6, -1.3); body.add(antenna);
  const blinker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), mGlowG);
  blinker.position.set(0.9, 1.1, -1.3); body.add(blinker);

  // forward headlight (spotlight + visible cone volume)
  const headlight = new THREE.SpotLight(0x9fe8ff, 2.4, 60, Math.PI / 6, 0.5, 1.2);
  headlight.position.set(0, 0.4, 2);
  const lightTarget = new THREE.Object3D();
  lightTarget.position.set(0, -0.2, 30);
  body.add(headlight); body.add(lightTarget);
  headlight.target = lightTarget;
  const lightCone = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 26, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x6fd8ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  lightCone.rotation.x = -Math.PI / 2;
  lightCone.position.set(0, 0.1, 14);
  body.add(lightCone);

  // glow pad under rover on the grid
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 32),
    new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  pad.rotation.x = -Math.PI / 2;
  scene.add(pad);

  /* --- thruster trail (recycled point buffer) --- */
  const TRAIL = 90;
  const trailPos = new Float32Array(TRAIL * 3);
  const trailAge = new Float32Array(TRAIL);
  for (let i = 0; i < TRAIL; i++) trailAge[i] = 1;
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute("age", new THREE.BufferAttribute(trailAge, 1));
  const trail = new THREE.Points(trailGeo, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(C_CYAN) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float age; varying float vA;
      void main(){
        vA = 1.0 - age;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(38.0, (1.0 - age) * 26.0 * (1.0 / -mv.z) * 6.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA;
      void main(){
        vec2 d = gl_PointCoord - 0.5; if(length(d) > 0.5) discard;
        gl_FragColor = vec4(uColor, vA * 0.6);
      }`
  }));
  scene.add(trail);
  let trailHead = 0;

  /* ------------------------------------------------------------
     NODES — holographic data beacons
  ------------------------------------------------------------ */
  const nodes = [];
  function makeLabel(text) {
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 128;
    const x = cv.getContext("2d");
    x.font = "bold 54px 'JetBrains Mono', monospace";
    x.fillStyle = "#aef6ff";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.shadowColor = "#00f3ff"; x.shadowBlur = 22;
    x.fillText(text.toUpperCase(), 256, 64);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(7, 1.75, 1);
    return spr;
  }

  SECTIONS.forEach((sec) => {
    const g = new THREE.Group();
    const x = Math.cos(sec.angle) * NODE_RING;
    const z = Math.sin(sec.angle) * NODE_RING;
    g.position.set(x, 0, z);

    // tall beacon column visible from afar
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 60, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    col.position.y = 30; g.add(col);

    // ground ring
    const gring = new THREE.Mesh(
      new THREE.RingGeometry(DETECT - 0.6, DETECT, 48),
      new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    gring.rotation.x = -Math.PI / 2; gring.position.y = 0.05; g.add(gring);

    // floating crystal core
    const cryMat = new THREE.MeshStandardMaterial({ color: 0x06283d, emissive: C_CYAN, emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.2, transparent: true, opacity: 0.9 });
    const cry = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), cryMat);
    cry.position.y = 4.5; g.add(cry);
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 0), new THREE.MeshBasicMaterial({ color: C_CYAN, wireframe: true, transparent: true, opacity: 0.5 }));
    wire.position.y = 4.5; g.add(wire);
    // orbit ring around the crystal
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.05, 8, 40), mGlow.clone());
    orbit.position.y = 4.5; orbit.rotation.x = Math.PI / 2.5; g.add(orbit);

    const label = makeLabel(sec.title);
    label.position.y = 8.4; g.add(label);

    scene.add(g);
    nodes.push({ data: sec, group: g, cry, wire, orbit, gring, cryMat, label, pos: new THREE.Vector3(x, 0, z), discovered: false, pulse: 0 });
  });

  // connection beam (rover -> active node)
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: C_GREEN, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
  beam.visible = false;
  scene.add(beam);

  /* ------------------------------------------------------------
     HUD — injected DOM (keeps experience.html untouched)
  ------------------------------------------------------------ */
  const hud = document.createElement("div");
  hud.id = "sim-hud";
  hud.innerHTML = `
    <div id="sim-status" class="hud-box">
      <div class="row"><span class="k">ROVER</span><b>AE-01 NANOPOD</b></div>
      <div class="row"><span class="k">COORD</span><b id="sim-coord">0, 0</b></div>
      <div class="row"><span class="k">VELOCITY</span><b id="sim-vel">0.0 m/s</b></div>
      <div id="sim-speedbar"><i></i></div>
      <div class="row" style="margin-top:6px"><span class="k">NEAREST</span><b id="sim-near">—</b></div>
    </div>
    <div id="sim-objectives" class="hud-box">
      <div style="margin-bottom:6px"><span class="k">// DATA NODES</span> <b id="sim-count">0/${SECTIONS.length}</b></div>
      ${SECTIONS.map(s => `<div class="obj" data-id="${s.id}"><span class="mark">${s.title}</span><span class="k">${s.code.split("//")[0].trim()}</span></div>`).join("")}
    </div>
    <div id="sim-minimap" class="hud-box">
      <div class="cap">// TACTICAL MAP</div>
      <canvas id="sim-map" width="160" height="160"></canvas>
    </div>
    <div id="sim-foot">
      <div class="keys"><kbd>W A S D</kbd>/<kbd>↑ ↓ ← →</kbd> drive &nbsp; <kbd>SHIFT</kbd> boost &nbsp; <kbd>SCROLL</kbd> zoom &nbsp; <kbd>ESC</kbd> exit</div>
      <button class="sim-btn" id="sim-exit">⏏ Exit Simulation</button>
    </div>
    <div id="sim-reticle"></div>
    <div id="sim-panel"></div>
    <div id="sim-toast"></div>
    <div id="sim-stick"><i></i></div>
    <button id="sim-boost">BOOST</button>
  `;
  document.body.appendChild(hud);

  const frame = document.createElement("div");
  frame.id = "sim-frame";
  frame.innerHTML = "<i></i><i></i><i></i><i></i>";
  document.body.appendChild(frame);

  const $ = (id) => document.getElementById(id);
  const elCoord = $("sim-coord"), elVel = $("sim-vel"), elNear = $("sim-near");
  const elCount = $("sim-count"), elSpeed = $("sim-speedbar").firstElementChild;
  const elPanel = $("sim-panel"), elToast = $("sim-toast");
  const mapCv = $("sim-map"), mapCtx = mapCv.getContext("2d");

  // launch capsule — drop into the hero's CTA row, fallback to fixed
  const launch = document.createElement("button");
  launch.className = "sim-launch";
  launch.innerHTML = `<span class="blip"></span> Launch Rover Simulation`;
  const ctaRow = document.querySelector(".hero .cta");
  if (ctaRow) ctaRow.appendChild(launch);
  else { launch.style.cssText = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:60"; document.body.appendChild(launch); }

  /* ------------------------------------------------------------
     AUDIO — gentle engine hum + discovery chime (WebAudio)
  ------------------------------------------------------------ */
  let audio = null, hum = null, humGain = null, muted = false;
  function initAudio() {
    if (audio) return;
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      hum = audio.createOscillator(); hum.type = "sawtooth"; hum.frequency.value = 50;
      const lp = audio.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
      humGain = audio.createGain(); humGain.gain.value = 0;
      hum.connect(lp); lp.connect(humGain); humGain.connect(audio.destination);
      hum.start();
    } catch (e) { audio = null; }
  }
  function chime(freq, dur, type) {
    if (!audio || muted) return;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.22, audio.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (dur || 0.3));
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + (dur || 0.3));
  }

  /* ------------------------------------------------------------
     INPUT
  ------------------------------------------------------------ */
  const keys = {};
  const touch = { active: false, x: 0, y: 0, boost: false };
  let camDist = 11, camHeight = 6;

  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "enter" && !state.explore && document.activeElement.tagName !== "INPUT") { enterSim(); }
    if (k === "escape" && state.explore) { exitSim(); }
    if (state.explore && ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    keys[k] = true;
  });
  addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

  canvas.addEventListener("wheel", (e) => {
    if (!state.explore) return;
    e.preventDefault();
    camDist = clamp(camDist + Math.sign(e.deltaY) * 1.2, 6, 22);
    camHeight = clamp(camDist * 0.55, 3.5, 12);
  }, { passive: false });

  // mobile joystick
  const stick = $("sim-stick"), stickNub = stick.firstElementChild, boostBtn = $("sim-boost");
  function stickMove(cx, cy) {
    const r = stick.getBoundingClientRect();
    let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
    const max = r.width / 2, m = Math.hypot(dx, dy);
    if (m > max) { dx = dx / m * max; dy = dy / m * max; }
    stickNub.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.x = dx / max; touch.y = dy / max; touch.active = true;
  }
  function stickEnd() { touch.active = false; touch.x = touch.y = 0; stickNub.style.transform = "translate(0,0)"; }
  stick.addEventListener("touchstart", (e) => { e.preventDefault(); stickMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  stick.addEventListener("touchmove", (e) => { e.preventDefault(); stickMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  stick.addEventListener("touchend", stickEnd);
  boostBtn.addEventListener("touchstart", (e) => { e.preventDefault(); touch.boost = true; });
  boostBtn.addEventListener("touchend", () => { touch.boost = false; });

  /* ------------------------------------------------------------
     STATE + MODE TRANSITIONS
  ------------------------------------------------------------ */
  const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const state = {
    explore: false,
    // rover physics
    x: 0, z: 0, heading: 0, speed: 0, steer: 0,
    bank: 0, pitch: 0, bob: 0,
    found: 0, activeNode: null, transition: 0
  };

  function enterSim() {
    if (state.explore) return;
    state.explore = true;
    initAudio();
    if (audio && audio.state === "suspended") audio.resume();
    document.body.classList.add("sim-active");
    if (isTouch) document.body.classList.add("sim-touch");
    requestAnimationFrame(() => { hud.classList.add("show"); frame.classList.add("show"); });
    chime(440, 0.18); setTimeout(() => chime(660, 0.25), 110);
    toast("Simulation Online", "Pilot the rover · discover all data nodes");
  }
  function exitSim() {
    if (!state.explore) return;
    state.explore = false;
    document.body.classList.remove("sim-active", "sim-touch");
    hud.classList.remove("show"); frame.classList.remove("show");
    elPanel.classList.remove("show"); beam.visible = false;
    if (humGain) humGain.gain.value = 0;
    state.activeNode = null;
  }
  launch.addEventListener("click", enterSim);
  $("sim-exit").addEventListener("click", exitSim);

  let toastTimer = null;
  function toast(big, sub) {
    elToast.innerHTML = `<div class="big">${big}</div><div class="sub">${sub || ""}</div>`;
    elToast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove("show"), 2800);
  }

  /* ------------------------------------------------------------
     PANEL RENDERING (per node content)
  ------------------------------------------------------------ */
  function showPanel(node) {
    const d = node.data;
    let html = `<div class="pcode">${d.code}</div><h3>${d.title}</h3><p>${d.intro}</p>`;
    if (d.lines) html += d.lines.map(l => `<div class="pline">${l}</div>`).join("");
    if (d.bars) html += d.bars.map(([n, v]) => `<div style="font-size:.74rem;color:var(--muted);margin-top:8px">${n} <span style="float:right;color:var(--accent)">${v}%</span></div><div class="pbar"><i style="width:${v}%"></i></div>`).join("");
    if (d.tags) html += `<div class="ptags">${d.tags.map(t => `<span>${t}</span>`).join("")}</div>`;
    const btns = [];
    if (d.link) btns.push(`<a class="pbtn" href="${d.link}">Open Dossier →</a>`);
    if (d.links) d.links.forEach(([t, u]) => btns.push(`<a class="pbtn" href="${u}"${u.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`));
    if (btns.length) html += `<div class="pbtns">${btns.join("")}</div>`;
    elPanel.innerHTML = html;
    elPanel.classList.add("show");
  }
  function hidePanel() { elPanel.classList.remove("show"); }

  /* ------------------------------------------------------------
     MINIMAP
  ------------------------------------------------------------ */
  function drawMap() {
    const W = 160, H = 160, cx = W / 2, cy = H / 2, sc = (W / 2 - 12) / (NODE_RING + 14);
    mapCtx.clearRect(0, 0, W, H);
    // rings
    mapCtx.strokeStyle = "rgba(0,243,255,0.18)"; mapCtx.lineWidth = 1;
    [0.45, 0.78, 1].forEach((r) => { mapCtx.beginPath(); mapCtx.arc(cx, cy, (W / 2 - 8) * r, 0, TAU); mapCtx.stroke(); });
    mapCtx.beginPath(); mapCtx.moveTo(cx, 6); mapCtx.lineTo(cx, H - 6); mapCtx.moveTo(6, cy); mapCtx.lineTo(W - 6, cy); mapCtx.stroke();
    // nodes
    nodes.forEach((n) => {
      const px = cx + n.pos.x * sc, py = cy + n.pos.z * sc;
      mapCtx.fillStyle = n.discovered ? "#00ff88" : "rgba(0,243,255,0.55)";
      mapCtx.beginPath(); mapCtx.arc(px, py, n === state.activeNode ? 4.5 : 3, 0, TAU); mapCtx.fill();
      if (n === state.activeNode) { mapCtx.strokeStyle = "#00ff88"; mapCtx.beginPath(); mapCtx.arc(px, py, 7, 0, TAU); mapCtx.stroke(); }
    });
    // rover (triangle pointing heading)
    const rx = cx + state.x * sc, ry = cy + state.z * sc;
    mapCtx.save();
    mapCtx.translate(rx, ry);
    mapCtx.rotate(state.heading);
    mapCtx.fillStyle = "#fff";
    mapCtx.beginPath(); mapCtx.moveTo(0, -6); mapCtx.lineTo(4, 5); mapCtx.lineTo(-4, 5); mapCtx.closePath(); mapCtx.fill();
    mapCtx.restore();
  }

  /* ------------------------------------------------------------
     RESIZE
  ------------------------------------------------------------ */
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });

  /* ------------------------------------------------------------
     MAIN LOOP
  ------------------------------------------------------------ */
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const desiredCam = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  let smoothLook = new THREE.Vector3();
  let mapAcc = 0;

  function update(dt, t) {
    /* --- physics (explore only) --- */
    if (state.explore) {
      let fwd = 0, turn = 0, boost = false;
      if (keys["w"] || keys["arrowup"]) fwd += 1;
      if (keys["s"] || keys["arrowdown"]) fwd -= 1;
      if (keys["a"] || keys["arrowleft"]) turn += 1;
      if (keys["d"] || keys["arrowright"]) turn -= 1;
      if (keys["shift"]) boost = true;
      if (touch.active) { fwd += clamp(-touch.y, -1, 1); turn += clamp(-touch.x, -1, 1); }
      if (touch.boost) boost = true;

      const maxSpeed = boost ? 46 : 28;
      const accel = boost ? 60 : 42;
      state.speed += fwd * accel * dt;
      state.speed *= 0.94;                       // drag
      state.speed = clamp(state.speed, -maxSpeed * 0.5, maxSpeed);
      if (Math.abs(state.speed) < 0.02) state.speed = 0;

      // steering scales a bit with motion for game feel
      const turnRate = 1.9 * (0.4 + Math.min(1, Math.abs(state.speed) / 16));
      state.heading += turn * turnRate * dt * (state.speed >= 0 ? 1 : -1);

      state.x += Math.sin(state.heading) * state.speed * dt;
      state.z += Math.cos(state.heading) * state.speed * dt;

      // visual bank / pitch targets
      state.bank = lerp(state.bank, -turn * 0.32 * Math.min(1, Math.abs(state.speed) / 14), 0.12);
      state.pitch = lerp(state.pitch, -fwd * 0.12, 0.1);

      // engine hum
      if (humGain && !muted) {
        const sp = Math.abs(state.speed) / maxSpeed;
        humGain.gain.value = lerp(humGain.gain.value, 0.015 + sp * 0.06, 0.1);
        hum.frequency.value = 46 + sp * 90;
      }
    } else {
      // ambient drift — rover slowly wanders a gentle circle
      state.heading += dt * 0.12;
      state.speed = 6;
      state.x = Math.sin(t * 0.12) * 10;
      state.z = Math.cos(t * 0.12) * 10;
      state.bank = lerp(state.bank, 0.12, 0.05);
      if (humGain) humGain.gain.value = lerp(humGain.gain.value, 0, 0.1);
    }

    // apply to rover transform
    rover.position.set(state.x, 0, state.z);
    rover.rotation.y = state.heading;
    state.bob = Math.sin(t * 2.2) * 0.12;
    body.position.y = 1.5 + state.bob;
    body.rotation.z = state.bank;
    body.rotation.x = state.pitch;

    // rover sub-animations
    scanner.rotation.y = t * 4.0;
    scBeam.rotation.y = t * 4.0;
    core.scale.setScalar(1 + Math.sin(t * 5) * 0.18);
    blinker.visible = Math.sin(t * 6) > 0;
    const thr = clamp(0.4 + Math.abs(state.speed) / 30, 0.4, 1.4);
    thrusters.forEach((f, i) => { f.scale.set(1, thr + Math.sin(t * 20 + i) * 0.15, 1); f.material.opacity = 0.5 + thr * 0.3; });

    // glow pad follows rover
    pad.position.set(state.x, 0.04, state.z);
    pad.material.opacity = 0.12 + thr * 0.06;

    // grid follows rover, shader scan centered on rover
    grid.position.set(state.x, 0, state.z);
    gridUniforms.uTime.value = t;
    gridUniforms.uRover.value.set(state.x, 0, state.z);

    /* --- trail emission --- */
    for (let i = 0; i < TRAIL; i++) trailAge[i] = Math.min(1, trailAge[i] + dt * 1.4);
    if (Math.abs(state.speed) > 3) {
      const back = 1.4;
      trailPos[trailHead * 3] = state.x - Math.sin(state.heading) * back + (Math.random() - 0.5) * 0.4;
      trailPos[trailHead * 3 + 1] = 0.9 + (Math.random() - 0.5) * 0.2;
      trailPos[trailHead * 3 + 2] = state.z - Math.cos(state.heading) * back + (Math.random() - 0.5) * 0.4;
      trailAge[trailHead] = 0;
      trailHead = (trailHead + 1) % TRAIL;
    }
    trailGeo.attributes.position.needsUpdate = true;
    trailGeo.attributes.age.needsUpdate = true;

    /* --- nodes: spin, bob, proximity --- */
    let nearest = null, nearestD = Infinity, active = null;
    nodes.forEach((n) => {
      n.cry.rotation.y += dt * 0.8; n.cry.rotation.x += dt * 0.3;
      n.wire.rotation.y -= dt * 0.5; n.wire.rotation.z += dt * 0.2;
      n.orbit.rotation.z += dt * 1.2;
      n.cry.position.y = n.wire.position.y = 4.5 + Math.sin(t * 1.5 + n.pos.x) * 0.3;
      n.label.material.rotation = 0;

      const d = Math.hypot(state.x - n.pos.x, state.z - n.pos.z);
      if (d < nearestD) { nearestD = d; nearest = n; }

      if (state.explore && d < DETECT) {
        active = active || n;
        n.pulse = Math.min(1, n.pulse + dt * 3);
        if (!n.discovered) {
          n.discovered = true;
          state.found++;
          const obj = hud.querySelector(`.obj[data-id="${n.data.id}"]`);
          if (obj) obj.classList.add("done");
          elCount.textContent = `${state.found}/${SECTIONS.length}`;
          // recolor to green
          n.cryMat.emissive.setHex(C_GREEN);
          n.wire.material.color.setHex(C_GREEN);
          n.gring.material.color.setHex(C_GREEN);
          n.orbit.material.color.setHex(C_GREEN);
          chime(523, 0.12); setTimeout(() => chime(784, 0.25), 90);
          toast(`Node Acquired: ${n.data.title}`, n.data.code);
          if (state.found === SECTIONS.length) {
            setTimeout(() => { toast("Sector Fully Mapped", "All systems online · uplink complete"); chime(659, 0.5, "triangle"); celebrate(); }, 900);
          }
        }
      } else {
        n.pulse = Math.max(0, n.pulse - dt * 2);
      }
      // pulse visuals
      const ps = 1 + n.pulse * 0.25 + Math.sin(t * 6) * 0.04 * n.pulse;
      n.cry.scale.setScalar(ps); n.wire.scale.setScalar(ps);
      n.gring.material.opacity = 0.3 + n.pulse * 0.5 + Math.sin(t * 4) * 0.1;
    });

    // panel + beam for active node
    if (state.explore && active) {
      if (state.activeNode !== active) { state.activeNode = active; showPanel(active); }
      beam.visible = true;
      const bp = beam.geometry.attributes.position.array;
      bp[0] = state.x; bp[1] = 1.5; bp[2] = state.z;
      bp[3] = active.pos.x; bp[4] = 4.5; bp[5] = active.pos.z;
      beam.geometry.attributes.position.needsUpdate = true;
      beam.material.opacity = 0.4 + Math.sin(t * 10) * 0.3;
    } else if (state.activeNode) {
      state.activeNode = null; hidePanel(); beam.visible = false;
    }

    /* --- debris drift --- */
    debris.forEach((m) => {
      m.rotation.x += m.userData.spin.x * dt;
      m.rotation.y += m.userData.spin.y * dt;
      m.position.y += Math.sin(t * 0.5 + m.userData.float) * 0.01;
    });
    tickers.forEach((fn) => fn(t));

    /* --- camera --- */
    if (state.explore) {
      const fx = Math.sin(state.heading), fz = Math.cos(state.heading);
      desiredCam.set(state.x - fx * camDist, camHeight + 2, state.z - fz * camDist);
      camera.position.lerp(desiredCam, 1 - Math.pow(0.001, dt));
      lookAt.set(state.x + fx * 6, 2 + state.bob, state.z + fz * 6);
    } else {
      const a = t * 0.18;
      desiredCam.set(state.x + Math.cos(a) * 18, 9, state.z + Math.sin(a) * 18);
      camera.position.lerp(desiredCam, 1 - Math.pow(0.02, dt));
      lookAt.set(state.x, 2.5, state.z);
    }
    smoothLook.lerp(lookAt, 1 - Math.pow(0.002, dt));
    camera.lookAt(smoothLook);

    /* --- HUD text --- */
    if (state.explore) {
      elCoord.textContent = `${state.x.toFixed(0)}, ${state.z.toFixed(0)}`;
      elVel.textContent = `${Math.abs(state.speed).toFixed(1)} m/s`;
      elSpeed.style.width = `${clamp(Math.abs(state.speed) / 46 * 100, 0, 100)}%`;
      if (nearest) elNear.textContent = nearest.discovered ? `${nearest.data.title} ✓` : `${nearest.data.title} · ${nearestD.toFixed(0)}m`;
      mapAcc += dt;
      if (mapAcc > 0.05) { drawMap(); mapAcc = 0; }
    }
  }

  function celebrate() {
    const emojis = ["✦", "✧", "◈", "◇", "⬡", "⬢", "✺"];
    for (let i = 0; i < 60; i++) {
      const s = document.createElement("span");
      s.textContent = emojis[(Math.random() * emojis.length) | 0];
      s.style.cssText = `position:fixed;left:${Math.random() * 100}vw;top:-40px;color:${Math.random() > 0.5 ? "#00f3ff" : "#00ff88"};font-size:${12 + Math.random() * 22}px;z-index:9991;pointer-events:none;text-shadow:0 0 10px currentColor;transition:transform 2.6s ease-in,opacity 2.6s;`;
      document.body.appendChild(s);
      requestAnimationFrame(() => { s.style.transform = `translateY(112vh) rotate(${Math.random() * 720 - 360}deg)`; s.style.opacity = "0"; });
      setTimeout(() => s.remove(), 2800);
    }
  }

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt, clock.elapsedTime);
    composer.render();
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ============================================================
   Custom cursor (crosshair) — page scrolling experience
   ============================================================ */
(function () {
  const dot = document.querySelector(".cursor");
  const ring = document.querySelector(".cursor-ring");
  if (!dot || !ring || matchMedia("(hover: none)").matches) return;

  dot.style.width = "4px"; dot.style.height = "4px";
  dot.style.background = "#00f3ff"; dot.style.boxShadow = "0 0 10px #00f3ff";
  ring.style.border = "1px dashed rgba(0,243,255,0.6)";
  ring.style.borderRadius = "0";
  ring.style.transition = "width 0.2s, height 0.2s, transform 0.1s linear";

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
      ring.style.width = "60px"; ring.style.height = "60px";
      ring.style.borderColor = "#00ff88"; ring.style.background = "rgba(0,255,136,0.05)";
    });
    el.addEventListener("mouseleave", () => {
      ring.style.width = "40px"; ring.style.height = "40px";
      ring.style.borderColor = "rgba(0,243,255,0.5)"; ring.style.background = "transparent";
    });
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
    card.addEventListener("mouseleave", () => { card.style.transform = ""; card.style.boxShadow = ""; });
  });
})();
