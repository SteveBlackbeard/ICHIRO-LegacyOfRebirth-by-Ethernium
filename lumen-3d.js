import * as THREE from "./assets/vendor/three.module.js";
import { GLTFLoader } from "./assets/vendor/GLTFLoader.js"; // Keep import for static audit compliance

let statsScene, statsCamera, statsRenderer, statsModel, statsScanRing;
let statsRunning = false;
let statsRaf = 0;
let statsResizeObserver = null;
let statsInitialized = false;
let hologramMaterial;

export function initLumen3D() {
  if (!statsInitialized) {
    initStatsBlueprint();
    statsInitialized = true;
  }

  return {
    start: startStatsLoop,
    pause: stopStatsLoop,
    resume: startStatsLoop,
    destroy: stopStatsLoop,
  };
}

function createProceduralLumen() {
  const group = new THREE.Group();

  // Color Palette
  const bodyColor = 0xff7700; // Orange wireframe
  const eyeColor = 0xff1122;  // Red glowing eyes
  const secondaryColor = 0x00f0ff; // Cyan telemetry lines

  // 1. Central Body: A wireframe sphere representing the core structure
  // Latitude and longitude lines are naturally created by SphereGeometry
  const bodyGeo = new THREE.SphereGeometry(1.0, 16, 12);
  
  // Solid semi-transparent backing mesh to give depth and volume (hides lines on the back)
  const bodyBackingMat = new THREE.MeshBasicMaterial({
    color: 0x240e00,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide
  });
  const bodyBacking = new THREE.Mesh(bodyGeo, bodyBackingMat);
  bodyBacking.renderOrder = 1;
  group.add(bodyBacking);

  // Wireframe lines for the body (vertical/horizontal lines capturing form mathematically)
  const bodyWireGeo = new THREE.WireframeGeometry(bodyGeo);
  const bodyWire = new THREE.LineSegments(bodyWireGeo, hologramMaterial || new THREE.LineBasicMaterial({ color: bodyColor }));
  bodyWire.renderOrder = 2;
  group.add(bodyWire);

  // 2. Horizontal and Vertical Outer Rings (Technical/Mathematical circles)
  const ringMat = hologramMaterial || new THREE.LineBasicMaterial({
    color: secondaryColor,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });

  // Equatorial Ring
  const eqRingGeo = new THREE.RingGeometry(1.15, 1.18, 32);
  const eqRing = new THREE.LineLoop(eqRingGeo, ringMat);
  eqRing.rotation.x = Math.PI / 2;
  group.add(eqRing);

  // Meridian Ring
  const merRingGeo = new THREE.RingGeometry(1.15, 1.18, 32);
  const merRing = new THREE.LineLoop(merRingGeo, ringMat);
  merRing.rotation.y = Math.PI / 2;
  group.add(merRing);

  // Axial Ring
  const axRingGeo = new THREE.RingGeometry(1.15, 1.18, 32);
  const axRing = new THREE.LineLoop(axRingGeo, ringMat);
  group.add(axRing);

  // 3. Mathematical "Ojos Redondos" (Round Eyes) on the front face
  // Left eye position on sphere surface: x = -0.38, y = 0.15, z = 0.88
  // Right eye position on sphere surface: x = 0.38, y = 0.15, z = 0.88
  // Eye 1 (Left)
  const eyeGroupLeft = createEye(eyeColor, 0.28);
  eyeGroupLeft.position.set(-0.38, 0.15, 0.88);
  eyeGroupLeft.lookAt(new THREE.Vector3(-0.38 * 2, 0.15 * 2, 0.88 * 2));
  group.add(eyeGroupLeft);

  // Eye 2 (Right)
  const eyeGroupRight = createEye(eyeColor, 0.28);
  eyeGroupRight.position.set(0.38, 0.15, 0.88);
  eyeGroupRight.lookAt(new THREE.Vector3(0.38 * 2, 0.15 * 2, 0.88 * 2));
  group.add(eyeGroupRight);

  // 4. Secondary indicator sensors (small circular mathematical targets)
  const statusGroup = createStatusNode(secondaryColor, 0.12);
  statusGroup.position.set(0, -0.4, 0.9);
  statusGroup.lookAt(new THREE.Vector3(0, -0.8, 1.8));
  group.add(statusGroup);

  // 5. Antenna / Rangefinder Lines (Mathematical vertical and horizontal lines protruding from the body)
  const antennaMat = new THREE.LineBasicMaterial({
    color: bodyColor,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    depthTest: true
  });

  // Vertical Top Antenna
  const topAntennaGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 1.0, 0),
    new THREE.Vector3(0, 1.4, 0)
  ]);
  const topAntenna = new THREE.Line(topAntennaGeo, antennaMat);
  group.add(topAntenna);

  // Top Antenna Tip Circle
  const tipGeo = new THREE.RingGeometry(0, 0.05, 16);
  const tipMat = new THREE.MeshBasicMaterial({ color: bodyColor, side: THREE.DoubleSide });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.set(0, 1.4, 0);
  tip.rotation.x = Math.PI / 2;
  group.add(tip);

  // Horizontal Side stabilizer bars/lines
  const leftBarGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.0, 0, 0),
    new THREE.Vector3(-1.3, 0, 0)
  ]);
  const leftBar = new THREE.Line(leftBarGeo, antennaMat);
  group.add(leftBar);

  const rightBarGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(1.0, 0, 0),
    new THREE.Vector3(1.3, 0, 0)
  ]);
  const rightBar = new THREE.Line(rightBarGeo, antennaMat);
  group.add(rightBar);

  return group;
}

function createEye(color, radius) {
  const eyeGroup = new THREE.Group();

  // Solid backing dark circle
  const backGeo = new THREE.CircleGeometry(radius, 16);
  const backMat = new THREE.MeshBasicMaterial({
    color: 0x2b0000,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true
  });
  const backing = new THREE.Mesh(backGeo, backMat);
  backing.renderOrder = 1;
  eyeGroup.add(backing);

  // Outer glowing ring
  const ring1Geo = new THREE.RingGeometry(radius * 0.9, radius * 1.0, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });
  const ring1 = new THREE.Mesh(ring1Geo, ringMat);
  ring1.renderOrder = 2;
  eyeGroup.add(ring1);

  // Inner concentric ring
  const ring2Geo = new THREE.RingGeometry(radius * 0.5, radius * 0.6, 24);
  const ring2 = new THREE.Mesh(ring2Geo, ringMat);
  ring2.renderOrder = 2;
  eyeGroup.add(ring2);

  // Torus for 3D depth reflection of the eye lens
  const torusGeo = new THREE.TorusGeometry(radius * 0.75, radius * 0.1, 8, 24);
  const torusMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });
  const torus = new THREE.Mesh(torusGeo, torusMat);
  torus.position.z = 0.05;
  torus.renderOrder = 3;
  eyeGroup.add(torus);

  // Center pupil node
  const pupilGeo = new THREE.CircleGeometry(radius * 0.2, 16);
  const pupilMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    depthTest: true
  });
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.z = 0.08;
  pupil.renderOrder = 4;
  eyeGroup.add(pupil);

  return eyeGroup;
}

function createStatusNode(color, radius) {
  const nodeGroup = new THREE.Group();

  const outerGeo = new THREE.RingGeometry(radius * 0.8, radius, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    depthTest: true
  });
  const outer = new THREE.Mesh(outerGeo, mat);
  nodeGroup.add(outer);

  const innerGeo = new THREE.CircleGeometry(radius * 0.4, 16);
  const innerMat = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    depthTest: true
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  nodeGroup.add(inner);

  return nodeGroup;
}

function initStatsBlueprint() {
  const canvas = document.getElementById("stats-lumen-canvas");
  if (!canvas) return;

  const width = 118;
  const height = 118;

  // Renderer con canal alfa y antialiasing
  statsRenderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power"
  });
  statsRenderer.setSize(width, height, false);
  statsRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Escena y Cámara
  statsScene = new THREE.Scene();
  statsCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
  statsCamera.position.set(0, 0.05, 2.5); // Adjusted zoom for better framing of the mecha

  // Crear grupo contenedor del modelo
  statsModel = new THREE.Group();
  statsScene.add(statsModel);

  // Crear material holograma con líneas de escaneo animadas
  hologramMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x00d8ff) },
      time: { value: 0 },
      baseOpacity: { value: 0.08 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      uniform float baseOpacity;
      varying vec3 vWorldPosition;
      void main() {
        // Horizontal lines in world Y space
        float scanline = sin(vWorldPosition.y * 95.0 - time * 2.4) * 0.5 + 0.5;
        
        // Fine grain lines
        float fineScanline = sin(vWorldPosition.y * 380.0) * 0.15 + 0.85;
        
        // Faint base opacity, scanning lines are more visible
        float alpha = baseOpacity * (0.15 + 0.85 * scanline) * fineScanline;
        
        // Laser sweeping effect
        float sweep = sin(vWorldPosition.y * 3.2 - time * 2.2);
        sweep = smoothstep(0.97, 1.0, sweep);
        alpha += sweep * 0.15;
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });

  // Cargar Lumen blueprint GLB y renderizar como wireframe de alta fidelidad
  const loader = new GLTFLoader();
  loader.load(
    "./assets/models/lumen-blueprint.glb",
    (gltf) => {
      const glbLumen = gltf.scene;
      
      // Bounding box para centrar y escalar de forma dinámica
      const box = new THREE.Box3().setFromObject(glbLumen);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scaleFactor = 1.25 / maxDim; // Adjusted scale factor to fit the canvas nicely
      
      glbLumen.scale.setScalar(scaleFactor);
      glbLumen.position.copy(center).multiplyScalar(-scaleFactor);
      
      glbLumen.traverse((child) => {
        if (child.isMesh) {
          // Usar EdgesGeometry con ángulo de umbral para obtener silueta limpia
          const edges = new THREE.EdgesGeometry(child.geometry, 50);
          const line = new THREE.LineSegments(edges, hologramMaterial);
          
          // Añadir el wireframe como hijo del mesh para heredar todas las transformaciones de los nodos padres
          child.add(line);
          
          // Ocultar las caras sólidas pero mantener visibles los hijos (wireframe)
          if (child.material) {
            child.material.visible = false;
          }
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
      
      statsModel.add(glbLumen);
      
      // Crear anillo de escáner horizontal cyan
      const scanRingMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff, // Cian brillante
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      // Diámetro ligeramente superior al mecha para rodearlo
      const scanRingGeo = new THREE.RingGeometry(0.63, 0.65, 32);
      statsScanRing = new THREE.LineLoop(scanRingGeo, scanRingMat);
      statsScanRing.rotation.x = Math.PI / 2;
      statsModel.add(statsScanRing);
      
      if (statsRunning) {
        statsRenderer.render(statsScene, statsCamera);
      }
    },
    undefined,
    (err) => {
      console.warn("No se pudo cargar lumen-blueprint.glb, usando esfera procedural:", err);
      // Fallback a la esfera procedural si el GLB no se puede cargar
      const fallback = createProceduralLumen();
      statsModel.add(fallback);
      if (statsRunning) {
        statsRenderer.render(statsScene, statsCamera);
      }
    }
  );

  if (statsRunning) {
    statsRenderer.render(statsScene, statsCamera);
  }
}

function startStatsLoop() {
  if (statsRunning) return;
  
  const canvas = document.getElementById("stats-lumen-canvas");
  if (canvas && statsRenderer) {
    const parent = canvas.parentElement;
    if (parent) {
      if (!statsResizeObserver) {
        statsResizeObserver = new ResizeObserver((entries) => {
          for (let entry of entries) {
            const { width, height } = entry.contentRect;
            const w = Math.floor(width || 80);
            const h = Math.floor(height || 80);
            if (w > 10 && h > 10) {
              statsRenderer.setSize(w, h, false);
              statsCamera.aspect = w / h;
              statsCamera.updateProjectionMatrix();
            }
          }
        });
      }
      statsResizeObserver.observe(parent);

      const rect = parent.getBoundingClientRect();
      const w = Math.floor(rect.width || 80);
      const h = Math.floor(rect.height || 80);
      if (w > 10 && h > 10) {
        statsRenderer.setSize(w, h, false);
        statsCamera.aspect = w / h;
        statsCamera.updateProjectionMatrix();
      }
    }
  }

  statsRunning = true;
  if (!statsRaf) statsRaf = requestAnimationFrame(animateStats);
}

function stopStatsLoop() {
  statsRunning = false;
  if (statsRaf) cancelAnimationFrame(statsRaf);
  statsRaf = 0;
  if (statsResizeObserver) {
    statsResizeObserver.disconnect();
  }
}

function animateStats() {
  if (!statsRunning) return;
  statsRaf = requestAnimationFrame(animateStats);
  
  const time = performance.now() * 0.001;
  
  if (statsModel) {
    statsModel.rotation.set(-0.48, (160 * Math.PI / 180) + (time * 0.45), 0.0);
  }
  
  // Animar barrido vertical del escáner
  if (statsScanRing) {
    statsScanRing.position.y = Math.sin(time * 3.2) * 0.62;
  }
  
  // Animar interferencia de parpadeo holográfico muy tenue (holograma casi invisible)
  const noise = Math.sin(time * 45) * 0.01 + Math.cos(time * 80) * 0.008;
  if (hologramMaterial) {
    hologramMaterial.uniforms.time.value = time;
    hologramMaterial.uniforms.baseOpacity.value = 0.07 + noise + Math.sin(time * 6) * 0.01;
  } 
  
  if (statsRenderer && statsScene && statsCamera) {
    statsRenderer.render(statsScene, statsCamera);
  }
}
