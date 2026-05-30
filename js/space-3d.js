/* ============================================================
   ROBOTICS 3D HERO - LiDAR POINT CLOUD SWARM
   Three.js (r128). Interactive point cloud with Bloom.
   ============================================================ */
(function () {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030613, 0.04);

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 12;
  camera.position.y = 2;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  // --- POST-PROCESSING (Jaw-dropping Bloom) ---
  const renderScene = new THREE.RenderPass(scene, camera);
  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    2.5, // intense strength for LiDAR dots
    0.5, // radius
    0.3 // threshold
  );

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  const group = new THREE.Group();
  scene.add(group);

  function placeCloud() { group.position.x = innerWidth > 820 ? 4 : 0; }
  placeCloud();

  /* --- LiDAR / Nanobot Point Cloud Swarm --- */
  const pointCount = innerWidth < 768 ? 4000 : 12000;
  const geometry = new THREE.BufferGeometry();
  
  // Create multiple arrays for morphing targets
  const positionsBase = new Float32Array(pointCount * 3);
  const positionsTargetSphere = new Float32Array(pointCount * 3);
  const positionsTargetCube = new Float32Array(pointCount * 3);
  const colors = new Float32Array(pointCount * 3);
  const sizes = new Float32Array(pointCount);
  
  const color1 = new THREE.Color(0x00f3ff); // Cyan
  const color2 = new THREE.Color(0x00ff88); // Matrix/LiDAR Green

  for (let i = 0; i < pointCount; i++) {
    const i3 = i * 3;
    
    // Base: Random scattered cloud
    positionsBase[i3] = (Math.random() - 0.5) * 40;
    positionsBase[i3 + 1] = (Math.random() - 0.5) * 40;
    positionsBase[i3 + 2] = (Math.random() - 0.5) * 40;

    // Target 1: Sphere
    const radius = 4 + Math.random() * 1.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    positionsTargetSphere[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positionsTargetSphere[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positionsTargetSphere[i3 + 2] = radius * Math.cos(phi);

    // Target 2: Cube / Grid structure
    positionsTargetCube[i3] = (Math.random() - 0.5) * 8;
    positionsTargetCube[i3 + 1] = (Math.random() - 0.5) * 8;
    positionsTargetCube[i3 + 2] = (Math.random() - 0.5) * 8;

    // Mixed colors based on depth
    const mixedColor = color1.clone().lerp(color2, Math.random());
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
    
    sizes[i] = Math.random() * 2.0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positionsBase, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  // Custom shader material for LiDAR dots with varying sizes
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      mouse: { value: new THREE.Vector3() },
      morphState: { value: 0 } // 0 = cloud, 1 = sphere, 2 = cube
    },
    vertexShader: `
      uniform float time;
      uniform vec3 mouse;
      attribute vec3 color;
      attribute float size;
      varying vec3 vColor;
      
      void main() {
        vColor = color;
        
        // Scanline effect wave
        float wave = sin(position.y * 2.0 + time * 3.0) * 0.5 + 0.5;
        vec3 pos = position;
        
        // Mouse repel
        float dist = distance(pos, mouse * 10.0);
        if(dist < 3.0) {
          pos += normalize(pos - mouse * 10.0) * (3.0 - dist) * 0.5;
        }

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (20.0 / -mvPosition.z) * (wave * 0.8 + 0.5);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        // Circular point
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float ll = length(xy);
        if(ll > 0.5) discard;
        
        // Soft edge
        float alpha = (0.5 - ll) * 2.0;
        gl_FragColor = vec4(vColor, alpha * 0.8);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const swarm = new THREE.Points(geometry, material);
  group.add(swarm);

  // Background ambient particles (Starfield)
  const bgParticles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 0.02, color: 0x002244, transparent: true, opacity: 0.3 })
  );
  bgParticles.scale.set(3, 3, 3);
  scene.add(bgParticles);

  // Interaction variables
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const worldMouse = new THREE.Vector3();
  
  addEventListener("mousemove", (e) => {
    mouse.targetX = (e.clientX / innerWidth - 0.5) * 2;
    mouse.targetY = -(e.clientY / innerHeight - 0.5) * 2; // Y is inverted for 3D Math
  });
  
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    placeCloud();
  });

  // State morphing logic
  let currentState = 0; // 0=Cloud, 1=Sphere, 2=Cube
  setInterval(() => {
    currentState = (currentState + 1) % 3;
  }, 7000); // Morph every 7 seconds

  const clock = new THREE.Clock();
  
  function animate() {
    const t = clock.getElapsedTime();
    material.uniforms.time.value = t;

    // Smooth mouse easing
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;
    
    worldMouse.set(mouse.x * 5, mouse.y * 5, 0);
    material.uniforms.mouse.value.copy(worldMouse);

    // Morph geometry based on state
    const posAttribute = geometry.attributes.position;
    for(let i=0; i<pointCount; i++) {
        const i3 = i * 3;
        let targetX, targetY, targetZ;
        
        if(currentState === 0) {
            targetX = positionsBase[i3];
            targetY = positionsBase[i3+1];
            targetZ = positionsBase[i3+2];
        } else if (currentState === 1) {
            targetX = positionsTargetSphere[i3];
            targetY = positionsTargetSphere[i3+1];
            targetZ = positionsTargetSphere[i3+2];
        } else {
            targetX = positionsTargetCube[i3];
            targetY = positionsTargetCube[i3+1];
            targetZ = positionsTargetCube[i3+2];
        }

        // Lerp positions
        posAttribute.array[i3] += (targetX - posAttribute.array[i3]) * 0.02;
        posAttribute.array[i3+1] += (targetY - posAttribute.array[i3+1]) * 0.02;
        posAttribute.array[i3+2] += (targetZ - posAttribute.array[i3+2]) * 0.02;
    }
    posAttribute.needsUpdate = true;

    // Rotate swarm
    group.rotation.y = t * 0.1;
    group.rotation.x = Math.sin(t * 0.2) * 0.1;
    
    bgParticles.rotation.y = t * 0.02;

    // Parallax on camera
    camera.position.x += (mouse.x * 3 - camera.position.x) * 0.05;
    camera.position.y += (mouse.y * 3 + 2 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

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
      ring.style.borderColor = '#00ff88'; // Change to LiDAR green on hover
      ring.style.background = 'rgba(0,255,136,0.05)';
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
