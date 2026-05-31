/* ============================================================
   AE_SYS // ROVER RUN — a game version of the portfolio
   ------------------------------------------------------------
   Pilot a hovering LiDAR rover down a walled neon corridor.
   · Smash physics-driven obstacle stacks for points.
   · Collect holographic DATA NODES (the real portfolio content).
   · Reach the finish gate to complete the run.

   Three.js r128 + UnrealBloom. No build step. Self contained.
   ============================================================ */
(function () {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const C_CYAN = 0x00f3ff;
  const C_GREEN = 0x00ff88;
  const C_AMBER = 0xffae3b;

  /* ------------------------------------------------------------
     WORLD CONSTANTS — a straight, walled lane.
  ------------------------------------------------------------ */
  const LANE = 14;          // half-width of the drivable corridor
  const WALL_H = 7;         // wall height
  const TRACK_LEN = 300;    // finish line distance (+Z)
  const START_Z = -6;       // rover spawn / back wall
  const ROVER_R = 2.2;      // rover collision radius
  const DETECT = 7;         // data-node pickup radius
  const GRAVITY = -42;      // obstacle physics

  const PTS_NODE = 150;     // score per data node
  const PTS_OBSTACLE = 50;  // score per toppled obstacle
  const PTS_FINISH = 1000;  // finish bonus

  /* ------------------------------------------------------------
     SECTION DATA — each becomes a collectible node along the lane.
     Content mirrors the portfolio so the game IS the portfolio.
  ------------------------------------------------------------ */
  const SECTIONS = [
    {
      id: "about", code: "SYS.BIO // 0x01", title: "About", z: 42, x: -7,
      intro: "I turn code into physical action — bridging software and hardware into autonomous systems.",
      lines: [
        "CS student @ Al Akhawayn University, Ifrane, MA.",
        "Wiring circuits, programming microcontrollers, tuning control loops.",
        "Currently exploring SLAM, LiDAR point clouds & edge AI."
      ]
    },
    {
      id: "skills", code: "SYS.CAP // 0x02", title: "Tech Stack", z: 90, x: 7,
      intro: "Systems & capabilities — from low-level C++ to robot dashboards.",
      bars: [
        ["C++ & Python", 90], ["ROS / ROS2", 85], ["Embedded (ESP32/STM32)", 80],
        ["Computer Vision", 75], ["Machine Learning", 70], ["Web & Fullstack", 85]
      ]
    },
    {
      id: "p1", code: "PRJ.01 // ROVER", title: "Autonomous Rover", z: 138, x: -7,
      link: "projects/project-one.html",
      intro: "A 4-wheeled robot navigating indoors with LiDAR + ROS SLAM to map unknown spaces.",
      tags: ["ROS", "LiDAR", "C++"]
    },
    {
      id: "p2", code: "PRJ.02 // ARM", title: "Vision-Guided Arm", z: 186, x: 7,
      link: "projects/project-two.html",
      intro: "A 6-DOF manipulator using inverse kinematics + OpenCV to identify and sort colored objects.",
      tags: ["Python", "OpenCV", "Hardware"]
    },
    {
      id: "p3", code: "PRJ.03 // MESH", title: "Sensor Mesh Network", z: 234, x: -7,
      link: "projects/project-three.html",
      intro: "An IoT net of ESP32 nodes streaming environmental data to a live web dashboard.",
      tags: ["ESP32", "WebSockets", "IoT"]
    },
    {
      id: "contact", code: "SYS.NET // UPLINK", title: "Establish Uplink", z: 278, x: 0,
      intro: "Got a hardware project, a robotics startup, or just want to talk tech?",
      links: [
        ["Ping Me", "mailto:a.elarfaoui@aui.ma"],
        ["GitHub", "https://github.com/armex-code"],
        ["LinkedIn", "https://www.linkedin.com/in/ar-elarfaoui/"]
      ]
    }
  ];

  const tickers = [];

  /* ------------------------------------------------------------
     RENDERER / SCENE / CAMERA
  ------------------------------------------------------------ */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040c);
  scene.fog = new THREE.Fog(0x02040c, 60, 260);

  const camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.1, 2000);
  camera.position.set(0, 8, -10);

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.1, 0.7, 0.55);
  composer.addPass(bloom);

  /* ------------------------------------------------------------
     LIGHTS
  ------------------------------------------------------------ */
  scene.add(new THREE.AmbientLight(0x16344f, 1.1));
  scene.add(new THREE.HemisphereLight(0x2266aa, 0x020308, 0.7));
  const key = new THREE.DirectionalLight(0x88ccff, 0.8);
  key.position.set(40, 60, 20);
  scene.add(key);

  /* ------------------------------------------------------------
     STARFIELD
  ------------------------------------------------------------ */
  (function buildStars() {
    const N = 2200;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const a = new THREE.Color(0x9fd8ff), b = new THREE.Color(0x4a7bff);
    for (let i = 0; i < N; i++) {
      const r = 300 + Math.random() * 600;
      const th = Math.random() * TAU, ph = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.6 + 30;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) + TRACK_LEN * 0.4;
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
     DISTANT PLANET (the "space" anchor in the sky, ahead of you)
  ------------------------------------------------------------ */
  (function buildPlanet() {
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(60, 48, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a2f5a, emissive: 0x0b3b6e, emissiveIntensity: 0.6, roughness: 0.85, metalness: 0.2 })
    );
    planet.position.set(-150, 120, TRACK_LEN + 120);
    scene.add(planet);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(80, 120, 90),
      new THREE.MeshBasicMaterial({ color: 0x2a8cff, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    ring.position.copy(planet.position);
    ring.rotation.x = Math.PI / 2.3; ring.rotation.y = 0.4;
    scene.add(ring);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(10, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x335577, emissive: 0x112233, roughness: 1 })
    );
    moon.position.set(170, 150, TRACK_LEN + 60);
    scene.add(moon);
  })();

  /* ------------------------------------------------------------
     NEON GRID FLOOR (custom shader, follows the rover)
  ------------------------------------------------------------ */
  const gridUniforms = {
    uTime: { value: 0 },
    uRover: { value: new THREE.Vector3() },
    uColorA: { value: new THREE.Color(0x0066aa) },
    uColorB: { value: new THREE.Color(C_CYAN) }
  };
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: gridUniforms, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, extensions: { derivatives: true },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime; uniform vec3 uRover; uniform vec3 uColorA; uniform vec3 uColorB;
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
          float fade = smoothstep(170.0, 8.0, d);
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
     THE WALLS — two long neon barriers down each side of the lane
  ------------------------------------------------------------ */
  function buildWall(side) {
    const g = new THREE.Group();
    const len = TRACK_LEN - START_Z + 20;
    const midZ = (START_Z + TRACK_LEN) / 2;

    // solid translucent panel
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, WALL_H, len),
      new THREE.MeshStandardMaterial({
        color: 0x081a2e, emissive: 0x0a2c4a, emissiveIntensity: 0.6,
        metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.55
      })
    );
    panel.position.set(side * LANE, WALL_H / 2, midZ);
    g.add(panel);

    // glowing top + bottom rails
    [WALL_H - 0.15, 0.15].forEach((y) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.18, len),
        new THREE.MeshBasicMaterial({ color: C_CYAN })
      );
      rail.position.set(side * LANE, y, midZ);
      g.add(rail);
    });

    // vertical pillar accents every 12 units
    for (let z = START_Z; z <= TRACK_LEN; z += 12) {
      const pil = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, WALL_H, 0.5),
        new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.25 })
      );
      pil.position.set(side * LANE, WALL_H / 2, z);
      g.add(pil);
    }
    scene.add(g);
  }
  buildWall(-1); buildWall(1);

  // back wall (behind the start) + finish gate built later
  (function backWall() {
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(LANE * 2, WALL_H, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x081a2e, emissive: 0x0a2c4a, emissiveIntensity: 0.5, metalness: 0.7, roughness: 0.4, transparent: true, opacity: 0.6 })
    );
    w.position.set(0, WALL_H / 2, START_Z);
    scene.add(w);
  })();

  /* ------------------------------------------------------------
     FINISH GATE
  ------------------------------------------------------------ */
  let finishMat;
  (function buildFinish() {
    const g = new THREE.Group();
    // checkered band on the floor
    const bandMat = new THREE.MeshBasicMaterial({ color: C_GREEN, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    finishMat = bandMat;
    const band = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 2, 6), bandMat);
    band.rotation.x = -Math.PI / 2; band.position.set(0, 0.06, TRACK_LEN);
    g.add(band);
    // two posts + top bar
    [-1, 1].forEach((s) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, WALL_H + 3, 12), new THREE.MeshBasicMaterial({ color: C_GREEN }));
      post.position.set(s * LANE, (WALL_H + 3) / 2, TRACK_LEN);
      g.add(post);
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(LANE * 2, 1, 0.6), new THREE.MeshBasicMaterial({ color: C_GREEN }));
    bar.position.set(0, WALL_H + 2.5, TRACK_LEN);
    g.add(bar);
    // FINISH label
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 128;
    const cx = cv.getContext("2d");
    cx.font = "bold 84px 'JetBrains Mono', monospace"; cx.fillStyle = "#00ff88";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.shadowColor = "#00ff88"; cx.shadowBlur = 28;
    cx.fillText("◤ FINISH ◥", 512, 64);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(20, 2.5, 1); spr.position.set(0, WALL_H + 5, TRACK_LEN);
    g.add(spr);
    scene.add(g);
  })();

  /* ------------------------------------------------------------
     THE ROVER — a hovering LiDAR pod the player drives
  ------------------------------------------------------------ */
  const rover = new THREE.Group();
  const body = new THREE.Group();
  rover.add(body);
  scene.add(rover);

  const mMetal = new THREE.MeshStandardMaterial({ color: 0x0c1c2e, metalness: 0.85, roughness: 0.32, emissive: 0x041018 });
  const mGlow = new THREE.MeshBasicMaterial({ color: C_CYAN });
  const mGlowG = new THREE.MeshBasicMaterial({ color: C_GREEN });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 3.4), mMetal);
  body.add(chassis);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 4), mMetal);
  nose.rotation.x = Math.PI / 2; nose.rotation.z = Math.PI / 4;
  nose.position.set(0, 0, 2.1); nose.scale.set(1, 0.45, 1);
  body.add(nose);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 24, 16, 0, TAU, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0a3a55, emissive: 0x0a4f78, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.15, transparent: true, opacity: 0.85 })
  );
  dome.position.set(0, 0.32, 0.2); dome.scale.set(1.1, 0.9, 1.3);
  body.add(dome);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mGlow);
  core.position.set(0, 0.4, 0.2);
  body.add(core);
  [-1, 1].forEach((s) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 2.0), mMetal);
    fin.position.set(s * 1.55, 0, -0.1); body.add(fin);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.8), mGlow);
    strip.position.set(s * 1.7, 0.06, -0.1); body.add(strip);
  });
  const scanner = new THREE.Group();
  scanner.position.set(0, 0.7, 0.2); body.add(scanner);
  const scMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.4, 12), mMetal);
  scMast.position.y = 0.2; scanner.add(scMast);
  const scRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 8, 28), mGlow);
  scRing.position.y = 0.45; scRing.rotation.x = Math.PI / 2; scanner.add(scRing);
  const scBeam = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.5),
    new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scBeam.position.y = 0.45; scanner.add(scBeam);
  const thrusters = [];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.4, 14), mMetal);
    pod.position.set(sx * 1.15, -0.35, sz * 1.25); body.add(pod);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.9, 12), new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.set(sx * 1.15, -0.85, sz * 1.25); flame.rotation.x = Math.PI; body.add(flame);
    thrusters.push(flame);
  });
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), mMetal);
  antenna.position.set(0.9, 0.6, -1.3); body.add(antenna);
  const blinker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), mGlowG);
  blinker.position.set(0.9, 1.1, -1.3); body.add(blinker);

  const headlight = new THREE.SpotLight(0x9fe8ff, 2.4, 70, Math.PI / 6, 0.5, 1.2);
  headlight.position.set(0, 0.4, 2);
  const lightTarget = new THREE.Object3D(); lightTarget.position.set(0, -0.2, 30);
  body.add(headlight); body.add(lightTarget); headlight.target = lightTarget;
  const lightCone = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 26, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x6fd8ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  lightCone.rotation.x = -Math.PI / 2; lightCone.position.set(0, 0.1, 14);
  body.add(lightCone);

  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 32),
    new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  pad.rotation.x = -Math.PI / 2;
  scene.add(pad);

  /* --- thruster trail --- */
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
     DATA NODES — holographic beacons placed down the lane
  ------------------------------------------------------------ */
  const nodes = [];
  function makeLabel(text) {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128;
    const x = cv.getContext("2d");
    x.font = "bold 54px 'JetBrains Mono', monospace"; x.fillStyle = "#aef6ff";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.shadowColor = "#00f3ff"; x.shadowBlur = 22;
    x.fillText(text.toUpperCase(), 256, 64);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(7, 1.75, 1);
    return spr;
  }

  SECTIONS.forEach((sec) => {
    const g = new THREE.Group();
    g.position.set(sec.x, 0, sec.z);
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 40, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    col.position.y = 20; g.add(col);
    const gring = new THREE.Mesh(
      new THREE.RingGeometry(DETECT - 0.6, DETECT, 48),
      new THREE.MeshBasicMaterial({ color: C_CYAN, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    gring.rotation.x = -Math.PI / 2; gring.position.y = 0.05; g.add(gring);
    const cryMat = new THREE.MeshStandardMaterial({ color: 0x06283d, emissive: C_CYAN, emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.2, transparent: true, opacity: 0.9 });
    const cry = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), cryMat);
    cry.position.y = 4.0; g.add(cry);
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 0), new THREE.MeshBasicMaterial({ color: C_CYAN, wireframe: true, transparent: true, opacity: 0.5 }));
    wire.position.y = 4.0; g.add(wire);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.05, 8, 40), mGlow.clone());
    orbit.position.y = 4.0; orbit.rotation.x = Math.PI / 2.5; g.add(orbit);
    const label = makeLabel(sec.title);
    label.position.y = 7.6; g.add(label);
    scene.add(g);
    nodes.push({ data: sec, group: g, cry, wire, orbit, gring, cryMat, label, pos: new THREE.Vector3(sec.x, 0, sec.z), discovered: false, pulse: 0 });
  });

  // connection beam (rover -> active node)
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: C_GREEN, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
  beam.visible = false;
  scene.add(beam);

  /* ------------------------------------------------------------
     OBSTACLES — physics crates that topple when the rover hits them
  ------------------------------------------------------------ */
  const obstacles = [];
  const obsGeo = new THREE.BoxGeometry(2, 2, 2);
  function makeCrate(x, y, z, hue) {
    const mesh = new THREE.Mesh(obsGeo, new THREE.MeshStandardMaterial({
      color: 0x140a02, emissive: hue, emissiveIntensity: 0.85, metalness: 0.5, roughness: 0.4
    }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(obsGeo), new THREE.LineBasicMaterial({ color: hue }));
    mesh.add(edges);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const o = {
      mesh, half: 1,
      home: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(), avel: new THREE.Vector3(),
      state: "stand", knocked: false, settleTimer: 0
    };
    obstacles.push(o);
    return o;
  }
  // stacks/rows of crates between the nodes
  const CLUSTERS = [
    { z: 66, xs: [-9, -4, 4, 9] },
    { z: 114, xs: [-7, 0, 7] },
    { z: 162, xs: [-10, -5, 5, 10] },
    { z: 210, xs: [-6, 6] },
    { z: 256, xs: [-9, -3, 3, 9] }
  ];
  CLUSTERS.forEach((cl) => {
    cl.xs.forEach((x, i) => {
      const stack = 1 + (i % 2);          // 1 or 2 high
      const hue = (i % 2) ? C_AMBER : 0xff5b6e;
      for (let s = 0; s < stack; s++) makeCrate(x, 1 + s * 2.02, cl.z, hue);
    });
  });
  const TOTAL_OBS = obstacles.length;

  /* ------------------------------------------------------------
     HUD — injected DOM
  ------------------------------------------------------------ */
  const hud = document.createElement("div");
  hud.id = "sim-hud";
  hud.innerHTML = `
    <div id="sim-status" class="hud-box">
      <div class="score-wrap"><span class="k">SCORE</span><b id="sim-score">0</b></div>
      <div class="row"><span class="k">SPEED</span><b id="sim-vel">0.0 m/s</b></div>
      <div id="sim-speedbar"><i></i></div>
      <div class="row" style="margin-top:8px"><span class="k">TIME</span><b id="sim-time">0.0s</b></div>
      <div class="row"><span class="k">DISTANCE</span><b id="sim-dist">0 / ${TRACK_LEN}m</b></div>
      <div id="sim-progress"><i></i></div>
    </div>
    <div id="sim-objectives" class="hud-box">
      <div style="margin-bottom:6px"><span class="k">// DATA NODES</span> <b id="sim-count">0/${SECTIONS.length}</b></div>
      ${SECTIONS.map(s => `<div class="obj" data-id="${s.id}"><span class="mark">${s.title}</span><span class="k">+${PTS_NODE}</span></div>`).join("")}
      <div style="margin-top:8px"><span class="k">// OBSTACLES</span> <b id="sim-obs">0/${TOTAL_OBS}</b></div>
    </div>
    <div id="sim-minimap" class="hud-box">
      <div class="cap">// TRACK</div>
      <canvas id="sim-map" width="120" height="200"></canvas>
    </div>
    <div id="sim-foot">
      <div class="keys"><kbd>W A S D</kbd>/<kbd>↑ ↓ ← →</kbd> drive &nbsp; <kbd>SHIFT</kbd> boost</div>
      <div class="foot-btns">
        <button class="sim-btn" id="sim-restart">⟲ Restart</button>
        <a class="sim-btn" id="sim-exit" href="experience.html">⏏ Exit</a>
      </div>
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
  const elScore = $("sim-score"), elVel = $("sim-vel"), elTime = $("sim-time");
  const elDist = $("sim-dist"), elProg = $("sim-progress").firstElementChild;
  const elCount = $("sim-count"), elObs = $("sim-obs"), elSpeed = $("sim-speedbar").firstElementChild;
  const elPanel = $("sim-panel"), elToast = $("sim-toast");
  const mapCv = $("sim-map"), mapCtx = mapCv.getContext("2d");

  /* ------------------------------------------------------------
     AUDIO — engine hum + chimes
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
  function thud() {
    if (!audio || muted) return;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "square"; o.frequency.setValueAtTime(120, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, audio.currentTime + 0.18);
    g.gain.setValueAtTime(0.18, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.22);
  }

  /* ------------------------------------------------------------
     INPUT
  ------------------------------------------------------------ */
  const keys = {};
  const touch = { active: false, x: 0, y: 0, boost: false };
  let camDist = 12, camHeight = 6.5;

  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "enter" && !state.playing && !state.finished) startRun();
    if (k === "r") restart();
    if (state.playing && ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    keys[k] = true;
  });
  addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

  canvas.addEventListener("wheel", (e) => {
    if (!state.playing) return;
    e.preventDefault();
    camDist = clamp(camDist + Math.sign(e.deltaY) * 1.2, 7, 22);
    camHeight = clamp(camDist * 0.55, 4, 12);
  }, { passive: false });

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
     STATE + GAME FLOW
  ------------------------------------------------------------ */
  const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const state = {
    playing: false, finished: false,
    x: 0, z: 0, heading: 0, speed: 0,
    bank: 0, pitch: 0, bob: 0,
    found: 0, obsCleared: 0, score: 0, time: 0,
    activeNode: null
  };

  const overlay = $("game-overlay");

  function startRun() {
    if (state.playing) return;
    initAudio();
    if (audio && audio.state === "suspended") audio.resume();
    resetWorld();
    state.playing = true; state.finished = false;
    document.body.classList.add("sim-active");
    if (isTouch) document.body.classList.add("sim-touch");
    if (overlay) overlay.classList.remove("show");
    requestAnimationFrame(() => { hud.classList.add("show"); frame.classList.add("show"); });
    chime(440, 0.18); setTimeout(() => chime(660, 0.25), 110);
    toast("Run Started", "Smash crates · grab data nodes · reach the finish");
  }

  function restart() {
    state.finished = false;
    if (overlay) overlay.classList.remove("show");
    startRun();
  }

  function resetWorld() {
    state.x = 0; state.z = 0; state.heading = 0; state.speed = 0;
    state.bank = state.pitch = state.bob = 0;
    state.found = 0; state.obsCleared = 0; state.score = 0; state.time = 0;
    state.activeNode = null;
    elScore.textContent = "0"; elCount.textContent = `0/${SECTIONS.length}`;
    elObs.textContent = `0/${TOTAL_OBS}`;
    nodes.forEach((n) => {
      n.discovered = false; n.pulse = 0;
      n.cryMat.emissive.setHex(C_CYAN);
      n.wire.material.color.setHex(C_CYAN);
      n.gring.material.color.setHex(C_CYAN);
      n.orbit.material.color.setHex(C_CYAN);
      const obj = hud.querySelector(`.obj[data-id="${n.data.id}"]`);
      if (obj) obj.classList.remove("done");
    });
    obstacles.forEach((o) => {
      o.mesh.position.copy(o.home);
      o.mesh.rotation.set(0, 0, 0);
      o.vel.set(0, 0, 0); o.avel.set(0, 0, 0);
      o.state = "stand"; o.knocked = false; o.settleTimer = 0;
    });
    hidePanel(); beam.visible = false;
  }

  function finishRun() {
    if (state.finished) return;
    state.finished = true; state.playing = false;
    document.body.classList.remove("sim-active", "sim-touch");
    hud.classList.remove("show"); frame.classList.remove("show");
    hidePanel(); beam.visible = false;
    if (humGain) humGain.gain.value = 0;
    state.score += PTS_FINISH;
    chime(659, 0.5, "triangle"); celebrate();
    showEndScreen();
  }

  function showStartScreen() {
    if (!overlay) return;
    overlay.innerHTML = `
      <div class="ov-card">
        <div class="ov-tag">// AE_SYS · ROVER RUN</div>
        <h1>ROVER<span>RUN</span></h1>
        <p class="ov-sub">A playable version of the portfolio. Pilot the LiDAR rover down the
        corridor, <b>smash crate stacks</b> for points, <b>collect data nodes</b> to unlock each
        project, and blast through the <b>finish gate</b>.</p>
        <div class="ov-keys">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows — drive</span>
          <span><kbd>SHIFT</kbd> — boost</span>
          <span class="ov-touch">Touch: joystick + BOOST</span>
        </div>
        <button class="ov-btn" id="ov-start">▶ START RUN</button>
        <a class="ov-link" href="experience.html">← back to site</a>
      </div>`;
    overlay.classList.add("show");
    $("ov-start").addEventListener("click", startRun);
  }

  function showEndScreen() {
    if (!overlay) return;
    const allNodes = state.found === SECTIONS.length;
    const allObs = state.obsCleared === TOTAL_OBS;
    overlay.innerHTML = `
      <div class="ov-card">
        <div class="ov-tag">// RUN COMPLETE</div>
        <h1 class="win">RUN<span>COMPLETE</span></h1>
        <div class="ov-score">${state.score.toLocaleString()}<small>FINAL SCORE</small></div>
        <div class="ov-stats">
          <div><b>${state.found}/${SECTIONS.length}</b><span>DATA NODES ${allNodes ? "✓" : ""}</span></div>
          <div><b>${state.obsCleared}/${TOTAL_OBS}</b><span>CRATES ${allObs ? "✓" : ""}</span></div>
          <div><b>${state.time.toFixed(1)}s</b><span>RUN TIME</span></div>
        </div>
        <div class="ov-actions">
          <button class="ov-btn" id="ov-again">⟲ RUN AGAIN</button>
          <a class="ov-btn ghost" href="experience.html">← back to site</a>
        </div>
      </div>`;
    overlay.classList.add("show");
    $("ov-again").addEventListener("click", restart);
  }

  $("sim-restart").addEventListener("click", restart);

  let toastTimer = null;
  function toast(big, sub) {
    elToast.innerHTML = `<div class="big">${big}</div><div class="sub">${sub || ""}</div>`;
    elToast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove("show"), 2600);
  }

  // floating "+points" popup at screen center-ish
  function popPoints(text, color) {
    const s = document.createElement("div");
    s.className = "pts-pop"; s.textContent = text;
    s.style.color = color || "#00ff88";
    s.style.left = (45 + Math.random() * 10) + "vw";
    s.style.top = (45 + Math.random() * 8) + "vh";
    document.body.appendChild(s);
    requestAnimationFrame(() => { s.style.transform = "translateY(-60px)"; s.style.opacity = "0"; });
    setTimeout(() => s.remove(), 900);
  }

  function addScore(pts, label, color) {
    state.score += pts;
    elScore.textContent = state.score.toLocaleString();
    popPoints(`+${pts}${label ? " " + label : ""}`, color);
  }

  /* ------------------------------------------------------------
     PANEL RENDERING
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
     MINIMAP — vertical track strip
  ------------------------------------------------------------ */
  function drawMap() {
    const W = 120, H = 200, pad = 10;
    mapCtx.clearRect(0, 0, W, H);
    const zToY = (z) => H - pad - ((z - START_Z) / (TRACK_LEN - START_Z)) * (H - pad * 2);
    const xToX = (x) => W / 2 + (x / LANE) * (W / 2 - pad);
    // lane walls
    mapCtx.strokeStyle = "rgba(0,243,255,0.4)"; mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(xToX(-LANE), zToY(START_Z)); mapCtx.lineTo(xToX(-LANE), zToY(TRACK_LEN));
    mapCtx.moveTo(xToX(LANE), zToY(START_Z)); mapCtx.lineTo(xToX(LANE), zToY(TRACK_LEN));
    mapCtx.stroke();
    // finish line
    mapCtx.strokeStyle = "#00ff88"; mapCtx.lineWidth = 2;
    mapCtx.beginPath(); mapCtx.moveTo(xToX(-LANE), zToY(TRACK_LEN)); mapCtx.lineTo(xToX(LANE), zToY(TRACK_LEN)); mapCtx.stroke();
    // obstacles
    obstacles.forEach((o) => {
      mapCtx.fillStyle = o.knocked ? "rgba(120,120,120,0.5)" : "rgba(255,160,60,0.8)";
      mapCtx.fillRect(xToX(o.home.x) - 1.5, zToY(o.home.z) - 1.5, 3, 3);
    });
    // nodes
    nodes.forEach((n) => {
      mapCtx.fillStyle = n.discovered ? "#00ff88" : "rgba(0,243,255,0.8)";
      mapCtx.beginPath(); mapCtx.arc(xToX(n.pos.x), zToY(n.pos.z), n.discovered ? 3.5 : 3, 0, TAU); mapCtx.fill();
    });
    // rover
    const rx = xToX(state.x), ry = zToY(state.z);
    mapCtx.save(); mapCtx.translate(rx, ry); mapCtx.rotate(-state.heading);
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
     OBSTACLE PHYSICS
  ------------------------------------------------------------ */
  const impactDir = new THREE.Vector3();
  function knock(o, dirX, dirZ, power) {
    o.state = "fall"; o.knocked = true;
    o.vel.set(dirX * power, rand(3, 7), dirZ * power);
    o.avel.set(rand(-6, 6), rand(-3, 3), rand(-6, 6));
    state.obsCleared++;
    elObs.textContent = `${state.obsCleared}/${TOTAL_OBS}`;
    addScore(PTS_OBSTACLE, "", "#ffae3b");
    thud();
    if (state.obsCleared === TOTAL_OBS) {
      setTimeout(() => { addScore(250, "ALL CRATES!", "#ffae3b"); toast("Demolition Bonus", "Every crate cleared · +250"); }, 200);
    }
  }
  function updateObstacles(dt) {
    obstacles.forEach((o) => {
      if (o.state === "fall") {
        o.vel.y += GRAVITY * dt;
        o.mesh.position.addScaledVector(o.vel, dt);
        o.mesh.rotation.x += o.avel.x * dt;
        o.mesh.rotation.y += o.avel.y * dt;
        o.mesh.rotation.z += o.avel.z * dt;
        // floor bounce / settle
        if (o.mesh.position.y < o.half) {
          o.mesh.position.y = o.half;
          if (Math.abs(o.vel.y) > 4) { o.vel.y = -o.vel.y * 0.32; }   // small bounce
          else { o.vel.y = 0; }
          o.vel.x *= 0.6; o.vel.z *= 0.6;                              // ground friction
          o.avel.multiplyScalar(0.6);
          if (o.vel.lengthSq() < 0.4 && o.avel.lengthSq() < 0.4) {
            o.settleTimer += dt;
            if (o.settleTimer > 0.25) o.state = "rest";
          }
        }
      }
    });
  }

  /* ------------------------------------------------------------
     MAIN LOOP
  ------------------------------------------------------------ */
  const clock = new THREE.Clock();
  const desiredCam = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const smoothLook = new THREE.Vector3(0, 2, 10);
  let mapAcc = 0;

  function update(dt, t) {
    if (state.playing) {
      state.time += dt;
      let fwd = 0, turn = 0, boost = false;
      if (keys["w"] || keys["arrowup"]) fwd += 1;
      if (keys["s"] || keys["arrowdown"]) fwd -= 1;
      if (keys["a"] || keys["arrowleft"]) turn += 1;
      if (keys["d"] || keys["arrowright"]) turn -= 1;
      if (keys["shift"]) boost = true;
      if (touch.active) { fwd += clamp(-touch.y, -1, 1); turn += clamp(-touch.x, -1, 1); }
      if (touch.boost) boost = true;

      const maxSpeed = boost ? 52 : 32;
      const accel = boost ? 66 : 46;
      state.speed += fwd * accel * dt;
      state.speed *= 0.94;
      state.speed = clamp(state.speed, -maxSpeed * 0.5, maxSpeed);
      if (Math.abs(state.speed) < 0.02) state.speed = 0;

      const turnRate = 2.0 * (0.4 + Math.min(1, Math.abs(state.speed) / 16));
      state.heading += turn * turnRate * dt * (state.speed >= 0 ? 1 : -1);

      let nx = state.x + Math.sin(state.heading) * state.speed * dt;
      let nz = state.z + Math.cos(state.heading) * state.speed * dt;

      // wall collisions — keep rover inside the lane
      const limX = LANE - ROVER_R;
      if (nx > limX) { nx = limX; state.speed *= 0.6; state.bank = lerp(state.bank, -0.3, 0.4); }
      if (nx < -limX) { nx = -limX; state.speed *= 0.6; state.bank = lerp(state.bank, 0.3, 0.4); }
      if (nz < START_Z + ROVER_R) { nz = START_Z + ROVER_R; state.speed *= 0.4; }

      state.x = nx; state.z = nz;

      // obstacle collisions — topple any standing crate we drive into
      obstacles.forEach((o) => {
        if (o.state !== "stand") return;
        const dx = state.x - o.mesh.position.x, dz = state.z - o.mesh.position.z;
        if (dx * dx + dz * dz < (ROVER_R + o.half + 0.4) * (ROVER_R + o.half + 0.4)) {
          impactDir.set(o.mesh.position.x - state.x, 0, o.mesh.position.z - state.z);
          if (impactDir.lengthSq() < 0.0001) impactDir.set(Math.sin(state.heading), 0, Math.cos(state.heading));
          impactDir.normalize();
          const power = clamp(6 + Math.abs(state.speed) * 0.7, 8, 34);
          // blend impact with rover heading for a satisfying plough
          const dirX = impactDir.x * 0.6 + Math.sin(state.heading) * 0.4;
          const dirZ = impactDir.z * 0.6 + Math.cos(state.heading) * 0.4;
          knock(o, dirX, dirZ, power);
          state.speed *= 0.82;       // slight slow-down on impact
          state.pitch = lerp(state.pitch, 0.16, 0.5);
        }
      });

      // finish detection
      if (state.z >= TRACK_LEN) { finishRun(); }

      state.bank = lerp(state.bank, -turn * 0.32 * Math.min(1, Math.abs(state.speed) / 14), 0.12);
      state.pitch = lerp(state.pitch, -fwd * 0.1, 0.1);

      if (humGain && !muted) {
        const sp = Math.abs(state.speed) / maxSpeed;
        humGain.gain.value = lerp(humGain.gain.value, 0.015 + sp * 0.06, 0.1);
        hum.frequency.value = 46 + sp * 90;
      }
    } else {
      // ambient: gentle hover near the start while the overlay shows
      state.heading = Math.sin(t * 0.2) * 0.3;
      state.x = Math.sin(t * 0.3) * 3;
      state.z = 2 + Math.cos(t * 0.2) * 2;
      state.bank = lerp(state.bank, Math.sin(t * 0.4) * 0.1, 0.05);
      if (humGain) humGain.gain.value = lerp(humGain.gain.value, 0, 0.1);
    }

    // apply rover transform
    rover.position.set(state.x, 0, state.z);
    rover.rotation.y = state.heading;
    state.bob = Math.sin(t * 2.2) * 0.12;
    body.position.y = 1.5 + state.bob;
    body.rotation.z = state.bank;
    body.rotation.x = state.pitch;

    scanner.rotation.y = t * 4.0;
    scBeam.rotation.y = t * 4.0;
    core.scale.setScalar(1 + Math.sin(t * 5) * 0.18);
    blinker.visible = Math.sin(t * 6) > 0;
    const thr = clamp(0.4 + Math.abs(state.speed) / 30, 0.4, 1.4);
    thrusters.forEach((f, i) => { f.scale.set(1, thr + Math.sin(t * 20 + i) * 0.15, 1); f.material.opacity = 0.5 + thr * 0.3; });

    pad.position.set(state.x, 0.04, state.z);
    pad.material.opacity = 0.12 + thr * 0.06;

    grid.position.set(state.x, 0, state.z);
    gridUniforms.uTime.value = t;
    gridUniforms.uRover.value.set(state.x, 0, state.z);

    finishMat.opacity = 0.4 + Math.sin(t * 4) * 0.2;

    // trail
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

    updateObstacles(dt);

    // nodes
    let active = null;
    nodes.forEach((n) => {
      n.cry.rotation.y += dt * 0.8; n.cry.rotation.x += dt * 0.3;
      n.wire.rotation.y -= dt * 0.5; n.wire.rotation.z += dt * 0.2;
      n.orbit.rotation.z += dt * 1.2;
      n.cry.position.y = n.wire.position.y = 4.0 + Math.sin(t * 1.5 + n.pos.x) * 0.3;

      const d = Math.hypot(state.x - n.pos.x, state.z - n.pos.z);
      if (state.playing && d < DETECT) {
        active = active || n;
        n.pulse = Math.min(1, n.pulse + dt * 3);
        if (!n.discovered) {
          n.discovered = true; state.found++;
          const obj = hud.querySelector(`.obj[data-id="${n.data.id}"]`);
          if (obj) obj.classList.add("done");
          elCount.textContent = `${state.found}/${SECTIONS.length}`;
          n.cryMat.emissive.setHex(C_GREEN);
          n.wire.material.color.setHex(C_GREEN);
          n.gring.material.color.setHex(C_GREEN);
          n.orbit.material.color.setHex(C_GREEN);
          addScore(PTS_NODE, "NODE", "#00ff88");
          chime(523, 0.12); setTimeout(() => chime(784, 0.25), 90);
          toast(`Node Acquired: ${n.data.title}`, n.data.code);
        }
      } else {
        n.pulse = Math.max(0, n.pulse - dt * 2);
      }
      const ps = 1 + n.pulse * 0.25 + Math.sin(t * 6) * 0.04 * n.pulse;
      n.cry.scale.setScalar(ps); n.wire.scale.setScalar(ps);
      n.gring.material.opacity = 0.3 + n.pulse * 0.5 + Math.sin(t * 4) * 0.1;
    });

    if (state.playing && active) {
      if (state.activeNode !== active) { state.activeNode = active; showPanel(active); }
      beam.visible = true;
      const bp = beam.geometry.attributes.position.array;
      bp[0] = state.x; bp[1] = 1.5; bp[2] = state.z;
      bp[3] = active.pos.x; bp[4] = 4.0; bp[5] = active.pos.z;
      beam.geometry.attributes.position.needsUpdate = true;
      beam.material.opacity = 0.4 + Math.sin(t * 10) * 0.3;
    } else if (state.activeNode) {
      state.activeNode = null; hidePanel(); beam.visible = false;
    }

    tickers.forEach((fn) => fn(t));

    // camera
    if (state.playing) {
      const fx = Math.sin(state.heading), fz = Math.cos(state.heading);
      desiredCam.set(state.x - fx * camDist, camHeight + 2, state.z - fz * camDist);
      camera.position.lerp(desiredCam, 1 - Math.pow(0.001, dt));
      lookAt.set(state.x + fx * 6, 2 + state.bob, state.z + fz * 6);
    } else {
      const a = t * 0.25;
      desiredCam.set(state.x + Math.cos(a) * 16, 8, state.z - 16 + Math.sin(a) * 6);
      camera.position.lerp(desiredCam, 1 - Math.pow(0.02, dt));
      lookAt.set(state.x, 2.5, state.z + 6);
    }
    smoothLook.lerp(lookAt, 1 - Math.pow(0.002, dt));
    camera.lookAt(smoothLook);

    // HUD text
    if (state.playing) {
      elVel.textContent = `${Math.abs(state.speed).toFixed(1)} m/s`;
      elSpeed.style.width = `${clamp(Math.abs(state.speed) / 52 * 100, 0, 100)}%`;
      elTime.textContent = `${state.time.toFixed(1)}s`;
      const prog = clamp((state.z - START_Z) / (TRACK_LEN - START_Z) * 100, 0, 100);
      elDist.textContent = `${Math.max(0, state.z).toFixed(0)} / ${TRACK_LEN}m`;
      elProg.style.width = `${prog}%`;
      mapAcc += dt;
      if (mapAcc > 0.05) { drawMap(); mapAcc = 0; }
    }
  }

  function celebrate() {
    const emojis = ["✦", "✧", "◈", "◇", "⬡", "⬢", "✺"];
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("span");
      s.textContent = emojis[(Math.random() * emojis.length) | 0];
      s.style.cssText = `position:fixed;left:${Math.random() * 100}vw;top:-40px;color:${Math.random() > 0.5 ? "#00f3ff" : "#00ff88"};font-size:${12 + Math.random() * 22}px;z-index:9991;pointer-events:none;text-shadow:0 0 10px currentColor;transition:transform 2.8s ease-in,opacity 2.8s;`;
      document.body.appendChild(s);
      requestAnimationFrame(() => { s.style.transform = `translateY(114vh) rotate(${Math.random() * 720 - 360}deg)`; s.style.opacity = "0"; });
      setTimeout(() => s.remove(), 3000);
    }
  }

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt, clock.elapsedTime);
    composer.render();
    requestAnimationFrame(animate);
  }

  showStartScreen();
  animate();
})();
